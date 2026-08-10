const path = require('path');

// Load local .env if present (no dependency required)
try {
  const fs = require('fs');
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
} catch (_) {
  // ignore — env may already be set by the shell
}

const heliusKey = (process.env.HELIUS_API_KEY || process.env.HELIUS_KEY || '').trim();

const heliusRpc = heliusKey
  ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
  : null;

module.exports = {
  // Default RPC endpoints
  rpcEndpoints: {
    mainnet: heliusRpc || 'https://api.mainnet-beta.solana.com',
    helius: heliusRpc,
    publicMainnet: 'https://api.mainnet-beta.solana.com',
    devnet: 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    localhost: 'http://localhost:8899',
  },

  // Prefer Helius on game day when key is present
  defaultEndpoint: heliusRpc || 'https://api.mainnet-beta.solana.com',
  heliusApiKey: heliusKey || null,

  // SPL Token Program IDs
  programIds: {
    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    associatedTokenProgram: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    tokenMetadataProgram: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  },

  // wPOND mining constants
  wpond: {
    mint: process.env.WPOND_MINT || '3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq',
    payoutWallet:
      process.env.WPOND_PAYOUT_WALLET || 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT',
  },

  // Request timeout in milliseconds
  timeout: Number(process.env.HELIUS_TIMEOUT_MS) || 30000,

  // Retry configuration (used by Helius client + legacy helpers)
  retry: {
    attempts: Number(process.env.HELIUS_MAX_RETRIES) || 6,
    delay: Number(process.env.HELIUS_BASE_DELAY_MS) || 500,
    maxDelay: Number(process.env.HELIUS_MAX_DELAY_MS) || 45000,
  },
};
