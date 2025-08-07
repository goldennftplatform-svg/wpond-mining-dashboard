const { Connection, PublicKey } = require('@solana/web3.js');
const { getAccount, getMint, getAssociatedTokenAddress } = require('@solana/spl-token');
const config = require('../config');

class TokenQueries {
  constructor(endpoint = config.defaultEndpoint) {
    this.connection = new Connection(endpoint, 'confirmed');
  }

  /**
   * Get token account balance with proper decimal handling
   * @param {string} tokenAccountAddress - Token account address
   * @returns {Promise<Object>} Token balance with UI amount
   */
  async getTokenBalance(tokenAccountAddress) {
    try {
      const tokenAccount = new PublicKey(tokenAccountAddress);
      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
      
      return {
        address: tokenAccountAddress,
        balance: accountInfo.value.amount,
        uiAmount: accountInfo.value.uiAmount,
        decimals: accountInfo.value.decimals,
        mint: accountInfo.value.mint
      };
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  /**
   * Get detailed token account information
   * @param {string} tokenAccountAddress - Token account address
   * @returns {Promise<Object>} Detailed token account info
   */
  async getTokenAccountInfo(tokenAccountAddress) {
    try {
      const tokenAccount = new PublicKey(tokenAccountAddress);
      const account = await getAccount(this.connection, tokenAccount);
      const mint = await getMint(this.connection, account.mint);
      
      return {
        address: tokenAccountAddress,
        mint: account.mint.toString(),
        owner: account.owner.toString(),
        amount: account.amount.toString(),
        uiAmount: Number(account.amount) / Math.pow(10, mint.decimals),
        decimals: mint.decimals,
        isFrozen: account.isFrozen,
        isNative: account.isNative,
        rentExemptReserve: account.rentExemptReserve?.toString(),
        delegate: account.delegate?.toString(),
        state: account.state
      };
    } catch (error) {
      throw new Error(`Failed to get token account info: ${error.message}`);
    }
  }

  /**
   * Get mint information
   * @param {string} mintAddress - Mint address
   * @returns {Promise<Object>} Mint information
   */
  async getMintInfo(mintAddress) {
    try {
      const mint = new PublicKey(mintAddress);
      const mintInfo = await getMint(this.connection, mint);
      
      return {
        address: mintAddress,
        decimals: mintInfo.decimals,
        isInitialized: mintInfo.isInitialized,
        mintAuthority: mintInfo.mintAuthority?.toString(),
        freezeAuthority: mintInfo.freezeAuthority?.toString(),
        supply: mintInfo.supply.toString(),
        uiSupply: Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)
      };
    } catch (error) {
      throw new Error(`Failed to get mint info: ${error.message}`);
    }
  }

  /**
   * Get all token accounts for an owner
   * @param {string} ownerAddress - Owner address
   * @param {string} mintAddress - Optional mint address filter
   * @returns {Promise<Array>} Array of token accounts
   */
  async getTokenAccountsByOwner(ownerAddress, mintAddress = null) {
    try {
      const owner = new PublicKey(ownerAddress);
      const mint = mintAddress ? new PublicKey(mintAddress) : null;
      
      const accounts = await this.connection.getTokenAccountsByOwner(owner, {
        ...(mint && { mint }),
        ...(!mint && { programId: new PublicKey(config.programIds.tokenProgram) })
      });

      return accounts.value.map(account => ({
        pubkey: account.pubkey.toString(),
        account: account.account
      }));
    } catch (error) {
      throw new Error(`Failed to get token accounts by owner: ${error.message}`);
    }
  }

  /**
   * Get associated token address
   * @param {string} ownerAddress - Owner address
   * @param {string} mintAddress - Mint address
   * @returns {Promise<string>} Associated token address
   */
  async getAssociatedTokenAddress(ownerAddress, mintAddress) {
    try {
      const owner = new PublicKey(ownerAddress);
      const mint = new PublicKey(mintAddress);
      
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mint,
        owner,
        false,
        new PublicKey(config.programIds.tokenProgram),
        new PublicKey(config.programIds.associatedTokenProgram)
      );
      
      return associatedTokenAddress.toString();
    } catch (error) {
      throw new Error(`Failed to get associated token address: ${error.message}`);
    }
  }

  /**
   * Get all token holders for a specific mint
   * @param {string} mintAddress - Mint address
   * @returns {Promise<Array>} Array of token holders
   */
  async getTokenHolders(mintAddress) {
    try {
      const mint = new PublicKey(mintAddress);
      
      const accounts = await this.connection.getProgramAccounts(
        new PublicKey(config.programIds.tokenProgram),
        {
          filters: [
            {
              dataSize: 165 // Size of token account data
            },
            {
              memcmp: {
                offset: 0,
                bytes: mintAddress
              }
            }
          ]
        }
      );

      const holders = [];
      for (const account of accounts) {
        try {
          const accountInfo = await getAccount(this.connection, account.pubkey);
          if (Number(accountInfo.amount) > 0) {
            holders.push({
              address: account.pubkey.toString(),
              owner: accountInfo.owner.toString(),
              amount: accountInfo.amount.toString(),
              uiAmount: Number(accountInfo.amount) / Math.pow(10, accountInfo.decimals)
            });
          }
        } catch (error) {
          // Skip invalid accounts
          console.warn(`Skipping invalid account ${account.pubkey.toString()}: ${error.message}`);
        }
      }

      return holders;
    } catch (error) {
      throw new Error(`Failed to get token holders: ${error.message}`);
    }
  }

  /**
   * Get token account balance with retry logic
   * @param {string} tokenAccountAddress - Token account address
   * @param {number} retries - Number of retry attempts
   * @returns {Promise<Object>} Token balance
   */
  async getTokenBalanceWithRetry(tokenAccountAddress, retries = config.retry.attempts) {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.getTokenBalance(tokenAccountAddress);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, config.retry.delay));
      }
    }
  }
}

// Create default instance
const defaultQueries = new TokenQueries();

// Export both the class and convenience functions
module.exports = {
  TokenQueries,
  getTokenBalance: (address) => defaultQueries.getTokenBalance(address),
  getTokenAccountInfo: (address) => defaultQueries.getTokenAccountInfo(address),
  getMintInfo: (address) => defaultQueries.getMintInfo(address),
  getTokenAccountsByOwner: (owner, mint) => defaultQueries.getTokenAccountsByOwner(owner, mint),
  getAssociatedTokenAddress: (owner, mint) => defaultQueries.getAssociatedTokenAddress(owner, mint),
  getTokenHolders: (mint) => defaultQueries.getTokenHolders(mint),
  getTokenBalanceWithRetry: (address, retries) => defaultQueries.getTokenBalanceWithRetry(address, retries)
}; 