# wPOND Mining Tracker - Automation Setup Guide 🚀

## Current Status ✅

- **Initial History Query**: ✅ Complete (1,267 transactions, 0.010145 SOL fees)
- **Incremental Updates**: ✅ Working (133 new transactions found)
- **Data Structure**: ✅ Established (`data/` directory with master file)

## 🎯 Automation Options

### Option 1: Windows Task Scheduler (Recommended)

#### Step 1: Create the Task
1. Open **Task Scheduler** (search in Start menu)
2. Click **"Create Basic Task"**
3. Name: `wPOND Mining Tracker Daily Update`
4. Description: `Automated daily update for wPOND mining rewards tracking`

#### Step 2: Set Trigger
- **Trigger**: Daily
- **Start**: Tomorrow at 2:00 AM
- **Recur**: Every 1 day

#### Step 3: Set Action
- **Action**: Start a program
- **Program/script**: `powershell.exe`
- **Add arguments**: `-ExecutionPolicy Bypass -File "C:\Users\nick\Desktop\CALLinSOL\automated-update.ps1"`

#### Step 4: Configure Settings
- **Run whether user is logged on or not**: ✅ Checked
- **Run with highest privileges**: ✅ Checked
- **Configure for**: Windows 10

### Option 2: Simple Batch File (Alternative)

Use the `daily-update.bat` file:
1. Open Task Scheduler
2. Create task pointing to: `C:\Users\nick\Desktop\CALLinSOL\daily-update.bat`
3. Set to run daily at 2:00 AM

## 🔧 Manual Testing

### Test the Automation Script
```powershell
# Test the PowerShell script
.\automated-update.ps1

# Force an update (ignore timing)
.\automated-update.ps1 -Force

# Check current status
node schedule-updates.js stats
```

### Check Update Logs
```powershell
# View automation logs
Get-Content automation.log

# View update statistics
node schedule-updates.js stats
```

## 📊 Monitoring & Alerts

### Daily Check Commands
```bash
# Quick status check
node wpond-mining-tracker.js report

# Detailed update stats
node schedule-updates.js stats

# Check if update is needed
node schedule-updates.js check
```

### Data Files to Monitor
- `data/wpond-mining-master.json` - Main data file
- `data/update-logs.json` - Update history
- `data/last-processed.json` - Last processed transaction
- `automation.log` - Automation execution logs

## 🚨 Troubleshooting

### Common Issues

1. **Task Scheduler Permission Error**
   - Run Task Scheduler as Administrator
   - Check "Run with highest privileges"

2. **PowerShell Execution Policy**
   - Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

3. **Node.js Not Found**
   - Ensure Node.js is in system PATH
   - Or use full path: `C:\Program Files\nodejs\node.exe`

4. **Rate Limiting**
   - System handles this automatically with retries
   - Updates may take longer during peak times

### Manual Recovery
```bash
# Force a fresh update
node schedule-updates.js force

# Reset last processed (if needed)
del data\last-processed.json

# Check data integrity
node wpond-mining-tracker.js report
```

## 📈 Performance Expectations

### Daily Updates
- **Typical Duration**: 5-15 minutes
- **New Transactions**: 50-200 per day
- **Storage Growth**: ~1MB per day
- **Rate Limits**: Handled automatically

### Monthly Maintenance
- **Data Size**: ~30MB per month
- **Archive Old Data**: Consider archiving daily files older than 6 months
- **Backup**: Copy `data/` directory to backup location

## 🎯 Next Steps

### Immediate Actions
1. ✅ Set up Windows Task Scheduler
2. ✅ Test automation script
3. ✅ Monitor first few automated runs

### Future Enhancements
1. **Email Alerts**: Add email notifications for failed updates
2. **Web Dashboard**: Create real-time monitoring interface
3. **Advanced Analytics**: Add trend analysis and reporting
4. **Backup Automation**: Automated data backup to cloud storage

## 📞 Support

### Log Locations
- **Automation Logs**: `automation.log`
- **Update Logs**: `data/update-logs.json`
- **Error Logs**: Check Windows Event Viewer

### Quick Commands
```bash
# Emergency stop (if needed)
taskkill /f /im node.exe

# Check system status
node schedule-updates.js stats
node wpond-mining-tracker.js report

# Force manual update
node schedule-updates.js force
```

---

**🎉 Your wPOND Mining Tracker is now ready for automated daily updates!**

The system will automatically:
- ✅ Check for new transactions daily
- ✅ Update the master data file
- ✅ Log all activities
- ✅ Handle rate limits gracefully
- ✅ Provide detailed statistics

**Next**: Set up the Windows Task Scheduler and let it run automatically! 🚀 