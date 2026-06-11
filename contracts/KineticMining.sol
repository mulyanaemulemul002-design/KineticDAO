// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title  KineticMining — Ad-to-Earn Mining Protocol (Pre-TGE Virtual Credits)
/// @notice Users watch ads to trigger 12-hour mining cycles and accumulate
///         virtual KNTC credits on-chain. Real ERC-20 tokens are only
///         distributed after the owner activates TGE via setTGEActive(true).
/// @dev    KNTC Ecochain — Maculatus Testnet (Chain ID: 10778)
///
///         Gacha reward tiers (per 12h session):
///           APES  (20%) — 0.01 – 0.10 KNTC  (unlucky)
///           BASIC (70%) — 1.00 KNTC          (normal)
///           HOKI  (10%) — 3 – 5 KNTC         (lucky)
contract KineticMining is Ownable, ReentrancyGuard {

    // ─── Token reference ─────────────────────────────────────────────────────
    IERC20 public immutable kineticToken;

    // ─── Protocol constants ──────────────────────────────────────────────────
    uint256 public constant MINING_CYCLE = 12 hours;
    uint256 public constant MINING_POOL  = 700_000_000 ether;

    // ─── Gacha tier boundaries (rand % 1000) ─────────────────────────────────
    //   APES:  [0,   199] → 20%
    //   BASIC: [200, 899] → 70%
    //   HOKI:  [900, 999] → 10%
    uint256 private constant TIER_APES_END   = 200;
    uint256 private constant TIER_HOKI_START = 900;

    // ─── Reward amounts (18 decimals) ────────────────────────────────────────
    uint256 private constant APES_BASE   = 0.01 ether;
    uint256 private constant APES_STEP   = 0.01 ether;
    uint256 private constant APES_STEPS  = 10;   // 0.01, 0.02, … 0.10 KNTC
    uint256 private constant BASIC_REWARD = 1    ether;
    uint256 private constant HOKI_BASE   = 3     ether;
    uint256 private constant HOKI_STEPS  = 3;    // 3, 4, or 5 KNTC

    // ─── TGE flag ─────────────────────────────────────────────────────────────
    bool public isTGEActive = false;

    // ─── Protocol totals ─────────────────────────────────────────────────────
    uint256 public totalMiningCycles;
    uint256 public uniqueMiners;
    uint256 public totalVirtualMined;   // cumulative virtual credits issued
    uint256 public totalTokensClaimed;  // cumulative ERC-20 tokens paid out post-TGE

    // ─── Per-user state ───────────────────────────────────────────────────────
    struct UserData {
        uint256 lastMineAt;
        uint256 cycleCount;
        uint256 pendingClaim;   // virtual credits awaiting TGE claim
        uint256 totalMined;     // lifetime virtual credits earned
        uint256 totalClaimed;   // lifetime ERC-20 tokens claimed
        bool    hasEverMined;
    }
    mapping(address => UserData) public users;

    // ─── Events ───────────────────────────────────────────────────────────────
    /// @param tier  0 = APES, 1 = BASIC, 2 = HOKI
    event AdWatched(address indexed user, uint256 timestamp, uint256 reward, uint8 tier);

    event MiningCycleCompleted(
        address indexed user,
        uint256 indexed cycleId,
        uint256 reward,
        uint8   tier,
        uint256 timestamp,
        uint256 poolRemaining   // MINING_POOL − totalVirtualMined
    );

    event TokensClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event TGEStatusChanged(bool active, uint256 timestamp);

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(address _kineticToken) Ownable(msg.sender) {
        require(_kineticToken != address(0), "KineticMining: zero token address");
        kineticToken = IERC20(_kineticToken);
    }

    // ─── Core: mine ──────────────────────────────────────────────────────────

    /// @notice Call after watching a 15-second ad to record a mining cycle
    ///         and accumulate virtual KNTC credits. No token transfer happens here.
    function mine() external nonReentrant returns (uint256 reward, uint8 tier) {
        UserData storage u = users[msg.sender];

        require(
            block.timestamp >= u.lastMineAt + MINING_CYCLE,
            "KineticMining: cooldown active"
        );
        require(
            totalVirtualMined < MINING_POOL,
            "KineticMining: mining pool depleted"
        );

        (reward, tier) = _calculateReward(msg.sender);

        // Cap to remaining pool
        uint256 poolRemaining = MINING_POOL - totalVirtualMined;
        if (reward > poolRemaining) reward = poolRemaining;

        // ── Update user ───────────────────────────────────────────────────────
        u.lastMineAt    = block.timestamp;
        u.cycleCount   += 1;
        u.pendingClaim += reward;
        u.totalMined   += reward;

        // ── Update protocol ───────────────────────────────────────────────────
        totalMiningCycles += 1;
        totalVirtualMined += reward;

        if (!u.hasEverMined) {
            u.hasEverMined = true;
            uniqueMiners++;
        }

        uint256 remaining = MINING_POOL - totalVirtualMined;

        emit AdWatched(msg.sender, block.timestamp, reward, tier);
        emit MiningCycleCompleted(
            msg.sender,
            totalMiningCycles,
            reward,
            tier,
            block.timestamp,
            remaining
        );
    }

    // ─── Claim (post-TGE) ────────────────────────────────────────────────────

    /// @notice Exchange all accumulated virtual credits for real KNTC ERC-20 tokens.
    ///         Only callable once TGE is active. Cannot be called twice (credits reset to 0).
    function claimTokens() external nonReentrant {
        require(isTGEActive, "KineticMining: TGE not active. Claim opens at launch.");

        UserData storage u = users[msg.sender];
        uint256 amount = u.pendingClaim;
        require(amount > 0, "KineticMining: no credits to claim");
        require(
            kineticToken.balanceOf(address(this)) >= amount,
            "KineticMining: insufficient contract token balance"
        );

        u.pendingClaim  = 0;
        u.totalClaimed += amount;
        totalTokensClaimed += amount;

        kineticToken.transfer(msg.sender, amount);

        emit TokensClaimed(msg.sender, amount, block.timestamp);
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    /// @notice Toggle TGE status. Once true, claimTokens() becomes callable.
    function setTGEActive(bool _status) external onlyOwner {
        isTGEActive = _status;
        emit TGEStatusChanged(_status, block.timestamp);
    }

    /// @notice Emergency token rescue — owner can recover tokens if needed.
    function rescueTokens(uint256 amount) external onlyOwner {
        kineticToken.transfer(owner(), amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice Primary dashboard read — returns all data needed by the UI in one call.
    function getUserDashboard(address _user) external view returns (
        uint256 pendingClaim,
        uint256 totalMined,
        uint256 totalClaimed,
        uint256 cycleCount,
        uint256 lastMineAt,
        uint256 cooldown,
        bool    mineReady,
        bool    tgeActive
    ) {
        UserData storage u = users[_user];
        uint256 next = u.lastMineAt + MINING_CYCLE;

        pendingClaim = u.pendingClaim;
        totalMined   = u.totalMined;
        totalClaimed = u.totalClaimed;
        cycleCount   = u.cycleCount;
        lastMineAt   = u.lastMineAt;
        cooldown     = block.timestamp >= next ? 0 : next - block.timestamp;
        mineReady    = block.timestamp >= next;
        tgeActive    = isTGEActive;
    }

    /// @notice Protocol-wide statistics.
    function getProtocolStats() external view returns (
        uint256 _totalCycles,
        uint256 _uniqueMiners,
        uint256 _totalVirtualMined,
        uint256 _totalTokensClaimed,
        uint256 _poolRemaining,
        bool    _tgeActive
    ) {
        _totalCycles        = totalMiningCycles;
        _uniqueMiners       = uniqueMiners;
        _totalVirtualMined  = totalVirtualMined;
        _totalTokensClaimed = totalTokensClaimed;
        _poolRemaining      = MINING_POOL > totalVirtualMined
                              ? MINING_POOL - totalVirtualMined
                              : 0;
        _tgeActive          = isTGEActive;
    }

    function cooldownRemaining(address _user) external view returns (uint256) {
        uint256 next = users[_user].lastMineAt + MINING_CYCLE;
        return block.timestamp >= next ? 0 : next - block.timestamp;
    }

    function canMine(address _user) external view returns (bool) {
        return block.timestamp >= users[_user].lastMineAt + MINING_CYCLE;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @dev Uses block.prevrandao + context hash for on-chain randomness.
    function _calculateReward(address _user)
        internal
        view
        returns (uint256 reward, uint8 tier)
    {
        bytes32 h = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            _user,
            totalMiningCycles
        ));
        uint256 rand1 = uint256(h) % 1000;
        uint256 rand2 = uint256(h >> 128);

        if (rand1 < TIER_APES_END) {
            // APES 20% — 0.01 to 0.10 KNTC (10 steps)
            tier   = 0;
            reward = APES_BASE + (rand2 % APES_STEPS) * APES_STEP;
        } else if (rand1 >= TIER_HOKI_START) {
            // HOKI 10% — 3, 4, or 5 KNTC
            tier   = 2;
            reward = HOKI_BASE + (rand2 % HOKI_STEPS) * 1 ether;
        } else {
            // BASIC 70% — exactly 1.00 KNTC
            tier   = 1;
            reward = BASIC_REWARD;
        }
    }
}
