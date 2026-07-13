// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @title Arc Builder Token
/// @notice A fixed-supply ERC-20 token deployed for learning on Arc Testnet.
contract ArcBuilderToken is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 ether;

    constructor() ERC20("Arc Builder Token", "ABT") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
