#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/PreSafu/Desktop/MDB
sed -i 's/\r$//' scripts/backfill-band-claims.js
KEY="$(python3 - <<'PY'
import re
from pathlib import Path
text = Path('dashboard/public/script-nuclear.js').read_text(encoding='utf-8', errors='ignore')
m = re.search(r'api-key=([a-f0-9-]{36})', text)
print(m.group(1) if m else '')
PY
)"
export HELIUS_API_KEY="$KEY"
export BACKFILL_DAYS=400
export BACKFILL_MAX_SIGS=100000
export BACKFILL_SLEEP_MS=40
mkdir -p data
# Clean restart so we don't skip unsaved pages
rm -f data/band-backfill-checkpoint.json
node scripts/backfill-band-claims.js
