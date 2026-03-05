// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MeeBotNFT (MEEBOT) — ERC-721 NFT Collection on MeeChain
/// @notice Collectible MeeBot characters with rarity tiers (Legendary/Rare/Common)
contract MeeBotNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    uint256 public constant MINT_PRICE = 5 * 10**18;  // 5 MEE to mint
    uint256 public constant MAX_TOKENS = 10_000;

    enum Rarity { Common, Rare, Legendary }

    struct NFTAttributes {
        Rarity  rarity;
        uint256 power;
        uint256 speed;
        string  element;
        string  botType;
        uint256 mintedAt;
    }

    mapping(uint256 => NFTAttributes) public attributes;

    event MeeBotMinted(address indexed to, uint256 indexed tokenId, Rarity rarity);
    event MeeBotTransferred(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor() ERC721("MeeBotNFT", "MEEBOT") Ownable(msg.sender) {}

    /// @notice Mint a new MeeBot NFT (payable in native token for demo; in prod use MEE ERC-20)
    function safeMint(address to, string memory uri) public onlyOwner returns (uint256) {
        require(_tokenIdCounter < MAX_TOKENS, "MeeBot: max supply reached");
        uint256 tokenId = _tokenIdCounter++;

        // Pseudo-random rarity based on block data
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, tokenId))) % 100;
        Rarity rarity;
        uint256 power;
        uint256 speed;

        if (rand < 5) {
            rarity = Rarity.Legendary;
            power  = 9500 + (rand * 50);
            speed  = 9200 + (rand * 40);
        } else if (rand < 30) {
            rarity = Rarity.Rare;
            power  = 6000 + (rand * 80);
            speed  = 5500 + (rand * 70);
        } else {
            rarity = Rarity.Common;
            power  = 2000 + (rand * 50);
            speed  = 1800 + (rand * 45);
        }

        string[6] memory elements = ["Fire", "Water", "Earth", "Wind", "Lightning", "Void"];
        string[4] memory botTypes = ["Alpha Bot", "Warrior Bot", "Lotus Bot", "Ritual Bot"];

        attributes[tokenId] = NFTAttributes({
            rarity:   rarity,
            power:    power,
            speed:    speed,
            element:  elements[rand % 6],
            botType:  botTypes[rand % 4],
            mintedAt: block.timestamp
        });

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit MeeBotMinted(to, tokenId, rarity);
        return tokenId;
    }

    /// @notice Batch mint (owner only) for airdrop
    function batchMint(address[] calldata recipients, string[] calldata uris) external onlyOwner {
        require(recipients.length == uris.length, "MeeBot: length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            safeMint(recipients[i], uris[i]);
        }
    }

    /// @notice Get full attributes of a token
    function getAttributes(uint256 tokenId) external view returns (NFTAttributes memory) {
        require(_ownerOf(tokenId) != address(0), "MeeBot: token does not exist");
        return attributes[tokenId];
    }

    /// @notice Get rarity label string
    function getRarityLabel(uint256 tokenId) external view returns (string memory) {
        Rarity r = attributes[tokenId].rarity;
        if (r == Rarity.Legendary) return "Legendary";
        if (r == Rarity.Rare)      return "Rare";
        return "Common";
    }

    // ── Required overrides ─────────────────────────────────────────
    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721, ERC721Enumerable) returns (address)
    {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) {
            emit MeeBotTransferred(from, to, tokenId);
        }
        return from;
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
