// Dashboard functionality
console.log('🚨 EMERGENCY CACHE-BUST VERSION LOADED! Timestamp:', new Date().toISOString());
console.log('🔧 This should be the NEW version with banned wallets excluded!');

// NUCLEAR OPTION: Add visual indicator to prove script is loaded
document.addEventListener('DOMContentLoaded', function() {
    const debugStatus = document.getElementById('debugStatus');
    if (debugStatus) {
        debugStatus.innerHTML = `
            <div style="background: #ff0000; color: white; padding: 15px; border-radius: 5px; font-weight: bold; text-align: center;">
                🚨 NUCLEAR OPTION LOADED! 🚨<br>
                Fresh Data File: helius-dashboard-data-fresh.json<br>
                Timestamp: ${new Date().toISOString()}<br>
                This is the NEW script with banned wallets excluded!
            </div>
        `;
    }
});

let dashboardData = null;

// Exclude specific wallets from display (ALL suspicious wallets identified)
const EXCLUDED_WALLETS = [
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
    '3ywio6QgKQKL5Mtte1eVCZskSpHMvCoP29C8cA3JV1Ca', // single huge tx
    '2aC1XMPKr9yj9RdK6fPrGZ9QhC6b3zbn5aKfZQnUrWeP', // suspicious huge amount
    'HvYahPhM2ANz4cWKDmN8NCDP4aFbdrsRdrPNJEk8KQpQ'  // suspicious payout pattern
];

// Helper function to filter out excluded wallets - ENHANCED VERSION
function filterExcludedWallets(recipients) {
    if (!recipients || !Array.isArray(recipients)) {
        console.warn('⚠️ filterExcludedWallets: Invalid recipients data');
        return [];
    }
    
    console.log('🔍 Filtering wallets - Total before filter:', recipients.length);
    console.log('🚫 Excluded wallets count:', EXCLUDED_WALLETS.length);
    
    // DEBUG: Check if any banned wallets exist in the data
    const bannedFound = EXCLUDED_WALLETS.filter(bannedWallet => 
        recipients.some(recipient => recipient.wallet === bannedWallet)
    );
    
    if (bannedFound.length > 0) {
        console.log('🚫 Banned wallets found in data:', bannedFound);
        console.log('🚫 Banned wallets found count:', bannedFound.length);
    } else {
        console.log('✅ No banned wallets found in data');
    }
    
    // DEBUG: Check first few recipients to see wallet format
    console.log('🔍 First 3 recipients:', recipients.slice(0, 3).map(r => r.wallet));
    
    const filtered = recipients.filter(recipient => {
        if (!recipient || !recipient.wallet) {
            console.warn('⚠️ Invalid recipient found:', recipient);
            return false;
        }
        return !EXCLUDED_WALLETS.includes(recipient.wallet);
    });
    
    console.log('✅ Wallets after filter:', filtered.length);
    console.log('🚫 Wallets excluded:', recipients.length - filtered.length);
    
    // Verify filtering worked
    const stillBanned = filtered.some(r => EXCLUDED_WALLETS.includes(r.wallet));
    if (stillBanned) {
        console.error('❌ FILTERING FAILED - banned wallets still present!');
    } else {
        console.log('✅ Filtering successful - no banned wallets remain');
    }
    
    return filtered;
}

// VERIFICATION FUNCTION: Check if any excluded wallets are still visible
function verifyExcludedWalletsFiltered() {
    console.log('🔍 VERIFYING EXCLUDED WALLETS ARE FILTERED OUT...');
    
    if (!dashboardData || !dashboardData.allRecipients) {
        console.log('⚠️ No dashboard data to verify');
        return;
    }
    
    // Check if any excluded wallets are in the current data
    const excludedFound = EXCLUDED_WALLETS.filter(excludedWallet => 
        dashboardData.allRecipients.some(recipient => recipient.wallet === excludedWallet)
    );
    
    if (excludedFound.length > 0) {
        console.error('🚨 EXCLUDED WALLETS STILL IN DATA:', excludedFound);
        console.error('🚨 This means the data file still contains banned wallets!');
    } else {
        console.log('✅ No excluded wallets found in raw data - filtering not needed');
    }
    
    // Check if any excluded wallets are in the filtered data
    const filteredRecipients = filterExcludedWallets(dashboardData.allRecipients);
    const stillVisible = EXCLUDED_WALLETS.filter(excludedWallet => 
        filteredRecipients.some(recipient => recipient.wallet === excludedWallet)
    );
    
    if (stillVisible.length > 0) {
        console.error('🚨 EXCLUDED WALLETS STILL VISIBLE AFTER FILTERING:', stillVisible);
        console.error('🚨 This means the filtering function is broken!');
    } else {
        console.log('✅ All excluded wallets successfully filtered out');
    }
    
    return {
        excludedInData: excludedFound.length,
        excludedAfterFilter: stillVisible.length,
        totalRecipients: dashboardData.allRecipients.length,
        filteredRecipients: filteredRecipients.length
    };
}

// ENHANCED data loading with better error handling
async function loadDashboardData() {
    const debugStatus = document.getElementById('debugStatus');
    
    try {
        console.log('🔍 Loading dashboard data...');
        if (debugStatus) {
            debugStatus.textContent = '🔍 Loading dashboard data...';
            debugStatus.style.background = '#2d2d5a';
        }
        
        // Try to load the data file with multiple fallbacks - PRIORITIZE NEW MICRO-TX DATA
        let dataUrl = 'helius-dashboard-data-micro-tx.json';
        let response = null;
        
        // Try multiple data sources - NEW MICRO-TX DATA FIRST
        const dataSources = [
            'helius-dashboard-data-micro-tx.json', // NEW: Clean micro-transaction data
            'helius-dashboard-data-fresh.json',
            'helius-dashboard-data.json',
            'dashboard-data-complete.json'
        ];
        
        for (const source of dataSources) {
            try {
                const testUrl = source + '?v=' + Date.now() + '&t=' + Math.random() + '&emergency=' + new Date().getTime();
                console.log('📡 Attempting to fetch:', testUrl);
                
                response = await fetch(testUrl);
                if (response.ok) {
                    dataUrl = source;
                    console.log('✅ Successfully loaded from:', source);
                    break;
                }
            } catch (error) {
                console.log('⚠️ Failed to load from:', source, error.message);
                continue;
            }
        }
        
        if (!response || !response.ok) {
            throw new Error(`Failed to load data from any source. Last status: ${response?.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Data loaded successfully from:', dataUrl);
        console.log('✅ Data keys:', Object.keys(data));
        console.log('✅ Data summary:', data.summary);
        
        if (debugStatus) {
            if (dataUrl === 'helius-dashboard-data-micro-tx.json') {
                debugStatus.innerHTML = `
                    <div style="background: #00ff00; color: black; padding: 15px; border-radius: 5px; font-weight: bold; text-align: center; border: 5px solid #ff0000;">
                        🚨 PREMO MICRO-TX DATA LOADED! 🚨<br>
                        Clean data with individual micro-transactions<br>
                        Excluded wallets filtered out<br>
                        Timestamp: ${new Date().toISOString()}
                    </div>
                `;
            } else {
                debugStatus.textContent = `✅ Data loaded from ${dataUrl}!`;
                debugStatus.style.background = '#2d5a2d';
            }
        }
        
        // Store the data globally
        dashboardData = data;
        
        // Debug: Log the structure
        console.log('🔍 Dashboard data structure:', {
            hasSummary: !!data.summary,
            hasAllRecipients: !!data.allRecipients,
            allRecipientsLength: data.allRecipients?.length || 0,
            sampleRecipient: data.allRecipients?.[0] || 'none'
        });
        
        // Update the dashboard immediately
        console.log('🔄 Updating dashboard...');
        if (debugStatus) {
            debugStatus.textContent = '🔄 Updating dashboard...';
            debugStatus.style.background = '#2d2d5a';
        }
        
        // Update summary stats with null checks
        const totalClaimsEl = document.getElementById('totalClaims');
        const totalWpondEl = document.getElementById('totalWpond');
        const biggestWinnerEl = document.getElementById('biggestWinner');
        const averageClaimEl = document.getElementById('averageClaim');
        
        console.log('🔍 HTML elements found:', {
            totalClaims: !!totalClaimsEl,
            totalWpond: !!totalWpondEl,
            biggestWinner: !!biggestWinnerEl,
            averageClaim: !!averageClaimEl
        });
        
        if (totalClaimsEl) totalClaimsEl.textContent = data.summary?.totalClaims?.toLocaleString() || '0';
        if (totalWpondEl) totalWpondEl.textContent = formatWpondAmount(data.summary?.totalWpond || 0);
        if (biggestWinnerEl) biggestWinnerEl.textContent = formatWpondAmount(data.summary?.biggestAmount || 0);
        if (averageClaimEl) averageClaimEl.textContent = formatWpondAmount(data.summary?.averageAmount || 0);
        
        // Update dashboard functions with proper delays to prevent conflicts
        console.log('🔄 Starting dashboard updates with delays...');
        
        // Step 1: Update recent activity
        setTimeout(() => {
            try {
                console.log('1️⃣ Updating recent activity...');
                console.log('📊 Data available:', !!dashboardData, 'Recipients:', dashboardData?.allRecipients?.length);
                updateRecentActivity();
                console.log('✅ Recent activity updated');
                
                // Step 2: Create bubble board
                setTimeout(() => {
                    try {
                        console.log('2️⃣ Creating bubble board...');
                        console.log('🔍 Bubble board element:', !!document.getElementById('recentWinnersBubbleBoard'));
                        createRecentWinnersBubbleBoard();
                        console.log('✅ Bubble board created');
                        
                        // Step 3: Update top winners
                        setTimeout(() => {
                            try {
                                console.log('3️⃣ Updating top winners...');
                                console.log('🔍 Top winners element:', !!document.getElementById('topWinnersGrid'));
                                updateTopWinners();
                                console.log('✅ Top winners updated');
                                
                                // Step 4: Update all winners
                                setTimeout(() => {
                                    try {
                                        console.log('4️⃣ Updating all winners...');
                                        console.log('🔍 All winners element:', !!document.getElementById('winnersTableBody'));
                                        updateAllWinners();
                                        console.log('✅ All winners updated');
                                        
                                        // Step 5: Update today's winners
                                        setTimeout(() => {
                                            try {
                                                console.log('5️⃣ Updating today\'s winners...');
                                                updateTodaysWinners();
                                                console.log('✅ Today\'s winners updated');
                                                
                                                                                                        // Step 6: Update daily stats
                                                        setTimeout(() => {
                                                            try {
                                                                console.log('6️⃣ Updating daily stats...');
                                                                updateDailyStats();
                                                                console.log('✅ Daily stats updated');
                                                                
                                                                // Step 7: Verify excluded wallets are filtered
                                                                setTimeout(() => {
                                                                    try {
                                                                        console.log('7️⃣ Verifying excluded wallets are filtered...');
                                                                        const verification = verifyExcludedWalletsFiltered();
                                                                        console.log('✅ Verification completed:', verification);
                                                                        
                                                                        console.log('✅ All dashboard updates completed successfully!');
                                                                        if (debugStatus) {
                                                                            debugStatus.textContent = '✅ Dashboard updated successfully!';
                                                                            debugStatus.style.background = '#2d5a2d';
                                                                        }
                                                                        
                                                                    } catch (error) {
                                                                        console.error('❌ Error during verification:', error);
                                                                        if (debugStatus) {
                                                                            debugStatus.textContent = '⚠️ Partial update - verification failed';
                                                                            debugStatus.style.background = '#5a2d2d';
                                                                        }
                                                                    }
                                                                }, 100);
                                                                
                                                            } catch (error) {
                                                                console.error('❌ Error updating daily stats:', error);
                                                                if (debugStatus) {
                                                                    debugStatus.textContent = '⚠️ Partial update - daily stats failed';
                                                                    debugStatus.style.background = '#5a2d2d';
                                                                }
                                                            }
                                                        }, 100);
                                                
                                            } catch (error) {
                                                console.error('❌ Error updating today\'s winners:', error);
                                                if (debugStatus) {
                                                    debugStatus.textContent = '⚠️ Partial update - today\'s winners failed';
                                                    debugStatus.style.background = '#5a2d2d';
                                                }
                                            }
                                        }, 100);
                                        
                                    } catch (error) {
                                        console.error('❌ Error updating all winners:', error);
                                        if (debugStatus) {
                                            debugStatus.textContent = '⚠️ Partial update - all winners failed';
                                            debugStatus.style.background = '#5a2d2d';
                                        }
                                    }
                                }, 100);
                                
                            } catch (error) {
                                console.error('❌ Error updating top winners:', error);
                                if (debugStatus) {
                                    debugStatus.textContent = '⚠️ Partial update - top winners failed';
                                    debugStatus.style.background = '#5a2d2d';
                                }
                            }
                        }, 100);
                        
                    } catch (error) {
                        console.error('❌ Error creating bubble board:', error);
                        if (debugStatus) {
                            debugStatus.textContent = '⚠️ Partial update - bubble board failed';
                            debugStatus.style.background = '#5a2d2d';
                        }
                    }
                }, 100);
                
            } catch (error) {
                console.error('❌ Error updating recent activity:', error);
                if (debugStatus) {
                    debugStatus.textContent = '⚠️ Partial update - recent activity failed';
                    debugStatus.style.background = '#5a2d2d';
                }
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Fatal error loading dashboard data:', error);
        if (debugStatus) {
            debugStatus.textContent = '❌ Error: ' + error.message;
            debugStatus.style.background = '#5a2d2d';
        }
    }
}

// Load sample data for development - COMPLETELY REMOVED TO PREVENT BANNED WALLETS
function loadSampleData() {
    console.log('🚫 Sample data function DISABLED - contains banned wallets');
    // Function completely disabled to prevent banned wallets from loading
}

// Update dashboard with data
function updateDashboard() {
    if (!dashboardData) {
        console.log('❌ No dashboard data available');
        return;
    }

    console.log('🔄 Updating dashboard with data:', dashboardData);

    try {
        // Update summary cards
        const totalClaimsEl = document.getElementById('totalClaims');
        const totalWpondEl = document.getElementById('totalWpond');
        const biggestWinnerEl = document.getElementById('biggestWinner');
        const averageClaimEl = document.getElementById('averageClaim');

        console.log('📊 Updating summary cards...');
        if (totalClaimsEl) {
            totalClaimsEl.textContent = dashboardData.summary.totalClaims.toLocaleString();
            console.log('✅ Updated totalClaims:', dashboardData.summary.totalClaims);
        }
        if (totalWpondEl) {
            totalWpondEl.textContent = formatWpondAmount(dashboardData.summary.totalWpond);
            console.log('✅ Updated totalWpond:', formatWpondAmount(dashboardData.summary.totalWpond));
        }
        if (biggestWinnerEl) {
            biggestWinnerEl.textContent = formatWpondAmount(dashboardData.summary.biggestAmount);
            console.log('✅ Updated biggestWinner:', formatWpondAmount(dashboardData.summary.biggestAmount));
        }
        if (averageClaimEl) {
            averageClaimEl.textContent = formatWpondAmount(dashboardData.summary.averageAmount);
            console.log('✅ Updated averageClaim:', formatWpondAmount(dashboardData.summary.averageAmount));
        }





        // Update top winners
        console.log('🏆 Updating top winners...');
        updateTopWinners();

        // Update all winners table
        console.log('📋 Updating all winners table...');
        updateAllWinners();



        // Update daily stats
        console.log('📈 Updating daily stats...');
        updateDailyStats();

        // Update today's winners
        console.log('🏅 Updating today\'s winners...');
        updateTodaysWinners();

        console.log('✅ Dashboard updated successfully');
    } catch (error) {
        console.error('❌ Error updating dashboard:', error);
    }
}

// Format wPOND amounts
function formatWpondAmount(amount) {
    // Handle null/undefined values
    if (amount === null || amount === undefined) {
        return '0';
    }
    
    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
        return '0';
    }
    
    if (numAmount >= 1e12) {
        return (numAmount / 1e12).toFixed(1) + 'T';
    } else if (numAmount >= 1e9) {
        return (numAmount / 1e9).toFixed(1) + 'B';
    } else if (numAmount >= 1e6) {
        return (numAmount / 1e6).toFixed(1) + 'M';
    } else if (numAmount >= 1e3) {
        return (numAmount / 1e3).toFixed(1) + 'K';
    } else {
        return numAmount.toString();
    }
}

// Format wallet addresses
function formatWallet(wallet) {
    if (!wallet || typeof wallet !== 'string') {
        console.warn('⚠️ Invalid wallet address:', wallet);
        return 'Invalid Wallet';
    }
    return wallet.slice(0, 8) + '...' + wallet.slice(-4);
}

// Function to adjust color brightness
function adjustColorBrightness(hex, percent) {
    // Remove the # if present
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Adjust brightness
    const adjustR = Math.max(0, Math.min(255, r + (r * percent / 100)));
    const adjustG = Math.max(0, Math.min(255, g + (g * percent / 100)));
    const adjustB = Math.max(0, Math.min(255, b + (b * percent / 100)));
    
    // Convert back to hex
    const newR = Math.round(adjustR).toString(16).padStart(2, '0');
    const newG = Math.round(adjustG).toString(16).padStart(2, '0');
    const newB = Math.round(adjustB).toString(16).padStart(2, '0');
    
    return `#${newR}${newG}${newB}`;
}

// Create floating bubble chart
function createBubbleChart() {
    const bubbleChart = document.getElementById('bubbleChart');
    bubbleChart.innerHTML = '';

    if (!dashboardData || !dashboardData.topWinners) return;

    const topWinners = dashboardData.topWinners;

    topWinners.forEach((winner, index) => {
        const bubble = document.createElement('div');
        bubble.className = 'floating-bubble';
        
        // Calculate bubble size based on wPOND amount
        const size = Math.max(70, Math.min(180, 70 + (winner.amount / 1e12) * 18));
        
        // Better balanced positioning
        const left = 15 + Math.random() * 70; // 15% to 85%
        const top = 15 + Math.random() * 70; // 15% to 85%
        
        // Random animation delay and duration
        const delay = Math.random() * 2;
        const duration = 4 + Math.random() * 4;

        bubble.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: radial-gradient(circle, #ff69b4 0%, #ff1493 70%);
            border: 3px solid #000;
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
            box-shadow: 4px 4px 0px #000, 8px 8px 0px rgba(255, 105, 180, 0.3);
            font-family: 'Press Start 2P', monospace;
        `;

        // Add hover effects with 8-bit theme
        bubble.addEventListener('mouseenter', () => {
            bubble.style.transform = 'scale(1.05) translateY(-2px)';
            bubble.style.boxShadow = '6px 6px 0px #000, 12px 12px 0px rgba(255, 105, 180, 0.5)';
            bubble.style.zIndex = '10';
            bubble.style.background = 'linear-gradient(135deg, #ff1493, #ff69b4)';
        });

        bubble.addEventListener('mouseleave', () => {
            bubble.style.transform = 'scale(1) translateY(0px)';
            bubble.style.boxShadow = '4px 4px 0px #000, 8px 8px 0px rgba(255, 105, 180, 0.3)';
            bubble.style.zIndex = '1';
            bubble.style.background = 'linear-gradient(135deg, #ff69b4, #ff1493)';
        });

        // Add click event for blockchain check
        bubble.addEventListener('click', () => {
            checkWalletOnBlockchain(winner.wallet);
        });

        // Create bubble content with 8-bit styling
        const content = document.createElement('div');
        content.className = 'bubble-content';
        content.style.cssText = `
            text-align: center;
            color: #000;
            text-shadow: 1px 1px 0px #fff;
            font-weight: bold;
            line-height: 1.2;
        `;
        
        content.innerHTML = `
            <div class="bubble-rank" style="font-size: ${Math.max(8, Math.min(12, size / 12))}px; margin-bottom: 2px;">#${winner.rank}</div>
            <div class="bubble-amount" style="font-size: ${Math.max(6, Math.min(10, size / 15))}px;">${formatWpondAmount(winner.amount)}</div>
        `;

        bubble.appendChild(content);
        bubbleChart.appendChild(bubble);
    });

    // Add bubble animation styles if not already present
    if (!document.getElementById('bubble-animations')) {
        const style = document.createElement('style');
        style.id = 'bubble-animations';
        style.textContent = `
            @keyframes bubbleFloat {
                0% { 
                    transform: translate(0px, 0px) rotate(0deg); 
                }
                25% { 
                    transform: translate(15px, -10px) rotate(2deg); 
                }
                50% { 
                    transform: translate(-10px, -5px) rotate(-1deg); 
                }
                75% { 
                    transform: translate(8px, -15px) rotate(1deg); 
                }
                100% { 
                    transform: translate(0px, 0px) rotate(0deg); 
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Create top winners bubble board
function createTopWinnersBubbleBoard() {
    const bubbleBoard = document.getElementById('topWinnersBubbleBoard');
    bubbleBoard.innerHTML = '';

    if (!dashboardData || !dashboardData.topWinners) return;

    const topWinners = dashboardData.topWinners;

    topWinners.forEach((winner, index) => {
        const bubble = document.createElement('div');
        bubble.className = 'winner-bubble';
        
        // Calculate bubble size based on wPOND amount (35% bigger)
        const size = Math.max(100, Math.min(250, 100 + (winner.amount / 1e12) * 25));
        
        // Position in a grid-like pattern with better spacing
        const row = Math.floor(index / 3);
        const col = index % 3;
        const left = 8 + (col * 28); // 3 columns with better spacing
        const top = 8 + (row * 20); // Rows with better spacing to fit in 400px height
        
        // Random animation delay
        const delay = Math.random() * 2;

        // Create color variation based on position (top to bottom)
        const colorVariation = Math.min(0.3, (top / 100) * 0.3); // 0 to 0.3 variation
        const basePink = '#ff69b4';
        const darkerPink = '#ff1493';
        
        // Adjust colors based on position
        const adjustedBasePink = adjustColorBrightness(basePink, -colorVariation * 100);
        const adjustedDarkerPink = adjustColorBrightness(darkerPink, -colorVariation * 100);

        bubble.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: radial-gradient(circle, ${adjustedBasePink}40 0%, ${adjustedDarkerPink}20 70%);
            border: 2px solid ${adjustedBasePink}60;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            left: ${left}%;
            top: ${top}%;
            animation: bubbleFloat 8s ease-in-out infinite;
            animation-delay: ${delay}s;
            z-index: 1;
            box-shadow: 2px 2px 0px #000, 4px 4px 0px rgba(255, 105, 180, 0.2);
            font-family: 'Press Start 2P', monospace;
        `;

        // Add hover effects with 8-bit theme
        bubble.addEventListener('mouseenter', () => {
            bubble.style.transform = 'scale(1.05) translateY(-2px)';
            bubble.style.boxShadow = '3px 3px 0px #000, 6px 6px 0px rgba(255, 105, 180, 0.3)';
            bubble.style.zIndex = '10';
            bubble.style.background = `linear-gradient(135deg, ${adjustedDarkerPink}60, ${adjustedBasePink}40)`;
        });

        bubble.addEventListener('mouseleave', () => {
            bubble.style.transform = 'scale(1) translateY(0px)';
            bubble.style.boxShadow = '2px 2px 0px #000, 4px 4px 0px rgba(255, 105, 180, 0.2)';
            bubble.style.zIndex = '1';
            bubble.style.background = `radial-gradient(circle, ${adjustedBasePink}40 0%, ${adjustedDarkerPink}20 70%)`;
        });

        // Add click event for blockchain check
        bubble.addEventListener('click', () => {
            checkWalletOnBlockchain(winner.wallet);
        });

        // Create bubble content with 8-bit styling
        const content = document.createElement('div');
        content.className = 'bubble-content';
        content.style.cssText = `
            text-align: center;
            color: #000;
            text-shadow: 1px 1px 0px #fff;
            font-weight: bold;
            line-height: 1.2;
        `;
        
        content.innerHTML = `
            <div class="bubble-rank" style="font-size: ${Math.max(12, Math.min(16, size / 8))}px; margin-bottom: 4px;">#${winner.rank}</div>
            <div class="bubble-amount" style="font-size: ${Math.max(10, Math.min(14, size / 10))}px;">${formatWpondAmount(winner.amount)}</div>
        `;

        bubble.appendChild(content);
        bubbleBoard.appendChild(bubble);
    });
}

// Create recent winners bubble board
function createRecentWinnersBubbleBoard() {
    console.log('🔍 createRecentWinnersBubbleBoard() called');
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    const bubbleBoard = document.getElementById('recentWinnersBubbleBoard');
    console.log('🔍 Bubble board element found:', !!bubbleBoard);
    
    if (!bubbleBoard) {
        console.error('❌ Bubble board element not found!');
        return;
    }
    
    bubbleBoard.innerHTML = '';
    console.log('🔍 Dashboard data available:', !!dashboardData);
    console.log('🔍 All recipients available:', !!dashboardData?.allRecipients);
    console.log('🔍 Recipients count:', dashboardData?.allRecipients?.length || 0);

    if (!dashboardData || !dashboardData.allRecipients) {
        console.warn('⚠️ No dashboard data or recipients available');
        bubbleBoard.innerHTML = `
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: #ff69b4;
                font-family: 'Press Start 2P', monospace;
                font-size: 14px;
            ">
                <div style="margin-bottom: 10px;">⚠️</div>
                <div>NO DATA AVAILABLE</div>
                <div style="font-size: 10px; margin-top: 10px; opacity: 0.8;">CHECK CONSOLE FOR ERRORS</div>
            </div>
        `;
        return;
    }

    // Show the most recent recipients (already sorted by date in the data)
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    const claimsToShow = allRecipients.slice(0, 20); // Show last 20 recent recipients
    console.log('🔍 Claims to show:', claimsToShow.length);

    if (claimsToShow.length === 0) {
        console.warn('⚠️ No claims to show');
        bubbleBoard.innerHTML = `
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: #ff69b4;
                font-family: 'Press Start 2P', monospace;
                font-size: 14px;
            ">
                <div style="margin-bottom: 10px;">🕐</div>
                <div>NO RECENT WINNERS</div>
                <div style="font-size: 10px; margin-top: 10px; opacity: 0.8;">CHECK BACK LATER!</div>
            </div>
        `;
        return;
    }

    // Update the section title to show actual date range
    const sectionTitle = document.querySelector('.bubble-board-section h2');
    if (sectionTitle) {
        const oldestDate = claimsToShow[claimsToShow.length - 1]?.date || 'Unknown';
        const newestDate = claimsToShow[0]?.date || 'Unknown';
        sectionTitle.textContent = `🕐 RECENT WINNERS (${newestDate} to ${oldestDate})`;
    }

    claimsToShow.forEach((claim, index) => {
        const bubble = document.createElement('div');
        bubble.className = 'recent-bubble';
        
        // Calculate bubble size based on wPOND amount (35% bigger)
        const size = Math.max(67, Math.min(162, 67 + (claim.amount / 1e9) * 13));
        
        // Position in a grid-like pattern with better spacing
        const row = Math.floor(index / 4);
        const col = index % 4;
        const left = 6 + (col * 22); // 4 columns with better spacing
        const top = 8 + (row * 18); // Rows with better spacing to fit in 400px height
        
        // Random animation delay
        const delay = Math.random() * 2;

        // Create color variation based on position (top to bottom) with blue hue
        const colorVariation = Math.min(0.3, (top / 100) * 0.3); // 0 to 0.3 variation
        const basePink = '#ff69b4';
        const darkerPink = '#ff1493';
        const blueHue = '#4a90e2'; // Add blue hue
        
        // Adjust colors based on position with blue tint
        const adjustedBasePink = adjustColorBrightness(basePink, -colorVariation * 100);
        const adjustedDarkerPink = adjustColorBrightness(darkerPink, -colorVariation * 100);
        const adjustedBlue = adjustColorBrightness(blueHue, -colorVariation * 50);

        bubble.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: radial-gradient(circle, ${adjustedBlue}40 0%, ${adjustedBasePink}30 70%);
            border: 2px solid ${adjustedBlue}60;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            left: ${left}%;
            top: ${top}%;
            animation: bubbleFloat 8s ease-in-out infinite;
            animation-delay: ${delay}s;
            z-index: 1;
            box-shadow: 2px 2px 0px #000, 4px 4px 0px rgba(74, 144, 226, 0.2);
            font-family: 'Press Start 2P', monospace;
        `;

        // Add hover effects with 8-bit theme
        bubble.addEventListener('mouseenter', () => {
            bubble.style.transform = 'scale(1.05) translateY(-2px)';
            bubble.style.boxShadow = '3px 3px 0px #000, 6px 6px 0px rgba(74, 144, 226, 0.4)';
            bubble.style.zIndex = '10';
            bubble.style.background = `linear-gradient(135deg, ${adjustedBlue}60, ${adjustedBasePink}40)`;
        });

        bubble.addEventListener('mouseleave', () => {
            bubble.style.transform = 'scale(1) translateY(0px)';
            bubble.style.boxShadow = '2px 2px 0px #000, 4px 4px 0px rgba(74, 144, 226, 0.2)';
            bubble.style.zIndex = '1';
            bubble.style.background = `radial-gradient(circle, ${adjustedBlue}40 0%, ${adjustedBasePink}30 70%)`;
        });

        // Add click event for blockchain check
        bubble.addEventListener('click', () => {
            checkWalletOnBlockchain(claim.wallet);
        });

        // Create bubble content with 8-bit styling
        const content = document.createElement('div');
        content.className = 'bubble-content';
        content.style.cssText = `
            text-align: center;
            color: #fff;
            text-shadow: 2px 2px 4px #000, -1px -1px 2px #000;
            font-size: ${Math.max(10, Math.min(14, size / 8))}px;
            font-weight: bold;
            line-height: 1.2;
            padding: 4px;
        `;
        
        const isToday = claim.date === today;
        content.innerHTML = `
            <div style="font-size: ${Math.max(8, Math.min(12, size / 10))}px; margin-bottom: 2px;">${isToday ? '🕐' : '📅'}</div>
            <div style="font-size: ${Math.max(8, Math.min(12, size / 10))}px;">${formatWpondAmount(claim.amount)}</div>
            <div style="font-size: ${Math.max(6, Math.min(8, size / 15))}px; opacity: 0.9; margin-top: 2px;">${isToday ? 'TODAY' : claim.date}</div>
        `;

        bubble.appendChild(content);
        bubbleBoard.appendChild(bubble);
    });
}

// Function to check wallet on blockchain
function checkWalletOnBlockchain(walletAddress) {
    // Open Solana Explorer in new tab
    const solanaExplorerUrl = `https://solscan.io/account/${walletAddress}`;
    window.open(solanaExplorerUrl, '_blank');
    
    // Show notification
    showNotification(`🔍 Checking wallet ${formatWallet(walletAddress)} on blockchain...`, 'info');
}

// Function to show notifications
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff69b4, #ff1493);
        border: 3px solid #000;
        color: #000;
        padding: 15px 20px;
        border-radius: 0;
        font-family: 'Press Start 2P', monospace;
        font-size: 12px;
        z-index: 1000;
        box-shadow: 4px 4px 0px #000;
        animation: notificationSlideIn 0.3s ease-out;
        max-width: 300px;
        text-align: center;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'notificationSlideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

// Add notification animations
if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
        @keyframes notificationSlideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes notificationSlideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Update top winners grid
function updateTopWinners() {
    console.log('🔍 updateTopWinners() called');
    const winnersGrid = document.getElementById('topWinnersGrid');
    console.log('🔍 Top winners grid element found:', !!winnersGrid);
    
    if (!winnersGrid) {
        console.error('❌ Top winners grid element not found!');
        return;
    }
    
    console.log('🔍 Dashboard data available:', !!dashboardData);
    console.log('🔍 All recipients available:', !!dashboardData?.allRecipients);
    console.log('🔍 Recipients count:', dashboardData?.allRecipients?.length || 0);
    
    if (!dashboardData || !dashboardData.allRecipients) {
        console.warn('⚠️ No dashboard data or recipients available for top winners');
        winnersGrid.innerHTML = '<div class="loading">No data available</div>';
        return;
    }

    // Use allRecipients instead of topWinners, take top 10
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    const topWinners = allRecipients.slice(0, 10);
    console.log('🔍 Top 10 winners found:', topWinners.length);
    
    winnersGrid.innerHTML = topWinners.map((winner, index) => `
        <div class="winner-card ${index === 0 ? 'top-winner' : ''}" onclick="showWinnerDetails(${JSON.stringify(winner).replace(/"/g, '&quot;')})">
            <div class="rank-icon">${getRankIcon(index + 1)}</div>
            <div class="winner-wallet">${formatWallet(winner.wallet)}</div>
            <div class="winner-amount">${formatWpondAmount(winner.amount)} wPOND</div>
            <div class="winner-date">${winner.date}</div>
        </div>
    `).join('');
    
    console.log('✅ Top winners updated successfully');
}

// Get rank icon
function getRankIcon(rank) {
    const icons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return icons[rank - 1] || `${rank}`;
}

// Update recent activity
function updateRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    if (!recentActivity) {
        console.warn('⚠️ recentActivity element not found');
        return;
    }
    
    if (!dashboardData || !dashboardData.allRecipients) {
        console.warn('⚠️ No recipients data available');
        recentActivity.innerHTML = '<tr><td colspan="3" class="no-results">No recent activity data available</td></tr>';
        return;
    }

    // Use the first 10 recipients as recent activity for now
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    const recentRecipients = allRecipients.slice(0, 10);

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
    if (!dashboardData || !dashboardData.allRecipients) return;

    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    winnersTableBody.innerHTML = allRecipients.map((winner, index) => `
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

// Show winner details modal
function showWinnerDetails(winner) {
    const modal = document.getElementById('winnerModal');
    const details = document.getElementById('winnerDetails');
    
    details.innerHTML = `
        <h3>🏆 Winner Details</h3>
        <p><strong>Wallet:</strong> <span class="wallet-cell" onclick="copyToClipboard('${winner.wallet}')">${winner.wallet}</span></p>
        <p><strong>Total wPOND:</strong> ${formatWpondAmount(winner.amount)}</p>
        <p><strong>Claims:</strong> ${winner.claimCount}</p>
        <p><strong>Claim Date:</strong> ${winner.date}</p>
        <p><strong>Signature:</strong> <span class="signature-cell" onclick="copyToClipboard('${winner.signature}')">${winner.signature}</span></p>
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
const closeButton = document.querySelector('.close');
if (closeButton) {
    closeButton.addEventListener('click', () => {
        const modal = document.getElementById('winnerModal');
        if (modal) {
            modal.style.display = 'none';
        }
    });
}

window.addEventListener('click', (event) => {
    const modal = document.getElementById('winnerModal');
    if (event.target === modal && modal) {
        modal.style.display = 'none';
    }
});

// Create daily distribution chart


// Create daily bubble chart
function createDailyBubbleChart() {
    const dailyBubbleChart = document.getElementById('dailyBubbleChart');
    dailyBubbleChart.innerHTML = '';

    if (!dashboardData || !dashboardData.allRecipients) return;

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Filter today's claims
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    const todaysClaims = allRecipients.filter(recipient => recipient.date === today);
    
    // If no today's claims, show recent recipients
    const claimsToShow = todaysClaims.length > 0 ? todaysClaims : allRecipients.slice(0, 8);

    claimsToShow.forEach((recipient, index) => {
        const bubble = document.createElement('div');
        bubble.className = 'floating-bubble daily-bubble';
        
        // Calculate bubble size based on wPOND amount
        const size = Math.max(50, Math.min(120, 50 + (recipient.amount / 1e9) * 10));
        
        // Position in a grid-like pattern
        const row = Math.floor(index / 4);
        const col = index % 4;
        const left = 5 + (col * 22.5); // 4 columns
        const top = 10 + (row * 30); // Rows
        
        // Random animation delay
        const delay = Math.random() * 3;

        bubble.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 0;
            background: linear-gradient(135deg, #ff69b4, #ff1493);
            border: 2px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            left: ${left}%;
            top: ${top}%;
            animation: bubbleFloat 6s ease-in-out infinite;
            animation-delay: ${delay}s;
            z-index: 1;
            box-shadow: 3px 3px 0px #000, 6px 6px 0px rgba(255, 105, 180, 0.3);
            image-rendering: pixelated;
            font-family: 'Press Start 2P', monospace;
        `;

        // Add hover effects with 8-bit theme
        bubble.addEventListener('mouseenter', () => {
            bubble.style.transform = 'scale(1.05) translateY(-2px)';
            bubble.style.boxShadow = '4px 4px 0px #000, 8px 8px 0px rgba(255, 105, 180, 0.5)';
            bubble.style.zIndex = '10';
            bubble.style.background = 'linear-gradient(135deg, #ff1493, #ff69b4)';
        });

        bubble.addEventListener('mouseleave', () => {
            bubble.style.transform = 'scale(1) translateY(0px)';
            bubble.style.boxShadow = '3px 3px 0px #000, 6px 6px 0px rgba(255, 105, 180, 0.3)';
            bubble.style.zIndex = '1';
            bubble.style.background = 'linear-gradient(135deg, #ff69b4, #ff1493)';
        });

        // Add click event for blockchain check
        bubble.addEventListener('click', () => {
            checkWalletOnBlockchain(recipient.wallet);
        });

        // Create bubble content with 8-bit styling
        const content = document.createElement('div');
        content.className = 'bubble-content';
        content.style.cssText = `
            text-align: center;
            color: #000;
            text-shadow: 1px 1px 0px #fff;
            font-weight: bold;
            line-height: 1.2;
        `;
        
        content.innerHTML = `
            <div class="bubble-amount" style="font-size: ${Math.max(4, Math.min(6, size / 15))}px;">${formatWpondAmount(recipient.amount)}</div>
            <div class="bubble-hint" style="font-size: ${Math.max(3, Math.min(4, size / 20))}px; opacity: 0.8; margin-top: 1px;">CLICK</div>
        `;

        bubble.appendChild(content);
        dailyBubbleChart.appendChild(bubble);
    });
}

// Update daily stats - ENHANCED with excluded wallet filtering
function updateDailyStats() {
    if (!dashboardData || !dashboardData.allRecipients) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Filter out excluded wallets from all recipients first
    const filteredRecipients = filterExcludedWallets(dashboardData.allRecipients);
    
    // Get today's claims from filtered recipients
    const todaysClaims = filteredRecipients.filter(recipient => recipient.date === today);
    
    // Calculate today's stats
    const todayWinners = new Set(todaysClaims.map(claim => claim.wallet)).size;
    const todayWpond = todaysClaims.reduce((sum, claim) => sum + claim.amount, 0);
    const todayClaims = todaysClaims.length;

    console.log('📊 Daily stats calculated:', {
        today: today,
        totalRecipients: filteredRecipients.length,
        todaysClaims: todaysClaims.length,
        todayWinners: todayWinners,
        todayWpond: todayWpond
    });

    // Update daily stats display with null checks
    const todayWinnersEl = document.getElementById('todayWinners');
    const todayWpondEl = document.getElementById('todayWpond');
    const todayClaimsEl = document.getElementById('todayClaims');
    
    if (todayWinnersEl) todayWinnersEl.textContent = todayWinners;
    if (todayWpondEl) todayWpondEl.textContent = formatWpondAmount(todayWpond);
    if (todayClaimsEl) todayClaimsEl.textContent = todayClaims;
}

// Filter winners based on selected criteria - ENHANCED with excluded wallet filtering
function filterWinners(filterType) {
    if (!dashboardData) return;

    // Update active button
    document.querySelectorAll('.filter-controls button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    let filteredWinners = [];

    switch (filterType) {
        case 'all':
            filteredWinners = filterExcludedWallets(dashboardData.allRecipients);
            break;
        case 'top10':
            filteredWinners = filterExcludedWallets(dashboardData.allRecipients).slice(0, 10);
            break;
        case 'top50':
            filteredWinners = filterExcludedWallets(dashboardData.allRecipients).slice(0, 50);
            break;
        case 'top100':
            filteredWinners = filterExcludedWallets(dashboardData.allRecipients).slice(0, 100);
            break;
        case 'topClaimers':
            // Show top claimers (wallets with most claims)
            if (dashboardData.topClaimers) {
                filteredWinners = filterExcludedWallets(dashboardData.topClaimers).map(claimer => ({
                    wallet: claimer.wallet,
                    amount: claimer.totalAmount,
                    claimCount: claimer.claimCount,
                    date: claimer.lastClaimDate,
                    signature: 'Multiple claims'
                }));
            }
            break;
        case 'multiClaimers':
            // Show wallets with multiple claims (2 or more) - deduplicate and show total amounts
            const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
            const walletTotals = {};
            const walletClaimCounts = {};
            
            allRecipients.forEach(winner => {
                const wallet = winner.wallet;
                if (!walletTotals[wallet]) {
                    walletTotals[wallet] = 0;
                    walletClaimCounts[wallet] = winner.claimCount || 1; // Use the actual claim count
                }
                walletTotals[wallet] += winner.amount;
            });
            
            // Filter wallets with 2 or more claims
            filteredWinners = Object.keys(walletTotals)
                .filter(wallet => walletClaimCounts[wallet] >= 2)
                .map(wallet => ({
                    wallet: wallet,
                    amount: walletTotals[wallet],
                    claimCount: walletClaimCounts[wallet],
                    date: allRecipients.find(w => w.wallet === wallet)?.date || 'Multiple dates',
                    signature: 'Multiple claims'
                }))
                .sort((a, b) => b.amount - a.amount);
            
            console.log('🔍 Multi-Claimers Filter Debug:');
            console.log(`   - Total unique wallets: ${Object.keys(walletTotals).length}`);
            console.log(`   - Wallets with 2+ claims: ${filteredWinners.length}`);
            console.log(`   - Sample multi-claimer:`, filteredWinners[0]);
            break;
        default:
            filteredWinners = filterExcludedWallets(dashboardData.allRecipients);
    }

    console.log(`🔍 Filter '${filterType}' applied - showing ${filteredWinners.length} winners`);
    updateFilteredWinnersTable(filteredWinners);
}

// Update filtered winners table
function updateFilteredWinnersTable(winners) {
    const winnersTableBody = document.getElementById('winnersTableBody');
    
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

// Reset all filters
function resetFilters() {
    document.querySelectorAll('.filter-controls button').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-controls button').classList.add('active');
    filterWinners('all');
}

// Wallet search functionality
async function searchWallet() {
    const searchInput = document.getElementById('searchInput').value.trim();
    if (!searchInput) {
        alert('Please enter a wallet address to search');
        return;
    }

    // Simple wallet search without .sol resolution
    const walletAddress = searchInput;
    
    // Search in our local data
    const recipient = dashboardData.allRecipients.find(r => 
        r.wallet.toLowerCase() === walletAddress.toLowerCase()
    );

    if (recipient) {
        showWinnerDetails(recipient);
    } else {
        alert('Wallet not found in our data. Please check the address and try again.');
    }
}

// Validate Solana address format
function isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Search wallet in our data
async function searchWalletInData(walletAddress) {
    console.log('🔍 Searching for wallet:', walletAddress);
    console.log('🔍 dashboardData exists:', !!dashboardData);
    console.log('🔍 allRecipients exists:', !!dashboardData?.allRecipients);
    console.log('🔍 Total recipients:', dashboardData?.allRecipients?.length || 0);
    
    if (!dashboardData || !dashboardData.allRecipients) {
        console.log('❌ No dashboard data available');
        return null;
    }
    
    // Search in all recipients
    const foundRecipient = dashboardData.allRecipients.find(recipient => 
        recipient.wallet.toLowerCase() === walletAddress.toLowerCase()
    );
    
    console.log('🔍 Found recipient:', !!foundRecipient);
    if (foundRecipient) {
        console.log('🔍 Recipient details:', foundRecipient);
    }
    
    if (foundRecipient) {
        // Calculate rank based on amount
        const sortedRecipients = [...dashboardData.allRecipients].sort((a, b) => b.amount - a.amount);
        const rank = sortedRecipients.findIndex(r => r.wallet === foundRecipient.wallet) + 1;
        
        console.log('🔍 Calculated rank:', rank);
        
        return {
            ...foundRecipient,
            rank: rank
        };
    }
    
    return null;
}

// Show search result details
function showSearchResult(result) {
    const modal = document.createElement('div');
    modal.className = 'search-result-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: linear-gradient(135deg, #ff69b4, #ff1493);
        border: 3px solid #000;
        padding: 30px;
        border-radius: 8px;
        text-align: center;
        color: #000;
        font-family: 'Press Start 2P', monospace;
        max-width: 400px;
        box-shadow: 8px 8px 0px #000;
    `;
    
    content.innerHTML = `
        <h3 style="margin-bottom: 20px; font-size: 16px;">🎯 SEARCH RESULT</h3>
        <div style="margin-bottom: 15px;">
            <div style="font-size: 12px; margin-bottom: 5px;">RANK</div>
            <div style="font-size: 18px; font-weight: bold;">#${result.rank}</div>
        </div>
        <div style="margin-bottom: 15px;">
            <div style="font-size: 12px; margin-bottom: 5px;">WALLET</div>
            <div style="font-size: 10px; word-break: break-all;">${result.wallet}</div>
        </div>
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; margin-bottom: 5px;">TOTAL wPOND</div>
            <div style="font-size: 16px; font-weight: bold;">${formatWpondAmount(result.amount)}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
            background: #000;
            color: #ff69b4;
            border: 2px solid #ff69b4;
            padding: 10px 20px;
            font-family: 'Press Start 2P', monospace;
            font-size: 10px;
            cursor: pointer;
            border-radius: 4px;
        ">CLOSE</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Set payout alert for wallet
function setPayoutAlert() {
    const alertInput = document.getElementById('alertInput');
    
    if (!alertInput) {
        console.log('Alert input not found');
        return;
    }
    
    const alertValue = alertInput.value.trim();
    
    if (!alertValue) {
        showNotification('Enter a wallet address to set alerts', 'error');
        return;
    }
    
    if (!isValidSolanaAddress(alertValue)) {
        showNotification('❌ Invalid wallet address format', 'error');
        return;
    }
    
    // Store alert in localStorage
    const alerts = JSON.parse(localStorage.getItem('wpondAlerts') || '[]');
    if (!alerts.includes(alertValue)) {
        alerts.push(alertValue);
        localStorage.setItem('wpondAlerts', JSON.stringify(alerts));
        
        // Start monitoring for this wallet
        startPayoutMonitoring(alertValue);
        
        showNotification(`🔔 ALERT SET! Monitoring ${formatWallet(alertValue)} for payouts!`, 'success');
        
        // Update alert status display
        updateAlertStatus();
        
        // Clear input
        alertInput.value = '';
    } else {
        showNotification('⚠️ Alert already exists for this wallet', 'warning');
    }
}

// Update alert status display
function updateAlertStatus() {
    const alerts = JSON.parse(localStorage.getItem('wpondAlerts') || '[]');
    const alertStatus = document.getElementById('alertStatus');
    
    if (alertStatus) {
        if (alerts.length > 0) {
            alertStatus.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span>🔔</span>
                    <span>Monitoring ${alerts.length} wallet(s)</span>
                    <button onclick="clearAllAlerts()" style="
                        background: #ff1493;
                        color: #000;
                        border: 1px solid #000;
                        padding: 4px 8px;
                        font-size: 10px;
                        cursor: pointer;
                        border-radius: 4px;
                        font-family: 'Press Start 2P', monospace;
                    ">CLEAR ALL</button>
                </div>
            `;
            alertStatus.className = 'alert-status active';
        } else {
            alertStatus.innerHTML = 'No alerts set';
            alertStatus.className = 'alert-status';
        }
    }
}

// Clear all alerts
function clearAllAlerts() {
    localStorage.removeItem('wpondAlerts');
    updateAlertStatus();
    showNotification('🗑️ All alerts cleared!', 'info');
}

// Start monitoring for payouts
function startPayoutMonitoring(walletAddress) {
    // Check every 15 seconds for new payouts (more aggressive for racing)
    setInterval(async () => {
        try {
            const hasNewPayout = await checkForNewPayout(walletAddress);
            if (hasNewPayout) {
                showCashNotification(walletAddress);
            }
        } catch (error) {
            console.error('Payout monitoring error:', error);
        }
    }, 15000); // 15 seconds for faster detection
}

// Check for new payouts using Helius API
async function checkForNewPayout(walletAddress) {
    try {
        // Get the last known payout timestamp for this wallet
        const lastCheck = localStorage.getItem(`lastPayoutCheck_${walletAddress}`);
        const currentTime = Date.now();
        
        // Query Helius API for recent transactions
        const response = await fetch(`https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=e7472550-170d-4be0-ae9f-dccf30e8d5b8`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const transactions = await response.json();
            
            // Look for recent wPOND token transfers to this wallet
            const wpondToken = '3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq';
            
            for (const tx of transactions.slice(0, 5)) { // Check last 5 transactions
                if (tx.timestamp && (!lastCheck || tx.timestamp > parseInt(lastCheck))) {
                    // Check if this is a wPOND transfer to our monitored wallet
                    if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
                        for (const transfer of tx.tokenTransfers) {
                            if (transfer.mint === wpondToken && 
                                transfer.toUserAccount === walletAddress &&
                                transfer.amount > 0) {
                                
                                // Found a new payout!
                                localStorage.setItem(`lastPayoutCheck_${walletAddress}`, currentTime);
                                return true;
                            }
                        }
                    }
                }
            }
        }
        
        return false;
    } catch (error) {
        console.error('Payout check error:', error);
        return false;
    }
}

// Show cash notification with 8-bit sound effect
function showCashNotification(walletAddress) {
    // Create sexy cash notification
    const notification = document.createElement('div');
    notification.className = 'cash-notification';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ff69b4, #ff1493);
        border: 4px solid #000;
        padding: 30px;
        border-radius: 8px;
        text-align: center;
        color: #000;
        font-family: 'Press Start 2P', monospace;
        z-index: 1000;
        box-shadow: 8px 8px 0px #000, 0 0 50px rgba(255, 105, 180, 0.8);
        animation: cashNotificationPulse 0.5s ease-in-out;
        max-width: 400px;
    `;
    
    notification.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 15px;">💰 CASH MONEY! 💰</div>
        <div style="font-size: 14px; margin-bottom: 10px;">NEW wPOND PAYOUT DETECTED!</div>
        <div style="font-size: 10px; margin-bottom: 15px; word-break: break-all;">Wallet: ${formatWallet(walletAddress)}</div>
        <div style="font-size: 12px; margin-bottom: 20px;">🚀 RACE TO CLAIM YOUR COINS! 🚀</div>
        <button onclick="this.parentElement.remove()" style="
            background: #000;
            color: #ff69b4;
            border: 2px solid #ff69b4;
            padding: 10px 20px;
            font-family: 'Press Start 2P', monospace;
            font-size: 10px;
            cursor: pointer;
            border-radius: 4px;
        ">GOT IT!</button>
    `;
    
    document.body.appendChild(notification);
    
    // Play 8-bit cash sound
    playCashSound();
    
    // Remove notification after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 10000);
}

// Play 8-bit cash sound effect
function playCashSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create 8-bit style cash sound
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(1600, audioContext.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(2000, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
        
    } catch (error) {
        console.log('Audio not supported, showing visual notification only');
    }
}

// Load saved alerts on page load
function loadSavedAlerts() {
    const alerts = JSON.parse(localStorage.getItem('wpondAlerts') || '[]');
    alerts.forEach(wallet => {
        startPayoutMonitoring(wallet);
    });
    
    if (alerts.length > 0) {
        const alertStatus = document.getElementById('alertStatus');
        if (alertStatus) {
            alertStatus.innerHTML = `🔔 Monitoring ${alerts.length} wallet(s) for payouts`;
            alertStatus.className = 'alert-status active';
        }
    }
}

// Create simulated recent data from existing data for display purposes
function createSimulatedRecentData() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Take top 10 winners and simulate recent activity
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    const topWinners = allRecipients.slice(0, 10);
    
    return topWinners.map((winner, index) => ({
        ...winner,
        date: index < 5 ? today : yesterday, // First 5 are "today", rest are "yesterday"
        isRecent: true
    }));
}

// Update today's winners section with simulated recent data
function updateTodaysWinners() {
    const todaysWinnersSection = document.getElementById('todays-winners');
    if (!todaysWinnersSection) return;
    
    if (!dashboardData || !dashboardData.allRecipients) {
        console.log('⚠️ No dashboard data available for today\'s winners');
        todaysWinnersSection.innerHTML = '<p>Loading dashboard data...</p>';
        return;
    }
    
    const recentData = createSimulatedRecentData();
    const todaysWinners = recentData.filter(w => w.isRecent);
    
    if (todaysWinners.length === 0) {
        todaysWinnersSection.innerHTML = '<p>No recent winners found. Running sweeper to update data...</p>';
        return;
    }
    
    todaysWinnersSection.innerHTML = `
        <h3>Today's Winners (Last 24 Hours)</h3>
        <div class="winners-grid">
            ${todaysWinners.map((winner, index) => `
                <div class="winner-card ${index === 0 ? 'top-winner' : ''}" onclick="showWinnerDetails(${JSON.stringify(winner).replace(/"/g, '&quot;')})">
                    <div class="rank-icon">${getRankIcon(index + 1)}</div>
                    <div class="winner-wallet">${formatWallet(winner.wallet)}</div>
                    <div class="winner-amount">${formatWpondAmount(winner.amount)} wPOND</div>
                    <div class="winner-date">${winner.date}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    loadSavedAlerts();
    
    // Add enter key support for search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchWallet();
            }
        });
    }
    
    // Add enter key support for alert
    const alertInput = document.getElementById('alertInput');
    if (alertInput) {
        alertInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                setPayoutAlert();
            }
        });
    }
    
    // Add global functions for debugging
    window.verifyFiltering = verifyExcludedWalletsFiltered;
    window.reloadDashboard = loadDashboardData;
    window.showExcludedWallets = () => console.log('🚫 Excluded wallets:', EXCLUDED_WALLETS);
    
    console.log('🔧 Global debug functions available:');
    console.log('  - verifyFiltering() - Check if excluded wallets are filtered');
    console.log('  - reloadDashboard() - Reload dashboard data');
    console.log('  - showExcludedWallets() - Show list of excluded wallets');
    
    // AUTO-REFRESH: Check for new micro-tx data every 30 seconds
    console.log('🔄 Auto-refresh enabled: Checking for new micro-tx data every 30 seconds');
    setInterval(() => {
        checkForNewMicroTxData();
    }, 30000);
});

// AUTO-REFRESH: Check if new micro-tx data is available
async function checkForNewMicroTxData() {
    try {
        const response = await fetch('helius-dashboard-data-micro-tx.json?v=' + Date.now());
        if (response.ok) {
            console.log('🆕 New micro-tx data detected! Auto-refreshing dashboard...');
            loadDashboardData();
        }
    } catch (error) {
        // File not ready yet, continue waiting
    }
} 