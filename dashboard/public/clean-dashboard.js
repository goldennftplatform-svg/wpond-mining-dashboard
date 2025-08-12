// CLEAN DASHBOARD - Rebuilt from scratch to actually work!
console.log('🚨 CLEAN DASHBOARD LOADED! This should work perfectly!');

// Banned wallets list - these will be filtered out
const BANNED_WALLETS = [
    'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8pS53opT', // opt (payout wallet)
    '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL', // iWWL (sister wallet)
    '5KXZCyUaqHJ1T2wbcMXvLt9jYR87tDJS2Bf71gxYSZNt', // another house wallet
    'HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2', // suspected liquidity bot
    '9z9H5dA6AejJ1LpXbyENhXog3jfpjVFdDEFbuymHjFSL', // single huge tx
    'Fk6PvoxW9LcjSg9ix7EJAnrAViHmqoKonX15WDau2NYv', // single huge tx
    '7VocnjpSyCAvhk3zNVu5DqeGAvxbi8MMxEUvLznDFnok', // single huge tx
    'JLAhz46kzixKZsnyGAovKVGT577qetPPCqJQZBhJiEe', // single huge tx
    'Hjzfr1BzWizuasoYJLa5Z7b1GFG9xWJcMSLpqfvctK82', // single huge tx
    'G5YGpBWvwFo2Ah1HXmCrmMMMPrnmvsaNs7TwW3win4Qw', // single huge tx
    'CYaXLzjVneHu2tXNN5KtyiithTeiyEZFdniu8nk4wNGi', // single huge tx
    '3ywio6QgKQKL5Mtte1eVCZskSpHMvCoP29C8cA3JV1Ca'  // single huge tx
];

// Global data storage
let dashboardData = null;
let filteredRecipients = null;

// Clean filtering function - removes banned wallets
function filterBannedWallets(recipients) {
    if (!recipients || !Array.isArray(recipients)) return [];
    
    console.log('🔍 CLEAN FILTERING - Total before:', recipients.length);
    console.log('🚫 Banned wallets to exclude:', BANNED_WALLETS.length);
    
    const filtered = recipients.filter(recipient => !BANNED_WALLETS.includes(recipient.wallet));
    
    console.log('✅ CLEAN FILTERING - Total after:', filtered.length);
    console.log('🚫 CLEAN FILTERING - Wallets excluded:', recipients.length - filtered.length);
    
    return filtered;
}

// Format wPOND amounts
function formatWpondAmount(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0';
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (numAmount >= 1e12) return (numAmount / 1e12).toFixed(1) + 'T';
    if (numAmount >= 1e9) return (numAmount / 1e9).toFixed(1) + 'B';
    if (numAmount >= 1e6) return (numAmount / 1e6).toFixed(1) + 'M';
    if (numAmount >= 1e3) return (numAmount / 1e3).toFixed(1) + 'K';
    return numAmount.toString();
}

// Format wallet addresses
function formatWallet(wallet) {
    if (!wallet) return 'Unknown';
    return wallet.substring(0, 6) + '...' + wallet.substring(wallet.length - 4);
}

// Load dashboard data
async function loadDashboardData() {
    const debugStatus = document.getElementById('debugStatus');
    
    try {
        console.log('🚀 CLEAN DASHBOARD - Loading data...');
        if (debugStatus) debugStatus.textContent = '🚀 Loading clean data...';
        
        // Load the clean data file
        const dataUrl = 'helius-dashboard-data-fresh.json?v=' + Date.now();
        console.log('📡 Loading from:', dataUrl);
        
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        console.log('✅ CLEAN DASHBOARD - Data loaded successfully');
        
        // Store the data
        dashboardData = data;
        
        // Apply banned wallet filtering immediately
        filteredRecipients = filterBannedWallets(data.allRecipients || []);
        console.log('✅ CLEAN DASHBOARD - Banned wallets filtered out');
        
        // Update the dashboard
        updateDashboard();
        
    } catch (error) {
        console.error('❌ CLEAN DASHBOARD - Error loading data:', error);
        if (debugStatus) debugStatus.textContent = '❌ Error loading data';
    }
}

// Update the entire dashboard
function updateDashboard() {
    if (!dashboardData || !filteredRecipients) return;
    
    console.log('🔄 CLEAN DASHBOARD - Updating display...');
    
    // Update summary cards
    updateSummaryCards();
    
    // Update all sections
    updateTopWinners();
    updateRecentActivity();
    updateAllWinners();
    updateDailyStats();
    
    console.log('✅ CLEAN DASHBOARD - All updates completed!');
}

// Update summary cards
function updateSummaryCards() {
    const totalClaimsEl = document.getElementById('totalClaims');
    const totalWpondEl = document.getElementById('totalWpond');
    const biggestWinnerEl = document.getElementById('biggestWinner');
    const averageClaimEl = document.getElementById('averageClaim');
    
    if (totalClaimsEl) totalClaimsEl.textContent = (dashboardData.summary?.totalClaims || 0).toLocaleString();
    if (totalWpondEl) totalWpondEl.textContent = formatWpondAmount(dashboardData.summary?.totalWpond || 0);
    if (biggestWinnerEl) biggestWinnerEl.textContent = formatWpondAmount(dashboardData.summary?.biggestAmount || 0);
    if (averageClaimEl) averageClaimEl.textContent = formatWpondAmount(dashboardData.summary?.averageAmount || 0);
}

// Update top winners
function updateTopWinners() {
    const winnersGrid = document.getElementById('topWinnersGrid');
    if (!winnersGrid || !filteredRecipients) return;
    
    const topWinners = filteredRecipients.slice(0, 10);
    
    winnersGrid.innerHTML = topWinners.map((winner, index) => `
        <div class="winner-card ${index === 0 ? 'top-winner' : ''}" onclick="showWinnerDetails(${JSON.stringify(winner).replace(/"/g, '&quot;')})">
            <div class="rank-icon">${getRankIcon(index + 1)}</div>
            <div class="winner-wallet">${formatWallet(winner.wallet)}</div>
            <div class="winner-amount">${formatWpondAmount(winner.amount)} wPOND</div>
            <div class="winner-date">${winner.date}</div>
        </div>
    `).join('');
}

// Get rank icon
function getRankIcon(rank) {
    const icons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return icons[rank - 1] || `${rank}`;
}

// Update recent activity
function updateRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    if (!recentActivity || !filteredRecipients) return;
    
    const recentRecipients = filteredRecipients.slice(0, 10);
    
    recentActivity.innerHTML = recentRecipients.map(recipient => `
        <tr>
            <td class="wallet-cell" onclick="copyToClipboard('${recipient.wallet}')">${formatWallet(recipient.wallet)}</td>
            <td>${formatWpondAmount(recipient.amount)} wPOND</td>
            <td>${recipient.date}</td>
        </tr>
    `).join('');
}

// Update all winners table
function updateAllWinners() {
    const winnersTableBody = document.getElementById('winnersTableBody');
    if (!winnersTableBody || !filteredRecipients) return;
    
    winnersTableBody.innerHTML = filteredRecipients.map((winner, index) => `
        <tr onclick="showWinnerDetails(${JSON.stringify(winner).replace(/"/g, '&quot;')})">
            <td>${index + 1}</td>
            <td class="wallet-cell" onclick="event.stopPropagation(); copyToClipboard('${winner.wallet}')" title="Click to copy wallet">${formatWallet(winner.wallet)}</td>
            <td>${formatWpondAmount(winner.amount)} wPOND</td>
            <td class="claims-cell">${winner.claimCount || 1} 🔥</td>
            <td>${winner.date}</td>
            <td class="signature-cell" onclick="event.stopPropagation(); copyToClipboard('${winner.signature || 'N/A'}')" title="Click to copy signature">${(winner.signature || 'N/A').substring(0, 8)}...</td>
        </tr>
    `).join('');
}

// Update daily stats
function updateDailyStats() {
    const todayWinnersEl = document.getElementById('todayWinners');
    const todayWpondEl = document.getElementById('todayWpond');
    const todayClaimsEl = document.getElementById('todayClaims');
    
    if (todayWinnersEl) todayWinnersEl.textContent = filteredRecipients.length;
    if (todayWpondEl) todayWpondEl.textContent = formatWpondAmount(filteredRecipients.reduce((sum, r) => sum + (r.amount || 0), 0));
    if (todayClaimsEl) todayClaimsEl.textContent = filteredRecipients.reduce((sum, r) => sum + (r.claimCount || 1), 0);
}

// Filter winners (for filter buttons)
function filterWinners(filterType) {
    if (!filteredRecipients) return;
    
    let filteredWinners = [];
    
    switch (filterType) {
        case 'top10':
            filteredWinners = filteredRecipients.slice(0, 10);
            break;
        case 'top50':
            filteredWinners = filteredRecipients.slice(0, 50);
            break;
        case 'top100':
            filteredWinners = filteredRecipients.slice(0, 100);
            break;
        default:
            filteredWinners = filteredRecipients;
    }
    
    updateFilteredWinnersTable(filteredWinners);
    
    // Update button states
    document.querySelectorAll('.filter-controls button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// Update filtered winners table
function updateFilteredWinnersTable(winners) {
    const winnersTableBody = document.getElementById('winnersTableBody');
    if (!winnersTableBody) return;
    
    if (winners.length === 0) {
        winnersTableBody.innerHTML = '<tr><td colspan="6" class="no-results">No winners found for this filter</td></tr>';
        return;
    }
    
    winnersTableBody.innerHTML = winners.map((winner, index) => `
        <tr onclick="showWinnerDetails(${JSON.stringify(winner).replace(/"/g, '&quot;')})">
            <td>${index + 1}</td>
            <td class="wallet-cell" onclick="event.stopPropagation(); copyToClipboard('${winner.wallet}')" title="Click to copy wallet">${formatWallet(winner.wallet)}</td>
            <td>${formatWpondAmount(winner.amount)} wPOND</td>
            <td class="claims-cell">${winner.claimCount || 1} 🔥</td>
            <td>${winner.date}</td>
            <td class="signature-cell" onclick="event.stopPropagation(); copyToClipboard('${winner.signature || 'N/A'}')" title="Click to copy signature">${(winner.signature || 'N/A').substring(0, 8)}...</td>
        </tr>
    `).join('');
}

// Reset filters
function resetFilters() {
    filterWinners('all');
    document.querySelectorAll('.filter-controls button').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-controls button').classList.add('active');
}

// Show winner details modal
function showWinnerDetails(winner) {
    const modal = document.getElementById('winnerModal');
    const details = document.getElementById('winnerDetails');
    
    if (modal && details) {
        details.innerHTML = `
            <h3>🏆 Winner Details</h3>
            <p><strong>Wallet:</strong> <span class="wallet-cell" onclick="copyToClipboard('${winner.wallet}')">${winner.wallet}</span></p>
            <p><strong>Total wPOND:</strong> ${formatWpondAmount(winner.amount)}</p>
            <p><strong>Claims:</strong> ${winner.claimCount || 1}</p>
            <p><strong>Claim Date:</strong> ${winner.date}</p>
        `;
        modal.style.display = 'block';
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('📋 Copied to clipboard:', text);
    });
}

// Search wallet
function searchWallet() {
    const searchInput = document.getElementById('searchInput').value.trim();
    if (!searchInput || !filteredRecipients) return;
    
    const found = filteredRecipients.find(r => 
        r.wallet.toLowerCase().includes(searchInput.toLowerCase())
    );
    
    if (found) {
        showWinnerDetails(found);
    } else {
        alert('Wallet not found');
    }
}

// Set payout alert
function setPayoutAlert() {
    const alertInput = document.getElementById('alertInput').value.trim();
    if (!alertInput) return;
    
    alert(`Alert set for wallet: ${alertInput}`);
}

// Close modal
document.addEventListener('click', function(event) {
    const modal = document.getElementById('winnerModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 CLEAN DASHBOARD - Initializing...');
    loadDashboardData();
});

console.log('✅ CLEAN DASHBOARD - Script loaded and ready!');
