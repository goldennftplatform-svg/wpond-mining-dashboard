#!/usr/bin/env node
/** Scrub working-mining-data.json to miner-band claims only (offline). */
const fs = require('fs');
const path = require('path');
const {
  filterMinerClaims,
  filterLeaderboard,
  classifyAmount,
  isHouseWallet,
} = require('../dashboard/public/claim-filters.js');

const OUT = path.join(__dirname, '..', 'dashboard', 'public', 'working-mining-data.json');
const OUT_RECENT = path.join(__dirname, '..', 'dashboard', 'public', 'recent-claims-live.json');

const data = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const raw = data.recentClaims || [];
const tagged = raw
  .filter((c) => c && c.wallet && !isHouseWallet(c.wallet))
  .map((c) => ({ ...c, kind: c.kind || classifyAmount(c.amount) }));
const recentClaims = filterMinerClaims(tagged);

// Rebuild leaderboard from verified miner/rare claims only (drop poisoned merges)
const byWallet = new Map();
for (const c of recentClaims) {
  if (!byWallet.has(c.wallet)) {
    byWallet.set(c.wallet, {
      wallet: c.wallet,
      amount: 0,
      claimCount: 0,
      date: c.date,
      timestamp: c.timestamp,
      signature: c.signature,
      kind: c.kind,
    });
  }
  const row = byWallet.get(c.wallet);
  row.amount += c.amount;
  row.claimCount += 1;
  if ((c.timestamp || 0) >= (row.timestamp || 0)) {
    row.date = c.date;
    row.timestamp = c.timestamp;
    row.signature = c.signature;
    row.kind = c.kind;
  }
}
const allRecipients = filterLeaderboard([...byWallet.values()]).sort(
  (a, b) => b.amount - a.amount
);

data.recentClaims = recentClaims;
data.allRecipients = allRecipients;
const totalWpond = allRecipients.reduce((s, r) => s + (r.amount || 0), 0);
const totalClaims = allRecipients.reduce((s, r) => s + (r.claimCount || 0), 0);
data.summary = {
  ...(data.summary || {}),
  dateGenerated: new Date().toISOString(),
  description: 'Scrubbed to miner-band (~150k–1.2M) + rare billions; admin dumps removed',
  liveClaimsInWindow: recentClaims.length,
  liveMinerClaims: recentClaims.filter((c) => (c.kind || classifyAmount(c.amount)) === 'miner').length,
  liveRareClaims: recentClaims.filter((c) => (c.kind || classifyAmount(c.amount)) === 'rare').length,
  totalRecipients: allRecipients.length,
  totalClaims,
  totalWpond,
  biggestAmount: allRecipients[0]?.amount || 0,
  biggestWinner: allRecipients[0]?.wallet || '',
  averageAmount: totalClaims ? totalWpond / totalClaims : 0,
  minerBand: { min: 150000, max: 1200000 },
};

fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
fs.writeFileSync(
  OUT_RECENT,
  JSON.stringify(
    {
      summary: {
        dateGenerated: data.summary.dateGenerated,
        liveClaimsInWindow: data.summary.liveClaimsInWindow,
        liveMinerClaims: data.summary.liveMinerClaims,
        liveRareClaims: data.summary.liveRareClaims,
        minerBand: data.summary.minerBand,
      },
      recentClaims,
    },
    null,
    2
  )
);

console.log('scrubbed recentClaims', raw.length, '->', recentClaims.length);
for (const c of recentClaims.slice(0, 15)) {
  console.log(`- ${c.date} [${c.kind}] ${c.wallet.slice(0, 6)}... ${c.amount}`);
}
