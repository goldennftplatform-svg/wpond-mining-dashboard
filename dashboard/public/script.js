// Dashboard JavaScript
let dashboardData = null;
let dailyChart = null;
let distributionChart = null;
let currentPage = 1;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    setupAutoRefresh();
});

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading(true);
        const response = await fetch('/api/data');
        dashboardData = await response.json();
        
        updateSummaryCards();
        updateTopWinners();
        createCharts();
        updateTransactionsTable();
        updateMiningStats();
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showLoading(false);
        showError('Failed to load wPOND winner data');
    }
}

// Update summary cards
function updateSummaryCards() {
    if (!dashboardData) return;
    
    const { summary } = dashboardData;
    
    document.getElementById('totalWpondEarned').textContent = summary.totalWpondDistributed.toFixed(6) + ' wPOND';
    document.getElementById('totalParticipants').textContent = summary.totalWinners.toLocaleString();
    document.getElementById('successRate').textContent = summary.successRate.toFixed(1) + '%';
    document.getElementById('averageReward').textContent = summary.averageWpondPerWinner.toFixed(6) + ' wPOND';
}

// Update top winners
function updateTopWinners() {
    const winnersContainer = document.getElementById('topWinners');
    const { topWinners } = dashboardData;
    
    if (!topWinners || topWinners.length === 0) {
        winnersContainer.innerHTML = '<div class="loading">No wPOND winners found</div>';
        return;
    }
    
    winnersContainer.innerHTML = topWinners.map((winner, index) => `
        <div class="winner-card ${index < 3 ? 'top-3' : ''}">
            <div class="winner-rank">
                ${index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${winner.rank}`}
            </div>
            <div class="winner-info">
                <div class="winner-wallet">${winner.wallet.slice(0, 8)}...${winner.wallet.slice(-8)}</div>
                <div class="winner-stats">
                    <span class="winner-earned">${winner.totalWpondEarned.toFixed(6)} wPOND</span>
                    <span class="winner-tx">${winner.miningCount} mines</span>
                </div>
            </div>
            <div class="winner-avg">
                Avg: ${winner.averageWpondPerMine.toFixed(6)} wPOND
            </div>
        </div>
    `).join('');
}

// Create charts
function createCharts() {
    if (!dashboardData) return;
    
    createDailyChart();
    createDistributionChart();
}

// Create daily wPOND rewards chart
function createDailyChart() {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    
    const { dailyWpondRewards } = dashboardData;
    const labels = dailyWpondRewards.map(item => formatDate(item.date, 'short'));
    const data = dailyWpondRewards.map(item => item.wpondRewards);
    
    dailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily wPOND Rewards',
                data: data,
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#fbbf24',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Create mining distribution chart
function createDistributionChart() {
    const ctx = document.getElementById('distributionChart').getContext('2d');
    
    const { topWinners } = dashboardData;
    const top5 = topWinners.slice(0, 5);
    const others = topWinners.slice(5).reduce((sum, winner) => sum + winner.totalWpondEarned, 0);
    
    const labels = [...top5.map(w => w.wallet.slice(0, 6) + '...'), 'Others'];
    const data = [...top5.map(w => w.totalWpondEarned), others];
    
    distributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#fbbf24', // Gold
                    '#f59e0b', // Amber
                    '#d97706', // Orange
                    '#92400e', // Brown
                    '#78350f', // Dark brown
                    '#6b7280'  // Gray for others
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Update transactions table
function updateTransactionsTable() {
    const tableBody = document.getElementById('transactionsTable');
    const { recentWpondTransactions } = dashboardData;
    
    if (recentWpondTransactions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="loading">No wPOND mining activity found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = recentWpondTransactions.map(tx => `
        <tr>
            <td>${formatDate(tx.timestamp * 1000)}</td>
            <td class="wallet-cell">${tx.winnerWallet ? tx.winnerWallet.slice(0, 8) + '...' + tx.winnerWallet.slice(-8) : 'Unknown'}</td>
            <td class="wpond-earned">${tx.wpondReward.toFixed(6)} wPOND</td>
            <td>
                <span class="status-badge ${tx.success ? 'status-success' : 'status-failed'}">
                    ${tx.success ? 'Success' : 'Failed'}
                </span>
            </td>
            <td>
                <button class="btn btn-secondary" onclick="viewTransaction('${tx.signature}')">
                    <i class="fas fa-external-link-alt"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

// Load more transactions
async function loadMoreTransactions() {
    try {
        currentPage++;
        const response = await fetch(`/api/transactions?page=${currentPage}&limit=50`);
        const data = await response.json();
        
        const tableBody = document.getElementById('transactionsTable');
        const newRows = data.transactions.map(tx => `
            <tr>
                <td>${formatDate(tx.timestamp * 1000)}</td>
                <td class="wallet-cell">${tx.winnerWallet ? tx.winnerWallet.slice(0, 8) + '...' + tx.winnerWallet.slice(-8) : 'Unknown'}</td>
                <td class="wpond-earned">${tx.wpondReward.toFixed(6)} wPOND</td>
                <td>
                    <span class="status-badge ${tx.success ? 'status-success' : 'status-failed'}">
                        ${tx.success ? 'Success' : 'Failed'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-secondary" onclick="viewTransaction('${tx.signature}')">
                        <i class="fas fa-external-link-alt"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
        
        tableBody.insertAdjacentHTML('beforeend', newRows);
        
        // Hide load more button if no more pages
        if (currentPage >= data.pagination.pages) {
            document.querySelector('.btn-primary').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading more transactions:', error);
        showError('Failed to load more wPOND mining activity');
    }
}

// Update mining stats
function updateMiningStats() {
    const { miningStats } = dashboardData;
    
    document.getElementById('bestDay').textContent = miningStats.bestWpondDay ? 
        `${formatDate(miningStats.bestWpondDay.date)} (${miningStats.bestWpondDay.wpondRewards.toFixed(6)} wPOND)` : 'N/A';
    document.getElementById('totalVolume').textContent = miningStats.totalMiningVolume.toFixed(6) + ' SOL';
    document.getElementById('updateRuns').textContent = miningStats.totalRuns;
    document.getElementById('lastUpdated').textContent = formatDate(dashboardData.summary.lastUpdated);
}

// View transaction on Solana Explorer
function viewTransaction(signature) {
    const url = `https://explorer.solana.com/tx/${signature}`;
    window.open(url, '_blank');
}

// Format date
function formatDate(date, format = 'full') {
    const d = new Date(date);
    
    if (format === 'short') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show/hide loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// Show error message
function showError(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1001;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Setup auto refresh
function setupAutoRefresh() {
    // Refresh data every 5 minutes
    setInterval(() => {
        loadDashboardData();
    }, 5 * 60 * 1000);
}

// Add some interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Add click to copy wallet functionality
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('wallet-cell')) {
            const wallet = e.target.textContent;
            navigator.clipboard.writeText(wallet).then(() => {
                showNotification('Wallet copied to clipboard!');
            });
        }
    });
});

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #22c55e;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1001;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
} 