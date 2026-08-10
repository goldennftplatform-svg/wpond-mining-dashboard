# wPOND Dashboard Sweeper — Game Day

## Helius setup

```powershell
# Repo root
copy .env.example .env
# edit .env and set HELIUS_API_KEY=...

# Or session-only:
$env:HELIUS_API_KEY="your-api-key"
```

Do **not** commit `.env`. Keys belong in environment only.

## Run the sweeper (claims dripping)

From repo root:

```powershell
npm run sweep
```

Or from `dashboard/`:

```powershell
npm run sweep
# or
node daily-tx-sweeper.js
```

The sweeper now:

1. Pulls **live** recent signatures from the payout wallet via Helius
2. Retries 429 / 5xx with backoff, endpoint rotate, and cool-downs
3. Prints compact error codes: `RATE_LIMIT`, `AUTH`, `TIMEOUT`, `TRANSIENT_HTTP`, …
4. Updates `public/helius-dashboard-data.json`

## Avoid API pile-ups

Do **not** run the sweeper while `get-all-data-zero-errors-final.js` is hammering the same key.

```powershell
# After the big batch job finishes:
npm run sweep
```

## Smoke test

```powershell
npm run helius:smoke
```

## Troubleshooting

| Symptom | What to do |
|--------|------------|
| `AUTH` | Bad/missing `HELIUS_API_KEY` |
| `RATE_LIMIT` / 429 | Wait; client already cools down. Don’t run two jobs. |
| `TIMEOUT` | Transient — re-run sweep |
| No new claims | Confirm payout wallet + mint; check Helius dashboard quota |

## Deploy

After a successful sweep: commit dashboard JSON if you publish it, push, let Netlify deploy.
