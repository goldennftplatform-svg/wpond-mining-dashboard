// 🎯 NEW DASHBOARD - COMPLETELY FROM SCRATCH
// NO COPY PASTE - ONLY REAL DATA AND HOUSE WALLET FILTERS

// House wallets to filter out (liquidity providers, sister wallets, etc.)
const HOUSE_WALLETS = [
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

// Global data
let dashboardData = null;

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

// Filter out house wallets
function filterHouseWallets(data) {
    if (!data || !Array.isArray(data)) return [];
    
    console.log(`🔍 Filtering ${data.length} wallets, removing house wallets...`);
    
    const filtered = data.filter(recipient => {
        if (HOUSE_WALLETS.includes(recipient.wallet)) {
            console.log(`❌ Removed house wallet: ${recipient.wallet} (${formatNumber(recipient.amount)} wPOND)`);
            return false;
        }
        return true;
    });
    
    console.log(`✅ After filtering: ${filtered.length} wallets`);
    return filtered;
}

// Load real mining data
async function loadData() {
    console.log('🔄 Loading real mining data...');
    
    try {
        console.log('🔍 Attempting to fetch working-mining-data.json...');
        const response = await fetch('working-mining-data.json');
        console.log('📡 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Data loaded successfully:', data);
        console.log('📊 Data summary:', {
            totalClaims: data.summary?.totalClaims,
            totalWpond: data.summary?.totalWpond,
            totalRecipients: data.summary?.totalRecipients,
            allRecipientsCount: data.allRecipients?.length
        });
        
        dashboardData = data;
        updateDashboard();
        
    } catch (error) {
        console.error('❌ Failed to load data:', error);
        console.error('🚨 Full error details:', error.stack);
        showError('Failed to load mining data');
        
        // Try fallback data source
        console.log('🔄 Trying fallback data source...');
        try {
            const fallbackResponse = await fetch('mining-claims-data.json');
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                console.log('✅ Fallback data loaded:', fallbackData);
                dashboardData = fallbackData;
                updateDashboard();
            }
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
        }
    }
}

// Update all dashboard sections
function updateDashboard() {
    if (!dashboardData) return;
    
    updateStats();
    updateTopWinners();
    updateRecentActivity();
    updateBubbleBoard();
}

// Update summary statistics
function updateStats() {
    const summary = dashboardData.summary;
    
    document.getElementById('totalClaims').textContent = formatNumber(summary.totalClaims);
    document.getElementById('totalWpond').textContent = formatNumber(summary.totalWpond);
    document.getElementById('totalRecipients').textContent = formatNumber(summary.totalRecipients);
    document.getElementById('biggestAmount').textContent = formatNumber(summary.biggestAmount);
    document.getElementById('averageAmount').textContent = formatNumber(summary.averageAmount);
}

// Update top 10 winners
function updateTopWinners() {
    const allRecipients = filterHouseWallets(dashboardData.allRecipients);
    
    // Sort by amount (highest first) and take top 10
    const topWinners = allRecipients
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    
    const grid = document.getElementById('topWinnersGrid');
    grid.innerHTML = '';
    
    if (topWinners.length === 0) {
        grid.innerHTML = '<div class="no-data">No winners data</div>';
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
        
        // Click to check wallet on blockchain
        card.addEventListener('click', () => {
            window.open(`https://solscan.io/account/${winner.wallet}`, '_blank');
        });
        
        grid.appendChild(card);
    });
}

// Update recent activity
function updateRecentActivity() {
    const allRecipients = filterHouseWallets(dashboardData.allRecipients);
    
    // Sort by date (newest first) and take last 10
    const recentActivity = allRecipients
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    
    const tbody = document.getElementById('recentActivity');
    tbody.innerHTML = '';
    
    if (recentActivity.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="no-data">No recent activity</td></tr>';
        return;
    }
    
    recentActivity.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatWallet(activity.wallet)}</td>
            <td>${formatNumber(activity.amount)} wPOND</td>
            <td>${activity.date || 'Unknown'}</td>
        `;
        
        // Click to check wallet on blockchain
        row.addEventListener('click', () => {
            window.open(`https://solscan.io/account/${activity.wallet}`, '_blank');
        });
        
        tbody.appendChild(row);
    });
}

// Update bubble board
function updateBubbleBoard() {
    const allRecipients = filterHouseWallets(dashboardData.allRecipients);
    
    // Sort by amount and take top 10 for bubbles
    const topBubbles = allRecipients
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    
    const board = document.getElementById('bubbleBoard');
    board.innerHTML = '';
    
    if (topBubbles.length === 0) {
        board.innerHTML = '<div class="no-data">No bubble data</div>';
        return;
    }
    
    topBubbles.forEach((winner, index) => {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        // Calculate bubble size based on amount (relative to biggest)
        const maxAmount = topBubbles[0].amount;
        const size = Math.max(80, Math.min(200, (winner.amount / maxAmount) * 200));
        
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.fontSize = `${Math.max(8, size / 20)}px`;
        
        bubble.innerHTML = `
            <div>${formatWallet(winner.wallet)}</div>
            <div>${formatNumber(winner.amount)}</div>
        `;
        
        // Click to check wallet on blockchain
        bubble.addEventListener('click', () => {
            window.open(`https://solscan.io/account/${winner.wallet}`, '_blank');
        });
        
        board.appendChild(bubble);
    });
}

// Show error message
function showError(message) {
    console.error('🚨 Error:', message);
    // Could add visual error display here
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard initializing...');
    loadData();
});

// Auto-refresh every 5 minutes
setInterval(() => {
    if (dashboardData) {
        console.log('🔄 Auto-refreshing data...');
        loadData();
    }
}, 5 * 60 * 1000);
