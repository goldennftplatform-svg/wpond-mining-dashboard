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

const PAYOUT_WALLET = process.env.PAYOUT_WALLET || 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT';
const WATCH = [PAYOUT_WALLET];

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

const CLAIM_NORMAL_MIN = 100e6;
const CLAIM_NORMAL_MAX = 888e6;
const CLAIM_BIG_MIN = 1.1e9;
const CLAIM_BIG_MAX = 2.2e9;
function isHighlightAmount(a) {
  const n = Number(a) || 0;
  return (n >= CLAIM_NORMAL_MIN && n <= CLAIM_NORMAL_MAX) || (n >= CLAIM_BIG_MIN && n <= CLAIM_BIG_MAX);
}

const LOOKBACK_SIGS = Number(process.env.CLAIM_LOOKBACK || 800);
const LOOKBACK_HOURS = Number(process.env.CLAIM_LOOKBACK_HOURS || 336);

const KNOWN_BOTS = new Set([
  '2NL8sV5sfRTs8WF4FhA6v9DssSZvUBqFHwr7LQE5b2p5',
  '3Tvj33EGJXctM8P5UWPuN61BvzHDGtx1uUffgKkt2cxV',
  'HxjwdF326ZunmUwC1iXhfgL3ku78YsksN6n7Rfxzwr6b',
  'ARu4n5mFdZogZAravu7CcizaojWnS6oqka37gdLT5SZn',
]);
const CADENCE_MIN_CLAIMS = Number(process.env.BOT_CADENCE_MIN_CLAIMS || 5);
const CADENCE_MAX_MEDIAN_GAP_SEC = Number(process.env.BOT_CADENCE_MEDIAN_GAP || 2700);

function tagBotActivity(unique) {
  const byWallet = new Map();
  for (const c of unique) {
    if (!byWallet.has(c.wallet)) byWallet.set(c.wallet, []);
    byWallet.get(c.wallet).push(Number(c.timestamp) || 0);
  }
  const flaggedByCadence = new Set();
  for (const [wallet, ts] of byWallet) {
    if (ts.length < CADENCE_MIN_CLAIMS) continue;
    const sorted = [...ts].sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      const g = sorted[i] - sorted[i - 1];
      if (g > 0) gaps.push(g);
    }
    if (!gaps.length) continue;
    gaps.sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)];
    if (median <= CADENCE_MAX_MEDIAN_GAP_SEC) flaggedByCadence.add(wallet);
  }
  for (const c of unique) {
    if (KNOWN_BOTS.has(c.wallet)) {
      c.botSuspected = true;
      c.botReason = 'known-bot';
    } else if (flaggedByCadence.has(c.wallet)) {
      c.botSuspected = true;
      c.botReason = 'machine-cadence';
    } else {
      c.botSuspected = false;
      c.botReason = null;
    }
  }
  return { knownBotWallets: KNOWN_BOTS.size, flaggedByCadence: [...flaggedByCadence] };
}

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
  const botByWallet = new Map(unique.map((c) => [c.wallet, Boolean(c.botSuspected)]));
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
        botSuspected: botByWallet.get(c.wallet) || false,
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
  const allRecipients = liveRecipients;
  const recentClaims = unique.slice(0, 100);

  const totalWpond = allRecipients.reduce((s, r) => s + (r.amount || 0), 0);
  const totalClaims = allRecipients.reduce((s, r) => s + (r.claimCount || 0), 0);

  const botClaimsInWindow = unique.filter((c) => c.botSuspected);
  const humanClaimsInWindow = unique.filter((c) => !c.botSuspected);
  const botWpond = botClaimsInWindow.reduce((s, c) => s + (c.amount || 0), 0);
  const humanWpond = humanClaimsInWindow.reduce((s, c) => s + (c.amount || 0), 0);
  const windowTotal = botWpond + humanWpond;
  const botWalletSet = new Set(botClaimsInWindow.map((c) => c.wallet));
  const humanSharePct = windowTotal ? Math.round((humanWpond / windowTotal) * 1000) / 10 : null;

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
      botStats: {
        humanShareOfWindowPct: humanSharePct,
        humanClaimsInWindow: humanClaimsInWindow.length,
        botClaimsInWindow: botClaimsInWindow.length,
        humanWpondInWindow: humanWpond,
        botWpondInWindow: botWpond,
        suspectedBotWalletsInWindow: botWalletSet.size,
        knownBotRegistrySize: KNOWN_BOTS.size,
      },
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
  const botReport = tagBotActivity(unique);
  const data = buildPayload(unique);

  console.log('\nLive summary');
  console.log(`  liveClaims=${data.summary.liveClaimsInWindow} recipients=${data.summary.totalRecipients}`);
  const bs = data.summary.botStats;
  console.log(`  human share of window: ${bs.humanShareOfWindowPct}% (${bs.humanClaimsInWindow} human vs ${bs.botClaimsInWindow} bot txs)`);
  console.log(`  bot wallets in window: ${bs.suspectedBotWalletsInWindow} (cadence-flagged: ${botReport.flaggedByCadence.length})`);
  console.log('  newest recentClaims:');
  for (const c of data.recentClaims.slice(0, 10)) {
    console.log(`  - ${c.date} ${c.wallet.slice(0, 6)}...${c.wallet.slice(-4)} ${c.amount} ${c.botSuspected ? `[BOT:${c.botReason}]` : '[human]'}`);
  }

  if (!data.recentClaims.length) {
    console.log('No payouts from the payout wallet in window — publishing empty payout feed (truth mode)');
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
          botStats: data.summary.botStats,
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
