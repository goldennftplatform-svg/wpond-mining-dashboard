const config = require('../config');
const { getHelius, HeliusError, classifyHeliusError } = require('./heliusClient');

/**
 * Thin RPC facade.
 * When HELIUS_API_KEY is set → shared Helius client (retries / 429 cool-down).
 * Otherwise → single-shot public RPC (no key).
 */
class RpcClient {
  constructor(endpoint = config.defaultEndpoint) {
    this.endpoint = endpoint;
    this.requestId = 1;
    this._helius = null;
  }

  usesHelius() {
    return Boolean(config.heliusApiKey);
  }

  helius() {
    if (!this._helius) {
      this._helius = getHelius({
        apiKey: config.heliusApiKey,
        maxRetries: config.retry.attempts,
        timeoutMs: config.timeout,
        baseDelayMs: config.retry.delay,
        maxDelayMs: config.retry.maxDelay,
      });
    }
    return this._helius;
  }

  /**
   * Make a JSON-RPC call
   * @param {string} method
   * @param {Array} params
   * @returns {Promise<any>}
   */
  async rpcCall(method, params = []) {
    if (this.usesHelius()) {
      return this.helius().call(method, params);
    }

    const payload = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params,
    };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeout);
      let response;
      try {
        response = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        throw classifyHeliusError(new Error(response.statusText), {
          status: response.status,
          method,
        });
      }

      const data = await response.json();
      if (data.error) {
        throw classifyHeliusError(new Error(data.error.message || 'RPC error'), {
          method,
        });
      }
      return data.result;
    } catch (error) {
      if (error instanceof HeliusError) throw error;
      throw classifyHeliusError(error, { method });
    }
  }

  async getTokenAccountBalance(tokenAccountAddress) {
    return this.rpcCall('getTokenAccountBalance', [tokenAccountAddress]);
  }

  async getAccountInfo(accountAddress) {
    return this.rpcCall('getAccountInfo', [accountAddress, { encoding: 'base64' }]);
  }

  async getProgramAccounts(programId, filters = []) {
    const params = [programId];
    if (filters.length > 0) {
      params.push({ filters });
    }
    return this.rpcCall('getProgramAccounts', params);
  }

  async getTokenAccountsByOwner(ownerAddress, mintAddress = null) {
    const params = [ownerAddress];

    if (mintAddress) {
      params.push({ mint: mintAddress });
    } else {
      params.push({ programId: config.programIds.tokenProgram });
    }

    params.push({ encoding: 'base64' });

    return this.rpcCall('getTokenAccountsByOwner', params);
  }

  async getRecentBlockhash() {
    return this.rpcCall('getLatestBlockhash');
  }

  async getSlot() {
    return this.rpcCall('getSlot');
  }

  setEndpoint(endpoint) {
    this.endpoint = endpoint;
  }

  summarizeStats() {
    if (this.usesHelius() && this._helius) return this._helius.summarizeStats();
    return 'Helius not active (public RPC)';
  }
}

const defaultClient = new RpcClient();

module.exports = {
  RpcClient,
  HeliusError,
  rpcCall: (method, params) => defaultClient.rpcCall(method, params),
  getTokenAccountBalance: (address) => defaultClient.getTokenAccountBalance(address),
  getAccountInfo: (address) => defaultClient.getAccountInfo(address),
  getProgramAccounts: (programId, filters) =>
    defaultClient.getProgramAccounts(programId, filters),
  getTokenAccountsByOwner: (owner, mint) =>
    defaultClient.getTokenAccountsByOwner(owner, mint),
  setRpcEndpoint: (endpoint) => defaultClient.setEndpoint(endpoint),
  summarizeRpcStats: () => defaultClient.summarizeStats(),
};
