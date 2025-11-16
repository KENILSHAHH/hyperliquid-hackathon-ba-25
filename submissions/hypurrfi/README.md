# HypurrYield

A Hardhat project configured for HyperEVM blockchain.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Add your private key to the `.env` file.

## Networks

This project is configured for HyperEVM:

- **HyperEVM Testnet**: 
  - RPC URL: https://api.hyperliquid-testnet.xyz/evm
  - Chain ID: 998

- **HyperEVM Mainnet**: 
  - RPC URL: https://api.hyperliquid.xyz/evm
  - Chain ID: 999

## Commands

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js --network hyperevm_testnet
```

