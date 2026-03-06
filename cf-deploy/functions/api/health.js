// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/health             ║
// ╚══════════════════════════════════════════════════════╝

export async function onRequestGet(ctx) {
  const { env } = ctx;

  const data = {
    status:    'ok',
    model:     'gpt-5-mini',
    bot:       'MeeBot AI',
    web3:      false,
    chainId:   13390,
    rpc:       env.DRPC_RPC_URL || 'http://rpc.meechain.run.place',
    contracts: {
      token:   env.VITE_TOKEN_CONTRACT_ADDRESS   || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      nft:     env.VITE_NFT_CONTRACT_ADDRESS     || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      staking: env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    },
    domain:    'meebot.io',
    version:   '2.0.0',
  };

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}
