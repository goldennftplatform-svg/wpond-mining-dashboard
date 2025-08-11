const fs = require('fs');

const EXCLUDED_WALLET = '5KXZCyUaqHJ1T2wbcMXvLt9jYR87tDJS2Bf71gxYSZNt';

console.log('🗑️ Removing excluded wallet from ALL parts of dashboard data...');

try {
    // Read the dashboard data
    const dataPath = 'public/helius-dashboard-data.json';
    const dashboardData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    console.log(`📊 Original data has ${dashboardData.allRecipients?.length || 0} recipients`);
    
    let totalRemoved = 0;
    
    // Function to recursively remove wallet from any object or array
    function removeWalletFromData(data) {
        if (Array.isArray(data)) {
            return data.filter(item => {
                if (typeof item === 'object' && item !== null) {
                    if (item.wallet === EXCLUDED_WALLET || item.recipient === EXCLUDED_WALLET) {
                        totalRemoved++;
                        return false;
                    }
                    // Recursively process nested objects
                    Object.keys(item).forEach(key => {
                        if (typeof item[key] === 'object' && item[key] !== null) {
                            item[key] = removeWalletFromData(item[key]);
                        }
                    });
                }
                return true;
            });
        } else if (typeof data === 'object' && data !== null) {
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'object' && data[key] !== null) {
                    data[key] = removeWalletFromData(data[key]);
                }
            });
        }
        return data;
    }
    
    // Remove from all parts of the data
    dashboardData.allRecipients = removeWalletFromData(dashboardData.allRecipients);
    
    if (dashboardData.summary) {
        dashboardData.summary = removeWalletFromData(dashboardData.summary);
    }
    
    if (dashboardData.recentWinners) {
        dashboardData.recentWinners = removeWalletFromData(dashboardData.recentWinners);
    }
    
    if (dashboardData.topWinners) {
        dashboardData.topWinners = removeWalletFromData(dashboardData.topWinners);
    }
    
    // Save the cleaned data
    fs.writeFileSync(dataPath, JSON.stringify(dashboardData, null, 2));
    console.log(`✅ Removed ${totalRemoved} total entries for excluded wallet`);
    console.log(`💾 Cleaned data saved to ${dataPath}`);
    console.log(`📊 Final data has ${dashboardData.allRecipients?.length || 0} recipients`);
    
} catch (error) {
    console.error('❌ Error:', error.message);
}
