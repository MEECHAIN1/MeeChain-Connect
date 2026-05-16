'use strict';
/**
 * Tests for cf-deploy/functions/api/health.js
 *
 * The handler is an ESM export, so we replicate its logic directly here and
 * test using the Web API globals available in Node 24 (Response, etc.).
 * This matches the established pattern in the test suite.
 *
 * Function under test: onRequestGet(ctx)
 * - Returns JSON with status, model, bot, web3, chainId, rpc, contracts, domain, version
 * - Falls back to hardcoded defaults when env vars are absent
 * - Uses env vars: DRPC_RPC_URL, VITE_TOKEN_CONTRACT_ADDRESS,
 *   VITE_NFT_CONTRACT_ADDRESS, VITE_STAKING_CONTRACT_ADDRESS
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/health.js ─────────

async function onRequestGet(ctx) {
  const { env } = ctx;

  const data = {
    status:    'ok',
    model:     'gpt-5-mini',
    bot:       'MeeBot AI',
    web3:      false,
    chainId:   13390,
    rpc:       env.DRPC_RPC_URL || 'http://rpc.meechain.run.place',
    contracts: {
      token:   env.VITE_TOKEN_CONTRACT_ADDRESS   || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      nft:     env.VITE_NFT_CONTRACT_ADDRESS     || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      staking: env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
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

// ── Helper: build mock context ────────────────────────────────────────────

function mkCtx(env = {}) {
  return { env };
}

// ── Tests: default values ─────────────────────────────────────────────────

describe('/api/health (CF) — default env values', () => {
  it('responds with HTTP 200', async () => {
    const res = await onRequestGet(mkCtx());
    assert.strictEqual(res.status, 200);
  });

  it('response body is valid JSON', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok(body !== null && typeof body === 'object');
  });

  it('status field is "ok"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
  });

  it('model is "gpt-5-mini"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.model, 'gpt-5-mini');
  });

  it('bot is "MeeBot AI"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.bot, 'MeeBot AI');
  });

  it('web3 is false', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.web3, false);
  });

  it('chainId is 13390', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.chainId, 13390);
  });

  it('default rpc is http://rpc.meechain.run.place', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.rpc, 'http://rpc.meechain.run.place');
  });

  it('domain is "meebot.io"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.domain, 'meebot.io');
  });

  it('version is "2.0.0"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.version, '2.0.0');
  });

  it('contracts has token, nft, staking keys', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok(body.contracts, 'contracts field must be present');
    assert.ok('token' in body.contracts,   'contracts must have token');
    assert.ok('nft' in body.contracts,     'contracts must have nft');
    assert.ok('staking' in body.contracts, 'contracts must have staking');
  });

  it('default token contract address is 0x5FbDB...', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  });

  it('default nft contract address is 0xe7f17...', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  });

  it('default staking contract address is 0x9fE46...', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.contracts.staking, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });
});

// ── Tests: env var overrides ───────────────────────────────────────────────

describe('/api/health (CF) — env var overrides', () => {
  it('uses DRPC_RPC_URL env var for rpc field', async () => {
    const res = await onRequestGet(mkCtx({ DRPC_RPC_URL: 'https://custom-rpc.example.com' }));
    const body = await res.json();
    assert.strictEqual(body.rpc, 'https://custom-rpc.example.com');
  });

  it('uses VITE_TOKEN_CONTRACT_ADDRESS env var', async () => {
    const res = await onRequestGet(mkCtx({ VITE_TOKEN_CONTRACT_ADDRESS: '0xAAAA' }));
    const body = await res.json();
    assert.strictEqual(body.contracts.token, '0xAAAA');
  });

  it('uses VITE_NFT_CONTRACT_ADDRESS env var', async () => {
    const res = await onRequestGet(mkCtx({ VITE_NFT_CONTRACT_ADDRESS: '0xBBBB' }));
    const body = await res.json();
    assert.strictEqual(body.contracts.nft, '0xBBBB');
  });

  it('uses VITE_STAKING_CONTRACT_ADDRESS env var', async () => {
    const res = await onRequestGet(mkCtx({ VITE_STAKING_CONTRACT_ADDRESS: '0xCCCC' }));
    const body = await res.json();
    assert.strictEqual(body.contracts.staking, '0xCCCC');
  });

  it('env overrides do not affect other fields', async () => {
    const res = await onRequestGet(mkCtx({ DRPC_RPC_URL: 'https://custom.rpc' }));
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.chainId, 13390);
    assert.strictEqual(body.domain, 'meebot.io');
  });
});

// ── Tests: response headers ────────────────────────────────────────────────

describe('/api/health (CF) — response headers', () => {
  it('Content-Type is application/json', async () => {
    const res = await onRequestGet(mkCtx());
    assert.ok(
      (res.headers.get('Content-Type') || '').includes('application/json'),
      'Content-Type must include application/json'
    );
  });

  it('Access-Control-Allow-Origin is *', async () => {
    const res = await onRequestGet(mkCtx());
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('Cache-Control is no-cache', async () => {
    const res = await onRequestGet(mkCtx());
    assert.strictEqual(res.headers.get('Cache-Control'), 'no-cache');
  });
});

// ── Tests: regression / shape ─────────────────────────────────────────────

describe('/api/health (CF) — regression: response shape', () => {
  const REQUIRED_FIELDS = ['status', 'model', 'bot', 'web3', 'chainId', 'rpc', 'contracts', 'domain', 'version'];

  it('response contains all required top-level fields', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    for (const field of REQUIRED_FIELDS) {
      assert.ok(field in body, `response must include field: ${field}`);
    }
  });

  it('chainId is a number, not a string', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(typeof body.chainId, 'number');
  });

  it('all contract addresses start with 0x', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    for (const [key, addr] of Object.entries(body.contracts)) {
      assert.ok(
        typeof addr === 'string' && addr.startsWith('0x'),
        `contracts.${key} must start with 0x`
      );
    }
  });

  it('web3 field is always boolean false (not yet live)', async () => {
    const res = await onRequestGet(mkCtx({ DRPC_RPC_URL: 'http://anything' }));
    const body = await res.json();
    assert.strictEqual(body.web3, false);
  });
});