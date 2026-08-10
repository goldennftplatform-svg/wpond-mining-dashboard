#!/usr/bin/env bash
set -eu
cd /mnt/c/Users/PreSafu/Desktop/MDB

GIT="/mnt/c/Program Files/Git/bin/git.exe"

cp /tmp/wpond-dash-deploy/index.html dashboard/public/index.html
cp /tmp/wpond-dash-deploy/working-mining-data.json dashboard/public/working-mining-data.json
cp /tmp/wpond-dash-deploy/recent-claims-live.json dashboard/public/recent-claims-live.json

if ! grep -q '!scripts/\*.sh' .gitignore 2>/dev/null; then
  printf '\n!scripts/*.sh\n!scripts/*.py\n!vercel.json\n' >> .gitignore
fi

"$GIT" add .gitignore netlify.toml
"$GIT" add -f vercel.json \
  scripts/deploy-dashboard-wsl.sh \
  scripts/vercel-prod-only.sh \
  scripts/fix-dashboard-wsl.sh \
  scripts/lf.py \
  scripts/read-vercel-auth.js \
  scripts/push-live-wsl.sh \
  dashboard/public/index.html \
  dashboard/public/working-mining-data.json \
  dashboard/public/recent-claims-live.json

"$GIT" status --short | head -40

"$GIT" commit -m "Publish live 2026 claim feed and fix static Vercel deploy."

CRED="$(printf 'protocol=https\nhost=github.com\nusername=preseteth\n\n' | "$GIT" credential-manager get 2>/dev/null | sed -n 's/^password=//p' || true)"
if [[ -z "${CRED}" ]]; then
  "$GIT" push origin HEAD:master
else
  "$GIT" -c credential.helper= push "https://preseteth:${CRED}@github.com/preseteth/wpond-mining-dashboard.git" HEAD:master
  "$GIT" remote set-url origin https://github.com/preseteth/wpond-mining-dashboard.git
fi

"$GIT" log -1 --oneline
"$GIT" status -sb
