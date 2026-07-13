// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/// @title Arc Builder NFT
/// @notice A limited NFT collection created for Arc Testnet.
contract ArcBuilderNFT is ERC721, Ownable {
    uint256 public constant MAX_SUPPLY = 100;
    uint256 public totalMinted;
    string private baseTokenURI;

    constructor(string memory initialBaseURI) ERC721("Arc Builder NFT", "ABNFT") Ownable(msg.sender) {
        baseTokenURI = initialBaseURI;
    }

    function mint(address recipient) external onlyOwner returns (uint256 tokenId) {
        require(recipient != address(0), "Invalid recipient");
        require(totalMinted < MAX_SUPPLY, "Maximum supply reached");

        tokenId = totalMinted + 1;
        totalMinted = tokenId;

        _safeMint(recipient, tokenId);
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
}
