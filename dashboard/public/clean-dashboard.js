// 🎯 CLEAN DASHBOARD - SINGLE PAGE, NO DUPLICATES, ALL FEATURES WORKING
// Data sources in priority order - USE REAL DATA
const DATA_SOURCES = [
    'working-mining-data.json',  // Real data with actual multi-claimers
    'mining-claims-data.json',   // Real data with individual claims
    'dashboard-data-complete.json' // Large file with more real data
];

// Excluded wallets (house wallets, cooked data)
const EXCLUDED_WALLETS = [
    '2Ag1QgyyJj2nS6nD6SLbpAUFaWPhaDrmHwrGwWpMqV9K',
    'HwyJtiPXGt29',
    'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8pS53opT',
    'HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2',
    '9z9H5dA6AejJ1LpXbyENhXog3jfpjVFdDEFbuymHjFSL',
    'Fk6PvoxW9LcjSg9ix7EJAnrAViHmqoKonX15WDau2NYv',
    'G5YGpBWvwFo2Ah1HXmCrmMMMPrnmvsaNs7TwW3win4Qw',
    'CYaXLzjVneHu2tXNN5KtyiithTeiyEZFdniu8nk4wNGi',
    'HvYahPhM2ANz4cWKDmN8NCDP4aFbdrsRdrPNJEk8KQpQ'
];

// Global dashboard data
let dashboardData = null;
let currentFilter = 'all';
let filteredData = [];

// Utility functions
function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

function formatWallet(wallet) {
    return wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : 'Unknown';
}

function filterExcludedWallets(data) {
    if (!data || !Array.isArray(data)) return [];
    
    return data.filter(recipient => {
        // Filter out excluded wallet addresses
        if (EXCLUDED_WALLETS.includes(recipient.wallet)) {
            return false;
        }
        
        // Filter out monster claims (over 100B = likely inflated/cooked data)
        if (recipient.amount > 1e11) {
            return false;
        }
        
        return true;
    });
}

// Filter winners based on selection
function filterWinners(filterType, buttonElement = null) {
    if (!dashboardData || !dashboardData.allRecipients) return;
    
    currentFilter = filterType;
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (buttonElement) {
        buttonElement.classList.add('active');
    }
    
    switch (filterType) {
        case 'all':
            filteredData = allRecipients;
            break;
        case 'top10':
            filteredData = allRecipients
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 10);
            break;
        case 'top50':
            filteredData = allRecipients
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 50);
            break;
        case 'topClaimers':
            filteredData = allRecipients
                .sort((a, b) => (b.claimCount || 1) - (a.claimCount || 1))
                .slice(0, 50);
            break;
        case 'multiClaimers':
            // Only wallets with multiple claims
            filteredData = allRecipients
                .filter(r => (r.claimCount || 1) > 1)
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 50);
            break;
        case 'recentOnly':
            // Only recent payouts (last 3 months)
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            filteredData = allRecipients
                .filter(r => {
                    const payoutDate = new Date(r.date);
                    return payoutDate >= threeMonthsAgo;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 50);
            break;
        default:
            filteredData = allRecipients;
    }
    
    // Update winners table
    updateWinnersTable();
    
    console.log(`✅ Filter applied: ${filterType}, showing ${filteredData.length} results`);
}

// Reset filters
function resetFilters() {
    filterWinners('all');
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-btn').classList.add('active');
}

// Load dashboard data from multiple sources
async function loadDashboardData() {
    console.log('🔄 Starting to load dashboard data...');
    
    for (const source of DATA_SOURCES) {
        try {
            console.log(`🔄 Trying data source: ${source}`);
            const response = await fetch(source);
            
            if (!response.ok) {
                console.warn(`❌ Failed to load ${source}: ${response.status} ${response.statusText}`);
                continue;
            }
        
        const data = await response.json();
            console.log(`✅ Loaded ${source}:`, data);
            console.log(`📊 Data summary:`, {
                hasSummary: !!data.summary,
                hasAllRecipients: !!data.allRecipients,
                hasRecipients: !!data.recipients,
                allRecipientsCount: data.allRecipients?.length || 0,
                recipientsCount: data.recipients?.length || 0
            });
            
            // Normalize data structure
            if (data.recipients && !data.allRecipients) {
                console.log('🔄 Normalizing recipients to allRecipients...');
                data.allRecipients = data.recipients.map(r => ({
                    wallet: r.wallet,
                    amount: r.wpondAmount || r.amount,
                    claimCount: r.claimCount || 1,
                    date: r.date,
                    signature: r.signature
                }));
                console.log(`✅ Normalized ${data.allRecipients.length} recipients`);
            }
            
        dashboardData = data;
            console.log(`🎯 Using data source: ${source}`);
            console.log(`📊 Final dashboard data:`, {
                summary: dashboardData.summary,
                allRecipientsCount: dashboardData.allRecipients?.length || 0
            });
            break;
        
    } catch (error) {
            console.warn(`❌ Error loading ${source}:`, error);
            continue;
        }
    }
    
    if (!dashboardData) {
        console.error('❌ All data sources failed');
        return;
    }
    
    // Update dashboard
    console.log('🔄 Updating dashboard with loaded data...');
    updateDashboard();
}

// Update all dashboard sections
function updateDashboard() {
    updateStats();
    updateTopWinners();
    updateRecentActivity();
    createTopWinnersBubbleBoard();
    filterWinners('all'); // Initialize with all winners
}

// Update summary statistics
function updateStats() {
    if (!dashboardData || !dashboardData.summary) return;
    
    const summary = dashboardData.summary;
    
    document.getElementById('totalClaims').textContent = formatNumber(summary.totalClaims || 0);
    document.getElementById('totalWpond').textContent = formatNumber(summary.totalWpond || 0);
    document.getElementById('totalRecipients').textContent = formatNumber(summary.totalRecipients || 0);
    document.getElementById('biggestAmount').textContent = formatNumber(summary.biggestAmount || 0);
    document.getElementById('averageAmount').textContent = formatNumber(summary.averageAmount || 0);
}

// Update top 10 winners grid
function updateTopWinners() {
    if (!dashboardData || !dashboardData.allRecipients) return;
    
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    
    // Sort by amount (highest first) and take top 10
    const sortedByAmount = allRecipients.sort((a, b) => b.amount - a.amount);
    const topWinners = sortedByAmount.slice(0, 10);
    
    const grid = document.getElementById('topWinnersGrid');
    grid.innerHTML = '';
    
    if (topWinners.length === 0) {
        grid.innerHTML = '<div class="no-data">No winners data available</div>';
        return;
    }
    
    topWinners.forEach((winner, index) => {
        const card = document.createElement('div');
        card.className = `winner-card ${index === 0 ? 'top-winner' : ''}`;
        
        const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
        
        card.innerHTML = `
            <div class="rank-icon">${rankIcon}</div>
            <div class="winner-wallet">${formatWallet(winner.wallet)}</div>
            <div class="winner-amount">${formatNumber(winner.amount)} wPOND</div>
            <div class="winner-date">${winner.date || 'Unknown'}</div>
        `;
        
        // Add click event to check wallet on blockchain
        card.addEventListener('click', () => {
            checkWalletOnBlockchain(winner.wallet);
        });
        
        grid.appendChild(card);
    });
}

// Update recent activity table
function updateRecentActivity() {
    if (!dashboardData || !dashboardData.allRecipients) return;
    
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    
    // Only show recent payouts (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentRecipients = allRecipients.filter(r => {
        const payoutDate = new Date(r.date);
        return payoutDate >= threeMonthsAgo;
    });
    
    // Sort by date (newest first) and take last 10
    const sortedByDate = recentRecipients.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivity = sortedByDate.slice(0, 10);
    
    const tbody = document.getElementById('recentActivity');
    tbody.innerHTML = '';
    
    if (recentActivity.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="no-data">No recent activity (last 3 months)</td></tr>';
        return;
    }
    
    recentActivity.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatWallet(activity.wallet)}</td>
            <td>${formatNumber(activity.amount)} wPOND</td>
            <td>${activity.date || 'Unknown'}</td>
        `;
        
        // Add click event to check wallet on blockchain
        row.addEventListener('click', () => {
            checkWalletOnBlockchain(activity.wallet);
        });
        
        tbody.appendChild(row);
    });
    
    console.log(`📅 Recent Activity: ${recentActivity.length} recent payouts`);
}

// Update winners table based on current filter
function updateWinnersTable() {
    if (!filteredData || filteredData.length === 0) {
        document.getElementById('winnersTableBody').innerHTML = '<tr><td colspan="5" class="no-data">No data for current filter</td></tr>';
        return;
    }
    
    const tbody = document.getElementById('winnersTableBody');
    tbody.innerHTML = '';
    
    filteredData.forEach((winner, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${formatWallet(winner.wallet)}</td>
            <td>${formatNumber(winner.amount)} wPOND</td>
            <td>${winner.claimCount || 1}</td>
            <td>${winner.date || 'Unknown'}</td>
        `;
        
        // Add click event to check wallet on blockchain
        row.addEventListener('click', () => {
            checkWalletOnBlockchain(winner.wallet);
        });
        
        tbody.appendChild(row);
    });
}

// Create top winners bubble board
function createTopWinnersBubbleBoard() {
    if (!dashboardData || !dashboardData.allRecipients) return;
    
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    
    // Sort by amount (highest first) and take top 20 for bubbles
    const sortedByAmount = allRecipients.sort((a, b) => b.amount - a.amount);
    const topBubbles = sortedByAmount.slice(0, 20);
    
    const bubbleBoard = document.getElementById('topWinnersBubbleBoard');
    bubbleBoard.innerHTML = '';
    
    if (topBubbles.length === 0) {
        bubbleBoard.innerHTML = '<div class="no-data">No bubble data available</div>';
        return;
    }
    
    // Calculate bubble sizes and positions
    const maxAmount = Math.max(...topBubbles.map(w => w.amount));
    const minAmount = Math.min(...topBubbles.map(w => w.amount));
    
    topBubbles.forEach((winner, index) => {
        const bubble = document.createElement('div');
        bubble.className = 'recent-bubble';
        
        // Calculate bubble size based on amount (relative to max)
        const sizeRatio = (winner.amount - minAmount) / (maxAmount - minAmount);
        const size = Math.max(40, Math.min(120, 40 + (sizeRatio * 80)));
        
        // Calculate position (avoid overlapping)
        const angle = (index / topBubbles.length) * 2 * Math.PI;
        const radius = 150;
        const centerX = 200;
        const centerY = 200;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Set bubble properties
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${x - size/2}px`;
        bubble.style.top = `${y - size/2}px`;
        bubble.style.background = `radial-gradient(circle, #ff69b4, #ff1493)`;
        bubble.style.border = `2px solid #fff`;
        bubble.style.boxShadow = `0 0 10px rgba(255, 105, 180, 0.5)`;
        
        // Add floating animation
        bubble.style.animation = `bubbleFloat ${3 + Math.random() * 2}s ease-in-out infinite`;
        bubble.style.animationDelay = `${Math.random() * 2}s`;
        
        // Bubble content
        bubble.innerHTML = `
            <div style="font-size: ${Math.max(6, size/15)}px;">
                ${formatWallet(winner.wallet)}<br>
                ${formatNumber(winner.amount)}
            </div>
        `;
        
        // Add click event to check wallet on blockchain
        bubble.addEventListener('click', () => {
            checkWalletOnBlockchain(winner.wallet);
        });
        
        bubbleBoard.appendChild(bubble);
    });
}

// Check wallet on blockchain explorer
function checkWalletOnBlockchain(walletAddress) {
    if (!walletAddress) {
        console.warn('❌ No wallet address provided');
        return;
    }
    
    console.log('🔍 Checking wallet on blockchain:', walletAddress);
    
    // Open Solana Explorer in new tab
    const solanaExplorerUrl = `https://solscan.io/account/${walletAddress}`;
    window.open(solanaExplorerUrl, '_blank');
    
    // Show notification
    showNotification(`🔍 Checking wallet ${formatWallet(walletAddress)} on blockchain...`, 'info');
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'info' ? '#4a90e2' : '#ff69b4'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        z-index: 1000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Clean Dashboard Initializing...');
    console.log('🔍 DOM Elements Check:');
    console.log('   - topWinnersGrid:', document.getElementById('topWinnersGrid'));
    console.log('   - recentActivity:', document.getElementById('recentActivity'));
    console.log('   - topWinnersBubbleBoard:', document.getElementById('topWinnersBubbleBoard'));
    console.log('   - winnersTableBody:', document.getElementById('winnersTableBody'));
    console.log('   - Filter buttons:', document.querySelectorAll('.filter-btn').length);
    
    try {
        loadDashboardData();
    } catch (error) {
        console.error('❌ Error during initialization:', error);
    }
    
    // Refresh data every 5 minutes
    setInterval(() => {
        try {
    loadDashboardData();
        } catch (error) {
            console.error('❌ Error during refresh:', error);
        }
    }, 5 * 60 * 1000);
});

// Test function to manually check dashboard functionality
function testDashboard() {
    console.log('🧪 TESTING DASHBOARD FUNCTIONALITY...');
    
    // Test 1: Check if data is loaded
    console.log('📊 Test 1 - Data Check:');
    console.log('   - dashboardData:', dashboardData);
    console.log('   - currentFilter:', currentFilter);
    console.log('   - filteredData length:', filteredData?.length || 0);
    
    // Test 2: Check DOM elements
    console.log('🔍 Test 2 - DOM Elements:');
    console.log('   - topWinnersGrid:', document.getElementById('topWinnersGrid'));
    console.log('   - recentActivity:', document.getElementById('recentActivity'));
    console.log('   - topWinnersBubbleBoard:', document.getElementById('topWinnersBubbleBoard'));
    console.log('   - winnersTableBody:', document.getElementById('winnersTableBody'));
    
    // Test 3: Test filter function
    console.log('🎯 Test 3 - Filter Function:');
    if (dashboardData && dashboardData.allRecipients) {
        console.log('   - Total recipients:', dashboardData.allRecipients.length);
        console.log('   - Sample recipient:', dashboardData.allRecipients[0]);
        
        // Test filtering
        const testFilter = filterExcludedWallets(dashboardData.allRecipients);
        console.log('   - After filtering:', testFilter.length);
        console.log('   - Sample filtered:', testFilter[0]);
    } else {
        console.log('   - No data available for testing');
    }
    
    // Test 4: Manual filter test
    console.log('🎯 Test 4 - Manual Filter Test:');
    try {
        filterWinners('all', document.querySelector('.filter-btn'));
        console.log('   - All filter applied successfully');
    } catch (error) {
        console.error('   - Filter error:', error);
    }
    
    console.log('✅ Dashboard test completed');
}

// Export functions for debugging
window.dashboardDebug = {
    loadDashboardData,
    updateDashboard,
    filterWinners,
    resetFilters,
    filterExcludedWallets,
    checkWalletOnBlockchain,
    showNotification,
    testDashboard
};
