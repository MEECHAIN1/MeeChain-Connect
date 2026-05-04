// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/health             ║
// ╚══════════════════════════════════════════════════════╝

import { getMeechainConfig } from './_shared/meechain-config.js';

export async function onRequestGet(ctx) {
  const { env } = ctx;
  const config = getMeechainConfig(env);

  const data = {
    status:    'ok',
    model:     'gpt-5-mini',
    bot:       'MeeBot AI',
    web3:      false,
    chainId:   config.chainId,
    rpc:       config.rpcPrimary,
    contracts: {
      ...config.contracts,
      staking: config.contracts.portal,
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
