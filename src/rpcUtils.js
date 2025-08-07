const axios = require('axios');
const config = require('../config');

class RpcClient {
  constructor(endpoint = config.defaultEndpoint) {
    this.endpoint = endpoint;
    this.requestId = 1;
  }

  /**
   * Make a direct RPC call to Solana
   * @param {string} method - RPC method name
   * @param {Array} params - Method parameters
   * @returns {Promise<Object>} RPC response
   */
  async rpcCall(method, params = []) {
    const payload = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: method,
      params: params
    };

    try {
      const response = await axios.post(this.endpoint, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: config.timeout
      });

      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP Error: ${error.response.status} - ${error.response.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get token account balance
   * @param {string} tokenAccountAddress - Token account address
   * @returns {Promise<Object>} Token balance information
   */
  async getTokenAccountBalance(tokenAccountAddress) {
    return this.rpcCall('getTokenAccountBalance', [tokenAccountAddress]);
  }

  /**
   * Get account information
   * @param {string} accountAddress - Account address
   * @returns {Promise<Object>} Account information
   */
  async getAccountInfo(accountAddress) {
    return this.rpcCall('getAccountInfo', [accountAddress, { encoding: 'base64' }]);
  }

  /**
   * Get program accounts with optional filters
   * @param {string} programId - Program ID
   * @param {Array} filters - Optional filters
   * @returns {Promise<Array>} Program accounts
   */
  async getProgramAccounts(programId, filters = []) {
    const params = [programId];
    if (filters.length > 0) {
      params.push({ filters });
    }
    return this.rpcCall('getProgramAccounts', params);
  }

  /**
   * Get token accounts by owner
   * @param {string} ownerAddress - Owner address
   * @param {string} mintAddress - Optional mint address filter
   * @returns {Promise<Object>} Token accounts
   */
  async getTokenAccountsByOwner(ownerAddress, mintAddress = null) {
    const params = [ownerAddress];
    
    if (mintAddress) {
      params.push({ mint: mintAddress });
    } else {
      params.push({ programId: config.programIds.tokenProgram });
    }
    
    params.push({ encoding: 'base64' });
    
    return this.rpcCall('getTokenAccountsByOwner', params);
  }

  /**
   * Get recent blockhash
   * @returns {Promise<Object>} Recent blockhash
   */
  async getRecentBlockhash() {
    return this.rpcCall('getRecentBlockhash');
  }

  /**
   * Get slot
   * @returns {Promise<number>} Current slot
   */
  async getSlot() {
    return this.rpcCall('getSlot');
  }

  /**
   * Set RPC endpoint
   * @param {string} endpoint - New RPC endpoint
   */
  setEndpoint(endpoint) {
    this.endpoint = endpoint;
  }
}

// Create default instance
const defaultClient = new RpcClient();

// Export both the class and default instance
module.exports = {
  RpcClient,
  rpcCall: (method, params) => defaultClient.rpcCall(method, params),
  getTokenAccountBalance: (address) => defaultClient.getTokenAccountBalance(address),
  getAccountInfo: (address) => defaultClient.getAccountInfo(address),
  getProgramAccounts: (programId, filters) => defaultClient.getProgramAccounts(programId, filters),
  getTokenAccountsByOwner: (owner, mint) => defaultClient.getTokenAccountsByOwner(owner, mint),
  setRpcEndpoint: (endpoint) => defaultClient.setEndpoint(endpoint)
}; 