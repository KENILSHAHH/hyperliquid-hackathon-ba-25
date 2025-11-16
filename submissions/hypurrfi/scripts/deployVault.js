/** @format */

const hre = require('hardhat');

async function main() {
  console.log('Deploying HypurrVault contract...');

  // Get the deployer's address
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(balance), 'ETH');

  // Deploy the HypurrVault contract with explicit nonce management
  const HypurrVault = await hre.ethers.getContractFactory('HypurrVault');
  const nonce = await hre.ethers.provider.getTransactionCount(
    deployer.address,
    'pending'
  );
  console.log('Using nonce (pending):', nonce);
  const vault = await HypurrVault.deploy({ nonce: nonce });

  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log('HypurrVault deployed to:', vaultAddress);

  // Log contract details
  console.log('\n=== Contract Details ===');
  console.log('USDC Address:', await vault.USDC_ADDRESS());
  console.log('USDH Address:', await vault.USDH_ADDRESS());
  console.log('Hypurr Pool Address:', await vault.POOL_ADDRESS());
  console.log('LTV Percentage:', await vault.LTV_PERCENTAGE(), '%');

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    vaultAddress: vaultAddress,
    usdcAddress: await vault.USDC_ADDRESS(),
    usdhAddress: await vault.USDH_ADDRESS(),
    poolAddress: await vault.POOL_ADDRESS(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    network: hre.network.name,
  };

  fs.writeFileSync(
    'deployment-vault.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('\nDeployment info saved to deployment-vault.json');

  console.log('\n=== Next Steps ===');
  console.log('1. Approve the vault contract to spend your USDC:');
  console.log(`   USDC.approve("${vaultAddress}", amount)`);
  console.log('\n2. Deposit USDC into the vault:');
  console.log(`   Vault.deposit(amount, yourAddress)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
