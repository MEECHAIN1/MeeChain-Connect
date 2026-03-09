// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/nodecloud/stats    ║
// ╚══════════════════════════════════════════════════════╝

export async function onRequestGet(ctx) {
  const { env } = ctx;

  // Try live NodeCloud API
  const statsKey = env.NODECLOUD_STATS_KEY || '';
  if (statsKey) {
    try {
      const resp = await fetch('https://api.nodecloud.io/v1/stats', {
        headers: {
          'Authorization': `Bearer ${statsKey}`,
          'Content-Type':  'application/json',
        },
        cf: { cacheTtl: 60 },
      });
      if (resp.ok) {
        const live = await resp.json();
        return new Response(JSON.stringify({ source: 'nodecloud_live', ...live }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    } catch (_) {}
  }

  // Fallback mock
  const data = {
    source:      'nodecloud_mock',
    uptime:      '99.98%',
    requests:    12453,
    cost:        '12.45 USDT',
    rpcEndpoint: env.DRPC_RPC_URL || 'http://rpc.meechain.run.place',
    chainId:     13390,
    network:     'MeeChain Ritual Chain',
    lastUpdated: new Date().toISOString(),
    keyHint:     statsKey ? statsKey.slice(0, 8) + '...' : 'not-configured',
    badges: {
      health:  'Bug Slayer',
      network: 'Chain Weaver',
      stats:   'Workspace Architect',
    },
    note: 'NodeCloud API unreachable — showing cached mock data',
  };

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
