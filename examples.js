const { getTokenBalance, getMintInfo, getTokenHolders } = require('./src/tokenQueries');
const { getProgramAccounts, getAccountInfo } = require('./src/programQueries');
const { rpcCall } = require('./src/rpcUtils');
const config = require('./config');

// Example token addresses (these are real addresses for demonstration)
const EXAMPLE_ADDRESSES = {
  // USDC mint address on mainnet
  USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  // USDT mint address on mainnet
  USDT_MINT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  // Example token account (you would replace with a real one)
  EXAMPLE_TOKEN_ACCOUNT: 'YOUR_TOKEN_ACCOUNT_ADDRESS_HERE'
};

async function example1_getTokenBalance() {
  console.log('\n=== Example 1: Get Token Balance ===');
  
  if (EXAMPLE_ADDRESSES.EXAMPLE_TOKEN_ACCOUNT === 'YOUR_TOKEN_ACCOUNT_ADDRESS_HERE') {
    console.log('⚠️  Please replace EXAMPLE_TOKEN_ACCOUNT with a real token account address');
    console.log('Usage: getTokenBalance("YOUR_TOKEN_ACCOUNT_ADDRESS")');
    return;
  }

  try {
    const balance = await getTokenBalance(EXAMPLE_ADDRESSES.EXAMPLE_TOKEN_ACCOUNT);
    console.log('Token Balance:', balance);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example2_getMintInfo() {
  console.log('\n=== Example 2: Get Mint Info ===');
  
  try {
    const mintInfo = await getMintInfo(EXAMPLE_ADDRESSES.USDC_MINT);
    console.log('USDC Mint Info:', mintInfo);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example3_getTokenHolders() {
  console.log('\n=== Example 3: Get Token Holders (Limited) ===');
  
  try {
    // Note: This can be very slow for tokens with many holders
    // We'll limit the results in practice
    console.log('Getting token holders for USDC...');
    console.log('⚠️  This operation can be slow for tokens with many holders');
    
    // In practice, you might want to add pagination or limits
    const holders = await getTokenHolders(EXAMPLE_ADDRESSES.USDC_MINT);
    console.log(`Found ${holders.length} token holders`);
    
    // Show first 5 holders as example
    const sampleHolders = holders.slice(0, 5);
    console.log('Sample holders:', sampleHolders);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example4_getProgramAccounts() {
  console.log('\n=== Example 4: Get Program Accounts ===');
  
  try {
    // Get all SPL token accounts (this will be a large number)
    console.log('Getting SPL token program accounts...');
    const accounts = await getProgramAccounts(config.programIds.tokenProgram);
    console.log(`Total SPL token accounts: ${accounts.length}`);
    
    // Show first few accounts as example
    const sampleAccounts = accounts.slice(0, 3);
    console.log('Sample accounts:', sampleAccounts.map(acc => acc.pubkey));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example5_getAccountInfo() {
  console.log('\n=== Example 5: Get Account Info ===');
  
  try {
    // Get info about the SPL Token program itself
    const accountInfo = await getAccountInfo(config.programIds.tokenProgram);
    console.log('SPL Token Program Account Info:', accountInfo);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example6_rpcCall() {
  console.log('\n=== Example 6: Direct RPC Call ===');
  
  try {
    // Get current slot
    const slot = await rpcCall('getSlot');
    console.log('Current slot:', slot);
    
    // Get recent blockhash
    const blockhash = await rpcCall('getLatestBlockhash');
    console.log('Recent blockhash:', blockhash.blockhash);
    
    // Get cluster nodes
    const nodes = await rpcCall('getClusterNodes');
    console.log(`Cluster has ${nodes.length} nodes`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example7_searchByMint() {
  console.log('\n=== Example 7: Search Token Accounts by Mint ===');
  
  try {
    // Get all token accounts for USDC mint
    console.log('Getting token accounts for USDC mint...');
    const accounts = await getProgramAccounts(config.programIds.tokenProgram, [
      {
        dataSize: 165 // Size of token account data
      },
      {
        memcmp: {
          offset: 0,
          bytes: EXAMPLE_ADDRESSES.USDC_MINT
        }
      }
    ]);
    
    console.log(`Found ${accounts.length} token accounts for USDC`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runAllExamples() {
  console.log('🚀 Running CALLinSOL Examples\n');
  
  await example2_getMintInfo();
  await example4_getProgramAccounts();
  await example5_getAccountInfo();
  await example6_rpcCall();
  await example7_searchByMint();
  
  // Skip examples that require specific addresses
  console.log('\n=== Skipped Examples ===');
  console.log('Example 1 (Get Token Balance): Requires real token account address');
  console.log('Example 3 (Get Token Holders): Can be very slow for large tokens');
  
  console.log('\n✅ Examples completed!');
  console.log('\n💡 To run specific examples, call them individually:');
  console.log('   example2_getMintInfo()');
  console.log('   example4_getProgramAccounts()');
  console.log('   etc.');
}

// Export individual examples
module.exports = {
  example1_getTokenBalance,
  example2_getMintInfo,
  example3_getTokenHolders,
  example4_getProgramAccounts,
  example5_getAccountInfo,
  example6_rpcCall,
  example7_searchByMint,
  runAllExamples
};

// Run all examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
} 