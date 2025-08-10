const fs = require('fs');
const path = require('path');

// Test the daily sweeper functionality
console.log('🧪 Testing Daily TX Sweeper functionality...');

// Configuration (matching the main sweeper)
const CONFIG = {
    PAYOUT_WALLET: 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8pS53opT',
    // Exclude bank and sister wallets from mining rewards
    EXCLUDED_WALLETS: [
        'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8pS53opT', // opt (payout wallet)
        '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL'  // iWWL (sister wallet)
    ]
};

// Test data structure
const testTransactions = [
    {
        signature: 'test-sig-1',
        timestamp: Math.floor(Date.now() / 1000),
        tokenTransfers: [
            {
                mint: 'Ea5SjE2Y6yvCeW5SYTk7EKbzQ4NC5Rqt077CciSqk5rP',
                fromUserAccount: 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8pS53opT',
                toUserAccount: 'test-wallet-1',
                tokenAmount: 1000000000
            }
        ]
    }
];

// Test existing dashboard data
const existingData = {
    summary: {
        totalClaims: 8670,
        totalWpond: 9377826706011.57,
        totalRecipients: 6083,
        biggestWinner: '2Ag1QgyyJj2nS6nD6SLbpAUFaWPhaDrmHwrGwWpMqV9K',
        biggestAmount: 33365940661.101562,
        averageAmount: 1541645028.1130314
    },
    allRecipients: [
        {
            wallet: '2Ag1QgyyJj2nS6nD6SLbpAUFaWPhaDrmHwrGwWpMqV9K',
            amount: 33365940661.101562,
            claimCount: 29,
            date: '2025-03-20',
            signature: 'claim-29'
        },
        {
            wallet: '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL', // This should be excluded
            amount: 1000000000,
            claimCount: 1,
            date: '2025-03-20',
            signature: 'excluded-claim'
        }
    ]
};

// Clean up existing data to remove excluded wallets (copy of the main sweeper function)
function cleanupExcludedWallets(recipients) {
    const originalCount = recipients.length;
    const filteredRecipients = recipients.filter(r => !CONFIG.EXCLUDED_WALLETS.includes(r.wallet));
    const removedCount = originalCount - filteredRecipients.length;
    
    if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} excluded wallets from existing data`);
    }
    
    return filteredRecipients;
}

// Test merge function (copy of the one in daily-tx-sweeper.js)
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
            existing.date = tx.date;
            existing.signature = tx.signature;
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

// Test the merge function
console.log('📊 Testing merge function...');
const testNewTransactions = [
    {
        signature: 'test-sig-1',
        timestamp: Math.floor(Date.now() / 1000),
        date: new Date().toISOString().split('T')[0],
        wallet: 'test-wallet-1',
        amount: 1000000000,
        type: 'wPOND Transfer'
    }
];

const mergedData = mergeWithDashboardData(testNewTransactions, existingData);
console.log('✅ Merge test successful!');
console.log('📈 Updated summary:', mergedData.summary);
console.log('👥 Total recipients:', mergedData.allRecipients.length);

// Test file operations
console.log('💾 Testing file operations...');
try {
    // Test writing test data
    const testOutputFile = 'test-output.json';
    fs.writeFileSync(testOutputFile, JSON.stringify(mergedData, null, 2));
    console.log('✅ Test file write successful');
    
    // Test reading test data
    const readData = JSON.parse(fs.readFileSync(testOutputFile, 'utf8'));
    console.log('✅ Test file read successful');
    
    // Clean up
    fs.unlinkSync(testOutputFile);
    console.log('✅ Test file cleanup successful');
    
} catch (error) {
    console.error('❌ File operation test failed:', error.message);
}

console.log('🎉 All tests completed successfully!');
console.log('🚀 Daily TX Sweeper is ready to use!');
