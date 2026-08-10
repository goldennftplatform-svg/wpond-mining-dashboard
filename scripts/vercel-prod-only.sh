#!/usr/bin/env bash
set -eu
cd /mnt/c/Users/PreSafu/Desktop/MDB

STAGE=/tmp/wpond-dash-deploy
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a dashboard/public/. "$STAGE/"

# force cache bust + nuclear entry
python3 - <<'PY'
from pathlib import Path
p = Path('/tmp/wpond-dash-deploy/index.html')
t = p.read_text(encoding='utf-8')
import re
t = re.sub(r'script-nuclear\.js\?v=[^"]+', 'script-nuclear.js?v=2026-08-10-LIVE', t)
p.write_text(t, encoding='utf-8')
print('index ok', 'FORCE' if '2026-08-10-LIVE' in t else 'MISSING')
PY

node -e 'const j=require("/tmp/wpond-dash-deploy/working-mining-data.json"); console.log("staged", j.summary.dateGenerated, j.summary.liveClaimsInWindow, j.recentClaims[0].date); if(!String(j.recentClaims[0].date).startsWith("2026")) process.exit(2);'

node /mnt/c/Users/PreSafu/Desktop/MDB/scripts/read-vercel-auth.js
export VERCEL_TOKEN="$(cat /tmp/vercel-token)"
export VERCEL_ORG_ID=team_2kg7mzJJGcCFLSNb9RRNv8bn
export VERCEL_PROJECT_ID=prj_fj1juk1TaQp33AhxWAznLbK1ZuFF
mkdir -p "$STAGE/.vercel"
cp .vercel/project.json "$STAGE/.vercel/"

cd "$STAGE"
npx --yes vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN" | tee /tmp/vercel-deploy.log

echo "=== VERIFY ==="
sleep 4
curl -sL 'https://wpond-mining-dashboard.vercel.app/' | grep -oE 'script-nuclear.js[^"]*|dashboard-NEW.js' | head -1 || true
curl -sL 'https://wpond-mining-dashboard.vercel.app/working-mining-data.json' -o /tmp/v2.json
node -e 'const j=require("/tmp/v2.json"); console.log("vercel", j.summary.dateGenerated, "live", j.summary.liveClaimsInWindow, "d0", j.recentClaims && j.recentClaims[0] && j.recentClaims[0].date);'
