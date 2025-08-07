const { getTokenBalance, getTokenAccountsByOwner } = require('./src/tokenQueries');
const { getAccountInfo } = require('./src/programQueries');
const { rpcCall } = require('./src/rpcUtils');
const config = require('./config');

// Target wallet to analyze
const TARGET_WALLET = 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT';

class PaymentDashboard {
  constructor() {
    this.wallet = TARGET_WALLET;
    this.paymentData = {
      totalOutgoing: 0,
      recipients: new Map(),
      tokenPayments: new Map(),
      recentTransactions: [],
      topRecipients: [],
      paymentTrends: []
    };
  }

  /**
   * Sleep function to avoid rate limits
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get recent signatures for the wallet
   */
  async getRecentSignatures(limit = 10) {
    try {
      const signatures = await rpcCall('getSignaturesForAddress', [
        this.wallet,
        { limit }
      ]);
      return signatures;
    } catch (error) {
      console.error('Error getting signatures:', error.message);
      return [];
    }
  }

  /**
   * Get transaction details with retry logic
   */
  async getTransaction(signature, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const tx = await rpcCall('getTransaction', [
          signature,
          { encoding: 'json', maxSupportedTransactionVersion: 0 }
        ]);
        return tx;
      } catch (error) {
        if (error.message.includes('429')) {
          console.log(`Rate limited, waiting ${(i + 1) * 1000}ms...`);
          await this.sleep((i + 1) * 1000);
          continue;
        }
        console.error(`Error getting transaction ${signature}:`, error.message);
        return null;
      }
    }
    return null;
  }

  /**
   * Analyze outgoing payments from transaction
   */
  analyzeOutgoingPayments(transaction) {
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

    // Calculate balance change
    const balanceChange = preBalances[walletIndex] - postBalances[walletIndex];
    
    // If balance decreased, it's an outgoing payment
    if (balanceChange > 0) {
      return {
        amount: balanceChange / 1e9, // Convert lamports to SOL
        recipients: this.extractRecipients(accountKeys, preBalances, postBalances),
        timestamp: transaction.blockTime,
        signature: transaction.transaction.signatures[0],
        success: !meta.err,
        fee: meta.fee / 1e9
      };
    }

    return null;
  }

  /**
   * Extract recipients from transaction
   */
  extractRecipients(accountKeys, preBalances, postBalances) {
    const recipients = [];
    
    for (let i = 0; i < accountKeys.length; i++) {
      if (accountKeys[i] === this.wallet) continue;
      
      const balanceChange = postBalances[i] - preBalances[i];
      if (balanceChange > 0) {
        recipients.push({
          address: accountKeys[i],
          amount: balanceChange / 1e9
        });
      }
    }
    
    return recipients;
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance() {
    try {
      const accountInfo = await getAccountInfo(this.wallet);
      return accountInfo.lamports / 1e9; // Convert to SOL
    } catch (error) {
      console.error('Error getting wallet balance:', error.message);
      return 0;
    }
  }

  /**
   * Get token accounts for the wallet
   */
  async getTokenAccounts() {
    try {
      const accounts = await getTokenAccountsByOwner(this.wallet);
      return accounts;
    } catch (error) {
      console.error('Error getting token accounts:', error.message);
      return [];
    }
  }

  /**
   * Generate payment analytics with rate limiting
   */
  async generatePaymentAnalytics() {
    console.log('🔍 Analyzing payment data for wallet:', this.wallet);
    console.log('⏳ This may take a few moments...\n');

    // Get recent signatures (limit to 5 to avoid rate limits)
    const signatures = await this.getRecentSignatures(5);
    console.log(`📊 Found ${signatures.length} recent transactions`);

    let totalOutgoing = 0;
    const recipients = new Map();
    const successfulPayments = [];
    const failedPayments = [];

    // Analyze each transaction with delays
    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      console.log(`Processing transaction ${i + 1}/${signatures.length}...`);
      
      const tx = await this.getTransaction(sig.signature);
      const payment = this.analyzeOutgoingPayments(tx);
      
      if (payment) {
        if (payment.success) {
          totalOutgoing += payment.amount;
          successfulPayments.push(payment);
          
          // Track recipients
          payment.recipients.forEach(recipient => {
            const current = recipients.get(recipient.address) || 0;
            recipients.set(recipient.address, current + recipient.amount);
          });
        } else {
          failedPayments.push(payment);
        }
      }
      
      // Add delay between requests to avoid rate limits
      if (i < signatures.length - 1) {
        await this.sleep(500);
      }
    }

    // Sort recipients by amount
    const topRecipients = Array.from(recipients.entries())
      .map(([address, amount]) => ({ address, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalOutgoing,
      topRecipients,
      recentPayments: successfulPayments.slice(0, 5),
      failedPayments: failedPayments.slice(0, 3),
      totalTransactions: signatures.length
    };
  }

  /**
   * Display dashboard
   */
  async displayDashboard() {
    console.log('💰 PAYMENT ANALYTICS DASHBOARD 💰');
    console.log('=====================================\n');

    // Get current balance
    const currentBalance = await this.getWalletBalance();
    console.log(`🏦 Current Balance: ${currentBalance.toFixed(4)} SOL`);

    // Get token accounts
    const tokenAccounts = await getTokenAccountsByOwner(this.wallet);
    console.log(`🎯 Token Accounts: ${tokenAccounts.length}\n`);

    // Generate payment analytics
    const analytics = await this.generatePaymentAnalytics();

    console.log('📈 PAYMENT SUMMARY');
    console.log('-------------------');
    console.log(`Total Outgoing: ${analytics.totalOutgoing.toFixed(4)} SOL`);
    console.log(`Recent Transactions: ${analytics.totalTransactions}`);
    console.log(`Successful Payments: ${analytics.recentPayments.length}`);
    console.log(`Failed Payments: ${analytics.failedPayments.length}\n`);

    if (analytics.topRecipients.length > 0) {
      console.log('👥 TOP RECIPIENTS');
      console.log('------------------');
      analytics.topRecipients.forEach((recipient, index) => {
        console.log(`${index + 1}. ${recipient.address}`);
        console.log(`   Amount: ${recipient.amount.toFixed(4)} SOL`);
      });
      console.log('');
    }

    if (analytics.recentPayments.length > 0) {
      console.log('🕒 RECENT PAYMENTS');
      console.log('------------------');
      analytics.recentPayments.forEach((payment, index) => {
        const date = new Date(payment.timestamp * 1000).toLocaleString();
        console.log(`${index + 1}. ${date}`);
        console.log(`   Amount: ${payment.amount.toFixed(4)} SOL`);
        console.log(`   Fee: ${payment.fee.toFixed(6)} SOL`);
        console.log(`   Recipients: ${payment.recipients.length}`);
        console.log(`   Signature: ${payment.signature.slice(0, 8)}...`);
        console.log('');
      });
    }

    if (analytics.failedPayments.length > 0) {
      console.log('❌ FAILED PAYMENTS');
      console.log('------------------');
      analytics.failedPayments.forEach((payment, index) => {
        const date = new Date(payment.timestamp * 1000).toLocaleString();
        console.log(`${index + 1}. ${date}`);
        console.log(`   Amount: ${payment.amount.toFixed(4)} SOL`);
        console.log(`   Signature: ${payment.signature.slice(0, 8)}...`);
        console.log('');
      });
    }

    console.log('✅ Dashboard complete!');
    console.log('\n💡 Tip: For more detailed analysis, consider using a dedicated RPC provider');
  }
}

// Create and run dashboard
async function main() {
  const dashboard = new PaymentDashboard();
  await dashboard.displayDashboard();
}

// Export for use in other files
module.exports = {
  PaymentDashboard,
  TARGET_WALLET
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 