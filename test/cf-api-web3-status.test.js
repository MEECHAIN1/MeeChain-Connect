'use strict';
/**
 * Tests for cf-deploy/functions/api/web3/status.js
 *
 * Tests the Cloudflare Pages Function that checks the live connection to
 * the MeeChain RPC endpoint by calling eth_blockNumber. Logic is replicated
 * from the source file.
 *
 * Function under test: onRequestGet(ctx)
 *
 * Key behaviours:
 *   - When RPC responds with valid hex block number → connected=true, blockNumber is integer
 *   - When RPC fetch throws (timeout/network error) → connected=false, blockNumber=null
 *   - When RPC returns non-ok HTTP status → connected=false, blockNumber=null
 *   - When RPC returns invalid/non-hex result → connected=false (isNaN)
 *   - Default rpc URL is http://rpc.meechain.run.place
 *   - Env vars override rpc, chainId, and contract addresses
 *   - Response always includes rpc, chainId, contracts, connected, blockNumber
 *   - Response headers include CORS and Cache-Control: no-cache
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/web3/status.js ───

async function onRequestGet(ctx) {
  const { env } = ctx;

  const rpcUrl   = env.DRPC_RPC_URL || 'http://rpc.meechain.run.place';
  const chainId  = parseInt(env.CHAIN_ID || '13390', 10);
  const contracts = {
    token:   env.VITE_TOKEN_CONTRACT_ADDRESS   || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    nft:     env.VITE_NFT_CONTRACT_ADDRESS     || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    portal:  env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  };

  let connected    = false;
  let blockNumber  = null;

  try {
    const resp = await globalThis.fetch(rpcUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const json  = await resp.json();
      blockNumber = parseInt(json.result, 16);
      connected   = !isNaN(blockNumber);
    }
  } catch (_) {}

  return new Response(JSON.stringify({
    connected, blockNumber,
    rpc: rpcUrl, chainId, contracts,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function mkCtx(env = {}) {
  return { env };
}

/** Build a valid eth_blockNumber JSON-RPC response. */
function mockRpcOk(hexBlock = '0x131071') {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', id: 1, result: hexBlock }),
    { status: 200 }
  );
}

// ── fetch mock management ─────────────────────────────────────────────────

let _originalFetch;
beforeEach(() => {
  _originalFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = _originalFetch;
});

// ── Tests: RPC connection succeeds ────────────────────────────────────────

describe('/api/web3/status (CF) — RPC connected', () => {
  it('connected is true when RPC returns valid block number', async () => {
    globalThis.fetch = async () => mockRpcOk('0x131071');

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.connected, true);
  });

  it('blockNumber is the integer parsed from hex result', async () => {
    globalThis.fetch = async () => mockRpcOk('0x131071');

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.blockNumber, 0x131071);
    assert.strictEqual(typeof body.blockNumber, 'number');
  });

  it('correctly parses small block number 0x1', async () => {
    globalThis.fetch = async () => mockRpcOk('0x1');

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.blockNumber, 1);
    assert.strictEqual(body.connected, true);
  });

  it('correctly parses large block number', async () => {
    globalThis.fetch = async () => mockRpcOk('0xffffff');

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.blockNumber, 0xffffff);
    assert.strictEqual(body.connected, true);
  });

  it('responds HTTP 200 when connected', async () => {
    globalThis.fetch = async () => mockRpcOk('0x100');

    const res = await onRequestGet(mkCtx());
    assert.strictEqual(res.status, 200);
  });
});

// ── Tests: RPC connection fails ────────────────────────────────────────────

describe('/api/web3/status (CF) — RPC unreachable', () => {
  it('connected is false when fetch throws', async () => {
    globalThis.fetch = async () => { throw new Error('Connection refused'); };

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.connected, false);
  });

  it('blockNumber is null when fetch throws', async () => {
    globalThis.fetch = async () => { throw new Error('Timeout'); };

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.blockNumber, null);
  });

  it('connected is false when RPC returns HTTP 502', async () => {
    globalThis.fetch = async () => new Response('Bad Gateway', { status: 502 });

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.connected, false);
  });

  it('blockNumber is null when RPC returns HTTP 404', async () => {
    globalThis.fetch = async () => new Response('Not Found', { status: 404 });

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.blockNumber, null);
  });

  it('responds HTTP 200 even when RPC is unreachable (graceful degradation)', async () => {
    globalThis.fetch = async () => { throw new Error('ECONNREFUSED'); };

    const res = await onRequestGet(mkCtx());
    assert.strictEqual(res.status, 200);
  });

  it('connected is false when result field is missing from JSON', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1 }), { status: 200 });

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.connected, false);
  });

  it('connected is false when result is non-hex string', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: 'not-a-hex' }), { status: 200 });

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    // parseInt('not-a-hex', 16) → NaN → connected should be false
    assert.strictEqual(body.connected, false);
  });
});

// ── Tests: env var configuration ──────────────────────────────────────────

describe('/api/web3/status (CF) — env var configuration', () => {
  it('uses DRPC_RPC_URL env var as rpc field', async () => {
    globalThis.fetch = async () => mockRpcOk('0x1');

    const res = await onRequestGet(mkCtx({ DRPC_RPC_URL: 'https://custom-rpc.example.com' }));
    const body = await res.json();
    assert.strictEqual(body.rpc, 'https://custom-rpc.example.com');
  });

  it('calls the custom DRPC_RPC_URL endpoint', async () => {
    let calledUrl = '';
    globalThis.fetch = async (url) => {
      calledUrl = url;
      return mockRpcOk('0x1');
    };

    await onRequestGet(mkCtx({ DRPC_RPC_URL: 'https://custom-rpc.example.com' }));
    assert.strictEqual(calledUrl, 'https://custom-rpc.example.com');
  });

  it('default rpc is http://rpc.meechain.run.place', async () => {
    globalThis.fetch = async () => mockRpcOk('0x1');

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.rpc, 'http://rpc.meechain.run.place');
  });

  it('chainId defaults to 13390', async () => {
    globalThis.fetch = async () => mockRpcOk('0x1');

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(body.chainId, 13390);
  });

  it('uses CHAIN_ID env var', async () => {
    globalThis.fetch = async () => mockRpcOk('0x1');

    const res = await onRequestGet(mkCtx({ CHAIN_ID: '1' }));
    const body = await res.json();
    assert.strictEqual(body.chainId, 1);
  });

  it('uses VITE_TOKEN_CONTRACT_ADDRESS env var', async () => {
    globalThis.fetch = async () => mockRpcOk('0x1');

    const res = await onRequestGet(mkCtx({ VITE_TOKEN_CONTRACT_ADDRESS: '0xTOKEN' }));
    const body = await res.json();
    assert.strictEqual(body.contracts.token, '0xTOKEN');
  });

  it('uses VITE_NFT_CONTRACT_ADDRESS env var', async () => {
    globalThis.fetch = async () => mockRpcOk('0x1');

    const res = await onRequestGet(mkCtx({ VITE_NFT_CONTRACT_ADDRESS: '0xNFT' }));
    const body = await res.json();
    assert.strictEqual(body.contracts.nft, '0xNFT');
  });

  it('uses VITE_STAKING_CONTRACT_ADDRESS env var as portal', async () => {
    globalThis.fetch = async () => mockRpcOk('0x1');

    const res = await onRequestGet(mkCtx({ VITE_STAKING_CONTRACT_ADDRESS: '0xPORTAL' }));
    const body = await res.json();
    assert.strictEqual(body.contracts.portal, '0xPORTAL');
  });
});

// ── Tests: RPC request shape ───────────────────────────────────────────────

describe('/api/web3/status (CF) — eth_blockNumber request format', () => {
  it('sends POST request to RPC URL', async () => {
    let capturedMethod = '';
    globalThis.fetch = async (url, opts) => {
      capturedMethod = opts.method;
      return mockRpcOk('0x1');
    };

    await onRequestGet(mkCtx());
    assert.strictEqual(capturedMethod, 'POST');
  });

  it('sends eth_blockNumber JSON-RPC method', async () => {
    let capturedBody = null;
    globalThis.fetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return mockRpcOk('0x1');
    };

    await onRequestGet(mkCtx());
    assert.strictEqual(capturedBody.method, 'eth_blockNumber');
    assert.strictEqual(capturedBody.jsonrpc, '2.0');
  });

  it('sends Content-Type: application/json header', async () => {
    let capturedHeaders = null;
    globalThis.fetch = async (url, opts) => {
      capturedHeaders = opts.headers;
      return mockRpcOk('0x1');
    };

    await onRequestGet(mkCtx());
    assert.strictEqual(capturedHeaders['Content-Type'], 'application/json');
  });
});

// ── Tests: response headers ────────────────────────────────────────────────

describe('/api/web3/status (CF) — response headers', () => {
  it('Content-Type is application/json', async () => {
    globalThis.fetch = async () => mockRpcOk('0x1');

    const res = await onRequestGet(mkCtx());
    assert.ok((res.headers.get('Content-Type') || '').includes('application/json'));
  });

  it('Access-Control-Allow-Origin is *', async () => {
    globalThis.fetch = async () => { throw new Error('fail'); };

    const res = await onRequestGet(mkCtx());
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('Cache-Control is no-cache', async () => {
    globalThis.fetch = async () => mockRpcOk('0x1');

    const res = await onRequestGet(mkCtx());
    assert.strictEqual(res.headers.get('Cache-Control'), 'no-cache');
  });
});

// ── Tests: regression / response shape ────────────────────────────────────

describe('/api/web3/status (CF) — regression: response shape', () => {
  const REQUIRED_FIELDS = ['connected', 'blockNumber', 'rpc', 'chainId', 'contracts'];

  it('response always contains all required fields', async () => {
    globalThis.fetch = async () => { throw new Error('fail'); };

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    for (const field of REQUIRED_FIELDS) {
      assert.ok(field in body, `response must include field: ${field}`);
    }
  });

  it('contracts always has token, nft, portal', async () => {
    globalThis.fetch = async () => { throw new Error('fail'); };

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok('token' in body.contracts);
    assert.ok('nft' in body.contracts);
    assert.ok('portal' in body.contracts);
  });

  it('connected is boolean (not truthy value)', async () => {
    globalThis.fetch = async () => mockRpcOk('0x100');

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.strictEqual(typeof body.connected, 'boolean');
  });

  it('blockNumber is null or integer (never a string)', async () => {
    globalThis.fetch = async () => mockRpcOk('0xabc');

    const res = await onRequestGet(mkCtx());
    const body = await res.json();
    assert.ok(
      body.blockNumber === null || Number.isInteger(body.blockNumber),
      'blockNumber must be null or integer'
    );
  });
});
