const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    PAYOUT_WALLET: 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8pS53opT',
    HELIUS_API_KEY: '431ca765-2f35-4b23-8abd-db03796bd85f',
    HOURS_BACK: 24, // Reduced to 24 hours for more frequent updates
    OUTPUT_FILE: 'new-transactions.json',
    LOG_FILE: 'sweeper-log.json',
    DASHBOARD_DATA_FILE: 'public/helius-dashboard-data.json',
    MAX_RETRIES: 5,
    BASE_DELAY: 1000,
    MAX_DELAY: 30000,
    // Exclude bank and sister wallets from mining rewards
    EXCLUDED_WALLETS: [
        'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8pS53opT', // opt (payout wallet)
        '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL'  // iWWL (sister wallet)
    ]
};

// Track processed transactions to avoid duplicates
let processedSignatures = new Set();
let logData = {
    lastRun: null,
    totalProcessed: 0,
    newTransactions: 0,
    errors: []
};

// Load existing processed signatures if available
function loadProcessedSignatures() {
    try {
        if (fs.existsSync('processed-signatures.json')) {
            const data = JSON.parse(fs.readFileSync('processed-signatures.json', 'utf8'));
            processedSignatures = new Set(data.signatures || []);
            console.log(`📚 Loaded ${processedSignatures.size} previously processed signatures`);
        }
    } catch (error) {
        console.log('⚠️ Could not load processed signatures, starting fresh');
    }
}

// Save processed signatures
function saveProcessedSignatures() {
    try {
        const data = {
            signatures: Array.from(processedSignatures),
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync('processed-signatures.json', JSON.stringify(data, null, 2));
        console.log('💾 Saved processed signatures');
    } catch (error) {
        console.error('❌ Error saving processed signatures:', error.message);
    }
}

// Load log data
function loadLogData() {
    try {
        if (fs.existsSync(CONFIG.LOG_FILE)) {
            logData = JSON.parse(fs.readFileSync(CONFIG.LOG_FILE, 'utf8'));
        }
    } catch (error) {
        console.log('⚠️ Could not load log data, starting fresh');
    }
}

// Save log data
function saveLogData() {
    try {
        logData.lastRun = new Date().toISOString();
        fs.writeFileSync(CONFIG.LOG_FILE, JSON.stringify(logData, null, 2));
    } catch (error) {
        console.error('❌ Error saving log data:', error.message);
    }
}

// Load existing dashboard data
function loadDashboardData() {
    try {
        if (fs.existsSync(CONFIG.DASHBOARD_DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(CONFIG.DASHBOARD_DATA_FILE, 'utf8'));
            console.log(`📊 Loaded existing dashboard data with ${data.allRecipients?.length || 0} recipients`);
            return data;
        }
    } catch (error) {
        console.log('⚠️ Could not load existing dashboard data:', error.message);
    }
    return null;
}

// Save updated dashboard data
function saveDashboardData(data) {
    try {
        fs.writeFileSync(CONFIG.DASHBOARD_DATA_FILE, JSON.stringify(data, null, 2));
        console.log(`💾 Saved updated dashboard data with ${data.allRecipients?.length || 0} recipients`);
    } catch (error) {
        console.error('❌ Error saving dashboard data:', error.message);
        throw error;
    }
}

// Calculate timestamp for X hours ago
function getTimestampHoursAgo(hours) {
    const now = new Date();
    const hoursAgo = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    return hoursAgo.toISOString();
}

// Sleep function for delays
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch transactions from Helius API with retry logic
async function fetchRecentTransactions() {
    const timestamp = getTimestampHoursAgo(CONFIG.HOURS_BACK);
    console.log(`🔍 Fetching transactions since: ${timestamp}`);
    
    // Use the v1 API endpoint which is more reliable
    const url = `https://api.helius.xyz/v1/addresses/${CONFIG.PAYOUT_WALLET}/transactions?api-key=${CONFIG.HELIUS_API_KEY}`;
    
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
        try {
            console.log(`🔄 Attempt ${attempt}/${CONFIG.MAX_RETRIES}...`);
            
            const response = await fetch(url);
            
            if (response.status === 429) {
                // Rate limited - calculate delay with exponential backoff
                const delay = Math.min(
                    CONFIG.BASE_DELAY * Math.pow(2, attempt - 1),
                    CONFIG.MAX_DELAY
                );
                
                console.log(`⏳ Rate limited (429). Waiting ${delay/1000}s before retry...`);
                await sleep(delay);
                continue;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`📊 Found ${data.length} total transactions`);
            return data;
            
        } catch (error) {
            if (attempt === CONFIG.MAX_RETRIES) {
                console.error('❌ Error fetching transactions after all retries:', error.message);
                logData.errors.push({
                    timestamp: new Date().toISOString(),
                    error: error.message
                });
                return [];
            }
            
            // For non-429 errors, wait a bit before retrying
            const delay = CONFIG.BASE_DELAY * attempt;
            console.log(`⚠️ Attempt ${attempt} failed: ${error.message}. Waiting ${delay/1000}s before retry...`);
            await sleep(delay);
        }
    }
    
    return [];
}

// Process transactions and extract wPOND transfers
function processTransactions(transactions) {
    if (!Array.isArray(transactions)) {
        console.log('⚠️ No transactions to process');
        return [];
    }

    const newTransactions = [];
    let processedCount = 0;

    transactions.forEach(tx => {
        if (processedSignatures.has(tx.signature)) {
            return; // Skip already processed
        }

        processedCount++;

        // Look for wPOND transfers in the transaction
        if (tx.tokenTransfers && Array.isArray(tx.tokenTransfers)) {
            tx.tokenTransfers.forEach(transfer => {
                // Skip if recipient is in excluded wallets (bank/sister wallets)
                if (CONFIG.EXCLUDED_WALLETS.includes(transfer.toUserAccount)) {
                    console.log(`🚫 Skipping excluded wallet: ${transfer.toUserAccount.substring(0, 8)}...`);
                    return;
                }
                
                if (transfer.mint === 'Ea5SjE2Y6yvCeW5SYTk7EKbzQ4NC5Rqt077CciSqk5rP' && // wPOND mint
                    transfer.fromUserAccount === CONFIG.PAYOUT_WALLET &&
                    transfer.toUserAccount !== CONFIG.PAYOUT_WALLET) {
                    
                    const newTx = {
                        signature: tx.signature,
                        timestamp: tx.timestamp,
                        date: new Date(tx.timestamp * 1000).toISOString().split('T')[0],
                        wallet: transfer.toUserAccount,
                        amount: transfer.tokenAmount,
                        type: 'wPOND Transfer'
                    };
                    
                    newTransactions.push(newTx);
                    console.log(`🎯 New wPOND transfer: ${transfer.tokenAmount} → ${transfer.toUserAccount.substring(0, 8)}...`);
                }
            });
        }
        
        // Mark as processed
        processedSignatures.add(tx.signature);
    });
    
    logData.totalProcessed += processedCount;
    logData.newTransactions += newTransactions.length;
    
    console.log(`✅ Processed ${processedCount} transactions, found ${newTransactions.length} new wPOND transfers`);
    
    return newTransactions;
}

// Clean up existing data to remove excluded wallets
function cleanupExcludedWallets(recipients) {
    const originalCount = recipients.length;
    const filteredRecipients = recipients.filter(r => !CONFIG.EXCLUDED_WALLETS.includes(r.wallet));
    const removedCount = originalCount - filteredRecipients.length;
    
    if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} excluded wallets from existing data`);
    }
    
    return filteredRecipients;
}

// Merge new transactions with existing dashboard data
function mergeWithDashboardData(newTransactions, existingData) {
    if (!existingData) {
        existingData = {
            summary: {
                totalClaims: 0,
                totalWpond: 0,
                totalRecipients: 0,
                biggestWinner: '',
                biggestAmount: 0,
                averageAmount: 0
            },
            allRecipients: []
        };
    }

    // Clean up any existing excluded wallets
    let updatedRecipients = cleanupExcludedWallets(existingData.allRecipients || []);
    
    newTransactions.forEach(tx => {
        // Check if recipient already exists
        const existingIndex = updatedRecipients.findIndex(r => r.wallet === tx.wallet);
        
        if (existingIndex >= 0) {
            // Update existing recipient
            const existing = updatedRecipients[existingIndex];
            existing.amount += tx.amount;
            existing.claimCount = (existing.claimCount || 0) + 1;
            existing.date = tx.date; // Update to most recent date
            existing.signature = tx.signature; // Update to most recent signature
        } else {
            // Add new recipient
            updatedRecipients.push({
                wallet: tx.wallet,
                amount: tx.amount,
                claimCount: 1,
                date: tx.date,
                signature: tx.signature
            });
        }
    });

    // Sort by amount (highest first)
    updatedRecipients.sort((a, b) => b.amount - a.amount);

    // Update summary
    const totalWpond = updatedRecipients.reduce((sum, r) => sum + r.amount, 0);
    const totalClaims = updatedRecipients.reduce((sum, r) => sum + r.claimCount, 0);
    const biggestWinner = updatedRecipients[0]?.wallet || '';
    const biggestAmount = updatedRecipients[0]?.amount || 0;
    const averageAmount = totalClaims > 0 ? totalWpond / totalClaims : 0;

    return {
        summary: {
            totalClaims,
            totalWpond,
            totalRecipients: updatedRecipients.length,
            biggestWinner,
            biggestAmount,
            averageAmount
        },
        allRecipients: updatedRecipients
    };
}

// Save new transactions
function saveNewTransactions(transactions) {
    if (transactions.length === 0) {
        console.log('📝 No new transactions to save');
        return;
    }
    
    try {
        const outputData = {
            timestamp: new Date().toISOString(),
            hoursBack: CONFIG.HOURS_BACK,
            totalFound: transactions.length,
            transactions: transactions
        };
        
        fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(outputData, null, 2));
        console.log(`💾 Saved ${transactions.length} new transactions to ${CONFIG.OUTPUT_FILE}`);
    } catch (error) {
        console.error('❌ Error saving transactions:', error.message);
        logData.errors.push({
            timestamp: new Date().toISOString(),
            error: `Save error: ${error.message}`
        });
    }
}

// Main execution function
async function runDailySweeper() {
    console.log('🚀 Starting Daily TX Sweeper...');
    console.log(`🎯 Target: ${CONFIG.PAYOUT_WALLET}`);
    console.log(`⏰ Looking back: ${CONFIG.HOURS_BACK} hours`);
    
    // Load existing data
    loadProcessedSignatures();
    loadLogData();
    const existingDashboardData = loadDashboardData();
    
    try {
        // Fetch recent transactions
        const transactions = await fetchRecentTransactions();
        
        if (transactions.length === 0) {
            console.log('⚠️ No transactions found or API error occurred');
            return;
        }
        
        // Process and extract new wPOND transfers
        const newTransactions = processTransactions(transactions);
        
        if (newTransactions.length > 0) {
            // Merge with existing dashboard data
            const updatedDashboardData = mergeWithDashboardData(newTransactions, existingDashboardData);
            
            // Save updated dashboard data
            saveDashboardData(updatedDashboardData);
            
            // Save new transactions log
            saveNewTransactions(newTransactions);
        }
        
        // Save processing state
        saveProcessedSignatures();
        saveLogData();
        
        console.log('🎉 Daily TX Sweeper completed successfully!');
        console.log(`📊 Summary: ${logData.totalProcessed} total processed, ${logData.newTransactions} new wPOND transfers`);
        
    } catch (error) {
        console.error('❌ Fatal error in daily sweeper:', error.message);
        logData.errors.push({
            timestamp: new Date().toISOString(),
            error: `Fatal error: ${error.message}`
        });
        saveLogData();
    }
}

// Run if called directly
if (require.main === module) {
    // Check if API key is configured
    if (CONFIG.HELIUS_API_KEY === 'YOUR_HELIUS_API_KEY_HERE') {
        console.error('❌ Please configure your Helius API key in the CONFIG object');
        process.exit(1);
    }
    
    runDailySweeper().catch(console.error);
}

module.exports = {
    runDailySweeper,
    CONFIG
};
