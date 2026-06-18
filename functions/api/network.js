// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/network            ║
// ╚══════════════════════════════════════════════════════╝

import { resolveChainId, resolveContracts, resolveRpcUrl } from './_shared.mjs';
function buildRpcGateway(env = {}) {
  return {
    primary: {
      type: 'IPv4',
      address: env.RPC_PRIMARY_IPV4 || '172.64.36.1',
      badge: '🥇 Primary RPC',
    },
    secondary: {
      type: 'IPv6',
      address: env.RPC_SECONDARY_IPV6 || '2a06:98c1:54::4b:43e8',
      badge: '🥈 Secondary RPC',
    },
    dns: {
      dot: {
        endpoint: env.RPC_DOT_ENDPOINT || 'ohsut0yy6x.cloudflare-gateway.com',
        badge: '🔒 DoT Secured',
      },
      doh: {
        endpoint: env.RPC_DOH_ENDPOINT || 'https://ohsut0yy6x.cloudflare-gateway.com/dns-query',
        badge: '🔒 DoH Enabled',
      },
    },
    ritualFlow: [
      '✅ Set IPv4 as Primary',
      '✅ Add IPv6 as Fallback',
      '✅ Enable DoT',
      '✅ Enable DoH',
      '🎉 RPC Connection Tested',
    ],
  };
}
import { getMeechainConfig } from './_shared/meechain-config.js';

export async function onRequestGet(ctx) {
  const { env } = ctx;
  const config = getMeechainConfig(env);

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
    contracts: {
      token:   env.VITE_TOKEN_CONTRACT_ADDRESS   || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      nft:     env.VITE_NFT_CONTRACT_ADDRESS     || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      portal:  env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    },
    rpcGateway: buildRpcGateway(env),
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
