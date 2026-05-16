export function getMeechainConfig(env = {}) {
  const chainId = parseInt(env.CHAIN_ID || '13390', 10);
  const rpcPrimary = env.DRPC_RPC_URL || 'https://rpc.meechain.live';
  const rpcFallback = env.VITE_RPC_URL || rpcPrimary;

  const contracts = {
    token: env.VITE_TOKEN_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    nft: env.VITE_NFT_CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    portal: env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  };

  return {
    chainId,
    chainIdHex: `0x${chainId.toString(16)}`,
    rpcPrimary,
    rpcUrls: Array.from(new Set([rpcPrimary, rpcFallback])),
    contracts,
  };
}
