export const DEFAULT_CHAIN_ID = 13390;
export const DEFAULT_RPC_URL = 'https://rpc.meechain.live';

export const DEFAULT_CONTRACTS = {
  token: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  nft: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  portal: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
};

export function resolveChainId(env) {
  return Number.parseInt(env.CHAIN_ID || String(DEFAULT_CHAIN_ID), 10);
}

export function resolveRpcUrl(env) {
  return env.DRPC_RPC_URL || env.VITE_RPC_URL || DEFAULT_RPC_URL;
}

export function resolveContracts(env) {
  return {
    token: env.VITE_TOKEN_CONTRACT_ADDRESS || DEFAULT_CONTRACTS.token,
    nft: env.VITE_NFT_CONTRACT_ADDRESS || DEFAULT_CONTRACTS.nft,
    portal: env.VITE_STAKING_CONTRACT_ADDRESS || DEFAULT_CONTRACTS.portal,
  };
}
