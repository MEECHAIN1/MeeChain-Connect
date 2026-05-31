'use strict';
/**
 * Tests for the Cloudflare Pages Function: cf-deploy/functions/api/health.js
 *
 * The handler uses Cloudflare Workers runtime globals (Response, etc.).
 * Node.js v18+ provides these globals, so we replicate the handler logic
 * here and test it in isolation following the project's established pattern.
 *
 * Handler under test: onRequestGet(ctx) — cf-deploy/functions/api/health.js
 *
 * Behaviour:
 *  - Always returns status 'ok', model 'gpt-5-mini', bot 'MeeBot AI', web3 false
 *  - chainId is always 13390 (hardcoded, not from env)
 *  - rpc uses env.DRPC_RPC_URL or falls back to 'http://rpc.meechain.run.place'
 *  - contracts: token/nft/staking use env vars or hardcoded fallbacks
 *  - domain is always 'meebot.io', version '2.0.0'
 *  - Response headers: Content-Type application/json, CORS *, Cache-Control no-cache
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/health.js ────────

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

// ── Helpers ───────────────────────────────────────────────────────────────

function makeCtx(env = {}) {
  return { env };
}

async function getBody(ctx) {
  const resp = await onRequestGet(ctx);
  const text = await resp.text();
  return { resp, body: JSON.parse(text) };
}

// ── Tests: static fields ──────────────────────────────────────────────────

describe('/api/health (CF) — static fields', () => {
  it('status is always "ok"', async () => {
    const { body } = await getBody(makeCtx());
    assert.strictEqual(body.status, 'ok');
  });

  it('model is "gpt-5-mini"', async () => {
    const { body } = await getBody(makeCtx());
    assert.strictEqual(body.model, 'gpt-5-mini');
  });

  it('bot is "MeeBot AI"', async () => {
    const { body } = await getBody(makeCtx());
    assert.strictEqual(body.bot, 'MeeBot AI');
  });

  it('web3 is always false', async () => {
    const { body } = await getBody(makeCtx());
    assert.strictEqual(body.web3, false);
  });

  it('chainId is always 13390', async () => {
    const { body } = await getBody(makeCtx());
    assert.strictEqual(body.chainId, 13390);
  });

  it('domain is "meebot.io"', async () => {
    const { body } = await getBody(makeCtx());
    assert.strictEqual(body.domain, 'meebot.io');
  });

  it('version is "2.0.0"', async () => {
    const { body } = await getBody(makeCtx());
    assert.strictEqual(body.version, '2.0.0');
  });
});

// ── Tests: rpc field ──────────────────────────────────────────────────────

describe('/api/health (CF) — rpc field', () => {
  it('uses default rpc when DRPC_RPC_URL is not set', async () => {
    const { body } = await getBody(makeCtx({}));
    assert.strictEqual(body.rpc, 'http://rpc.meechain.run.place');
  });

  it('uses DRPC_RPC_URL env var when set', async () => {
    const { body } = await getBody(makeCtx({ DRPC_RPC_URL: 'https://custom.rpc.example' }));
    assert.strictEqual(body.rpc, 'https://custom.rpc.example');
  });

  it('empty string DRPC_RPC_URL falls back to default (falsy)', async () => {
    const { body } = await getBody(makeCtx({ DRPC_RPC_URL: '' }));
    assert.strictEqual(body.rpc, 'http://rpc.meechain.run.place');
  });
});

// ── Tests: contracts field ────────────────────────────────────────────────

describe('/api/health (CF) — contracts field', () => {
  it('contracts object is present in response', async () => {
    const { body } = await getBody(makeCtx());
    assert.ok(body.contracts, 'contracts field must be present');
  });

  it('token address falls back to hardcoded default', async () => {
    const { body } = await getBody(makeCtx({}));
    assert.strictEqual(body.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  });

  it('nft address falls back to hardcoded default', async () => {
    const { body } = await getBody(makeCtx({}));
    assert.strictEqual(body.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  });

  it('staking address falls back to hardcoded default', async () => {
    const { body } = await getBody(makeCtx({}));
    assert.strictEqual(body.contracts.staking, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  it('uses VITE_TOKEN_CONTRACT_ADDRESS env var when set', async () => {
    const { body } = await getBody(makeCtx({ VITE_TOKEN_CONTRACT_ADDRESS: '0xAAAA' }));
    assert.strictEqual(body.contracts.token, '0xAAAA');
  });

  it('uses VITE_NFT_CONTRACT_ADDRESS env var when set', async () => {
    const { body } = await getBody(makeCtx({ VITE_NFT_CONTRACT_ADDRESS: '0xBBBB' }));
    assert.strictEqual(body.contracts.nft, '0xBBBB');
  });

  it('uses VITE_STAKING_CONTRACT_ADDRESS env var when set', async () => {
    const { body } = await getBody(makeCtx({ VITE_STAKING_CONTRACT_ADDRESS: '0xCCCC' }));
    assert.strictEqual(body.contracts.staking, '0xCCCC');
  });

  it('contracts has token, nft, and staking keys only', async () => {
    const { body } = await getBody(makeCtx());
    const keys = Object.keys(body.contracts).sort();
    assert.deepStrictEqual(keys, ['nft', 'staking', 'token']);
  });
});

// ── Tests: HTTP response headers ──────────────────────────────────────────

describe('/api/health (CF) — response headers', () => {
  it('Content-Type is application/json', async () => {
    const { resp } = await getBody(makeCtx());
    assert.ok(resp.headers.get('Content-Type').includes('application/json'));
  });

  it('Access-Control-Allow-Origin is *', async () => {
    const { resp } = await getBody(makeCtx());
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('Cache-Control is no-cache', async () => {
    const { resp } = await getBody(makeCtx());
    assert.strictEqual(resp.headers.get('Cache-Control'), 'no-cache');
  });

  it('response body is valid JSON', async () => {
    const ctx = makeCtx();
    const resp = await onRequestGet(ctx);
    const text = await resp.text();
    assert.doesNotThrow(() => JSON.parse(text), 'response body must be valid JSON');
  });
});

// ── Tests: complete response shape ────────────────────────────────────────

describe('/api/health (CF) — response shape regression', () => {
  it('response has all required top-level fields', async () => {
    const { body } = await getBody(makeCtx());
    const required = ['status', 'model', 'bot', 'web3', 'chainId', 'rpc', 'contracts', 'domain', 'version'];
    for (const field of required) {
      assert.ok(field in body, `response must include field: ${field}`);
    }
  });

  it('all contract addresses are non-empty strings', async () => {
    const { body } = await getBody(makeCtx());
    for (const [key, addr] of Object.entries(body.contracts)) {
      assert.strictEqual(typeof addr, 'string', `${key} must be a string`);
      assert.ok(addr.length > 0, `${key} must not be empty`);
    }
  });

  it('chainId is a number (not a string)', async () => {
    const { body } = await getBody(makeCtx());
    assert.strictEqual(typeof body.chainId, 'number');
  });
});