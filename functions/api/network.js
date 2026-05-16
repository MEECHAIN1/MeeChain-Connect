// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/network            ║
// ╚══════════════════════════════════════════════════════╝

import { getMeechainConfig } from './_shared/meechain-config.js';

export async function onRequestGet(ctx) {
  const { env } = ctx;
  const config = getMeechainConfig(env);

  const data = {
    chainId: config.chainIdHex,
    chainName: 'MeeChain Ritual Chain',
    rpcUrls: config.rpcUrls,
    nativeCurrency: { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
    blockExplorerUrls: ['http://explorer.meechain.run.place'],
    contracts: config.contracts,
  };

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
