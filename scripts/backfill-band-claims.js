#!/usr/bin/env node
/**
 * Resumable backfill of band mining claims from OPT (+ sister/relay).
 * Bands: 100M-888M normal, 1.1B-2.2B big.
 * Writes dashboard/public/band-claims-archive.json + refreshes period totals
 * into working-mining-data.json.
 */
const fs = require('fs');
const path = require('path');
const { getHelius, resolveApiKey, sleep } = require('../src/heliusClient');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'dashboard', 'public');
const ARCHIVE = path.join(PUBLIC, 'band-claims-archive.json');
const OUT = path.join(PUBLIC, 'working-mining-data.json');
const OUT_RECENT = path.join(PUBLIC, 'recent-claims-live.json');
const CHECKPOINT = path.join(ROOT, 'data', 'band-backfill-checkpoint.json');

const MINT = process.env.WPOND_MINT || '3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq';
const NORMAL_MIN = 100e6;
const NORMAL_MAX = 888e6;
const BIG_MIN = 1.1e9;
const BIG_MAX = 2.2e9;

const HOUSE = new Set([
  'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT',
  '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL',
  'HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2',
  '5KXZCyUaqHJ1T2wbcMXvLt9jYR87tDJS2Bf71gxYSZNt',
  '2Ag1QgyyJj2nS6nD6SLbpAUFaWPhaDrmHwrGwWpMqV9K',
  'HwyJtiPXQ5ZosJQRpUmcmV6E2J9ffKfhqjNcY1R8Gt29',
  '9z9H5dA6AejJ1LpXbyENhXog3jfpjVFdDEFbuymHjFSL',
  'Fk6PvoxW9LcjSg9ix7EJAnrAViHmqoKonX15WDau2NYv',
  'G5YGpBWvwFo2Ah1HXmCrmMMMPrnmvsaNs7TwW3win4Qw',
  'CYaXLzjVneHu2tXNN5KtyiithTeiyEZFdniu8nk4wNGi',
  'HvYahPhM2ANz4cWKDmN8NCDP4aFbdrsRdrPNJEk8KQpQ',
]);

const WATCH = [
  'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT',
  '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL',
  'HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2',
];

const MAX_SIGS_PER_WALLET = Number(process.env.BACKFILL_MAX_SIGS || 120000);
const DAYS = Number(process.env.BACKFILL_DAYS || 400); // a bit over 365
const CUTOFF = Math.floor(Date.now() / 1000) - DAYS * 86400;
const BATCH_SLEEP_MS = Number(process.env.BACKFILL_SLEEP_MS || 60);

function classify(amount) {
  const a = Number(amount) || 0;
  if (a >= NORMAL_MIN && a <= NORMAL_MAX) return 'normal';
  if (a >= BIG_MIN && a <= BIG_MAX) return 'big';
  return 'other';
}

function loadJson(p, fallback) {
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return fallback;
}

function saveJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.tmp`;
  const body = JSON.stringify(obj, null, 2);
  // Write via temp + rename to dodge Windows EINVAL on busy files
  fs.writeFileSync(tmp, body);
  try {
    fs.renameSync(tmp, p);
  } catch {
    fs.writeFileSync(p, body);
    try {
      fs.unlinkSync(tmp);
    } catch {}
  }
}

async function enhancedBatch(apiKey, signatures) {
  const url = `https://api.helius.xyz/v0/transactions/?api-key=${apiKey}`;
  for (let attempt = 1; attempt <= 8; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transactions: signatures }),
    });
    if (response.status === 429) {
      await sleep(1200 * attempt);
      continue;
    }
    if (!response.ok) throw new Error(`enhanced HTTP ${response.status}`);
    return response.json();
  }
  throw new Error('enhanced 429 exhausted');
}

function periodTotals(claims) {
  const now = Date.now() / 1000;
  const windows = [
    ['d30', 30],
    ['d90', 90],
    ['d180', 180],
    ['d365', 365],
    ['all', null],
  ];
  const out = {};
  for (const [key, days] of windows) {
    const cut = days == null ? 0 : now - days * 86400;
    const subset = claims.filter((c) => (c.timestamp || 0) >= cut);
    const wallets = new Set(subset.map((c) => c.wallet));
    const totalWpond = subset.reduce((s, c) => s + (c.amount || 0), 0);
    out[key] = {
      days,
      claims: subset.length,
      wallets: wallets.size,
      totalWpond,
      normalClaims: subset.filter((c) => c.kind === 'normal').length,
      bigClaims: subset.filter((c) => c.kind === 'big').length,
    };
  }
  return out;
}

function dedupeClaims(list) {
  const seen = new Set();
  const out = [];
  for (const c of list) {
    const k = `${c.signature}:${c.wallet}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  out.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return out;
}

function aggregateLeaderboard(claims) {
  const by = new Map();
  for (const c of claims) {
    if (!by.has(c.wallet)) {
      by.set(c.wallet, {
        wallet: c.wallet,
        amount: 0,
        claimCount: 0,
        maxClaim: 0,
        bigClaims: 0,
        normalClaims: 0,
        date: c.date,
        timestamp: c.timestamp,
        signature: c.signature,
        kind: c.kind,
      });
    }
    const row = by.get(c.wallet);
    row.amount += c.amount;
    row.claimCount += 1;
    row.maxClaim = Math.max(row.maxClaim, c.amount);
    if (c.kind === 'big') row.bigClaims += 1;
    else row.normalClaims += 1;
    if ((c.timestamp || 0) >= (row.timestamp || 0)) {
      row.date = c.date;
      row.timestamp = c.timestamp;
      row.signature = c.signature;
      row.kind = c.kind;
    }
  }
  return [...by.values()].sort((a, b) => b.maxClaim - a.maxClaim || b.amount - a.amount);
}

async function collectWallet(helius, apiKey, addr, checkpoint, onPage) {
  const state = checkpoint.wallets[addr] || { before: null, done: false, sigs: 0 };
  if (state.done) {
    console.log(`  ${addr.slice(0, 6)} already done`);
    return [];
  }

  console.log(`\nBackfill ${addr.slice(0, 6)}...${addr.slice(-4)} from before=${(state.before || 'HEAD').toString().slice(0, 12)}`);
  const found = [];
  let before = state.before || undefined;
  let scanned = state.sigs || 0;

  while (scanned < MAX_SIGS_PER_WALLET) {
    const opts = { limit: 1000 };
    if (before) opts.before = before;
    let batch;
    try {
      batch = await helius.getSignaturesForAddress(addr, opts);
    } catch (e) {
      console.log('  sig page fail', e.message);
      await sleep(1500);
      continue;
    }
    if (!batch || !batch.length) {
      state.done = true;
      break;
    }

    // Stop if whole page older than cutoff
    const newestInPage = batch[0]?.blockTime || 0;
    const oldestInPage = batch[batch.length - 1]?.blockTime || 0;
    if (newestInPage && newestInPage < CUTOFF) {
      console.log('  reached cutoff date');
      state.done = true;
      break;
    }

    const sigs = batch.filter((s) => (s.blockTime || 0) >= CUTOFF).map((s) => s.signature);
    for (let i = 0; i < sigs.length; i += 20) {
      const slice = sigs.slice(i, i + 20);
      let txs = [];
      try {
        txs = await enhancedBatch(apiKey, slice);
      } catch (e) {
        console.log('  enhanced fail', e.message);
        await sleep(1800);
        continue;
      }
      for (const t of txs || []) {
        for (const x of t.tokenTransfers || []) {
          if (x.mint !== MINT || !(x.tokenAmount > 0)) continue;
          // Only count transfers PAID BY the wallet we're crawling
          if (x.fromUserAccount && x.fromUserAccount !== addr) continue;
          const to = x.toUserAccount;
          if (!to || HOUSE.has(to)) continue;
          const kind = classify(x.tokenAmount);
          if (kind === 'other') continue;
          const ts = t.timestamp || 0;
          if (ts && ts < CUTOFF) continue;
          found.push({
            wallet: to,
            amount: x.tokenAmount,
            claimCount: 1,
            date: new Date(ts * 1000).toISOString().split('T')[0],
            timestamp: ts,
            signature: t.signature,
            from: x.fromUserAccount || null,
            kind,
          });
        }
      }
      await sleep(BATCH_SLEEP_MS);
    }

    scanned += batch.length;
    before = batch[batch.length - 1].signature;
    state.before = before;
    state.sigs = scanned;
    checkpoint.wallets[addr] = state;
    saveJson(CHECKPOINT, checkpoint);

    console.log(
      `  scanned=${scanned} oldestPage=${oldestInPage ? new Date(oldestInPage * 1000).toISOString().slice(0, 10) : '?'} band+thisPass=${found.length}`
    );

    if (typeof onPage === 'function') {
      try {
        onPage(found);
      } catch (e) {
        console.log('  onPage publish warn', e.message);
      }
    }

    if (batch.length < 1000 || (oldestInPage && oldestInPage < CUTOFF)) {
      state.done = true;
      break;
    }
  }

  checkpoint.wallets[addr] = state;
  saveJson(CHECKPOINT, checkpoint);
  console.log(`  wallet done scanned=${state.sigs} newBand=${found.length} done=${state.done}`);
  return found;
}

function publish(allClaims) {
  const claims = dedupeClaims(allClaims);
  const periods = periodTotals(claims);
  const leaderboard = aggregateLeaderboard(claims);
  const recentClaims = claims.slice(0, 200);
  const topMiners = leaderboard.slice(0, 50);
  const biggest = claims.slice().sort((a, b) => b.amount - a.amount)[0];

  const archive = {
    summary: {
      dateGenerated: new Date().toISOString(),
      description: 'Band mining claims archive (100M-888M / 1.1B-2.2B)',
      totalClaims: claims.length,
      totalWpond: claims.reduce((s, c) => s + c.amount, 0),
      periods,
      claimBands: { normal: [NORMAL_MIN, NORMAL_MAX], big: [BIG_MIN, BIG_MAX] },
      lookbackDays: DAYS,
    },
    claims,
  };
  saveJson(ARCHIVE, archive);

  const working = {
    summary: {
      ...archive.summary,
      liveClaimsInWindow: recentClaims.length,
      liveNormalClaims: recentClaims.filter((c) => c.kind === 'normal').length,
      liveBigClaims: recentClaims.filter((c) => c.kind === 'big').length,
      totalRecipients: leaderboard.length,
      biggestAmount: biggest?.amount || 0,
      biggestWinner: biggest?.wallet || '',
      averageAmount: claims.length ? archive.summary.totalWpond / claims.length : 0,
      periods,
    },
    recentClaims,
    allRecipients: leaderboard,
    topMiners,
    periods,
  };
  saveJson(OUT, working);
  saveJson(OUT_RECENT, {
    summary: working.summary,
    recentClaims,
    topMiners,
    periods,
  });

  console.log('\nPublished periods:');
  for (const [k, v] of Object.entries(periods)) {
    console.log(
      `  ${k}: claims=${v.claims} wallets=${v.wallets} paid=${(v.totalWpond / 1e9).toFixed(2)}B`
    );
  }
  return working;
}

async function main() {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error('Set HELIUS_API_KEY');
    process.exit(1);
  }
  const helius = getHelius({ maxRetries: 8 });
  const checkpoint = loadJson(CHECKPOINT, { wallets: {} });
  const archive = loadJson(ARCHIVE, { claims: [] });
  let all = Array.isArray(archive.claims) ? archive.claims.slice() : [];

  // Also merge any existing working recentClaims
  const working = loadJson(OUT, {});
  if (Array.isArray(working.recentClaims)) all.push(...working.recentClaims);

  for (const addr of WATCH) {
    try {
      const found = await collectWallet(helius, apiKey, addr, checkpoint, (pageFound) => {
        // Publish cumulative archive every signature page
        const merged = dedupeClaims([...all, ...pageFound]);
        publish(merged);
      });
      all.push(...found);
      all = dedupeClaims(all);
      publish(all);
    } catch (e) {
      console.error('wallet failed', addr.slice(0, 8), e.message);
    }
  }

  publish(all);
  console.log('\nBackfill pass complete');
  console.log(helius.summarizeStats());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
