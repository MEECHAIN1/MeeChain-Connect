'use strict';
/**
 * Tests for cf-deploy/functions/api/health.js
 *
 * Replicates the handler logic inline (same pattern as other tests in this
 * suite) to avoid ESM/CJS interop friction. The logic under test is the
 * onRequestGet handler that returns a JSON health payload.
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Replicate onRequestGet from cf-deploy/functions/api/health.js ──────────

function cfHealthHandler(env = {}) {
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
  return {
    body: data,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  };
}

// ── Tests: static fields ─────────────────────────────────────────────────

describe('cf /api/health — static fields', () => {
  it('returns status "ok"', () => {
    const { body } = cfHealthHandler();
    assert.strictEqual(body.status, 'ok');
  });

  it('returns model "gpt-5-mini"', () => {
    const { body } = cfHealthHandler();
    assert.strictEqual(body.model, 'gpt-5-mini');
  });

  it('returns bot "MeeBot AI"', () => {
    const { body } = cfHealthHandler();
    assert.strictEqual(body.bot, 'MeeBot AI');
  });

  it('returns web3 false', () => {
    const { body } = cfHealthHandler();
    assert.strictEqual(body.web3, false);
  });

  it('returns chainId 13390', () => {
    const { body } = cfHealthHandler();
    assert.strictEqual(body.chainId, 13390);
  });

  it('returns domain "meebot.io"', () => {
    const { body } = cfHealthHandler();
    assert.strictEqual(body.domain, 'meebot.io');
  });

  it('returns version "2.0.0"', () => {
    const { body } = cfHealthHandler();
    assert.strictEqual(body.version, '2.0.0');
  });
});

// ── Tests: default env values ────────────────────────────────────────────

describe('cf /api/health — default env values (no env vars set)', () => {
  it('rpc falls back to http://rpc.meechain.run.place', () => {
    const { body } = cfHealthHandler({});
    assert.strictEqual(body.rpc, 'http://rpc.meechain.run.place');
  });

  it('contracts.token falls back to default address', () => {
    const { body } = cfHealthHandler({});
    assert.strictEqual(body.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  });

  it('contracts.nft falls back to default address', () => {
    const { body } = cfHealthHandler({});
    assert.strictEqual(body.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  });

  it('contracts.staking falls back to default address', () => {
    const { body } = cfHealthHandler({});
    assert.strictEqual(body.contracts.staking, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });
});

// ── Tests: custom env values ─────────────────────────────────────────────

describe('cf /api/health — custom env values', () => {
  const customEnv = {
    DRPC_RPC_URL:                  'http://custom.rpc:8080',
    VITE_TOKEN_CONTRACT_ADDRESS:   '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    VITE_NFT_CONTRACT_ADDRESS:     '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    VITE_STAKING_CONTRACT_ADDRESS: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
  };

  it('uses DRPC_RPC_URL from env', () => {
    const { body } = cfHealthHandler(customEnv);
    assert.strictEqual(body.rpc, 'http://custom.rpc:8080');
  });

  it('uses VITE_TOKEN_CONTRACT_ADDRESS from env', () => {
    const { body } = cfHealthHandler(customEnv);
    assert.strictEqual(body.contracts.token, customEnv.VITE_TOKEN_CONTRACT_ADDRESS);
  });

  it('uses VITE_NFT_CONTRACT_ADDRESS from env', () => {
    const { body } = cfHealthHandler(customEnv);
    assert.strictEqual(body.contracts.nft, customEnv.VITE_NFT_CONTRACT_ADDRESS);
  });

  it('uses VITE_STAKING_CONTRACT_ADDRESS from env', () => {
    const { body } = cfHealthHandler(customEnv);
    assert.strictEqual(body.contracts.staking, customEnv.VITE_STAKING_CONTRACT_ADDRESS);
  });

  it('static fields are not overridden by env', () => {
    const { body } = cfHealthHandler(customEnv);
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.chainId, 13390);
    assert.strictEqual(body.domain, 'meebot.io');
    assert.strictEqual(body.version, '2.0.0');
  });
});

// ── Tests: response shape ────────────────────────────────────────────────

describe('cf /api/health — response shape', () => {
  it('body contains all required top-level fields', () => {
    const { body } = cfHealthHandler();
    const required = ['status', 'model', 'bot', 'web3', 'chainId', 'rpc', 'contracts', 'domain', 'version'];
    for (const field of required) {
      assert.ok(field in body, `missing field: ${field}`);
    }
  });

  it('contracts object contains token, nft, staking keys', () => {
    const { body } = cfHealthHandler();
    assert.ok('token'   in body.contracts, 'contracts.token missing');
    assert.ok('nft'     in body.contracts, 'contracts.nft missing');
    assert.ok('staking' in body.contracts, 'contracts.staking missing');
  });

  it('all contract addresses start with 0x', () => {
    const { body } = cfHealthHandler();
    assert.ok(body.contracts.token.startsWith('0x'),   'token not hex');
    assert.ok(body.contracts.nft.startsWith('0x'),     'nft not hex');
    assert.ok(body.contracts.staking.startsWith('0x'), 'staking not hex');
  });

  it('response headers include Content-Type application/json', () => {
    const { headers } = cfHealthHandler();
    assert.strictEqual(headers['Content-Type'], 'application/json');
  });

  it('response headers include Access-Control-Allow-Origin: *', () => {
    const { headers } = cfHealthHandler();
    assert.strictEqual(headers['Access-Control-Allow-Origin'], '*');
  });

  it('response headers include Cache-Control: no-cache', () => {
    const { headers } = cfHealthHandler();
    assert.strictEqual(headers['Cache-Control'], 'no-cache');
  });

  it('chainId is always the integer 13390 (not a string)', () => {
    const { body } = cfHealthHandler();
    assert.strictEqual(typeof body.chainId, 'number');
    assert.strictEqual(body.chainId, 13390);
  });

  it('web3 is always boolean false (not "false" string)', () => {
    const { body } = cfHealthHandler();
    assert.strictEqual(typeof body.web3, 'boolean');
    assert.strictEqual(body.web3, false);
  });
});

// ── Tests: regression / boundary ────────────────────────────────────────

describe('cf /api/health — regression', () => {
  it('partial env override: only DRPC_RPC_URL set — contracts use defaults', () => {
    const { body } = cfHealthHandler({ DRPC_RPC_URL: 'http://my-rpc' });
    assert.strictEqual(body.rpc, 'http://my-rpc');
    assert.strictEqual(body.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  });

  it('empty string env var for DRPC_RPC_URL falls through to default', () => {
    // An empty string is falsy, so || default kicks in
    const { body } = cfHealthHandler({ DRPC_RPC_URL: '' });
    assert.strictEqual(body.rpc, 'http://rpc.meechain.run.place');
  });

  it('body is JSON-serialisable without throwing', () => {
    const { body } = cfHealthHandler();
    assert.doesNotThrow(() => JSON.stringify(body));
  });
});