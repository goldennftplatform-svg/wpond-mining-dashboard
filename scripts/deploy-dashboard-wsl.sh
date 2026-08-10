#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/PreSafu/Desktop/MDB

# Load Helius key from committed frontend if env missing (do not print key)
if [[ -z "${HELIUS_API_KEY:-}" ]]; then
  HELIUS_API_KEY="$(node -e "const fs=require('fs'); const m=fs.readFileSync('dashboard/public/script.js','utf8').match(/api-key=([a-f0-9-]{36})/); if(!m) process.exit(1); process.stdout.write(m[1]);")"
  export HELIUS_API_KEY
fi

echo "=== Refresh live claims ==="
node scripts/refresh-recent-claims.js

echo "=== Stage static site ==="
STAGE=/tmp/wpond-dash-deploy
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a dashboard/public/. "$STAGE/"
# Ensure nuclear dashboard + cache bust
sed -i 's|script-nuclear.js?v=[^"]*|script-nuclear.js?v=2026-08-10-LIVE|' "$STAGE/index.html"
grep -o 'script-nuclear.js[^"]*' "$STAGE/index.html"

node -e 'const j=require("/tmp/wpond-dash-deploy/working-mining-data.json"); console.log("staged", j.summary.dateGenerated, j.summary.liveClaimsInWindow, j.recentClaims[0].date); if(!(j.recentClaims&&j.recentClaims[0].date.startsWith("2026"))) process.exit(2);'

# Sync staged files back into repo public so git/netlify stay aligned
cp -a "$STAGE/working-mining-data.json" dashboard/public/working-mining-data.json
cp -a "$STAGE/recent-claims-live.json" dashboard/public/recent-claims-live.json
cp -a "$STAGE/index.html" dashboard/public/index.html

# Fix vercel.json: pure static from dashboard/public, no framework install hang
cat > vercel.json <<'EOF'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "public": true,
  "cleanUrls": true,
  "trailingSlash": false,
  "outputDirectory": "dashboard/public",
  "headers": [
    {
      "source": "/(.*).json",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    }
  ]
}
EOF

# Fix netlify.toml (base/public path that matches UI)
cat > netlify.toml <<'EOF'
[build]
  base = "dashboard"
  command = "echo static-publish-only"
  publish = "public"

[build.environment]
  NODE_VERSION = "18"
  GIT_LFS_SKIP_SMUDGE = "1"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF

echo "=== Deploy to Vercel from staged folder (no monorepo hang) ==="
node /mnt/c/Users/PreSafu/Desktop/MDB/scripts/read-vercel-auth.js || true
if [[ -f /tmp/vercel-token ]]; then
  export VERCEL_TOKEN="$(cat /tmp/vercel-token)"
  echo "Using Vercel token (len=${#VERCEL_TOKEN})"
fi
if [[ -f /mnt/c/Users/PreSafu/Desktop/MDB/.vercel/project.json ]]; then
  export VERCEL_ORG_ID="$(node -e "console.log(require('/mnt/c/Users/PreSafu/Desktop/MDB/.vercel/project.json').orgId||'')")"
  export VERCEL_PROJECT_ID="$(node -e "console.log(require('/mnt/c/Users/PreSafu/Desktop/MDB/.vercel/project.json').projectId||'')")"
  echo "org=$VERCEL_ORG_ID project=$VERCEL_PROJECT_ID"
  mkdir -p "$STAGE/.vercel"
  cp /mnt/c/Users/PreSafu/Desktop/MDB/.vercel/project.json "$STAGE/.vercel/project.json"
fi

cd "$STAGE"

# Deploy staged static files as project root (prevents monorepo build hang)
npx --yes vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN" 2>&1 | tee /tmp/vercel-deploy.log
echo "=== DONE ==="
tail -30 /tmp/vercel-deploy.log

echo "=== Verify production ==="
sleep 3
curl -sL 'https://wpond-mining-dashboard.vercel.app/' | grep -oE 'script-nuclear.js[^"]*|dashboard-NEW.js' | head -1 || true
curl -sL 'https://wpond-mining-dashboard.vercel.app/working-mining-data.json' -o /tmp/v2.json
node -e 'const j=require("/tmp/v2.json"); console.log("vercel now", j.summary&&j.summary.dateGenerated, "live", j.summary&&j.summary.liveClaimsInWindow, "d0", j.recentClaims&&j.recentClaims[0]&&j.recentClaims[0].date);'
