const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Simple test API
app.get('/api/data', (req, res) => {
  res.json({
    summary: {
      totalWpondDistributed: 1000,
      totalWinners: 5,
      averageWpondPerWinner: 200,
      successRate: 95,
      lastUpdated: new Date().toISOString(),
      miningWallet: 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT'
    },
    topWinners: [
      {
        wallet: 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT',
        totalWpondEarned: 500,
        transferCount: 10,
        averageWpondPerTransfer: 50,
        rank: 1,
        lastActivity: new Date().toISOString(),
        biggestReward: 100
      }
    ],
    dailyWpondRewards: [
      {
        date: '2025-01-07',
        wpondRewards: 200,
        transfers: 2,
        uniqueWinners: 1
      }
    ],
    recentWpondTransactions: [
      {
        timestamp: Date.now() / 1000,
        signature: 'test-signature',
        wpondAmount: 50,
        recipientWallet: 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT',
        date: new Date().toISOString().split('T')[0]
      }
    ],
    miningStats: {
      totalRuns: 1,
      lastRun: new Date().toISOString(),
      bestWpondDay: { date: '2025-01-07', wpondRewards: 200 },
      totalMiningVolume: 0.01,
      biggestSingleReward: 100
    }
  });
});

app.get('/api/transactions', (req, res) => {
  res.json({
    transactions: [
      {
        timestamp: Date.now() / 1000,
        signature: 'test-signature',
        wpondAmount: 50,
        recipientWallet: 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT'
      }
    ],
    pagination: {
      page: 1,
      limit: 50,
      total: 1,
      pages: 1
    }
  });
});

// Serve the main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

console.log('🚀 Starting simple wPOND Mining Dashboard server on port', PORT);

app.listen(PORT, () => {
  console.log(`🏆 Simple wPOND Mining Winners Dashboard running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api/data`);
}).on('error', (error) => {
  console.error('❌ Server error:', error);
});
