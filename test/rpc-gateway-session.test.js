'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('sessions.json — Cloudflare Gateway RPC setup', () => {
  const sessionsPath = path.join(__dirname, '..', 'sessions.json');
  const sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));

  it('uses IPv4 Gateway as the primary RPC profile', () => {
    assert.strictEqual(sessions.rpc.primary.type, 'IPv4');
    assert.strictEqual(sessions.rpc.primary.address, '172.64.36.1');
    assert.strictEqual(sessions.rpc.primary.badge, '🥇 Primary RPC');
  });

  it('uses IPv6 Gateway as the secondary fallback profile', () => {
    assert.strictEqual(sessions.rpc.secondary.type, 'IPv6');
    assert.strictEqual(sessions.rpc.secondary.address, '2a06:98c1:54::4b:43e8');
    assert.strictEqual(sessions.rpc.secondary.badge, '🥈 Secondary RPC');
  });

  it('defines secure DoT and DoH endpoints', () => {
    assert.strictEqual(sessions.rpc.dns.dot.endpoint, 'ohsut0yy6x.cloudflare-gateway.com');
    assert.strictEqual(sessions.rpc.dns.doh.endpoint, 'https://ohsut0yy6x.cloudflare-gateway.com/dns-query');
  });

  it('keeps the ritual flow in primary, fallback, secure DNS, test order', () => {
    assert.deepStrictEqual(sessions.ritual_flow, [
      '✅ Set IPv4 as Primary',
      '✅ Add IPv6 as Fallback',
      '✅ Enable DoT',
      '✅ Enable DoH',
      '🎉 RPC Connection Tested',
    ]);
  });
});
