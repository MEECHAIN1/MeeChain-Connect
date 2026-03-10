// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/network            ║
// ╚══════════════════════════════════════════════════════╝

export async function onRequestGet(ctx) {
  const { env } = ctx;

  const chainId = parseInt(env.CHAIN_ID || '13390', 10);
  const data = {
    chainId:          `0x${chainId.toString(16)}`, // 0x344e
    chainName:        'MeeChain Ritual Chain',
    rpcUrls:          [
      env.DRPC_RPC_URL    || 'http://rpc.meechain.run.place',
      env.VITE_RPC_URL    || 'https://ritual-chain--pouaun2499.replit.app',
    ],
    nativeCurrency:   { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
    blockExplorerUrls:['http://explorer.meechain.run.place'],
    contracts: {
      token:   env.VITE_TOKEN_CONTRACT_ADDRESS   || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      nft:     env.VITE_NFT_CONTRACT_ADDRESS     || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      portal:  env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    },
  };

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
