#!/usr/bin/env node
/**
 * Game-day smoke check: auth + one getSlot via shared Helius client.
 */
const path = require('path');
require(path.join(__dirname, '..', 'config'));
const { getHelius, resolveApiKey, HeliusError } = require('../src/heliusClient');

async function main() {
  if (!resolveApiKey()) {
    console.error('FAIL: HELIUS_API_KEY not set');
    process.exit(1);
  }

  const helius = getHelius({ quiet: true, maxRetries: 3 });
  try {
    const slot = await helius.getSlot();
    console.log('OK: Helius reachable');
    console.log(`    slot=${slot}`);
    console.log(`    ${helius.summarizeStats()}`);
  } catch (err) {
    const msg = err instanceof HeliusError ? `[${err.code}] ${err.message}` : err.message;
    console.error('FAIL:', msg);
    console.error(helius.summarizeStats());
    process.exit(1);
  }
}

main();
