#!/usr/bin/env node
/**
 * Pull live wPOND claim drips and rewrite dashboard JSON for Netlify.
 * Scans payout + sister + house relays for transfers TO non-house wallets.
 */
const fs = require('fs');
const path = require('path');
const { getHelius, resolveApiKey, sleep } = require('../src/heliusClient');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dashboard', 'public', 'working-mining-data.json');
const OUT_RECENT = path.join(ROOT, 'dashboard', 'public', 'recent-claims-live.json');

const MINT = process.env.WPOND_MINT || '3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq';
const API_KEY = resolveApiKey();

const WATCH = [
  'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT',
  '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL',
  'HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2',
  '5KXZCyUaqHJ1T2wbcMXvLt9jYR87tDJS2Bf71gxYSZNt',
];

const HOUSE = new Set([
  ...WATCH,
  '2Ag1QgyyJj2nS6nD6SLbpAUFaWPhaDrmHwrGwWpMqV9K',
  'HwyJtiPXQ5ZosJQRpUmcmV6E2J9ffKfhqjNcY1R8Gt29',
  '9z9H5dA6AejJ1LpXbyENhXog3jfpjVFdDEFbuymHjFSL',
  'Fk6PvoxW9LcjSg9ix7EJAnrAViHmqoKonX15WDau2NYv',
  'G5YGpBWvwFo2Ah1HXmCrmMMMPrnmvsaNs7TwW3win4Qw',
  'CYaXLzjVneHu2tXNN5KtyiithTeiyEZFdniu8nk4wNGi',
  'HvYahPhM2ANz4cWKDmN8NCDP4aFbdrsRdrPNJEk8KQpQ',
]);

const CLAIM_NORMAL_MIN = 225e6;
const CLAIM_NORMAL_MAX = 888e6;
const CLAIM_BIG_MIN = 1.1e9;
const CLAIM_BIG_MAX = 2.2e9;
function isHighlightAmount(a) {
  const n = Number(a) || 0;
  return (n >= CLAIM_NORMAL_MIN && n <= CLAIM_NORMAL_MAX) || (n >= CLAIM_BIG_MIN && n <= CLAIM_BIG_MAX);
}

const LOOKBACK_SIGS = Number(process.env.CLAIM_LOOKBACK || 800);
const LOOKBACK_HOURS = Number(process.env.CLAIM_LOOKBACK_HOURS || 336);

async function enhancedBatch(signatures) {
  const url = `https://api.helius.xyz/v0/transactions/?api-key=${API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transactions: signatures }),
  });
  if (response.status === 429) {
    const err = new Error('Helius enhanced 429');
    err.code = 'RATE_LIMIT';
    throw err;
  }
  if (!response.ok) throw new Error(`enhanced HTTP ${response.status}`);
  return response.json();
}

function claimFromTransfer(t, x, payerAddr) {
  const to = x.toUserAccount;
  if (!to || HOUSE.has(to)) return null;
  if (x.mint !== MINT) return null;
  if (!(x.tokenAmount > 0)) return null;
  // Must be paid by the watched mining wallet (skip Jupiter/DEX hops in same tx)
  const from = x.fromUserAccount || null;
  if (payerAddr && from && from !== payerAddr) return null;
  if (!isHighlightAmount(x.tokenAmount)) return null;
  const amt = x.tokenAmount;
  const kind = (amt >= CLAIM_BIG_MIN && amt <= CLAIM_BIG_MAX) ? 'big' : 'normal';
  const ts = t.timestamp || 0;
  return {
    wallet: to,
    amount: amt,
    claimCount: 1,
    date: new Date(ts * 1000).toISOString().split('T')[0],
    timestamp: ts,
    signature: t.signature,
    from: from || payerAddr || null,
    kind,
  };
}

async function collectFromAddress(helius, addr) {
  console.log(`\nScanning ${addr.slice(0, 6)}...${addr.slice(-4)}`);
  const sigInfos = await helius.getSignaturesForAddress(addr, { limit: LOOKBACK_SIGS });
  const cutoff = Math.floor(Date.now() / 1000) - LOOKBACK_HOURS * 3600;
  const recent = (sigInfos || [])
    .filter((s) => (s.blockTime || 0) >= cutoff)
    .map((s) => s.signature);
  console.log(`  sigs in window: ${recent.length}/${(sigInfos || []).length}`);

  const claims = [];
  for (let i = 0; i < recent.length; i += 20) {
    const batch = recent.slice(i, i + 20);
    let txs = [];
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        txs = await enhancedBatch(batch);
        break;
      } catch (e) {
        const wait = 1500 * attempt;
        console.log(`  batch retry ${attempt}: ${e.message}`);
        await sleep(wait);
        if (attempt === 5) throw e;
      }
    }
    for (const t of txs || []) {
      for (const x of t.tokenTransfers || []) {
        const claim = claimFromTransfer(t, x, addr);
        if (claim) claims.push(claim);
      }
    }
    await sleep(200);
  }
  console.log(`  miner claims: ${claims.length}`);
  return claims;
}

function aggregateLive(unique) {
  const byWallet = new Map();
  for (const c of unique) {
    if (!byWallet.has(c.wallet)) {
      byWallet.set(c.wallet, {
        wallet: c.wallet,
        amount: 0,
        claimCount: 0,
        date: c.date,
        timestamp: c.timestamp,
        signature: c.signature,
      });
    }
    const row = byWallet.get(c.wallet);
    row.amount += c.amount;
    row.claimCount += 1;
    if ((c.timestamp || 0) >= (row.timestamp || 0)) {
      row.date = c.date;
      row.timestamp = c.timestamp;
      row.signature = c.signature;
    }
  }
  return [...byWallet.values()].sort((a, b) => b.amount - a.amount);
}

function dedupe(all) {
  const seen = new Set();
  const unique = [];
  for (const c of all) {
    const k = `${c.signature}:${c.wallet}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(c);
  }
  unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return unique;
}

function buildPayload(unique) {
  const liveRecipients = aggregateLive(unique);
  let allRecipients = liveRecipients;
  let recentClaims = unique.slice(0, 100);

  if (fs.existsSync(OUT)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      const merged = new Map(
        (prev.allRecipients || [])
          .filter((r) => r.wallet && !HOUSE.has(r.wallet))
          .map((r) => [r.wallet, { ...r }])
      );
      for (const r of liveRecipients) {
        if (!merged.has(r.wallet)) {
          merged.set(r.wallet, { ...r });
        } else {
          const row = merged.get(r.wallet);
          row.amount = (row.amount || 0) + r.amount;
          row.claimCount = (row.claimCount || 0) + r.claimCount;
          if ((r.timestamp || 0) >= (row.timestamp || 0)) {
            row.date = r.date;
            row.timestamp = r.timestamp;
            row.signature = r.signature;
          }
        }
      }
      allRecipients = [...merged.values()].sort((a, b) => b.amount - a.amount);
    } catch (e) {
      console.warn('history merge skipped:', e.message);
    }
  }

  const totalWpond = allRecipients.reduce((s, r) => s + (r.amount || 0), 0);
  const totalClaims = allRecipients.reduce((s, r) => s + (r.claimCount || 0), 0);

  return {
    summary: {
      totalClaims,
      totalWpond,
      totalRecipients: allRecipients.length,
      biggestAmount: allRecipients[0]?.amount || 0,
      biggestWinner: allRecipients[0]?.wallet || '',
      averageAmount: totalClaims ? totalWpond / totalClaims : 0,
      dateGenerated: new Date().toISOString(),
      description: `Live claims last ${LOOKBACK_HOURS}h merged with leaderboard`,
      liveClaimsInWindow: unique.length,
      liveRecipientsInWindow: liveRecipients.length,
    },
    recentClaims,
    allRecipients,
  };
}

async function main() {
  if (!API_KEY) {
    console.error('Set HELIUS_API_KEY');
    process.exit(1);
  }

  const helius = getHelius({ maxRetries: 8 });
  const all = [];
  for (const addr of WATCH) {
    try {
      all.push(...(await collectFromAddress(helius, addr)));
    } catch (e) {
      console.error(`scan failed ${addr.slice(0, 8)}:`, e.message);
    }
  }

  const unique = dedupe(all);
  const data = buildPayload(unique);

  console.log('\nLive summary');
  console.log(`  liveClaims=${data.summary.liveClaimsInWindow} recipients=${data.summary.totalRecipients}`);
  console.log('  newest recentClaims:');
  for (const c of data.recentClaims.slice(0, 10)) {
    console.log(`  - ${c.date} ${c.wallet.slice(0, 6)}...${c.wallet.slice(-4)} ${c.amount}`);
  }

  if (!data.recentClaims.length) {
    console.error('No live miner claims found — refusing to publish empty recent feed');
    process.exit(2);
  }

  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  fs.writeFileSync(
    OUT_RECENT,
    JSON.stringify(
      {
        summary: {
          dateGenerated: data.summary.dateGenerated,
          liveClaimsInWindow: data.summary.liveClaimsInWindow,
          lookbackHours: LOOKBACK_HOURS,
        },
        recentClaims: data.recentClaims,
      },
      null,
      2
    )
  );
  console.log(`\nWrote ${OUT}`);
  console.log(`Wrote ${OUT_RECENT}`);
  console.log(helius.summarizeStats());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
