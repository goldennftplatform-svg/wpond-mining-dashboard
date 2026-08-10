const fs = require('fs');
const config = require('./config');
const { getHelius, HeliusError, resolveApiKey } = require('./src/heliusClient');

console.log('🎯 REALISTIC & STABLE wPOND DATA PROCESSING\n');

if (!resolveApiKey()) {
    console.error('❌ HELIUS_API_KEY is not set. Copy .env.example → .env or export the key.');
    process.exit(1);
}

const helius = getHelius({
    maxRetries: config.retry.attempts,
    timeoutMs: config.timeout,
    baseDelayMs: config.retry.delay,
    maxDelayMs: config.retry.maxDelay,
});

// Configuration - REALISTIC APPROACH
const CONFIG = {
    WPOND_MINT: config.wpond.mint,
    PAYOUT_WALLET: config.wpond.payoutWallet,
    CHUNK_SIZE: 1000, // Process 1000 signatures at a time (realistic)
    BATCH_SIZE: 25, // Smaller batches within chunks
    MAX_RETRIES: config.retry.attempts,
    DELAY_BETWEEN_BATCHES: 500, // Realistic delay
    SAVE_EVERY: 100, // Save progress every 100 signatures
    MAX_MEMORY_CLAIMS: 5000 // Don't keep more than 5000 claims in memory
};

// Load all signatures
const allSignaturesData = JSON.parse(fs.readFileSync('all-signatures.json', 'utf8'));
const allSignatures = Array.isArray(allSignaturesData) ? allSignaturesData : allSignaturesData.signatures || [];

console.log(`📋 Total signatures to process: ${allSignatures.length}\n`);

// SMART CHUNK-BASED PROCESSING
let currentChunk = 0;
let totalProcessed = 0;
let allClaims = [];
let allErrors = [];

// Load progress if exists
try {
    if (fs.existsSync('chunk-progress.json')) {
        const progress = JSON.parse(fs.readFileSync('chunk-progress.json', 'utf8'));
        currentChunk = progress.currentChunk || 0;
        totalProcessed = progress.totalProcessed || 0;
        console.log(`🔄 RESUMING from chunk ${currentChunk}, ${totalProcessed} signatures already processed`);
        
        // Load existing chunk data when resuming
        if (currentChunk > 0) {
            console.log('🔄 Loading existing chunk data...');
            for (let i = 0; i < currentChunk; i++) {
                const chunkFile = `chunk-${i}-claims.json`;
                if (fs.existsSync(chunkFile)) {
                    try {
                        const chunkData = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
                        if (chunkData.claims && Array.isArray(chunkData.claims)) {
                            allClaims.push(...chunkData.claims);
                            console.log(`✅ Loaded chunk ${i}: ${chunkData.claims.length} claims`);
                        }
                    } catch (e) {
                        console.log(`⚠️ Error loading chunk ${i}:`, e.message);
                    }
                }
            }
            console.log(`📊 Total existing claims loaded: ${allClaims.length}`);
        }
    }
} catch (e) {
    console.log('🆕 Starting fresh');
}

// Calculate current chunk signatures
const getCurrentChunkSignatures = () => {
    const start = currentChunk * CONFIG.CHUNK_SIZE;
    const end = Math.min(start + CONFIG.CHUNK_SIZE, allSignatures.length);
    return allSignatures.slice(start, end);
};

// Save progress
const saveProgress = () => {
    const progress = {
        timestamp: new Date().toISOString(),
        currentChunk,
        totalProcessed,
        totalClaims: allClaims.length,
        totalErrors: allErrors.length
    };
    fs.writeFileSync('chunk-progress.json', JSON.stringify(progress, null, 2));
    
    // Save claims in chunks to avoid memory issues
    if (allClaims.length > 0) {
        const chunkData = {
            chunk: currentChunk,
            timestamp: new Date().toISOString(),
            claims: allClaims.slice(-CONFIG.MAX_MEMORY_CLAIMS) // Keep only recent claims
        };
        fs.writeFileSync(`chunk-${currentChunk}-claims.json`, JSON.stringify(chunkData, null, 2));
    }
    
    console.log(`💾 Progress saved: Chunk ${currentChunk}, ${totalProcessed}/${allSignatures.length} signatures`);
};

// Shared Helius client — classified 429/5xx, endpoint rotate, cool-down
async function fetchTransaction(signature) {
    return helius.getTransaction(signature);
}

// Process wPOND transaction (simplified)
function processWpondTransaction(transaction) {
    try {
        if (!transaction || !transaction.meta || !transaction.transaction) return null;
        
        const { meta, transaction: tx } = transaction;
        if (!meta.postTokenBalances || !meta.preTokenBalances) return null;
        
        const claims = [];
        
        // Check balance changes for wPOND
        for (let i = 0; i < meta.postTokenBalances.length; i++) {
            const postBalance = meta.postTokenBalances[i];
            const preBalance = meta.preTokenBalances.find(b => b.accountIndex === postBalance.accountIndex);
            
            if (!postBalance || !preBalance || postBalance.mint !== CONFIG.WPOND_MINT) continue;
            
            const preAmount = preBalance.uiTokenAmount?.uiAmount || 0;
            const postAmount = postBalance.uiTokenAmount?.uiAmount || 0;
            const change = postAmount - preAmount;
            
            if (change <= 0) continue;
            
            const accountIndex = postBalance.accountIndex;
            const account = tx.message.accountKeys[accountIndex];
            if (!account) continue;
            
            // Skip excluded wallets
            if (account === CONFIG.PAYOUT_WALLET || 
                account === '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Bf71gxYSZNt' ||
                account === '5KXZCyUaqHJ1T2wbcMXvLt9jYR87tDJS2Bf71gxYSZNt' ||
                account === 'HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2' ||
                account === '2aC1XMPKr9yj9RdK6fPrGZ9QhC6b3zbn5aC1XMPKr9yj9RdK6fPrGZ9QhC6b3zbn5') {
                continue;
            }
            
            claims.push({
                recipient: account,
                wpondAmount: change,
                date: new Date(transaction.blockTime * 1000).toISOString().split('T')[0],
                signature: transaction.transaction.signatures[0],
                timestamp: transaction.blockTime
            });
        }
        
        return claims;
    } catch (error) {
        console.error('Error processing transaction:', error.message);
        return null;
    }
}

// Process a batch of signatures with rate limit protection
async function processBatch(signatures, batchNumber) {
    const batchClaims = [];
    const batchErrors = [];
    let rateLimitCount = 0;
    
    console.log(`🔄 Processing batch ${batchNumber}: ${signatures.length} signatures`);
    
    for (let i = 0; i < signatures.length; i++) {
        const signature = signatures[i];
        const globalIndex = totalProcessed + (batchNumber * CONFIG.BATCH_SIZE) + i;
        
        try {
            console.log(`  [${globalIndex + 1}/${allSignatures.length}] ${signature.substring(0, 8)}...`);
            
            const transaction = await fetchTransaction(signature);
            const claims = processWpondTransaction(transaction);
            
            if (claims && claims.length > 0) {
                batchClaims.push(...claims);
                console.log(`    ✅ Found ${claims.length} claims`);
            } else {
                console.log(`    ⚠️  No wPOND claims found`);
            }
            
            // Reset rate limit counter on success
            rateLimitCount = 0;
            
        } catch (error) {
            const msg = error instanceof HeliusError
                ? `[${error.code}] ${error.message}`
                : error.message;
            batchErrors.push({
                signature,
                error: msg,
                code: error.code || 'UNKNOWN',
                retryable: Boolean(error.retryable),
            });
            console.log(`    ❌ Error: ${msg}`);

            // Client already cools down on 429 streaks; keep a light batch pause
            if (error.code === 'RATE_LIMIT' || String(msg).includes('429')) {
                rateLimitCount++;
                if (rateLimitCount >= 3) {
                    console.log(`    🚨 Batch still hot after client retries — 15s pause`);
                    await new Promise(resolve => setTimeout(resolve, 15000));
                    rateLimitCount = 0;
                }
            }
        }
        
        // Adaptive delay based on rate limit status
        const delay = rateLimitCount > 0 ? 2000 : 200;
        if (i < signatures.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    return { claims: batchClaims, errors: batchErrors };
}

// Process current chunk
async function processCurrentChunk() {
    const chunkSignatures = getCurrentChunkSignatures();
    if (chunkSignatures.length === 0) {
        console.log('🎉 All chunks processed!');
        return true;
    }
    
    console.log(`\n🚀 Processing chunk ${currentChunk}: ${chunkSignatures.length} signatures`);
    console.log(`📊 Progress: ${totalProcessed}/${allSignatures.length} (${((totalProcessed/allSignatures.length)*100).toFixed(1)}%)\n`);
    
    // Process in batches within the chunk
    for (let i = 0; i < chunkSignatures.length; i += CONFIG.BATCH_SIZE) {
        const batchSignatures = chunkSignatures.slice(i, i + CONFIG.BATCH_SIZE);
        const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE);
        
        const batchResult = await processBatch(batchSignatures, batchNumber);
        
        allClaims.push(...batchResult.claims);
        allErrors.push(...batchResult.errors);
        totalProcessed += batchSignatures.length;
        
        // Save progress frequently
        if (totalProcessed % CONFIG.SAVE_EVERY === 0) {
            saveProgress();
        }
        
        console.log(`\n📊 Batch ${batchNumber} Complete:`);
        console.log(`   - Processed: ${totalProcessed}/${allSignatures.length}`);
        console.log(`   - Claims: ${allClaims.length}`);
        console.log(`   - Errors: ${allErrors.length}`);
        console.log(`   - Error Rate: ${((allErrors.length / totalProcessed) * 100).toFixed(2)}%`);
        
        // Delay between batches
        if (i + CONFIG.BATCH_SIZE < chunkSignatures.length) {
            console.log(`⏳ Waiting ${CONFIG.DELAY_BETWEEN_BATCHES}ms before next batch...\n`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
        }
    }
    
    // Chunk complete
    console.log(`\n✅ Chunk ${currentChunk} complete!`);
    currentChunk++;
    saveProgress();
    
    return false; // Not done yet
}

// Main processing loop
async function processAllChunks() {
    console.log('🚀 Starting CHUNK-BASED processing...\n');
    
    while (true) {
        const isDone = await processCurrentChunk();
        if (isDone) break;
        
        // Small break between chunks
        console.log('⏳ Taking a 2-second break between chunks...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Final results
    console.log('\n🎉 ALL CHUNKS PROCESSED!');
    console.log('==============================');
    console.log(`📊 Final Results:`);
    console.log(`   - Total Processed: ${totalProcessed}`);
    console.log(`   - Total Claims: ${allClaims.length}`);
    console.log(`   - Total Errors: ${allErrors.length}`);
    console.log(`   - Final Error Rate: ${((allErrors.length / totalProcessed) * 100).toFixed(2)}%`);
    console.log(`📈 ${helius.summarizeStats()}`);
    
    // Create final dashboard data
    createFinalDashboardData();
    
    return { totalProcessed, totalClaims: allClaims.length, totalErrors: allErrors.length };
}

// Create final dashboard data
function createFinalDashboardData() {
    console.log('\n🔧 Creating final dashboard data...');
    
    // Group claims by recipient
    const recipientMap = new Map();
    
    allClaims.forEach(claim => {
        if (!recipientMap.has(claim.recipient)) {
            recipientMap.set(claim.recipient, {
                wallet: claim.recipient,
                totalAmount: 0,
                claimCount: 0,
                firstClaimDate: claim.date,
                lastClaimDate: claim.date,
                lastSignature: claim.signature
            });
        }
        
        const recipient = recipientMap.get(claim.recipient);
        recipient.totalAmount += claim.wpondAmount;
        recipient.claimCount += 1;
        
        if (claim.date < recipient.firstClaimDate) {
            recipient.firstClaimDate = claim.date;
        }
        if (claim.date > recipient.lastClaimDate) {
            recipient.lastClaimDate = claim.date;
        }
    });
    
    const allRecipients = Array.from(recipientMap.values())
        .sort((a, b) => b.totalAmount - a.totalAmount);
    
    const dashboardData = {
        summary: {
            totalClaims: allClaims.length,
            totalWpond: allRecipients.reduce((sum, r) => sum + r.totalAmount, 0),
            totalRecipients: allRecipients.length,
            biggestWinner: allRecipients[0]?.wallet || '',
            biggestAmount: allRecipients[0]?.totalAmount || 0,
            dateGenerated: new Date().toISOString()
        },
        allRecipients: allRecipients.map(r => ({
            wallet: r.wallet,
            amount: r.totalAmount,
            claimCount: r.claimCount,
            date: r.lastClaimDate,
            signature: r.lastSignature
        }))
    };
    
    fs.writeFileSync('helius-dashboard-data-final.json', JSON.stringify(dashboardData, null, 2));
    console.log(`✅ Final dashboard data saved: ${allRecipients.length} recipients, ${allClaims.length} total claims`);
}

// Run the processing
processAllChunks().catch(console.error);
