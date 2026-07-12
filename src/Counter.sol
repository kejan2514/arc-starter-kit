// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Arc Counter
/// @notice A simple counter contract built for Arc Testnet.
contract Counter {
    uint256 public number;
    address public owner;

    event NumberUpdated(uint256 newNumber, address indexed updatedBy);

    constructor() {
        owner = msg.sender;
    }

    function setNumber(uint256 newNumber) external {
        number = newNumber;
        emit NumberUpdated(newNumber, msg.sender);
    }

    function increment() external {
        number += 1;
        emit NumberUpdated(number, msg.sender);
    }

    function reset() external {
        require(msg.sender == owner, "Only owner can reset");
        number = 0;
        emit NumberUpdated(0, msg.sender);
    }
}
