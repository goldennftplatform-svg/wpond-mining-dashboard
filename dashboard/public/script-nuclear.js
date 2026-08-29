// Dashboard functionality
console.log('🚨 EMERGENCY CACHE-BUST VERSION LOADED! Timestamp:', new Date().toISOString());
console.log('🔧 This should be the NEW version with banned wallets excluded!');

// NUCLEAR OPTION: Add visual indicator to prove script is loaded
document.addEventListener('DOMContentLoaded', function() {
    const debugStatus = document.getElementById('debugStatus');
    if (debugStatus) {
        debugStatus.innerHTML = `
            <div style="background: #1a2a3a; color: #9fd3ff; padding: 10px; border-radius: 5px; text-align: center;">
                Highlighting real claims: 100M-888M wPOND (big: ~1.1B-2B)<br>
                <span style="opacity:0.8;font-size:12px;">${new Date().toISOString()}</span>
            </div>
        `;
    }
});

let dashboardData = null;

// Exclude ONLY the truly suspicious trillion-dollar house wallets
const EXCLUDED_WALLETS = [
    "2Ag1QgyyJj2nS6nD6SLbpAUFaWPhaDrmHwrGwWpMqV9K",
    "HwyJtiPXQ5ZosJQRpUmcmV6E2J9ffKfhqjNcY1R8Gt29",
    "7VocnjpSyCAvhk3zNVu5DqeGAvxbi8MMxEUvLznDFnok",
    "Hjzfr1BzWizuasoYJLa5Z7b1GFG9xWJcMSLpqfvctK82",
    "AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT",
    "1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL",
    "HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2",
    "5KXZCyUaqHJ1T2wbcMXvLt9jYR87tDJS2Bf71gxYSZNt",
    "9z9H5dA6AejJ1LpXbyENhXog3jfpjVFdDEFbuymHjFSL",
    "Fk6PvoxW9LcjSg9ix7EJAnrAViHmqoKonX15WDau2NYv",
    "G5YGpBWvwFo2Ah1HXmCrmMMMPrnmvsaNs7TwW3win4Qw",
    "CYaXLzjVneHu2tXNN5KtyiithTeiyEZFdniu8nk4wNGi",
    "HvYahPhM2ANz4cWKDmN8NCDP4aFbdrsRdrPNJEk8KQpQ"
];

// Only count payouts FROM real mining payers (not Jupiter / DEX / random routers)
const MINING_PAYERS = new Set([
    "AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT", // OPT
    "1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL", // sister
    "HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2", // relay
]);
const WPOND_MINT = "3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq";
const HELIUS_KEY = "e7472550-170d-4be0-ae9f-dccf30e8d5b8";
const SEARCH_LOOKBACK_DAYS = 730;

// Real claim bands (tokens): normal 100M-888M, big ~1.1B-2B
const CLAIM_NORMAL_MIN = 100e6;
const CLAIM_NORMAL_MAX = 888e6;
const CLAIM_BIG_MIN = 1.1e9;
const CLAIM_BIG_MAX = 2.2e9;

function isHouseWallet(wallet) {
    return EXCLUDED_WALLETS.includes(wallet);
}

function isMiningPayer(from) {
    // Legacy rows without `from` came from OPT/sister/relay crawls — keep them.
    if (!from) return true;
    return MINING_PAYERS.has(from);
}

function classifyClaimAmount(amount) {
    const a = Number(amount) || 0;
    if (a >= CLAIM_NORMAL_MIN && a <= CLAIM_NORMAL_MAX) return 'normal';
    if (a >= CLAIM_BIG_MIN && a <= CLAIM_BIG_MAX) return 'big';
    return 'other';
}

function isHighlightClaim(amount) {
    const k = classifyClaimAmount(amount);
    return k === 'normal' || k === 'big';
}

function rowKind(row) {
    if (!row) return 'other';
    if ((row.bigClaims || 0) > 0) return 'big';
    const best = Number(row.maxClaim || row.amount) || 0;
    return classifyClaimAmount(best);
}

let showBotTraffic = localStorage.getItem('gt_show_bots') === '1';
let botHiddenStats = { count: 0, wpond: 0 };

function filterMinerClaims(claims) {
    if (!Array.isArray(claims)) return [];
    const kept = [];
    let hiddenCount = 0;
    let hiddenWpond = 0;
    for (const c of claims) {
        if (!c || !c.wallet || isHouseWallet(c.wallet) || !isHighlightClaim(c.amount) || !isMiningPayer(c.from)) continue;
        if (!showBotTraffic && c.botSuspected) {
            hiddenCount += 1;
            hiddenWpond += Number(c.amount) || 0;
            continue;
        }
        kept.push(c);
    }
    if (!showBotTraffic) {
        botHiddenStats.count = hiddenCount;
        botHiddenStats.wpond = hiddenWpond;
    } else {
        botHiddenStats.count = 0;
        botHiddenStats.wpond = 0;
    }
    return kept;
}

(function injectBotToggle() {
    const boot = () => {
        if (document.getElementById('botToggleBtn')) return;
        const btn = document.createElement('button');
        btn.id = 'botToggleBtn';
        btn.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:9999;padding:8px 12px;border-radius:10px;border:1px solid #444;background:#161616;color:#eee;font:600 12px system-ui;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)';
        const label = () => showBotTraffic ? '🤖 Bot traffic shown — click to hide' : '👤 Humans only — click to show bot traffic';
        btn.textContent = label();
        btn.onclick = () => {
            showBotTraffic = !showBotTraffic;
            localStorage.setItem('gt_show_bots', showBotTraffic ? '1' : '0');
            location.reload();
        };
        document.body.appendChild(btn);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else setTimeout(boot, 300);
})();

function filterExcludedWallets(recipients) {
    if (!recipients || !Array.isArray(recipients)) return [];
    return recipients.filter((recipient) => {
        if (!recipient || !recipient.wallet) return false;
        if (isHouseWallet(recipient.wallet)) return false;
        // Leaderboard rows may be aggregates — keep if total or avg looks like real claims
        const a = Number(recipient.amount) || 0;
        if (isHighlightClaim(a)) return true;
        const claims = Math.max(Number(recipient.claimCount) || 1, 1);
        const avg = a / claims;
        if (isHighlightClaim(avg)) return true;
        // Drop dust / admin junk outside bands; also drop absurd house-scale
        if (a > 100e9) return false;
        return false;
    });
}

// VERIFICATION FUNCTION: Check if any excluded wallets are still visible

function aggregateMinerClaims(claims, sortByTotal = false) {
    if (claims.length) {
        const by = new Map();
        for (const c of claims) {
            if (!c?.wallet || c.wallet.length < 32) continue;
            if (!by.has(c.wallet)) {
                by.set(c.wallet, {
                    wallet: c.wallet,
                    amount: 0,
                    claimCount: 0,
                    maxClaim: 0,
                    bigClaims: 0,
                    normalClaims: 0,
                    date: c.date,
                    timestamp: c.timestamp || 0,
                    signature: c.signature,
                    kind: 'normal'
                });
            }
            const row = by.get(c.wallet);
            row.amount += c.amount;
            row.claimCount += 1;
            row.maxClaim = Math.max(row.maxClaim, c.amount);
            const k = c.kind || classifyClaimAmount(c.amount);
            if (k === 'big') row.bigClaims += 1;
            else row.normalClaims += 1;
            if ((c.timestamp || 0) >= (row.timestamp || 0)) {
                row.date = c.date;
                row.timestamp = c.timestamp || 0;
                row.signature = c.signature;
            }
            row.kind = rowKind(row);
        }
        return [...by.values()].sort((a, b) => sortByTotal
            ? b.amount - a.amount || b.maxClaim - a.maxClaim
            : b.maxClaim - a.maxClaim || b.amount - a.amount);
    }
    return [];
}

function getLiveMinerLeaderboard() {
    const claims = Array.isArray(dashboardData?.recentClaims)
        ? filterMinerClaims(dashboardData.recentClaims)
        : [];
    const live = aggregateMinerClaims(claims);
    if (live.length) return live;
    if (Array.isArray(dashboardData?.topMiners) && dashboardData.topMiners.length) {
        return dashboardData.topMiners.slice().map((r) => ({ ...r, kind: rowKind(r) }));
    }
    return filterExcludedWallets(dashboardData?.allRecipients || [])
        .filter((r) => r && r.wallet && r.wallet.length >= 32)
        .map((r) => ({ ...r, kind: rowKind(r) }))
        .sort((a, b) => (b.maxClaim || b.amount) - (a.maxClaim || a.amount));
}

function getHistoricalMinerLeaderboard() {
    const claims = Array.isArray(dashboardData?.archiveClaims)
        ? filterMinerClaims(dashboardData.archiveClaims)
        : [];
    const historical = aggregateMinerClaims(claims, true);
    if (historical.length) return historical;
    return filterExcludedWallets(dashboardData?.allRecipients || [])
        .filter((r) => r && r.wallet && r.wallet.length >= 32)
        .map((r) => ({ ...r, kind: rowKind(r) }))
        .sort((a, b) => b.amount - a.amount);
}

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
            debugStatus.style.background = '#06140c';
        }
        
        // Try to load the data file with multiple fallbacks - PRIORITIZE LIVE CLAIMS
        let dataUrl = 'working-mining-data.json';
        let response = null;
        
        // PRIORITY ORDER: live refreshed file first (no giant LFS blobs)
        const dataSources = [
            'working-mining-data.json',              // LIVE: refreshed claim drips
            'recent-claims-live.json',               // LIVE: recentClaims-only feed
            'mining-claims-data.json'                // FALLBACK: tiny sample
        ];
        
        for (const source of dataSources) {
            try {
                const testUrl = source + '?v=' + Date.now() + '&t=' + Math.random() + '&emergency=' + new Date().getTime();
                console.log('📡 Attempting to fetch:', testUrl);
                
                response = await fetch(testUrl);
                console.log('📡 Response status:', response.status, response.statusText);
                
                if (response.ok) {
                    dataUrl = source;
                    console.log('✅ Successfully loaded from:', source);
                    break;
                } else {
                    console.log('⚠️ Failed to load from:', source, 'Status:', response.status);
                }
            } catch (error) {
                console.log('⚠️ Failed to load from:', source, 'Error:', error.message);
                continue;
            }
        }
        
        if (!response || !response.ok) {
            throw new Error(`Failed to load data from any source. Last status: ${response?.status}`);
        }
        
        const data = await response.json();
        // Merge full band archive when present (powers 30/90/180/365/all paid-out)
        try {
            const archRes = await fetch('band-claims-archive.json?v=' + Date.now(), { cache: 'no-store' });
            if (archRes.ok) {
                const arch = await archRes.json();
                if (Array.isArray(arch.claims) && arch.claims.length) {
                    const byKey = new Map();
                    for (const c of [...(data.recentClaims || []), ...arch.claims]) {
                        if (!c?.signature || !c?.wallet) continue;
                        byKey.set(`${c.signature}:${c.wallet}`, c);
                    }
                    const merged = [...byKey.values()].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    const historicalClaims = filterMinerClaims(merged);
                    const historicalLeaderboard = aggregateMinerClaims(historicalClaims, true);
                    const biggest = historicalClaims.reduce((best, claim) =>
                        !best || claim.amount > best.amount ? claim : best, null);
                    const totalWpond = historicalClaims.reduce((sum, claim) => sum + (Number(claim.amount) || 0), 0);
                    data.archiveClaims = merged;
                    data.periods = computePeriodsFromClaims(historicalClaims);
                    data.allRecipients = historicalLeaderboard;
                    data.summary = {
                        ...(data.summary || {}),
                        totalClaims: historicalClaims.length,
                        totalWpond,
                        totalRecipients: historicalLeaderboard.length,
                        biggestAmount: biggest?.amount || 0,
                        biggestWinner: biggest?.wallet || '',
                        averageAmount: historicalClaims.length ? totalWpond / historicalClaims.length : 0,
                        archiveStartDate: historicalClaims[historicalClaims.length - 1]?.date || null,
                        archiveEndDate: historicalClaims[0]?.date || null,
                        periods: data.periods,
                    };
                    // Keep recentClaims for live boards; historical views use archiveClaims.
                    console.log('✅ Band archive merged:', merged.length, 'claims');
                }
            }
        } catch (e) {
            console.log('archive merge skipped', e.message);
        }
        console.log('✅ Data loaded successfully from:', dataUrl);
        console.log('✅ Data keys:', Object.keys(data));
        console.log('✅ Data summary:', data.summary);
        console.log('✅ Data structure check:', {
            hasSummary: !!data.summary,
            hasAllRecipients: !!data.allRecipients,
            allRecipientsLength: data.allRecipients?.length || 0,
            sampleData: data.allRecipients?.[0] || 'none'
        });
        
        if (debugStatus) {
            if (dataUrl === 'helius-dashboard-data-final.json') {
                debugStatus.innerHTML = `
                    <div style="background: #00ff00; color: black; padding: 15px; border-radius: 5px; font-weight: bold; text-align: center; border: 5px solid #ff0000;">
                        🎉 FINAL COMPLETE DATA LOADED! 🎉<br>
                        All 96,332 signatures processed!<br>
                        13,733 total claims, 3,725 recipients<br>
                        Excluded wallets filtered out<br>
                        Timestamp: ${new Date().toISOString()}
                    </div>
                `;
            } else if (dataUrl === 'helius-dashboard-data-micro-tx.json') {
                debugStatus.innerHTML = `
                    <div style="background: #00ff00; color: black; padding: 15px; border-radius: 5px; font-weight: bold; text-align: center; border: 5px solid #ff0000;">
                        🎉 INDIVIDUAL CLAIMS DATA LOADED! 🎉<br>
                        Realistic mining amounts (0.23B - 1.99B per claim)!<br>
                        467,618 individual claims, 5,536 unique wallets<br>
                        No more cooked trillion-dollar amounts!<br>
                        Real micro-transaction granularity<br>
                        Timestamp: ${new Date().toISOString()}
                    </div>
                `;
            } else if (dataUrl === 'mining-claims-data.json') {
                debugStatus.innerHTML = `
                    <div style="background: #00ff00; color: black; padding: 15px; border-radius: 5px; font-weight: bold; text-align: center; border: 5px solid #ff0000;">
                        🎉 REAL MINING CLAIMS DATA LOADED! 🎉<br>
                        Realistic mining amounts (120M-4.5B wPOND)!<br>
                        467,618 total claims, 5,536 unique wallets<br>
                        Biggest claim: 1,988,000,000 (1.99B) wPOND<br>
                        Real data from actual mining claims!<br>
                        Timestamp: ${new Date().toISOString()}
                    </div>
                `;
            } else if (dataUrl === 'working-mining-data.json') {
                debugStatus.innerHTML = `
                    <div style="background: #00ff00; color: black; padding: 15px; border-radius: 5px; font-weight: bold; text-align: center; border: 5px solid #ff0000;">
                        🎉 WORKING MINING DATA LOADED! 🎉<br>
                        Realistic mining amounts (120M-4.5B wPOND)!<br>
                        462,618 total claims, 5,536 unique wallets<br>
                        Biggest claim: 1,090,097,000,000 (1.09T) wPOND<br>
                        Real data from actual mining claims!<br>
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
            hasRecipients: !!data.recipients,
            allRecipientsLength: data.allRecipients?.length || 0,
            recipientsLength: data.recipients?.length || 0,
            sampleRecipient: data.allRecipients?.[0] || data.recipients?.[0] || 'none'
        });
        
        // Normalize data structure for compatibility
        if (data.recipients && !data.allRecipients) {
            console.log('🔄 Normalizing data structure: converting recipients to allRecipients');
            data.allRecipients = data.recipients.map(recipient => ({
                wallet: recipient.wallet,
                amount: recipient.wpondAmount || recipient.amount,
                date: recipient.date || 'Unknown',
                signature: recipient.signature || 'N/A',
                claimCount: recipient.claimCount || 1
            }));
        }
        
        // DEBUG: Log the final data structure
        console.log('🔍 Final data structure:', {
            hasAllRecipients: !!data.allRecipients,
            allRecipientsLength: data.allRecipients?.length || 0,
            sampleRecipient: data.allRecipients?.[0] || 'none',
            sampleAmount: data.allRecipients?.[0]?.amount || 'none'
        });
        
        // Update the dashboard immediately
        console.log('🔄 Updating dashboard...');
        if (debugStatus) {
            debugStatus.textContent = '🔄 Updating dashboard...';
            debugStatus.style.background = '#06140c';
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

        // Live claim facet (ON when band claims are fresh)
        updateClaimFacet(data);
        // Paid-out windows (30/90/180/365/all)
        updatePeriodDesk(data);
        
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
            background: radial-gradient(circle, #34d399 0%, #6ee7b7 70%);
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
            font-family: 'IBM Plex Mono', monospace;
        `;

        // Add hover effects with 8-bit theme
        bubble.addEventListener('mouseenter', () => {
            bubble.style.transform = 'scale(1.05) translateY(-2px)';
            bubble.style.boxShadow = '6px 6px 0px #000, 12px 12px 0px rgba(255, 105, 180, 0.5)';
            bubble.style.zIndex = '10';
            bubble.style.background = 'linear-gradient(135deg, #6ee7b7, #34d399)';
        });

        bubble.addEventListener('mouseleave', () => {
            bubble.style.transform = 'scale(1) translateY(0px)';
            bubble.style.boxShadow = '4px 4px 0px #000, 8px 8px 0px rgba(255, 105, 180, 0.3)';
            bubble.style.zIndex = '1';
            bubble.style.background = 'linear-gradient(135deg, #34d399, #6ee7b7)';
        });

        // Add click event for blockchain check
        bubble.addEventListener('click', () => {
            console.log('🔍 BUBBLE CLICK DEBUG (createBubbleChart):');
            console.log('   - Winner object:', winner);
            console.log('   - Winner wallet:', winner.wallet);
            console.log('   - Winner amount:', winner.amount);
            console.log('   - Winner date:', winner.date);
            console.log('   - About to call checkWalletOnBlockchain with:', winner.wallet);
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
        const baseGreen = '#34d399';
        const darkerGreen = '#6ee7b7';
        
        // Adjust colors based on position
        const adjustedBasePink = adjustColorBrightness(baseGreen, -colorVariation * 100);
        const adjustedDarkerPink = adjustColorBrightness(darkerGreen, -colorVariation * 100);

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
            font-family: 'IBM Plex Mono', monospace;
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
            console.log('🔍 BUBBLE CLICK DEBUG (createTopWinnersBubbleBoard):');
            console.log('   - Winner object:', winner);
            console.log('   - Winner wallet:', winner.wallet);
            console.log('   - Winner amount:', winner.amount);
            console.log('   - Winner date:', winner.date);
            console.log('   - About to call checkWalletOnBlockchain with:', winner.wallet);
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
// TRIGGER UPDATE: 2025-08-13 19:15 UTC - JavaScript errors fixed
function createRecentWinnersBubbleBoard() {
    // Declare bubbleBoard at function scope so it's available in catch block
    let bubbleBoard = null;
    
    try {
        console.log('🔍 createRecentWinnersBubbleBoard() called');
        
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        
        bubbleBoard = document.getElementById('recentWinnersBubbleBoard');
        console.log('🔍 Bubble board element found:', !!bubbleBoard);
        
        if (!bubbleBoard) {
            console.warn('⚠️ Bubble board element not found - skipping bubble board creation');
            return;
        }
        
        bubbleBoard.innerHTML = '';
        console.log('🔍 Dashboard data available:', !!dashboardData);
        console.log('🔍 All recipients available:', !!dashboardData?.allRecipients);
        console.log('🔍 Recipients count:', dashboardData?.allRecipients?.length || 0);

        if (!dashboardData || !dashboardData.allRecipients) {
            console.warn('⚠️ No dashboard data or recipients available for bubble board');
            bubbleBoard.innerHTML = `
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    color: #34d399;
                    font-family: 'IBM Plex Mono', monospace;
                    font-size: 14px;
                ">
                    <div style="margin-bottom: 10px;">⚠️</div>
                    <div>NO DATA AVAILABLE</div>
                    <div style="font-size: 10px; margin-top: 10px; opacity: 0.8;">CHECK CONSOLE FOR ERRORS</div>
                </div>
            `;
            return;
        }

    // Prefer live per-claim feed (recentClaims). Fall back to recipient dates.
    const liveClaims = Array.isArray(dashboardData.recentClaims)
        ? filterMinerClaims(dashboardData.recentClaims)
        : [];
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    
    const sortedByDate = (liveClaims.length ? liveClaims : allRecipients).slice().sort((a, b) => {
        const ta = a.timestamp || Date.parse(a.date) || 0;
        const tb = b.timestamp || Date.parse(b.date) || 0;
        return tb - ta; // Newest first
    });
    
    const claimsToShow = sortedByDate.slice(0, 20); // Show last 20 recent claims/recipients
    console.log('🔍 Claims to show:', claimsToShow.length, liveClaims.length ? '(live recentClaims)' : '(recipient dates)');
    
    // DEBUG: Log the dates we're working with
    console.log('🔍 First 5 dates:', claimsToShow.slice(0, 5).map(c => c.date));
    console.log('🔍 Last 5 dates:', claimsToShow.slice(-5).map(c => c.date));
    console.log('🔍 All unique dates:', [...new Set(claimsToShow.map(c => c.date))]);

    if (claimsToShow.length === 0) {
        console.warn('⚠️ No claims to show');
        bubbleBoard.innerHTML = `
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: #34d399;
                font-family: 'IBM Plex Mono', monospace;
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
        
        // Calculate bubble size based on wPOND amount (smaller, max 80px)
        const size = Math.max(48, Math.min(96, 48 + ((Math.min(claim.amount, 2e9) - CLAIM_NORMAL_MIN) / (2e9 - CLAIM_NORMAL_MIN)) * 48));
        
        // Position in a grid-like pattern with NO overlap - smaller bubbles need more space
        const row = Math.floor(index / 5); // 5 columns instead of 4
        const col = index % 5;
        const left = 5 + (col * 18); // 5 columns with 18% spacing each
        const top = 5 + (row * 20); // Rows with 20% spacing each
        
        // Random animation delay
        const delay = Math.random() * 2;

        // Create color variation based on position (top to bottom) with blue hue
        const colorVariation = Math.min(0.3, (top / 100) * 0.3); // 0 to 0.3 variation
        const baseGreen = '#34d399';
        const darkerGreen = '#6ee7b7';
        const blueHue = '#4a90e2'; // Add blue hue
        
        // Adjust colors based on position with blue tint
        const adjustedBasePink = adjustColorBrightness(baseGreen, -colorVariation * 100);
        const adjustedDarkerPink = adjustColorBrightness(darkerGreen, -colorVariation * 100);
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
            font-family: 'IBM Plex Mono', monospace;
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
    
    console.log('✅ Bubble board created successfully with', claimsToShow.length, 'bubbles');
    
    } catch (error) {
        console.error('❌ Error in createRecentWinnersBubbleBoard:', error);
        
        // Show error message in bubble board if possible
        if (bubbleBoard) {
            bubbleBoard.innerHTML = `
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    color: #fb7185;
                    font-family: 'IBM Plex Mono', monospace;
                    font-size: 14px;
                ">
                    <div style="margin-bottom: 10px;">❌</div>
                    <div>BUBBLE BOARD ERROR</div>
                    <div style="font-size: 10px; margin-top: 10px; opacity: 0.8;">CHECK CONSOLE FOR DETAILS</div>
                </div>
            `;
        }
        
        // Don't throw - just log the error and continue
    }
}

// Function to check wallet on blockchain
function checkWalletOnBlockchain(walletAddress) {
    console.log('🔍 checkWalletOnBlockchain DEBUG:');
    console.log('   - Received walletAddress:', walletAddress);
    console.log('   - Type of walletAddress:', typeof walletAddress);
    console.log('   - Length of walletAddress:', walletAddress?.length);
    
    // Open Solana Explorer in new tab
    const solanaExplorerUrl = `https://solscan.io/account/${walletAddress}`;
    console.log('   - About to open URL:', solanaExplorerUrl);
    
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
        background: linear-gradient(135deg, #34d399, #6ee7b7);
        border: 3px solid #000;
        color: #000;
        padding: 15px 20px;
        border-radius: 0;
        font-family: 'IBM Plex Mono', monospace;
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

    const board = getLiveMinerLeaderboard();
    const topWinners = board.slice(0, 10);
    const podiumEl = document.getElementById('topPodium');
    const podium = topWinners.slice(0, 3);

    if (podiumEl) {
        podiumEl.innerHTML = podium.map((winner, index) => {
            const rank = index + 1;
            const showAmt = winner.maxClaim || winner.amount;
            const kind = rowKind(winner);
            const safe = JSON.stringify(winner).replace(/"/g, '&quot;');
            return `
            <div class="podium-card rank-${rank}" onclick="showWinnerDetails(${safe})">
                <div class="podium-rank">#${rank}</div>
                <div class="podium-wallet">${formatWallet(winner.wallet)}</div>
                <div class="podium-amount">${formatWpondAmount(showAmt)}</div>
                <div class="podium-meta">best hit · ${winner.claimCount || 1} claim${(winner.claimCount||1)>1?'s':''}</div>
                <span class="kind-pill ${kind}">${kind === 'big' ? 'BIG HIT' : 'MINER'}</span>
            </div>`;
        }).join('');
    }

    winnersGrid.innerHTML = topWinners.slice(3).map((winner, index) => {
        const rank = index + 4;
        const showAmt = winner.maxClaim || winner.amount;
        const kind = rowKind(winner);
        const safe = JSON.stringify(winner).replace(/"/g, '&quot;');
        return `
        <div class="winner-card live-miner ${rank === 4 ? 'top-winner' : ''}" style="animation-delay:${index * 0.05}s" onclick="showWinnerDetails(${safe})">
            <div class="rank-icon">${getRankIcon(rank)}</div>
            <div class="winner-wallet">${formatWallet(winner.wallet)}</div>
            <div class="winner-amount">${formatWpondAmount(showAmt)} wPOND</div>
            <div class="winner-claims">${winner.claimCount || 1} band claim${(winner.claimCount||1)>1?'s':''} · total ${formatWpondAmount(winner.amount)}</div>
            <div class="winner-date">${winner.date}</div>
            <span class="kind-pill ${kind}">${kind === 'big' ? 'BIG HIT' : 'MINER'}</span>
        </div>`;
    }).join('') || '<div class="loading">Podium locked — more miners loading…</div>';

    console.log('✅ Live miner top board:', topWinners.length);
}

// Get rank icon
function getRankIcon(rank) {
    const icons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return icons[rank - 1] || `${rank}`;
}

// Update recent activity - Show last 10 payouts by date
function updateRecentActivity() {
    try {
        console.log('🔄 updateRecentActivity() called');
        
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity) {
            console.warn('⚠️ recentActivity element not found - skipping recent activity update');
            return;
        }
        
        if (!dashboardData || !dashboardData.allRecipients) {
            console.warn('⚠️ No recipients data available for recent activity');
            recentActivity.innerHTML = '<tr><td colspan="3" class="no-results">No recent activity data available</td></tr>';
            return;
        }

        console.log('📊 Processing recent activity with', dashboardData.allRecipients.length, 'recipients');

        const liveClaims = Array.isArray(dashboardData.recentClaims)
            ? filterMinerClaims(dashboardData.recentClaims)
            : [];
        const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
        console.log('✅ Filtered recipients for recent activity:', allRecipients.length, 'liveClaims', liveClaims.length);
        
        if (allRecipients.length === 0 && liveClaims.length === 0) {
            console.warn('⚠️ No recipients after filtering - showing no data message');
            recentActivity.innerHTML = '<tr><td colspan="3" class="no-results">No recent activity data available</td></tr>';
            return;
        }
        
        // Sort by timestamp/date (newest first) and take the last 10 payouts
        const sortedByDate = (liveClaims.length ? liveClaims : allRecipients).slice().sort((a, b) => {
            const ta = a.timestamp || Date.parse(a.date) || 0;
            const tb = b.timestamp || Date.parse(b.date) || 0;
            return tb - ta; // Newest first
        });
        
        const recentRecipients = sortedByDate.slice(0, 10);
        console.log('✅ Recent recipients prepared:', recentRecipients.length);

        recentActivity.innerHTML = recentRecipients.map(recipient => `
            <tr>
                <td class="wallet-cell" onclick="copyToClipboard('${recipient.wallet}')">${formatWallet(recipient.wallet)}</td>
                <td>${formatWpondAmount(recipient.amount)} wPOND</td>
                <td>${recipient.date}${recipient.timestamp ? ' ' + new Date(recipient.timestamp * 1000).toLocaleTimeString() : ''}</td>
            </tr>
        `).join('');
        
        console.log('✅ Recent activity updated successfully');
        
    } catch (error) {
        console.error('❌ Error in updateRecentActivity:', error);
        // Don't throw - just log the error and continue
    }
}

// Update all winners table
function updateAllWinners() {
    const winnersTableBody = document.getElementById('winnersTableBody');
    if (!dashboardData) return;
    const allRecipients = getHistoricalMinerLeaderboard();
    winnersTableBody.innerHTML = allRecipients.map((winner, index) => {
        const showAmt = winner.maxClaim || winner.amount;
        const kind = rowKind(winner);
        return `
        <tr class="live-row" onclick="showWinnerDetails(${JSON.stringify(winner).replace(/"/g, '&quot;')})">
            <td>${index + 1}</td>
            <td class="wallet-cell">${formatWallet(winner.wallet)}</td>
            <td>${formatWpondAmount(showAmt)} <span class="kind-pill ${kind}">${kind === 'big' ? 'BIG' : 'MINER'}</span>${(winner.claimCount || 1) > 1 ? `<div class="amt-sub">total ${formatWpondAmount(winner.amount)}</div>` : ''}</td>
            <td>${winner.claimCount || 1}${(winner.claimCount || 1) > 1 ? ' 🔥' : ''}</td>
            <td>${winner.date || ''}</td>
            <td>${winner.signature ? formatWallet(winner.signature) : ''}</td>
        </tr>`;
    }).join('');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function shortHash(value, head = 6, tail = 6) {
    const s = String(value || '');
    if (s.length <= head + tail + 3) return s;
    return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function detailRow(label, bodyHtml) {
    return `<div class="detail-row"><span class="detail-label">${label}</span><div class="detail-value">${bodyHtml}</div></div>`;
}

function copyChip(full, label) {
    const safe = escapeHtml(full);
    const shown = escapeHtml(shortHash(full, 8, 8));
    return `<button type="button" class="copy-chip" title="${safe}" onclick="copyToClipboard('${safe}')"><code>${shown}</code><span>copy</span></button>`;
}

// Show winner details modal
function showWinnerDetails(winner) {
    const modal = document.getElementById('winnerModal');
    const details = document.getElementById('winnerDetails');
    if (!modal || !details || !winner) return;

    const amount = winner.maxClaim || winner.amount;
    const kind = rowKind(winner);
    const kindLabel = kind === 'big' ? 'BIG HIT' : 'MINER';

    details.innerHTML = `
        <div class="detail-head">
            <p class="detail-kicker">miner record</p>
            <h3>Winner Details</h3>
            <span class="kind-pill ${escapeHtml(kind)}">${kindLabel}</span>
        </div>
        <div class="detail-grid">
            ${detailRow('Wallet', winner.wallet ? copyChip(winner.wallet, 'wallet') : '—')}
            ${detailRow('Best hit', `<strong class="detail-amount">${escapeHtml(formatWpondAmount(amount))}</strong> wPOND`)}
            ${detailRow('Window total', `<strong>${escapeHtml(formatWpondAmount(winner.amount))}</strong> wPOND`)}
            ${detailRow('Claims', `<strong>${escapeHtml(winner.claimCount || 1)}</strong>`)}
            ${detailRow('Date', `<strong>${escapeHtml(winner.date || '—')}</strong>`)}
            ${detailRow('Signature', winner.signature ? copyChip(winner.signature, 'sig') : '—')}
        </div>
    `;

    modal.style.display = 'flex';
}

// Copy wallet/signature to clipboard
function copyToClipboard(text) {
    const value = String(text || '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    navigator.clipboard.writeText(value).then(() => {
        const notification = document.createElement('div');
        notification.className = 'cash-notification';
        notification.textContent = 'Copied';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 1600);
    }).catch(() => {});
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
    
    // Prefer live recentClaims for "today"
    const liveClaims = Array.isArray(dashboardData.recentClaims)
        ? filterMinerClaims(dashboardData.recentClaims)
        : [];
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients);
    const todaysClaims = (liveClaims.length ? liveClaims : allRecipients).filter(
        (recipient) => recipient.date === today
    );
    
    // If no today's claims, show newest live/recipient rows (not top-by-amount)
    const claimsToShow = todaysClaims.length > 0
        ? todaysClaims
        : (liveClaims.length ? liveClaims : allRecipients)
            .slice()
            .sort((a, b) => (b.timestamp || Date.parse(b.date) || 0) - (a.timestamp || Date.parse(a.date) || 0))
            .slice(0, 8);

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
            background: linear-gradient(135deg, #34d399, #6ee7b7);
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
            font-family: 'IBM Plex Mono', monospace;
        `;

        // Add hover effects with 8-bit theme
        bubble.addEventListener('mouseenter', () => {
            bubble.style.transform = 'scale(1.05) translateY(-2px)';
            bubble.style.boxShadow = '4px 4px 0px #000, 8px 8px 0px rgba(255, 105, 180, 0.5)';
            bubble.style.zIndex = '10';
            bubble.style.background = 'linear-gradient(135deg, #6ee7b7, #34d399)';
        });

        bubble.addEventListener('mouseleave', () => {
            bubble.style.transform = 'scale(1) translateY(0px)';
            bubble.style.boxShadow = '3px 3px 0px #000, 6px 6px 0px rgba(255, 105, 180, 0.3)';
            bubble.style.zIndex = '1';
            bubble.style.background = 'linear-gradient(135deg, #34d399, #6ee7b7)';
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
    
    // Prefer live recentClaims for today's stats
    const liveClaims = Array.isArray(dashboardData.recentClaims)
        ? filterMinerClaims(dashboardData.recentClaims)
        : [];
    const todaysClaims = (liveClaims.length ? liveClaims : filteredRecipients).filter(
        (recipient) => recipient.date === today
    );
    
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
            filteredWinners = getHistoricalMinerLeaderboard();
            break;
        case 'top10':
            filteredWinners = getHistoricalMinerLeaderboard().slice(0, 10);
            break;
        case 'top50':
            filteredWinners = getHistoricalMinerLeaderboard().slice(0, 50);
            break;
        case 'top100':
            filteredWinners = getHistoricalMinerLeaderboard().slice(0, 100);
            break;
        case 'topClaimers':
            // Show top claimers (wallets with most claims) - calculate from actual data
            const topClaimersData = getHistoricalMinerLeaderboard();
            const topWalletClaimCounts = {};
            
            // Count claims per wallet
            topClaimersData.forEach(winner => {
                const wallet = winner.wallet;
                if (!topWalletClaimCounts[wallet]) {
                    topWalletClaimCounts[wallet] = {
                        wallet: wallet,
                        totalAmount: 0,
                        claimCount: 0,
                        lastClaimDate: winner.date,
                        lastSignature: winner.signature
                    };
                }
                topWalletClaimCounts[wallet].totalAmount += winner.amount;
                topWalletClaimCounts[wallet].claimCount += (winner.claimCount || 1);
                if (new Date(winner.date) > new Date(topWalletClaimCounts[wallet].lastClaimDate)) {
                    topWalletClaimCounts[wallet].lastClaimDate = winner.date;
                    topWalletClaimCounts[wallet].lastSignature = winner.signature;
                }
            });
            
            // Sort by claim count and take top 50
            filteredWinners = Object.values(topWalletClaimCounts)
                .sort((a, b) => b.claimCount - a.claimCount)
                .slice(0, 50)
                .map(claimer => ({
                    wallet: claimer.wallet,
                    amount: claimer.totalAmount,
                    claimCount: claimer.claimCount,
                    date: claimer.lastClaimDate,
                    signature: claimer.lastSignature
                }));
            
            console.log('🔍 Top Claimers Filter Debug:');
            console.log(`   - Total unique wallets: ${Object.keys(topWalletClaimCounts).length}`);
            console.log(`   - Top 50 claimers shown: ${filteredWinners.length}`);
            console.log(`   - Top claimer:`, filteredWinners[0]);
            break;
        case 'multiClaimers':
            // Show wallets with multiple claims (2 or more) - deduplicate and show total amounts
            const multiClaimersData = getHistoricalMinerLeaderboard();
            const multiWalletTotals = {};
            const multiWalletClaimCounts = {};
            
            multiClaimersData.forEach(winner => {
                const wallet = winner.wallet;
                if (!multiWalletTotals[wallet]) {
                    multiWalletTotals[wallet] = 0;
                    multiWalletClaimCounts[wallet] = winner.claimCount || 1; // Use the actual claim count
                }
                multiWalletTotals[wallet] += winner.amount;
            });
            
            // Filter wallets with 2 or more claims
            filteredWinners = Object.keys(multiWalletTotals)
                .filter(wallet => multiWalletClaimCounts[wallet] >= 2)
                .map(wallet => ({
                    wallet: wallet,
                    amount: multiWalletTotals[wallet],
                    claimCount: multiWalletClaimCounts[wallet],
                    date: multiClaimersData.find(w => w.wallet === wallet)?.date || 'Multiple dates',
                    signature: 'Multiple claims'
                }))
                .sort((a, b) => b.amount - a.amount);
            
            console.log('🔍 Multi-Claimers Filter Debug:');
            console.log(`   - Total unique wallets: ${Object.keys(multiWalletTotals).length}`);
            console.log(`   - Wallets with 2+ claims: ${filteredWinners.length}`);
            console.log(`   - Sample multi-claimer:`, filteredWinners[0]);
            break;
        default:
            filteredWinners = getHistoricalMinerLeaderboard();
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
    
    winnersTableBody.innerHTML = winners.map((winner, index) => {
        const showAmt = winner.maxClaim || winner.amount;
        const kind = rowKind(winner);
        return `
        <tr class="live-row" onclick="showWinnerDetails(${JSON.stringify(winner).replace(/"/g, '&quot;')})">
            <td>${index + 1}</td>
            <td class="wallet-cell">${formatWallet(winner.wallet)}</td>
            <td>${formatWpondAmount(showAmt)} <span class="kind-pill ${kind}">${kind === 'big' ? 'BIG' : 'MINER'}</span>${(winner.claimCount || 1) > 1 ? `<div class="amt-sub">total ${formatWpondAmount(winner.amount)}</div>` : ''}</td>
            <td>${winner.claimCount || 1}${(winner.claimCount || 1) > 1 ? ' 🔥' : ''}</td>
            <td>${winner.date || ''}</td>
            <td>${winner.signature ? formatWallet(winner.signature) : ''}</td>
        </tr>`;
    }).join('');
}

// Reset all filters
function resetFilters() {
    document.querySelectorAll('.filter-controls button').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-controls button').classList.add('active');
    filterWinners('all');
}

// Aggregate claim rows for one wallet
function aggregateWalletClaims(wallet, claims) {
    const mine = (claims || []).filter(
        (c) => c && c.wallet && c.wallet.toLowerCase() === wallet.toLowerCase()
    );
    if (!mine.length) return null;
    const row = {
        wallet,
        amount: 0,
        claimCount: 0,
        maxClaim: 0,
        bigClaims: 0,
        normalClaims: 0,
        date: mine[0].date,
        timestamp: mine[0].timestamp || 0,
        signature: mine[0].signature,
        kind: 'normal',
        claims: mine.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    };
    for (const c of mine) {
        row.amount += Number(c.amount) || 0;
        row.claimCount += 1;
        row.maxClaim = Math.max(row.maxClaim, Number(c.amount) || 0);
        const k = c.kind || classifyClaimAmount(c.amount);
        if (k === 'big') row.bigClaims += 1;
        else row.normalClaims += 1;
        if ((c.timestamp || 0) >= (row.timestamp || 0)) {
            row.date = c.date;
            row.timestamp = c.timestamp || 0;
            row.signature = c.signature;
        }
    }
    row.kind = rowKind(row);
    return row;
}

function findWalletLocally(walletAddress) {
    const w = walletAddress.trim();
    if (!w) return null;

    const pools = [
        filterMinerClaims(dashboardData?.archiveClaims || []),
        filterMinerClaims(dashboardData?.recentClaims || []),
    ];
    for (const pool of pools) {
        const row = aggregateWalletClaims(w, pool);
        if (row) return row;
    }

    const recipients = [
        ...(dashboardData?.allRecipients || []),
        ...(dashboardData?.topMiners || []),
        ...getLiveMinerLeaderboard(),
    ];
    const hit = recipients.find((r) => r?.wallet && r.wallet.toLowerCase() === w.toLowerCase());
    return hit ? { ...hit, kind: rowKind(hit) } : null;
}

async function fetchWalletMiningHistory(walletAddress) {
    const cutoff = Math.floor(Date.now() / 1000) - SEARCH_LOOKBACK_DAYS * 86400;
    const found = [];
    let before = null;
    for (let page = 0; page < 25; page++) {
        let url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_KEY}&limit=100`;
        if (before) url += `&before=${before}`;
        const response = await fetch(url);
        if (!response.ok) break;
        const txs = await response.json();
        if (!Array.isArray(txs) || !txs.length) break;
        let reachedCutoff = false;
        for (const tx of txs) {
            const ts = tx.timestamp || 0;
            if (ts && ts < cutoff) {
                reachedCutoff = true;
                continue;
            }
            for (const t of tx.tokenTransfers || []) {
                if (t.mint !== WPOND_MINT) continue;
                if (t.toUserAccount !== walletAddress) continue;
                if (!isMiningPayer(t.fromUserAccount)) continue;
                const amt = Number(t.tokenAmount) || 0;
                if (!isHighlightClaim(amt)) continue;
                found.push({
                    wallet: walletAddress,
                    amount: amt,
                    claimCount: 1,
                    date: new Date(ts * 1000).toISOString().split('T')[0],
                    timestamp: ts,
                    signature: tx.signature,
                    from: t.fromUserAccount || null,
                    kind: classifyClaimAmount(amt)
                });
            }
        }
        before = txs[txs.length - 1]?.signature;
        if (reachedCutoff || txs.length < 100) break;
    }
    return aggregateWalletClaims(walletAddress, found);
}

// Wallet search — local archive first, then live 2y chain lookup
async function searchWallet() {
    const searchInput = document.getElementById('searchInput');
    const raw = (searchInput?.value || '').trim();
    if (!raw) {
        alert('Please enter a wallet address to search');
        return;
    }
    if (!isValidSolanaAddress(raw)) {
        alert('Invalid Solana wallet address');
        return;
    }

    const btn = searchInput?.parentElement?.querySelector('button');
    const prev = btn?.textContent;
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Searching…';
    }

    try {
        let recipient = findWalletLocally(raw);
        if (!recipient) {
            recipient = await fetchWalletMiningHistory(raw);
        }
        if (recipient) {
            showWinnerDetails(recipient);
        } else {
            alert('No mining payouts (100M-888M / 1.1B-2.2B from OPT/sister/relay) found for this wallet in the last 2 years.');
        }
    } catch (e) {
        console.error('searchWallet', e);
        alert('Search failed — try again in a moment.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = prev || 'Search';
        }
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
        background: linear-gradient(135deg, #34d399, #6ee7b7);
        border: 3px solid #000;
        padding: 30px;
        border-radius: 8px;
        text-align: center;
        color: #000;
        font-family: 'IBM Plex Mono', monospace;
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
            color: #34d399;
            border: 2px solid #34d399;
            padding: 10px 20px;
            font-family: 'IBM Plex Mono', monospace;
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
                        background: #6ee7b7;
                        color: #000;
                        border: 1px solid #000;
                        padding: 4px 8px;
                        font-size: 10px;
                        cursor: pointer;
                        border-radius: 4px;
                        font-family: 'IBM Plex Mono', monospace;
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
        background: linear-gradient(135deg, #34d399, #6ee7b7);
        border: 4px solid #000;
        padding: 30px;
        border-radius: 8px;
        text-align: center;
        color: #000;
        font-family: 'IBM Plex Mono', monospace;
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
            color: #34d399;
            border: 2px solid #34d399;
            padding: 10px 20px;
            font-family: 'IBM Plex Mono', monospace;
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

// Update today's winners section with ACTUAL last 10 claims by date
function updateTodaysWinners() {
    const todaysWinnersSection = document.getElementById('todays-winners');
    if (!todaysWinnersSection) return;
    
    if (!dashboardData || (!dashboardData.allRecipients && !dashboardData.recentClaims)) {
        console.log('⚠️ No dashboard data available for today\'s winners');
        todaysWinnersSection.innerHTML = '<p>Loading dashboard data...</p>';
        return;
    }
    
    // Prefer live recentClaims; never fake dates onto old leaderboard rows
    const liveClaims = Array.isArray(dashboardData.recentClaims)
        ? filterMinerClaims(dashboardData.recentClaims)
        : [];
    const allRecipients = filterExcludedWallets(dashboardData.allRecipients || []);
    const sortedByDate = (liveClaims.length ? liveClaims : allRecipients).slice().sort((a, b) => {
        const ta = a.timestamp || Date.parse(a.date) || 0;
        const tb = b.timestamp || Date.parse(b.date) || 0;
        return tb - ta; // Newest first
    });
    
    const last10Claims = sortedByDate.slice(0, 10);
    
    if (last10Claims.length === 0) {
        todaysWinnersSection.innerHTML = '<p>No recent claims found.</p>';
        return;
    }
    
    todaysWinnersSection.innerHTML = `
        <h3>Last 10 Claims Made</h3>
        <div class="winners-grid">
            ${last10Claims.map((claim, index) => `
                <div class="winner-card ${index === 0 ? 'top-winner' : ''}" onclick="showWinnerDetails(${JSON.stringify(claim).replace(/"/g, '&quot;')})">
                    <div class="rank-icon">${getRankIcon(index + 1)}</div>
                    <div class="winner-wallet">${formatWallet(claim.wallet)}</div>
                    <div class="winner-amount">${formatWpondAmount(claim.amount)} wPOND</div>
                    <div class="winner-date">${claim.date}</div>
                </div>
            `).join('')}
        </div>
    `;
}

let _facetLastSig = null;
let _facetFlashTimer = null;
let _selectedPeriod = 'd30';
let _periodSourceClaims = [];

const PERIOD_META = {
    d30: { label: 'Last 30 days', short: '30d' },
    d90: { label: 'Last 90 days', short: '90d' },
    d180: { label: 'Last 180 days', short: '180d' },
    d365: { label: 'Last 365 days', short: '365d' },
    all: { label: 'All time (loaded)', short: 'ALL' },
};

function computePeriodsFromClaims(claims) {
    const now = Date.now() / 1000;
    const windows = [
        ['d30', 30],
        ['d90', 90],
        ['d180', 180],
        ['d365', 365],
        ['all', null],
    ];
    const out = {};
    for (const [key, days] of windows) {
        const cut = days == null ? 0 : now - days * 86400;
        const subset = (claims || []).filter((c) => (c.timestamp || 0) >= cut);
        out[key] = {
            days,
            claims: subset.length,
            wallets: new Set(subset.map((c) => c.wallet)).size,
            totalWpond: subset.reduce((s, c) => s + (Number(c.amount) || 0), 0),
            bigClaims: subset.filter((c) => (c.kind || classifyClaimAmount(c.amount)) === 'big').length,
            normalClaims: subset.filter((c) => (c.kind || classifyClaimAmount(c.amount)) === 'normal').length,
        };
    }
    return out;
}

function renderSelectedPeriod(periods) {
    const p = periods?.[_selectedPeriod] || {};
    const meta = PERIOD_META[_selectedPeriod] || PERIOD_META.d30;
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    set('periodLabel', meta.label);
    set('periodTotal', formatWpondAmount(p.totalWpond || 0));
    set('periodClaims', (p.claims || 0).toLocaleString());
    set('periodWallets', (p.wallets || 0).toLocaleString());
    set('periodBig', (p.bigClaims || 0).toLocaleString());

    document.querySelectorAll('#periodPills button').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.period === _selectedPeriod);
    });
    document.querySelectorAll('#periodStrip .period-chip').forEach((chip) => {
        chip.classList.toggle('active', chip.dataset.period === _selectedPeriod);
    });
}

function updatePeriodDesk(data) {
    const archive = Array.isArray(data?.archiveClaims) ? filterMinerClaims(data.archiveClaims) : [];
    const recent = Array.isArray(data?.recentClaims) ? filterMinerClaims(data.recentClaims) : [];
    const claims = archive.length ? archive : recent;
    const periods = computePeriodsFromClaims(claims);
    _periodSourceClaims = claims;

    const strip = document.getElementById('periodStrip');
    if (strip) {
        strip.innerHTML = Object.keys(PERIOD_META).map((key) => {
            const p = periods[key] || {};
            const meta = PERIOD_META[key];
            return `<button type="button" class="period-chip ${key === _selectedPeriod ? 'active' : ''}" data-period="${key}">
                <em>${meta.short}</em>
                <strong>${formatWpondAmount(p.totalWpond || 0)}</strong>
                <span>${(p.claims || 0).toLocaleString()} claims</span>
            </button>`;
        }).join('');
        strip.querySelectorAll('.period-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                _selectedPeriod = chip.dataset.period;
                renderSelectedPeriod(periods);
            });
        });
    }

    const pills = document.getElementById('periodPills');
    if (pills && !pills.dataset.bound) {
        pills.dataset.bound = '1';
        pills.querySelectorAll('button').forEach((btn) => {
            btn.addEventListener('click', () => {
                _selectedPeriod = btn.dataset.period;
                const latest = computePeriodsFromClaims(_periodSourceClaims);
                renderSelectedPeriod(latest);
            });
        });
    }

    renderSelectedPeriod(periods);
}

function claimAgeMinutes(claim) {
    if (!claim) return Infinity;
    if (claim.timestamp) return Math.max(0, (Date.now() / 1000 - Number(claim.timestamp)) / 60);
    if (claim.date) {
        const t = Date.parse(claim.date);
        if (!Number.isNaN(t)) return Math.max(0, (Date.now() - t) / 60000);
    }
    return Infinity;
}

function formatAgeLabel(mins) {
    if (!Number.isFinite(mins)) return '—';
    if (mins < 1) return 'just now';
    if (mins < 60) return `${Math.round(mins)}m ago`;
    if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
    return `${Math.round(mins / (60 * 24))}d ago`;
}

function updateClaimFacet(data) {
    const facet = document.getElementById('claimFacet');
    if (!facet) return;

    const claims = Array.isArray(data?.recentClaims)
        ? filterMinerClaims(data.recentClaims)
        : [];
    const newest = claims.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
    const ageMin = claimAgeMinutes(newest);
    const hourAgo = Date.now() / 1000 - 3600;
    const lastHour = claims.filter((c) => (c.timestamp || 0) >= hourAgo).length;

    let state = 'off';
    let label = 'OFF';
    let sub = 'no fresh band claims';
    let heat = 4;

    if (ageMin <= 20) {
        state = 'on';
        label = 'ON';
        sub = 'claims flowing · desk live';
        heat = Math.min(100, 70 + lastHour * 8 + Math.max(0, 20 - ageMin));
    } else if (ageMin <= 180) {
        state = 'warm';
        label = 'WARM';
        sub = 'recent hits · cooling';
        heat = Math.min(72, 35 + lastHour * 6);
    } else if (ageMin <= 60 * 24) {
        state = 'cool';
        label = 'COOL';
        sub = 'quiet window · standing by';
        heat = Math.min(34, 12 + Math.max(0, 24 - ageMin / 60));
    } else {
        state = 'off';
        label = 'OFF';
        sub = claims.length ? 'stale feed · waiting' : 'waiting for band claims';
        heat = claims.length ? 8 : 3;
    }

    facet.dataset.state = state;
    document.body.classList.remove('claims-on', 'claims-warm', 'claims-cool', 'claims-off');
    document.body.classList.add(`claims-${state}`);

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    setText('facetState', label);
    setText('facetSub', sub);
    setText('facetScore', String(Math.round(heat)));
    setText('facetLast', `last claim ${formatAgeLabel(ageMin)}`);
    setText('facetRate', `${lastHour} / hr`);

    const mercury = document.getElementById('facetMercury');
    if (mercury) mercury.style.width = `${Math.max(4, heat)}%`;

    const newestSig = newest?.signature || null;
    if (newestSig && _facetLastSig && newestSig !== _facetLastSig && state === 'on') {
        facet.classList.add('facet-flash');
        clearTimeout(_facetFlashTimer);
        _facetFlashTimer = setTimeout(() => facet.classList.remove('facet-flash'), 1200);
    }
    if (newestSig) _facetLastSig = newestSig;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    loadSavedAlerts();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchWallet();
        });
    }
    
    const alertInput = document.getElementById('alertInput');
    if (alertInput) {
        alertInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') setPayoutAlert();
        });
    }
    
    window.verifyFiltering = verifyExcludedWalletsFiltered;
    window.reloadDashboard = loadDashboardData;
    window.showExcludedWallets = () => console.log('🚫 Excluded wallets:', EXCLUDED_WALLETS);
    window.updateClaimFacet = updateClaimFacet;
    
    console.log('🔄 Claim facet watch enabled (20s)');
    setInterval(() => {
        watchLiveClaimFeed();
    }, 20000);
});

async function watchLiveClaimFeed() {
    try {
        const response = await fetch('recent-claims-live.json?v=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) {
            if (dashboardData) updateClaimFacet(dashboardData);
            return;
        }
        const live = await response.json();
        const claims = Array.isArray(live.recentClaims) ? live.recentClaims : [];
        const newestSig = claims[0]?.signature || null;
        if (newestSig && _facetLastSig && newestSig !== _facetLastSig) {
            console.log('🆕 Fresh band claim detected — reloading board');
            loadDashboardData();
            return;
        }
        updateClaimFacet({
            recentClaims: claims,
            summary: live.summary,
        });
    } catch (error) {
        if (dashboardData) updateClaimFacet(dashboardData);
    }
}
