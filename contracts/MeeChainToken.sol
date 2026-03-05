// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MeeChainToken (MEE) — ERC-20 Utility Token of MeeChain Platform
/// @notice Used for NFT purchases, staking rewards, and governance on Ritual Chain
contract MeeChainToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY   = 100_000_000 * 10**18; // 100M MEE
    uint256 public constant MINING_RATE  = 1e14;                  // 0.0001 MEE per block (1e14 wei)
    uint256 public immutable deployBlock;

    event Minted(address indexed to, uint256 amount);

    constructor() ERC20("MeeChain Token", "MEE") Ownable(msg.sender) {
        deployBlock = block.number;
        // Initial supply: 10M to deployer (treasury)
        _mint(msg.sender, 10_000_000 * 10**18);
    }

    /// @notice Mint tokens (owner only) — used for staking rewards & airdrops
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "MEE: exceeds max supply");
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /// @notice Transfer tokens — standard ERC-20
    function transfer(address to, uint256 amount) public override returns (bool) {
        return super.transfer(to, amount);
    }

    /// @notice Get MEE price in mock USDT (0.0842 USDT = 842e14 wei for display)
    function getMockPrice() external pure returns (uint256) {
        return 842e14; // 0.0842 USDT in wei equivalent
    }

    /// @notice Total blocks mined since deployment
    function blocksSinceDeploy() external view returns (uint256) {
        return block.number - deployBlock;
    }
}
