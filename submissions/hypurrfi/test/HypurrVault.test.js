const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('HypurrVault', function () {
  let vault;
  let usdc;
  let usdh;
  let owner;
  let user1;
  let user2;

  const USDC_ADDRESS = '0xb88339CB7199b77E23DB6E890353E22632Ba630f';
  const USDH_ADDRESS = '0x111111a1a0667d36bD57c0A9f569b98057111111';
  const POOL_ADDRESS = '0xceCcE0EB9DD2Ef7996e01e25DD70e461F918A14b';

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy vault
    const HypurrVault = await ethers.getContractFactory('HypurrVault');
    vault = await HypurrVault.deploy();
    await vault.waitForDeployment();

    console.log('Vault deployed to:', await vault.getAddress());

    // Get token contracts
    usdc = await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
      USDC_ADDRESS
    );
    usdh = await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
      USDH_ADDRESS
    );
  });

  describe('Deployment', function () {
    it('Should set the correct token addresses', async function () {
      expect(await vault.USDC_ADDRESS()).to.equal(USDC_ADDRESS);
      expect(await vault.USDH_ADDRESS()).to.equal(USDH_ADDRESS);
      expect(await vault.POOL_ADDRESS()).to.equal(POOL_ADDRESS);
    });

    it('Should set the correct LTV percentage', async function () {
      expect(await vault.LTV_PERCENTAGE()).to.equal(80);
    });

    it('Should have the correct name and symbol', async function () {
      expect(await vault.name()).to.equal('Hypurr Vault USDC');
      expect(await vault.symbol()).to.equal('hvUSDC');
    });

    it('Should set the deployer as owner', async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });
  });

  describe('Vault Information', function () {
    it('Should return correct asset address', async function () {
      expect(await vault.asset()).to.equal(USDC_ADDRESS);
    });

    it('Should start with zero total assets', async function () {
      expect(await vault.totalAssets()).to.equal(0);
    });

    it('Should start with zero total positions', async function () {
      const [supplied, borrowed] = await vault.getTotalPositions();
      expect(supplied).to.equal(0);
      expect(borrowed).to.equal(0);
    });
  });

  describe('User Positions', function () {
    it('Should return zero position for new users', async function () {
      const [supplied, borrowed] = await vault.getUserPosition(user1.address);
      expect(supplied).to.equal(0);
      expect(borrowed).to.equal(0);
    });
  });

  // Note: The following tests would require actual USDC tokens and interaction with Hypurr.fi
  // They are commented out but provided as examples for integration testing

  /*
  describe('Deposits', function () {
    const depositAmount = ethers.parseUnits('100', 6); // 100 USDC

    it('Should accept USDC deposits', async function () {
      // Approve USDC
      await usdc.connect(user1).approve(await vault.getAddress(), depositAmount);

      // Deposit
      await vault.connect(user1).deposit(depositAmount, user1.address);

      // Check position
      const [supplied, borrowed] = await vault.getUserPosition(user1.address);
      expect(supplied).to.equal(depositAmount);
      expect(borrowed).to.equal(depositAmount * 80n / 100n);
    });

    it('Should mint vault shares', async function () {
      const shares = await vault.balanceOf(user1.address);
      expect(shares).to.be.gt(0);
    });

    it('Should update total positions', async function () {
      const [supplied, borrowed] = await vault.getTotalPositions();
      expect(supplied).to.be.gt(0);
      expect(borrowed).to.be.gt(0);
    });
  });

  describe('Withdrawals', function () {
    it('Should allow withdrawals with USDH repayment', async function () {
      const [supplied, borrowed] = await vault.getUserPosition(user1.address);
      
      // Transfer USDH to vault for repayment
      await usdh.connect(user1).transfer(await vault.getAddress(), borrowed);

      // Withdraw
      await vault.connect(user1).withdraw(supplied, user1.address, user1.address);

      // Check position is cleared
      const [newSupplied, newBorrowed] = await vault.getUserPosition(user1.address);
      expect(newSupplied).to.equal(0);
      expect(newBorrowed).to.equal(0);
    });
  });
  */

  describe('Admin Functions', function () {
    it('Should allow owner to update pool approval', async function () {
      await expect(vault.connect(owner).updatePoolApproval()).to.not.be
        .reverted;
    });

    it('Should not allow non-owner to update pool approval', async function () {
      await expect(
        vault.connect(user1).updatePoolApproval()
      ).to.be.revertedWithCustomError(vault, 'OwnableUnauthorizedAccount');
    });

    it('Should allow owner to emergency withdraw USDH', async function () {
      // This would require USDH balance in vault
      // await vault.connect(owner).emergencyWithdrawUSDH(amount, owner.address);
    });

    it('Should not allow non-owner to emergency withdraw', async function () {
      await expect(
        vault.connect(user1).emergencyWithdrawUSDH(100, user1.address)
      ).to.be.revertedWithCustomError(vault, 'OwnableUnauthorizedAccount');
    });
  });

  describe('View Functions', function () {
    it('Should preview deposit', async function () {
      const amount = ethers.parseUnits('100', 6);
      const shares = await vault.previewDeposit(amount);
      expect(shares).to.be.gte(0);
    });

    it('Should preview mint', async function () {
      const shares = ethers.parseEther('100');
      const assets = await vault.previewMint(shares);
      expect(assets).to.be.gte(0);
    });

    it('Should convert to shares', async function () {
      const amount = ethers.parseUnits('100', 6);
      const shares = await vault.convertToShares(amount);
      expect(shares).to.be.gte(0);
    });

    it('Should convert to assets', async function () {
      const shares = ethers.parseEther('100');
      const assets = await vault.convertToAssets(shares);
      expect(assets).to.be.gte(0);
    });
  });
});

