/**
 * Unit tests for Cloudflare Pages Functions added in this PR:
 *   cf-deploy/functions/api/chat.js
 *   cf-deploy/functions/api/chat/stream.js
 *   cf-deploy/functions/api/health.js
 *   cf-deploy/functions/api/network.js
 *   cf-deploy/functions/api/nodecloud/stats.js
 *   cf-deploy/functions/api/web3/status.js
 *
 * Run: node --test tests/cf-functions.test.mjs
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build a fake ctx object used by all CF Pages Functions. */
function makeCtx(env = {}, reqBody = null, method = 'GET') {
  const request = new Request('https://example.com/', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: reqBody !== null ? JSON.stringify(reqBody) : undefined,
  });
  return { request, env };
}

/** Build a ctx with a POST request whose body is a raw string (for bad JSON). */
function makeCtxRaw(body, env = {}) {
  const request = new Request('https://example.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return { request, env };
}

/** Read all SSE events from a Response that carries an event-stream body. */
async function collectSSE(response) {
  const text = await response.text();
  const events = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        events.push(JSON.parse(line.slice(6)));
      } catch {
        events.push(line.slice(6));
      }
    }
  }
  return events;
}

// Save and restore globalThis.fetch around each test that mocks it.
let originalFetch;
beforeEach(() => { originalFetch = globalThis.fetch; });
afterEach(() => { globalThis.fetch = originalFetch; });

// ────────────────────────────────────────────────────────────────────────────
// cf-deploy/functions/api/health.js
// ────────────────────────────────────────────────────────────────────────────

describe('health.js', async () => {
  const { onRequestGet } = await import('../cf-deploy/functions/api/health.js');

  test('returns status ok with default env values', async () => {
    const res = await onRequestGet(makeCtx({}));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.model, 'gpt-5-mini');
    assert.equal(body.bot, 'MeeBot AI');
    assert.equal(body.web3, false);
    assert.equal(body.chainId, 13390);
    assert.equal(body.rpc, 'http://rpc.meechain.run.place');
    assert.equal(body.domain, 'meebot.io');
    assert.equal(body.version, '2.0.0');
  });

  test('uses default contract addresses when env not set', async () => {
    const res = await onRequestGet(makeCtx({}));
    const { contracts } = await res.json();
    assert.equal(contracts.token,   '0x5FbDB2315678afecb367f032d93F642f64180aa3');
    assert.equal(contracts.nft,     '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
    assert.equal(contracts.staking, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  test('uses env-provided values when set', async () => {
    const env = {
      DRPC_RPC_URL: 'https://custom-rpc.example.com',
      VITE_TOKEN_CONTRACT_ADDRESS: '0xTOKEN',
      VITE_NFT_CONTRACT_ADDRESS: '0xNFT',
      VITE_STAKING_CONTRACT_ADDRESS: '0xSTAKING',
    };
    const res = await onRequestGet(makeCtx(env));
    const body = await res.json();
    assert.equal(body.rpc, 'https://custom-rpc.example.com');
    assert.equal(body.contracts.token,   '0xTOKEN');
    assert.equal(body.contracts.nft,     '0xNFT');
    assert.equal(body.contracts.staking, '0xSTAKING');
  });

  test('sets correct response headers', async () => {
    const res = await onRequestGet(makeCtx({}));
    assert.equal(res.headers.get('Content-Type'), 'application/json');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Cache-Control'), 'no-cache');
  });

  test('web3 field is always false (static value)', async () => {
    const res = await onRequestGet(makeCtx({ DRPC_RPC_URL: 'http://anything' }));
    const body = await res.json();
    assert.equal(body.web3, false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// cf-deploy/functions/api/network.js
// ────────────────────────────────────────────────────────────────────────────

describe('network.js', async () => {
  const { onRequestGet } = await import('../cf-deploy/functions/api/network.js');

  test('default chainId 13390 encodes to 0x344e', async () => {
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    assert.equal(body.chainId, '0x344e');
  });

  test('custom CHAIN_ID is hex-encoded correctly', async () => {
    const res = await onRequestGet(makeCtx({ CHAIN_ID: '1' }));
    const body = await res.json();
    assert.equal(body.chainId, '0x1');
  });

  test('chainName is MeeChain Ritual Chain', async () => {
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    assert.equal(body.chainName, 'MeeChain Ritual Chain');
  });

  test('nativeCurrency has expected fields', async () => {
    const res = await onRequestGet(makeCtx({}));
    const { nativeCurrency } = await res.json();
    assert.equal(nativeCurrency.name,     'MEE Token');
    assert.equal(nativeCurrency.symbol,   'MEE');
    assert.equal(nativeCurrency.decimals, 18);
  });

  test('default rpcUrls uses fallback addresses', async () => {
    const res = await onRequestGet(makeCtx({}));
    const { rpcUrls } = await res.json();
    assert.ok(Array.isArray(rpcUrls));
    assert.equal(rpcUrls[0], 'http://rpc.meechain.run.place');
  });

  test('custom env overrides rpcUrls and contracts', async () => {
    const env = {
      DRPC_RPC_URL: 'https://drpc.custom',
      VITE_RPC_URL: 'https://vite.custom',
      VITE_TOKEN_CONTRACT_ADDRESS: '0xT',
      VITE_NFT_CONTRACT_ADDRESS:   '0xN',
      VITE_STAKING_CONTRACT_ADDRESS: '0xP',
    };
    const res = await onRequestGet(makeCtx(env));
    const body = await res.json();
    assert.equal(body.rpcUrls[0], 'https://drpc.custom');
    assert.equal(body.rpcUrls[1], 'https://vite.custom');
    assert.equal(body.contracts.token,  '0xT');
    assert.equal(body.contracts.nft,    '0xN');
    assert.equal(body.contracts.portal, '0xP');
  });

  test('blockExplorerUrls is an array', async () => {
    const res = await onRequestGet(makeCtx({}));
    const { blockExplorerUrls } = await res.json();
    assert.ok(Array.isArray(blockExplorerUrls));
    assert.ok(blockExplorerUrls.length > 0);
  });

  test('sets CORS header', async () => {
    const res = await onRequestGet(makeCtx({}));
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  test('large custom chainId encodes correctly', async () => {
    const res = await onRequestGet(makeCtx({ CHAIN_ID: '43114' }));
    const body = await res.json();
    assert.equal(body.chainId, '0xa86a');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// cf-deploy/functions/api/nodecloud/stats.js
// ────────────────────────────────────────────────────────────────────────────

describe('nodecloud/stats.js', async () => {
  const { onRequestGet } = await import('../cf-deploy/functions/api/nodecloud/stats.js');

  test('no NODECLOUD_STATS_KEY returns mock data', async () => {
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    assert.equal(body.source, 'nodecloud_mock');
    assert.equal(body.keyHint, 'not-configured');
    assert.equal(body.chainId, 13390);
    assert.equal(body.network, 'MeeChain Ritual Chain');
  });

  test('mock fallback includes uptime and requests fields', async () => {
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    assert.equal(body.uptime, '99.98%');
    assert.equal(body.requests, 12453);
  });

  test('mock fallback includes badges', async () => {
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    assert.ok(body.badges);
    assert.ok(body.badges.health);
    assert.ok(body.badges.network);
    assert.ok(body.badges.stats);
  });

  test('mock fallback uses env DRPC_RPC_URL as rpcEndpoint', async () => {
    const env = { DRPC_RPC_URL: 'https://custom.rpc' };
    const res = await onRequestGet(makeCtx(env));
    const body = await res.json();
    assert.equal(body.rpcEndpoint, 'https://custom.rpc');
  });

  test('mock fallback lastUpdated is a valid ISO string', async () => {
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    const d = new Date(body.lastUpdated);
    assert.ok(!isNaN(d.getTime()), 'lastUpdated should be a valid ISO date string');
  });

  test('with NODECLOUD_STATS_KEY and successful API returns live data', async () => {
    globalThis.fetch = async (url, _opts) => {
      if (url === 'https://api.nodecloud.io/v1/stats') {
        return new Response(JSON.stringify({ nodes: 42, status: 'healthy' }), { status: 200 });
      }
      throw new Error('unexpected fetch');
    };
    const env = { NODECLOUD_STATS_KEY: 'test-key-123' };
    const res = await onRequestGet(makeCtx(env));
    const body = await res.json();
    assert.equal(body.source, 'nodecloud_live');
    assert.equal(body.nodes, 42);
    assert.equal(body.status, 'healthy');
  });

  test('with NODECLOUD_STATS_KEY and non-ok API response falls back to mock', async () => {
    globalThis.fetch = async () => new Response('Server Error', { status: 500 });
    const env = { NODECLOUD_STATS_KEY: 'test-key-123' };
    const res = await onRequestGet(makeCtx(env));
    const body = await res.json();
    assert.equal(body.source, 'nodecloud_mock');
  });

  test('with NODECLOUD_STATS_KEY and fetch throws falls back to mock', async () => {
    globalThis.fetch = async () => { throw new Error('Network unreachable'); };
    const env = { NODECLOUD_STATS_KEY: 'test-key-xyz' };
    const res = await onRequestGet(makeCtx(env));
    const body = await res.json();
    assert.equal(body.source, 'nodecloud_mock');
  });

  test('keyHint shows first 8 chars of key when key is set but API fails', async () => {
    globalThis.fetch = async () => new Response('err', { status: 503 });
    const env = { NODECLOUD_STATS_KEY: 'abcdefghijklmnop' };
    const res = await onRequestGet(makeCtx(env));
    const body = await res.json();
    assert.equal(body.keyHint, 'abcdefgh...');
  });

  test('sets CORS header', async () => {
    const res = await onRequestGet(makeCtx({}));
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// cf-deploy/functions/api/web3/status.js
// ────────────────────────────────────────────────────────────────────────────

describe('web3/status.js', async () => {
  const { onRequestGet } = await import('../cf-deploy/functions/api/web3/status.js');

  test('returns connected:false and blockNumber:null when fetch throws', async () => {
    globalThis.fetch = async () => { throw new Error('Network error'); };
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    assert.equal(body.connected, false);
    assert.equal(body.blockNumber, null);
  });

  test('returns connected:false when RPC responds with non-ok status', async () => {
    globalThis.fetch = async () => new Response('Bad Gateway', { status: 502 });
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    assert.equal(body.connected, false);
    assert.equal(body.blockNumber, null);
  });

  test('returns connected:true and parsed blockNumber on valid RPC response', async () => {
    // eth_blockNumber returns hex block number; 0x13B7C0 = 1292224
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x13B7C0' }), { status: 200 });
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    assert.equal(body.connected, true);
    assert.equal(body.blockNumber, 0x13B7C0);
  });

  test('returns connected:false when result is not a valid hex number', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: 'invalid' }), { status: 200 });
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    assert.equal(body.connected, false);
  });

  test('uses default RPC URL from fallback', async () => {
    globalThis.fetch = async () => { throw new Error('x'); };
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    assert.equal(body.rpc, 'http://rpc.meechain.run.place');
  });

  test('uses DRPC_RPC_URL from env', async () => {
    globalThis.fetch = async () => { throw new Error('x'); };
    const env = { DRPC_RPC_URL: 'https://custom-rpc.test' };
    const res = await onRequestGet(makeCtx(env));
    const body = await res.json();
    assert.equal(body.rpc, 'https://custom-rpc.test');
  });

  test('returns default chainId 13390', async () => {
    globalThis.fetch = async () => { throw new Error('x'); };
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    assert.equal(body.chainId, 13390);
  });

  test('returns custom chainId from env', async () => {
    globalThis.fetch = async () => { throw new Error('x'); };
    const res = await onRequestGet(makeCtx({ CHAIN_ID: '1' }));
    const body = await res.json();
    assert.equal(body.chainId, 1);
  });

  test('returns default contract addresses', async () => {
    globalThis.fetch = async () => { throw new Error('x'); };
    const res = await onRequestGet(makeCtx({}));
    const { contracts } = await res.json();
    assert.equal(contracts.token,  '0x5FbDB2315678afecb367f032d93F642f64180aa3');
    assert.equal(contracts.nft,    '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
    assert.equal(contracts.portal, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  test('sets correct response headers', async () => {
    globalThis.fetch = async () => { throw new Error('x'); };
    const res = await onRequestGet(makeCtx({}));
    assert.equal(res.headers.get('Content-Type'), 'application/json');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Cache-Control'), 'no-cache');
  });

  test('zero block number 0x0 → connected:true, blockNumber:0', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x0' }), { status: 200 });
    const res = await onRequestGet(makeCtx({}));
    const body = await res.json();
    // parseInt('0x0', 16) === 0; !isNaN(0) === true → connected should be true
    assert.equal(body.connected, true);
    assert.equal(body.blockNumber, 0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// cf-deploy/functions/api/chat.js
// ────────────────────────────────────────────────────────────────────────────

describe('chat.js', async () => {
  const { onRequestPost, onRequestOptions } = await import('../cf-deploy/functions/api/chat.js');

  test('OPTIONS returns correct CORS headers', async () => {
    const res = await onRequestOptions();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
    assert.equal(res.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
  });

  test('empty message returns 400', async () => {
    const ctx = makeCtx({}, { message: '' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });

  test('whitespace-only message returns 400', async () => {
    const ctx = makeCtx({}, { message: '   ' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 400);
  });

  test('missing message field returns 400', async () => {
    const ctx = makeCtx({}, {}, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 400);
  });

  test('no OPENAI_API_KEY returns fallback reply without calling OpenAI', async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => { fetchCalled = true; return new Response('{}', { status: 200 }); };
    const ctx = makeCtx({}, { message: 'สวัสดี' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.reply, 'should have reply field');
    assert.ok(body.error, 'should have error field indicating no key');
    assert.equal(fetchCalled, false, 'should not call OpenAI when key is missing');
  });

  test('successful OpenAI response returns reply and usage', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({
        choices: [{ message: { content: 'สวัสดีครับ!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }), { status: 200 });
    const ctx = makeCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'สวัสดี' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.reply, 'สวัสดีครับ!');
    assert.ok(body.usage);
    assert.equal(body.usage.total_tokens, 15);
  });

  test('uses fallback reply when choices array is empty', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ choices: [] }), { status: 200 });
    const ctx = makeCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'hello' }, 'POST');
    const res = await onRequestPost(ctx);
    const body = await res.json();
    assert.equal(body.reply, 'ขออภัย ไม่สามารถตอบได้');
  });

  test('OpenAI non-ok response returns error reply', async () => {
    globalThis.fetch = async () => new Response('Unauthorized', { status: 401 });
    const ctx = makeCtx({ OPENAI_API_KEY: 'sk-bad' }, { message: 'hello' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.reply, 'should have reply indicating error');
    assert.match(body.error, /HTTP 401/);
  });

  test('uses custom OPENAI_BASE_URL', async () => {
    let calledUrl = '';
    globalThis.fetch = async (url) => {
      calledUrl = url;
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'ok' } }],
        usage: {},
      }), { status: 200 });
    };
    const env = { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://my-proxy.example.com/v1' };
    const ctx = makeCtx(env, { message: 'hi' }, 'POST');
    await onRequestPost(ctx);
    assert.ok(calledUrl.startsWith('https://my-proxy.example.com/v1'), `expected custom base URL, got ${calledUrl}`);
  });

  test('sends correct Authorization header to OpenAI', async () => {
    let authHeader = '';
    globalThis.fetch = async (_url, opts) => {
      authHeader = opts.headers['Authorization'];
      return new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }], usage: {} }), { status: 200 });
    };
    const ctx = makeCtx({ OPENAI_API_KEY: 'sk-mykey' }, { message: 'test' }, 'POST');
    await onRequestPost(ctx);
    assert.equal(authHeader, 'Bearer sk-mykey');
  });

  test('malformed JSON body returns 500', async () => {
    const ctx = makeCtxRaw('not-json', {});
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 500);
  });

  test('response includes CORS header', async () => {
    const ctx = makeCtx({}, { message: 'hello' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  test('sessionId field is accepted without error (ignored)', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'hi' } }], usage: {} }), { status: 200 });
    const ctx = makeCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'hello', sessionId: 'abc123' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 200);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// cf-deploy/functions/api/chat/stream.js
// ────────────────────────────────────────────────────────────────────────────

describe('chat/stream.js', async () => {
  const { onRequestPost, onRequestOptions } = await import('../cf-deploy/functions/api/chat/stream.js');

  test('OPTIONS returns correct CORS headers', async () => {
    const res = await onRequestOptions();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
    assert.equal(res.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
  });

  test('empty message returns 400', async () => {
    const ctx = makeCtx({}, { message: '' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });

  test('whitespace-only message returns 400', async () => {
    const ctx = makeCtx({}, { message: '   ' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 400);
  });

  test('no OPENAI_API_KEY returns SSE stream with delta and done', async () => {
    const ctx = makeCtx({}, { message: 'สวัสดี' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    const events = await collectSSE(res);
    const deltaEvent = events.find(e => e.delta);
    assert.ok(deltaEvent, 'should have at least one delta event');
    const doneEvent = events.find(e => e.done === true);
    assert.ok(doneEvent, 'should have a done:true event');
  });

  test('upstream non-ok response returns SSE with error event', async () => {
    globalThis.fetch = async () => new Response('Server Error', { status: 503 });
    const ctx = makeCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'hello' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    const events = await collectSSE(res);
    const errorEvent = events.find(e => e.error);
    assert.ok(errorEvent, 'should have an error event');
    assert.match(errorEvent.error, /503/);
  });

  test('strips trailing slash from OPENAI_BASE_URL', async () => {
    let calledUrl = '';
    const encoder = new TextEncoder();
    globalThis.fetch = async (url) => {
      calledUrl = url;
      // Return a minimal valid SSE stream
      const body = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(encoder.encode('data: [DONE]\n\n'));
          ctrl.close();
        },
      });
      return new Response(body, { status: 200 });
    };
    const env = { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://proxy.example.com/v1/' };
    const ctx = makeCtx(env, { message: 'hi' }, 'POST');
    const res = await onRequestPost(ctx);
    // Consume the stream so the async pipeline completes
    await res.text();
    assert.ok(!calledUrl.includes('//chat'), `URL should not have double slash, got: ${calledUrl}`);
    assert.ok(calledUrl.startsWith('https://proxy.example.com/v1/chat'), `Expected clean URL, got: ${calledUrl}`);
  });

  test('successful streaming returns text/event-stream content-type', async () => {
    const encoder = new TextEncoder();
    globalThis.fetch = async () => {
      const body = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"สวั"}}]}\n\n'));
          ctrl.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"สดี"}}]}\n\n'));
          ctrl.enqueue(encoder.encode('data: [DONE]\n\n'));
          ctrl.close();
        },
      });
      return new Response(body, { status: 200 });
    };
    const ctx = makeCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'hello' }, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Cache-Control'), 'no-cache');
  });

  test('streaming SSE emits delta events for content chunks', async () => {
    const encoder = new TextEncoder();
    globalThis.fetch = async () => {
      const body = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
          ctrl.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":" World"}}]}\n\n'));
          ctrl.enqueue(encoder.encode('data: [DONE]\n\n'));
          ctrl.close();
        },
      });
      return new Response(body, { status: 200 });
    };
    const ctx = makeCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'hello' }, 'POST');
    const res = await onRequestPost(ctx);
    const events = await collectSSE(res);
    const deltas = events.filter(e => e.delta).map(e => e.delta);
    assert.ok(deltas.includes('Hello'), 'should have "Hello" delta');
    assert.ok(deltas.includes(' World'), 'should have " World" delta');
    const doneEvent = events.find(e => e.done === true);
    assert.ok(doneEvent, 'should have done:true event');
  });

  test('malformed JSON body returns 500 SSE', async () => {
    const ctx = makeCtxRaw('not-json', {});
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 500);
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
  });

  test('missing message field returns 400', async () => {
    const ctx = makeCtx({}, {}, 'POST');
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 400);
  });
});
