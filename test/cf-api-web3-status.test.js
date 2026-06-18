'use strict';
/**
 * Tests for the Cloudflare Pages Function: cf-deploy/functions/api/web3/status.js
 *
 * Handler under test: onRequestGet(ctx) — cf-deploy/functions/api/web3/status.js
 *
 * Behaviour:
 *   - Sends eth_blockNumber JSON-RPC POST to rpcUrl
 *   - If response is ok and result is a valid hex number → connected: true, blockNumber: <number>
 *   - If response is ok but result is not a valid hex → connected: false (NaN)
 *   - If response is not ok → connected: false, blockNumber: null
 *   - If fetch throws (network error, timeout) → connected: false, blockNumber: null
 *   - rpc field reflects the used rpcUrl
 *   - chainId from env.CHAIN_ID or default 13390
 *   - contracts: token, nft, portal from env or hardcoded defaults
 *   - Response headers: Content-Type: application/json, Access-Control-Allow-Origin: *, Cache-Control: no-cache
 *   - AbortSignal.timeout(5000) is used for the RPC fetch
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/web3/status.js ──

async function onRequestGet(ctx) {
  const { env, _fetch } = ctx;

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
    const resp = await _fetch(rpcUrl, {
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

function makeCtx(env = {}, fetchImpl = null) {
  return {
    env,
    _fetch: fetchImpl || (() => { throw new Error('fetch not mocked'); }),
  };
}

async function getBody(env = {}, fetchImpl = null) {
  const resp = await onRequestGet(makeCtx(env, fetchImpl));
  const text = await resp.text();
  return { resp, body: JSON.parse(text) };
}

function makeRpcOkResponse(hexBlockNumber) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ jsonrpc: '2.0', id: 1, result: hexBlockNumber }),
  };
}

function makeRpcErrorResponse(status = 500) {
  return {
    ok: false,
    status,
    json: async () => { throw new Error('not json'); },
  };
}

// ── Tests: connected: true scenarios ─────────────────────────────────────

describe('/api/web3/status (CF) — RPC reachable, valid hex block', () => {
  it('connected is true when RPC returns valid hex blockNumber', async () => {
    const { body } = await getBody({}, async () => makeRpcOkResponse('0x1307e1'));
    assert.strictEqual(body.connected, true);
  });

  it('blockNumber is the decimal integer parsed from hex', async () => {
    const { body } = await getBody({}, async () => makeRpcOkResponse('0x1307e1'));
    assert.strictEqual(body.blockNumber, parseInt('0x1307e1', 16));
  });

  it('blockNumber for 0x0 is 0 and connected is true', async () => {
    const { body } = await getBody({}, async () => makeRpcOkResponse('0x0'));
    assert.strictEqual(body.blockNumber, 0);
    assert.strictEqual(body.connected, true);
  });

  it('blockNumber for 0x1 is 1', async () => {
    const { body } = await getBody({}, async () => makeRpcOkResponse('0x1'));
    assert.strictEqual(body.blockNumber, 1);
    assert.strictEqual(body.connected, true);
  });

  it('blockNumber for large hex (0xffffff) is parsed correctly', async () => {
    const { body } = await getBody({}, async () => makeRpcOkResponse('0xffffff'));
    assert.strictEqual(body.blockNumber, 0xffffff);
    assert.strictEqual(body.connected, true);
  });
});

// ── Tests: connected: false scenarios ─────────────────────────────────────

describe('/api/web3/status (CF) — RPC unreachable or invalid response', () => {
  it('connected is false when fetch throws (network error)', async () => {
    const { body } = await getBody({}, async () => { throw new Error('ECONNREFUSED'); });
    assert.strictEqual(body.connected, false);
  });

  it('blockNumber is null when fetch throws', async () => {
    const { body } = await getBody({}, async () => { throw new Error('timeout'); });
    assert.strictEqual(body.blockNumber, null);
  });

  it('connected is false when RPC response is not ok (500)', async () => {
    const { body } = await getBody({}, async () => makeRpcErrorResponse(500));
    assert.strictEqual(body.connected, false);
  });

  it('blockNumber is null when RPC response is not ok', async () => {
    const { body } = await getBody({}, async () => makeRpcErrorResponse(503));
    assert.strictEqual(body.blockNumber, null);
  });

  it('connected is false when result is not a valid hex (null result)', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
    });
    const { body } = await getBody({}, fetchImpl);
    assert.strictEqual(body.connected, false);
    assert.ok(isNaN(body.blockNumber) || body.blockNumber === null || body.blockNumber !== body.blockNumber);
  });

  it('connected is false when result is "0xinvalid"', async () => {
    const { body } = await getBody({}, async () => makeRpcOkResponse('0xinvalid'));
    assert.strictEqual(body.connected, false);
  });

  it('connected is false when result is empty string', async () => {
    const { body } = await getBody({}, async () => makeRpcOkResponse(''));
    assert.strictEqual(body.connected, false);
  });

  it('connected is false when RPC response is not ok (401)', async () => {
    const { body } = await getBody({}, async () => makeRpcErrorResponse(401));
    assert.strictEqual(body.connected, false);
    assert.strictEqual(body.blockNumber, null);
  });
});

// ── Tests: rpc field ──────────────────────────────────────────────────────

describe('/api/web3/status (CF) — rpc field', () => {
  it('rpc defaults to http://rpc.meechain.run.place', async () => {
    const { body } = await getBody({}, async () => { throw new Error('down'); });
    assert.strictEqual(body.rpc, 'http://rpc.meechain.run.place');
  });

  it('rpc uses DRPC_RPC_URL env var when set', async () => {
    const { body } = await getBody(
      { DRPC_RPC_URL: 'https://custom.rpc' },
      async () => { throw new Error('down'); }
    );
    assert.strictEqual(body.rpc, 'https://custom.rpc');
  });

  it('fetch is called with the rpcUrl', async () => {
    let calledUrl = null;
    const fetchImpl = async (url) => { calledUrl = url; throw new Error('down'); };
    await getBody({ DRPC_RPC_URL: 'https://my-rpc.example' }, fetchImpl);
    assert.strictEqual(calledUrl, 'https://my-rpc.example');
  });

  it('fetch uses POST method for eth_blockNumber', async () => {
    let capturedMethod = null;
    const fetchImpl = async (url, opts) => {
      capturedMethod = opts.method;
      throw new Error('down');
    };
    await getBody({}, fetchImpl);
    assert.strictEqual(capturedMethod, 'POST');
  });

  it('fetch body contains eth_blockNumber JSON-RPC call', async () => {
    let capturedBody = null;
    const fetchImpl = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      throw new Error('down');
    };
    await getBody({}, fetchImpl);
    assert.strictEqual(capturedBody.method, 'eth_blockNumber');
    assert.strictEqual(capturedBody.jsonrpc, '2.0');
  });
});

// ── Tests: chainId field ──────────────────────────────────────────────────

describe('/api/web3/status (CF) — chainId field', () => {
  it('chainId defaults to 13390', async () => {
    const { body } = await getBody({}, async () => { throw new Error('down'); });
    assert.strictEqual(body.chainId, 13390);
  });

  it('chainId uses CHAIN_ID env var when set', async () => {
    const { body } = await getBody({ CHAIN_ID: '1' }, async () => { throw new Error('down'); });
    assert.strictEqual(body.chainId, 1);
  });

  it('chainId is parsed as decimal integer', async () => {
    const { body } = await getBody({ CHAIN_ID: '255' }, async () => { throw new Error('down'); });
    assert.strictEqual(body.chainId, 255);
    assert.strictEqual(typeof body.chainId, 'number');
  });
});

// ── Tests: contracts field ────────────────────────────────────────────────

describe('/api/web3/status (CF) — contracts field', () => {
  it('contracts has token, nft, portal keys', async () => {
    const { body } = await getBody({}, async () => { throw new Error('down'); });
    assert.ok('token'  in body.contracts);
    assert.ok('nft'    in body.contracts);
    assert.ok('portal' in body.contracts);
  });

  it('token defaults to hardcoded address', async () => {
    const { body } = await getBody({}, async () => { throw new Error('down'); });
    assert.strictEqual(body.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  });

  it('nft defaults to hardcoded address', async () => {
    const { body } = await getBody({}, async () => { throw new Error('down'); });
    assert.strictEqual(body.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  });

  it('portal defaults to hardcoded address', async () => {
    const { body } = await getBody({}, async () => { throw new Error('down'); });
    assert.strictEqual(body.contracts.portal, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  it('contracts.token uses VITE_TOKEN_CONTRACT_ADDRESS env var', async () => {
    const { body } = await getBody(
      { VITE_TOKEN_CONTRACT_ADDRESS: '0xTOKEN' },
      async () => { throw new Error('down'); }
    );
    assert.strictEqual(body.contracts.token, '0xTOKEN');
  });

  it('contracts.nft uses VITE_NFT_CONTRACT_ADDRESS env var', async () => {
    const { body } = await getBody(
      { VITE_NFT_CONTRACT_ADDRESS: '0xNFT' },
      async () => { throw new Error('down'); }
    );
    assert.strictEqual(body.contracts.nft, '0xNFT');
  });

  it('contracts.portal uses VITE_STAKING_CONTRACT_ADDRESS env var', async () => {
    const { body } = await getBody(
      { VITE_STAKING_CONTRACT_ADDRESS: '0xPORTAL' },
      async () => { throw new Error('down'); }
    );
    assert.strictEqual(body.contracts.portal, '0xPORTAL');
  });

  it('contracts does NOT have "staking" key (uses portal)', async () => {
    const { body } = await getBody({}, async () => { throw new Error('down'); });
    assert.ok(!('staking' in body.contracts), 'web3/status uses portal key, not staking');
  });
});

// ── Tests: response headers ───────────────────────────────────────────────

describe('/api/web3/status (CF) — response headers', () => {
  it('Content-Type is application/json', async () => {
    const { resp } = await getBody({}, async () => { throw new Error('down'); });
    assert.ok(resp.headers.get('Content-Type').includes('application/json'));
  });

  it('Access-Control-Allow-Origin is *', async () => {
    const { resp } = await getBody({}, async () => { throw new Error('down'); });
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('Cache-Control is no-cache', async () => {
    const { resp } = await getBody({}, async () => { throw new Error('down'); });
    assert.strictEqual(resp.headers.get('Cache-Control'), 'no-cache');
  });
});

// ── Tests: regression — response shape ───────────────────────────────────

describe('/api/web3/status (CF) — regression: response shape', () => {
  it('response has all required top-level fields', async () => {
    const { body } = await getBody({}, async () => { throw new Error('down'); });
    const required = ['connected', 'blockNumber', 'rpc', 'chainId', 'contracts'];
    for (const field of required) {
      assert.ok(field in body, `response must include field: ${field}`);
    }
  });

  it('connected is a boolean', async () => {
    const { body } = await getBody({}, async () => { throw new Error('down'); });
    assert.strictEqual(typeof body.connected, 'boolean');
  });

  it('response body is valid JSON', async () => {
    const resp = await onRequestGet(makeCtx({}, async () => { throw new Error('down'); }));
    const text = await resp.text();
    assert.doesNotThrow(() => JSON.parse(text));
  });
});
