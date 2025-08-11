const fs = require('fs');

const EXCLUDED_WALLET = '5KXZCyUaqHJ1T2wbcMXvLt9jYR87tDJS2Bf71gxYSZNt';

console.log('🗑️ Removing excluded wallet from dashboard data...');

try {
    // Read the dashboard data
    const dataPath = 'public/helius-dashboard-data.json';
    const dashboardData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    console.log(`📊 Original data has ${dashboardData.allRecipients?.length || 0} recipients`);
    
    // Remove the excluded wallet from allRecipients
    if (dashboardData.allRecipients) {
        const originalLength = dashboardData.allRecipients.length;
        dashboardData.allRecipients = dashboardData.allRecipients.filter(
            recipient => recipient.wallet !== EXCLUDED_WALLET
        );
        const removedCount = originalLength - dashboardData.allRecipients.length;
        console.log(`✅ Removed ${removedCount} entries for excluded wallet`);
    }
    
    // Remove from summary if it exists
    if (dashboardData.summary && dashboardData.summary.allRecipients) {
        const originalLength = dashboardData.summary.allRecipients.length;
        dashboardData.summary.allRecipients = dashboardData.summary.allRecipients.filter(
            recipient => recipient.wallet !== EXCLUDED_WALLET
        );
        const removedCount = originalLength - dashboardData.summary.allRecipients.length;
        console.log(`✅ Removed ${removedCount} entries from summary`);
    }
    
    // Save the cleaned data
    fs.writeFileSync(dataPath, JSON.stringify(dashboardData, null, 2));
    console.log(`💾 Cleaned data saved to ${dataPath}`);
    
    console.log(`📊 Final data has ${dashboardData.allRecipients?.length || 0} recipients`);
    
} catch (error) {
    console.error('❌ Error:', error.message);
}
