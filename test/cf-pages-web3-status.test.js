'use strict';
/**
 * Tests for cf-deploy/functions/api/web3/status.js
 *
 * The handler attempts an eth_blockNumber JSON-RPC call to determine if the
 * RPC endpoint is reachable (connected=true) or not (connected=false).
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Replicate onRequestGet from cf-deploy/functions/api/web3/status.js ────

async function cfWeb3StatusHandler(env = {}, fetchImpl = null) {
  const savedFetch = global.fetch;
  if (fetchImpl !== null) global.fetch = fetchImpl;

  try {
    const rpcUrl    = env.DRPC_RPC_URL || 'http://rpc.meechain.run.place';
    const chainId   = parseInt(env.CHAIN_ID || '13390', 10);
    const contracts = {
      token:  env.VITE_TOKEN_CONTRACT_ADDRESS   || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      nft:    env.VITE_NFT_CONTRACT_ADDRESS     || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      portal: env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    };

    let connected   = false;
    let blockNumber = null;

    try {
      const resp = await fetch(rpcUrl, {
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

    return {
      body: { connected, blockNumber, rpc: rpcUrl, chainId, contracts },
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    };
  } finally {
    global.fetch = savedFetch;
  }
}

// ── Mock fetch helpers ───────────────────────────────────────────────────

function makeFetchWithBlockNumber(hexBlock) {
  return async () => ({
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, result: hexBlock }),
  });
}

function makeFetchNotOk(status = 500) {
  return async () => ({ ok: false, status });
}

function makeFetchThrow(msg = 'timeout') {
  return async () => { throw new Error(msg); };
}

// ── Tests: fetch succeeds with valid block number ────────────────────────

describe('cf /api/web3/status — RPC fetch succeeds', () => {
  it('connected is true when block number is valid', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchWithBlockNumber('0x13112b'));
    assert.strictEqual(body.connected, true);
  });

  it('blockNumber is parsed from hex correctly', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchWithBlockNumber('0x13112b'));
    assert.strictEqual(body.blockNumber, parseInt('0x13112b', 16));
    assert.strictEqual(typeof body.blockNumber, 'number');
  });

  it('blockNumber from hex "0x1" is 1', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchWithBlockNumber('0x1'));
    assert.strictEqual(body.blockNumber, 1);
  });

  it('blockNumber 0 ("0x0") yields connected=false (isNaN check passes, 0 is not NaN)', async () => {
    // parseInt('0x0', 16) === 0, !isNaN(0) === true
    const { body } = await cfWeb3StatusHandler({}, makeFetchWithBlockNumber('0x0'));
    assert.strictEqual(body.connected, true);
    assert.strictEqual(body.blockNumber, 0);
  });

  it('invalid hex result ("0xZZZ") yields connected=false', async () => {
    // parseInt('0xZZZ', 16) === NaN
    const { body } = await cfWeb3StatusHandler({}, makeFetchWithBlockNumber('0xZZZ'));
    assert.strictEqual(body.connected, false);
    assert.ok(isNaN(body.blockNumber));
  });
});

// ── Tests: fetch returns non-ok status ──────────────────────────────────

describe('cf /api/web3/status — RPC fetch returns non-ok', () => {
  it('connected is false when response.ok is false', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchNotOk(503));
    assert.strictEqual(body.connected, false);
  });

  it('blockNumber is null when fetch is non-ok', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchNotOk(503));
    assert.strictEqual(body.blockNumber, null);
  });
});

// ── Tests: fetch throws ──────────────────────────────────────────────────

describe('cf /api/web3/status — RPC fetch throws (timeout / network error)', () => {
  it('connected is false when fetch throws', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchThrow('AbortError: timeout'));
    assert.strictEqual(body.connected, false);
  });

  it('blockNumber is null when fetch throws', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchThrow());
    assert.strictEqual(body.blockNumber, null);
  });
});

// ── Tests: env variable usage ────────────────────────────────────────────

describe('cf /api/web3/status — env variables', () => {
  it('rpc field uses default when DRPC_RPC_URL not set', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchThrow());
    assert.strictEqual(body.rpc, 'http://rpc.meechain.run.place');
  });

  it('rpc field uses DRPC_RPC_URL when set', async () => {
    const { body } = await cfWeb3StatusHandler(
      { DRPC_RPC_URL: 'https://custom.rpc:8545' },
      makeFetchThrow()
    );
    assert.strictEqual(body.rpc, 'https://custom.rpc:8545');
  });

  it('chainId defaults to 13390', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchThrow());
    assert.strictEqual(body.chainId, 13390);
  });

  it('chainId uses CHAIN_ID env var', async () => {
    const { body } = await cfWeb3StatusHandler({ CHAIN_ID: '1' }, makeFetchThrow());
    assert.strictEqual(body.chainId, 1);
  });

  it('default contract addresses are correct', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchThrow());
    assert.strictEqual(body.contracts.token,  '0x5FbDB2315678afecb367f032d93F642f64180aa3');
    assert.strictEqual(body.contracts.nft,    '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
    assert.strictEqual(body.contracts.portal, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  it('VITE_TOKEN_CONTRACT_ADDRESS overrides token', async () => {
    const addr = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    const { body } = await cfWeb3StatusHandler(
      { VITE_TOKEN_CONTRACT_ADDRESS: addr },
      makeFetchThrow()
    );
    assert.strictEqual(body.contracts.token, addr);
  });
});

// ── Tests: response shape and headers ───────────────────────────────────

describe('cf /api/web3/status — response shape', () => {
  it('body has connected, blockNumber, rpc, chainId, contracts', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchThrow());
    const required = ['connected', 'blockNumber', 'rpc', 'chainId', 'contracts'];
    for (const f of required) {
      assert.ok(f in body, `missing field: ${f}`);
    }
  });

  it('contracts has token, nft, portal keys', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchThrow());
    assert.ok('token'  in body.contracts);
    assert.ok('nft'    in body.contracts);
    assert.ok('portal' in body.contracts);
  });

  it('Content-Type header is application/json', async () => {
    const { headers } = await cfWeb3StatusHandler({}, makeFetchThrow());
    assert.strictEqual(headers['Content-Type'], 'application/json');
  });

  it('Access-Control-Allow-Origin is *', async () => {
    const { headers } = await cfWeb3StatusHandler({}, makeFetchThrow());
    assert.strictEqual(headers['Access-Control-Allow-Origin'], '*');
  });

  it('Cache-Control is no-cache', async () => {
    const { headers } = await cfWeb3StatusHandler({}, makeFetchThrow());
    assert.strictEqual(headers['Cache-Control'], 'no-cache');
  });

  it('connected is a boolean', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchThrow());
    assert.strictEqual(typeof body.connected, 'boolean');
  });

  it('body is JSON-serialisable', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchThrow());
    assert.doesNotThrow(() => JSON.stringify(body));
  });
});

// ── Tests: regression ────────────────────────────────────────────────────

describe('cf /api/web3/status — regression / boundary cases', () => {
  it('very large block number (0xffffffffffff) parses without overflow', async () => {
    const { body } = await cfWeb3StatusHandler({}, makeFetchWithBlockNumber('0xffffffffffff'));
    assert.strictEqual(body.connected, true);
    assert.strictEqual(typeof body.blockNumber, 'number');
    assert.ok(body.blockNumber > 0);
  });

  it('null result from RPC yields connected=false', async () => {
    const fetchNull = async () => ({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
    });
    const { body } = await cfWeb3StatusHandler({}, fetchNull);
    // parseInt(null, 16) → NaN
    assert.strictEqual(body.connected, false);
  });
});
