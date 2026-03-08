// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MeeBotNFT is ERC721Enumerable, Ownable {
    uint256 public tokenCounter;
    mapping(uint256 => string) private _tokenURIs;

    constructor(address initialOwner) ERC721("MeeBotRitual", "MBR") Ownable(initialOwner) {
        tokenCounter = 0;
    }

    function safeMint(address to) public {
        uint256 tokenId = tokenCounter;
        _safeMint(to, tokenId);
        tokenCounter++;
    }

    function mintMeeBot(string memory uri) public {
        uint256 tokenId = tokenCounter;
        _safeMint(msg.sender, tokenId);
        _tokenURIs[tokenId] = uri;
        tokenCounter++;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }
}
