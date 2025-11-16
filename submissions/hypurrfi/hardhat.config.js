/** @format */

require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.27',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hyperevm_testnet: {
      url: 'https://api.hyperliquid-testnet.xyz/evm',
      chainId: 998,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // HyperEVM Mainnet Configuration
    hyperevm: {
      url: 'https://g.w.lavanet.xyz:443/gateway/hyperliquid/rpc-http/fe1c13b2eea02947deeabddb461030a6',
      chainId: 999,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 'auto',
      gasPrice: 'auto',
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};
