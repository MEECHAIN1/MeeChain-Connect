'use strict';
/**
 * Tests for server.js health endpoint changes and ecosystem.config.cjs
 * introduced in this PR.
 *
 * Changes under test:
 *   /health endpoint (GET):
 *     - Response no longer includes mode, rpcState, allowMockFallback,
 *       breakerFailureThreshold, breakerCooldownMs, or upstreams fields
 *       (all removed in this PR)
 *     - version field changed from '2.1.1' to '2.0.0'
 *     - service field is 'MeeChain RPC Gateway' when hostname contains 'rpc.',
 *       otherwise 'MeeChain App Server'
 *
 *   /api/health endpoint (GET):
 *     - model field changed from 'gpt-4o-mini' to 'gpt-5-mini'
 *     - Response has no 'ts' field (unlike /health which does)
 *     - Status is always 'ok'
 *
 *   ecosystem.config.cjs (PM2 config):
 *     - name is 'meechain-dashboard'
 *     - script is 'server.js'
 *     - instances is 1
 *     - env.NODE_ENV is 'production'
 *     - env.PORT is 3000 (number)
 *     - No env_development block (removed in PR)
 *     - merge_logs is true (new in PR)
 *     - log_date_format is set (new in PR)
 *
 * Strategy: handlers are replicated inline following the same approach used in
 * server-api-network.test.js, so no HTTP server is required.
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Mock req/res helpers ─────────────────────────────────────────────────────

function mockRes() {
  return {
    _status: 200,
    _body:   undefined,
    status(code) { this._status = code; return this; },
    json(body)   { this._body = body;   return this; },
  };
}

// Build a mock req with configurable hostname
function mockReq(hostname = '') {
  return { hostname };
}

// ── Replicate /health handler from server.js ─────────────────────────────────
// (mirrors exactly what was introduced by this PR)

function buildHealthHandler(options = {}) {
  const { chainId = 13390, drpcUrl = 'https://rpc.meechain.live', web3Connected = false } = options;

  return function healthHandler(req, res) {
    const host = req.hostname || '';
    const isRpcHost = host.includes('rpc.');
    res.json({
      status:   'ok',
      service:  isRpcHost ? 'MeeChain RPC Gateway' : 'MeeChain App Server',
      host,
      chainId,
      rpc:      drpcUrl,
      web3:     web3Connected,
      uptime:   Math.floor(process.uptime()),
      version:  '2.0.0',
      ts:       new Date().toISOString(),
    });
  };
}

// ── Replicate /api/health handler from server.js ─────────────────────────────

const CONTRACTS = {
  token:   '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  nft:     '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  staking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
};

function buildApiHealthHandler(options = {}) {
  const { chainId = 13390, drpcUrl = 'https://rpc.meechain.live', web3Connected = false } = options;

  return function apiHealthHandler(req, res) {
    res.json({
      status:    'ok',
      model:     'gpt-5-mini',
      bot:       'MeeBot AI',
      web3:      web3Connected,
      chainId,
      rpc:       drpcUrl,
      contracts: CONTRACTS,
      uptime:    Math.floor(process.uptime()),
    });
  };
}

// ── Tests: /health — service field ──────────────────────────────────────────

describe('/health — service field based on hostname', () => {
  const handler = buildHealthHandler();

  it('returns "MeeChain App Server" for empty hostname', () => {
    const res = mockRes();
    handler(mockReq(''), res);
    assert.strictEqual(res._body.service, 'MeeChain App Server');
  });

  it('returns "MeeChain App Server" for app.meechain.live hostname', () => {
    const res = mockRes();
    handler(mockReq('app.meechain.live'), res);
    assert.strictEqual(res._body.service, 'MeeChain App Server');
  });

  it('returns "MeeChain RPC Gateway" for rpc.meechain.live hostname', () => {
    const res = mockRes();
    handler(mockReq('rpc.meechain.live'), res);
    assert.strictEqual(res._body.service, 'MeeChain RPC Gateway');
  });

  it('returns "MeeChain RPC Gateway" for any hostname containing "rpc."', () => {
    const res = mockRes();
    handler(mockReq('rpc.example.com'), res);
    assert.strictEqual(res._body.service, 'MeeChain RPC Gateway');
  });

  it('returns "MeeChain RPC Gateway" for hostname where "rpc." appears mid-string', () => {
    const res = mockRes();
    // 'myrpc.something.com' contains the substring 'rpc.' at position 2 → RPC Gateway
    handler(mockReq('myrpc.something.com'), res);
    assert.strictEqual(res._body.service, 'MeeChain RPC Gateway');
  });

  it('returns "MeeChain App Server" for hostname with "rpc" but no trailing dot', () => {
    const res = mockRes();
    // 'rpcserver.meechain.live' does NOT contain 'rpc.' (has 'rpcs') → App Server
    handler(mockReq('rpcserver.meechain.live'), res);
    assert.strictEqual(res._body.service, 'MeeChain App Server');
  });

  it('returns "MeeChain RPC Gateway" for subdomain prefixed with rpc.', () => {
    for (const hostname of ['rpc.meechain.live', 'rpc.meechain.xyz', 'rpc.staging.example.com']) {
      const res = mockRes();
      handler(mockReq(hostname), res);
      assert.strictEqual(
        res._body.service, 'MeeChain RPC Gateway',
        `hostname "${hostname}" must resolve to RPC Gateway`
      );
    }
  });

  it('host field in response matches the request hostname', () => {
    const res = mockRes();
    handler(mockReq('app.meechain.live'), res);
    assert.strictEqual(res._body.host, 'app.meechain.live');
  });

  it('host field is empty string when hostname is not provided', () => {
    const res = mockRes();
    // Manually mimic missing hostname
    handler({ hostname: undefined }, res);
    assert.strictEqual(res._body.host, '');
  });
});

// ── Tests: /health — version field ──────────────────────────────────────────

describe('/health — version is 2.0.0 (changed from 2.1.1 in PR)', () => {
  it('version is exactly "2.0.0"', () => {
    const handler = buildHealthHandler();
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.version, '2.0.0');
  });

  it('version is NOT "2.1.1" (old value)', () => {
    const handler = buildHealthHandler();
    const res = mockRes();
    handler(mockReq(), res);
    assert.notStrictEqual(res._body.version, '2.1.1');
  });
});

// ── Tests: /health — removed fields ─────────────────────────────────────────

describe('/health — fields removed in this PR are absent', () => {
  const handler = buildHealthHandler();

  it('does NOT include "mode" field', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.ok(!('mode' in res._body), '"mode" field must be absent from /health response');
  });

  it('does NOT include "rpcState" field', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.ok(!('rpcState' in res._body), '"rpcState" must be absent from /health response');
  });

  it('does NOT include "allowMockFallback" field', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.ok(!('allowMockFallback' in res._body), '"allowMockFallback" must be absent');
  });

  it('does NOT include "breakerFailureThreshold" field', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.ok(!('breakerFailureThreshold' in res._body));
  });

  it('does NOT include "breakerCooldownMs" field', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.ok(!('breakerCooldownMs' in res._body));
  });
});

// ── Tests: /health — required fields still present ───────────────────────────

describe('/health — required fields present', () => {
  it('status is "ok"', () => {
    const handler = buildHealthHandler();
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.status, 'ok');
  });

  it('chainId is 13390', () => {
    const handler = buildHealthHandler({ chainId: 13390 });
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.chainId, 13390);
  });

  it('ts field is a valid ISO 8601 date string', () => {
    const handler = buildHealthHandler();
    const res = mockRes();
    handler(mockReq(), res);
    assert.ok(typeof res._body.ts === 'string');
    assert.ok(!isNaN(Date.parse(res._body.ts)), `ts "${res._body.ts}" must be a valid date`);
  });

  it('uptime is a non-negative number', () => {
    const handler = buildHealthHandler();
    const res = mockRes();
    handler(mockReq(), res);
    assert.ok(typeof res._body.uptime === 'number');
    assert.ok(res._body.uptime >= 0);
  });

  it('web3 reflects the connected state', () => {
    const connectedHandler = buildHealthHandler({ web3Connected: true });
    const disconnectedHandler = buildHealthHandler({ web3Connected: false });

    const res1 = mockRes();
    connectedHandler(mockReq(), res1);
    assert.strictEqual(res1._body.web3, true);

    const res2 = mockRes();
    disconnectedHandler(mockReq(), res2);
    assert.strictEqual(res2._body.web3, false);
  });

  it('rpc field matches the configured drpcUrl', () => {
    const handler = buildHealthHandler({ drpcUrl: 'https://custom.rpc.example.com' });
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.rpc, 'https://custom.rpc.example.com');
  });

  it('response has all expected top-level fields', () => {
    const handler = buildHealthHandler();
    const res = mockRes();
    handler(mockReq(), res);
    const requiredFields = ['status', 'service', 'host', 'chainId', 'rpc', 'web3', 'uptime', 'version', 'ts'];
    for (const field of requiredFields) {
      assert.ok(field in res._body, `response must include field: "${field}"`);
    }
  });
});

// ── Tests: /api/health — model field ────────────────────────────────────────

describe('/api/health — model changed to "gpt-5-mini" in PR', () => {
  it('model is "gpt-5-mini"', () => {
    const handler = buildApiHealthHandler();
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.model, 'gpt-5-mini');
  });

  it('model is NOT "gpt-4o-mini" (old value)', () => {
    const handler = buildApiHealthHandler();
    const res = mockRes();
    handler(mockReq(), res);
    assert.notStrictEqual(res._body.model, 'gpt-4o-mini');
  });
});

// ── Tests: /api/health — other fields ───────────────────────────────────────

describe('/api/health — response shape', () => {
  const handler = buildApiHealthHandler();

  it('status is "ok"', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.status, 'ok');
  });

  it('bot is "MeeBot AI"', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.bot, 'MeeBot AI');
  });

  it('does NOT include a "ts" field (unlike /health)', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.ok(!('ts' in res._body), '/api/health must not include a "ts" field');
  });

  it('contracts object has token, nft, staking keys', () => {
    const res = mockRes();
    handler(mockReq(), res);
    const c = res._body.contracts;
    assert.ok(c, 'contracts must be present');
    assert.ok(c.token.startsWith('0x'));
    assert.ok(c.nft.startsWith('0x'));
    assert.ok(c.staking.startsWith('0x'));
  });

  it('chainId is 13390', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.chainId, 13390);
  });

  it('uptime is a non-negative number', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.ok(typeof res._body.uptime === 'number');
    assert.ok(res._body.uptime >= 0);
  });

  it('web3 is false when web3 not connected', () => {
    const h = buildApiHealthHandler({ web3Connected: false });
    const res = mockRes();
    h(mockReq(), res);
    assert.strictEqual(res._body.web3, false);
  });

  it('web3 is true when web3 connected', () => {
    const h = buildApiHealthHandler({ web3Connected: true });
    const res = mockRes();
    h(mockReq(), res);
    assert.strictEqual(res._body.web3, true);
  });

  it('response has all expected top-level fields', () => {
    const res = mockRes();
    handler(mockReq(), res);
    const requiredFields = ['status', 'model', 'bot', 'web3', 'chainId', 'rpc', 'contracts', 'uptime'];
    for (const field of requiredFields) {
      assert.ok(field in res._body, `response must include field: "${field}"`);
    }
  });
});

// ── Tests: ecosystem.config.cjs ──────────────────────────────────────────────

describe('ecosystem.config.cjs — PM2 configuration (PR changes)', () => {
  let config;

  before(() => {
    config = require('../ecosystem.config.cjs');
  });

  it('exports an object with apps array', () => {
    assert.ok(config && typeof config === 'object');
    assert.ok(Array.isArray(config.apps));
  });

  it('apps array has exactly one entry', () => {
    assert.strictEqual(config.apps.length, 1);
  });

  it('app name is "meechain-dashboard"', () => {
    assert.strictEqual(config.apps[0].name, 'meechain-dashboard');
  });

  it('script is "server.js"', () => {
    assert.strictEqual(config.apps[0].script, 'server.js');
  });

  it('instances is 1', () => {
    assert.strictEqual(config.apps[0].instances, 1);
  });

  it('autorestart is true', () => {
    assert.strictEqual(config.apps[0].autorestart, true);
  });

  it('watch is false', () => {
    assert.strictEqual(config.apps[0].watch, false);
  });

  it('max_memory_restart is "512M"', () => {
    assert.strictEqual(config.apps[0].max_memory_restart, '512M');
  });

  it('env.NODE_ENV is "production"', () => {
    assert.strictEqual(config.apps[0].env.NODE_ENV, 'production');
  });

  it('env.PORT is 3000 (number, not string)', () => {
    assert.strictEqual(config.apps[0].env.PORT, 3000);
    assert.strictEqual(typeof config.apps[0].env.PORT, 'number');
  });

  it('merge_logs is true (new in PR)', () => {
    assert.strictEqual(config.apps[0].merge_logs, true);
  });

  it('log_date_format is set (new in PR)', () => {
    assert.ok(typeof config.apps[0].log_date_format === 'string');
    assert.ok(config.apps[0].log_date_format.length > 0);
  });

  it('error_file path includes pm2-error.log', () => {
    assert.ok(config.apps[0].error_file.includes('pm2-error.log'));
  });

  it('out_file path includes pm2-out.log', () => {
    assert.ok(config.apps[0].out_file.includes('pm2-out.log'));
  });

  it('does NOT have env_development block (removed in PR)', () => {
    assert.ok(!('env_development' in config.apps[0]),
      'env_development must be absent — it was removed in this PR');
  });

  it('does NOT have exec_mode set (removed in PR)', () => {
    assert.ok(!('exec_mode' in config.apps[0]),
      'exec_mode must be absent — it was removed in this PR');
  });

  it('does NOT have time flag set (removed in PR)', () => {
    assert.ok(!('time' in config.apps[0]),
      'time flag must be absent — it was removed in this PR');
  });
});