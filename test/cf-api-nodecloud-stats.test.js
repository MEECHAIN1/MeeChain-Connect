'use strict';
/**
 * Tests for cf-deploy/functions/api/nodecloud/stats.js
 *
 * Tests the Cloudflare Pages Function that proxies NodeCloud API stats,
 * falling back to mock data when the API is unreachable or unconfigured.
 * Logic is replicated from the source file.
 *
 * Function under test: onRequestGet(ctx)
 *
 * Key behaviours:
 *   - No NODECLOUD_STATS_KEY → mock data with source: 'nodecloud_mock'
 *   - keyHint is 'not-configured' when no key
 *   - With key but fetch fails → falls back to mock
 *   - With key but fetch returns non-ok → falls back to mock
 *   - With key and fetch succeeds → returns live data with source: 'nodecloud_live'
 *   - keyHint is first 8 chars + '...' when key is present (even on mock path)
 *   - Mock data has required fields
 *   - CORS headers always present
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/nodecloud/stats.js

async function onRequestGet(ctx) {
  const { env } = ctx;

  const statsKey = env.NODECLOUD_STATS_KEY || '';
  if (statsKey) {
    try {
      const resp = await globalThis.fetch('https://api.nodecloud.io/v1/stats', {
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

// ── Helpers ───────────────────────────────────────────────────────────────

function mkCtx(env = {}) {
  return { env };
}

// ── fetch mock management ─────────────────────────────────────────────────

let _originalFetch;
beforeEach(() => {
  _originalFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = _originalFetch;
});

// ── Tests: no API key configured ───────────────────────────────────────────

describe('/api/nodecloud/stats (CF) — no NODECLOUD_STATS_KEY', () => {
  it('responds with HTTP 200', async () => {
    const res = await onRequestGet(mkCtx());
    assert.strictEqual(res.status, 200);
  });

  it('source is "nodecloud_mock"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.source, 'nodecloud_mock');
  });

  it('keyHint is "not-configured"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.keyHint, 'not-configured');
  });

  it('mock data has uptime field', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok('uptime' in body, 'must have uptime');
    assert.strictEqual(body.uptime, '99.98%');
  });

  it('mock data has requests field (numeric)', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok('requests' in body);
    assert.strictEqual(typeof body.requests, 'number');
  });

  it('mock data has chainId 13390', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.chainId, 13390);
  });

  it('mock data has network "MeeChain Ritual Chain"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.network, 'MeeChain Ritual Chain');
  });

  it('mock data has lastUpdated as ISO timestamp', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok(typeof body.lastUpdated === 'string');
    assert.ok(!isNaN(Date.parse(body.lastUpdated)), 'lastUpdated must be parseable ISO timestamp');
  });

  it('mock data has badges object with health, network, stats', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok(body.badges, 'must have badges');
    assert.ok('health' in body.badges);
    assert.ok('network' in body.badges);
    assert.ok('stats' in body.badges);
  });

  it('mock data uses default rpcEndpoint when DRPC_RPC_URL not set', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.rpcEndpoint, 'http://rpc.meechain.run.place');
  });

  it('mock data uses DRPC_RPC_URL env var when set', async () => {
    const res = await onRequestGet(mkCtx({ DRPC_RPC_URL: 'https://custom-rpc.example.com' }));
    const body = await res.json();
    assert.strictEqual(body.rpcEndpoint, 'https://custom-rpc.example.com');
  });

  it('note field mentions "mock data"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok(typeof body.note === 'string');
    assert.ok(body.note.toLowerCase().includes('mock'));
  });
});

// ── Tests: API key present but fetch fails ─────────────────────────────────

describe('/api/nodecloud/stats (CF) — key present but fetch throws', () => {
  it('falls back to mock when fetch throws', async () => {
    globalThis.fetch = async () => { throw new Error('Network error'); };

    const res = await onRequestGet(mkCtx({ NODECLOUD_STATS_KEY: 'nk-secret' }));
    const body = await res.json();
    assert.strictEqual(body.source, 'nodecloud_mock');
  });

  it('keyHint is first 8 chars of key when key is present', async () => {
    globalThis.fetch = async () => { throw new Error('Network error'); };

    const res = await onRequestGet(mkCtx({ NODECLOUD_STATS_KEY: 'abcdefgh1234' }));
    const body = await res.json();
    assert.strictEqual(body.keyHint, 'abcdefgh...');
  });

  it('falls back to mock when fetch returns non-ok status', async () => {
    globalThis.fetch = async () => new Response('Unauthorized', { status: 401 });

    const res = await onRequestGet(mkCtx({ NODECLOUD_STATS_KEY: 'nk-bad' }));
    const body = await res.json();
    assert.strictEqual(body.source, 'nodecloud_mock');
  });

  it('still responds HTTP 200 on fetch failure', async () => {
    globalThis.fetch = async () => { throw new Error('Timeout'); };

    const res = await onRequestGet(mkCtx({ NODECLOUD_STATS_KEY: 'nk-secret' }));
    assert.strictEqual(res.status, 200);
  });
});

// ── Tests: live data path ──────────────────────────────────────────────────

describe('/api/nodecloud/stats (CF) — live NodeCloud API path', () => {
  it('returns source: nodecloud_live when API returns ok', async () => {
    const liveData = { nodes: 10, health: 'good' };
    globalThis.fetch = async () => new Response(JSON.stringify(liveData), { status: 200 });

    const res = await onRequestGet(mkCtx({ NODECLOUD_STATS_KEY: 'nk-valid' }));
    const body = await res.json();
    assert.strictEqual(body.source, 'nodecloud_live');
  });

  it('live response merges nodecloud data into response', async () => {
    const liveData = { nodes: 42, health: 'excellent' };
    globalThis.fetch = async () => new Response(JSON.stringify(liveData), { status: 200 });

    const res = await onRequestGet(mkCtx({ NODECLOUD_STATS_KEY: 'nk-valid' }));
    const body = await res.json();
    assert.strictEqual(body.nodes, 42);
    assert.strictEqual(body.health, 'excellent');
  });

  it('sends Authorization Bearer header with the key', async () => {
    let capturedHeaders = null;
    globalThis.fetch = async (url, opts) => {
      capturedHeaders = opts.headers;
      return new Response(JSON.stringify({}), { status: 200 });
    };

    await onRequestGet(mkCtx({ NODECLOUD_STATS_KEY: 'nk-mykey' }));
    assert.strictEqual(capturedHeaders['Authorization'], 'Bearer nk-mykey');
  });

  it('calls correct NodeCloud stats URL', async () => {
    let calledUrl = '';
    globalThis.fetch = async (url) => {
      calledUrl = url;
      return new Response(JSON.stringify({}), { status: 200 });
    };

    await onRequestGet(mkCtx({ NODECLOUD_STATS_KEY: 'nk-test' }));
    assert.strictEqual(calledUrl, 'https://api.nodecloud.io/v1/stats');
  });
});

// ── Tests: response headers ────────────────────────────────────────────────

describe('/api/nodecloud/stats (CF) — response headers', () => {
  it('Content-Type is application/json (mock path)', async () => {
    const res = await onRequestGet(mkCtx());
    assert.ok((res.headers.get('Content-Type') || '').includes('application/json'));
  });

  it('Access-Control-Allow-Origin is * (mock path)', async () => {
    const res = await onRequestGet(mkCtx());
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('Access-Control-Allow-Origin is * (live path)', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 200 });
    const res = await onRequestGet(mkCtx({ NODECLOUD_STATS_KEY: 'nk-valid' }));
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  });
});

// ── Tests: regression ─────────────────────────────────────────────────────

describe('/api/nodecloud/stats (CF) — regression: mock data shape', () => {
  const REQUIRED_MOCK_FIELDS = [
    'source', 'uptime', 'requests', 'cost', 'rpcEndpoint',
    'chainId', 'network', 'lastUpdated', 'keyHint', 'badges', 'note',
  ];

  it('mock response contains all required fields', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    for (const field of REQUIRED_MOCK_FIELDS) {
      assert.ok(field in body, `mock response must include field: ${field}`);
    }
  });

  it('badge values are non-empty strings', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    for (const [key, val] of Object.entries(body.badges)) {
      assert.ok(typeof val === 'string' && val.length > 0, `badges.${key} must be non-empty string`);
    }
  });
});