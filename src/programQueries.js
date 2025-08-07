const { Connection, PublicKey } = require('@solana/web3.js');
const config = require('../config');

class ProgramQueries {
  constructor(endpoint = config.defaultEndpoint) {
    this.connection = new Connection(endpoint, 'confirmed');
  }

  /**
   * Get all accounts for a specific program
   * @param {string} programId - Program ID
   * @param {Array} filters - Optional filters
   * @returns {Promise<Array>} Program accounts
   */
  async getProgramAccounts(programId, filters = []) {
    try {
      const program = new PublicKey(programId);
      const accounts = await this.connection.getProgramAccounts(program, {
        filters: filters
      });

      return accounts.map(account => ({
        pubkey: account.pubkey.toString(),
        account: account.account
      }));
    } catch (error) {
      throw new Error(`Failed to get program accounts: ${error.message}`);
    }
  }

  /**
   * Get account information
   * @param {string} accountAddress - Account address
   * @returns {Promise<Object>} Account information
   */
  async getAccountInfo(accountAddress) {
    try {
      const account = new PublicKey(accountAddress);
      const accountInfo = await this.connection.getAccountInfo(account);
      
      if (!accountInfo) {
        throw new Error('Account not found');
      }

      return {
        address: accountAddress,
        lamports: accountInfo.lamports,
        owner: accountInfo.owner.toString(),
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
        data: accountInfo.data
      };
    } catch (error) {
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  /**
   * Get multiple account information
   * @param {Array<string>} accountAddresses - Array of account addresses
   * @returns {Promise<Array>} Array of account information
   */
  async getMultipleAccounts(accountAddresses) {
    try {
      const accounts = accountAddresses.map(addr => new PublicKey(addr));
      const accountInfos = await this.connection.getMultipleAccountsInfo(accounts);
      
      return accountInfos.map((info, index) => {
        if (!info) {
          return {
            address: accountAddresses[index],
            error: 'Account not found'
          };
        }
        
        return {
          address: accountAddresses[index],
          lamports: info.lamports,
          owner: info.owner.toString(),
          executable: info.executable,
          rentEpoch: info.rentEpoch,
          data: info.data
        };
      });
    } catch (error) {
      throw new Error(`Failed to get multiple accounts: ${error.message}`);
    }
  }

  /**
   * Get SPL token accounts for a specific mint
   * @param {string} mintAddress - Mint address
   * @returns {Promise<Array>} Token accounts for the mint
   */
  async getTokenAccountsByMint(mintAddress) {
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

      return accounts.map(account => ({
        pubkey: account.pubkey.toString(),
        account: account.account
      }));
    } catch (error) {
      throw new Error(`Failed to get token accounts by mint: ${error.message}`);
    }
  }

  /**
   * Get all SPL token accounts
   * @returns {Promise<Array>} All SPL token accounts
   */
  async getAllTokenAccounts() {
    try {
      const accounts = await this.connection.getProgramAccounts(
        new PublicKey(config.programIds.tokenProgram),
        {
          filters: [
            {
              dataSize: 165 // Size of token account data
            }
          ]
        }
      );

      return accounts.map(account => ({
        pubkey: account.pubkey.toString(),
        account: account.account
      }));
    } catch (error) {
      throw new Error(`Failed to get all token accounts: ${error.message}`);
    }
  }

  /**
   * Get program account count
   * @param {string} programId - Program ID
   * @returns {Promise<number>} Number of accounts for the program
   */
  async getProgramAccountCount(programId) {
    try {
      const accounts = await this.getProgramAccounts(programId);
      return accounts.length;
    } catch (error) {
      throw new Error(`Failed to get program account count: ${error.message}`);
    }
  }

  /**
   * Search accounts by data pattern
   * @param {string} programId - Program ID
   * @param {string} dataPattern - Data pattern to search for (base58 encoded)
   * @param {number} offset - Offset in the account data
   * @returns {Promise<Array>} Matching accounts
   */
  async searchAccountsByData(programId, dataPattern, offset = 0) {
    try {
      const accounts = await this.getProgramAccounts(programId, [
        {
          memcmp: {
            offset: offset,
            bytes: dataPattern
          }
        }
      ]);

      return accounts;
    } catch (error) {
      throw new Error(`Failed to search accounts by data: ${error.message}`);
    }
  }

  /**
   * Get accounts by data size
   * @param {string} programId - Program ID
   * @param {number} dataSize - Expected data size
   * @returns {Promise<Array>} Accounts with specified data size
   */
  async getAccountsByDataSize(programId, dataSize) {
    try {
      const accounts = await this.getProgramAccounts(programId, [
        {
          dataSize: dataSize
        }
      ]);

      return accounts;
    } catch (error) {
      throw new Error(`Failed to get accounts by data size: ${error.message}`);
    }
  }

  /**
   * Get recent program activity
   * @param {string} programId - Program ID
   * @param {number} limit - Number of signatures to fetch
   * @returns {Promise<Array>} Recent signatures
   */
  async getRecentProgramActivity(programId, limit = 10) {
    try {
      const program = new PublicKey(programId);
      const signatures = await this.connection.getSignaturesForAddress(program, { limit });
      
      return signatures.map(sig => ({
        signature: sig.signature,
        slot: sig.slot,
        err: sig.err,
        memo: sig.memo,
        blockTime: sig.blockTime
      }));
    } catch (error) {
      throw new Error(`Failed to get recent program activity: ${error.message}`);
    }
  }
}

// Create default instance
const defaultQueries = new ProgramQueries();

// Export both the class and convenience functions
module.exports = {
  ProgramQueries,
  getProgramAccounts: (programId, filters) => defaultQueries.getProgramAccounts(programId, filters),
  getAccountInfo: (address) => defaultQueries.getAccountInfo(address),
  getMultipleAccounts: (addresses) => defaultQueries.getMultipleAccounts(addresses),
  getTokenAccountsByMint: (mint) => defaultQueries.getTokenAccountsByMint(mint),
  getAllTokenAccounts: () => defaultQueries.getAllTokenAccounts(),
  getProgramAccountCount: (programId) => defaultQueries.getProgramAccountCount(programId),
  searchAccountsByData: (programId, pattern, offset) => defaultQueries.searchAccountsByData(programId, pattern, offset),
  getAccountsByDataSize: (programId, size) => defaultQueries.getAccountsByDataSize(programId, size),
  getRecentProgramActivity: (programId, limit) => defaultQueries.getRecentProgramActivity(programId, limit)
}; 