// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/health             ║
// ╚══════════════════════════════════════════════════════╝

import { resolveChainId, resolveContracts, resolveRpcUrl } from './_shared.mjs';
import { getMeechainConfig } from './_shared/meechain-config.js';

export async function onRequestGet(ctx) {
  const { env } = ctx;
  const config = getMeechainConfig(env);

  const contracts = resolveContracts(env);

  const data = {
    status:    'ok',
    model:     'gpt-5-mini',
    bot:       'MeeBot AI',
    web3:      false,
    chainId:   resolveChainId(env),
    rpc:       resolveRpcUrl(env),
    contracts: {
      token: contracts.token,
      nft: contracts.nft,
      staking: contracts.portal,
    chainId:   config.chainId,
    rpc:       config.rpcPrimary,
    contracts: {
      token: config.contracts.token,
      nft: config.contracts.nft,
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
