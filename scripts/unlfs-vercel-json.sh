#!/usr/bin/env bash
set -eu
cd /mnt/c/Users/PreSafu/Desktop/MDB
GIT="/mnt/c/Program Files/Git/bin/git.exe"

# Soft-reset unpushed commits, keep working tree
"$GIT" reset --soft origin/master

# exclude root vercel.json from LFS
if ! grep -q '^vercel.json filter=' .gitattributes; then
  printf '\nvercel.json filter= merge= diff= text\n' >> .gitattributes
fi
if ! grep -q '!scripts/\*.sh' .gitignore 2>/dev/null; then
  printf '\n!scripts/*.sh\n!scripts/*.py\n!vercel.json\n' >> .gitignore
fi

"$GIT" add .gitattributes .gitignore netlify.toml
"$GIT" add --renormalize vercel.json
"$GIT" add -f vercel.json \
  scripts/deploy-dashboard-wsl.sh \
  scripts/vercel-prod-only.sh \
  scripts/fix-dashboard-wsl.sh \
  scripts/lf.py \
  scripts/read-vercel-auth.js \
  scripts/push-live-wsl.sh \
  scripts/unlfs-vercel-json.sh \
  dashboard/public/index.html \
  dashboard/public/working-mining-data.json \
  dashboard/public/recent-claims-live.json

"$GIT" check-attr filter -- vercel.json dashboard/public/working-mining-data.json
"$GIT" lfs status | head -30

"$GIT" commit -m "Publish live 2026 claim feed; keep vercel.json out of Git LFS."

CRED="$(printf 'protocol=https\nhost=github.com\nusername=preseteth\n\n' | "$GIT" credential-manager get 2>/dev/null | sed -n 's/^password=//p' || true)"
"$GIT" -c credential.helper= push "https://preseteth:${CRED}@github.com/preseteth/wpond-mining-dashboard.git" HEAD:master
"$GIT" remote set-url origin https://github.com/preseteth/wpond-mining-dashboard.git
"$GIT" log -2 --oneline
"$GIT" status -sb
