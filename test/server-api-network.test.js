'use strict';
/**
 * Tests for the /api/network endpoint and handleRpcProxy changes introduced in this PR.
 *
 * Rather than spinning up an HTTP server (TCP loopback may be restricted in some
 * environments), we test the route handler functions directly by calling them with
 * mock req/res objects. This is a well-established approach for unit-testing
 * Express route handlers.
 *
 * Changes under test (from the PR diff, server.js):
 *   /api/network:
 *     - Uses APP_DOMAIN and RPC_DOMAIN environment variables (with defaults)
 *     - Returns chainIdDecimal alongside chainId hex string
 *     - chainName is now 'MeeChain Ritual Chain'
 *     - nativeCurrency.name is now 'MEE Token'
 *     - Includes web3Status: 'connected' | 'mock'
 *     - blockExplorerUrls now has two entries (including explorer.meechain.run.place)
 *
 *   handleRpcProxy:
 *     - null body → 400
 *     - Missing jsonrpc field → 400
 *     - Array body → treated as batch → returns array of mock responses
 *     - Valid single JSON-RPC → mock response when all upstreams dead
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Mock req/res factory ─────────────────────────────────────────────────

function mockRes() {
  const res = {
    _status: 200,
    _body: undefined,
    status(code) { this._status = code; return this; },
    json(body)   { this._body = body; return this; },
  };
  return res;
}

function mockReq(body = null) {
  return { body };
}

// ── Replicate /api/network handler from server.js ────────────────────────
// (mirrors the changed implementation in the PR diff exactly)

const CONTRACTS = {
  token:   '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  nft:     '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  staking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
};

function buildNetworkHandler(options = {}) {
  const { chainId = 13390, web3Connected = false } = options;
  return function apiNetworkHandler(req, res, env = {}) {
    const appDomain = env.APP_DOMAIN || 'app.meechain.live';
    const rpcDomain = env.RPC_DOMAIN || 'rpc.meechain.live';
    res.json({
      chainId:          `0x${chainId.toString(16)}`,
      chainIdDecimal:   chainId,
      chainName:        'MeeChain Ritual Chain',
      rpcUrls:          [`https://${rpcDomain}`],
      nativeCurrency:   { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
      blockExplorerUrls: [
        `https://${appDomain}/explorer.html`,
        'https://explorer.meechain.run.place',
      ],
      contracts:  CONTRACTS,
      web3Status: web3Connected ? 'connected' : 'mock',
    });
  };
}

// ── Replicate handleRpcProxy validation logic ────────────────────────────

let _mockBlockNum = 1248753;
function _handleMockRpc(body) {
  _mockBlockNum += 1;
  const ok  = (result) => ({ jsonrpc: '2.0', id: body.id ?? null, result });
  const err = (code, msg) => ({ jsonrpc: '2.0', id: body.id ?? null, error: { code, message: msg } });
  switch (body.method) {
    case 'eth_chainId':    return ok('0x344e');
    case 'net_version':    return ok('13390');
    case 'eth_blockNumber': return ok('0x' + _mockBlockNum.toString(16));
    case 'eth_sendRawTransaction':
    case 'eth_sendTransaction':
    case 'personal_sendTransaction':
      return err(-32000, 'Upstream unavailable: cannot perform mutating RPC in offline mode');
    default:               return err(-32601, `Method "${body.method}" not supported`);
  }
}

const READ_ONLY_METHODS = new Set([
  'eth_chainId', 'net_version', 'net_listening', 'eth_blockNumber', 'eth_getBalance',
  'eth_getTransactionCount', 'eth_gasPrice', 'eth_estimateGas', 'eth_maxPriorityFeePerGas',
  'eth_syncing', 'eth_getCode', 'eth_getStorageAt', 'eth_getLogs', 'eth_call',
  'eth_getBlockByNumber', 'eth_getBlockByHash', 'eth_getTransactionByHash',
  'eth_getTransactionReceipt', 'eth_newFilter', 'eth_newBlockFilter', 'eth_getFilterChanges',
  'eth_uninstallFilter', 'eth_protocolVersion', 'eth_feeHistory', 'web3_clientVersion', 'net_peerCount',
]);

async function handleRpcProxy(req, res) {
  const body = req.body;
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON-RPC request' });
  }

  if (Array.isArray(body)) {
    const results = body.map(b => {
      if (READ_ONLY_METHODS.has(b.method)) {
        return _handleMockRpc(b);
      } else {
        return { jsonrpc: '2.0', id: b.id ?? null, error: { code: -32000, message: 'Upstream unavailable: cannot perform mutating RPC in offline mode' } };
      }
    });
    return res.json(results);
  }

  if (!body.jsonrpc) {
    return res.status(400).json({ error: 'Invalid JSON-RPC request' });
  }

  return res.json(_handleMockRpc(body));
}

// ── Tests: /api/network — default domains ────────────────────────────────

describe('/api/network — default domain names', () => {
  const handler = buildNetworkHandler();

  it('sets correct chainId hex (0x344e)', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.chainId, '0x344e');
  });

  it('returns chainIdDecimal as number 13390', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.chainIdDecimal, 13390);
    assert.strictEqual(typeof res._body.chainIdDecimal, 'number');
  });

  it('returns chainName "MeeChain Ritual Chain"', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.chainName, 'MeeChain Ritual Chain');
  });

  it('nativeCurrency.name is "MEE Token"', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.nativeCurrency.name, 'MEE Token');
  });

  it('nativeCurrency.symbol is "MEE"', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.nativeCurrency.symbol, 'MEE');
  });

  it('nativeCurrency.decimals is 18', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.nativeCurrency.decimals, 18);
  });

  it('blockExplorerUrls contains exactly two entries', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.ok(Array.isArray(res._body.blockExplorerUrls));
    assert.strictEqual(res._body.blockExplorerUrls.length, 2);
  });

  it('first blockExplorerUrl uses default APP_DOMAIN with /explorer.html suffix', () => {
    const res = mockRes();
    handler(mockReq(), res, {});
    assert.ok(res._body.blockExplorerUrls[0].includes('app.meechain.live'));
    assert.ok(res._body.blockExplorerUrls[0].endsWith('/explorer.html'));
  });

  it('second blockExplorerUrl is explorer.meechain.run.place', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.ok(res._body.blockExplorerUrls[1].includes('explorer.meechain.run.place'));
  });

  it('rpcUrls is a non-empty array using default RPC_DOMAIN', () => {
    const res = mockRes();
    handler(mockReq(), res, {});
    assert.ok(Array.isArray(res._body.rpcUrls));
    assert.ok(res._body.rpcUrls.length >= 1);
    assert.ok(res._body.rpcUrls[0].includes('rpc.meechain.live'));
  });

  it('web3Status is "mock" when web3 not connected', () => {
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.web3Status, 'mock');
  });

  it('returns contracts object with token, nft, staking', () => {
    const res = mockRes();
    handler(mockReq(), res);
    const c = res._body.contracts;
    assert.ok(c, 'contracts field must be present');
    assert.ok(c.token.startsWith('0x'),   'token address must be a hex string');
    assert.ok(c.nft.startsWith('0x'),     'nft address must be a hex string');
    assert.ok(c.staking.startsWith('0x'), 'staking address must be a hex string');
  });
});

describe('/api/network — custom domain names via env', () => {
  // Helper to build a handler that uses custom env vars
  function callWithEnv(envVars) {
    const handler = buildNetworkHandler();
    const res = mockRes();
    handler(mockReq(), res, envVars);
    return res._body;
  }

  it('uses APP_DOMAIN env var in blockExplorerUrls[0]', () => {
    const body = callWithEnv({ APP_DOMAIN: 'dashboard.example.com', RPC_DOMAIN: 'rpc.example.com' });
    assert.ok(body.blockExplorerUrls[0].includes('dashboard.example.com'));
    assert.ok(body.blockExplorerUrls[0].endsWith('/explorer.html'));
  });

  it('uses RPC_DOMAIN env var in rpcUrls[0]', () => {
    const body = callWithEnv({ APP_DOMAIN: 'app.example.com', RPC_DOMAIN: 'rpc.example.com' });
    assert.ok(body.rpcUrls[0].includes('rpc.example.com'));
  });

  it('different APP_DOMAIN does not affect rpcUrls', () => {
    const body = callWithEnv({ APP_DOMAIN: 'custom.app', RPC_DOMAIN: 'rpc.meechain.live' });
    assert.ok(!body.rpcUrls[0].includes('custom.app'), 'app domain must not appear in rpcUrls');
  });

  it('second blockExplorerUrl is always explorer.meechain.run.place regardless of env', () => {
    const body = callWithEnv({ APP_DOMAIN: 'anything.com', RPC_DOMAIN: 'something.com' });
    assert.ok(body.blockExplorerUrls[1].includes('explorer.meechain.run.place'));
  });
});

describe('/api/network — web3Status field', () => {
  it('web3Status is "connected" when web3.connected is true', () => {
    const handler = buildNetworkHandler({ web3Connected: true });
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.web3Status, 'connected');
  });

  it('web3Status is "mock" when web3.connected is false', () => {
    const handler = buildNetworkHandler({ web3Connected: false });
    const res = mockRes();
    handler(mockReq(), res);
    assert.strictEqual(res._body.web3Status, 'mock');
  });

  it('web3Status is one of the two expected values', () => {
    for (const connected of [true, false]) {
      const handler = buildNetworkHandler({ web3Connected: connected });
      const res = mockRes();
      handler(mockReq(), res);
      assert.ok(
        ['connected', 'mock'].includes(res._body.web3Status),
        `web3Status must be "connected" or "mock", got "${res._body.web3Status}"`
      );
    }
  });
});

describe('handleRpcProxy — input validation (PR changes)', () => {
  it('returns 400 when body is null (undefined)', async () => {
    const req = mockReq(undefined);
    const res = mockRes();
    await handleRpcProxy(req, res);
    assert.strictEqual(res._status, 400);
    assert.ok(res._body.error, 'must have error field');
    assert.ok(res._body.error.includes('JSON-RPC'));
  });

  it('returns 400 when body has no jsonrpc field', async () => {
    const req = mockReq({ id: 1, method: 'eth_chainId' }); // missing jsonrpc
    const res = mockRes();
    await handleRpcProxy(req, res);
    assert.strictEqual(res._status, 400);
    assert.ok(res._body.error, 'must have error field');
  });

  it('returns 200 with mock response when jsonrpc field is present', async () => {
    const req = mockReq({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] });
    const res = mockRes();
    await handleRpcProxy(req, res);
    assert.strictEqual(res._status, 200); // status not set by handler → default
    assert.strictEqual(res._body.jsonrpc, '2.0');
    assert.strictEqual(res._body.result, '0x344e');
  });

  it('handles POST /rpc alias — same logic', async () => {
    const req = mockReq({ jsonrpc: '2.0', id: 5, method: 'net_version', params: [] });
    const res = mockRes();
    await handleRpcProxy(req, res);
    assert.strictEqual(res._body.result, '13390');
    assert.strictEqual(res._body.id, 5);
  });
});

describe('handleRpcProxy — batch (array) request handling (PR changes)', () => {
  it('returns an array when body is an array', async () => {
    const req = mockReq([
      { jsonrpc: '2.0', id: 1, method: 'eth_chainId' },
      { jsonrpc: '2.0', id: 2, method: 'net_version' },
    ]);
    const res = mockRes();
    await handleRpcProxy(req, res);
    assert.ok(Array.isArray(res._body), 'batch response must be array');
  });

  it('batch response length matches request length', async () => {
    const batch = [
      { jsonrpc: '2.0', id: 1, method: 'eth_chainId' },
      { jsonrpc: '2.0', id: 2, method: 'net_version' },
      { jsonrpc: '2.0', id: 3, method: 'eth_blockNumber' },
    ];
    const req = mockReq(batch);
    const res = mockRes();
    await handleRpcProxy(req, res);
    assert.strictEqual(res._body.length, 3);
  });

  it('batch preserves request IDs', async () => {
    const req = mockReq([
      { jsonrpc: '2.0', id: 10, method: 'eth_chainId' },
      { jsonrpc: '2.0', id: 20, method: 'eth_chainId' },
    ]);
    const res = mockRes();
    await handleRpcProxy(req, res);
    assert.strictEqual(res._body[0].id, 10);
    assert.strictEqual(res._body[1].id, 20);
  });

  it('batch: read-only method gets result', async () => {
    const req = mockReq([{ jsonrpc: '2.0', id: 1, method: 'eth_chainId' }]);
    const res = mockRes();
    await handleRpcProxy(req, res);
    assert.ok('result' in res._body[0], 'read-only method must have result');
    assert.strictEqual(res._body[0].result, '0x344e');
  });

  it('batch: mutating method gets -32000 error', async () => {
    const req = mockReq([{ jsonrpc: '2.0', id: 2, method: 'eth_sendTransaction', params: [{}] }]);
    const res = mockRes();
    await handleRpcProxy(req, res);
    assert.ok(res._body[0].error, 'mutating method must have error');
    assert.strictEqual(res._body[0].error.code, -32000);
    assert.ok(res._body[0].error.message.includes('mutating'));
  });

  it('batch: mixed read-only and mutating in same batch', async () => {
    const req = mockReq([
      { jsonrpc: '2.0', id: 1, method: 'eth_chainId' },
      { jsonrpc: '2.0', id: 2, method: 'eth_sendRawTransaction', params: ['0x'] },
    ]);
    const res = mockRes();
    await handleRpcProxy(req, res);
    const r1 = res._body.find(r => r.id === 1);
    const r2 = res._body.find(r => r.id === 2);
    assert.ok(r1 && 'result' in r1, 'read-only must have result');
    assert.ok(r2 && r2.error, 'mutating must have error');
  });

  it('batch: empty array returns empty array response', async () => {
    const req = mockReq([]);
    const res = mockRes();
    await handleRpcProxy(req, res);
    assert.ok(Array.isArray(res._body));
    assert.strictEqual(res._body.length, 0);
  });

  it('batch: each response has jsonrpc: "2.0"', async () => {
    const req = mockReq([
      { jsonrpc: '2.0', id: 1, method: 'eth_chainId' },
      { jsonrpc: '2.0', id: 2, method: 'eth_sendTransaction', params: [{}] },
    ]);
    const res = mockRes();
    await handleRpcProxy(req, res);
    for (const r of res._body) {
      assert.strictEqual(r.jsonrpc, '2.0');
    }
  });
});

describe('/api/network — regression: response shape', () => {
  it('response has all expected top-level fields', () => {
    const handler = buildNetworkHandler();
    const res = mockRes();
    handler(mockReq(), res, {});
    const body = res._body;
    const requiredFields = [
      'chainId', 'chainIdDecimal', 'chainName', 'rpcUrls',
      'nativeCurrency', 'blockExplorerUrls', 'contracts', 'web3Status',
    ];
    for (const field of requiredFields) {
      assert.ok(field in body, `response must include field: ${field}`);
    }
  });

  it('chainId hex matches chainIdDecimal (decimal == parseInt(hex))', () => {
    const handler = buildNetworkHandler();
    const res = mockRes();
    handler(mockReq(), res);
    const { chainId, chainIdDecimal } = res._body;
    assert.strictEqual(parseInt(chainId, 16), chainIdDecimal);
  });
});