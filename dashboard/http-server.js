const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
  console.log('Request received:', req.method, req.url);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
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
    }));
    return;
  }
  
  if (req.url === '/') {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(indexPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

console.log('🚀 Starting basic HTTP server on port', PORT);

server.listen(PORT, () => {
  console.log(`🏆 Basic HTTP server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api/data`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});
