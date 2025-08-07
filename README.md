# 🏆 wPOND Mining Winners Dashboard

A real-time dashboard showcasing wPOND token mining rewards, winners, and statistics.

## 🚀 Features

- **Real-time wPOND Token Tracking**: Decodes and displays actual wPOND token amounts from blockchain transactions
- **Winner Leaderboard**: Shows top performers with total wPOND earned, mining count, and average rewards
- **Daily Statistics**: Tracks daily wPOND distribution and mining activity
- **Interactive Charts**: Visual representation of mining performance over time
- **Transaction History**: Detailed view of all wPOND mining transactions

## 📊 Dashboard Highlights

- **Total wPOND Distributed**: Real-time tracking of all wPOND tokens distributed
- **Active Miners**: Number of unique wallets participating in mining
- **Success Rate**: Percentage of successful mining transactions
- **Average Rewards**: Average wPOND tokens earned per successful mining operation

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone <your-github-repo-url>
   cd CALLinSOL
   ```

2. **Install dependencies**:
   ```bash
   cd dashboard
   npm install
   ```

3. **Start the server**:
   ```bash
   node server.js
   ```

4. **Access the dashboard**:
   Open your browser and go to `http://localhost:3000`

## 📁 Project Structure

```
CALLinSOL/
├── dashboard/                 # Main dashboard application
│   ├── public/               # Frontend files
│   │   ├── index.html        # Main dashboard page
│   │   ├── styles.css        # Dashboard styling
│   │   └── script.js         # Frontend JavaScript
│   ├── server.js             # Main server file
│   ├── package.json          # Node.js dependencies
│   └── README.md             # This file
├── data/                     # Data files
│   ├── wpond-mining-master.json  # Main mining data
│   ├── daily/                # Daily data files
│   └── update-logs.json      # Update tracking
└── src/                      # Source utilities
    ├── programQueries.js     # Program query utilities
    ├── rpcUtils.js           # RPC connection utilities
    └── tokenQueries.js       # Token query utilities
```

## 🔧 Configuration

The dashboard automatically reads from the `data/wpond-mining-master.json` file, which contains:
- Transaction history with wPOND involvement
- Wallet addresses and mining statistics
- Timestamp and signature data
- Success/failure status

## 🎯 Key Metrics

- **wPOND Token Amounts**: Decoded from blockchain transactions (using SOL changes as proxy)
- **Winner Tracking**: Real wallet addresses and their earnings
- **Mining Performance**: Success rates, daily volumes, and trends
- **Historical Data**: Complete transaction history with timestamps

## 🚀 Deployment

### Local Development
```bash
cd dashboard
npm install
node server.js
```

### Production Deployment
1. Set up your production environment
2. Install dependencies: `npm install`
3. Start the server: `node server.js`
4. Configure your web server to proxy to port 3000

## 📈 Data Analysis

The dashboard processes blockchain data to:
- Decode wPOND token amounts from transactions
- Track recipient wallets and their earnings
- Calculate daily and overall statistics
- Generate winner leaderboards

## 🔍 Troubleshooting

### Port Issues
If you encounter port binding issues on Windows:
1. Run PowerShell as Administrator
2. Allow Node.js through Windows Firewall
3. Try using a different port (8080, 5000, etc.)

### Data Loading Issues
- Ensure `data/wpond-mining-master.json` exists and is valid JSON
- Check file permissions
- Verify the data structure matches expected format

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🏆 About wPOND Mining

This dashboard tracks wPOND token mining activities on the Solana blockchain, providing real-time insights into:
- Mining rewards distribution
- Winner performance
- Network activity
- Historical trends

---

**Built with ❤️ for the wPOND community** 