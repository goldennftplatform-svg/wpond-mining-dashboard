const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/data', async (req, res) => {
  try {
    // Read the REAL Helius data
    const heliusDataPath = path.join(__dirname, '..', 'helius-dashboard-data.json');
    const heliusData = JSON.parse(await fs.readFile(heliusDataPath, 'utf8'));
    
    // Read the master data file for additional context
    const masterDataPath = path.join(__dirname, '..', 'data', 'wpond-mining-master.json');
    let masterData = null;
    try {
      masterData = JSON.parse(await fs.readFile(masterDataPath, 'utf8'));
    } catch (error) {
      console.log('No master data found, using Helius data only');
    }
    
    // Read update logs
    const updateLogsPath = path.join(__dirname, '..', 'data', 'update-logs.json');
    let updateLogs = { runs: [], totalRuns: 0 };
    try {
      updateLogs = JSON.parse(await fs.readFile(updateLogsPath, 'utf8'));
    } catch (error) {
      console.log('No update logs found');
    }

    // Calculate exciting statistics from REAL Helius data
    const totalWpondDistributed = heliusData.summary.totalWpondDistributed;
    const totalRecipients = heliusData.summary.totalRecipients;
    const totalClaims = heliusData.summary.totalClaims;
    const biggestRecipient = heliusData.summary.biggestRecipient;
    const averageWpondPerRecipient = totalWpondDistributed / totalRecipients;
    const averageClaimsPerRecipient = totalClaims / totalRecipients;

    // Process daily stats from master data if available
    const dailyStats = {};
    if (masterData && masterData.transactions) {
      masterData.transactions.forEach(tx => {
        const date = new Date(tx.timestamp * 1000).toISOString().split('T')[0];
        
        if (!dailyStats[date]) {
          dailyStats[date] = { transactions: 0, fees: 0, solRewards: 0 };
        }
        dailyStats[date].transactions++;
        dailyStats[date].fees += tx.fee;
        
        // Track SOL rewards (positive solChange indicates rewards earned)
        if (tx.solChange > 0.001) {
          dailyStats[date].solRewards += tx.solChange;
        }
      });
    }

    // Get recent daily files
    const dailyDir = path.join(__dirname, '..', 'data', 'daily');
    const recentDailyData = [];
    try {
      const dailyFiles = await fs.readdir(dailyDir);
      for (const file of dailyFiles.slice(-7)) { // Last 7 days
        try {
          const dailyData = JSON.parse(await fs.readFile(path.join(dailyDir, file), 'utf8'));
          recentDailyData.push(dailyData);
        } catch (error) {
          console.log(`Error reading daily file ${file}:`, error.message);
        }
      }
    } catch (error) {
      console.log('No daily directory found');
    }

    // Calculate SOL rewards from master data if available
    const solRewards = [];
    if (masterData && masterData.transactions) {
      masterData.transactions
        .filter(tx => tx.solChange > 0.001)
        .forEach(tx => {
          solRewards.push({
            timestamp: tx.timestamp,
            signature: tx.signature,
            solEarned: tx.solChange,
            date: new Date(tx.timestamp * 1000).toISOString().split('T')[0]
          });
        });
    }

    const totalSolRewards = solRewards.reduce((sum, reward) => sum + reward.solEarned, 0);
    const averageSolPerReward = solRewards.length > 0 ? totalSolRewards / solRewards.length : 0;
    const biggestSolReward = Math.max(...solRewards.map(r => r.solEarned), 0);

    const response = {
      summary: {
        // Real Helius data
        totalWpondDistributed: totalWpondDistributed,
        totalWinners: totalRecipients,
        totalClaims: totalClaims,
        biggestRecipient: biggestRecipient,
        averageWpondPerWinner: averageWpondPerRecipient,
        averageClaimsPerWinner: averageClaimsPerRecipient,
        successRate: 100, // Helius data is all successful claims
        
        // Additional context from master data
        totalTransactions: masterData ? masterData.totalTransactions : 0,
        totalFees: masterData ? masterData.totalFees : 0,
        lastUpdated: masterData ? masterData.lastUpdated : new Date().toISOString(),
        wallet: masterData ? masterData.wallet : 'Helius Data',
        
        // SOL rewards data
        totalSolRewards: totalSolRewards,
        averageSolPerReward: averageSolPerReward,
        biggestSolReward: biggestSolReward
      },
      // Real Helius winners data
      topWinners: heliusData.recipients.map(recipient => ({
        rank: recipient.rank,
        wallet: recipient.wallet,
        totalWpondEarned: recipient.wpondAmount,
        transferCount: recipient.claimCount,
        averageWpondPerTransfer: recipient.wpondAmount / recipient.claimCount,
        biggestReward: recipient.wpondAmount,
        date: recipient.date
      })),
      recentTransactions: masterData ? masterData.transactions.slice(0, 10) : [],
      dailyStats: Object.entries(dailyStats).slice(-30), // Last 30 days
      recentDailyData,
      updateStats: {
        totalRuns: updateLogs.totalRuns,
        lastRun: updateLogs.lastRun,
        recentRuns: updateLogs.runs.slice(-5)
      },
      solRewards: solRewards.slice(0, 20), // Top 20 SOL rewards
      wpondStats: heliusData.summary
    };

    res.json(response);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const masterDataPath = path.join(__dirname, '..', 'data', 'wpond-mining-master.json');
    const masterData = JSON.parse(await fs.readFile(masterDataPath, 'utf8'));
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    const transactions = masterData.transactions.slice(start, end);
    const total = masterData.transactions.length;
    
    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error reading transactions:', error);
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

// New API endpoint for REAL Helius winners data
app.get('/api/winners', async (req, res) => {
  try {
    const heliusDataPath = path.join(__dirname, '..', 'helius-dashboard-data.json');
    const heliusData = JSON.parse(await fs.readFile(heliusDataPath, 'utf8'));
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    const winners = heliusData.recipients.slice(start, end);
    const total = heliusData.recipients.length;
    
    res.json({
      winners: winners.map(recipient => ({
        rank: recipient.rank,
        wallet: recipient.wallet,
        totalWpondEarned: recipient.wpondAmount,
        transferCount: recipient.claimCount,
        averageWpondPerTransfer: recipient.wpondAmount / recipient.claimCount,
        biggestReward: recipient.wpondAmount,
        date: recipient.date
      })),
      summary: heliusData.summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error reading winners data:', error);
    res.status(500).json({ error: 'Failed to load winners data' });
  }
});

// Serve the main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 wPOND Mining Dashboard running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api/data`);
  console.log(`🏆 Winners API available at http://localhost:${PORT}/api/winners`);
  console.log(`💰 Using REAL Helius data with 1,442 winners!`);
}); 