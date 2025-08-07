const { WPondMiningTracker } = require('./wpond-mining-tracker');
const fs = require('fs').promises;
const path = require('path');

class UpdateScheduler {
  constructor() {
    this.tracker = new WPondMiningTracker();
    this.logFile = path.join(this.tracker.dataDir, 'update-logs.json');
  }

  /**
   * Load update logs
   */
  async loadLogs() {
    try {
      const data = await fs.readFile(this.logFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        lastRun: null,
        runs: [],
        totalRuns: 0,
        totalNewTransactions: 0,
        totalNewFees: 0
      };
    }
  }

  /**
   * Save update logs
   */
  async saveLogs(logs) {
    try {
      await fs.writeFile(this.logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error saving logs:', error.message);
    }
  }

  /**
   * Run daily update
   */
  async runDailyUpdate() {
    const startTime = new Date();
    console.log(`🕐 Starting daily update at ${startTime.toISOString()}`);
    
    const logs = await this.loadLogs();
    
    try {
      // Run incremental update
      const result = await this.tracker.getIncrementalUpdates();
      
      // Log the update
      const runLog = {
        timestamp: startTime.toISOString(),
        newTransactions: result.newTransactions.length,
        newFees: result.newFees,
        totalTransactions: result.totalTransactions,
        totalFees: result.totalFees,
        success: true,
        duration: Date.now() - startTime.getTime()
      };
      
      logs.runs.push(runLog);
      logs.lastRun = startTime.toISOString();
      logs.totalRuns++;
      logs.totalNewTransactions += result.newTransactions.length;
      logs.totalNewFees += result.newFees;
      
      await this.saveLogs(logs);
      
      console.log(`✅ Daily update completed successfully!`);
      console.log(`📊 New transactions: ${result.newTransactions.length}`);
      console.log(`💰 New fees: ${result.newFees.toFixed(6)} SOL`);
      console.log(`⏱️  Duration: ${runLog.duration}ms`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Daily update failed:', error.message);
      
      const runLog = {
        timestamp: startTime.toISOString(),
        error: error.message,
        success: false,
        duration: Date.now() - startTime.getTime()
      };
      
      logs.runs.push(runLog);
      logs.lastRun = startTime.toISOString();
      logs.totalRuns++;
      
      await this.saveLogs(logs);
      
      throw error;
    }
  }

  /**
   * Generate update statistics
   */
  async generateStats() {
    const logs = await this.loadLogs();
    const masterData = await this.tracker.loadMasterData();
    
    console.log('\n📈 UPDATE STATISTICS');
    console.log('====================');
    console.log(`Total Runs: ${logs.totalRuns}`);
    console.log(`Last Run: ${logs.lastRun || 'Never'}`);
    console.log(`Total New Transactions: ${logs.totalNewTransactions}`);
    console.log(`Total New Fees: ${logs.totalNewFees.toFixed(6)} SOL`);
    console.log(`Master Data Transactions: ${masterData.totalTransactions}`);
    console.log(`Master Data Total Fees: ${masterData.totalFees.toFixed(6)} SOL`);
    
    if (logs.runs.length > 0) {
      const recentRuns = logs.runs.slice(-5);
      console.log('\n🕒 Recent Runs:');
      recentRuns.forEach((run, i) => {
        const date = new Date(run.timestamp).toLocaleString();
        const status = run.success ? '✅' : '❌';
        console.log(`${i + 1}. ${date} ${status} ${run.newTransactions || 0} tx, ${(run.newFees || 0).toFixed(6)} SOL`);
      });
    }
  }

  /**
   * Check if update is needed (run once per day)
   */
  async shouldUpdate() {
    const logs = await this.loadLogs();
    
    if (!logs.lastRun) {
      return true; // Never run before
    }
    
    const lastRun = new Date(logs.lastRun);
    const now = new Date();
    const hoursSinceLastRun = (now - lastRun) / (1000 * 60 * 60);
    
    return hoursSinceLastRun >= 24; // Run if 24+ hours have passed
  }
}

// Command line interface
async function main() {
  const scheduler = new UpdateScheduler();
  const command = process.argv[2];

  switch (command) {
    case 'update':
      await scheduler.runDailyUpdate();
      break;
    case 'stats':
      await scheduler.generateStats();
      break;
    case 'check':
      const shouldUpdate = await scheduler.shouldUpdate();
      console.log(`Should update: ${shouldUpdate}`);
      break;
    case 'force':
      await scheduler.runDailyUpdate();
      break;
    default:
      console.log('Usage:');
      console.log('  node schedule-updates.js update  - Run daily update');
      console.log('  node schedule-updates.js stats   - Show update statistics');
      console.log('  node schedule-updates.js check   - Check if update is needed');
      console.log('  node schedule-updates.js force   - Force update (ignore timing)');
  }
}

module.exports = {
  UpdateScheduler
};

if (require.main === module) {
  main().catch(console.error);
} 