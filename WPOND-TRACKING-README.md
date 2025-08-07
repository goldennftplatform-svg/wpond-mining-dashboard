# wPOND Mining Rewards Tracker 🚀

A comprehensive system for tracking wPOND micro mining rewards from wallet `AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT`.

## 🎯 Purpose

This system tracks millions of dollars in wPOND coin micro mining rewards by:
1. **Querying entire transaction history** - One-time bulk data collection
2. **Archiving to master file** - Persistent storage of all data
3. **Incremental daily updates** - Ongoing monitoring of new transactions

## 📁 Data Structure

```
data/
├── wpond-mining-master.json     # Master file with all historical data
├── last-processed.json          # Tracks last processed transaction
├── update-logs.json             # Logs of all update runs
└── daily/                       # Daily incremental data
    ├── 2024-01-15.json
    ├── 2024-01-16.json
    └── ...
```

## 🚀 Quick Start

### 1. Initial History Query (One-time)
```bash
# Query entire wPOND payment history
node wpond-mining-tracker.js history
```

**⚠️ This will take several hours due to rate limits and transaction volume.**

### 2. Daily Updates
```bash
# Get incremental updates (new transactions since last run)
node wpond-mining-tracker.js update

# Or use the scheduler
node schedule-updates.js update
```

### 3. View Reports
```bash
# Generate summary report
node wpond-mining-tracker.js report

# View update statistics
node schedule-updates.js stats
```

## 📊 Data Analysis

### Master File Structure
```json
{
  "wallet": "AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT",
  "wpondMint": "EkpQGSJtjMFqKZ1KQanSqYXRcF8fBopzLHYxdM65Qjm",
  "totalTransactions": 15000,
  "totalFees": 45.234567,
  "transactions": [
    {
      "timestamp": 1642234567,
      "signature": "abc123...",
      "success": true,
      "fee": 0.000005,
      "solChange": 0.000005,
      "wpondInvolved": true,
      "slot": 123456789,
      "blockTime": 1642234567
    }
  ],
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "metadata": {
    "createdAt": "2024-01-15T10:00:00.000Z",
    "description": "wPOND Mining Rewards Master Data"
  }
}
```

### Daily File Structure
```json
{
  "date": "2024-01-15",
  "newTransactions": 25,
  "newFees": 0.000125,
  "transactions": [...]
}
```

## 🔄 Automation

### Manual Daily Updates
```bash
# Check if update is needed
node schedule-updates.js check

# Force update (ignore timing)
node schedule-updates.js force
```

### Automated Scheduling (Windows Task Scheduler)
1. Create a batch file `daily-update.bat`:
```batch
cd C:\Users\nick\Desktop\CALLinSOL
node schedule-updates.js update
```

2. Set up Windows Task Scheduler to run daily at 2 AM

### Automated Scheduling (Linux Cron)
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/CALLinSOL && node schedule-updates.js update
```

## 📈 Analytics & Reporting

### Key Metrics Tracked
- **Total wPOND transactions**: Count of all mining reward transactions
- **Total fees spent**: Cumulative SOL spent on transaction fees
- **Daily transaction volume**: New transactions per day
- **Success rate**: Percentage of successful transactions
- **Average fees**: Mean transaction fee per day

### Data Export Options
```javascript
// Load master data for analysis
const { WPondMiningTracker } = require('./wpond-mining-tracker');
const tracker = new WPondMiningTracker();
const masterData = await tracker.loadMasterData();

// Export to CSV
const csvData = masterData.transactions.map(tx => ({
  date: new Date(tx.timestamp * 1000).toISOString(),
  signature: tx.signature,
  fee: tx.fee,
  success: tx.success
}));
```

## 🔧 Configuration

### Rate Limiting
The system includes built-in rate limiting to avoid RPC errors:
- 1 second delay between signature batches
- 2 second delay between transaction requests
- Automatic retry with exponential backoff

### RPC Endpoint
Currently using public Solana RPC. For production use, consider:
- **Helius**: `https://rpc.helius.xyz/?api-key=YOUR_KEY`
- **QuickNode**: `https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY/`
- **Alchemy**: `https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY`

Update in `config.js`:
```javascript
defaultEndpoint: 'YOUR_RPC_ENDPOINT'
```

## 📊 Performance Considerations

### Initial History Query
- **Estimated time**: 4-8 hours for millions of transactions
- **Rate limits**: ~50,000 transactions per hour
- **Storage**: ~100MB for 1M transactions

### Daily Updates
- **Estimated time**: 5-15 minutes
- **Typical volume**: 100-1000 new transactions per day
- **Storage**: ~1MB per day

## 🛠️ Troubleshooting

### Common Issues

1. **Rate Limit Errors (429)**
   - System automatically retries with delays
   - Consider upgrading to dedicated RPC provider

2. **Transaction Not Found**
   - Some old transactions may be pruned
   - System logs and continues processing

3. **Insufficient Storage**
   - Monitor `data/` directory size
   - Consider archiving old daily files

### Logs & Monitoring
- **Update logs**: `data/update-logs.json`
- **Last processed**: `data/last-processed.json`
- **Console output**: Real-time progress updates

## 🎯 Next Steps

### Advanced Features
1. **Token Amount Tracking**: Decode actual wPOND amounts transferred
2. **Recipient Analysis**: Track who receives the mining rewards
3. **Price Integration**: Calculate USD values using historical prices
4. **Web Dashboard**: Real-time monitoring interface
5. **Alert System**: Notifications for large transactions

### Data Analysis
1. **Trend Analysis**: Daily/weekly/monthly patterns
2. **Cost Analysis**: Fee optimization insights
3. **Performance Metrics**: Mining efficiency tracking
4. **Comparative Analysis**: Compare with other mining wallets

## 📞 Support

For issues or questions:
1. Check the logs in `data/update-logs.json`
2. Verify RPC endpoint connectivity
3. Ensure sufficient disk space
4. Monitor rate limit compliance

---

**Happy Mining! 🚀💰** 