require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * 🌌 MEEBOT HARDHAT CONFIGURATION (V3.0 - GRAND RESET)
 * @type import('hardhat/config').HardhatUserConfig
 * This version unifies the chainId to 31337 for consistency.
 */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun"
    },
  },
  networks: {
    // This is the network used by `npx hardhat node`
    hardhat: {
      chainId: 13390,
      hostname: '0.0.0.0', // Allows access from external URLs (like the forwarded port)
    },
    // This is a separate config for deploying to that running node
    localhost: {
      chainId: 13390, // Must match the running node's chainId
      url: "http://127.0.0.1:8545", // Points to the node running inside the container
    },
    // 📡 For future Testnet deployments
    ritual: {
      url: "https://rpc.meechain.run.place",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 13390, 
    }
  }
};
