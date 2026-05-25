'use strict';
/**
 * Tests for cf-deploy/functions/api/network.js
 *
 * Replicates the onRequestGet handler logic inline. The function returns
 * EIP-3085 add_ethereum_chain parameters for MeeChain / Ritual Chain.
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Replicate onRequestGet from cf-deploy/functions/api/network.js ─────────

function cfNetworkHandler(env = {}) {
  const chainId = parseInt(env.CHAIN_ID || '13390', 10);
  const data = {
    chainId:           `0x${chainId.toString(16)}`,
    chainName:         'MeeChain Ritual Chain',
    rpcUrls: [
      env.DRPC_RPC_URL  || 'http://rpc.meechain.run.place',
      env.VITE_RPC_URL  || 'https://ritual-chain--pouaun2499.replit.app',
    ],
    nativeCurrency:    { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
    blockExplorerUrls: ['http://explorer.meechain.run.place'],
    contracts: {
      token:  env.VITE_TOKEN_CONTRACT_ADDRESS   || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      nft:    env.VITE_NFT_CONTRACT_ADDRESS     || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      portal: env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    },
  };
  return {
    body: data,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  };
}

// ── Tests: chainId handling ──────────────────────────────────────────────

describe('cf /api/network — chainId handling', () => {
  it('default CHAIN_ID produces hex "0x344e"', () => {
    const { body } = cfNetworkHandler();
    assert.strictEqual(body.chainId, '0x344e');
  });

  it('default CHAIN_ID 13390 converts to 0x344e correctly', () => {
    assert.strictEqual(parseInt('0x344e', 16), 13390);
    const { body } = cfNetworkHandler();
    assert.strictEqual(parseInt(body.chainId, 16), 13390);
  });

  it('custom CHAIN_ID env var is parsed and hex-encoded', () => {
    const { body } = cfNetworkHandler({ CHAIN_ID: '1' });
    assert.strictEqual(body.chainId, '0x1');
  });

  it('chainId is returned as a string (hex), not a number', () => {
    const { body } = cfNetworkHandler();
    assert.strictEqual(typeof body.chainId, 'string');
    assert.ok(body.chainId.startsWith('0x'), 'chainId must be 0x-prefixed');
  });

  it('invalid CHAIN_ID string falls back to NaN-producing parseInt and formats gracefully', () => {
    // parseInt('abc', 10) → NaN → toString(16) → 'NaN' — ensures no crash
    const { body } = cfNetworkHandler({ CHAIN_ID: 'abc' });
    assert.strictEqual(typeof body.chainId, 'string');
  });
});

// ── Tests: static / constant fields ─────────────────────────────────────

describe('cf /api/network — static fields', () => {
  it('chainName is "MeeChain Ritual Chain"', () => {
    const { body } = cfNetworkHandler();
    assert.strictEqual(body.chainName, 'MeeChain Ritual Chain');
  });

  it('nativeCurrency.name is "MEE Token"', () => {
    const { body } = cfNetworkHandler();
    assert.strictEqual(body.nativeCurrency.name, 'MEE Token');
  });

  it('nativeCurrency.symbol is "MEE"', () => {
    const { body } = cfNetworkHandler();
    assert.strictEqual(body.nativeCurrency.symbol, 'MEE');
  });

  it('nativeCurrency.decimals is 18', () => {
    const { body } = cfNetworkHandler();
    assert.strictEqual(body.nativeCurrency.decimals, 18);
  });

  it('blockExplorerUrls contains one entry', () => {
    const { body } = cfNetworkHandler();
    assert.ok(Array.isArray(body.blockExplorerUrls), 'blockExplorerUrls must be array');
    assert.strictEqual(body.blockExplorerUrls.length, 1);
  });

  it('blockExplorerUrl points to explorer.meechain.run.place', () => {
    const { body } = cfNetworkHandler();
    assert.ok(body.blockExplorerUrls[0].includes('explorer.meechain.run.place'));
  });
});

// ── Tests: rpcUrls ───────────────────────────────────────────────────────

describe('cf /api/network — rpcUrls', () => {
  it('rpcUrls is an array with exactly 2 entries', () => {
    const { body } = cfNetworkHandler();
    assert.ok(Array.isArray(body.rpcUrls), 'rpcUrls must be array');
    assert.strictEqual(body.rpcUrls.length, 2);
  });

  it('default primary rpcUrl is http://rpc.meechain.run.place', () => {
    const { body } = cfNetworkHandler();
    assert.strictEqual(body.rpcUrls[0], 'http://rpc.meechain.run.place');
  });

  it('default secondary rpcUrl is the replit app URL', () => {
    const { body } = cfNetworkHandler();
    assert.ok(body.rpcUrls[1].includes('replit.app') || body.rpcUrls[1].includes('ritual-chain'));
  });

  it('DRPC_RPC_URL env var overrides primary rpcUrl', () => {
    const { body } = cfNetworkHandler({ DRPC_RPC_URL: 'https://my-rpc.example.com' });
    assert.strictEqual(body.rpcUrls[0], 'https://my-rpc.example.com');
  });

  it('VITE_RPC_URL env var overrides secondary rpcUrl', () => {
    const { body } = cfNetworkHandler({ VITE_RPC_URL: 'https://secondary.example.com' });
    assert.strictEqual(body.rpcUrls[1], 'https://secondary.example.com');
  });

  it('custom DRPC_RPC_URL does not affect secondary rpcUrl', () => {
    const { body } = cfNetworkHandler({ DRPC_RPC_URL: 'https://custom.rpc' });
    assert.ok(!body.rpcUrls[1].includes('custom.rpc'));
  });
});

// ── Tests: contracts ─────────────────────────────────────────────────────

describe('cf /api/network — contracts', () => {
  it('contracts object has token, nft, portal keys', () => {
    const { body } = cfNetworkHandler();
    assert.ok('token'  in body.contracts, 'contracts.token missing');
    assert.ok('nft'    in body.contracts, 'contracts.nft missing');
    assert.ok('portal' in body.contracts, 'contracts.portal missing');
  });

  it('contracts does NOT have a staking key (uses portal in this endpoint)', () => {
    const { body } = cfNetworkHandler();
    assert.ok(!('staking' in body.contracts), 'should use portal not staking key');
  });

  it('default token address is correct', () => {
    const { body } = cfNetworkHandler();
    assert.strictEqual(body.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  });

  it('default nft address is correct', () => {
    const { body } = cfNetworkHandler();
    assert.strictEqual(body.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  });

  it('default portal address is correct', () => {
    const { body } = cfNetworkHandler();
    assert.strictEqual(body.contracts.portal, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  it('VITE_TOKEN_CONTRACT_ADDRESS overrides token address', () => {
    const addr = '0x1111111111111111111111111111111111111111';
    const { body } = cfNetworkHandler({ VITE_TOKEN_CONTRACT_ADDRESS: addr });
    assert.strictEqual(body.contracts.token, addr);
  });

  it('VITE_NFT_CONTRACT_ADDRESS overrides nft address', () => {
    const addr = '0x2222222222222222222222222222222222222222';
    const { body } = cfNetworkHandler({ VITE_NFT_CONTRACT_ADDRESS: addr });
    assert.strictEqual(body.contracts.nft, addr);
  });

  it('VITE_STAKING_CONTRACT_ADDRESS overrides portal address', () => {
    const addr = '0x3333333333333333333333333333333333333333';
    const { body } = cfNetworkHandler({ VITE_STAKING_CONTRACT_ADDRESS: addr });
    assert.strictEqual(body.contracts.portal, addr);
  });
});

// ── Tests: response headers ──────────────────────────────────────────────

describe('cf /api/network — response headers', () => {
  it('Content-Type is application/json', () => {
    const { headers } = cfNetworkHandler();
    assert.strictEqual(headers['Content-Type'], 'application/json');
  });

  it('Access-Control-Allow-Origin is *', () => {
    const { headers } = cfNetworkHandler();
    assert.strictEqual(headers['Access-Control-Allow-Origin'], '*');
  });
});

// ── Tests: response shape ────────────────────────────────────────────────

describe('cf /api/network — response shape (regression)', () => {
  it('body has all required EIP-3085 fields', () => {
    const { body } = cfNetworkHandler();
    const required = ['chainId', 'chainName', 'rpcUrls', 'nativeCurrency', 'blockExplorerUrls', 'contracts'];
    for (const field of required) {
      assert.ok(field in body, `missing field: ${field}`);
    }
  });

  it('body is JSON-serialisable without throwing', () => {
    const { body } = cfNetworkHandler();
    assert.doesNotThrow(() => JSON.stringify(body));
  });

  it('chainId hex round-trips: parseInt(chainId, 16) == original decimal', () => {
    const { body } = cfNetworkHandler({ CHAIN_ID: '13390' });
    assert.strictEqual(parseInt(body.chainId, 16), 13390);
  });

  it('nativeCurrency has name, symbol, decimals', () => {
    const { body } = cfNetworkHandler();
    const nc = body.nativeCurrency;
    assert.ok('name'     in nc);
    assert.ok('symbol'   in nc);
    assert.ok('decimals' in nc);
  });
});