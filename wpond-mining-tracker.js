const { getTokenBalance, getTokenAccountsByOwner } = require('./src/tokenQueries');
const { getAccountInfo } = require('./src/programQueries');
const { rpcCall, summarizeRpcStats, HeliusError } = require('./src/rpcUtils');
const config = require('./config');
const fs = require('fs').promises;
const path = require('path');

// Target wallet and wPOND token info
const TARGET_WALLET = 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT';
const WPOND_MINT = 'EkpQGSJtjMFqKZ1KQanSqYXRcF8fBopzLHYxdM65Qjm'; // wPOND mint address

class WPondMiningTracker {
  constructor() {
    this.wallet = TARGET_WALLET;
    this.wpondMint = WPOND_MINT;
    this.dataDir = './data';
    this.masterFile = path.join(this.dataDir, 'wpond-mining-master.json');
    this.dailyDir = path.join(this.dataDir, 'daily');
    this.lastProcessedFile = path.join(this.dataDir, 'last-processed.json');
  }

  /**
   * Initialize data directory structure
   */
  async initializeDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.dailyDir, { recursive: true });
      console.log('📁 Data directories initialized');
    } catch (error) {
      console.error('Error creating data directories:', error.message);
    }
  }

  /**
   * Sleep function to avoid rate limits
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all signatures for the wallet (paginated)
   */
  async getAllSignatures(before = null, limit = 1000) {
    try {
      const params = [this.wallet, { limit }];
      if (before) {
        params[1].before = before;
      }
      
      const signatures = await rpcCall('getSignaturesForAddress', params);
      return signatures;
    } catch (error) {
      console.error('Error getting signatures:', error.message);
      return [];
    }
  }

  /**
   * Get transaction details (Helius client handles 429/backoff when key is set)
   */
  async getTransaction(signature) {
    try {
      return await rpcCall('getTransaction', [
        signature,
        { encoding: 'json', maxSupportedTransactionVersion: 0 }
      ]);
    } catch (error) {
      const msg =
        error instanceof HeliusError
          ? `[${error.code}] ${error.message}`
          : error.message;
      console.error(`Error getting transaction ${signature}:`, msg);
      return null;
    }
  }

  /**
   * Analyze transaction for wPOND transfers
   */
  analyzeWPondTransfer(transaction) {
    if (!transaction || !transaction.meta || !transaction.transaction) {
      return null;
    }

    const { meta, transaction: tx } = transaction;
    const preBalances = meta.preBalances;
    const postBalances = meta.postBalances;
    const accountKeys = tx.message.accountKeys;

    // Find our wallet's index
    const walletIndex = accountKeys.findIndex(key => key === this.wallet);
    if (walletIndex === -1) return null;

    // Check if this involves wPOND token accounts
    const wpondInvolved = this.checkWPondInvolvement(transaction);
    if (!wpondInvolved) return null;

    // Calculate SOL balance change (for fees)
    const solBalanceChange = preBalances[walletIndex] - postBalances[walletIndex];
    
    return {
      timestamp: transaction.blockTime,
      signature: transaction.transaction.signatures[0],
      success: !meta.err,
      fee: meta.fee / 1e9,
      solChange: solBalanceChange / 1e9,
      wpondInvolved: true,
      slot: transaction.slot,
      blockTime: transaction.blockTime
    };
  }

  /**
   * Check if transaction involves wPOND tokens
   */
  checkWPondInvolvement(transaction) {
    // This is a simplified check - in practice you'd want to decode the transaction
    // to see if it involves wPOND token transfers
    const { meta } = transaction;
    
    // Check if there are any token balance changes
    if (meta.preTokenBalances && meta.postTokenBalances) {
      return true;
    }
    
    // Check if wPOND program is involved
    const accountKeys = transaction.transaction.message.accountKeys;
    return accountKeys.some(key => key === this.wpondMint);
  }

  /**
   * Load existing master data
   */
  async loadMasterData() {
    try {
      const data = await fs.readFile(this.masterFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        wallet: this.wallet,
        wpondMint: this.wpondMint,
        totalTransactions: 0,
        totalFees: 0,
        transactions: [],
        lastUpdated: null,
        metadata: {
          createdAt: new Date().toISOString(),
          description: 'wPOND Mining Rewards Master Data'
        }
      };
    }
  }

  /**
   * Save master data
   */
  async saveMasterData(data) {
    try {
      data.lastUpdated = new Date().toISOString();
      await fs.writeFile(this.masterFile, JSON.stringify(data, null, 2));
      console.log('💾 Master data saved');
    } catch (error) {
      console.error('Error saving master data:', error.message);
    }
  }

  /**
   * Save daily data
   */
  async saveDailyData(date, data) {
    try {
      const fileName = `${date}.json`;
      const filePath = path.join(this.dailyDir, fileName);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      console.log(`📅 Daily data saved: ${fileName}`);
    } catch (error) {
      console.error('Error saving daily data:', error.message);
    }
  }

  /**
   * Get last processed signature
   */
  async getLastProcessed() {
    try {
      const data = await fs.readFile(this.lastProcessedFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { lastSignature: null, lastSlot: null };
    }
  }

  /**
   * Save last processed signature
   */
  async saveLastProcessed(signature, slot) {
    try {
      const data = { lastSignature: signature, lastSlot: slot, updatedAt: new Date().toISOString() };
      await fs.writeFile(this.lastProcessedFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving last processed:', error.message);
    }
  }

  /**
   * Query entire wPOND payment history
   */
  async queryEntireHistory() {
    console.log('🔍 Querying entire wPOND payment history...');
    console.log('⏳ This will take a while due to rate limits...\n');

    await this.initializeDataDir();
    const masterData = await this.loadMasterData();
    
    let allSignatures = [];
    let before = null;
    let batchCount = 0;
    const maxBatches = 50; // Limit to avoid overwhelming the RPC

    // Collect all signatures
    while (batchCount < maxBatches) {
      console.log(`📊 Fetching batch ${batchCount + 1}/${maxBatches}...`);
      
      const signatures = await this.getAllSignatures(before, 1000);
      if (signatures.length === 0) break;
      
      allSignatures = allSignatures.concat(signatures);
      before = signatures[signatures.length - 1].signature;
      batchCount++;
      
      // Rate limiting
      await this.sleep(1000);
    }

    console.log(`📈 Found ${allSignatures.length} total transactions to analyze`);

    // Analyze transactions
    let wpondTransactions = [];
    let totalFees = 0;

    for (let i = 0; i < allSignatures.length; i++) {
      const sig = allSignatures[i];
      console.log(`Processing ${i + 1}/${allSignatures.length}: ${sig.signature.slice(0, 8)}...`);
      
      const tx = await this.getTransaction(sig.signature);
      const wpondTransfer = this.analyzeWPondTransfer(tx);
      
      if (wpondTransfer && wpondTransfer.success) {
        wpondTransactions.push(wpondTransfer);
        totalFees += wpondTransfer.fee;
      }
      
      // Rate limiting
      if (i % 10 === 0) {
        await this.sleep(1000);
      }
    }

    // Update master data
    masterData.totalTransactions = wpondTransactions.length;
    masterData.totalFees = totalFees;
    masterData.transactions = wpondTransactions;
    masterData.lastSignature = allSignatures[0]?.signature;

    await this.saveMasterData(masterData);
    
    console.log(`✅ History query complete!`);
    console.log(`📊 Total wPOND transactions: ${wpondTransactions.length}`);
    console.log(`💰 Total fees spent: ${totalFees.toFixed(6)} SOL`);
    
    return masterData;
  }

  /**
   * Get incremental updates (new transactions since last check)
   */
  async getIncrementalUpdates() {
    console.log('🔄 Getting incremental updates...');
    
    const lastProcessed = await this.getLastProcessed();
    const masterData = await this.loadMasterData();
    
    let newSignatures = [];
    let before = null;
    let foundLast = false;
    
    // Get new signatures since last processed
    while (!foundLast && newSignatures.length < 1000) {
      const signatures = await this.getAllSignatures(before, 100);
      
      for (const sig of signatures) {
        if (sig.signature === lastProcessed.lastSignature) {
          foundLast = true;
          break;
        }
        newSignatures.push(sig);
      }
      
      if (signatures.length === 0) break;
      before = signatures[signatures.length - 1].signature;
      await this.sleep(500);
    }

    console.log(`📊 Found ${newSignatures.length} new transactions`);

    // Analyze new transactions
    const newWPondTransactions = [];
    let newFees = 0;

    for (let i = 0; i < newSignatures.length; i++) {
      const sig = newSignatures[i];
      console.log(`Processing new transaction ${i + 1}/${newSignatures.length}...`);
      
      const tx = await this.getTransaction(sig.signature);
      const wpondTransfer = this.analyzeWPondTransfer(tx);
      
      if (wpondTransfer && wpondTransfer.success) {
        newWPondTransactions.push(wpondTransfer);
        newFees += wpondTransfer.fee;
      }
      
      await this.sleep(1000);
    }

    // Update master data
    if (newWPondTransactions.length > 0) {
      masterData.transactions = newWPondTransactions.concat(masterData.transactions);
      masterData.totalTransactions += newWPondTransactions.length;
      masterData.totalFees += newFees;
      masterData.lastSignature = newSignatures[0]?.signature;

      await this.saveMasterData(masterData);
      await this.saveLastProcessed(newSignatures[0]?.signature, newWPondTransactions[0]?.slot);
    }

    // Save daily summary
    const today = new Date().toISOString().split('T')[0];
    const dailyData = {
      date: today,
      newTransactions: newWPondTransactions.length,
      newFees: newFees,
      transactions: newWPondTransactions
    };
    await this.saveDailyData(today, dailyData);

    console.log(`✅ Incremental update complete!`);
    console.log(`📊 New wPOND transactions: ${newWPondTransactions.length}`);
    console.log(`💰 New fees: ${newFees.toFixed(6)} SOL`);
    
    return {
      newTransactions: newWPondTransactions,
      newFees,
      totalTransactions: masterData.totalTransactions,
      totalFees: masterData.totalFees
    };
  }

  /**
   * Generate summary report
   */
  async generateReport() {
    const masterData = await this.loadMasterData();
    
    console.log('\n📊 WPOND MINING REWARDS REPORT');
    console.log('================================');
    console.log(`Wallet: ${masterData.wallet}`);
    console.log(`Total Transactions: ${masterData.totalTransactions}`);
    console.log(`Total Fees: ${masterData.totalFees.toFixed(6)} SOL`);
    console.log(`Last Updated: ${masterData.lastUpdated}`);
    
    if (masterData.transactions.length > 0) {
      const recent = masterData.transactions.slice(0, 5);
      console.log('\n🕒 Recent Transactions:');
      recent.forEach((tx, i) => {
        const date = new Date(tx.timestamp * 1000).toLocaleString();
        console.log(`${i + 1}. ${date} - Fee: ${tx.fee.toFixed(6)} SOL`);
      });
    }
  }
}

// Command line interface
async function main() {
  const tracker = new WPondMiningTracker();
  const command = process.argv[2];

  switch (command) {
    case 'history':
      await tracker.queryEntireHistory();
      break;
    case 'update':
      await tracker.getIncrementalUpdates();
      break;
    case 'report':
      await tracker.generateReport();
      break;
    default:
      console.log('Usage:');
      console.log('  node wpond-mining-tracker.js history  - Query entire history');
      console.log('  node wpond-mining-tracker.js update   - Get incremental updates');
      console.log('  node wpond-mining-tracker.js report   - Generate summary report');
  }
}

module.exports = {
  WPondMiningTracker,
  TARGET_WALLET,
  WPOND_MINT
};

if (require.main === module) {
  main().catch(console.error);
} 