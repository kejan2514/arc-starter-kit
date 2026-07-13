// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/// @title Arc Token Faucet
/// @notice Distributes test ABT tokens to users at fixed intervals.
contract ArcTokenFaucet is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    uint256 public claimAmount = 100 ether;
    uint256 public cooldown = 1 days;

    mapping(address => uint256) public lastClaimAt;

    event TokensClaimed(address indexed account, uint256 amount, uint256 nextClaimAt);
    event ClaimAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event CooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
    event TokensWithdrawn(address indexed recipient, uint256 amount);

    constructor(address tokenAddress) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Invalid token address");
        token = IERC20(tokenAddress);
    }

    function claim() external nonReentrant {
        require(block.timestamp >= lastClaimAt[msg.sender] + cooldown, "Claim cooldown is active");
        require(token.balanceOf(address(this)) >= claimAmount, "Faucet has insufficient tokens");

        lastClaimAt[msg.sender] = block.timestamp;
        token.safeTransfer(msg.sender, claimAmount);

        emit TokensClaimed(msg.sender, claimAmount, block.timestamp + cooldown);
    }

    function nextClaimAt(address account) external view returns (uint256) {
        return lastClaimAt[account] + cooldown;
    }

    function canClaim(address account) external view returns (bool) {
        return block.timestamp >= lastClaimAt[account] + cooldown && token.balanceOf(address(this)) >= claimAmount;
    }

    function setClaimAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Amount must be greater than zero");

        uint256 oldAmount = claimAmount;
        claimAmount = newAmount;

        emit ClaimAmountUpdated(oldAmount, newAmount);
    }

    function setCooldown(uint256 newCooldown) external onlyOwner {
        require(newCooldown > 0, "Cooldown must be greater than zero");

        uint256 oldCooldown = cooldown;
        cooldown = newCooldown;

        emit CooldownUpdated(oldCooldown, newCooldown);
    }

    function withdrawTokens(address recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");

        token.safeTransfer(recipient, amount);
        emit TokensWithdrawn(recipient, amount);
    }
}
