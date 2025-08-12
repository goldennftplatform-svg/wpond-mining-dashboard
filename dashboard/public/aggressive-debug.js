// Aggressive Debug Script - Intercept all data loading
console.log('🚨 AGGRESSIVE DEBUG SCRIPT LOADED!');

// Intercept fetch calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('🔍 FETCH INTERCEPTED:', args[0]);
    return originalFetch.apply(this, args).then(response => {
        console.log('📡 FETCH RESPONSE:', response.url, response.status);
        return response;
    });
};

// Monitor dashboardData changes - using a different approach to avoid conflicts
console.log('🔍 Setting up dashboardData monitoring...');
const originalDashboardData = window.dashboardData;

// Monitor after the main script loads
setTimeout(() => {
    try {
        // Check if dashboardData exists and what it contains
        if (window.dashboardData) {
            console.log('🚨 DASHBOARD DATA FOUND!');
            console.log('📊 Data:', window.dashboardData);
            console.log('🔍 Recipients count:', window.dashboardData.allRecipients?.length);
            console.log('🔍 Sample recipient:', window.dashboardData.allRecipients?.[0]);
            
            // Check for banned wallets
            const bannedWallets = [
                '7VocnjpSyCAvhk3zNVu5DqeGAvxbi8MMxEUvLznDFnok',
                'HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2'
            ];
            
            const bannedFound = bannedWallets.filter(wallet => 
                window.dashboardData.allRecipients?.some(recipient => recipient.wallet === wallet)
            );
            
            console.log('🚫 Banned wallets found:', bannedFound.length);
            if (bannedFound.length > 0) {
                console.log('🚫 Banned wallets:', bannedFound);
            }
        } else {
            console.log('❌ No dashboard data found');
        }
    } catch (error) {
        console.log('❌ Error monitoring dashboard data:', error);
    }
}, 2000);

// Monitor all data loading functions
console.log('🔍 Monitoring all data loading...');

// Check if there are any other data sources
setTimeout(() => {
    console.log('🔍 CHECKING FOR OTHER DATA SOURCES...');
    
    // Look for any global variables that might contain data
    const globalVars = Object.keys(window).filter(key => 
        key.toLowerCase().includes('data') || 
        key.toLowerCase().includes('recipient') ||
        key.toLowerCase().includes('wallet')
    );
    
    console.log('🌐 Global variables found:', globalVars);
    
    // Check if dashboardData exists and what it contains
    if (window.dashboardData) {
        console.log('📊 Dashboard data exists:', window.dashboardData);
        console.log('🔍 Recipients count:', window.dashboardData.allRecipients?.length);
        console.log('🔍 Sample recipient:', window.dashboardData.allRecipients?.[0]);
    } else {
        console.log('❌ No dashboard data found');
    }
    
    // Look for any other data objects
    const dataObjects = [];
    for (let key in window) {
        try {
            const value = window[key];
            if (value && typeof value === 'object' && value.allRecipients && Array.isArray(value.allRecipients)) {
                dataObjects.push({key, value});
            }
        } catch (e) {
            // Ignore errors
        }
    }
    
    console.log('🔍 Data objects found:', dataObjects);
    
}, 5000);

console.log('🚨 AGGRESSIVE DEBUG SCRIPT READY!');
