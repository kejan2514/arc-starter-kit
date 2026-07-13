// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/// @title Arc NFT Marketplace
/// @notice Buy and sell ERC-721 NFTs using an ERC-20 payment token.
contract ArcNFTMarketplace is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    IERC20 public immutable paymentToken;

    uint256 public platformFeeBps = 250; // 2.5%
    address public feeRecipient;
    uint256 public nextListingId = 1;

    mapping(uint256 => Listing) public listings;

    event NFTListed(
        uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price
    );

    event NFTPurchased(
        uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 price, uint256 platformFee
    );

    event ListingCancelled(uint256 indexed listingId, address indexed seller);

    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    constructor(address paymentTokenAddress, address initialFeeRecipient) Ownable(msg.sender) {
        require(paymentTokenAddress != address(0), "Invalid payment token");
        require(initialFeeRecipient != address(0), "Invalid fee recipient");

        paymentToken = IERC20(paymentTokenAddress);
        feeRecipient = initialFeeRecipient;
    }

    function listNFT(address nftContract, uint256 tokenId, uint256 price)
        external
        nonReentrant
        returns (uint256 listingId)
    {
        require(nftContract != address(0), "Invalid NFT contract");
        require(price > 0, "Price must be greater than zero");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not NFT owner");

        nft.transferFrom(msg.sender, address(this), tokenId);

        listingId = nextListingId;
        nextListingId += 1;

        listings[listingId] =
            Listing({seller: msg.sender, nftContract: nftContract, tokenId: tokenId, price: price, active: true});

        emit NFTListed(listingId, msg.sender, nftContract, tokenId, price);
    }

    function buyNFT(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];

        require(listing.active, "Listing is not active");
        require(msg.sender != listing.seller, "Seller cannot buy own NFT");

        listing.active = false;

        uint256 platformFee = (listing.price * platformFeeBps) / 10_000;
        uint256 sellerAmount = listing.price - platformFee;

        paymentToken.safeTransferFrom(msg.sender, listing.seller, sellerAmount);

        if (platformFee > 0) {
            paymentToken.safeTransferFrom(msg.sender, feeRecipient, platformFee);
        }

        IERC721(listing.nftContract).safeTransferFrom(address(this), msg.sender, listing.tokenId);

        emit NFTPurchased(listingId, msg.sender, listing.seller, listing.price, platformFee);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];

        require(listing.active, "Listing is not active");
        require(listing.seller == msg.sender, "Not listing seller");

        listing.active = false;

        IERC721(listing.nftContract).safeTransferFrom(address(this), listing.seller, listing.tokenId);

        emit ListingCancelled(listingId, msg.sender);
    }

    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1_000, "Fee cannot exceed 10%");

        uint256 oldFeeBps = platformFeeBps;
        platformFeeBps = newFeeBps;

        emit PlatformFeeUpdated(oldFeeBps, newFeeBps);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid fee recipient");

        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;

        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }
}
