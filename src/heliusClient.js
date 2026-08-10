/**
 * Shared Helius RPC client — game-day hardened.
 * One place for auth, 429/5xx classification, backoff, and cool-downs.
 */

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 6;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 45_000;
const COOLDOWN_AFTER_STREAK = 3;
const COOLDOWN_MS = 20_000;

const RETRYABLE_RPC_MESSAGE =
  /rate limit|too many requests|timed out|timeout|temporarily unavailable|gateway|ECONNRESET|ETIMEDOUT|socket hang up|fetch failed/i;

class HeliusError extends Error {
  /**
   * @param {string} message
   * @param {{ code?: string, status?: number|null, retryable?: boolean, retryAfterMs?: number|null, method?: string, cause?: unknown }} [meta]
   */
  constructor(message, meta = {}) {
    super(message);
    this.name = 'HeliusError';
    this.code = meta.code || 'HELIUS_ERROR';
    this.status = meta.status ?? null;
    this.retryable = Boolean(meta.retryable);
    this.retryAfterMs = meta.retryAfterMs ?? null;
    this.method = meta.method || null;
    if (meta.cause !== undefined) this.cause = meta.cause;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms) {
  const spread = Math.floor(ms * 0.25);
  return ms + Math.floor(Math.random() * (spread + 1));
}

function parseRetryAfter(headerValue) {
  if (!headerValue) return null;
  const asInt = Number(headerValue);
  if (Number.isFinite(asInt) && asInt >= 0) {
    // Retry-After can be seconds
    return asInt < 1000 ? asInt * 1000 : asInt;
  }
  const when = Date.parse(headerValue);
  if (!Number.isNaN(when)) {
    return Math.max(0, when - Date.now());
  }
  return null;
}

function resolveApiKey(explicit) {
  const key = explicit || process.env.HELIUS_API_KEY || process.env.HELIUS_KEY || '';
  return String(key).trim();
}

function buildRpcEndpoints(apiKey) {
  if (!apiKey) return [];
  // JSON-RPC only — do not mix enhanced REST paths into RPC POSTs.
  return [
    `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
    `https://rpc.helius.xyz/?api-key=${apiKey}`,
  ];
}

/**
 * Classify transport / RPC failures into a stable HeliusError.
 * @param {unknown} err
 * @param {{ method?: string, status?: number|null, retryAfterMs?: number|null }} [ctx]
 */
function classifyHeliusError(err, ctx = {}) {
  if (err instanceof HeliusError) return err;

  const status = ctx.status ?? err?.status ?? err?.response?.status ?? null;
  const raw = String(err?.message || err || 'Unknown Helius error');
  const method = ctx.method || null;
  const retryAfterMs = ctx.retryAfterMs ?? null;

  if (status === 401 || status === 403 || /unauthorized|forbidden|invalid api key/i.test(raw)) {
    return new HeliusError('Helius auth failed — check HELIUS_API_KEY', {
      code: 'AUTH',
      status,
      retryable: false,
      method,
      cause: err,
    });
  }

  if (status === 429 || /429|rate limit|too many requests/i.test(raw)) {
    return new HeliusError('Helius rate limited (429)', {
      code: 'RATE_LIMIT',
      status: status || 429,
      retryable: true,
      retryAfterMs,
      method,
      cause: err,
    });
  }

  if (status === 408 || status === 502 || status === 503 || status === 504) {
    return new HeliusError(`Helius transient HTTP ${status}`, {
      code: 'TRANSIENT_HTTP',
      status,
      retryable: true,
      retryAfterMs,
      method,
      cause: err,
    });
  }

  if (status && status >= 500) {
    return new HeliusError(`Helius server error HTTP ${status}`, {
      code: 'SERVER',
      status,
      retryable: true,
      retryAfterMs,
      method,
      cause: err,
    });
  }

  if (status && status >= 400) {
    return new HeliusError(`Helius HTTP ${status}: ${raw}`, {
      code: 'HTTP',
      status,
      retryable: false,
      method,
      cause: err,
    });
  }

  if (/timeout|timed out|aborted/i.test(raw)) {
    return new HeliusError('Helius request timed out', {
      code: 'TIMEOUT',
      status,
      retryable: true,
      method,
      cause: err,
    });
  }

  if (RETRYABLE_RPC_MESSAGE.test(raw)) {
    return new HeliusError(raw, {
      code: 'TRANSIENT',
      status,
      retryable: true,
      retryAfterMs,
      method,
      cause: err,
    });
  }

  return new HeliusError(raw, {
    code: 'RPC',
    status,
    retryable: false,
    method,
    cause: err,
  });
}

function formatErrorLine(err, attempt, maxRetries) {
  const bits = [
    err.code || 'ERROR',
    err.status != null ? `http=${err.status}` : null,
    err.method ? `method=${err.method}` : null,
    `try=${attempt}/${maxRetries}`,
    err.retryable ? 'retryable' : 'fatal',
  ].filter(Boolean);
  return `⚡ Helius [${bits.join(' · ')}] ${err.message}`;
}

class HeliusRpc {
  /**
   * @param {{ apiKey?: string, endpoints?: string[], maxRetries?: number, timeoutMs?: number, baseDelayMs?: number, maxDelayMs?: number, quiet?: boolean }} [opts]
   */
  constructor(opts = {}) {
    this.apiKey = resolveApiKey(opts.apiKey);
    this.endpoints = (opts.endpoints && opts.endpoints.length
      ? opts.endpoints
      : buildRpcEndpoints(this.apiKey)
    ).filter(Boolean);
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.baseDelayMs = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.maxDelayMs = opts.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.quiet = Boolean(opts.quiet);
    this._endpointIndex = 0;
    this._requestId = 1;
    this._rateLimitStreak = 0;
    this._cooldownUntil = 0;
    this.stats = {
      calls: 0,
      successes: 0,
      retries: 0,
      rateLimits: 0,
      failures: 0,
      cooldowns: 0,
    };

    if (!this.apiKey) {
      throw new HeliusError(
        'HELIUS_API_KEY is not set. Set it in the environment before game-day sweeps.',
        { code: 'AUTH', retryable: false }
      );
    }
    if (this.endpoints.length === 0) {
      throw new HeliusError('No Helius RPC endpoints configured', {
        code: 'CONFIG',
        retryable: false,
      });
    }
  }

  currentEndpoint() {
    return this.endpoints[this._endpointIndex % this.endpoints.length];
  }

  rotateEndpoint() {
    if (this.endpoints.length < 2) return;
    this._endpointIndex = (this._endpointIndex + 1) % this.endpoints.length;
  }

  async maybeCooldown() {
    const wait = this._cooldownUntil - Date.now();
    if (wait > 0) {
      this.stats.cooldowns += 1;
      if (!this.quiet) {
        console.log(`🧊 Helius cool-down ${Math.ceil(wait / 1000)}s (rate-limit streak)`);
      }
      await sleep(wait);
    }
  }

  noteSuccess() {
    this._rateLimitStreak = 0;
    this.stats.successes += 1;
  }

  noteRateLimit() {
    this.stats.rateLimits += 1;
    this._rateLimitStreak += 1;
    if (this._rateLimitStreak >= COOLDOWN_AFTER_STREAK) {
      this._cooldownUntil = Date.now() + COOLDOWN_MS;
      this._rateLimitStreak = 0;
    }
  }

  backoffMs(attempt, err) {
    if (err?.retryAfterMs != null && err.retryAfterMs > 0) {
      return Math.min(this.maxDelayMs, jitter(err.retryAfterMs));
    }
    const exp = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** Math.max(0, attempt - 1));
    const scaled = err?.code === 'RATE_LIMIT' ? exp * 2 : exp;
    return Math.min(this.maxDelayMs, jitter(scaled));
  }

  /**
   * JSON-RPC call with rotation + classified retries.
   * @param {string} method
   * @param {unknown[]} [params]
   * @param {{ maxRetries?: number }} [callOpts]
   */
  async call(method, params = [], callOpts = {}) {
    const maxRetries = callOpts.maxRetries ?? this.maxRetries;
    this.stats.calls += 1;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await this.maybeCooldown();
      const endpoint = this.currentEndpoint();

      try {
        const result = await this._post(endpoint, method, params);
        this.noteSuccess();
        return result;
      } catch (err) {
        const classified = classifyHeliusError(err, { method });
        lastError = classified;

        if (!classified.retryable || attempt === maxRetries) {
          this.stats.failures += 1;
          if (!this.quiet) console.error(formatErrorLine(classified, attempt, maxRetries));
          throw classified;
        }

        this.stats.retries += 1;
        if (classified.code === 'RATE_LIMIT') this.noteRateLimit();
        this.rotateEndpoint();

        const wait = this.backoffMs(attempt, classified);
        if (!this.quiet) {
          console.log(
            `${formatErrorLine(classified, attempt, maxRetries)} → wait ${Math.ceil(wait / 1000)}s, rotate endpoint`
          );
        }
        await sleep(wait);
      }
    }

    this.stats.failures += 1;
    throw lastError || new HeliusError('Helius call failed', { code: 'RPC', method });
  }

  async _post(endpoint, method, params) {
    const payload = {
      jsonrpc: '2.0',
      id: this._requestId++,
      method,
      params,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw classifyHeliusError(
          new Error(bodyText || response.statusText || `HTTP ${response.status}`),
          { status: response.status, retryAfterMs, method }
        );
      }

      const data = await response.json();
      if (data.error) {
        const msg = data.error.message || JSON.stringify(data.error);
        const code = data.error.code;
        const retryable =
          code === 429 ||
          code === -32005 || // node behind / rate
          RETRYABLE_RPC_MESSAGE.test(msg);
        throw new HeliusError(msg, {
          code: retryable ? 'RATE_LIMIT' : 'RPC',
          status: retryable ? 429 : null,
          retryable,
          retryAfterMs,
          method,
        });
      }

      return data.result;
    } catch (err) {
      if (err instanceof HeliusError) throw err;
      if (err?.name === 'AbortError') {
        throw classifyHeliusError(new Error('timeout'), { method });
      }
      throw classifyHeliusError(err, { method });
    } finally {
      clearTimeout(timer);
    }
  }

  getTransaction(signature, options = {}) {
    return this.call('getTransaction', [
      signature,
      {
        encoding: 'json',
        maxSupportedTransactionVersion: 0,
        ...options,
      },
    ]);
  }

  getSignaturesForAddress(address, options = {}) {
    return this.call('getSignaturesForAddress', [address, options]);
  }

  getSlot() {
    return this.call('getSlot');
  }

  /** Compact ops summary for game-day logs */
  summarizeStats() {
    const s = this.stats;
    return `Helius stats: calls=${s.calls} ok=${s.successes} retries=${s.retries} 429s=${s.rateLimits} fail=${s.failures} cool-downs=${s.cooldowns}`;
  }
}

let sharedClient = null;

/**
 * Lazy singleton — safe to call from tracker / sweeper / batch jobs.
 * @param {ConstructorParameters<typeof HeliusRpc>[0]} [opts]
 */
function getHelius(opts = {}) {
  if (!sharedClient || opts.apiKey || opts.endpoints) {
    sharedClient = new HeliusRpc(opts);
  }
  return sharedClient;
}

function resetHelius() {
  sharedClient = null;
}

module.exports = {
  HeliusError,
  HeliusRpc,
  getHelius,
  resetHelius,
  classifyHeliusError,
  resolveApiKey,
  buildRpcEndpoints,
  sleep,
};
