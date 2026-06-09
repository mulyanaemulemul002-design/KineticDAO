// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title KineticDAO — Ad-to-Earn Mining Protocol
/// @notice Watch ads to trigger 12-hour mining cycles and earn X1T tokens
/// @dev X1T Ecochain (Maculatus Testnet, Chain ID: 10778)
contract KineticDAO is Ownable, ReentrancyGuard {

    // ─── Token Allocation (500M total, in wei) ────────────────────────────────
    uint256 public constant TOTAL_SUPPLY   = 500_000_000 ether;
    uint256 public constant MINING_POOL    = 300_000_000 ether;
    uint256 public constant INVESTOR_POOL  =  75_000_000 ether;
    uint256 public constant TEAM_POOL      =  50_000_000 ether;
    uint256 public constant ECOSYSTEM_POOL =  75_000_000 ether;

    // ─── Mining Parameters ────────────────────────────────────────────────────
    uint256 public constant MINING_CYCLE = 12 hours;
    uint256 public minReward             = 1_000 ether;
    uint256 public maxReward             = 50_000 ether;

    // ─── State ────────────────────────────────────────────────────────────────
    uint256 public miningPoolRemaining    = MINING_POOL;
    uint256 public totalMinedTokens;
    uint256 public totalMiningCycles;
    uint256 public uniqueMiners;

    mapping(address => uint256) public lastMineAt;
    mapping(address => uint256) public totalEarned;
    mapping(address => uint256) public cycleCount;
    mapping(address => bool)    private _hasEverMined;

    // ─── Events ───────────────────────────────────────────────────────────────
    event AdWatched(address indexed user, uint256 timestamp, uint256 reward);
    event MiningCycleCompleted(
        address indexed user, uint256 indexed cycleId,
        uint256 reward, uint256 timestamp, uint256 poolRemaining
    );
    event RewardRangeUpdated(uint256 newMin, uint256 newMax);

    constructor() Ownable(msg.sender) {}

    // ─── Core ─────────────────────────────────────────────────────────────────

    function mine() external nonReentrant returns (uint256 reward) {
        require(block.timestamp >= lastMineAt[msg.sender] + MINING_CYCLE, "KineticDAO: cooldown active");
        require(miningPoolRemaining > 0, "KineticDAO: pool depleted");
        require(address(this).balance >= minReward, "KineticDAO: low balance");

        uint256 rand = uint256(keccak256(abi.encodePacked(
            block.timestamp, block.prevrandao, msg.sender, totalMiningCycles
        ))) % (maxReward - minReward + 1);
        reward = minReward + rand;

        uint256 cap = _min(miningPoolRemaining, address(this).balance);
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

        emit AdWatched(msg.sender, block.timestamp, reward);
        emit MiningCycleCompleted(msg.sender, totalMiningCycles, reward, block.timestamp, miningPoolRemaining);

        (bool sent,) = msg.sender.call{value: reward}("");
        require(sent, "KineticDAO: transfer failed");
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

    // ─── Owner ────────────────────────────────────────────────────────────────

    function setRewardRange(uint256 _min, uint256 _max) external onlyOwner {
        require(_min > 0 && _max > _min, "invalid range");
        minReward = _min; maxReward = _max;
        emit RewardRangeUpdated(_min, _max);
    }

    function withdraw(uint256 amount) external onlyOwner {
        (bool sent,) = owner().call{value: amount}("");
        require(sent, "withdraw failed");
    }

    receive() external payable {}

    function _min(uint256 a, uint256 b) internal pure returns (uint256) { return a < b ? a : b; }
}
