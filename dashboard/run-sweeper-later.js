#!/usr/bin/env node

/**
 * Run Daily TX Sweeper Later
 * 
 * This script should be run when the batch script (get-all-data-zero-errors-final.js) 
 * is NOT running to avoid API rate limiting conflicts.
 * 
 * Usage: node run-sweeper-later.js
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🕐 Daily TX Sweeper - Ready to Run Later');
console.log('📋 This script will update your dashboard with fresh data');
console.log('⚠️  Make sure get-all-data-zero-errors-final.js is NOT running first!');
console.log('');

// Check if the main sweeper exists
if (!fs.existsSync('daily-tx-sweeper.js')) {
    console.log('❌ daily-tx-sweeper.js not found!');
    console.log('   Make sure you\'re in the dashboard directory');
    process.exit(1);
}

// Load root config (.env) then require key
require('../config');
const apiKey = process.env.HELIUS_API_KEY || process.env.HELIUS_KEY;
if (!apiKey) {
    console.log('❌ HELIUS_API_KEY environment variable not set!');
    console.log('   Set it with: $env:HELIUS_API_KEY="your-api-key"');
    console.log('   or copy ../.env.example → ../.env');
    process.exit(1);
}

console.log('✅ Environment ready');
console.log('✅ API key configured');
console.log('✅ Main sweeper script found');
console.log('');

console.log('🚀 Starting the daily sweeper...');
console.log('   This will fetch the last 24 hours of transactions');
console.log('   and update your dashboard data');
console.log('');

try {
    // Run the main sweeper
    const result = execSync('node daily-tx-sweeper.js', { 
        encoding: 'utf8',
        stdio: 'inherit'
    });
    
    console.log('');
    console.log('✅ Sweeper completed successfully!');
    console.log('🔄 Your dashboard data has been updated');
    console.log('🌐 Deploy the changes to see fresh data');
    
} catch (error) {
    console.log('');
    console.log('❌ Sweeper failed with error:', error.message);
    console.log('💡 Check the error details above');
    console.log('🔄 You can try running it again later');
}
