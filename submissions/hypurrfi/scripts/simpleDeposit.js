/** @format */

const { ethers } = require('hardhat');

async function main() {
  // Configuration - UPDATE THESE VALUES
  const VAULT_ADDRESS = 'YOUR_DEPLOYED_VAULT_ADDRESS_HERE'; // Get this after deploying
  const USDC_ADDRESS = '0xb88339CB7199b77E23DB6E890353E22632Ba630f';
  const DEPOSIT_AMOUNT = 100000000; // 100 USDC (100 * 10^6 since USDC has 6 decimals)

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log('Using wallet:', signer.address);

  // Get contracts
  const vault = await ethers.getContractAt('HypurrVault', VAULT_ADDRESS);
  const usdc = await ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    USDC_ADDRESS
  );

  console.log('\n=== Step 1: Check USDC Balance ===');
  const usdcBalance = await usdc.balanceOf(signer.address);
  console.log('Your USDC Balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');

  if (usdcBalance < DEPOSIT_AMOUNT) {
    console.error('❌ Insufficient USDC balance!');
    process.exit(1);
  }

  console.log('\n=== Step 2: Approve Vault to Spend USDC ===');
  const allowance = await usdc.allowance(signer.address, VAULT_ADDRESS);
  console.log('Current allowance:', ethers.formatUnits(allowance, 6), 'USDC');

  if (allowance < DEPOSIT_AMOUNT) {
    console.log('Approving vault to spend USDC...');
    const approveTx = await usdc.approve(VAULT_ADDRESS, ethers.MaxUint256);
    console.log('Approve tx hash:', approveTx.hash);
    await approveTx.wait();
    console.log('✅ Approved!');
  } else {
    console.log('✅ Already approved');
  }

  console.log('\n=== Step 3: Deposit USDC ===');
  console.log('Depositing:', ethers.formatUnits(DEPOSIT_AMOUNT, 6), 'USDC');

  // Call the simple deposit function with just the amount
  const depositTx = await vault.deposit(DEPOSIT_AMOUNT);
  console.log('Deposit tx hash:', depositTx.hash);
  console.log('Waiting for confirmation...');
  const receipt = await depositTx.wait();
  console.log('✅ Deposit successful! Block:', receipt.blockNumber);

  console.log('\n=== Step 4: Check Your Position ===');
  const [supplied, borrowed] = await vault.getUserPosition(signer.address);
  console.log(
    'Supplied to Hypurr.fi:',
    ethers.formatUnits(supplied, 6),
    'USDC'
  );
  console.log(
    'Borrowed from Hypurr.fi:',
    ethers.formatUnits(borrowed, 6),
    'USDH'
  );
  console.log(
    'LTV Ratio:',
    ((Number(borrowed) / Number(supplied)) * 100).toFixed(2),
    '%'
  );

  const shares = await vault.balanceOf(signer.address);
  console.log('Vault Shares:', ethers.formatEther(shares), 'hvUSDC');

  console.log('\n=== Summary ===');
  console.log(
    '✅ USDC deposited via vault:',
    ethers.formatUnits(DEPOSIT_AMOUNT, 6)
  );
  console.log('✅ Supplied to Hypurr.fi on your behalf');
  console.log('✅ USDH borrowed automatically (80% LTV)');
  console.log('✅ Position tracked in vault contract');
  console.log(
    '\nYour position in Hypurr.fi pool is maintained under your address!'
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
