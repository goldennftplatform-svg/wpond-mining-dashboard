#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/PreSafu/Desktop/MDB

echo "=== LOCAL DATA ==="
node <<'NODE'
const j = require('./dashboard/public/working-mining-data.json');
console.log('gen', j.summary.dateGenerated);
console.log('liveClaims', j.summary.liveClaimsInWindow);
console.log('recent0', j.recentClaims[0].date, j.recentClaims[0].wallet.slice(0, 8));
if (!j.recentClaims?.length || !String(j.recentClaims[0].date).startsWith('2026')) {
  process.exit(2);
}
NODE

echo "=== LIVE NETLIFY ==="
curl -sL 'https://lighthearted-snickerdoodle-8bd902.netlify.app/' | grep -oE 'script-nuclear.js[^"]*|dashboard-NEW.js' | head -1 || true
curl -sL 'https://lighthearted-snickerdoodle-8bd902.netlify.app/working-mining-data.json' -o /tmp/n.json
node -e 'const j=require("/tmp/n.json"); console.log("netlify gen", j.summary&&j.summary.dateGenerated, "recent", j.recentClaims&&j.recentClaims.length);'

echo "=== LIVE VERCEL ==="
curl -sL 'https://wpond-mining-dashboard.vercel.app/' | grep -oE 'script-nuclear.js[^"]*|dashboard-NEW.js' | head -1 || true
curl -sL 'https://wpond-mining-dashboard.vercel.app/working-mining-data.json' -o /tmp/v.json
node -e 'const j=require("/tmp/v.json"); console.log("vercel gen", j.summary&&j.summary.dateGenerated, "recent", j.recentClaims&&j.recentClaims.length);'

echo "=== TOOLS ==="
command -v node; command -v npx; npx --yes vercel@39 --version 2>&1 | tail -1 || true
