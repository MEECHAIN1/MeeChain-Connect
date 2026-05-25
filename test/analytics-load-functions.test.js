'use strict';
/**
 * Tests for analytics.html JavaScript changes introduced in this PR.
 *
 * Key changes under test:
 *  1. loadAll() was simplified — no longer attempts a snapshot endpoint first;
 *     it calls each individual loader directly via Promise.all.
 *  2. Individual load functions (loadOverview, loadTvl, loadVolume, loadPrice,
 *     loadUsers, loadTxBreakdown, loadGas, loadLeaderboard, loadFeed) no longer
 *     accept a pre-fetched `data` argument — they always fetch from their
 *     respective API endpoints.
 *  3. openWalletHub() was removed; the wallet button now calls
 *     window.connectWallet() directly (or alerts if unavailable).
 *
 * We replicate the simplified logic inline (matching the PR diff) and verify
 * the behavioural contract in isolation, without a browser or DOM.
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

// ── Helpers ──────────────────────────────────────────────────────────────

/** Track which URLs were fetched and return a stub payload. */
function makeFetchTracker(responseMap = {}) {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    const stub = responseMap[url] || responseMap['*'];
    if (stub === undefined) throw new Error(`Unexpected fetch: ${url}`);
    return {
      ok: true,
      json: async () => stub,
    };
  };
  fetchFn.calls = calls;
  return fetchFn;
}

/** Minimal stub responses for each analytics endpoint. */
const STUB_RESPONSES = {
  '/api/analytics/overview':     { totalValueLocked: 100 },
  '/api/analytics/tvl?days=7':   { data: [] },
  '/api/analytics/volume?days=7':{ data: [] },
  '/api/token/history?points=48':{ data: [] },
  '/api/analytics/users':        { hourly: [] },
  '/api/analytics/transactions': { types: [] },
  '/api/analytics/gas':          { gasPrice: { current: '1' }, avgGasUsed: '21000', totalGasBurned: '0' },
  '/api/analytics/leaderboard?type=holders': { leaderboard: [] },
  '/api/analytics/events?limit=20': { events: [] },
};

// ── Replicate individual load functions (PR diff — no `data` parameter) ──

async function loadOverview(fetchFn) {
  const r = await fetchFn('/api/analytics/overview');
  return await r.json();
}

async function loadTvl(days, fetchFn) {
  const tvlDays = days || 7;
  const r = await fetchFn(`/api/analytics/tvl?days=${tvlDays}`);
  return await r.json();
}

async function loadVolume(days, fetchFn) {
  const volDays = days || 7;
  const r = await fetchFn(`/api/analytics/volume?days=${volDays}`);
  return await r.json();
}

async function loadPrice(fetchFn) {
  const r = await fetchFn('/api/token/history?points=48');
  return await r.json();
}

async function loadUsers(fetchFn) {
  const r = await fetchFn('/api/analytics/users');
  return await r.json();
}

async function loadTxBreakdown(fetchFn) {
  const r = await fetchFn('/api/analytics/transactions');
  return await r.json();
}

async function loadGas(fetchFn) {
  const r = await fetchFn('/api/analytics/gas');
  return await r.json();
}

async function loadLeaderboard(type, fetchFn) {
  const r = await fetchFn(`/api/analytics/leaderboard?type=${type || 'holders'}`);
  return await r.json();
}

async function loadFeed(fetchFn) {
  const r = await fetchFn('/api/analytics/events?limit=20');
  return await r.json();
}

/** Replicate the new simplified loadAll() from analytics.html PR diff. */
async function loadAll(fetchFn, tvlDays = 7, volDays = 7) {
  await Promise.all([
    loadOverview(fetchFn),
    loadTvl(tvlDays, fetchFn),
    loadVolume(volDays, fetchFn),
    loadPrice(fetchFn),
    loadUsers(fetchFn),
    loadTxBreakdown(fetchFn),
    loadGas(fetchFn),
    loadLeaderboard('holders', fetchFn),
    loadFeed(fetchFn),
  ]);
}

// ── Tests: loadAll — calls each endpoint directly ─────────────────────────

describe('analytics.html loadAll() — simplified (no snapshot fallback)', () => {
  it('calls /api/analytics/overview', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadAll(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/overview'), 'overview not fetched');
  });

  it('calls /api/analytics/tvl?days=7', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadAll(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/tvl?days=7'), 'tvl not fetched');
  });

  it('calls /api/analytics/volume?days=7', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadAll(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/volume?days=7'), 'volume not fetched');
  });

  it('calls /api/token/history?points=48', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadAll(fetch);
    assert.ok(fetch.calls.includes('/api/token/history?points=48'), 'price not fetched');
  });

  it('calls /api/analytics/users', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadAll(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/users'), 'users not fetched');
  });

  it('calls /api/analytics/transactions', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadAll(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/transactions'), 'transactions not fetched');
  });

  it('calls /api/analytics/gas', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadAll(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/gas'), 'gas not fetched');
  });

  it('calls /api/analytics/leaderboard?type=holders', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadAll(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/leaderboard?type=holders'), 'leaderboard not fetched');
  });

  it('calls /api/analytics/events?limit=20', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadAll(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/events?limit=20'), 'feed not fetched');
  });

  it('makes exactly 9 fetch calls (one per loader)', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadAll(fetch);
    assert.strictEqual(fetch.calls.length, 9, `expected 9 calls, got ${fetch.calls.length}`);
  });

  it('does NOT call the old /api/analytics/snapshot endpoint', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadAll(fetch);
    const snapshotCalls = fetch.calls.filter(u => u.includes('snapshot'));
    assert.strictEqual(snapshotCalls.length, 0, 'snapshot endpoint must not be called');
  });
});

// ── Tests: individual loaders do not accept pre-loaded data ───────────────

describe('analytics.html individual loaders — always fetch (no data param)', () => {
  it('loadOverview always calls the API endpoint', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadOverview(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/overview'));
  });

  it('loadTvl with days=30 fetches /api/analytics/tvl?days=30', async () => {
    const fetch = makeFetchTracker({
      '/api/analytics/tvl?days=30': { data: [] },
    });
    await loadTvl(30, fetch);
    assert.ok(fetch.calls.includes('/api/analytics/tvl?days=30'));
  });

  it('loadTvl defaults to days=7 when days is falsy', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadTvl(null, fetch);
    assert.ok(fetch.calls.includes('/api/analytics/tvl?days=7'));
  });

  it('loadVolume with days=14 fetches /api/analytics/volume?days=14', async () => {
    const fetch = makeFetchTracker({
      '/api/analytics/volume?days=14': { data: [] },
    });
    await loadVolume(14, fetch);
    assert.ok(fetch.calls.includes('/api/analytics/volume?days=14'));
  });

  it('loadPrice always calls /api/token/history?points=48', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadPrice(fetch);
    assert.ok(fetch.calls.includes('/api/token/history?points=48'));
  });

  it('loadUsers always calls /api/analytics/users', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadUsers(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/users'));
  });

  it('loadTxBreakdown always calls /api/analytics/transactions', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadTxBreakdown(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/transactions'));
  });

  it('loadGas always calls /api/analytics/gas', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadGas(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/gas'));
  });

  it('loadLeaderboard(type="nft") fetches ?type=nft', async () => {
    const fetch = makeFetchTracker({
      '/api/analytics/leaderboard?type=nft': { leaderboard: [] },
    });
    await loadLeaderboard('nft', fetch);
    assert.ok(fetch.calls.includes('/api/analytics/leaderboard?type=nft'));
  });

  it('loadLeaderboard defaults to ?type=holders when type is falsy', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadLeaderboard(null, fetch);
    assert.ok(fetch.calls.includes('/api/analytics/leaderboard?type=holders'));
  });

  it('loadFeed always calls /api/analytics/events?limit=20', async () => {
    const fetch = makeFetchTracker(STUB_RESPONSES);
    await loadFeed(fetch);
    assert.ok(fetch.calls.includes('/api/analytics/events?limit=20'));
  });
});

// ── Tests: loaders return API data ───────────────────────────────────────

describe('analytics.html loaders — return value from API', () => {
  it('loadOverview returns the parsed JSON from the API', async () => {
    const stub = { totalValueLocked: 999, users: 42 };
    const fetch = makeFetchTracker({ '/api/analytics/overview': stub });
    const result = await loadOverview(fetch);
    assert.deepStrictEqual(result, stub);
  });

  it('loadGas returns gas data from API', async () => {
    const stub = { gasPrice: { current: '5' }, avgGasUsed: '30000', totalGasBurned: '1.5' };
    const fetch = makeFetchTracker({ '/api/analytics/gas': stub });
    const result = await loadGas(fetch);
    assert.deepStrictEqual(result, stub);
  });

  it('loadLeaderboard returns leaderboard data from API', async () => {
    const stub = { leaderboard: [{ address: '0x1', balance: '100' }] };
    const fetch = makeFetchTracker({ '/api/analytics/leaderboard?type=holders': stub });
    const result = await loadLeaderboard('holders', fetch);
    assert.deepStrictEqual(result, stub);
  });
});

// ── Tests: openWalletHub removal ─────────────────────────────────────────

describe('analytics.html — openWalletHub() removal', () => {
  /**
   * In the PR diff, openWalletHub() was deleted and the wallet button's onclick
   * was changed to:
   *   window.connectWallet ? window.connectWallet() : alert('...')
   *
   * We test the inlined logic directly.
   */
  function walletButtonOnClick(windowObj) {
    if (typeof windowObj.connectWallet === 'function') {
      windowObj.connectWallet();
    } else {
      windowObj._alert = true;
    }
  }

  it('calls window.connectWallet() when it exists', () => {
    let called = false;
    const win = { connectWallet: () => { called = true; } };
    walletButtonOnClick(win);
    assert.strictEqual(called, true);
  });

  it('does NOT call window.connectWallet if it does not exist', () => {
    const win = {};
    // Should not throw
    assert.doesNotThrow(() => walletButtonOnClick(win));
    assert.strictEqual(win._alert, true, 'fallback alert path should trigger');
  });

  it('does not navigate to index.html#wallet (old openWalletHub behaviour removed)', () => {
    // Ensure the new onclick does not redirect — we just verify no location.href assignment
    let hrefSet = null;
    const win = {
      connectWallet: undefined,
      set location(v) { hrefSet = v; },
    };
    // Even without connectWallet, no navigation should happen
    walletButtonOnClick(win);
    assert.strictEqual(hrefSet, null, 'must not navigate to wallet hub');
  });
});

// ── Tests: regression / parallel loading ─────────────────────────────────

describe('analytics.html loadAll() — regression / parallel loading', () => {
  it('all 9 loaders complete even when some are slow', async () => {
    let completed = 0;
    const slowFetch = async (url) => {
      // simulate varying latency
      await new Promise(r => setTimeout(r, Math.random() * 10));
      completed++;
      return { ok: true, json: async () => ({}) };
    };
    await loadAll(slowFetch);
    assert.strictEqual(completed, 9);
  });

  it('loadAll rejects if any individual loader throws', async () => {
    let callCount = 0;
    const failOnGas = async (url) => {
      callCount++;
      if (url === '/api/analytics/gas') throw new Error('gas endpoint down');
      return { ok: true, json: async () => ({}) };
    };
    await assert.rejects(
      () => loadAll(failOnGas),
      (err) => err.message === 'gas endpoint down'
    );
  });
});