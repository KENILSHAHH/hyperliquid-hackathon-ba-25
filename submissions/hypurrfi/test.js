/** @format */

// run-swap.js (modified to fetch calldata from GlueX quote endpoint)
import { ethers } from 'ethers';

async function fetchQuoteCalldata() {
  const url = 'https://router.gluex.xyz/v1/quote';
  const body = {
    chainID: 'hyperevm',
    inputToken: '0x111111a1a0667d36bD57c0A9f569b98057111111',
    outputToken: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
    inputAmount: '1000000',
    orderType: 'SELL',
    userAddress: '0x4cbee7ad42d33e9d3b41e8b6faca2f6f173c8a94',
    outputReceiver: '0x4cbee7ad42d33e9d3b41e8b6faca2f6f173c8a94',
    uniquePID:
      '214a4a77d04f9707b04366ca91e554207d6fa7cdb0129943774f26aad1a41bee',
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': 'baQ5SRKk0Sc5GOr1LxMQcapYWQlv0HXk',
  };

  try {
    // node 18+ has global fetch. If your node doesn't, install node-fetch and import it.
    const res = await fetch(url, {
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
    console.log('Quote response:', json);

    // The GlueX response sometimes nests the useful payload under `result`.
    // Try several common locations and log where we found it for easier debugging.
    let calldata = null;
    let foundAt = null;

    if (json && typeof json.calldata === 'string' && json.calldata.length > 0) {
      calldata = json.calldata;
      foundAt = 'json.calldata';
    } else if (
      json &&
      json.result &&
      typeof json.result.calldata === 'string' &&
      json.result.calldata.length > 0
    ) {
      calldata = json.result.calldata;
      foundAt = 'json.result.calldata';
    } else if (
      json &&
      json.data &&
      typeof json.data.calldata === 'string' &&
      json.data.calldata.length > 0
    ) {
      calldata = json.data.calldata;
      foundAt = 'json.data.calldata';
    } else if (
      json &&
      json.quote &&
      typeof json.quote.calldata === 'string' &&
      json.quote.calldata.length > 0
    ) {
      calldata = json.quote.calldata;
      foundAt = 'json.quote.calldata';
    }

    if (!calldata) {
      console.error(
        'Full quote response for debugging:',
        JSON.stringify(json, null, 2)
      );
      throw new Error('Calldata not found in quote response');
    }

    console.log(`Calldata found at ${foundAt}`);

    // ensure 0x prefix
    if (!calldata.startsWith('0x')) calldata = '0x' + calldata;
    return calldata;
  } catch (err) {
    console.error('fetchQuoteCalldata error:', err);
    throw err;
  }
}

async function main() {
  // === CONFIG - replace these ===
  const RPC_URL =
    'https://g.w.lavanet.xyz:443/gateway/hyperliquid/rpc-http/fe1c13b2eea02947deeabddb461030a6'; // <- replace
  const PRIVATE_KEY = process.env.PRIVATE_KEY; // <- replace (wallet that holds USDC)
  const signerAddress = undefined; // optional: set if you want to enforce from

  // Contracts / calldata provided by you
  const swapContract = '0xe95f6eaeae1e4d650576af600b33d9f7e5f9f7fd';
  const executor = '0x2102Ab11A3c74B1D543891020969dc3D46C132AB';

  const usdh = '0x111111a1a0667d36bd57c0a9f569b98057111111'; // Input token to approve
  const spender = swapContract;
  const approveAmountRaw = BigInt('1000000'); // as you specified (smallest units)

  // =============================
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const signer = wallet.connect(provider);

  console.log('Using signer:', await signer.getAddress());

  // Minimal ERC20 ABI for approve/allowance
  const erc20Abi = [
    'function approve(address spender, uint256 amount) public returns (bool)',
    'function allowance(address owner, address spender) public view returns (uint256)',
    'function decimals() public view returns (uint8)',
  ];
  const usdcContract = new ethers.Contract(usdh, erc20Abi, signer);

  // 1) Optional: check decimals and interpret approveAmount
  try {
    const decimals = await usdcContract.decimals();
    console.log('USDC decimals:', decimals);
  } catch (e) {
    console.log(
      "Couldn't fetch decimals (non-fatal). Proceeding with raw amount."
    );
  }

  // 2) Check current allowance
  const owner = await signer.getAddress();
  const currentAllowance = await usdcContract.allowance(owner, spender);
  console.log('Current allowance (raw):', currentAllowance.toString());

  if (currentAllowance < approveAmountRaw) {
    console.log(`Approving ${approveAmountRaw} to spender ${spender}...`);

    // Use the pending nonce to avoid "nonce too low" errors when there are
    // queued/pending transactions. We explicitly set the nonce for the approve
    // tx so we control it and can read the most up-to-date pending nonce.
    let nonce = await provider.getTransactionCount(owner, 'pending');
    console.log('Using pending nonce for approve:', nonce.toString());

    try {
      const approveTx = await usdcContract.approve(spender, approveAmountRaw, {
        nonce,
      });
      console.log('approve tx hash:', approveTx.hash);
      const approveReceipt = await approveTx.wait();
      console.log('approve mined. status:', approveReceipt.status);
    } catch (err) {
      // Handle nonce-related race and retry once with fresh pending nonce.
      if (err && err.code === 'NONCE_EXPIRED') {
        console.warn(
          'Approve failed with NONCE_EXPIRED, retrying with fresh pending nonce...'
        );
        nonce = await provider.getTransactionCount(owner, 'pending');
        const approveTx = await usdcContract.approve(
          spender,
          approveAmountRaw,
          { nonce }
        );
        console.log('retry approve tx hash:', approveTx.hash);
        const approveReceipt = await approveTx.wait();
        console.log('retry approve mined. status:', approveReceipt.status);
      } else {
        throw err;
      }
    }
  } else {
    console.log('Allowance sufficient, skipping approve.');
  }

  // 3) (Optional) re-check allowance
  const newAllowance = await usdcContract.allowance(owner, spender);
  console.log('New allowance (raw):', newAllowance.toString());

  // 4) Get calldata from GlueX quote endpoint
  console.log('Requesting quote to get calldata...');
  const calldata = await fetchQuoteCalldata();
  console.log('Obtained calldata:', calldata);

  // The calldata from GlueX should already be the complete encoded function call
  const encodedSwapCalldata = calldata;

  // 5) Estimate gas for the calldata call
  const txRequest = {
    to: swapContract,
    data: encodedSwapCalldata,
    // value: undefined // no native token value
  };

  // Ensure we use a fresh pending nonce for the swap call (after approve finished)
  txRequest.nonce = await provider.getTransactionCount(owner, 'pending');
  console.log('Using pending nonce for swap:', txRequest.nonce.toString());

  console.log('Estimating gas for swap call...');
  let gasEstimate;
  try {
    gasEstimate = await signer.estimateGas(txRequest);
    console.log('Estimated gas:', gasEstimate.toString());
  } catch (err) {
    console.warn('Gas estimation failed (may still work). Error:', err.message);
    // set a safe fallback
    gasEstimate = BigInt(3_000_000);
  }

  // 6) Send the transaction
  console.log('Sending swap transaction to', swapContract);
  const sendTx = await signer.sendTransaction({
    ...txRequest,
    gasLimit: gasEstimate,
  });
  console.log('swap tx hash:', sendTx.hash);
  const receipt = await sendTx.wait();
  console.log(
    'swap tx mined. status:',
    receipt.status,
    'block:',
    receipt.blockNumber
  );
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
