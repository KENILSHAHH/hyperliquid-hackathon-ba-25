/** @format */

const hre = require('hardhat');

async function main() {
  console.log('=== Testing deposit with 0.5 USDC ===\n');

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

  // Test with 0.5 USDC
  const depositAmount = hre.ethers.parseUnits('0.5', 6);
  console.log('\nDeposit Amount:', hre.ethers.formatUnits(depositAmount, 6), 'USDC');

  const usdcBalance = await usdc.balanceOf(signer.address);
  console.log('USDC Balance:', hre.ethers.formatUnits(usdcBalance, 6), 'USDC');

  console.log('\n💰 Calling depositUSDC...');
  const depositTx = await vault.depositUSDC(depositAmount);
  console.log('Transaction hash:', depositTx.hash);
  
  await depositTx.wait();
  console.log('✅ Deposit successful!');

  const [supplied, borrowed] = await vault.getUserPosition(signer.address);
  console.log('\n=== Position ===');
  console.log('Supplied:', hre.ethers.formatUnits(supplied, 6), 'USDC');
  console.log('Borrowed:', hre.ethers.formatUnits(borrowed, 6), 'USDH');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

