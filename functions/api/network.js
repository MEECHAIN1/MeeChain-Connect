// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/network            ║
// ╚══════════════════════════════════════════════════════╝

import { resolveChainId, resolveContracts, resolveRpcUrl } from './_shared.mjs';

export async function onRequestGet(ctx) {
  const { env } = ctx;

  const chainId = resolveChainId(env);
  const data = {
    chainId:          `0x${chainId.toString(16)}`, // 0x344e
    chainName:        'MeeChain Ritual Chain',
    rpcUrls:          [
      resolveRpcUrl(env),
    ],
    nativeCurrency:   { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
    blockExplorerUrls:['http://explorer.meechain.run.place'],
    contracts: resolveContracts(env),
  };

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
