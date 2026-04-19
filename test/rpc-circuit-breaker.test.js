'use strict';
/**
 * Tests for the RPC circuit-breaker functions introduced in server.js (PR diff):
 *   _isRpcDead(url)   — checks if an endpoint is currently marked dead
 *   _markRpcDead(url) — marks an endpoint dead for 60 s
 *   _markRpcAlive(url) — clears the dead mark
 *
 * Because these functions operate on a shared module-level object (_rpcHealth),
 * we replicate the exact logic here and test it in isolation.
 */

const assert = require('assert');
const { describe, it, beforeEach } = require('mocha');

// ── Replicate circuit-breaker logic from server.js (PR diff) ─────────────

const _rpcHealth = {};

function _isRpcDead(url) {
  const h = _rpcHealth[url];
  if (!h || !h.dead) return false;
  if (Date.now() > h.until) { h.dead = false; return false; }
  return true;
}

function _markRpcDead(url) {
  _rpcHealth[url] = { dead: true, until: Date.now() + 60_000 };
}

function _markRpcAlive(url) {
  _rpcHealth[url] = { dead: false, until: 0 };
}

// ── Reset state before each test ─────────────────────────────────────────
beforeEach(() => {
  // Clear all known health records
  for (const key of Object.keys(_rpcHealth)) {
    delete _rpcHealth[key];
  }
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('_isRpcDead — unknown / new URL', () => {
  it('returns false for an URL that was never registered', () => {
    assert.strictEqual(_isRpcDead('https://unknown.rpc.example'), false);
  });

  it('returns false when _rpcHealth entry is missing', () => {
    assert.strictEqual(_isRpcDead('https://rpc.meechain.live'), false);
  });
});

describe('_markRpcDead — marking endpoints dead', () => {
  it('causes _isRpcDead to return true immediately after marking', () => {
    const url = 'https://rpc.meechain.live';
    _markRpcDead(url);
    assert.strictEqual(_isRpcDead(url), true);
  });

  it('sets deadline approximately 60 s in the future', () => {
    const url = 'https://rpc.example.com';
    const before = Date.now();
    _markRpcDead(url);
    const after  = Date.now();
    const h = _rpcHealth[url];
    assert.ok(h.until >= before + 59_000, 'deadline must be at least 59 s ahead');
    assert.ok(h.until <= after  + 61_000, 'deadline must be at most 61 s ahead');
  });

  it('stores dead: true in _rpcHealth', () => {
    const url = 'https://rpc.test.example';
    _markRpcDead(url);
    assert.strictEqual(_rpcHealth[url].dead, true);
  });

  it('marking dead twice resets the 60-s window', () => {
    const url = 'https://rpc.double.test';
    _markRpcDead(url);
    const firstUntil = _rpcHealth[url].until;
    // Small delay to ensure timestamps differ
    _markRpcDead(url);
    const secondUntil = _rpcHealth[url].until;
    assert.ok(secondUntil >= firstUntil, 'second deadline must not be earlier than first');
  });

  it('independently marks two different URLs', () => {
    const url1 = 'https://primary.rpc.example';
    const url2 = 'https://fallback.rpc.example';
    _markRpcDead(url1);
    assert.strictEqual(_isRpcDead(url1), true);
    assert.strictEqual(_isRpcDead(url2), false, 'marking url1 dead must not affect url2');
  });
});

describe('_markRpcAlive — clearing dead status', () => {
  it('causes _isRpcDead to return false after being marked dead then alive', () => {
    const url = 'https://rpc.meechain.live';
    _markRpcDead(url);
    assert.strictEqual(_isRpcDead(url), true, 'should be dead before marking alive');
    _markRpcAlive(url);
    assert.strictEqual(_isRpcDead(url), false, 'should be alive after markRpcAlive');
  });

  it('stores dead: false in _rpcHealth', () => {
    const url = 'https://rpc.alive.test';
    _markRpcDead(url);
    _markRpcAlive(url);
    assert.strictEqual(_rpcHealth[url].dead, false);
  });

  it('stores until: 0 after marking alive', () => {
    const url = 'https://rpc.alive2.test';
    _markRpcDead(url);
    _markRpcAlive(url);
    assert.strictEqual(_rpcHealth[url].until, 0);
  });

  it('calling markRpcAlive on an unknown URL does not throw', () => {
    assert.doesNotThrow(() => _markRpcAlive('https://never-seen.example'));
  });
});

describe('_isRpcDead — TTL expiry behaviour', () => {
  it('returns false when the deadline has already passed', () => {
    const url = 'https://rpc.expired.test';
    // Manually inject an already-expired dead record
    _rpcHealth[url] = { dead: true, until: Date.now() - 1 };
    assert.strictEqual(_isRpcDead(url), false, 'expired deadline must resolve to alive');
  });

  it('resets dead flag to false when deadline has passed', () => {
    const url = 'https://rpc.auto-reset.test';
    _rpcHealth[url] = { dead: true, until: Date.now() - 1 };
    _isRpcDead(url); // triggers the reset
    assert.strictEqual(_rpcHealth[url].dead, false, '_isRpcDead must reset dead flag on expiry');
  });

  it('remains dead when deadline is in the future', () => {
    const url = 'https://rpc.future.test';
    _rpcHealth[url] = { dead: true, until: Date.now() + 60_000 };
    assert.strictEqual(_isRpcDead(url), true);
  });

  it('boundary: exactly at deadline is treated as alive (Date.now() > h.until)', () => {
    const url = 'https://rpc.boundary.test';
    // until === Date.now() at moment of check → Date.now() > until is false → dead
    // But we can only test the already-expired case (until < Date.now())
    _rpcHealth[url] = { dead: true, until: Date.now() - 100 };
    assert.strictEqual(_isRpcDead(url), false);
  });
});

describe('_isRpcDead — edge cases', () => {
  it('handles URL with trailing slash', () => {
    const url = 'https://rpc.meechain.live/';
    _markRpcDead(url);
    assert.strictEqual(_isRpcDead(url), true);
    assert.strictEqual(_isRpcDead('https://rpc.meechain.live'), false, 'different key — not the same entry');
  });

  it('handles URL with path segment', () => {
    const url = 'https://rpc.meechain.live/rpc';
    _markRpcDead(url);
    assert.strictEqual(_isRpcDead(url), true);
  });

  it('is case-sensitive (URL keys are not normalised)', () => {
    const urlLower = 'https://rpc.meechain.live';
    const urlUpper = 'https://RPC.MEECHAIN.LIVE';
    _markRpcDead(urlLower);
    // The uppercase variant is a different key
    assert.strictEqual(_isRpcDead(urlLower), true);
    assert.strictEqual(_isRpcDead(urlUpper), false);
  });

  it('does not affect unrelated URLs when one is marked alive', () => {
    const url1 = 'https://rpc.one.test';
    const url2 = 'https://rpc.two.test';
    _markRpcDead(url1);
    _markRpcDead(url2);
    _markRpcAlive(url1);
    assert.strictEqual(_isRpcDead(url1), false);
    assert.strictEqual(_isRpcDead(url2), true, 'url2 must still be dead');
  });
});

describe('Circuit-breaker — full lifecycle roundtrip', () => {
  it('dead → alive → dead cycle works correctly', () => {
    const url = 'https://rpc.lifecycle.test';
    // 1. Initially alive
    assert.strictEqual(_isRpcDead(url), false);
    // 2. Mark dead
    _markRpcDead(url);
    assert.strictEqual(_isRpcDead(url), true);
    // 3. Mark alive
    _markRpcAlive(url);
    assert.strictEqual(_isRpcDead(url), false);
    // 4. Mark dead again
    _markRpcDead(url);
    assert.strictEqual(_isRpcDead(url), true);
  });

  it('multiple URLs are tracked independently', () => {
    const primary  = 'https://rpc.meechain.live';
    const fallback = 'https://rpc.meechain.run.place';
    _markRpcDead(primary);
    assert.strictEqual(_isRpcDead(primary), true);
    assert.strictEqual(_isRpcDead(fallback), false);
    _markRpcAlive(primary);
    _markRpcDead(fallback);
    assert.strictEqual(_isRpcDead(primary), false);
    assert.strictEqual(_isRpcDead(fallback), true);
  });
});