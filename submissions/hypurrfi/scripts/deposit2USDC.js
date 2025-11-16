/** @format */

const hre = require('hardhat');

async function main() {
  console.log('=== Depositing 2 USDC into HypurrVault ===\n');

  // Load deployment info
  const fs = require('fs');
  const deploymentInfo = JSON.parse(
    fs.readFileSync('deployment-vault.json', 'utf8')
  );

  const vaultAddress = deploymentInfo.vaultAddress;
  const usdcAddress = deploymentInfo.usdcAddress;

  console.log('Vault Address:', vaultAddress);
  console.log('USDC Address:', usdcAddress);

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log('User Address:', signer.address);

  // Get contract instances
  const vault = await hre.ethers.getContractAt('HypurrVault', vaultAddress);
  const usdc = await hre.ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    usdcAddress
  );

  // Amount to deposit: 2 USDC (6 decimals)
  const depositAmount = hre.ethers.parseUnits('2', 6); // 2 USDC = 2,000,000
  console.log(
    '\nDeposit Amount:',
    hre.ethers.formatUnits(depositAmount, 6),
    'USDC'
  );

  // Check USDC balance
  const usdcBalance = await usdc.balanceOf(signer.address);
  console.log(
    'Your USDC Balance:',
    hre.ethers.formatUnits(usdcBalance, 6),
    'USDC'
  );

  if (usdcBalance < depositAmount) {
    console.error('\n❌ Error: Insufficient USDC balance!');
    process.exit(1);
  }

  // Get current nonce from network (pending state to avoid cache issues)
  let nonce = await hre.ethers.provider.getTransactionCount(
    signer.address,
    'pending'
  );
  console.log('\nStarting nonce (pending):', nonce);

  // Step 1: Approve vault to spend USDC
  console.log('\n📝 Step 1: Approving vault to spend USDC...');
  const currentAllowance = await usdc.allowance(signer.address, vaultAddress);

  if (currentAllowance < depositAmount) {
    const approveTx = await usdc.approve(vaultAddress, depositAmount, {
      nonce: nonce,
    });
    console.log('Approval transaction hash:', approveTx.hash);
    await approveTx.wait();
    console.log('✅ Approval confirmed!');
    nonce++; // Increment nonce after transaction
  } else {
    console.log('✅ Already approved!');
  }

  // Step 2: Deposit USDC into vault
  console.log('\n💰 Step 2: Depositing USDC into vault...');
  console.log('Using nonce:', nonce);
  const depositTx = await vault.depositUSDC(depositAmount, { nonce: nonce });
  console.log('Deposit transaction hash:', depositTx.hash);

  const receipt = await depositTx.wait();
  console.log('✅ Deposit confirmed!');
  nonce++; // Increment nonce after transaction

  // Get user position
  console.log('\n=== Your Position ===');
  const [supplied, borrowed] = await vault.getUserPosition(signer.address);
  console.log(
    'Total USDC Supplied:',
    hre.ethers.formatUnits(supplied, 6),
    'USDC'
  );
  console.log(
    'Total USDH Borrowed:',
    hre.ethers.formatUnits(borrowed, 6),
    'USDH'
  );

  // Check USDH balance (borrowed amount should be in wallet)
  const usdh = await hre.ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    deploymentInfo.usdhAddress
  );
  const usdhBalance = await usdh.balanceOf(signer.address);
  console.log(
    'USDH in Wallet:',
    hre.ethers.formatUnits(usdhBalance, 6),
    'USDH'
  );

  console.log('\n🎉 Deposit successful!');
  console.log('You supplied 2 USDC and borrowed ~1.6 USDH (80% LTV)');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
