const fs = require('fs');
const path = require('path');

// Shared Helius client (retries / 429 cool-down / clean errors)
const {
  getHelius,
  HeliusError,
  resolveApiKey,
} = require('../src/heliusClient');
const config = require('../config');

console.log('🚀 DAILY wPOND SWEEPER — Helius streamlined\n');

const CONFIG = {
  WPOND_MINT: config.wpond.mint,
  // Keep sweeper payout address consistent with prior dashboard filter set
  PAYOUT_WALLET: 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT',
  BATCH_SIZE: 10,
  DELAY_BETWEEN_BATCHES: 800,
  LOOKBACK_SIGNATURES: 80,
  DASHBOARD_DATA_FILE: path.join(__dirname, 'public', 'helius-dashboard-data.json'),
  EXCLUDED_WALLETS: [
    'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT',
    '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL',
    '5KXZCyUaqHJ1T2wbcMXvLt9jYR87tDJS2Bf71gxYSZNt',
    'HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2',
    '2aC1XMPKr9yj9RdK6fPrGZ9QhC6b3zbn5aKfZQnUrWeP',
  ],
};

let helius = null;

function ensureHelius() {
  if (!resolveApiKey()) {
    const tip =
      'HELIUS_API_KEY is not set. $env:HELIUS_API_KEY="your-key" or copy .env.example → .env';
    throw new HeliusError(tip, { code: 'AUTH', retryable: false });
  }
  if (!helius) {
    helius = getHelius({
      maxRetries: config.retry.attempts,
      timeoutMs: config.timeout,
      baseDelayMs: config.retry.delay,
      maxDelayMs: config.retry.maxDelay,
    });
  }
  return helius;
}

let existingDashboardData = null;
if (fs.existsSync(CONFIG.DASHBOARD_DATA_FILE)) {
  try {
    existingDashboardData = JSON.parse(
      fs.readFileSync(CONFIG.DASHBOARD_DATA_FILE, 'utf8')
    );
    console.log(
      `📊 Loaded existing dashboard data with ${existingDashboardData.allRecipients?.length || 0} recipients`
    );
  } catch (error) {
    console.log('⚠️ Could not load existing dashboard data:', error.message);
  }
}

function normalizeSignatureList(entries) {
  return (entries || [])
    .map((entry) => (typeof entry === 'string' ? entry : entry?.signature))
    .filter(Boolean);
}

/**
 * Prefer live Helius signatures (claims dripping now).
 * Fall back to local all-signatures.json only if live call fails hard.
 */
async function getRecentSignatures() {
  const client = ensureHelius();
  console.log('🔍 Fetching recent payout signatures via Helius...');

  try {
    const live = await client.getSignaturesForAddress(CONFIG.PAYOUT_WALLET, {
      limit: CONFIG.LOOKBACK_SIGNATURES,
    });
    const signatures = normalizeSignatureList(live);
    console.log(`📊 Live Helius: ${signatures.length} recent signatures`);
    return signatures;
  } catch (error) {
    const msg = error instanceof HeliusError ? `[${error.code}] ${error.message}` : error.message;
    console.error(`⚠️ Live signature fetch failed: ${msg}`);
  }

  const fallbackPath = path.join(__dirname, '..', 'all-signatures.json');
  if (fs.existsSync(fallbackPath)) {
    const allSignaturesData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    const allSignatures = normalizeSignatureList(
      Array.isArray(allSignaturesData)
        ? allSignaturesData
        : allSignaturesData.signatures || []
    );
    const recentSignatures = allSignatures.slice(-CONFIG.LOOKBACK_SIGNATURES);
    console.log(`📁 Fallback file: last ${recentSignatures.length} signatures`);
    return recentSignatures;
  }

  console.error('❌ No live signatures and no all-signatures.json fallback');
  return [];
}

async function fetchTransaction(signature) {
  return ensureHelius().getTransaction(signature);
}

function accountKeyString(key) {
  if (!key) return null;
  if (typeof key === 'string') return key;
  if (typeof key.pubkey === 'string') return key.pubkey;
  return null;
}

function processWpondTransaction(transaction, signature) {
  try {
    if (!transaction || !transaction.meta || !transaction.transaction) return null;

    const { meta, transaction: tx } = transaction;
    if (!meta.postTokenBalances || !meta.preTokenBalances) return null;

    const claims = [];
    const keys = tx.message.accountKeys || [];

    for (let i = 0; i < meta.postTokenBalances.length; i++) {
      const postBalance = meta.postTokenBalances[i];
      const preBalance = meta.preTokenBalances.find(
        (b) => b.accountIndex === postBalance.accountIndex
      );

      if (!postBalance || !preBalance) continue;
      if (postBalance.mint !== CONFIG.WPOND_MINT) continue;

      const preAmount = preBalance.uiTokenAmount?.uiAmount || 0;
      const postAmount = postBalance.uiTokenAmount?.uiAmount || 0;
      const change = postAmount - preAmount;
      if (change <= 0) continue;

      const account = accountKeyString(keys[postBalance.accountIndex]);
      if (!account) continue;
      if (CONFIG.EXCLUDED_WALLETS.includes(account)) continue;

      claims.push({
        wallet: account,
        amount: change,
        blockTime: transaction.blockTime || null,
        signature:
          signature ||
          (tx.signatures && tx.signatures[0]) ||
          null,
      });
    }

    return claims;
  } catch (error) {
    console.log('⚠️ Error processing wPOND transaction:', error.message);
    return null;
  }
}

async function processBatch(signatures, batchNumber) {
  console.log(`🔄 Processing batch ${batchNumber}: ${signatures.length} signatures`);

  const batchClaims = [];
  const batchErrors = [];

  for (let i = 0; i < signatures.length; i++) {
    const signature = signatures[i];
    const progress = i + 1;

    try {
      console.log(`  [${progress}/${signatures.length}] ${signature.substring(0, 8)}...`);

      const transaction = await fetchTransaction(signature);
      const claims = processWpondTransaction(transaction, signature);

      if (claims && claims.length > 0) {
        claims.forEach((claim) => {
          const ts = claim.blockTime || Math.floor(Date.now() / 1000);
          batchClaims.push({
            recipient: claim.wallet,
            wpondAmount: claim.amount,
            date: new Date(ts * 1000).toISOString().split('T')[0],
            signature: claim.signature || signature,
            timestamp: ts,
          });
        });
        console.log(`    ✅ ${claims.length} claim(s)`);
      }

      if (i < signatures.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    } catch (error) {
      const msg =
        error instanceof HeliusError
          ? `[${error.code}] ${error.message}`
          : error.message;
      console.log(`  ❌ ${signature.substring(0, 8)}... ${msg}`);
      batchErrors.push({
        signature,
        error: msg,
        code: error.code || 'UNKNOWN',
        retryable: Boolean(error.retryable),
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { claims: batchClaims, errors: batchErrors };
}

function mergeWithDashboardData(newClaims, existingData) {
  if (!existingData) {
    existingData = {
      summary: {
        totalClaims: 0,
        totalWpond: 0,
        totalRecipients: 0,
        biggestWinner: '',
        biggestAmount: 0,
        averageAmount: 0,
      },
      allRecipients: [],
    };
  }

  const existingClaims = (existingData.allRecipients || [])
    .filter((r) => !CONFIG.EXCLUDED_WALLETS.includes(r.wallet))
    .map((r) => ({
      recipient: r.wallet,
      wpondAmount: r.amount,
      date: r.date,
      signature: r.signature,
      timestamp: r.timestamp || 0,
    }));

  const filteredNewClaims = newClaims.filter(
    (claim) => !CONFIG.EXCLUDED_WALLETS.includes(claim.recipient)
  );
  const allClaims = [...existingClaims, ...filteredNewClaims];

  const recipientMap = new Map();

  allClaims.forEach((claim) => {
    if (!recipientMap.has(claim.recipient)) {
      recipientMap.set(claim.recipient, {
        wallet: claim.recipient,
        amount: 0,
        claimCount: 0,
        date: claim.date,
        signature: claim.signature,
        timestamp: claim.timestamp,
      });
    }

    const recipient = recipientMap.get(claim.recipient);
    recipient.amount += claim.wpondAmount;
    recipient.claimCount += 1;

    if (claim.timestamp > recipient.timestamp) {
      recipient.date = claim.date;
      recipient.signature = claim.signature;
      recipient.timestamp = claim.timestamp;
    }
  });

  const allRecipients = Array.from(recipientMap.values()).sort(
    (a, b) => b.amount - a.amount
  );

  const totalWpond = allRecipients.reduce((sum, r) => sum + r.amount, 0);
  const totalClaims = allRecipients.reduce((sum, r) => sum + r.claimCount, 0);
  const biggestWinner = allRecipients[0]?.wallet || '';
  const biggestAmount = allRecipients[0]?.amount || 0;
  const averageAmount = totalClaims > 0 ? totalWpond / totalClaims : 0;

  return {
    summary: {
      totalClaims,
      totalWpond,
      totalRecipients: allRecipients.length,
      biggestWinner,
      biggestAmount,
      averageAmount,
    },
    allRecipients,
  };
}

function saveDashboardData(data) {
  fs.writeFileSync(CONFIG.DASHBOARD_DATA_FILE, JSON.stringify(data, null, 2));
  console.log(
    `💾 Saved updated dashboard data with ${data.allRecipients.length} recipients`
  );
}

async function runDailySweeper() {
  console.log('🚀 Starting Daily wPOND Sweeper...');
  console.log(`🎯 Target: ${CONFIG.PAYOUT_WALLET}`);
  console.log('⏰ Live lookback via Helius getSignaturesForAddress');

  try {
    ensureHelius();
    const recentSignatures = await getRecentSignatures();

    if (recentSignatures.length === 0) {
      console.log('⚠️ No recent signatures found');
      return;
    }

    const allClaims = [];
    const allErrors = [];

    for (let i = 0; i < recentSignatures.length; i += CONFIG.BATCH_SIZE) {
      const batch = recentSignatures.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;

      const result = await processBatch(batch, batchNumber);
      allClaims.push(...result.claims);
      allErrors.push(...result.errors);

      if (batchNumber % 5 === 0) {
        const updatedData = mergeWithDashboardData(allClaims, existingDashboardData);
        saveDashboardData(updatedData);
        console.log(`💾 Intermediate save: ${allClaims.length} claims processed`);
      }

      if (i + CONFIG.BATCH_SIZE < recentSignatures.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES)
        );
      }
    }

    const finalData = mergeWithDashboardData(allClaims, existingDashboardData);
    saveDashboardData(finalData);

    const fatal = allErrors.filter((e) => e.code === 'AUTH').length;
    const rateLimited = allErrors.filter((e) => e.code === 'RATE_LIMIT').length;

    console.log('🎉 Daily wPOND Sweeper completed');
    console.log(
      `📊 Summary: ${allClaims.length} new claim rows, ${allErrors.length} errors (429 exhaust=${rateLimited}, auth=${fatal})`
    );
    console.log(
      `📊 Totals: ${finalData.summary.totalClaims} claims, ${(finalData.summary.totalWpond / 1e9).toFixed(2)}B wPOND`
    );
    console.log(`📈 ${ensureHelius().summarizeStats()}`);
  } catch (error) {
    const msg =
      error instanceof HeliusError
        ? `[${error.code}] ${error.message}`
        : error.message;
    console.error('❌ Fatal error in daily sweeper:', msg);
    if (helius) console.log(`📈 ${helius.summarizeStats()}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  if (!resolveApiKey()) {
    console.error('❌ HELIUS_API_KEY is not set.');
    console.error('   $env:HELIUS_API_KEY="your-key"   # PowerShell');
    console.error('   or copy .env.example → .env at repo root');
    process.exit(1);
  }
  runDailySweeper().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  runDailySweeper,
  getRecentSignatures,
  processWpondTransaction,
};
