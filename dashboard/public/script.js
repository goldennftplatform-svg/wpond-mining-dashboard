// Dashboard functionality
let dashboardData = null;

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch('dashboard-data-complete.json');
        dashboardData = await response.json();
        updateDashboard();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        loadSampleData();
    }
}

// Load sample data for development
function loadSampleData() {
    dashboardData = {
        summary: {
            totalWpondDistributed: 591987620000000000,
            totalRecipients: 1441,
            totalClaims: 2703,
            biggestRecipient: 5445500000000000
        },
        recipients: [
            {
                rank: 1,
                wallet: "AxphxzMM4LuVD8krpjCGg6dENU4QwidAUzpJcrAc18ei",
                wpondAmount: 5445500000000000,
                claimCount: 5,
                firstClaimDate: "2024-12-26",
                lastClaimDate: "2025-03-20"
            },
            {
                rank: 2,
                wallet: "7VocnjpSyCAvhk3zNVu5DqeGAvxbi8MMxEUvLznDFnok",
                wpondAmount: 5255500000000000,
                claimCount: 5,
                firstClaimDate: "2024-11-21",
                lastClaimDate: "2024-12-26"
            }
        ],
        recentClaims: [
            {
                wallet: "AxphxzMM4LuVD8krpjCGg6dENU4QwidAUzpJcrAc18ei",
                wpondAmount: 1089100000000000,
                date: "2025-03-20"
            }
        ],
        pondxRewardsWallet: {
            wallet: "1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL",
            totalWpondReceived: 595606397765000000,
            claimCount: 608,
            firstClaimDate: "2024-10-29",
            lastClaimDate: "2025-07-20",
            averagePerClaim: 979616443691447,
            description: "PondX.com Website Rewards Wallet - Users get paid from this wallet when swapping on PondX.com"
        }
    };
    updateDashboard();
}

// Update dashboard with data
function updateDashboard() {
    if (!dashboardData) return;

    // Update summary cards
    document.getElementById('totalWpond').textContent = formatWpondAmount(dashboardData.summary.totalWpondDistributed);
    document.getElementById('totalWinners').textContent = dashboardData.summary.totalRecipients.toLocaleString();
    document.getElementById('totalClaims').textContent = dashboardData.summary.totalClaims.toLocaleString();
    document.getElementById('biggestWinner').textContent = formatWpondAmount(dashboardData.summary.biggestRecipient);

    // Update PondX rewards wallet section
    if (dashboardData.pondxRewardsWallet) {
        document.getElementById('pondxTotal').textContent = formatWpondAmount(dashboardData.pondxRewardsWallet.totalWpondReceived);
        document.getElementById('pondxClaims').textContent = dashboardData.pondxRewardsWallet.claimCount.toLocaleString();
        document.getElementById('pondxAvg').textContent = formatWpondAmount(dashboardData.pondxRewardsWallet.averagePerClaim);
        document.getElementById('pondxWallet').textContent = formatWallet(dashboardData.pondxRewardsWallet.wallet);
    }

    // Create bubble chart
    createBubbleChart();

    // Update top winners
    updateTopWinners();

    // Update recent activity
    updateRecentActivity();

    // Update all winners table
    updateAllWinners();

    // Create charts
    createDailyChart();
    createWpondChart();
}

// Format wPOND amounts
function formatWpondAmount(amount) {
    if (amount >= 1e12) {
        return (amount / 1e12).toFixed(1) + 'T';
    } else if (amount >= 1e9) {
        return (amount / 1e9).toFixed(1) + 'B';
    } else if (amount >= 1e6) {
        return (amount / 1e6).toFixed(1) + 'M';
    } else if (amount >= 1e3) {
        return (amount / 1e3).toFixed(1) + 'K';
    } else {
        return amount.toString();
    }
}

// Format wallet addresses
function formatWallet(wallet) {
    return wallet.slice(0, 8) + '...' + wallet.slice(-4);
}

// Create floating bubble chart
function createBubbleChart() {
    const bubbleChart = document.getElementById('bubbleChart');
    bubbleChart.innerHTML = '';

    if (!dashboardData || !dashboardData.recipients) return;

    const topWinners = dashboardData.recipients.slice(0, 10);

    topWinners.forEach((winner, index) => {
        const bubble = document.createElement('div');
        bubble.className = 'floating-bubble';
        
        // Calculate bubble size based on wPOND amount
        const size = Math.max(60, Math.min(200, 60 + (winner.wpondAmount / 1e12) * 20));
        
        // Random position
        const left = 10 + Math.random() * 80; // 10% to 90%
        const top = 10 + Math.random() * 80; // 10% to 90%
        
        // Random animation delay and duration
        const delay = Math.random() * 2;
        const duration = 4 + Math.random() * 4;

        bubble.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8));
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            left: ${left}%;
            top: ${top}%;
            animation: bubbleFloat ${duration}s ease-in-out infinite;
            animation-delay: ${delay}s;
            z-index: 1;
            box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
        `;

        // Add hover effects
        bubble.addEventListener('mouseenter', () => {
            bubble.style.transform = 'scale(1.1)';
            bubble.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.5)';
            bubble.style.zIndex = '10';
        });

        bubble.addEventListener('mouseleave', () => {
            bubble.style.transform = 'scale(1)';
            bubble.style.boxShadow = '0 8px 32px rgba(59, 130, 246, 0.3)';
            bubble.style.zIndex = '1';
        });

        // Add click event
        bubble.addEventListener('click', () => {
            showWinnerDetails(winner);
        });

        // Create bubble content
        const content = document.createElement('div');
        content.className = 'bubble-content';
        content.innerHTML = `
            <div class="bubble-rank">#${winner.rank}</div>
            <div class="bubble-amount">${formatWpondAmount(winner.wpondAmount)}</div>
        `;

        // Adjust font size based on bubble size
        const fontSize = Math.max(10, Math.min(16, size / 8));
        content.style.fontSize = `${fontSize}px`;

        bubble.appendChild(content);
        bubbleChart.appendChild(bubble);
    });

    // Add bubble animation styles if not already present
    if (!document.getElementById('bubble-animations')) {
        const style = document.createElement('style');
        style.id = 'bubble-animations';
        style.textContent = `
            @keyframes bubbleFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                25% { transform: translateY(-10px) rotate(2deg); }
                50% { transform: translateY(-5px) rotate(-1deg); }
                75% { transform: translateY(-15px) rotate(1deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Update top winners grid
function updateTopWinners() {
    const winnersGrid = document.getElementById('winnersGrid');
    if (!dashboardData || !dashboardData.recipients) return;

    const topWinners = dashboardData.recipients.slice(0, 10);
    
    winnersGrid.innerHTML = topWinners.map((winner, index) => `
        <div class="winner-card ${index === 0 ? 'top-winner' : ''}" onclick="showWinnerDetails(${JSON.stringify(winner).replace(/"/g, '&quot;')})">
            <div class="rank-icon">${getRankIcon(index + 1)}</div>
            <div class="winner-wallet">${formatWallet(winner.wallet)}</div>
            <div class="winner-amount">${formatWpondAmount(winner.wpondAmount)} wPOND</div>
            <div class="winner-claims">${winner.claimCount} claims</div>
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
    if (!dashboardData || !dashboardData.recentClaims) return;

    recentActivity.innerHTML = dashboardData.recentClaims.map(claim => `
        <tr>
            <td class="wallet-cell" onclick="copyToClipboard('${claim.wallet}')">${formatWallet(claim.wallet)}</td>
            <td>${formatWpondAmount(claim.wpondAmount)} wPOND</td>
            <td>${claim.date}</td>
        </tr>
    `).join('');
}

// Update all winners table
function updateAllWinners() {
    const allWinners = document.getElementById('allWinners');
    if (!dashboardData || !dashboardData.recipients) return;

    allWinners.innerHTML = dashboardData.recipients.map(winner => `
        <tr onclick="showWinnerDetails(${JSON.stringify(winner).replace(/"/g, '&quot;')})">
            <td>${winner.rank}</td>
            <td class="wallet-cell" onclick="copyToClipboard('${winner.wallet}')">${formatWallet(winner.wallet)}</td>
            <td>${formatWpondAmount(winner.wpondAmount)} wPOND</td>
            <td>${winner.claimCount}</td>
            <td>${winner.firstClaimDate}</td>
            <td>${winner.lastClaimDate}</td>
        </tr>
    `).join('');
}

// Show winner details modal
function showWinnerDetails(winner) {
    const modal = document.getElementById('winnerModal');
    const details = document.getElementById('winnerDetails');
    
    details.innerHTML = `
        <h3>🏆 Winner #${winner.rank}</h3>
        <p><strong>Wallet:</strong> <span class="wallet-cell" onclick="copyToClipboard('${winner.wallet}')">${winner.wallet}</span></p>
        <p><strong>Total wPOND:</strong> ${formatWpondAmount(winner.wpondAmount)}</p>
        <p><strong>Claims:</strong> ${winner.claimCount}</p>
        <p><strong>First Claim:</strong> ${winner.firstClaimDate}</p>
        <p><strong>Last Claim:</strong> ${winner.lastClaimDate}</p>
    `;
    
    modal.style.display = 'block';
}

// Copy wallet to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show notification
        const notification = document.createElement('div');
        notification.textContent = 'Wallet copied to clipboard!';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    });
}

// Close modal
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('winnerModal').style.display = 'none';
});

window.addEventListener('click', (event) => {
    const modal = document.getElementById('winnerModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Create daily distribution chart
function createDailyChart() {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    
    // Sample daily data - in real implementation, this would come from the API
    const dailyData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
            label: 'Daily wPOND Distribution',
            data: [120, 190, 300, 500, 200, 300, 400],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            tension: 0.4
        }]
    };

    new Chart(ctx, {
        type: 'line',
        data: dailyData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

// Create wPOND distribution chart
function createWpondChart() {
    const ctx = document.getElementById('wpondChart').getContext('2d');
    
    // Sample distribution data
    const distributionData = {
        labels: ['0-1B', '1B-5B', '5B-10B', '10B+'],
        datasets: [{
            label: 'wPOND Distribution',
            data: [800, 400, 200, 50],
            backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(6, 182, 212, 0.8)',
                'rgba(34, 197, 94, 0.8)'
            ],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    new Chart(ctx, {
        type: 'doughnut',
        data: distributionData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
}); 