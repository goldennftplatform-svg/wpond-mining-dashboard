const { getTokenBalance, getMintInfo, getTokenHolders } = require('./src/tokenQueries');
const { getProgramAccounts, getAccountInfo } = require('./src/programQueries');
const { rpcCall, getTokenAccountBalance } = require('./src/rpcUtils');
const config = require('./config');

async function main() {
  console.log('🚀 CALLinSOL - Solana Program Reading & SPL Token Querying\n');
  
  try {
    // Example 1: Get current slot (basic RPC call)
    console.log('📊 Getting current slot...');
    const slot = await rpcCall('getSlot');
    console.log(`Current slot: ${slot}\n`);

    // Example 2: Get recent blockhash
    console.log('🔗 Getting recent blockhash...');
    const blockhash = await rpcCall('getLatestBlockhash');
    console.log(`Recent blockhash: ${blockhash.blockhash}\n`);

    // Example 3: Get SPL Token program account count
    console.log('🏦 Getting SPL Token program account count...');
    const tokenProgramAccounts = await getProgramAccounts(config.programIds.tokenProgram);
    console.log(`SPL Token program has ${tokenProgramAccounts.length} accounts\n`);

    // Example 4: Get account info for SPL Token program
    console.log('📋 Getting SPL Token program account info...');
    const tokenProgramInfo = await getAccountInfo(config.programIds.tokenProgram);
    console.log(`SPL Token Program Info:`);
    console.log(`  Owner: ${tokenProgramInfo.owner}`);
    console.log(`  Executable: ${tokenProgramInfo.executable}`);
    console.log(`  Lamports: ${tokenProgramInfo.lamports}\n`);

    // Example 5: Get mint info for USDC (if you have a USDC mint address)
    // Note: This is just an example - you would need a real mint address
    console.log('💡 Example: Getting mint info...');
    console.log('To get mint info, use: getMintInfo("MINT_ADDRESS")');
    console.log('Example: getMintInfo("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")\n');

    // Example 6: Get token balance (if you have a token account address)
    console.log('💰 Example: Getting token balance...');
    console.log('To get token balance, use: getTokenBalance("TOKEN_ACCOUNT_ADDRESS")');
    console.log('Example: getTokenBalance("YOUR_TOKEN_ACCOUNT_ADDRESS")\n');

    // Example 7: Get token holders for a mint
    console.log('👥 Example: Getting token holders...');
    console.log('To get token holders, use: getTokenHolders("MINT_ADDRESS")');
    console.log('Note: This can be slow for tokens with many holders\n');

    console.log('✅ Setup complete! You can now use the following functions:');
    console.log('');
    console.log('Token Queries:');
    console.log('  - getTokenBalance(address)');
    console.log('  - getMintInfo(address)');
    console.log('  - getTokenHolders(mint)');
    console.log('');
    console.log('Program Queries:');
    console.log('  - getProgramAccounts(programId, filters)');
    console.log('  - getAccountInfo(address)');
    console.log('');
    console.log('RPC Utilities:');
    console.log('  - rpcCall(method, params)');
    console.log('  - getTokenAccountBalance(address)');
    console.log('');
    console.log('Configuration:');
    console.log(`  - Current RPC: ${config.defaultEndpoint}`);
    console.log(`  - SPL Token Program: ${config.programIds.tokenProgram}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure you have a stable internet connection and the RPC endpoint is accessible.');
  }
}

// Export main functions for use in other files
module.exports = {
  getTokenBalance,
  getMintInfo,
  getTokenHolders,
  getProgramAccounts,
  getAccountInfo,
  rpcCall,
  getTokenAccountBalance,
  config
};

// Run main function if this file is executed directly
if (require.main === module) {
  main();
} 