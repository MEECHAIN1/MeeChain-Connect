// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/web3/status        ║
// ╚══════════════════════════════════════════════════════╝

import { resolveChainId, resolveContracts, resolveRpcUrl } from '../_shared.mjs';

export async function onRequestGet(ctx) {
  const { env } = ctx;

  const rpcUrl = resolveRpcUrl(env);
  const chainId = resolveChainId(env);
  const contracts = resolveContracts(env);
import { getMeechainConfig } from '../_shared/meechain-config.js';

export async function onRequestGet(ctx) {
  const { env } = ctx;
  const config = getMeechainConfig(env);

  // Try to get block number via eth_blockNumber JSON-RPC
  let connected = false;
  let blockNumber = null;

  try {
    const resp = await fetch(config.rpcPrimary, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const json = await resp.json();
      blockNumber = parseInt(json.result, 16);
      connected = !isNaN(blockNumber);
    }
  } catch (_) {}

  return new Response(JSON.stringify({
    connected,
    blockNumber,
    rpc: config.rpcPrimary,
    chainId: config.chainId,
    contracts: config.contracts,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}
