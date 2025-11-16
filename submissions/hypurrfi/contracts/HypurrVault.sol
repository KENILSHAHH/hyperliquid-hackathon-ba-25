// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IHypurrPool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    function repay(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external returns (uint256);
}

/**
 * @title HypurrVault
 * @notice Tracking and coordination contract for Hypurr.fi deposits and borrows
 * @dev This vault facilitates USDC supply to Hypurr.fi and USDH borrowing at 80% LTV
 * @dev Assets flow through vault to the Hypurr Pool - vault tracks user positions
 */
contract HypurrVault is Ownable, ReentrancyGuard {
    // Hypurr.fi Pool contract
    IHypurrPool public immutable hypurrPool;

    // USDC token (asset)
    IERC20 public immutable usdc;

    // USDH token (borrowed asset)
    IERC20 public immutable usdh;

    // Addresses
    address public constant USDC_ADDRESS =
        0xb88339CB7199b77E23DB6E890353E22632Ba630f;
    address public constant USDH_ADDRESS =
        0x111111a1a0667d36bD57c0A9f569b98057111111;
    address public constant POOL_ADDRESS =
        0xceCcE0EB9DD2Ef7996e01e25DD70e461F918A14b;

    // Borrowing parameters
    uint256 public constant LTV_PERCENTAGE = 80; // 80% LTV
    uint256 public constant INTEREST_RATE_MODE = 2; // Variable rate
    uint16 public constant REFERRAL_CODE = 0;

    // User accounting
    struct UserPosition {
        uint256 supplied; // Amount supplied to Hypurr.fi
        uint256 borrowed; // Amount borrowed (USDH)
    }

    mapping(address => UserPosition) public userPositions;

    // Total tracking
    uint256 public totalSupplied;
    uint256 public totalBorrowed;

    // Events
    event Supplied(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);

    constructor() Ownable(msg.sender) {
        hypurrPool = IHypurrPool(POOL_ADDRESS);
        usdc = IERC20(USDC_ADDRESS);
        usdh = IERC20(USDH_ADDRESS);

        // Approve pool to spend USDC (max approval for gas efficiency)
        usdc.approve(POOL_ADDRESS, type(uint256).max);

        // Approve pool to spend USDH for repayments (max approval)
        usdh.approve(POOL_ADDRESS, type(uint256).max);
    }

    /**
     * @notice Deposits USDC and supplies to Hypurr.fi (supply only, no borrow yet)
     * @dev User must approve this vault contract to spend their USDC before calling
     * @param assets Amount of USDC to deposit (e.g., 2000000 for 2 USDC with 6 decimals)
     */
    function depositUSDC(uint256 assets) public nonReentrant {
        require(assets > 0, "Cannot deposit 0");

        // Transfer USDC from user to vault
        usdc.transferFrom(msg.sender, address(this), assets);

        // Supply USDC to Hypurr.fi pool - vault supplies and holds the position
        hypurrPool.supply(
            USDC_ADDRESS,
            amount,
            myaddress, // Vault holds position in Hypurr.fi
            0
        );

        // Update user position tracking
        userPositions[msg.sender].supplied += assets;

        // Update totals
        totalSupplied += assets;

        emit Supplied(msg.sender, assets);
    }

    /**
     * @notice Borrows USDH based on user's supplied position (separate function)
     * @dev Call this after depositUSDC to borrow against supplied collateral
     */
    function borrowUSDH() public nonReentrant {
        uint256 userSupplied = userPositions[msg.sender].supplied;
        require(userSupplied > 0, "No collateral supplied");

        // Calculate 75% of supplied amount for borrowing (reduced from 80% to be safer)
        uint256 borrowAmount = (userSupplied * 75) / 100;
        uint256 alreadyBorrowed = userPositions[msg.sender].borrowed;
        uint256 toBorrow = borrowAmount - alreadyBorrowed;

        require(toBorrow > 0, "Already borrowed maximum");

        // Borrow USDH against the supplied collateral
        hypurrPool.borrow(
            USDH_ADDRESS,
            amountToBorrow,
            2,
            0,
            myAddress// Vault is the borrower
        );

        // Transfer borrowed USDH to user
        usdh.transfer(msg.sender, toBorrow);

        // Update user position tracking
        userPositions[msg.sender].borrowed += toBorrow;

        // Update totals
        totalBorrowed += toBorrow;

        emit Borrowed(msg.sender, toBorrow);
    }

    /**
     * @notice Get user position details
     * @param user User address
     * @return supplied Amount supplied by user
     * @return borrowed Amount borrowed by user
     */
    function getUserPosition(
        address user
    ) external view returns (uint256 supplied, uint256 borrowed) {
        UserPosition memory position = userPositions[user];
        return (position.supplied, position.borrowed);
    }

    /**
     * @notice Get total vault positions
     * @return supplied Total amount supplied
     * @return borrowed Total amount borrowed
     */
    function getTotalPositions()
        external
        view
        returns (uint256 supplied, uint256 borrowed)
    {
        return (totalSupplied, totalBorrowed);
    }

    /**
     * @notice Emergency withdrawal of USDH earned/held by vault
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function emergencyWithdrawUSDH(
        uint256 amount,
        address to
    ) external onlyOwner {
        require(to != address(0), "Invalid address");
        usdh.transfer(to, amount);
    }

    /**
     * @notice Update approval for Hypurr pool (in case needed)
     */
    function updatePoolApproval() external onlyOwner {
        usdc.approve(POOL_ADDRESS, type(uint256).max);
        usdh.approve(POOL_ADDRESS, type(uint256).max);
    }
}
