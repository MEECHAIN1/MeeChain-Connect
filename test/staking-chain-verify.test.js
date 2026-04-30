'use strict';
/**
 * Tests for the chain-verification logic added to executeStake() in src/js/staking.js.
 *
 * The PR diff introduced two key behaviours inside executeStake():
 *
 *   1. Call window.ensureMeeChainNetwork() if the function is available before sending
 *      a transaction. This ensures the wallet is on the MeeChain Ritual Chain
 *      (chain ID 13390 = 0x344e) before any transaction is submitted.
 *
 *   2. Verify the actual chain ID returned by window.ethereum.request({ method: 'eth_chainId' })
 *      equals '0x344e'. If it does not, throw an Error with a descriptive message so the
 *      catch block in executeStake displays a toast instead of submitting a transaction
 *      on the wrong network.
 *
 * Because staking.js is a browser-only module (it accesses `window`, `document`,
 * and `localStorage` at load time), we replicate only the changed logic in isolation
 * and test it directly.
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Isolated implementation of the chain-verification logic from the PR ───
//
// This mirrors exactly the new code block added to executeStake():
//
//   if (typeof window.ensureMeeChainNetwork === 'function') {
//     await window.ensureMeeChainNetwork();
//   }
//   const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
//   if (currentChainId !== '0x344e') {
//     throw new Error('Failed to switch to MeeChain Ritual Chain …');
//   }

const MEECHAIN_CHAIN_ID = '0x344e'; // 13390 decimal
const WRONG_CHAIN_ERROR = 'Failed to switch to MeeChain Ritual Chain (Chain ID: 13390). Please switch manually.';

/**
 * Isolated chain-verification logic extracted from executeStake().
 * @param {object} ethereum  - Mock window.ethereum object
 * @param {Function|undefined} ensureFn - Mock window.ensureMeeChainNetwork (may be undefined)
 */
async function verifyMeeChainNetwork(ethereum, ensureFn) {
  if (typeof ensureFn === 'function') {
    await ensureFn();
  }
  const currentChainId = await ethereum.request({ method: 'eth_chainId' });
  if (currentChainId !== MEECHAIN_CHAIN_ID) {
    throw new Error(WRONG_CHAIN_ERROR);
  }
}

// ── Test helpers ──────────────────────────────────────────────────────────

function makeEthereum(chainId) {
  return {
    request: async ({ method }) => {
      if (method === 'eth_chainId') return chainId;
      throw new Error(`Unexpected call: ${method}`);
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('executeStake — chain verification: correct network', () => {
  it('does not throw when chain ID is 0x344e', async () => {
    await assert.doesNotReject(
      () => verifyMeeChainNetwork(makeEthereum('0x344e'), undefined)
    );
  });

  it('does not throw when chain ID is 0x344e (case-exact)', async () => {
    // The comparison is strict: '0x344e' only
    await assert.doesNotReject(
      () => verifyMeeChainNetwork(makeEthereum('0x344e'), undefined)
    );
  });

  it('calls ensureMeeChainNetwork when provided and chain ID is correct', async () => {
    let called = false;
    const ensureFn = async () => { called = true; };
    await verifyMeeChainNetwork(makeEthereum('0x344e'), ensureFn);
    assert.strictEqual(called, true, 'ensureMeeChainNetwork must be called when available');
  });

  it('awaits ensureMeeChainNetwork before checking chain ID', async () => {
    const order = [];
    const ensureFn = async () => {
      order.push('ensure');
      await Promise.resolve(); // simulate async work
    };
    // Override ethereum to push 'chainId' when called
    const ethereum = {
      request: async ({ method }) => {
        if (method === 'eth_chainId') {
          order.push('chainId');
          return '0x344e';
        }
      },
    };
    await verifyMeeChainNetwork(ethereum, ensureFn);
    assert.deepStrictEqual(order, ['ensure', 'chainId'], 'ensureMeeChainNetwork must run before eth_chainId request');
  });
});

describe('executeStake — chain verification: wrong network throws', () => {
  it('throws when chain ID is Ethereum mainnet (0x1)', async () => {
    await assert.rejects(
      () => verifyMeeChainNetwork(makeEthereum('0x1'), undefined),
      { message: WRONG_CHAIN_ERROR }
    );
  });

  it('throws when chain ID is Hardhat local (0x7a69)', async () => {
    await assert.rejects(
      () => verifyMeeChainNetwork(makeEthereum('0x7a69'), undefined),
      { message: WRONG_CHAIN_ERROR }
    );
  });

  it('throws when chain ID is Sepolia testnet (0xaa36a7)', async () => {
    await assert.rejects(
      () => verifyMeeChainNetwork(makeEthereum('0xaa36a7'), undefined),
      { message: WRONG_CHAIN_ERROR }
    );
  });

  it('throws when chain ID is uppercase 0x344E (case mismatch)', async () => {
    // The check is strict equality '0x344e' — uppercase would NOT match
    await assert.rejects(
      () => verifyMeeChainNetwork(makeEthereum('0x344E'), undefined),
      { message: WRONG_CHAIN_ERROR }
    );
  });

  it('throws when chain ID is the decimal string "13390"', async () => {
    await assert.rejects(
      () => verifyMeeChainNetwork(makeEthereum('13390'), undefined),
      { message: WRONG_CHAIN_ERROR }
    );
  });

  it('throws when chain ID is empty string', async () => {
    await assert.rejects(
      () => verifyMeeChainNetwork(makeEthereum(''), undefined),
      { message: WRONG_CHAIN_ERROR }
    );
  });

  it('error message mentions Chain ID 13390', async () => {
    let thrown;
    try {
      await verifyMeeChainNetwork(makeEthereum('0x1'), undefined);
    } catch (e) {
      thrown = e;
    }
    assert.ok(thrown instanceof Error, 'must throw an Error instance');
    assert.ok(thrown.message.includes('13390'), 'error must mention chain ID 13390');
    assert.ok(thrown.message.includes('MeeChain'), 'error must mention MeeChain');
  });
});

describe('executeStake — ensureMeeChainNetwork interaction', () => {
  it('skips ensureMeeChainNetwork when it is undefined', async () => {
    // Should complete without calling any ensureFn
    await assert.doesNotReject(
      () => verifyMeeChainNetwork(makeEthereum('0x344e'), undefined)
    );
  });

  it('skips ensureMeeChainNetwork when it is null', async () => {
    // typeof null === 'object', not 'function' — must not call it
    await assert.doesNotReject(
      () => verifyMeeChainNetwork(makeEthereum('0x344e'), null)
    );
  });

  it('skips ensureMeeChainNetwork when it is a non-function value', async () => {
    await assert.doesNotReject(
      () => verifyMeeChainNetwork(makeEthereum('0x344e'), 'not-a-function')
    );
  });

  it('propagates rejection from ensureMeeChainNetwork', async () => {
    const failEnsure = async () => { throw new Error('network switch failed'); };
    await assert.rejects(
      () => verifyMeeChainNetwork(makeEthereum('0x344e'), failEnsure),
      { message: 'network switch failed' }
    );
  });

  it('throws ensureMeeChainNetwork error before chain ID check if ensure fails', async () => {
    const order = [];
    const failEnsure = async () => {
      order.push('ensure-fail');
      throw new Error('switched failed');
    };
    const ethereum = {
      request: async () => { order.push('chainId'); return '0x344e'; },
    };
    try {
      await verifyMeeChainNetwork(ethereum, failEnsure);
    } catch { /* expected */ }
    assert.ok(order.includes('ensure-fail'), 'ensure must have been called');
    assert.ok(!order.includes('chainId'), 'chainId must not be queried after ensure failure');
  });
});

describe('executeStake — chain verification regression', () => {
  it('accepts 0x344e (decimal 13390) regardless of leading zeros absence', async () => {
    await assert.doesNotReject(
      () => verifyMeeChainNetwork(makeEthereum('0x344e'), undefined)
    );
  });

  it('rejects 0x0344e (padded)', async () => {
    await assert.rejects(
      () => verifyMeeChainNetwork(makeEthereum('0x0344e'), undefined),
      { message: WRONG_CHAIN_ERROR }
    );
  });

  it('multiple sequential calls on wrong network each throw', async () => {
    const ethereum = makeEthereum('0x1');
    for (let i = 0; i < 3; i++) {
      await assert.rejects(
        () => verifyMeeChainNetwork(ethereum, undefined),
        { message: WRONG_CHAIN_ERROR }
      );
    }
  });
});

// ── Tests for meeToWei and weiToMee ──────────────────────────────────────
// These utilities are called within the changed executeStake() function
// (meeToWei is called to compute stakeWei). The logic itself wasn't changed
// in the PR, but their correctness is required for the changed transaction
// building in executeStake to work correctly.

describe('meeToWei — converts MEE amount to wei string', () => {
  // Replicate exact implementation from staking.js
  function meeToWei(mee) {
    return BigInt(Math.floor(parseFloat(mee) * 1e18)).toString();
  }

  it('converts 1 MEE to 1e18 wei', () => {
    assert.strictEqual(meeToWei(1), BigInt('1000000000000000000').toString());
  });

  it('converts 100 MEE to 100e18 wei', () => {
    assert.strictEqual(meeToWei(100), (BigInt(100) * BigInt('1000000000000000000')).toString());
  });

  it('converts 0.001 MEE to 1e15 wei (portal fee)', () => {
    // Portal fee in executeStake is hardcoded as 1e15, matching 0.001 MEE
    assert.strictEqual(meeToWei(0.001), '1000000000000000');
  });

  it('converts 5000 MEE (ritual pool minimum) to correct wei', () => {
    const expected = (BigInt(5000) * BigInt('1000000000000000000')).toString();
    assert.strictEqual(meeToWei(5000), expected);
  });

  it('handles string input', () => {
    assert.strictEqual(meeToWei('1'), BigInt('1000000000000000000').toString());
  });
});

describe('weiToMee — converts wei string back to MEE (4 decimal places)', () => {
  function weiToMee(wei) {
    return (Number(BigInt(wei)) / 1e18).toFixed(4);
  }

  it('converts 1e18 wei to "1.0000" MEE', () => {
    assert.strictEqual(weiToMee('1000000000000000000'), '1.0000');
  });

  it('converts 1e15 wei to "0.0010" MEE (portal fee)', () => {
    assert.strictEqual(weiToMee('1000000000000000'), '0.0010');
  });

  it('converts 0 wei to "0.0000" MEE', () => {
    assert.strictEqual(weiToMee('0'), '0.0000');
  });
});