import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// Priority: explicit env var > DRPC_RPC_URL > fallback to official MeeChain RPC
const RITUAL_RPC  = process.env.RITUAL_RPC_URL
  || process.env.DRPC_RPC_URL
  || process.env.VITE_RPC_URL
  || "https://rpc.meechain.live";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    ritual: {
      url: RITUAL_RPC,
      chainId: 13390,
      accounts: [PRIVATE_KEY],
      timeout: 120000,
      gasPrice: "auto",
    },
    // Alias for deploy-governance.js compatibility
    mock: {
      url: "http://meechain-mock-rpc:8545",
      chainId: 31337,
      accounts: [PRIVATE_KEY],
    },
  },
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
