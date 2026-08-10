#!/usr/bin/env node
/** Offline unit checks for Helius error classification (no API key needed). */
const assert = require('assert');
const { classifyHeliusError, HeliusError } = require('../src/heliusClient');

function check(name, fn) {
  try {
    fn();
    console.log(`OK  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}:`, err.message);
    process.exitCode = 1;
  }
}

check('429 → RATE_LIMIT retryable', () => {
  const e = classifyHeliusError(new Error('Too Many Requests'), { status: 429 });
  assert.strictEqual(e.code, 'RATE_LIMIT');
  assert.strictEqual(e.retryable, true);
});

check('401 → AUTH fatal', () => {
  const e = classifyHeliusError(new Error('Unauthorized'), { status: 401 });
  assert.strictEqual(e.code, 'AUTH');
  assert.strictEqual(e.retryable, false);
});

check('503 → TRANSIENT_HTTP retryable', () => {
  const e = classifyHeliusError(new Error('Bad Gateway'), { status: 503 });
  assert.strictEqual(e.code, 'TRANSIENT_HTTP');
  assert.strictEqual(e.retryable, true);
});

check('timeout → TIMEOUT retryable', () => {
  const e = classifyHeliusError(new Error('request timed out'));
  assert.strictEqual(e.code, 'TIMEOUT');
  assert.strictEqual(e.retryable, true);
});

check('HeliusError passthrough', () => {
  const original = new HeliusError('x', { code: 'RATE_LIMIT', retryable: true });
  const e = classifyHeliusError(original);
  assert.strictEqual(e, original);
});

if (!process.exitCode) console.log('\nAll Helius error unit checks passed.');
