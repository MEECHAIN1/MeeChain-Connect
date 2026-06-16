'use strict';
/**
 * Tests for the Cloudflare Pages Function: cf-deploy/functions/api/nodecloud/stats.js
 *
 * Handler under test: onRequestGet(ctx) — cf-deploy/functions/api/nodecloud/stats.js
 *
 * Behaviour:
 *   - When NODECLOUD_STATS_KEY is not set → returns mock data (source: 'nodecloud_mock')
 *   - When NODECLOUD_STATS_KEY is set AND the live API returns ok → returns live data
 *     (source: 'nodecloud_live' prepended to live JSON)
 *   - When NODECLOUD_STATS_KEY is set AND the live API returns non-ok → falls back to mock
 *   - When NODECLOUD_STATS_KEY is set AND the live API throws → falls back to mock
 *   - Mock data fields: source, uptime, requests, cost, rpcEndpoint, chainId, network,
 *     lastUpdated, keyHint, badges, note
 *   - keyHint is 'not-configured' when no key
 *   - keyHint is first 8 chars + '...' when key is present
 *   - rpcEndpoint uses env.DRPC_RPC_URL or default 'http://rpc.meechain.run.place'
 *   - lastUpdated is a valid ISO 8601 date string
 *   - chainId is always 13390
 *   - network is always 'MeeChain Ritual Chain'
 *   - Response headers: Content-Type application/json, Access-Control-Allow-Origin: *
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/nodecloud/stats.js ─

async function onRequestGet(ctx) {
  const { env, _fetch } = ctx;

  const statsKey = env.NODECLOUD_STATS_KEY || '';
  if (statsKey) {
    try {
      const resp = await _fetch('https://api.nodecloud.io/v1/stats', {
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

// ── Helpers ───────────────────────────────────────────────────────────────

function makeCtx(env = {}, fetchImpl = null) {
  return {
    env,
    _fetch: fetchImpl || (() => { throw new Error('unexpected fetch call'); }),
  };
}

async function getBody(env = {}, fetchImpl = null) {
  const resp = await onRequestGet(makeCtx(env, fetchImpl));
  const text = await resp.text();
  return { resp, body: JSON.parse(text) };
}

// ── Tests: no NODECLOUD_STATS_KEY — mock fallback ─────────────────────────

describe('/api/nodecloud/stats (CF) — no API key, mock data', () => {
  it('source is "nodecloud_mock" when no key set', async () => {
    const { body } = await getBody({});
    assert.strictEqual(body.source, 'nodecloud_mock');
  });

  it('keyHint is "not-configured" when no key set', async () => {
    const { body } = await getBody({});
    assert.strictEqual(body.keyHint, 'not-configured');
  });

  it('uptime field is present', async () => {
    const { body } = await getBody({});
    assert.ok('uptime' in body);
    assert.strictEqual(body.uptime, '99.98%');
  });

  it('requests field is 12453', async () => {
    const { body } = await getBody({});
    assert.strictEqual(body.requests, 12453);
  });

  it('cost field is "12.45 USDT"', async () => {
    const { body } = await getBody({});
    assert.strictEqual(body.cost, '12.45 USDT');
  });

  it('chainId is 13390', async () => {
    const { body } = await getBody({});
    assert.strictEqual(body.chainId, 13390);
  });

  it('network is "MeeChain Ritual Chain"', async () => {
    const { body } = await getBody({});
    assert.strictEqual(body.network, 'MeeChain Ritual Chain');
  });

  it('lastUpdated is a valid ISO 8601 date string', async () => {
    const { body } = await getBody({});
    assert.ok(typeof body.lastUpdated === 'string', 'lastUpdated must be a string');
    const d = new Date(body.lastUpdated);
    assert.ok(!isNaN(d.getTime()), 'lastUpdated must be a valid date');
    assert.ok(body.lastUpdated.includes('T'), 'must be ISO 8601 format');
  });

  it('note field indicates mock data', async () => {
    const { body } = await getBody({});
    assert.ok(typeof body.note === 'string' && body.note.length > 0);
    assert.ok(body.note.toLowerCase().includes('mock') || body.note.toLowerCase().includes('cached'));
  });

  it('badges object has health, network, and stats fields', async () => {
    const { body } = await getBody({});
    assert.ok(body.badges, 'badges must be present');
    assert.ok('health'  in body.badges);
    assert.ok('network' in body.badges);
    assert.ok('stats'   in body.badges);
  });

  it('rpcEndpoint defaults to http://rpc.meechain.run.place', async () => {
    const { body } = await getBody({});
    assert.strictEqual(body.rpcEndpoint, 'http://rpc.meechain.run.place');
  });

  it('rpcEndpoint uses DRPC_RPC_URL env var when set', async () => {
    const { body } = await getBody({ DRPC_RPC_URL: 'https://custom.rpc.example' });
    assert.strictEqual(body.rpcEndpoint, 'https://custom.rpc.example');
  });
});

// ── Tests: NODECLOUD_STATS_KEY present, live API succeeds ─────────────────

describe('/api/nodecloud/stats (CF) — with API key, live API succeeds', () => {
  it('source is "nodecloud_live"', async () => {
    const liveData = { uptime: '99.99%', requests: 9999 };
    const fetchImpl = async () => ({
      ok: true,
      json: async () => liveData,
    });
    const { body } = await getBody({ NODECLOUD_STATS_KEY: 'my-api-key' }, fetchImpl);
    assert.strictEqual(body.source, 'nodecloud_live');
  });

  it('live data fields are merged into response', async () => {
    const liveData = { customField: 'live-value', count: 42 };
    const fetchImpl = async () => ({
      ok: true,
      json: async () => liveData,
    });
    const { body } = await getBody({ NODECLOUD_STATS_KEY: 'my-api-key' }, fetchImpl);
    assert.strictEqual(body.customField, 'live-value');
    assert.strictEqual(body.count, 42);
  });

  it('fetch is called with Authorization Bearer header', async () => {
    let capturedHeaders = null;
    const fetchImpl = async (url, opts) => {
      capturedHeaders = opts.headers;
      return { ok: true, json: async () => ({}) };
    };
    await getBody({ NODECLOUD_STATS_KEY: 'secret-key-123' }, fetchImpl);
    assert.strictEqual(capturedHeaders['Authorization'], 'Bearer secret-key-123');
  });

  it('fetch is called with Content-Type application/json header', async () => {
    let capturedHeaders = null;
    const fetchImpl = async (url, opts) => {
      capturedHeaders = opts.headers;
      return { ok: true, json: async () => ({}) };
    };
    await getBody({ NODECLOUD_STATS_KEY: 'key' }, fetchImpl);
    assert.strictEqual(capturedHeaders['Content-Type'], 'application/json');
  });

  it('fetch URL is the NodeCloud stats endpoint', async () => {
    let calledUrl = null;
    const fetchImpl = async (url) => {
      calledUrl = url;
      return { ok: true, json: async () => ({}) };
    };
    await getBody({ NODECLOUD_STATS_KEY: 'key' }, fetchImpl);
    assert.strictEqual(calledUrl, 'https://api.nodecloud.io/v1/stats');
  });
});

// ── Tests: NODECLOUD_STATS_KEY present, live API fails ───────────────────

describe('/api/nodecloud/stats (CF) — with API key, live API non-ok → mock fallback', () => {
  it('falls back to mock when API returns 500', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500 });
    const { body } = await getBody({ NODECLOUD_STATS_KEY: 'my-key' }, fetchImpl);
    assert.strictEqual(body.source, 'nodecloud_mock');
  });

  it('falls back to mock when API returns 401', async () => {
    const fetchImpl = async () => ({ ok: false, status: 401 });
    const { body } = await getBody({ NODECLOUD_STATS_KEY: 'bad-key' }, fetchImpl);
    assert.strictEqual(body.source, 'nodecloud_mock');
  });

  it('falls back to mock when fetch throws', async () => {
    const fetchImpl = async () => { throw new Error('Network error'); };
    const { body } = await getBody({ NODECLOUD_STATS_KEY: 'my-key' }, fetchImpl);
    assert.strictEqual(body.source, 'nodecloud_mock');
  });

  it('keyHint shows first 8 chars when key is present but API fails', async () => {
    const key = 'abcdefghijklmnop';
    const fetchImpl = async () => ({ ok: false, status: 500 });
    const { body } = await getBody({ NODECLOUD_STATS_KEY: key }, fetchImpl);
    assert.strictEqual(body.keyHint, key.slice(0, 8) + '...');
  });
});

// ── Tests: keyHint field ──────────────────────────────────────────────────

describe('/api/nodecloud/stats (CF) — keyHint field', () => {
  it('keyHint is "not-configured" with no key', async () => {
    const { body } = await getBody({});
    assert.strictEqual(body.keyHint, 'not-configured');
  });

  it('keyHint shows first 8 chars of key + "..." for long key', async () => {
    const fetchImpl = async () => ({ ok: false, status: 503 });
    const { body } = await getBody({ NODECLOUD_STATS_KEY: '12345678abcdef' }, fetchImpl);
    assert.strictEqual(body.keyHint, '12345678...');
  });

  it('keyHint shows all chars + "..." for key shorter than 8 chars', async () => {
    const fetchImpl = async () => ({ ok: false, status: 503 });
    const { body } = await getBody({ NODECLOUD_STATS_KEY: 'short' }, fetchImpl);
    assert.strictEqual(body.keyHint, 'short...');
  });

  it('keyHint for exactly 8-char key shows all 8 chars + "..."', async () => {
    const fetchImpl = async () => ({ ok: false, status: 503 });
    const { body } = await getBody({ NODECLOUD_STATS_KEY: '12345678' }, fetchImpl);
    assert.strictEqual(body.keyHint, '12345678...');
  });
});

// ── Tests: response headers ───────────────────────────────────────────────

describe('/api/nodecloud/stats (CF) — response headers', () => {
  it('Content-Type is application/json for mock response', async () => {
    const { resp } = await getBody({});
    assert.ok(resp.headers.get('Content-Type').includes('application/json'));
  });

  it('Access-Control-Allow-Origin is * for mock response', async () => {
    const { resp } = await getBody({});
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('Content-Type is application/json for live response', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({}) });
    const { resp } = await getBody({ NODECLOUD_STATS_KEY: 'key' }, fetchImpl);
    assert.ok(resp.headers.get('Content-Type').includes('application/json'));
  });

  it('Access-Control-Allow-Origin is * for live response', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({}) });
    const { resp } = await getBody({ NODECLOUD_STATS_KEY: 'key' }, fetchImpl);
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('response body is valid JSON for mock response', async () => {
    const resp = await onRequestGet(makeCtx({}));
    const text = await resp.text();
    assert.doesNotThrow(() => JSON.parse(text));
  });
});

// ── Tests: regression — complete mock response shape ─────────────────────

describe('/api/nodecloud/stats (CF) — regression: mock response shape', () => {
  it('mock response has all required fields', async () => {
    const { body } = await getBody({});
    const required = ['source', 'uptime', 'requests', 'cost', 'rpcEndpoint', 'chainId',
                      'network', 'lastUpdated', 'keyHint', 'badges', 'note'];
    for (const field of required) {
      assert.ok(field in body, `mock response must include field: ${field}`);
    }
  });

  it('chainId in mock is a number (not a string)', async () => {
    const { body } = await getBody({});
    assert.strictEqual(typeof body.chainId, 'number');
  });
});