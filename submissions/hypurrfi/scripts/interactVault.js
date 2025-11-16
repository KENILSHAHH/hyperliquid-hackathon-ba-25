/** @format */

const { ethers } = require('hardhat');

async function main() {
  // Configuration
  const VAULT_ADDRESS = ''; // Add your deployed vault address here
  const USDC_ADDRESS = '0xb88339CB7199b77E23DB6E890353E22632Ba630f';
  const USDH_ADDRESS = '0x111111a1a0667d36bD57c0A9f569b98057111111';

  const DEPOSIT_AMOUNT = ethers.parseUnits('100', 6); // 100 USDC (6 decimals)

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log('Interacting with account:', signer.address);

  // Get contracts
  const vault = await ethers.getContractAt('HypurrVault', VAULT_ADDRESS);
  const usdc = await ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    USDC_ADDRESS
  );
  const usdh = await ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    USDH_ADDRESS
  );

  console.log('\n=== Vault Information ===');
  console.log('Vault Address:', VAULT_ADDRESS);
  console.log('Vault Name:', await vault.name());
  console.log('Vault Symbol:', await vault.symbol());

  // Check balances
  console.log('\n=== Current Balances ===');
  const usdcBalance = await usdc.balanceOf(signer.address);
  const usdhBalance = await usdh.balanceOf(signer.address);
  const vaultShares = await vault.balanceOf(signer.address);

  console.log('USDC Balance:', ethers.formatUnits(usdcBalance, 6));
  console.log('USDH Balance:', ethers.formatUnits(usdhBalance, 6));
  console.log('Vault Shares:', ethers.formatEther(vaultShares));

  // Check user position
  const [supplied, borrowed] = await vault.getUserPosition(signer.address);
  console.log('\n=== Your Position ===');
  console.log('Supplied (USDC):', ethers.formatUnits(supplied, 6));
  console.log('Borrowed (USDH):', ethers.formatUnits(borrowed, 6));

  // Check total vault positions
  const [totalSupplied, totalBorrowed] = await vault.getTotalPositions();
  console.log('\n=== Total Vault Positions ===');
  console.log('Total Supplied:', ethers.formatUnits(totalSupplied, 6), 'USDC');
  console.log('Total Borrowed:', ethers.formatUnits(totalBorrowed, 6), 'USDH');

  // Approve USDC if needed
  console.log('\n=== Checking Allowance ===');
  const allowance = await usdc.allowance(signer.address, VAULT_ADDRESS);
  console.log('Current Allowance:', ethers.formatUnits(allowance, 6), 'USDC');

  if (allowance < DEPOSIT_AMOUNT) {
    console.log('\nApproving USDC...');
    const approveTx = await usdc.approve(VAULT_ADDRESS, ethers.MaxUint256);
    console.log('Approve tx hash:', approveTx.hash);
    await approveTx.wait();
    console.log('✓ Approved!');
  } else {
    console.log('✓ Allowance sufficient');
  }

  // Deposit into vault
  console.log('\n=== Depositing into Vault ===');
  console.log('Deposit Amount:', ethers.formatUnits(DEPOSIT_AMOUNT, 6), 'USDC');

  const depositTx = await vault.deposit(DEPOSIT_AMOUNT, signer.address);
  console.log('Deposit tx hash:', depositTx.hash);
  console.log('Waiting for confirmation...');
  const receipt = await depositTx.wait();
  console.log('✓ Deposit successful! Block:', receipt.blockNumber);

  // Check updated balances
  console.log('\n=== Updated Balances ===');
  const newUsdcBalance = await usdc.balanceOf(signer.address);
  const newUsdhBalance = await usdh.balanceOf(signer.address);
  const newVaultShares = await vault.balanceOf(signer.address);

  console.log('USDC Balance:', ethers.formatUnits(newUsdcBalance, 6));
  console.log('USDH Balance:', ethers.formatUnits(newUsdhBalance, 6));
  console.log('Vault Shares:', ethers.formatEther(newVaultShares));

  // Check updated position
  const [newSupplied, newBorrowed] = await vault.getUserPosition(
    signer.address
  );
  console.log('\n=== Updated Position ===');
  console.log('Supplied (USDC):', ethers.formatUnits(newSupplied, 6));
  console.log('Borrowed (USDH):', ethers.formatUnits(newBorrowed, 6));
  console.log(
    'LTV:',
    ((Number(newBorrowed) / Number(newSupplied)) * 100).toFixed(2),
    '%'
  );

  console.log('\n=== Transaction Summary ===');
  console.log('✓ Deposited:', ethers.formatUnits(DEPOSIT_AMOUNT, 6), 'USDC');
  console.log(
    '✓ Supplied to Hypurr.fi:',
    ethers.formatUnits(DEPOSIT_AMOUNT, 6),
    'USDC'
  );
  console.log(
    '✓ Borrowed from Hypurr.fi:',
    ethers.formatUnits(newBorrowed - borrowed, 6),
    'USDH'
  );
  console.log(
    '✓ Vault shares received:',
    ethers.formatEther(newVaultShares - vaultShares)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
