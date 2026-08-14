#!/usr/bin/env bash
set -euo pipefail
curl -sL 'https://wpond-mining-dashboard.vercel.app/band-claims-archive.json' -o /tmp/arch.json
node <<'NODE'
const d = require('/tmp/arch.json');
const p = d.summary.periods;
const b = (n) => (n / 1e9).toFixed(2) + 'B';
console.log({
  claims: d.claims.length,
  d30: b(p.d30.totalWpond) + ` (${p.d30.claims})`,
  d90: b(p.d90.totalWpond) + ` (${p.d90.claims})`,
  d180: b(p.d180.totalWpond) + ` (${p.d180.claims})`,
  d365: b(p.d365.totalWpond) + ` (${p.d365.claims} claims / ${p.d365.wallets} miners)`,
  all: b(p.all.totalWpond),
});
NODE
