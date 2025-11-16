/** @format */

// Leveraged USDC supply script for Hypurr Pool
import { ethers } from 'ethers';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ========== CONFIGURATION ==========
const RPC_URL =
  'https://g.w.lavanet.xyz:443/gateway/hyperliquid/rpc-http/fe1c13b2eea02947deeabddb461030a6';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Contract addresses
const USDC_ADDRESS = '0xb88339CB7199b77E23DB6E890353E22632Ba630f';
const USDH_ADDRESS = '0x111111a1a0667d36bD57c0A9f569b98057111111';
const HYPURR_POOL = '0xceCcE0EB9DD2Ef7996e01e25DD70e461F918A14b';
const SWAP_CONTRACT = '0xe95f6eaeae1e4d650576af600b33d9f7e5f9f7fd';

// Parameters
const DECIMALS = 1000000; // USDC and USDH have 6 decimals
const BORROW_PERCENTAGE = 80; // Borrow 80% of collateral
const MIN_SUPPLY_AMOUNT = 0.1; // Stop loop when reaching 0.1 USDC
const BLOCK_CONFIRMATIONS = 5;

// GlueX API configuration
const GLUEX_API_URL = 'https://router.gluex.xyz/v1/quote';
const GLUEX_API_KEY = 'baQ5SRKk0Sc5GOr1LxMQcapYWQlv0HXk';
const UNIQUE_PID =
  '214a4a77d04f9707b04366ca91e554207d6fa7cdb0129943774f26aad1a41bee';

// ABIs
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
];

const HYPURR_POOL_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external',
];

// ========== HELPER FUNCTIONS ==========

/**
 * Ask user for input
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

/**
 * Safely send a transaction with nonce retry logic
 */
async function sendTransactionWithRetry(
  txFunction,
  userAddress,
  provider,
  maxRetries = 3
) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Always fetch fresh nonce right before sending
      const nonce = await provider.getTransactionCount(userAddress, 'pending');
      console.log(`[DEBUG] Attempt ${attempt}: Using nonce: ${nonce}`);

      // Call the transaction function with the fresh nonce
      const tx = await txFunction(nonce);

      // Wait for transaction to be mined
      console.log(`[DEBUG] Waiting for transaction to be mined...`);
      const receipt = await tx.wait();

      // Add a small delay to ensure network has processed the transaction
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return { tx, receipt };
    } catch (error) {
      lastError = error;
      if (
        error.code === 'NONCE_EXPIRED' ||
        error.code === 'REPLACEMENT_UNDERPRICED'
      ) {
        console.log(
          `[WARN] Nonce error on attempt ${attempt}: ${error.message}`
        );
        if (attempt < maxRetries) {
          // Wait a bit longer before retrying
          const waitTime = attempt * 2000; // 2s, 4s, 6s
          console.log(`[DEBUG] Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
      }
      // For other errors, throw immediately
      throw error;
    }
  }
  throw lastError;
}

/**
 * Wait for N block confirmations
 */
async function waitForBlocks(provider, startBlock, confirmations) {
  console.log(`\n[WAIT] Waiting for ${confirmations} block confirmations...`);
  console.log(`[DEBUG] Start block: ${startBlock}`);
  let currentBlock = await provider.getBlockNumber();
  console.log(`[DEBUG] Current block: ${currentBlock}`);

  while (currentBlock - startBlock < confirmations) {
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Check every 3 seconds
    currentBlock = await provider.getBlockNumber();
    const remaining = confirmations - (currentBlock - startBlock);
    if (remaining > 0) {
      process.stdout.write(
        `\r[WAIT] Blocks remaining: ${remaining} (current: ${currentBlock}) `
      );
    }
  }
  console.log(`\n[DEBUG] Final block: ${currentBlock}`);
  console.log('✓ Confirmations received\n');
}

/**
 * Fetch swap calldata from GlueX API
 */
async function fetchSwapCalldata(inputAmount, userAddress) {
  console.log(`[DEBUG] Fetching swap calldata for ${inputAmount} USDH...`);
  const body = {
    chainID: 'hyperevm',
    inputToken: USDH_ADDRESS,
    outputToken: USDC_ADDRESS,
    inputAmount: inputAmount.toString(),
    orderType: 'SELL',
    userAddress: userAddress,
    outputReceiver: userAddress,
    uniquePID: UNIQUE_PID,
  };

  console.log(`[DEBUG] GlueX Request body:`, JSON.stringify(body, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': GLUEX_API_KEY,
  };

  try {
    const res = await fetch(GLUEX_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Quote request failed: ${res.status} ${res.statusText} - ${text}`
      );
    }

    const json = await res.json();
    console.log(`[DEBUG] GlueX Response:`, JSON.stringify(json, null, 2));

    // Try to find calldata in response
    let calldata = null;
    if (json && typeof json.calldata === 'string' && json.calldata.length > 0) {
      calldata = json.calldata;
      console.log(`[DEBUG] Found calldata at json.calldata`);
    } else if (
      json &&
      json.result &&
      typeof json.result.calldata === 'string' &&
      json.result.calldata.length > 0
    ) {
      calldata = json.result.calldata;
      console.log(`[DEBUG] Found calldata at json.result.calldata`);
    } else if (
      json &&
      json.data &&
      typeof json.data.calldata === 'string' &&
      json.data.calldata.length > 0
    ) {
      calldata = json.data.calldata;
      console.log(`[DEBUG] Found calldata at json.data.calldata`);
    } else if (
      json &&
      json.quote &&
      typeof json.quote.calldata === 'string' &&
      json.quote.calldata.length > 0
    ) {
      calldata = json.quote.calldata;
      console.log(`[DEBUG] Found calldata at json.quote.calldata`);
    }

    if (!calldata) {
      console.error(
        '[ERROR] Full quote response:',
        JSON.stringify(json, null, 2)
      );
      throw new Error('Calldata not found in quote response');
    }

    // Ensure 0x prefix
    if (!calldata.startsWith('0x')) {
      calldata = '0x' + calldata;
    }

    console.log(`[DEBUG] Calldata length: ${calldata.length} characters`);
    return calldata;
  } catch (err) {
    console.error('[ERROR] fetchSwapCalldata error:', err);
    throw err;
  }
}

/**
 * Approve token spending
 */
async function approveToken(
  tokenContract,
  spender,
  amount,
  signer,
  provider,
  tokenName = 'Token'
) {
  console.log(`\n[DEBUG] Starting ${tokenName} approval process...`);
  const owner = await signer.getAddress();
  console.log(`[DEBUG] Owner: ${owner}`);
  console.log(`[DEBUG] Spender: ${spender}`);
  console.log(
    `[DEBUG] Amount to approve: ${amount.toString()} (${ethers.formatUnits(
      amount,
      6
    )} tokens)`
  );

  const currentAllowance = await tokenContract.allowance(owner, spender);
  console.log(
    `[DEBUG] Current allowance: ${currentAllowance.toString()} (${ethers.formatUnits(
      currentAllowance,
      6
    )} tokens)`
  );

  if (currentAllowance >= amount) {
    console.log('✓ Allowance sufficient, skipping approve');
    return;
  }

  console.log(
    `\n[APPROVE] Approving ${ethers.formatUnits(
      amount,
      6
    )} ${tokenName} to ${spender}...`
  );

  const { tx: approveTx, receipt: approveReceipt } =
    await sendTransactionWithRetry(
      async (nonce) => {
        return await tokenContract.approve(spender, amount, { nonce });
      },
      owner,
      provider
    );

  console.log(`[TX] Approve tx hash: ${approveTx.hash}`);
  console.log(`✓ Approve confirmed!`);
  console.log(
    `[DEBUG] Block: ${approveReceipt.blockNumber}, Status: ${
      approveReceipt.status
    }, Gas used: ${approveReceipt.gasUsed.toString()}`
  );
}

/**
 * Supply USDC to Hypurr Pool
 */
async function supplyToPool(poolContract, amount, userAddress, provider) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📥 SUPPLY STEP`);
  console.log(`${'='.repeat(60)}`);
  console.log(`[DEBUG] Pool contract: ${await poolContract.getAddress()}`);
  console.log(`[DEBUG] Asset (USDC): ${USDC_ADDRESS}`);
  console.log(
    `[DEBUG] Amount: ${amount.toString()} (${ethers.formatUnits(
      amount,
      6
    )} USDC)`
  );
  console.log(`[DEBUG] On behalf of: ${userAddress}`);
  console.log(`[DEBUG] Referral code: 0`);

  console.log(`\n[SUPPLY] Calling supply() on Hypurr Pool...`);
  const { tx: supplyTx, receipt: supplyReceipt } =
    await sendTransactionWithRetry(
      async (nonce) => {
        return await poolContract.supply(USDC_ADDRESS, amount, userAddress, 0, {
          nonce,
        });
      },
      userAddress,
      provider
    );

  console.log(`[TX] Supply tx hash: ${supplyTx.hash}`);
  console.log(`✓ Supply confirmed!`);
  console.log(
    `[DEBUG] Block: ${supplyReceipt.blockNumber}, Status: ${
      supplyReceipt.status
    }, Gas used: ${supplyReceipt.gasUsed.toString()}`
  );
  console.log(`${'='.repeat(60)}\n`);

  return supplyReceipt.blockNumber;
}

/**
 * Borrow USDH from Hypurr Pool
 */
async function borrowFromPool(poolContract, amount, userAddress, provider) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📤 BORROW STEP`);
  console.log(`${'='.repeat(60)}`);
  console.log(`[DEBUG] Pool contract: ${await poolContract.getAddress()}`);
  console.log(`[DEBUG] Asset (USDH): ${USDH_ADDRESS}`);
  console.log(
    `[DEBUG] Amount: ${amount.toString()} (${ethers.formatUnits(
      amount,
      6
    )} USDH)`
  );
  console.log(`[DEBUG] Interest rate mode: 2 (Variable)`);
  console.log(`[DEBUG] Referral code: 0`);
  console.log(`[DEBUG] On behalf of: ${userAddress}`);

  console.log(`\n[BORROW] Calling borrow() on Hypurr Pool...`);
  const { tx: borrowTx, receipt: borrowReceipt } =
    await sendTransactionWithRetry(
      async (nonce) => {
        return await poolContract.borrow(
          USDH_ADDRESS,
          amount,
          2, // Variable interest rate mode
          0,
          userAddress,
          { nonce }
        );
      },
      userAddress,
      provider
    );

  console.log(`[TX] Borrow tx hash: ${borrowTx.hash}`);
  console.log(`✓ Borrow confirmed!`);
  console.log(
    `[DEBUG] Block: ${borrowReceipt.blockNumber}, Status: ${
      borrowReceipt.status
    }, Gas used: ${borrowReceipt.gasUsed.toString()}`
  );
  console.log(`${'='.repeat(60)}\n`);

  return borrowReceipt.blockNumber;
}

/**
 * Swap USDH to USDC using GlueX
 */
async function swapUSDHtoUSDC(usdhAmount, signer, provider) {
  const userAddress = await signer.getAddress();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 SWAP STEP`);
  console.log(`${'='.repeat(60)}`);
  console.log(`[DEBUG] Input token (USDH): ${USDH_ADDRESS}`);
  console.log(`[DEBUG] Output token (USDC): ${USDC_ADDRESS}`);
  console.log(
    `[DEBUG] Input amount: ${usdhAmount.toString()} (${ethers.formatUnits(
      usdhAmount,
      6
    )} USDH)`
  );
  console.log(`[DEBUG] User address: ${userAddress}`);
  console.log(`[DEBUG] Swap contract: ${SWAP_CONTRACT}`);

  // Get swap calldata
  console.log(`\n[SWAP] Fetching quote from GlueX API...`);
  const calldata = await fetchSwapCalldata(usdhAmount, userAddress);
  console.log('✓ Received swap calldata from GlueX');

  // Estimate gas (without nonce for estimation)
  const txRequestBase = {
    to: SWAP_CONTRACT,
    data: calldata,
  };

  let gasEstimate;
  try {
    console.log(`[DEBUG] Estimating gas...`);
    gasEstimate = await signer.estimateGas(txRequestBase);
    console.log(`[DEBUG] Gas estimate: ${gasEstimate.toString()}`);
  } catch (err) {
    console.warn(`[WARN] Gas estimation failed: ${err.message}`);
    gasEstimate = BigInt(3_000_000);
    console.log(`[DEBUG] Using fallback gas limit: ${gasEstimate.toString()}`);
  }

  // Send transaction with retry logic
  console.log(`\n[SWAP] Sending swap transaction...`);
  const { tx: swapTx, receipt: swapReceipt } = await sendTransactionWithRetry(
    async (nonce) => {
      return await signer.sendTransaction({
        ...txRequestBase,
        nonce,
        gasLimit: gasEstimate,
      });
    },
    userAddress,
    provider
  );

  console.log(`[TX] Swap tx hash: ${swapTx.hash}`);
  console.log(`✓ Swap confirmed!`);
  console.log(
    `[DEBUG] Block: ${swapReceipt.blockNumber}, Status: ${
      swapReceipt.status
    }, Gas used: ${swapReceipt.gasUsed.toString()}`
  );
  console.log(`${'='.repeat(60)}\n`);

  return swapReceipt.blockNumber;
}

// ========== MAIN FUNCTION ==========

async function main() {
  console.log('========================================');
  console.log('🐱 Hypurr Pool Leveraged Supply Script');
  console.log('========================================\n');

  // Setup provider and signer
  console.log(`[DEBUG] Connecting to RPC: ${RPC_URL}`);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const signer = wallet.connect(provider);
  const userAddress = await signer.getAddress();

  console.log(`[INFO] Wallet: ${userAddress}`);

  // Get network info
  const network = await provider.getNetwork();
  console.log(`[INFO] Network: ${network.name} (Chain ID: ${network.chainId})`);
  const currentBlock = await provider.getBlockNumber();
  console.log(`[INFO] Current block: ${currentBlock}\n`);

  // Setup contracts
  console.log(`[DEBUG] Setting up contract instances...`);
  console.log(`[DEBUG] USDC Address: ${USDC_ADDRESS}`);
  console.log(`[DEBUG] USDH Address: ${USDH_ADDRESS}`);
  console.log(`[DEBUG] Hypurr Pool: ${HYPURR_POOL}`);
  console.log(`[DEBUG] Swap Contract: ${SWAP_CONTRACT}\n`);

  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
  const usdhContract = new ethers.Contract(USDH_ADDRESS, ERC20_ABI, signer);
  const poolContract = new ethers.Contract(
    HYPURR_POOL,
    HYPURR_POOL_ABI,
    signer
  );

  // Check token balances
  console.log(`[INFO] Fetching token balances...`);
  const usdcBalance = await usdcContract.balanceOf(userAddress);
  const usdhBalance = await usdhContract.balanceOf(userAddress);
  console.log(
    `[INFO] USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`
  );
  console.log(
    `[INFO] USDH Balance: ${ethers.formatUnits(usdhBalance, 6)} USDH\n`
  );

  // Ask user for initial supply amount
  const userInput = await askQuestion('How much USDC do you want to supply? ');
  const initialSupplyAmount = parseFloat(userInput);

  console.log(`[DEBUG] User input: "${userInput}"`);
  console.log(`[DEBUG] Parsed amount: ${initialSupplyAmount}`);

  if (isNaN(initialSupplyAmount) || initialSupplyAmount <= 0) {
    throw new Error('Invalid supply amount');
  }

  const initialSupplyAmountRaw = BigInt(
    Math.floor(initialSupplyAmount * DECIMALS)
  );
  console.log(
    `[DEBUG] Raw amount (with decimals): ${initialSupplyAmountRaw.toString()}`
  );

  // Verify user has enough balance
  if (usdcBalance < initialSupplyAmountRaw) {
    console.log(`[ERROR] Insufficient balance!`);
    console.log(
      `[ERROR] Required: ${ethers.formatUnits(initialSupplyAmountRaw, 6)} USDC`
    );
    console.log(
      `[ERROR] Available: ${ethers.formatUnits(usdcBalance, 6)} USDC`
    );
    throw new Error('Insufficient USDC balance');
  }

  console.log(`[DEBUG] Balance check passed ✓`);

  console.log(`\n✓ Starting leveraged supply with ${initialSupplyAmount} USDC`);
  console.log(`  - Borrow ratio: ${BORROW_PERCENTAGE}%`);
  console.log(`  - Min supply threshold: ${MIN_SUPPLY_AMOUNT} USDC`);
  console.log(`  - Supply APY: 7.5%`);
  console.log(`  - Borrow APY: 4%\n`);

  let currentSupplyAmount = initialSupplyAmountRaw;
  let loopCount = 0;
  let totalSupplied = BigInt(0);
  let totalBorrowed = BigInt(0);

  // Main loop
  while (ethers.formatUnits(currentSupplyAmount, 6) >= MIN_SUPPLY_AMOUNT) {
    loopCount++;
    console.log(`\n${'='.repeat(50)}`);
    console.log(`LOOP ${loopCount}`);
    console.log(`${'='.repeat(50)}`);
    console.log(
      `Supplying: ${ethers.formatUnits(currentSupplyAmount, 6)} USDC\n`
    );

    // Step 1: Approve USDC for Hypurr Pool
    console.log(`\n[STEP 1/9] Approving USDC for Hypurr Pool...`);
    await approveToken(
      usdcContract,
      HYPURR_POOL,
      currentSupplyAmount,
      signer,
      provider,
      'USDC'
    );

    // Step 2: Supply USDC to Hypurr Pool
    console.log(`\n[STEP 2/9] Supplying USDC to Hypurr Pool...`);
    const supplyBlock = await supplyToPool(
      poolContract,
      currentSupplyAmount,
      userAddress,
      provider
    );
    totalSupplied += currentSupplyAmount;
    console.log(
      `[INFO] Total supplied so far: ${ethers.formatUnits(
        totalSupplied,
        6
      )} USDC`
    );

    // Step 3: Wait for block confirmations
    console.log(`\n[STEP 3/9] Waiting for supply confirmations...`);
    await waitForBlocks(provider, supplyBlock, BLOCK_CONFIRMATIONS);

    // Step 4: Calculate borrow amount (80% of supplied)
    const borrowAmount =
      (currentSupplyAmount * BigInt(BORROW_PERCENTAGE)) / BigInt(100);
    console.log(`\n[STEP 4/9] Calculating borrow amount...`);
    console.log(
      `[DEBUG] Supplied: ${ethers.formatUnits(currentSupplyAmount, 6)} USDC`
    );
    console.log(`[DEBUG] Borrow percentage: ${BORROW_PERCENTAGE}%`);
    console.log(
      `[DEBUG] Borrow amount: ${ethers.formatUnits(borrowAmount, 6)} USDH`
    );

    // Step 5: Borrow USDH
    console.log(`\n[STEP 5/9] Borrowing USDH from Hypurr Pool...`);
    const borrowBlock = await borrowFromPool(
      poolContract,
      borrowAmount,
      userAddress,
      provider
    );
    totalBorrowed += borrowAmount;
    console.log(
      `[INFO] Total borrowed so far: ${ethers.formatUnits(
        totalBorrowed,
        6
      )} USDH`
    );

    // Step 6: Wait for confirmations
    console.log(`\n[STEP 6/9] Waiting for borrow confirmations...`);
    await waitForBlocks(provider, borrowBlock, BLOCK_CONFIRMATIONS);

    // Check USDH balance
    const usdhBalanceAfter = await usdhContract.balanceOf(userAddress);
    console.log(
      `[INFO] USDH balance after borrow: ${ethers.formatUnits(
        usdhBalanceAfter,
        6
      )} USDH`
    );

    // Step 7: Approve USDH for swap
    console.log(`\n[STEP 7/9] Approving USDH for swap contract...`);
    await approveToken(
      usdhContract,
      SWAP_CONTRACT,
      borrowAmount,
      signer,
      provider,
      'USDH'
    );

    // Step 8: Swap USDH to USDC
    console.log(`\n[STEP 8/9] Swapping USDH to USDC...`);
    const swapBlock = await swapUSDHtoUSDC(borrowAmount, signer, provider);

    // Step 9: Check USDC balance after swap
    console.log(`\n[STEP 9/9] Checking balances after swap...`);
    await waitForBlocks(provider, swapBlock, 2);
    const newUsdcBalance = await usdcContract.balanceOf(userAddress);
    console.log(
      `[INFO] USDC balance after swap: ${ethers.formatUnits(
        newUsdcBalance,
        6
      )} USDC`
    );

    // Calculate how much USDC we received from swap (approximation)
    // In production, you'd want to track this more precisely
    currentSupplyAmount = borrowAmount; // Assume ~1:1 swap for USDH:USDC

    console.log(`\n📊 Loop ${loopCount} Summary:`);
    console.log(
      `  Total Supplied: ${ethers.formatUnits(totalSupplied, 6)} USDC`
    );
    console.log(
      `  Total Borrowed: ${ethers.formatUnits(totalBorrowed, 6)} USDH`
    );
    console.log(
      `  Current USDC Balance: ${ethers.formatUnits(newUsdcBalance, 6)} USDC`
    );
    console.log(
      `  Next supply amount: ${ethers.formatUnits(currentSupplyAmount, 6)} USDC`
    );

    // Check if we should continue
    if (ethers.formatUnits(currentSupplyAmount, 6) < MIN_SUPPLY_AMOUNT) {
      console.log(
        `\n✓ Reached minimum threshold (${MIN_SUPPLY_AMOUNT} USDC). Exiting loop.`
      );
      break;
    }
  }

  // Final summary
  console.log('\n');
  console.log(`${'='.repeat(50)}`);
  console.log('🎉 LEVERAGED SUPPLY COMPLETE');
  console.log(`${'='.repeat(50)}`);
  console.log(`Total Loops: ${loopCount}`);
  console.log(
    `Total USDC Supplied: ${ethers.formatUnits(totalSupplied, 6)} USDC`
  );
  console.log(
    `Total USDH Borrowed: ${ethers.formatUnits(totalBorrowed, 6)} USDH`
  );
  console.log(
    `Effective Leverage: ${(
      Number(totalSupplied) / Number(initialSupplyAmountRaw)
    ).toFixed(2)}x`
  );

  const netAPY =
    (7.5 * Number(totalSupplied)) / Number(initialSupplyAmountRaw) -
    (4.0 * Number(totalBorrowed)) / Number(initialSupplyAmountRaw);
  console.log(`Estimated Net APY: ${netAPY.toFixed(2)}%`);
  console.log(`${'='.repeat(50)}\n`);
}

// Run the script
main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  console.error(err);
  process.exit(1);
});
