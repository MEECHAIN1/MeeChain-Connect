// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/web3/status        ║
// ╚══════════════════════════════════════════════════════╝

export async function onRequestGet(ctx) {
  const { env } = ctx;

  const rpcUrl   = env.DRPC_RPC_URL || 'http://rpc.meechain.run.place';
  const chainId  = parseInt(env.CHAIN_ID || '13390', 10);
  const contracts = {
    token:   env.VITE_TOKEN_CONTRACT_ADDRESS   || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    nft:     env.VITE_NFT_CONTRACT_ADDRESS     || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    portal:  env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  };

  // Try to get block number via eth_blockNumber JSON-RPC
  let connected    = false;
  let blockNumber  = null;

  try {
    const resp = await fetch(rpcUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const json  = await resp.json();
      blockNumber = parseInt(json.result, 16);
      connected   = !isNaN(blockNumber);
    }
  } catch (_) {}

  return new Response(JSON.stringify({
    connected, blockNumber,
    rpc: rpcUrl, chainId, contracts,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}
