// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title KineticDAO — Ad-to-Earn Mining Protocol
/// @notice Watch ads to trigger 12-hour mining cycles and earn X1T tokens
/// @dev X1T Ecochain (Maculatus Testnet, Chain ID: 10778)
///
/// Reward tiers per 12h session (emitted via calculateReward):
///   APES  (~8%)  — unlucky session:  0.01 – 0.09 X1T
///   BASIC (~90%) — normal session:   1.00 X1T  (exact)
///   HOKI  (~2%)  — lucky session:    3  – 5   X1T
///
/// Pool sustainability target: 700M X1T lasts ≥ 2.5 years.
/// Worst-case avg reward ≈ 0.985 X1T/session → daily burn = active_miners × 2 × 0.985
contract KineticDAO is Ownable, ReentrancyGuard {

    // ─── Token Allocation (1 Billion total, 18 decimals) ─────────────────────
    uint256 public constant TOTAL_SUPPLY       = 1_000_000_000 ether;
    uint256 public constant MINING_POOL        =   700_000_000 ether; // 70%
    uint256 public constant INVESTOR_POOL      =   100_000_000 ether; // 10%
    uint256 public constant TEAM_POOL          =    25_000_000 ether; //  2.5%
    uint256 public constant ECOSYSTEM_POOL     =   175_000_000 ether; // 17.5%

    // ─── Reward Tier Boundaries ───────────────────────────────────────────────
    // Probabilities are enforced by `_tier(rand1000)` below.
    // APES:  rand1000 in [0, 79]    →  8%
    // BASIC: rand1000 in [80, 969]  → 89%
    // HOKI:  rand1000 in [970, 999] →  3%
    uint256 private constant TIER_APES_END  =  80;  // [0,  79]
    uint256 private constant TIER_HOKI_START= 970;  // [970,999]

    // ─── Reward Amounts (18 decimals) ─────────────────────────────────────────
    // APES tier: 0.01 ether + subRand(0..8) × 0.01 ether  →  0.01 – 0.09 X1T
    uint256 private constant APES_BASE   = 0.01  ether;
    uint256 private constant APES_STEP   = 0.01  ether;
    uint256 private constant APES_STEPS  = 9;            // 9 steps → 0.01..0.09
    // BASIC tier: exactly 1 X1T
    uint256 private constant BASIC_REWARD= 1     ether;
    // HOKI tier: 3 + subRand(0..2) X1T  →  3 – 5 X1T
    uint256 private constant HOKI_BASE   = 3     ether;
    uint256 private constant HOKI_STEPS  = 3;            // 3 steps → 3, 4, 5

    // ─── Mining Parameters ────────────────────────────────────────────────────
    uint256 public constant MINING_CYCLE = 12 hours;

    // ─── State ────────────────────────────────────────────────────────────────
    uint256 public miningPoolRemaining = MINING_POOL;
    uint256 public totalMinedTokens;
    uint256 public totalMiningCycles;
    uint256 public uniqueMiners;

    mapping(address => uint256) public lastMineAt;
    mapping(address => uint256) public totalEarned;
    mapping(address => uint256) public cycleCount;
    mapping(address => bool)    private _hasEverMined;

    // ─── Events ───────────────────────────────────────────────────────────────
    /// @param tier  0 = APES, 1 = BASIC, 2 = HOKI
    event AdWatched(address indexed user, uint256 timestamp, uint256 reward, uint8 tier);
    event MiningCycleCompleted(
        address indexed user, uint256 indexed cycleId,
        uint256 reward, uint8 tier, uint256 timestamp, uint256 poolRemaining
    );

    constructor() Ownable(msg.sender) {}

    // ─── Core ─────────────────────────────────────────────────────────────────

    function mine() external nonReentrant returns (uint256 reward, uint8 tier) {
        require(block.timestamp >= lastMineAt[msg.sender] + MINING_CYCLE, "KineticDAO: cooldown active");
        require(miningPoolRemaining > 0, "KineticDAO: pool depleted");

        (reward, tier) = _calculateReward(msg.sender);

        // Cap reward to remaining pool and contract balance
        uint256 cap = _min(miningPoolRemaining, address(this).balance);
        require(cap >= APES_BASE, "KineticDAO: low balance");
        if (reward > cap) reward = cap;

        lastMineAt[msg.sender]   = block.timestamp;
        totalEarned[msg.sender] += reward;
        cycleCount[msg.sender]  += 1;
        miningPoolRemaining     -= reward;
        totalMinedTokens        += reward;
        totalMiningCycles       += 1;

        if (!_hasEverMined[msg.sender]) {
            _hasEverMined[msg.sender] = true;
            uniqueMiners++;
        }

        emit AdWatched(msg.sender, block.timestamp, reward, tier);
        emit MiningCycleCompleted(msg.sender, totalMiningCycles, reward, tier, block.timestamp, miningPoolRemaining);

        (bool sent,) = msg.sender.call{value: reward}("");
        require(sent, "KineticDAO: transfer failed");
    }

    // ─── Reward Calculation ───────────────────────────────────────────────────

    /// @notice Derives two independent sub-randoms from one keccak256 hash.
    ///         rand1  (mod 1000)  → selects tier
    ///         rand2  (mod 9/3)   → selects amount within tier
    function _calculateReward(address user) internal view returns (uint256 reward, uint8 tier) {
        bytes32 h = keccak256(abi.encodePacked(
            block.timestamp, block.prevrandao, user, totalMiningCycles
        ));
        uint256 rand1 = uint256(h) % 1000;
        uint256 rand2 = uint256(h >> 128); // upper 128 bits for sub-randomness

        if (rand1 < TIER_APES_END) {
            // APES — 0.01, 0.02, … 0.09 X1T
            tier   = 0;
            reward = APES_BASE + (rand2 % APES_STEPS) * APES_STEP;
        } else if (rand1 >= TIER_HOKI_START) {
            // HOKI — 3, 4, or 5 X1T
            tier   = 2;
            reward = HOKI_BASE + (rand2 % HOKI_STEPS) * 1 ether;
        } else {
            // BASIC — exactly 1 X1T
            tier   = 1;
            reward = BASIC_REWARD;
        }
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function cooldownRemaining(address user) external view returns (uint256) {
        uint256 next = lastMineAt[user] + MINING_CYCLE;
        return block.timestamp >= next ? 0 : next - block.timestamp;
    }

    function canMine(address user) external view returns (bool) {
        return block.timestamp >= lastMineAt[user] + MINING_CYCLE;
    }

    function getUserStats(address user) external view returns (
        uint256 _totalEarned, uint256 _cycleCount,
        uint256 _lastMineAt,  uint256 _cooldown, bool _canMine
    ) {
        _totalEarned = totalEarned[user];
        _cycleCount  = cycleCount[user];
        _lastMineAt  = lastMineAt[user];
        uint256 next = lastMineAt[user] + MINING_CYCLE;
        _cooldown    = block.timestamp >= next ? 0 : next - block.timestamp;
        _canMine     = block.timestamp >= next;
    }

    function getAllocation() external pure returns (
        uint256 mining, uint256 investor, uint256 team, uint256 ecosystem, uint256 total
    ) { return (MINING_POOL, INVESTOR_POOL, TEAM_POOL, ECOSYSTEM_POOL, TOTAL_SUPPLY); }

    /// @notice Preview what reward tier would be awarded right now (read-only, no state change)
    function previewReward(address user) external view returns (uint256 reward, uint8 tier) {
        return _calculateReward(user);
    }

    // ─── Owner ────────────────────────────────────────────────────────────────

    function withdraw(uint256 amount) external onlyOwner {
        (bool sent,) = owner().call{value: amount}("");
        require(sent, "withdraw failed");
    }

    receive() external payable {}

    function _min(uint256 a, uint256 b) internal pure returns (uint256) { return a < b ? a : b; }
}
