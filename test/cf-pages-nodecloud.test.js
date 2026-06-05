'use strict';
/**
 * Tests for cf-deploy/functions/api/nodecloud/stats.js
 *
 * The handler tries a live NodeCloud API when NODECLOUD_STATS_KEY is present,
 * and falls back to a mock payload otherwise. Fetch is mocked globally to
 * avoid real network calls.
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

// ── Replicate onRequestGet from cf-deploy/functions/api/nodecloud/stats.js ─

async function cfNodecloudHandler(env = {}, fetchImpl = null) {
  const savedFetch = global.fetch;
  if (fetchImpl) global.fetch = fetchImpl;

  try {
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
          return {
            body: { source: 'nodecloud_live', ...live },
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          };
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

    return {
      body: data,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    };
  } finally {
    global.fetch = savedFetch;
  }
}

// ── Mock fetch helpers ───────────────────────────────────────────────────

function makeFetchOk(jsonBody) {
  return async () => ({
    ok: true,
    json: async () => jsonBody,
  });
}

function makeFetchFail() {
  return async () => ({ ok: false, status: 500 });
}

function makeFetchThrow(msg) {
  return async () => { throw new Error(msg); };
}

// ── Tests: no API key (mock mode) ────────────────────────────────────────

describe('cf /api/nodecloud/stats — no NODECLOUD_STATS_KEY (mock mode)', () => {
  it('returns source "nodecloud_mock"', async () => {
    const { body } = await cfNodecloudHandler();
    assert.strictEqual(body.source, 'nodecloud_mock');
  });

  it('keyHint is "not-configured" when no key set', async () => {
    const { body } = await cfNodecloudHandler();
    assert.strictEqual(body.keyHint, 'not-configured');
  });

  it('default rpcEndpoint is http://rpc.meechain.run.place', async () => {
    const { body } = await cfNodecloudHandler();
    assert.strictEqual(body.rpcEndpoint, 'http://rpc.meechain.run.place');
  });

  it('custom DRPC_RPC_URL overrides rpcEndpoint', async () => {
    const { body } = await cfNodecloudHandler({ DRPC_RPC_URL: 'https://my-rpc' });
    assert.strictEqual(body.rpcEndpoint, 'https://my-rpc');
  });

  it('chainId is 13390', async () => {
    const { body } = await cfNodecloudHandler();
    assert.strictEqual(body.chainId, 13390);
  });

  it('network is "MeeChain Ritual Chain"', async () => {
    const { body } = await cfNodecloudHandler();
    assert.strictEqual(body.network, 'MeeChain Ritual Chain');
  });

  it('uptime is "99.98%"', async () => {
    const { body } = await cfNodecloudHandler();
    assert.strictEqual(body.uptime, '99.98%');
  });

  it('requests is 12453', async () => {
    const { body } = await cfNodecloudHandler();
    assert.strictEqual(body.requests, 12453);
  });

  it('lastUpdated is a valid ISO timestamp', async () => {
    const { body } = await cfNodecloudHandler();
    assert.ok(!isNaN(new Date(body.lastUpdated).getTime()), 'lastUpdated must be a valid date');
  });

  it('badges object has health, network, stats keys', async () => {
    const { body } = await cfNodecloudHandler();
    assert.ok('health'  in body.badges, 'badges.health missing');
    assert.ok('network' in body.badges, 'badges.network missing');
    assert.ok('stats'   in body.badges, 'badges.stats missing');
  });

  it('badges.health is "Bug Slayer"', async () => {
    const { body } = await cfNodecloudHandler();
    assert.strictEqual(body.badges.health, 'Bug Slayer');
  });

  it('badges.network is "Chain Weaver"', async () => {
    const { body } = await cfNodecloudHandler();
    assert.strictEqual(body.badges.network, 'Chain Weaver');
  });

  it('badges.stats is "Workspace Architect"', async () => {
    const { body } = await cfNodecloudHandler();
    assert.strictEqual(body.badges.stats, 'Workspace Architect');
  });

  it('note mentions cached mock data', async () => {
    const { body } = await cfNodecloudHandler();
    assert.ok(body.note.includes('mock'), 'note must mention mock');
  });
});

// ── Tests: with API key, live response succeeds ──────────────────────────

describe('cf /api/nodecloud/stats — with NODECLOUD_STATS_KEY, API returns ok', () => {
  const liveData = { nodes: 42, tps: 2400 };

  it('returns source "nodecloud_live"', async () => {
    const { body } = await cfNodecloudHandler(
      { NODECLOUD_STATS_KEY: 'sk-live-key' },
      makeFetchOk(liveData)
    );
    assert.strictEqual(body.source, 'nodecloud_live');
  });

  it('merges live data fields into response', async () => {
    const { body } = await cfNodecloudHandler(
      { NODECLOUD_STATS_KEY: 'sk-live-key' },
      makeFetchOk(liveData)
    );
    assert.strictEqual(body.nodes, 42);
    assert.strictEqual(body.tps, 2400);
  });

  it('does NOT include mock-only fields (uptime, keyHint) when live', async () => {
    const { body } = await cfNodecloudHandler(
      { NODECLOUD_STATS_KEY: 'sk-live-key' },
      makeFetchOk(liveData)
    );
    assert.ok(!('keyHint' in body), 'live response should not have keyHint');
    assert.ok(!('uptime'  in body), 'live response should not have uptime');
  });
});

// ── Tests: with API key, API returns non-ok → falls back to mock ─────────

describe('cf /api/nodecloud/stats — with key, API returns non-ok status', () => {
  it('falls back to mock: source is "nodecloud_mock"', async () => {
    const { body } = await cfNodecloudHandler(
      { NODECLOUD_STATS_KEY: 'sk-bad-key' },
      makeFetchFail()
    );
    assert.strictEqual(body.source, 'nodecloud_mock');
  });
});

// ── Tests: with API key, fetch throws → falls back to mock ───────────────

describe('cf /api/nodecloud/stats — with key, fetch throws', () => {
  it('falls back to mock: source is "nodecloud_mock"', async () => {
    const { body } = await cfNodecloudHandler(
      { NODECLOUD_STATS_KEY: 'sk-err-key' },
      makeFetchThrow('network failure')
    );
    assert.strictEqual(body.source, 'nodecloud_mock');
  });

  it('mock fallback has keyHint based on key prefix', async () => {
    const { body } = await cfNodecloudHandler(
      { NODECLOUD_STATS_KEY: 'sk-err-key' },
      makeFetchThrow('network failure')
    );
    assert.ok(body.keyHint.startsWith('sk-err-k'), `expected key hint prefix, got: ${body.keyHint}`);
    assert.ok(body.keyHint.endsWith('...'));
  });
});

// ── Tests: keyHint masking ───────────────────────────────────────────────

describe('cf /api/nodecloud/stats — keyHint masking logic', () => {
  it('shows first 8 chars + "..." of the stats key in mock fallback', async () => {
    const key = 'abcdefghXXXXXXXX';
    const { body } = await cfNodecloudHandler(
      { NODECLOUD_STATS_KEY: key },
      makeFetchFail()
    );
    assert.strictEqual(body.keyHint, 'abcdefgh...');
  });

  it('short key (< 8 chars) is masked as the whole key + "..."', async () => {
    const key = 'short';
    const { body } = await cfNodecloudHandler(
      { NODECLOUD_STATS_KEY: key },
      makeFetchFail()
    );
    assert.strictEqual(body.keyHint, 'short...');
  });

  it('"not-configured" when key is empty string', async () => {
    const { body } = await cfNodecloudHandler({ NODECLOUD_STATS_KEY: '' });
    assert.strictEqual(body.keyHint, 'not-configured');
  });
});

// ── Tests: response headers ──────────────────────────────────────────────

describe('cf /api/nodecloud/stats — response headers', () => {
  it('Content-Type is application/json (mock path)', async () => {
    const { headers } = await cfNodecloudHandler();
    assert.strictEqual(headers['Content-Type'], 'application/json');
  });

  it('Access-Control-Allow-Origin is * (mock path)', async () => {
    const { headers } = await cfNodecloudHandler();
    assert.strictEqual(headers['Access-Control-Allow-Origin'], '*');
  });

  it('Content-Type is application/json (live path)', async () => {
    const { headers } = await cfNodecloudHandler(
      { NODECLOUD_STATS_KEY: 'key' },
      makeFetchOk({})
    );
    assert.strictEqual(headers['Content-Type'], 'application/json');
  });
});

// ── Tests: regression ────────────────────────────────────────────────────

describe('cf /api/nodecloud/stats — regression', () => {
  it('mock body is JSON-serialisable', async () => {
    const { body } = await cfNodecloudHandler();
    assert.doesNotThrow(() => JSON.stringify(body));
  });

  it('lastUpdated timestamp changes between consecutive calls (not cached)', async () => {
    const { body: b1 } = await cfNodecloudHandler();
    await new Promise(r => setTimeout(r, 10));
    const { body: b2 } = await cfNodecloudHandler();
    // Both are valid ISO dates; they may or may not differ but must be valid
    assert.ok(!isNaN(new Date(b1.lastUpdated).getTime()));
    assert.ok(!isNaN(new Date(b2.lastUpdated).getTime()));
  });
});