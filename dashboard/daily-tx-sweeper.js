const fs = require('fs');

console.log('🚀 DAILY wPOND SWEEPER - USING WORKING APPROACH\n');

// Configuration - EXACTLY like the working script
const CONFIG = {
    HELIUS_ENDPOINTS: [
        'https://mainnet.helius-rpc.com/?api-key=873850e4-1ff9-46c0-a669-3a48589516d2',
        'https://api.helius.xyz/v0/transactions/?api-key=873850e4-1ff9-46c0-a669-3a48589516d2'
    ],
    WPOND_MINT: '3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq',
    PAYOUT_WALLET: 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8pS53opT',
    BATCH_SIZE: 10,
    MAX_RETRIES: 20,
    DELAY_BETWEEN_BATCHES: 1500,
    SAVE_INTERVAL: 100,
    DASHBOARD_DATA_FILE: 'public/helius-dashboard-data.json',
    // Exclude bank and sister wallets from mining rewards
    EXCLUDED_WALLETS: [
        'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8pS53opT', // opt (payout wallet)
        '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL', // iWWL (sister wallet)
        '5KXZCyUaqHJ1T2wbcMXvLt9jYR87tDJS2Bf71gxYSZNt',  // another house wallet
        'HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2',  // suspected liquidity bot
        '2aC1XMPKr9yj9RdK6fPrGZ9QhC6b3zbn5aKfZQnUrWeP', // suspicious huge amount
            ]
};

// Load existing dashboard data
let existingDashboardData = null;
if (fs.existsSync(CONFIG.DASHBOARD_DATA_FILE)) {
    try {
        existingDashboardData = JSON.parse(fs.readFileSync(CONFIG.DASHBOARD_DATA_FILE, 'utf8'));
        console.log(`📊 Loaded existing dashboard data with ${existingDashboardData.allRecipients?.length || 0} recipients`);
    } catch (error) {
        console.log('⚠️ Could not load existing dashboard data:', error.message);
    }
}

// Get recent signatures from payout wallet
async function getRecentSignatures() {
    console.log('🔍 Getting existing signatures to process...');
    
    try {
        // Instead of fetching NEW signatures, use the existing ones like the working script
        // Check if we have all-signatures.json
        if (fs.existsSync('../all-signatures.json')) {
            const allSignaturesData = JSON.parse(fs.readFileSync('../all-signatures.json', 'utf8'));
            const allSignatures = Array.isArray(allSignaturesData) ? allSignaturesData : allSignaturesData.signatures || [];
            
            console.log(`📊 Found ${allSignatures.length} existing signatures to process`);
            
            // Filter to recent ones (last 24 hours worth)
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const recentSignatures = allSignatures.slice(-100); // Take last 100 signatures
            
            console.log(`🕐 Processing last ${recentSignatures.length} signatures`);
            return recentSignatures;
        } else {
            // Fallback: get a few recent signatures from API
            console.log('⚠️ No all-signatures.json found, fetching recent signatures...');
            
            const endpoint = CONFIG.HELIUS_ENDPOINTS[0];
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getSignaturesForAddress',
                    params: [
                        CONFIG.PAYOUT_WALLET,
                        { limit: 50 } // Reduced limit to avoid rate limits
                    ]
                })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const data = await response.json();
            
            if (data.error) throw new Error(`Helius error: ${data.error.message}`);
            
            const signatures = data.result || [];
            console.log(`📊 Found ${signatures.length} recent signatures`);
            return signatures;
        }
        
    } catch (error) {
        console.error('❌ Error getting signatures:', error.message);
        return [];
    }
}

// Ultra-reliable fetch function - EXACTLY like working script
async function fetchTransactionZeroErrors(signature, maxRetries = CONFIG.MAX_RETRIES) {
    const strategies = [
        // Strategy 1: Helius POST
        async () => {
            const endpoint = CONFIG.HELIUS_ENDPOINTS[Math.floor(Math.random() * CONFIG.HELIUS_ENDPOINTS.length)];
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'my-id',
                    method: 'getTransaction',
                    params: [signature, { encoding: 'json', maxSupportedTransactionVersion: 0 }]
                })
            });
            
            if (!response.ok) throw new Error(`Helius POST failed: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(`Helius error: ${data.error.message}`);
            return data.result;
        },
        
        // Strategy 2: Helius GET
        async () => {
            const endpoint = CONFIG.HELIUS_ENDPOINTS[Math.floor(Math.random() * CONFIG.HELIUS_ENDPOINTS.length)];
            const response = await fetch(`${endpoint.replace('/?', '/v0/transactions/?')}&signature=${signature}`);
            
            if (!response.ok) throw new Error(`Helius GET failed: ${response.status}`);
            const data = await response.json();
            return data;
        }
    ];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
            try {
                const result = await strategies[strategyIndex]();
                if (result) return result;
            } catch (error) {
                if (attempt === maxRetries && strategyIndex === strategies.length - 1) {
                    throw error;
                }
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 300));
            }
        }
    }
    
    throw new Error(`All strategies failed after ${maxRetries} attempts`);
}

// Process wPOND transaction - EXACTLY like working script
function processWpondTransaction(transaction) {
    try {
        if (!transaction || !transaction.meta || !transaction.transaction) return null;
        
        const { meta, transaction: tx } = transaction;
        
        // Check if this is a token transfer
        if (!meta.postTokenBalances || !meta.preTokenBalances) return null;
        
        const claims = [];
        
        // Process token balance changes
        for (let i = 0; i < meta.postTokenBalances.length; i++) {
            const postBalance = meta.postTokenBalances[i];
            const preBalance = meta.preTokenBalances.find(b => b.accountIndex === postBalance.accountIndex);
            
            if (!postBalance || !preBalance) continue;
            
            // Check if this is wPOND token
            if (postBalance.mint !== CONFIG.WPOND_MINT) continue;
            
            const preAmount = preBalance.uiTokenAmount?.uiAmount || 0;
            const postAmount = postBalance.uiTokenAmount?.uiAmount || 0;
            const change = postAmount - preAmount;
            
            // Only process positive changes (receiving wPOND)
            if (change <= 0) continue;
            
            // Get account info
            const accountIndex = postBalance.accountIndex;
            const account = tx.message.accountKeys[accountIndex];
            
            if (!account) continue;
            
            // Skip if this is the payout wallet or excluded wallets
            if (CONFIG.EXCLUDED_WALLETS.includes(account)) continue;
            
            claims.push({
                wallet: account,
                amount: change
            });
        }
        
        return claims;
    } catch (error) {
        console.log('⚠️ Error processing wPOND transaction:', error.message);
        return null;
    }
}

// Process batch of signatures - EXACTLY like working script
async function processBatch(signatures, batchNumber) {
    console.log(`🔄 Processing batch ${batchNumber}: ${signatures.length} signatures`);
    
    const batchClaims = [];
    const batchErrors = [];
    
    for (let i = 0; i < signatures.length; i++) {
        const signature = signatures[i];
        const progress = i + 1;
        
        try {
            console.log(`  [${progress}/${signatures.length}] ${signature.substring(0, 8)}...`);
            
            const transaction = await fetchTransactionZeroErrors(signature);
            const claims = processWpondTransaction(transaction);
            
            if (claims && claims.length > 0) {
                claims.forEach(claim => {
                    batchClaims.push({
                        recipient: claim.wallet,
                        wpondAmount: claim.amount,
                        date: new Date().toISOString().split('T')[0],
                        signature: signature,
                        timestamp: Math.floor(Date.now() / 1000)
                    });
                });
            }
            
            // Small delay between requests
            if (i < signatures.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } catch (error) {
            console.log(`  ❌ Error processing ${signature.substring(0, 8)}...: ${error.message}`);
            batchErrors.push({
                signature: signature,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    return { claims: batchClaims, errors: batchErrors };
}

// Merge new claims with existing dashboard data
function mergeWithDashboardData(newClaims, existingData) {
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
    
    // Convert existing data to claims format for easier merging, excluding blocked wallets
    const existingClaims = existingData.allRecipients
        .filter(r => !CONFIG.EXCLUDED_WALLETS.includes(r.wallet))
        .map(r => ({
            recipient: r.wallet,
            wpondAmount: r.amount,
            date: r.date,
            signature: r.signature,
            timestamp: r.timestamp || 0
        }));
    
    // Merge new claims with existing, excluding blocked wallets from new claims too
    const filteredNewClaims = newClaims.filter(claim => !CONFIG.EXCLUDED_WALLETS.includes(claim.recipient));
    const allClaims = [...existingClaims, ...filteredNewClaims];
    
    // Group by recipient
    const recipientMap = new Map();
    
    allClaims.forEach(claim => {
        if (!recipientMap.has(claim.recipient)) {
            recipientMap.set(claim.recipient, {
                wallet: claim.recipient,
                amount: 0,
                claimCount: 0,
                date: claim.date,
                signature: claim.signature,
                timestamp: claim.timestamp
            });
        }
        
        const recipient = recipientMap.get(claim.recipient);
        recipient.amount += claim.wpondAmount;
        recipient.claimCount += 1;
        
        // Keep the most recent date
        if (claim.timestamp > recipient.timestamp) {
            recipient.date = claim.date;
            recipient.signature = claim.signature;
            recipient.timestamp = claim.timestamp;
        }
    });
    
    // Convert to array and sort by amount
    const allRecipients = Array.from(recipientMap.values())
        .sort((a, b) => b.amount - a.amount);
    
    // Update summary
    const totalWpond = allRecipients.reduce((sum, r) => sum + r.amount, 0);
    const totalClaims = allRecipients.reduce((sum, r) => sum + r.claimCount, 0);
    const biggestWinner = allRecipients[0]?.wallet || '';
    const biggestAmount = allRecipients[0]?.amount || 0;
    const averageAmount = totalClaims > 0 ? totalWpond / totalClaims : 0;
    
    return {
        summary: {
            totalClaims,
            totalWpond,
            totalRecipients: allRecipients.length,
            biggestWinner,
            biggestAmount,
            averageAmount
        },
        allRecipients: allRecipients
    };
}

// Save updated dashboard data
function saveDashboardData(data) {
    try {
        fs.writeFileSync(CONFIG.DASHBOARD_DATA_FILE, JSON.stringify(data, null, 2));
        console.log(`💾 Saved updated dashboard data with ${data.allRecipients.length} recipients`);
    } catch (error) {
        console.error('❌ Error saving dashboard data:', error.message);
        throw error;
    }
}

// Main sweeper function
async function runDailySweeper() {
    console.log('🚀 Starting Daily wPOND Sweeper...');
    console.log(`🎯 Target: ${CONFIG.PAYOUT_WALLET}`);
    console.log(`⏰ Looking for transactions in last 24 hours`);
    
    try {
        // Get recent signatures
        const recentSignatures = await getRecentSignatures();
        
        if (recentSignatures.length === 0) {
            console.log('⚠️ No recent signatures found');
            return;
        }
        
        // Process in batches
        const allClaims = [];
        const allErrors = [];
        
        for (let i = 0; i < recentSignatures.length; i += CONFIG.BATCH_SIZE) {
            const batch = recentSignatures.slice(i, i + CONFIG.BATCH_SIZE);
            const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
            
            const result = await processBatch(batch, batchNumber);
            allClaims.push(...result.claims);
            allErrors.push(...result.errors);
            
            // Save intermediate results
            if (batchNumber % 5 === 0) {
                const updatedData = mergeWithDashboardData(allClaims, existingDashboardData);
                saveDashboardData(updatedData);
                console.log(`💾 Intermediate save: ${allClaims.length} claims processed`);
            }
            
            // Delay between batches
            if (i + CONFIG.BATCH_SIZE < recentSignatures.length) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
            }
        }
        
        // Final save
        const finalData = mergeWithDashboardData(allClaims, existingDashboardData);
        saveDashboardData(finalData);
        
        console.log('🎉 Daily wPOND Sweeper completed successfully!');
        console.log(`📊 Summary: ${allClaims.length} new claims, ${allErrors.length} errors`);
        console.log(`📊 Total: ${finalData.summary.totalClaims} claims, ${(finalData.summary.totalWpond / 1e9).toFixed(2)}B wPOND`);
        
    } catch (error) {
        console.error('❌ Fatal error in daily sweeper:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    runDailySweeper().catch(console.error);
}

module.exports = {
    runDailySweeper,
    CONFIG
};
