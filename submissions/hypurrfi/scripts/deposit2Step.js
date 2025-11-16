/** @format */

const hre = require('hardhat');

async function main() {
  console.log('=== Two-Step Deposit: Supply then Borrow ===\n');

  const deploymentInfo = JSON.parse(
    require('fs').readFileSync('deployment-vault.json', 'utf8')
  );

  const vaultAddress = deploymentInfo.vaultAddress;
  const usdcAddress = deploymentInfo.usdcAddress;

  const [signer] = await hre.ethers.getSigners();
  console.log('User:', signer.address);
  console.log('Vault:', vaultAddress);

  const vault = await hre.ethers.getContractAt('HypurrVault', vaultAddress);
  const usdc = await hre.ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    usdcAddress
  );

  const depositAmount = hre.ethers.parseUnits('2', 6); // 2 USDC
  console.log('\nAmount:', hre.ethers.formatUnits(depositAmount, 6), 'USDC');

  // Get current nonce from network (pending state to avoid cache issues)
  let nonce = await hre.ethers.provider.getTransactionCount(signer.address, 'pending');
  console.log('\nStarting nonce (pending):', nonce);

  // Check and approve if needed
  const currentAllowance = await usdc.allowance(signer.address, vaultAddress);
  if (currentAllowance < depositAmount) {
    console.log('\n📝 Approving vault...');
    const approveTx = await usdc.approve(vaultAddress, depositAmount, { nonce: nonce });
    console.log('Approval transaction:', approveTx.hash);
    await approveTx.wait();
    console.log('✅ Approved');
    nonce++; // Increment nonce after transaction
  } else {
    console.log('\n✅ Already approved');
  }

  // Step 1: Deposit (supply only)
  console.log('\n💰 Step 1: Supplying USDC...');
  console.log('Using nonce:', nonce);
  const depositTx = await vault.depositUSDC(depositAmount, { nonce: nonce });
  console.log('Transaction:', depositTx.hash);
  await depositTx.wait();
  console.log('✅ Supply successful!');
  nonce++; // Increment nonce after transaction

  // Check position after supply
  let [supplied, borrowed] = await vault.getUserPosition(signer.address);
  console.log('\nAfter Supply:');
  console.log('  Supplied:', hre.ethers.formatUnits(supplied, 6), 'USDC');
  console.log('  Borrowed:', hre.ethers.formatUnits(borrowed, 6), 'USDH');

  // Step 2: Borrow (separate transaction)
  console.log('\n💸 Step 2: Borrowing USDH...');
  console.log('Using nonce:', nonce);
  const borrowTx = await vault.borrowUSDH({ nonce: nonce });
  console.log('Transaction:', borrowTx.hash);
  await borrowTx.wait();
  console.log('✅ Borrow successful!');
  nonce++; // Increment nonce after transaction

  // Final position
  [supplied, borrowed] = await vault.getUserPosition(signer.address);
  console.log('\n=== Final Position ===');
  console.log('Supplied:', hre.ethers.formatUnits(supplied, 6), 'USDC');
  console.log('Borrowed:', hre.ethers.formatUnits(borrowed, 6), 'USDH');
  console.log('\n🎉 Complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

