# HypurrYield - One-Click Leverage Looping for Maximum Stablecoin Yield
Demo Vide0 - https://www.loom.com/share/153cd18c287349cdaf9100f7f123424b
> **Automate leverage loops on HypurrFi with intelligent yield optimization powered by GlueX and Lava Network**

HypurrYield is a smart contract vault that enables users to maximize yield on stablecoins through automated leverage looping with just a single click. By combining HypurrFi's lending markets, GlueX's yield optimization APIs, and Lava Network's high-performance RPC infrastructure, users can achieve amplified returns without managing complex multi-step transactions.

---

## 🎯 Problem Statement

Traditional DeFi leverage strategies require users to:
- Manually execute multiple transactions (deposit → borrow → re-deposit → repeat)
- Monitor health factors and liquidation risks
- Constantly rebalance positions
- Understand complex protocol interactions

**HypurrYield solves this** by automating the entire leverage looping process, intelligently optimizing yield opportunities, and managing risk parameters—all through a single deposit transaction.

---

## 💡 Solution Overview

HypurrYield is a **one-click leverage looping vault** that:

1. **Accepts stablecoin deposits** (USDC, USDT, etc.)
2. **Automatically creates leverage loops** using HypurrFi's pooled lending markets
3. **Optimizes yield allocation** using GlueX Yields API to find the best opportunities
4. **Routes assets efficiently** via GlueX Router API for optimal execution
5. **Tracks positions** and manages health factors to prevent liquidations
6. **Provides real-time visibility** through Lava Network's RPC endpoints

### How It Works

```
User deposits 100 USDC
    ↓
Vault supplies 100 USDC to HypurrFi Pool
    ↓
Vault borrows 80 USDC (80% LTV) against collateral
    ↓
Borrowed USDC is re-supplied to pool (Loop 1)
    ↓
Vault borrows 64 USDC against new collateral (Loop 2)
    ↓
Process repeats until optimal leverage is reached
    ↓
Total exposure: ~500 USDC earning yield
    ↓
User receives vault shares representing their leveraged position
```

---

## 🏗️ Architecture

### Core Components

1. **HypurrVault Contract** (`contracts/HypurrVault.sol`)
   - ERC-4626 style vault for user deposits
   - Integrates with HypurrFi Pool for supply/borrow operations
   - Tracks user positions and health factors
   - Implements rebalancing and deleveraging functions

2. **GlueX Integration**
   - **Yields API**: Identifies highest yield opportunities across HyperEVM
   - **Router API**: Executes optimal asset routing and swaps
   - Automatically allocates capital to GlueX vaults when they offer best yields

3. **Lava Network RPC**
   - High-performance RPC endpoints for real-time on-chain data
   - Enables fast transaction execution and position monitoring
   - Powers dashboard and monitoring tools

4. **HypurrFi Pool Contracts**
   - Core lending/borrowing infrastructure
   - Pooled markets for efficient capital utilization
   - USDH (synthetic dollar) support for leverage loops

---

## 🚀 Key Features

### ✨ One-Click Leverage Looping
Deposit stablecoins and automatically create leveraged positions without manual intervention.

### 📊 Intelligent Yield Optimization
GlueX Yields API continuously monitors and identifies the highest yield opportunities, automatically reallocating capital when better rates become available.

### 🛡️ Risk Management
- Automatic health factor monitoring
- Configurable LTV limits (default: 80%)
- Rebalancing functions to maintain safe leverage ratios
- Emergency deleveraging to prevent liquidations

### 🔄 Automated Rebalancing
The vault can automatically rebalance positions when:
- Better yield opportunities emerge (via GlueX)
- Health factors approach dangerous levels
- Market conditions change

### 📈 Real-Time Position Tracking
Users can view their leveraged positions, current yields, and health factors at any time through the vault contract.

---

## 📋 Example: Leverage Loop in Action

### Scenario
Alice wants to maximize yield on her 1,000 USDC using leverage.

### Without HypurrYield (Manual Process)
1. Deposit 1,000 USDC to HypurrFi → Earn ~5% APY = **50 USDC/year**
2. Manually borrow 800 USDC (80% LTV)
3. Re-deposit borrowed 800 USDC
4. Borrow 640 USDC against new collateral
5. Repeat until desired leverage...
6. **Total transactions: 10+**
7. **Time required: 30+ minutes**
8. **Risk: Manual errors, missed opportunities**

### With HypurrYield (One-Click)
1. Alice calls `vault.deposit(1000 USDC)`
2. Vault automatically:
   - Supplies 1,000 USDC to HypurrFi
   - Borrows 800 USDC (Loop 1)
   - Re-supplies 800 USDC
   - Borrows 640 USDC (Loop 2)
   - Re-supplies 640 USDC
   - Continues until optimal leverage (~5x)
3. **Total transactions: 1**
4. **Time required: < 1 minute**
5. **Result: ~5,000 USDC earning yield at ~5% APY = ~250 USDC/year**

### Yield Amplification
- **Without leverage**: 1,000 USDC × 5% = **50 USDC/year**
- **With 5x leverage**: 5,000 USDC × 5% = **250 USDC/year**
- **Net yield after borrowing costs**: ~**180-200 USDC/year** (after ~3% borrowing rate)
- **Amplification**: **3.6-4x higher yield** with same initial capital

---

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity** ^0.8.27
- **OpenZeppelin** (Ownable, ReentrancyGuard, ERC20)
- **Hardhat** for development and testing
- **HypurrFi Pool Contracts** for lending/borrowing

### Integrations
- **GlueX Yields API**: Yield discovery and optimization
- **GlueX Router API**: Asset routing and execution
- **Lava Network RPC**: High-performance blockchain access
- **HypurrFi Markets**: Core lending infrastructure

### Development Tools
- Node.js / npm
- Hardhat
- ethers.js
- dotenv for configuration

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16+)
- npm or yarn
- A wallet with testnet tokens (for testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/KENILSHAHH/hypurryield.git
cd hypurrfi

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Configuration

Create a `.env` file with:

```env
PRIVATE_KEY=your_private_key_here
RPC_URL=https://g.w.lavanet.xyz:443/gateway/hyperliquid/rpc-http/YOUR_KEY
GLUEX_API_KEY=your_gluex_api_key
```

### Network Configuration

The project is configured for **HyperEVM**:

- **Testnet**: 
  - RPC: `https://api.hyperliquid-testnet.xyz/evm`
  - Chain ID: `998`
  
- **Mainnet**: 
  - RPC: `https://api.hyperliquid.xyz/evm`
  - Chain ID: `999`

---

## 🚀 Usage

### Deploy the Vault

```bash
npx hardhat run scripts/deployVault.js --network hyperevm_testnet
```

### Deposit and Create Leverage Loop

```bash
# Simple one-click deposit
npx hardhat run scripts/simpleDeposit.js --network hyperevm_testnet

# Or use the interactive script
npx hardhat run scripts/deposit2USDC.js --network hyperevm_testnet
```

### Check Your Position

```javascript
const [supplied, borrowed] = await vault.getUserPosition(userAddress);
console.log(`Supplied: ${supplied} USDC`);
console.log(`Borrowed: ${borrowed} USDH`);
console.log(`LTV: ${(borrowed / supplied * 100).toFixed(2)}%`);
```

### Rebalance Position

```javascript
// Rebalance if health factor is too low
await vault.rebalance();
```

### Withdraw

```javascript
// Withdraw your position (automatically unwinds the loop)
await vault.withdraw(amount, userAddress, userAddress);
```

---

## 📁 Project Structure

```
hypurrfi/
├── contracts/
│   └── HypurrVault.sol          # Main vault contract
├── scripts/
│   ├── deployVault.js           # Deploy vault contract
│   ├── simpleDeposit.js         # One-click deposit script
│   ├── deposit2USDC.js        # Interactive deposit
│   └── interactVault.js          # Vault interaction utilities
├── test/
│   └── HypurrVault.test.js      # Contract tests
├── abi/
│   └── HypurrPool.json          # HypurrFi Pool ABI
├── hardhat.config.js            # Hardhat configuration
└── README.md                    # This file
```

---

## 🔒 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Ownable**: Access control for admin functions
- **Health Factor Monitoring**: Prevents over-leveraging
- **LTV Limits**: Configurable maximum loan-to-value ratios
- **Whitelisted Contracts**: Only interacts with approved protocols

---

## 🎯 Sponsor Bounty Integration

### HypurrFi Bounty ✅
- ✅ Vault contract that accepts deposits
- ✅ Integration with HypurrFi Pool for supply/borrow
- ✅ Health factor tracking and risk management
- ✅ Rebalancing and deleveraging functions
- ✅ One-click position lifecycle (deposit → loop → exit)

### GlueX Bounty ✅
- ✅ GlueX Yields API integration for yield discovery
- ✅ GlueX Router API for optimal asset routing
- ✅ Automatic reallocation to highest yield opportunities
- ✅ GlueX vaults included in whitelisted allocation targets

### Lava Network Bounty ✅
- ✅ Lava RPC API for high-performance on-chain access
- ✅ Real-time transaction monitoring
- ✅ Fast execution for leverage loop operations

---

## 🧪 Testing

Run the test suite:

```bash
npx hardhat test
```

Run tests with gas reporting:

```bash
REPORT_GAS=true npx hardhat test
```

---

## 📊 Example Output

```
=== HypurrYield Leverage Loop ===
Initial Deposit: 1000 USDC

Step 1: Supplying 1000 USDC to HypurrFi Pool...
✅ Supplied: 1000 USDC

Step 2: Borrowing 800 USDC (80% LTV)...
✅ Borrowed: 800 USDC

Step 3: Re-supplying 800 USDC (Loop 1)...
✅ Supplied: 800 USDC

Step 4: Borrowing 640 USDC (Loop 2)...
✅ Borrowed: 640 USDC

...continuing until optimal leverage...

Final Position:
- Total Supplied: ~5000 USDC
- Total Borrowed: ~4000 USDH
- Effective Leverage: 5x
- Health Factor: 1.25 (Safe)
- Estimated APY: ~20% (after borrowing costs)
```

---

## 🚧 Limitations & Future Improvements

### Current Limitations
- Fixed LTV ratio (80%)
- Manual rebalancing triggers
- Single asset support (USDC primary)

### Planned Enhancements
- Dynamic LTV based on market conditions
- Automated rebalancing via keepers
- Multi-asset support (USDT, USDH, etc.)
- Frontend dashboard for position management
- Telegram/Discord bots for alerts
- Integration with additional yield sources

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🤝 Contributing

This is a hackathon submission. For questions or contributions, please open an issue or pull request.

---

## 📞 Contact & Resources

- **HypurrFi Docs**: https://docs.hypurr.fi
- **GlueX Portal**: https://portal.gluex.xyz
- **Lava Network**: https://docs.lavanet.xyz
- **HyperEVM**: https://hyperliquid.xyz

---

## 🎉 Acknowledgments

Built for the **HyperEVM Hackathon - Staking Summit Buenos Aires 2025**

Special thanks to:
- **HypurrFi** for the lending infrastructure
- **GlueX** for yield optimization APIs
- **Lava Network** for high-performance RPC services

---

**Built with ❤️ for the HyperEVM ecosystem**
