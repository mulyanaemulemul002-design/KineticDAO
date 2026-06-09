// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title KineticDAO Ad-to-Earn Protocol
/// @notice Records ad impressions on-chain and distributes X1T rewards
/// @dev Deployed on X1T Ecochain (Maculatus Testnet, Chain ID: 10778)
contract KineticDAO is Ownable, ReentrancyGuard {

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a user watches an ad and receives a reward
    /// @param user     The address of the participant
    /// @param timestamp Unix timestamp of the impression
    /// @param reward   Amount of X1T (in wei) rewarded
    event AdWatched(
        address indexed user,
        uint256 timestamp,
        uint256 reward
    );

    /// @notice Emitted when the reward rate is updated by the owner
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    /// @notice Emitted when the contract receives X1T funding
    event FundsDeposited(address indexed funder, uint256 amount);

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Base reward per ad view (in wei). Default: 0.01 X1T
    uint256 public rewardPerView = 0.01 ether;

    /// @notice Minimum cooldown between views per user (seconds)
    uint256 public cooldownSeconds = 60;

    /// @notice Tracks last view timestamp per user
    mapping(address => uint256) public lastViewAt;

    /// @notice Total impressions recorded
    uint256 public totalImpressions;

    /// @notice Total X1T distributed (in wei)
    uint256 public totalDistributed;

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Core Logic ───────────────────────────────────────────────────────────

    /// @notice Record an ad impression and transfer reward to caller
    /// @dev Enforces cooldown and emits AdWatched event
    function watchAd() external nonReentrant {
        require(
            block.timestamp >= lastViewAt[msg.sender] + cooldownSeconds,
            "KineticDAO: cooldown not elapsed"
        );
        require(
            address(this).balance >= rewardPerView,
            "KineticDAO: insufficient contract balance"
        );

        lastViewAt[msg.sender] = block.timestamp;
        totalImpressions += 1;
        totalDistributed += rewardPerView;

        emit AdWatched(msg.sender, block.timestamp, rewardPerView);

        (bool sent, ) = msg.sender.call{value: rewardPerView}("");
        require(sent, "KineticDAO: reward transfer failed");
    }

    // ─── Owner Functions ──────────────────────────────────────────────────────

    /// @notice Update the reward per ad view
    function setRewardPerView(uint256 newRate) external onlyOwner {
        emit RewardRateUpdated(rewardPerView, newRate);
        rewardPerView = newRate;
    }

    /// @notice Update the cooldown between views
    function setCooldown(uint256 seconds_) external onlyOwner {
        cooldownSeconds = seconds_;
    }

    /// @notice Withdraw contract balance (emergency)
    function withdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "KineticDAO: insufficient balance");
        (bool sent, ) = owner().call{value: amount}("");
        require(sent, "KineticDAO: withdrawal failed");
    }

    // ─── Funding ──────────────────────────────────────────────────────────────

    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }

    /// @notice Query how much time remains before user can view again
    function cooldownRemaining(address user) external view returns (uint256) {
        uint256 elapsed = block.timestamp - lastViewAt[user];
        if (elapsed >= cooldownSeconds) return 0;
        return cooldownSeconds - elapsed;
    }
}
