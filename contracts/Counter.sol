// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Simple Counter Contract
/// @notice A basic counter example for developers learning Arc.
contract Counter {
    uint256 public count;

    event CounterUpdated(uint256 newValue);

    function increment() public {
        count += 1;
        emit CounterUpdated(count);
    }

    function decrement() public {
        require(count > 0, "Counter cannot go below zero");
        count -= 1;
        emit CounterUpdated(count);
    }

    function reset() public {
        count = 0;
        emit CounterUpdated(count);
    }
}
