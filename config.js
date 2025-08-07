module.exports = {
  // Default RPC endpoints
  rpcEndpoints: {
    mainnet: 'https://api.mainnet-beta.solana.com',
    devnet: 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    localhost: 'http://localhost:8899'
  },
  
  // Default endpoint to use
  defaultEndpoint: 'https://api.mainnet-beta.solana.com',
  
  // SPL Token Program IDs
  programIds: {
    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    associatedTokenProgram: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    tokenMetadataProgram: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
  },
  
  // Request timeout in milliseconds
  timeout: 30000,
  
  // Retry configuration
  retry: {
    attempts: 3,
    delay: 1000
  }
}; 