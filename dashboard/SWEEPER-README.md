# wPOND Dashboard Sweeper - Usage Guide

## 🚨 Important: Avoid API Conflicts

**DO NOT run the sweeper while `get-all-data-zero-errors-final.js` is running!**

Both scripts use the same Helius API key and will cause rate limiting (429 errors) if run simultaneously.

## 📋 How to Use the Sweeper

### Option 1: Run Later (Recommended)
When your batch script finishes processing:

```bash
# Set your API key
$env:HELIUS_API_KEY="e7472550-170d-4be0-ae9f-dccf30e8d5b8"

# Run the sweeper
npm run sweep-later
```

### Option 2: Manual Run
```bash
# Set your API key
$env:HELIUS_API_KEY="e7472550-170d-4be0-ae9f-dccf30e8d5b8"

# Run directly
node daily-tx-sweeper.js
```

### Option 3: Using npm script
```bash
# Set your API key first
$env:HELIUS_API_KEY="e7472550-170d-4be0-ae9f-dccf30e8d5b8"

# Then run
npm run sweep
```

## 🔄 What the Sweeper Does

1. **Fetches recent transactions** from the last 24 hours
2. **Updates dashboard data** with new winners
3. **Filters out bank/sister wallets** (opt, iWWL)
4. **Recalculates summary statistics**
5. **Saves updated data** to `public/helius-dashboard-data.json`

## 📊 Dashboard Updates

After running the sweeper, your dashboard will show:
- ✅ **Today's Winners** section with recent activity
- ✅ **Updated summary statistics**
- ✅ **Fresh recent activity data**
- ✅ **Current top winners**

## 🚀 Deploy Updates

After the sweeper runs successfully:

1. **Commit changes** to Git
2. **Push to GitHub**
3. **Netlify will auto-deploy** the updated dashboard

## 🐛 Troubleshooting

### Rate Limited (429 Error)
- **Wait for batch script to finish**
- **Check if other scripts are using the API**
- **Try again in a few minutes**

### API Key Issues
- **Verify your Helius API key is set**
- **Check if the key has expired**
- **Ensure you have sufficient API quota**

### Data Not Updating
- **Check the sweeper logs**
- **Verify file permissions**
- **Ensure the dashboard data file exists**

## 📁 Files

- `daily-tx-sweeper.js` - Main sweeper script
- `run-sweeper-later.js` - Helper script with checks
- `public/helius-dashboard-data.json` - Dashboard data file
- `SWEEPER-README.md` - This file

## 🎯 Next Steps

1. **Wait for batch script to complete**
2. **Run the sweeper** to get fresh data
3. **Deploy updates** to see recent winners
4. **Set up automated scheduling** if needed

---

**Remember**: The sweeper is ready to go - it just needs the API to not be rate-limited by your batch script!
