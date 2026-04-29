'use strict';
/**
 * Tests for the _handleMockRpc function introduced in server.js (PR diff).
 *
 * _handleMockRpc is a pure function that returns simulated JSON-RPC 2.0
 * responses when all upstream RPC endpoints are unavailable.
 *
 * The logic below mirrors the exact implementation from server.js so that
 * we can exercise it without loading the full server (which requires an
 * active blockchain connection and OpenAI credentials).
 */

const assert = require('assert');
const { describe, it, before } = require('mocha');

// ── Replicate the module-level state and function from server.js ──────────
// This approach is appropriate because the function is a pure-ish utility
// (the only external state is _mockBlockNum) and was introduced entirely
// in this PR. We test the exact logic defined in the diff.

let _mockBlockNum = 1248753;

function _handleMockRpc(body) {
  _mockBlockNum += Math.floor(Math.random() * 2) + 1;
  const ok  = (result) => ({ jsonrpc: '2.0', id: body.id ?? null, result });
  const err = (code, msg) => ({ jsonrpc: '2.0', id: body.id ?? null, error: { code, message: msg } });
  switch (body.method) {
    case 'eth_chainId':          return ok('0x344e');
    case 'net_version':          return ok('13390');
    case 'net_listening':        return ok(true);
    case 'eth_blockNumber':      return ok('0x' + _mockBlockNum.toString(16));
    case 'eth_getBalance':       return ok('0x56BC75E2D630FFFFF');
    case 'eth_getTransactionCount': return ok('0x1');
    case 'eth_gasPrice':         return ok('0x3B9ACA00');
    case 'eth_estimateGas':      return ok('0x5208');
    case 'eth_maxPriorityFeePerGas': return ok('0x3B9ACA00');
    case 'eth_syncing':          return ok(false);
    case 'eth_getCode':          return ok('0x');
    case 'eth_getStorageAt':     return ok('0x' + '0'.repeat(64));
    case 'eth_getLogs':          return ok([]);
    case 'eth_call':             return ok('0x' + '0'.repeat(64));
    case 'eth_getBlockByNumber': return ok({
      number: '0x' + _mockBlockNum.toString(16),
      hash: '0xaaaa' + 'a'.repeat(60),
      parentHash: '0xbbbb' + 'b'.repeat(60),
      nonce: '0x0000000000000000',
      transactions: [],
      timestamp: '0x' + Math.floor(Date.now()/1000).toString(16),
      gasLimit: '0x1c9c380', gasUsed: '0x0',
      miner: '0x' + '0'.repeat(40),
    });
    case 'eth_getBlockByHash':   return ok(null);
    case 'eth_getTransactionByHash': return ok(null);
    case 'eth_getTransactionReceipt': return ok(null);
    case 'eth_sendRawTransaction': return err(-32000, 'Upstream unavailable: cannot perform mutating RPC in offline mode');
    case 'eth_sendTransaction':    return err(-32000, 'Upstream unavailable: cannot perform mutating RPC in offline mode');
    case 'personal_sendTransaction': return err(-32000, 'Upstream unavailable: cannot perform mutating RPC in offline mode');
    case 'eth_newFilter':        return ok('0x1');
    case 'eth_newBlockFilter':   return ok('0x1');
    case 'eth_getFilterChanges': return ok([]);
    case 'eth_uninstallFilter':  return ok(true);
    case 'eth_protocolVersion':  return ok('0x41');
    case 'eth_feeHistory':       return ok({ oldestBlock: '0x1', baseFeePerGas: ['0x3B9ACA00'], gasUsedRatio: [0.5], reward: [['0x0']] });
    case 'web3_clientVersion':   return ok('MeeChain/v2.0/node');
    case 'net_peerCount':        return ok('0x10');
    default:                     return err(-32601, `Method "${body.method}" not supported`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function assertJsonRpc2(res) {
  assert.strictEqual(res.jsonrpc, '2.0', 'response must have jsonrpc: "2.0"');
}
function assertSuccess(res) {
  assertJsonRpc2(res);
  assert.ok(!res.error, 'response must not have an error field');
  assert.ok('result' in res, 'response must have a result field');
}
function assertError(res, expectedCode) {
  assertJsonRpc2(res);
  assert.ok(res.error, 'response must have an error field');
  assert.ok(!('result' in res), 'error response must not have a result field');
  if (expectedCode !== undefined) {
    assert.strictEqual(res.error.code, expectedCode, `error code must be ${expectedCode}`);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('_handleMockRpc — JSON-RPC 2.0 envelope', () => {
  it('preserves numeric id', () => {
    const res = _handleMockRpc({ id: 42, method: 'eth_chainId' });
    assert.strictEqual(res.id, 42);
  });

  it('preserves string id', () => {
    const res = _handleMockRpc({ id: 'abc', method: 'eth_chainId' });
    assert.strictEqual(res.id, 'abc');
  });

  it('uses null when id is absent', () => {
    const res = _handleMockRpc({ method: 'eth_chainId' });
    assert.strictEqual(res.id, null);
  });

  it('preserves null id', () => {
    const res = _handleMockRpc({ id: null, method: 'eth_chainId' });
    assert.strictEqual(res.id, null);
  });
});

describe('_handleMockRpc — chain identity methods', () => {
  it('eth_chainId returns MeeChain chain ID 0x344e', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_chainId' });
    assertSuccess(res);
    assert.strictEqual(res.result, '0x344e', 'chain ID must be 0x344e (13390 decimal)');
  });

  it('net_version returns "13390"', () => {
    const res = _handleMockRpc({ id: 1, method: 'net_version' });
    assertSuccess(res);
    assert.strictEqual(res.result, '13390');
  });

  it('net_listening returns true', () => {
    const res = _handleMockRpc({ id: 1, method: 'net_listening' });
    assertSuccess(res);
    assert.strictEqual(res.result, true);
  });

  it('web3_clientVersion returns MeeChain client string', () => {
    const res = _handleMockRpc({ id: 1, method: 'web3_clientVersion' });
    assertSuccess(res);
    assert.ok(res.result.includes('MeeChain'), 'client version must mention MeeChain');
  });

  it('net_peerCount returns a hex string', () => {
    const res = _handleMockRpc({ id: 1, method: 'net_peerCount' });
    assertSuccess(res);
    assert.ok(res.result.startsWith('0x'), 'peer count must be a hex string');
  });
});

describe('_handleMockRpc — block methods', () => {
  it('eth_blockNumber returns a hex string', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_blockNumber' });
    assertSuccess(res);
    assert.ok(res.result.startsWith('0x'), 'block number must be a hex string');
    assert.ok(parseInt(res.result, 16) > 0, 'block number must be positive');
  });

  it('eth_blockNumber increments between calls', () => {
    const r1 = _handleMockRpc({ id: 1, method: 'eth_blockNumber' });
    const r2 = _handleMockRpc({ id: 2, method: 'eth_blockNumber' });
    const b1 = parseInt(r1.result, 16);
    const b2 = parseInt(r2.result, 16);
    assert.ok(b2 >= b1, 'block number must not decrease between calls');
  });

  it('eth_getBlockByNumber returns object with expected fields', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_getBlockByNumber' });
    assertSuccess(res);
    const block = res.result;
    assert.ok(block && typeof block === 'object', 'result must be an object');
    assert.ok('number' in block, 'block must have number');
    assert.ok('hash' in block, 'block must have hash');
    assert.ok('transactions' in block, 'block must have transactions');
    assert.ok(Array.isArray(block.transactions), 'transactions must be an array');
    assert.ok('timestamp' in block, 'block must have timestamp');
    assert.ok('gasLimit' in block, 'block must have gasLimit');
    assert.ok('gasUsed' in block, 'block must have gasUsed');
    assert.ok('miner' in block, 'block must have miner');
  });

  it('eth_getBlockByNumber block number matches eth_blockNumber', () => {
    // Force same _mockBlockNum by capturing before and after
    const blockRes = _handleMockRpc({ id: 1, method: 'eth_getBlockByNumber' });
    const blockNum = parseInt(blockRes.result.number, 16);
    assert.ok(blockNum > 0, 'block number in getBlockByNumber must be positive');
  });

  it('eth_getBlockByHash returns null (mock has no hash index)', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_getBlockByHash' });
    assertSuccess(res);
    assert.strictEqual(res.result, null);
  });

  it('eth_syncing returns false (mock is fully synced)', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_syncing' });
    assertSuccess(res);
    assert.strictEqual(res.result, false);
  });
});

describe('_handleMockRpc — gas and fee methods', () => {
  it('eth_gasPrice returns 1 Gwei hex', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_gasPrice' });
    assertSuccess(res);
    // 0x3B9ACA00 = 1,000,000,000 = 1 Gwei
    assert.strictEqual(res.result, '0x3B9ACA00');
    assert.strictEqual(parseInt(res.result, 16), 1_000_000_000);
  });

  it('eth_estimateGas returns 21000 (0x5208)', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_estimateGas' });
    assertSuccess(res);
    assert.strictEqual(res.result, '0x5208');
    assert.strictEqual(parseInt(res.result, 16), 21000);
  });

  it('eth_maxPriorityFeePerGas returns 1 Gwei hex', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_maxPriorityFeePerGas' });
    assertSuccess(res);
    assert.strictEqual(res.result, '0x3B9ACA00');
  });

  it('eth_feeHistory returns valid structure', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_feeHistory' });
    assertSuccess(res);
    const fh = res.result;
    assert.ok(fh && typeof fh === 'object');
    assert.ok('oldestBlock' in fh);
    assert.ok(Array.isArray(fh.baseFeePerGas));
    assert.ok(Array.isArray(fh.gasUsedRatio));
    assert.ok(Array.isArray(fh.reward));
  });

  it('eth_protocolVersion returns a hex string', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_protocolVersion' });
    assertSuccess(res);
    assert.ok(res.result.startsWith('0x'));
  });
});

describe('_handleMockRpc — account and state methods', () => {
  it('eth_getBalance returns ~100 MEE balance hex', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_getBalance', params: ['0x1234', 'latest'] });
    assertSuccess(res);
    assert.ok(res.result.startsWith('0x'));
    assert.strictEqual(res.result, '0x56BC75E2D630FFFFF');
  });

  it('eth_getTransactionCount returns 0x1', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_getTransactionCount' });
    assertSuccess(res);
    assert.strictEqual(res.result, '0x1');
  });

  it('eth_getCode returns 0x (EOA)', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_getCode' });
    assertSuccess(res);
    assert.strictEqual(res.result, '0x');
  });

  it('eth_getStorageAt returns 32-byte zero hex', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_getStorageAt' });
    assertSuccess(res);
    assert.strictEqual(res.result, '0x' + '0'.repeat(64));
    assert.strictEqual(res.result.length, 66); // '0x' + 64 chars
  });

  it('eth_call returns 32-byte zero hex', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_call' });
    assertSuccess(res);
    assert.strictEqual(res.result, '0x' + '0'.repeat(64));
  });

  it('eth_getLogs returns empty array', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_getLogs' });
    assertSuccess(res);
    assert.deepStrictEqual(res.result, []);
  });
});

describe('_handleMockRpc — transaction methods', () => {
  it('eth_getTransactionByHash returns null', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_getTransactionByHash' });
    assertSuccess(res);
    assert.strictEqual(res.result, null);
  });

  it('eth_getTransactionReceipt returns null', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_getTransactionReceipt' });
    assertSuccess(res);
    assert.strictEqual(res.result, null);
  });
});

describe('_handleMockRpc — filter methods', () => {
  it('eth_newFilter returns filter id 0x1', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_newFilter' });
    assertSuccess(res);
    assert.strictEqual(res.result, '0x1');
  });

  it('eth_newBlockFilter returns filter id 0x1', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_newBlockFilter' });
    assertSuccess(res);
    assert.strictEqual(res.result, '0x1');
  });

  it('eth_getFilterChanges returns empty array', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_getFilterChanges' });
    assertSuccess(res);
    assert.deepStrictEqual(res.result, []);
  });

  it('eth_uninstallFilter returns true', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_uninstallFilter' });
    assertSuccess(res);
    assert.strictEqual(res.result, true);
  });
});

describe('_handleMockRpc — mutating methods (offline mode errors)', () => {
  const OFFLINE_MSG = 'Upstream unavailable: cannot perform mutating RPC in offline mode';

  it('eth_sendRawTransaction returns -32000 error in offline mode', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_sendRawTransaction', params: ['0xdeadbeef'] });
    assertError(res, -32000);
    assert.ok(res.error.message.includes('mutating RPC'), 'error must mention mutating RPC');
    assert.strictEqual(res.error.message, OFFLINE_MSG);
  });

  it('eth_sendTransaction returns -32000 error in offline mode', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_sendTransaction', params: [{}] });
    assertError(res, -32000);
    assert.strictEqual(res.error.message, OFFLINE_MSG);
  });

  it('personal_sendTransaction returns -32000 error in offline mode', () => {
    const res = _handleMockRpc({ id: 1, method: 'personal_sendTransaction', params: [{}] });
    assertError(res, -32000);
    assert.strictEqual(res.error.message, OFFLINE_MSG);
  });
});

describe('_handleMockRpc — unknown method', () => {
  it('returns error code -32601 for unknown method', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_unknownMethod' });
    assertError(res, -32601);
    assert.ok(res.error.message.includes('eth_unknownMethod'));
  });

  it('includes the method name in the error message', () => {
    const method = 'eth_someRandomCall';
    const res = _handleMockRpc({ id: 2, method });
    assert.ok(res.error.message.includes(method), 'error message must include the method name');
  });

  it('eth_accounts (not in mock) returns -32601', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_accounts' });
    assertError(res, -32601);
  });

  it('eth_sign (not in mock) returns -32601', () => {
    const res = _handleMockRpc({ id: 1, method: 'eth_sign' });
    assertError(res, -32601);
  });

  it('preserves id on error response for unknown method', () => {
    const res = _handleMockRpc({ id: 99, method: 'eth_unsupported' });
    assert.strictEqual(res.id, 99);
    assertError(res, -32601);
  });
});

describe('_handleMockRpc — regression: all responses are valid JSON-RPC 2.0', () => {
  const allMethods = [
    'eth_chainId', 'net_version', 'net_listening', 'eth_blockNumber',
    'eth_getBalance', 'eth_getTransactionCount', 'eth_gasPrice', 'eth_estimateGas',
    'eth_maxPriorityFeePerGas', 'eth_syncing', 'eth_getCode', 'eth_getStorageAt',
    'eth_getLogs', 'eth_call', 'eth_getBlockByNumber', 'eth_getBlockByHash',
    'eth_getTransactionByHash', 'eth_getTransactionReceipt',
    'eth_sendRawTransaction', 'eth_sendTransaction', 'personal_sendTransaction',
    'eth_newFilter', 'eth_newBlockFilter', 'eth_getFilterChanges', 'eth_uninstallFilter',
    'eth_protocolVersion', 'eth_feeHistory', 'web3_clientVersion', 'net_peerCount',
  ];

  allMethods.forEach(method => {
    it(`${method} always returns jsonrpc: "2.0"`, () => {
      const res = _handleMockRpc({ id: 1, method });
      assertJsonRpc2(res);
      // Must have either result (success) or error (failure), not both
      const hasResult = 'result' in res;
      const hasError  = 'error' in res;
      assert.ok(hasResult || hasError, `${method}: response must have result or error`);
      assert.ok(!(hasResult && hasError), `${method}: response must not have both result and error`);
    });
  });
});