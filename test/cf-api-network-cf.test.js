'use strict';
/**
 * Tests for cf-deploy/functions/api/network.js
 *
 * Tests the Cloudflare Pages Function that returns EVM network configuration
 * for MeeChain Ritual Chain. Logic is replicated from the source file to
 * enable unit testing without ESM module loading.
 *
 * Function under test: onRequestGet(ctx)
 * - Computes chainId hex from CHAIN_ID env (default: 13390)
 * - Returns rpcUrls array with DRPC_RPC_URL and VITE_RPC_URL (with defaults)
 * - Returns nativeCurrency with name/symbol/decimals
 * - Returns blockExplorerUrls
 * - Returns contracts with token/nft/portal
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/network.js ────────

async function onRequestGet(ctx) {
  const { env } = ctx;

  const chainId = parseInt(env.CHAIN_ID || '13390', 10);
  const data = {
    chainId:           `0x${chainId.toString(16)}`,
    chainName:         'MeeChain Ritual Chain',
    rpcUrls:           [
      env.DRPC_RPC_URL || 'http://rpc.meechain.run.place',
      env.VITE_RPC_URL || 'https://ritual-chain--pouaun2499.replit.app',
    ],
    nativeCurrency:    { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
    blockExplorerUrls: ['http://explorer.meechain.run.place'],
    contracts: {
      token:  env.VITE_TOKEN_CONTRACT_ADDRESS   || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      nft:    env.VITE_NFT_CONTRACT_ADDRESS     || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      portal: env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    },
  };

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ── Helper ────────────────────────────────────────────────────────────────

function mkCtx(env = {}) {
  return { env };
}

// ── Tests: default env values ─────────────────────────────────────────────

describe('/api/network (CF) — default env values', () => {
  it('responds with HTTP 200', async () => {
    const res = await onRequestGet(mkCtx());
    assert.strictEqual(res.status, 200);
  });

  it('default chainId hex is 0x344e (13390)', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.chainId, '0x344e');
  });

  it('chainName is "MeeChain Ritual Chain"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.chainName, 'MeeChain Ritual Chain');
  });

  it('rpcUrls is an array with two entries', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok(Array.isArray(body.rpcUrls), 'rpcUrls must be array');
    assert.strictEqual(body.rpcUrls.length, 2);
  });

  it('first default rpcUrl is rpc.meechain.run.place', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok(body.rpcUrls[0].includes('rpc.meechain.run.place'));
  });

  it('second default rpcUrl is the Replit endpoint', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok(body.rpcUrls[1].includes('ritual-chain'));
  });

  it('nativeCurrency.name is "MEE Token"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.nativeCurrency.name, 'MEE Token');
  });

  it('nativeCurrency.symbol is "MEE"', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.nativeCurrency.symbol, 'MEE');
  });

  it('nativeCurrency.decimals is 18', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.nativeCurrency.decimals, 18);
  });

  it('blockExplorerUrls contains explorer.meechain.run.place', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok(Array.isArray(body.blockExplorerUrls), 'blockExplorerUrls must be array');
    assert.ok(
      body.blockExplorerUrls.some(u => u.includes('explorer.meechain.run.place')),
      'blockExplorerUrls must include explorer.meechain.run.place'
    );
  });

  it('contracts has token, nft, portal keys', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok('token' in body.contracts,  'contracts must have token');
    assert.ok('nft' in body.contracts,    'contracts must have nft');
    assert.ok('portal' in body.contracts, 'contracts must have portal');
  });

  it('default token contract is 0x5FbDB...', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  });

  it('default nft contract is 0xe7f17...', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  });

  it('default portal contract is 0x9fE46...', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.contracts.portal, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });
});

// ── Tests: CHAIN_ID env var ────────────────────────────────────────────────

describe('/api/network (CF) — CHAIN_ID env var', () => {
  it('converts custom CHAIN_ID to hex correctly', async () => {
    const res = await onRequestGet(mkCtx({ CHAIN_ID: '1' }));
    const body = await res.json();
    assert.strictEqual(body.chainId, '0x1');
  });

  it('handles CHAIN_ID=1 (Ethereum mainnet) for testing', async () => {
    const res = await onRequestGet(mkCtx({ CHAIN_ID: '1' }));
    const body = await res.json();
    assert.strictEqual(body.chainId, '0x1');
  });

  it('handles large CHAIN_ID (e.g., 137 Polygon) hex correctly', async () => {
    const res = await onRequestGet(mkCtx({ CHAIN_ID: '137' }));
    const body = await res.json();
    assert.strictEqual(body.chainId, '0x89');
  });

  it('falls back to 13390 if CHAIN_ID is not set', async () => {
    const res = await onRequestGet(mkCtx({}));
    const body = await res.json();
    assert.strictEqual(body.chainId, '0x344e');
  });

  it('chainId hex from 13390 is always 0x344e', async () => {
    // Regression: verify hex arithmetic
    assert.strictEqual((13390).toString(16), '344e');
  });
});

// ── Tests: RPC URL env var overrides ──────────────────────────────────────

describe('/api/network (CF) — RPC URL env var overrides', () => {
  it('uses DRPC_RPC_URL env var as first rpcUrl', async () => {
    const res = await onRequestGet(mkCtx({ DRPC_RPC_URL: 'https://custom-drpc.example.com' }));
    const body = await res.json();
    assert.strictEqual(body.rpcUrls[0], 'https://custom-drpc.example.com');
  });

  it('uses VITE_RPC_URL env var as second rpcUrl', async () => {
    const res = await onRequestGet(mkCtx({ VITE_RPC_URL: 'https://custom-vite.example.com' }));
    const body = await res.json();
    assert.strictEqual(body.rpcUrls[1], 'https://custom-vite.example.com');
  });

  it('both RPC URL env vars can be overridden independently', async () => {
    const env = { DRPC_RPC_URL: 'https://a.com', VITE_RPC_URL: 'https://b.com' };
    const res = await onRequestGet(mkCtx(env));
    const body = await res.json();
    assert.strictEqual(body.rpcUrls[0], 'https://a.com');
    assert.strictEqual(body.rpcUrls[1], 'https://b.com');
  });
});

// ── Tests: contract address env var overrides ─────────────────────────────

describe('/api/network (CF) — contract address env var overrides', () => {
  it('uses VITE_TOKEN_CONTRACT_ADDRESS env var', async () => {
    const res = await onRequestGet(mkCtx({ VITE_TOKEN_CONTRACT_ADDRESS: '0x1111' }));
    const body = await res.json();
    assert.strictEqual(body.contracts.token, '0x1111');
  });

  it('uses VITE_NFT_CONTRACT_ADDRESS env var', async () => {
    const res = await onRequestGet(mkCtx({ VITE_NFT_CONTRACT_ADDRESS: '0x2222' }));
    const body = await res.json();
    assert.strictEqual(body.contracts.nft, '0x2222');
  });

  it('uses VITE_STAKING_CONTRACT_ADDRESS env var as portal', async () => {
    const res = await onRequestGet(mkCtx({ VITE_STAKING_CONTRACT_ADDRESS: '0x3333' }));
    const body = await res.json();
    assert.strictEqual(body.contracts.portal, '0x3333');
  });
});

// ── Tests: response headers ────────────────────────────────────────────────

describe('/api/network (CF) — response headers', () => {
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
});

// ── Tests: regression / shape ─────────────────────────────────────────────

describe('/api/network (CF) — regression: response shape', () => {
  const REQUIRED_FIELDS = [
    'chainId', 'chainName', 'rpcUrls', 'nativeCurrency',
    'blockExplorerUrls', 'contracts',
  ];

  it('response contains all required top-level fields', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    for (const field of REQUIRED_FIELDS) {
      assert.ok(field in body, `response must include field: ${field}`);
    }
  });

  it('chainId is a hex string starting with 0x', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok(typeof body.chainId === 'string' && body.chainId.startsWith('0x'));
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

  it('nativeCurrency has name, symbol, decimals', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok('name' in body.nativeCurrency);
    assert.ok('symbol' in body.nativeCurrency);
    assert.ok('decimals' in body.nativeCurrency);
  });

  it('decimals is exactly 18 (EVM standard)', async () => {
    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.nativeCurrency.decimals, 18);
  });
});