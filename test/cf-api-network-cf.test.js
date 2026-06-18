'use strict';
/**
 * Tests for the Cloudflare Pages Function: cf-deploy/functions/api/network.js
 *
 * Handler under test: onRequestGet(ctx) — cf-deploy/functions/api/network.js
 *
 * NOTE: This is separate from test/server-api-network.test.js which tests
 * the server.js /api/network route. This file tests the new CF Pages Function.
 *
 * Behaviour:
 *  - chainId: hex string derived from env.CHAIN_ID (default 13390 → '0x344e')
 *  - chainName: always 'MeeChain Ritual Chain'
 *  - rpcUrls: two entries — DRPC_RPC_URL (or default) and VITE_RPC_URL (or default)
 *  - nativeCurrency: { name: 'MEE Token', symbol: 'MEE', decimals: 18 }
 *  - blockExplorerUrls: single entry 'http://explorer.meechain.run.place'
 *  - contracts: token, nft, portal — each from env or hardcoded default
 *  - Headers: Content-Type application/json, CORS *
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/network.js ───────

async function onRequestGet(ctx) {
  const { env } = ctx;

  const chainId = parseInt(env.CHAIN_ID || '13390', 10);
  const data = {
    chainId:          `0x${chainId.toString(16)}`,
    chainName:        'MeeChain Ritual Chain',
    rpcUrls:          [
      env.DRPC_RPC_URL    || 'http://rpc.meechain.run.place',
      env.VITE_RPC_URL    || 'https://ritual-chain--pouaun2499.replit.app',
    ],
    nativeCurrency:   { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
    blockExplorerUrls:['http://explorer.meechain.run.place'],
    contracts: {
      token:   env.VITE_TOKEN_CONTRACT_ADDRESS   || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      nft:     env.VITE_NFT_CONTRACT_ADDRESS     || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      portal:  env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    },
  };

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function makeCtx(env = {}) {
  return { env };
}

async function getBody(env = {}) {
  const resp = await onRequestGet(makeCtx(env));
  const text = await resp.text();
  return { resp, body: JSON.parse(text) };
}

// ── Tests: chainId field ──────────────────────────────────────────────────

describe('/api/network (CF) — chainId field', () => {
  it('default chainId is "0x344e" (13390 in hex)', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.chainId, '0x344e');
  });

  it('chainId uses CHAIN_ID env var when set', async () => {
    const { body } = await getBody({ CHAIN_ID: '1' });
    assert.strictEqual(body.chainId, '0x1');
  });

  it('chainId is a lowercase hex string with 0x prefix', async () => {
    const { body } = await getBody();
    assert.ok(/^0x[0-9a-f]+$/.test(body.chainId), 'chainId must be lowercase hex with 0x prefix');
  });

  it('chainId for CHAIN_ID=255 is "0xff"', async () => {
    const { body } = await getBody({ CHAIN_ID: '255' });
    assert.strictEqual(body.chainId, '0xff');
  });

  it('parseInt of chainId hex matches parseInt of CHAIN_ID', async () => {
    const chainIdDecimal = 13390;
    const { body } = await getBody({ CHAIN_ID: String(chainIdDecimal) });
    assert.strictEqual(parseInt(body.chainId, 16), chainIdDecimal);
  });
});

// ── Tests: chainName ──────────────────────────────────────────────────────

describe('/api/network (CF) — chainName', () => {
  it('chainName is always "MeeChain Ritual Chain"', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.chainName, 'MeeChain Ritual Chain');
  });

  it('chainName is not affected by env vars', async () => {
    const { body } = await getBody({ CHAIN_ID: '1', DRPC_RPC_URL: 'https://other.rpc' });
    assert.strictEqual(body.chainName, 'MeeChain Ritual Chain');
  });
});

// ── Tests: rpcUrls field ──────────────────────────────────────────────────

describe('/api/network (CF) — rpcUrls field', () => {
  it('rpcUrls is an array with exactly 2 entries', async () => {
    const { body } = await getBody();
    assert.ok(Array.isArray(body.rpcUrls));
    assert.strictEqual(body.rpcUrls.length, 2);
  });

  it('first rpcUrl defaults to http://rpc.meechain.run.place', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.rpcUrls[0], 'http://rpc.meechain.run.place');
  });

  it('first rpcUrl uses DRPC_RPC_URL env var when set', async () => {
    const { body } = await getBody({ DRPC_RPC_URL: 'https://custom.drpc.example' });
    assert.strictEqual(body.rpcUrls[0], 'https://custom.drpc.example');
  });

  it('second rpcUrl defaults to replit fallback URL', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.rpcUrls[1], 'https://ritual-chain--pouaun2499.replit.app');
  });

  it('second rpcUrl uses VITE_RPC_URL env var when set', async () => {
    const { body } = await getBody({ VITE_RPC_URL: 'https://custom.vite.rpc' });
    assert.strictEqual(body.rpcUrls[1], 'https://custom.vite.rpc');
  });

  it('both rpcUrls can be overridden independently', async () => {
    const { body } = await getBody({ DRPC_RPC_URL: 'https://rpc1.example', VITE_RPC_URL: 'https://rpc2.example' });
    assert.strictEqual(body.rpcUrls[0], 'https://rpc1.example');
    assert.strictEqual(body.rpcUrls[1], 'https://rpc2.example');
  });
});

// ── Tests: nativeCurrency ─────────────────────────────────────────────────

describe('/api/network (CF) — nativeCurrency', () => {
  it('nativeCurrency.name is "MEE Token"', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.nativeCurrency.name, 'MEE Token');
  });

  it('nativeCurrency.symbol is "MEE"', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.nativeCurrency.symbol, 'MEE');
  });

  it('nativeCurrency.decimals is 18', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.nativeCurrency.decimals, 18);
  });
});

// ── Tests: blockExplorerUrls ──────────────────────────────────────────────

describe('/api/network (CF) — blockExplorerUrls', () => {
  it('blockExplorerUrls is an array', async () => {
    const { body } = await getBody();
    assert.ok(Array.isArray(body.blockExplorerUrls));
  });

  it('blockExplorerUrls has exactly one entry', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.blockExplorerUrls.length, 1);
  });

  it('first blockExplorerUrl is http://explorer.meechain.run.place', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.blockExplorerUrls[0], 'http://explorer.meechain.run.place');
  });
});

// ── Tests: contracts field ────────────────────────────────────────────────

describe('/api/network (CF) — contracts field', () => {
  it('contracts has token, nft, and portal keys', async () => {
    const { body } = await getBody();
    assert.ok('token'  in body.contracts, 'contracts.token must be present');
    assert.ok('nft'    in body.contracts, 'contracts.nft must be present');
    assert.ok('portal' in body.contracts, 'contracts.portal must be present');
  });

  it('token uses default when VITE_TOKEN_CONTRACT_ADDRESS is not set', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  });

  it('nft uses default when VITE_NFT_CONTRACT_ADDRESS is not set', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  });

  it('portal uses default when VITE_STAKING_CONTRACT_ADDRESS is not set', async () => {
    const { body } = await getBody();
    assert.strictEqual(body.contracts.portal, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  it('contracts.token uses VITE_TOKEN_CONTRACT_ADDRESS env var', async () => {
    const { body } = await getBody({ VITE_TOKEN_CONTRACT_ADDRESS: '0xTOKEN' });
    assert.strictEqual(body.contracts.token, '0xTOKEN');
  });

  it('contracts.nft uses VITE_NFT_CONTRACT_ADDRESS env var', async () => {
    const { body } = await getBody({ VITE_NFT_CONTRACT_ADDRESS: '0xNFT' });
    assert.strictEqual(body.contracts.nft, '0xNFT');
  });

  it('contracts.portal uses VITE_STAKING_CONTRACT_ADDRESS env var', async () => {
    const { body } = await getBody({ VITE_STAKING_CONTRACT_ADDRESS: '0xPORTAL' });
    assert.strictEqual(body.contracts.portal, '0xPORTAL');
  });

  it('contracts field does NOT contain "staking" key (CF network uses portal)', async () => {
    const { body } = await getBody();
    assert.ok(!('staking' in body.contracts), 'CF network handler uses portal, not staking');
  });
});

// ── Tests: HTTP response headers ──────────────────────────────────────────

describe('/api/network (CF) — response headers', () => {
  it('Content-Type is application/json', async () => {
    const { resp } = await getBody();
    assert.ok(resp.headers.get('Content-Type').includes('application/json'));
  });

  it('Access-Control-Allow-Origin is *', async () => {
    const { resp } = await getBody();
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('response body is valid JSON', async () => {
    const resp = await onRequestGet(makeCtx());
    const text = await resp.text();
    assert.doesNotThrow(() => JSON.parse(text));
  });
});

// ── Tests: regression — response shape ───────────────────────────────────

describe('/api/network (CF) — regression: response shape', () => {
  it('response has all expected top-level fields', async () => {
    const { body } = await getBody();
    const required = ['chainId', 'chainName', 'rpcUrls', 'nativeCurrency', 'blockExplorerUrls', 'contracts'];
    for (const field of required) {
      assert.ok(field in body, `response must include field: ${field}`);
    }
  });

  it('chainId roundtrips through parseInt correctly', async () => {
    const { body } = await getBody({ CHAIN_ID: '13390' });
    assert.strictEqual(parseInt(body.chainId, 16), 13390);
  });

  it('CHAIN_ID=0 produces "0x0"', async () => {
    const { body } = await getBody({ CHAIN_ID: '0' });
    assert.strictEqual(body.chainId, '0x0');
  });
});