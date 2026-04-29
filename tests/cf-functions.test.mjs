/**
 * Unit tests for Cloudflare Pages Functions added in this PR:
 *   cf-deploy/functions/api/health.js
 *   cf-deploy/functions/api/network.js
 *   cf-deploy/functions/api/nodecloud/stats.js
 *   cf-deploy/functions/api/web3/status.js
 *   cf-deploy/functions/api/chat.js
 *   cf-deploy/functions/api/chat/stream.js
 *
 * Uses Node.js built-in test runner (node:test + node:assert/strict).
 * Run: node --test tests/cf-functions.test.mjs
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet as healthGet }         from '../cf-deploy/functions/api/health.js';
import { onRequestGet as networkGet }        from '../cf-deploy/functions/api/network.js';
import { onRequestGet as nodecloudStatsGet } from '../cf-deploy/functions/api/nodecloud/stats.js';
import { onRequestGet as web3StatusGet }     from '../cf-deploy/functions/api/web3/status.js';
import {
  onRequestPost as chatPost,
  onRequestOptions as chatOptions,
} from '../cf-deploy/functions/api/chat.js';
import {
  onRequestPost as streamPost,
  onRequestOptions as streamOptions,
} from '../cf-deploy/functions/api/chat/stream.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Build a minimal CF ctx with optional env overrides and optional request. */
function makeCtx({ env = {}, body = null, method = 'GET' } = {}) {
  const request = body !== null
    ? new Request('https://example.com', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      })
    : new Request('https://example.com', { method });

  return { request, env };
}

/** Read a ReadableStream to a string. */
async function streamToString(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

// Global fetch mock management
let originalFetch;
beforeEach(() => { originalFetch = globalThis.fetch; });
afterEach(() => { globalThis.fetch = originalFetch; });

function mockFetch(fn) {
  globalThis.fetch = fn;
}

// ─────────────────────────────────────────────────────────────
// /api/health
// ─────────────────────────────────────────────────────────────

describe('health.js — onRequestGet', () => {
  test('returns status ok with default values when no env vars are set', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await healthGet(ctx);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'application/json');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Cache-Control'), 'no-cache');

    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.model, 'gpt-5-mini');
    assert.equal(data.bot, 'MeeBot AI');
    assert.equal(data.web3, false);
    assert.equal(data.chainId, 13390);
    assert.equal(data.rpc, 'http://rpc.meechain.run.place');
    assert.equal(data.domain, 'meebot.io');
    assert.equal(data.version, '2.0.0');
  });

  test('uses DRPC_RPC_URL env var for rpc field', async () => {
    const ctx = makeCtx({ env: { DRPC_RPC_URL: 'https://custom-rpc.example.com' } });
    const res = await healthGet(ctx);
    const data = await res.json();
    assert.equal(data.rpc, 'https://custom-rpc.example.com');
  });

  test('uses contract address env vars when set', async () => {
    const ctx = makeCtx({
      env: {
        VITE_TOKEN_CONTRACT_ADDRESS:   '0xAAAA',
        VITE_NFT_CONTRACT_ADDRESS:     '0xBBBB',
        VITE_STAKING_CONTRACT_ADDRESS: '0xCCCC',
      },
    });
    const res = await healthGet(ctx);
    const data = await res.json();
    assert.equal(data.contracts.token,   '0xAAAA');
    assert.equal(data.contracts.nft,     '0xBBBB');
    assert.equal(data.contracts.staking, '0xCCCC');
  });

  test('falls back to hardcoded contract addresses when env vars are absent', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await healthGet(ctx);
    const data = await res.json();
    assert.equal(data.contracts.token,   '0x5FbDB2315678afecb367f032d93F642f64180aa3');
    assert.equal(data.contracts.nft,     '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
    assert.equal(data.contracts.staking, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  test('response body is valid JSON', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await healthGet(ctx);
    const text = await res.text();
    assert.doesNotThrow(() => JSON.parse(text));
  });
});

// ─────────────────────────────────────────────────────────────
// /api/network
// ─────────────────────────────────────────────────────────────

describe('network.js — onRequestGet', () => {
  test('returns correct chainId hex for default chain 13390', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await networkGet(ctx);
    const data = await res.json();

    // 13390 decimal = 0x344e
    assert.equal(data.chainId, '0x344e');
    assert.equal(data.chainName, 'MeeChain Ritual Chain');
  });

  test('returns correct chainId hex for a custom CHAIN_ID env var', async () => {
    const ctx = makeCtx({ env: { CHAIN_ID: '1' } });
    const res = await networkGet(ctx);
    const data = await res.json();
    assert.equal(data.chainId, '0x1');
  });

  test('rpcUrls is an array with two entries', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await networkGet(ctx);
    const data = await res.json();
    assert.ok(Array.isArray(data.rpcUrls));
    assert.equal(data.rpcUrls.length, 2);
  });

  test('rpcUrls uses DRPC_RPC_URL and VITE_RPC_URL env vars', async () => {
    const ctx = makeCtx({
      env: {
        DRPC_RPC_URL: 'https://drpc.example.com',
        VITE_RPC_URL: 'https://vite.example.com',
      },
    });
    const res = await networkGet(ctx);
    const data = await res.json();
    assert.equal(data.rpcUrls[0], 'https://drpc.example.com');
    assert.equal(data.rpcUrls[1], 'https://vite.example.com');
  });

  test('nativeCurrency has expected shape', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await networkGet(ctx);
    const data = await res.json();
    assert.equal(data.nativeCurrency.name, 'MEE Token');
    assert.equal(data.nativeCurrency.symbol, 'MEE');
    assert.equal(data.nativeCurrency.decimals, 18);
  });

  test('blockExplorerUrls is a non-empty array', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await networkGet(ctx);
    const data = await res.json();
    assert.ok(Array.isArray(data.blockExplorerUrls));
    assert.ok(data.blockExplorerUrls.length > 0);
  });

  test('contracts object uses env vars when set', async () => {
    const ctx = makeCtx({
      env: {
        VITE_TOKEN_CONTRACT_ADDRESS:   '0x1111',
        VITE_NFT_CONTRACT_ADDRESS:     '0x2222',
        VITE_STAKING_CONTRACT_ADDRESS: '0x3333',
      },
    });
    const res = await networkGet(ctx);
    const data = await res.json();
    assert.equal(data.contracts.token,  '0x1111');
    assert.equal(data.contracts.nft,    '0x2222');
    assert.equal(data.contracts.portal, '0x3333');
  });

  test('response has CORS header', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await networkGet(ctx);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  test('chainId 0 is represented as 0x0', async () => {
    const ctx = makeCtx({ env: { CHAIN_ID: '0' } });
    const res = await networkGet(ctx);
    const data = await res.json();
    assert.equal(data.chainId, '0x0');
  });
});

// ─────────────────────────────────────────────────────────────
// /api/nodecloud/stats
// ─────────────────────────────────────────────────────────────

describe('nodecloud/stats.js — onRequestGet', () => {
  test('returns mock data with source nodecloud_mock when no statsKey is configured', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await nodecloudStatsGet(ctx);
    const data = await res.json();

    assert.equal(data.source, 'nodecloud_mock');
    assert.equal(data.uptime, '99.98%');
    assert.equal(data.requests, 12453);
    assert.equal(data.chainId, 13390);
    assert.equal(data.network, 'MeeChain Ritual Chain');
    assert.equal(data.keyHint, 'not-configured');
    assert.ok(typeof data.lastUpdated === 'string');
  });

  test('keyHint shows first 8 chars of statsKey when set but API is unreachable', async () => {
    mockFetch(async () => { throw new Error('network error'); });

    const ctx = makeCtx({ env: { NODECLOUD_STATS_KEY: 'abcdef1234567890' } });
    const res = await nodecloudStatsGet(ctx);
    const data = await res.json();
    assert.equal(data.source, 'nodecloud_mock');
    assert.equal(data.keyHint, 'abcdef12...');
  });

  test('falls back to mock when NodeCloud API returns non-ok status', async () => {
    mockFetch(async () => new Response('{}', { status: 500 }));

    const ctx = makeCtx({ env: { NODECLOUD_STATS_KEY: 'my-secret-key' } });
    const res = await nodecloudStatsGet(ctx);
    const data = await res.json();
    assert.equal(data.source, 'nodecloud_mock');
  });

  test('returns live data merged with source:nodecloud_live when API is reachable', async () => {
    const livePayload = { nodes: 42, latency: 12 };
    mockFetch(async () => new Response(JSON.stringify(livePayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const ctx = makeCtx({ env: { NODECLOUD_STATS_KEY: 'live-key-12345678' } });
    const res = await nodecloudStatsGet(ctx);
    const data = await res.json();

    assert.equal(data.source, 'nodecloud_live');
    assert.equal(data.nodes, 42);
    assert.equal(data.latency, 12);
  });

  test('mock data contains badges object with expected keys', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await nodecloudStatsGet(ctx);
    const data = await res.json();
    assert.ok(data.badges && typeof data.badges === 'object');
    assert.ok('health' in data.badges);
    assert.ok('network' in data.badges);
    assert.ok('stats' in data.badges);
  });

  test('rpcEndpoint in mock falls back to default RPC URL', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await nodecloudStatsGet(ctx);
    const data = await res.json();
    assert.equal(data.rpcEndpoint, 'http://rpc.meechain.run.place');
  });

  test('rpcEndpoint uses DRPC_RPC_URL env var in mock', async () => {
    const ctx = makeCtx({ env: { DRPC_RPC_URL: 'https://rpc.custom.com' } });
    const res = await nodecloudStatsGet(ctx);
    const data = await res.json();
    assert.equal(data.rpcEndpoint, 'https://rpc.custom.com');
  });

  test('response has CORS header', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await nodecloudStatsGet(ctx);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  test('lastUpdated is a valid ISO date string', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await nodecloudStatsGet(ctx);
    const data = await res.json();
    const d = new Date(data.lastUpdated);
    assert.ok(!isNaN(d.getTime()));
  });
});

// ─────────────────────────────────────────────────────────────
// /api/web3/status
// ─────────────────────────────────────────────────────────────

describe('web3/status.js — onRequestGet', () => {
  test('returns connected:true and blockNumber when RPC responds correctly', async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x1312D00' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const ctx = makeCtx({ env: {} });
    const res = await web3StatusGet(ctx);
    const data = await res.json();

    assert.equal(data.connected, true);
    assert.equal(data.blockNumber, 20000000); // 0x1312D00 = 20000000
    assert.equal(typeof data.rpc, 'string');
    assert.equal(data.chainId, 13390);
  });

  test('returns connected:false and blockNumber:null when fetch throws', async () => {
    mockFetch(async () => { throw new Error('network error'); });

    const ctx = makeCtx({ env: {} });
    const res = await web3StatusGet(ctx);
    const data = await res.json();

    assert.equal(data.connected, false);
    assert.equal(data.blockNumber, null);
  });

  test('returns connected:false when RPC returns non-ok status', async () => {
    mockFetch(async () => new Response('Bad Gateway', { status: 502 }));

    const ctx = makeCtx({ env: {} });
    const res = await web3StatusGet(ctx);
    const data = await res.json();

    assert.equal(data.connected, false);
    assert.equal(data.blockNumber, null);
  });

  test('returns connected:false when result is not a valid hex number', async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: 'not-hex' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const ctx = makeCtx({ env: {} });
    const res = await web3StatusGet(ctx);
    const data = await res.json();

    assert.equal(data.connected, false);
  });

  test('uses DRPC_RPC_URL env var for rpc field', async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x1' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const ctx = makeCtx({ env: { DRPC_RPC_URL: 'https://custom.rpc.com' } });
    const res = await web3StatusGet(ctx);
    const data = await res.json();

    assert.equal(data.rpc, 'https://custom.rpc.com');
  });

  test('uses CHAIN_ID env var for chainId field', async () => {
    mockFetch(async () => { throw new Error('no rpc'); });

    const ctx = makeCtx({ env: { CHAIN_ID: '1' } });
    const res = await web3StatusGet(ctx);
    const data = await res.json();

    assert.equal(data.chainId, 1);
  });

  test('contracts object has token, nft, portal fields', async () => {
    mockFetch(async () => { throw new Error('no rpc'); });

    const ctx = makeCtx({ env: {} });
    const res = await web3StatusGet(ctx);
    const data = await res.json();

    assert.ok('token' in data.contracts);
    assert.ok('nft' in data.contracts);
    assert.ok('portal' in data.contracts);
  });

  test('response has no-cache and CORS headers', async () => {
    mockFetch(async () => { throw new Error('no rpc'); });

    const ctx = makeCtx({ env: {} });
    const res = await web3StatusGet(ctx);

    assert.equal(res.headers.get('Cache-Control'), 'no-cache');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  test('connected:true for block 0x0 (genesis)', async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x0' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const ctx = makeCtx({ env: {} });
    const res = await web3StatusGet(ctx);
    const data = await res.json();

    // parseInt('0x0', 16) === 0, !isNaN(0) === true
    assert.equal(data.connected, true);
    assert.equal(data.blockNumber, 0);
  });
});

// ─────────────────────────────────────────────────────────────
// /api/chat  (non-streaming)
// ─────────────────────────────────────────────────────────────

describe('chat.js — onRequestPost', () => {
  test('returns 400 when message is missing', async () => {
    const ctx = makeCtx({ body: {}, method: 'POST' });
    const res = await chatPost(ctx);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'Message required');
  });

  test('returns 400 when message is an empty string', async () => {
    const ctx = makeCtx({ body: { message: '   ' }, method: 'POST' });
    const res = await chatPost(ctx);
    assert.equal(res.status, 400);
  });

  test('returns API-key-not-configured reply when OPENAI_API_KEY is absent', async () => {
    const ctx = makeCtx({ env: {}, body: { message: 'สวัสดี' }, method: 'POST' });
    const res = await chatPost(ctx);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.reply.includes('API key'));
    assert.equal(data.error, 'API key not configured');
  });

  test('returns reply and usage on successful OpenAI response', async () => {
    const openAIPayload = {
      choices: [{ message: { content: 'สวัสดีครับ!' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
    mockFetch(async () =>
      new Response(JSON.stringify(openAIPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test-key' },
      body: { message: 'สวัสดี' },
      method: 'POST',
    });
    const res = await chatPost(ctx);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.reply, 'สวัสดีครับ!');
    assert.deepEqual(data.usage, openAIPayload.usage);
  });

  test('returns fallback reply when OpenAI API returns non-ok status', async () => {
    mockFetch(async () =>
      new Response('Unauthorized', { status: 401 })
    );

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-bad-key' },
      body: { message: 'Hello' },
      method: 'POST',
    });
    const res = await chatPost(ctx);
    const data = await res.json();
    assert.ok(data.reply.includes('ไม่สามารถตอบได้'));
    assert.ok(data.error.includes('401'));
  });

  test('returns 500 when request body is not valid JSON', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const ctx = { request, env: {} };
    const res = await chatPost(ctx);
    assert.equal(res.status, 500);
  });

  test('uses OPENAI_BASE_URL env var to target custom AI provider', async () => {
    let capturedUrl = null;
    mockFetch(async (url) => {
      capturedUrl = url;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok' } }], usage: {} }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://my-ai.example.com/v1' },
      body: { message: 'test' },
      method: 'POST',
    });
    await chatPost(ctx);
    assert.ok(capturedUrl.startsWith('https://my-ai.example.com/v1'));
  });

  test('falls back to ขออภัย reply when OpenAI response has no choices', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ choices: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test' },
      body: { message: 'test' },
      method: 'POST',
    });
    const res = await chatPost(ctx);
    const data = await res.json();
    assert.ok(data.reply.includes('ขออภัย'));
  });

  test('response has CORS header on success', async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'hi' } }], usage: {} }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test' },
      body: { message: 'hi' },
      method: 'POST',
    });
    const res = await chatPost(ctx);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });
});

describe('chat.js — onRequestOptions', () => {
  test('returns CORS preflight headers', async () => {
    const res = await chatOptions();
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.ok(res.headers.get('Access-Control-Allow-Methods').includes('POST'));
    assert.ok(res.headers.get('Access-Control-Allow-Headers').includes('Content-Type'));
  });
});

// ─────────────────────────────────────────────────────────────
// /api/chat/stream  (SSE streaming)
// ─────────────────────────────────────────────────────────────

describe('chat/stream.js — onRequestPost', () => {
  test('returns 400 when message is missing', async () => {
    const ctx = makeCtx({ body: {}, method: 'POST' });
    const res = await streamPost(ctx);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'Message required');
  });

  test('returns 400 when message is whitespace only', async () => {
    const ctx = makeCtx({ body: { message: '\t\n ' }, method: 'POST' });
    const res = await streamPost(ctx);
    assert.equal(res.status, 400);
  });

  test('returns SSE stream with delta and done:true when API key is absent', async () => {
    const ctx = makeCtx({ env: {}, body: { message: 'สวัสดี' }, method: 'POST' });
    const res = await streamPost(ctx);

    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');

    const text = await streamToString(res.body);
    assert.ok(text.includes('delta'));
    assert.ok(text.includes('"done":true'));
  });

  test('no-key SSE message mentions OPENAI_API_KEY', async () => {
    const ctx = makeCtx({ env: {}, body: { message: 'hello' }, method: 'POST' });
    const res = await streamPost(ctx);
    const text = await streamToString(res.body);
    assert.ok(text.includes('OPENAI_API_KEY'));
  });

  test('returns SSE error when upstream returns non-ok status', async () => {
    mockFetch(async () => new Response('Forbidden', { status: 403 }));

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test' },
      body: { message: 'test' },
      method: 'POST',
    });
    const res = await streamPost(ctx);

    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    const text = await streamToString(res.body);
    // Should contain an error event with the HTTP status
    assert.ok(text.includes('error'));
    assert.ok(text.includes('403'));
  });

  test('returns 500 SSE error when request body is invalid JSON', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'INVALID',
    });
    const ctx = { request, env: {} };
    const res = await streamPost(ctx);
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.ok(text.includes('error'));
  });

  test('strips trailing slash from OPENAI_BASE_URL', async () => {
    let capturedUrl = null;
    // We need to provide a readable body for the upstream SSE mock
    const encoder = new TextEncoder();
    mockFetch(async (url) => {
      capturedUrl = url;
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    });

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://ai.example.com/v1/' },
      body: { message: 'test' },
      method: 'POST',
    });
    await streamPost(ctx);
    assert.ok(capturedUrl && !capturedUrl.includes('//chat'), 'URL should not have double slash');
    assert.ok(capturedUrl && capturedUrl.startsWith('https://ai.example.com/v1/'));
  });

  test('SSE stream properly forwards delta content from upstream', async () => {
    const encoder = new TextEncoder();
    const sseChunks = [
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] }) + '\n\n',
      'data: ' + JSON.stringify({ choices: [{ delta: { content: ' world' } }] }) + '\n\n',
      'data: [DONE]\n\n',
    ];

    mockFetch(async () => {
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of sseChunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });
      return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    });

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test' },
      body: { message: 'say hello' },
      method: 'POST',
    });
    const res = await streamPost(ctx);
    const text = await streamToString(res.body);

    // Should contain forwarded delta chunks
    assert.ok(text.includes('"delta":"Hello"'));
    assert.ok(text.includes('"delta":" world"'));
    assert.ok(text.includes('"done":true'));
  });

  test('response has correct SSE and no-cache headers on success', async () => {
    const encoder = new TextEncoder();
    mockFetch(async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    });

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test' },
      body: { message: 'hi' },
      method: 'POST',
    });
    const res = await streamPost(ctx);
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    assert.equal(res.headers.get('Cache-Control'), 'no-cache');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('X-Accel-Buffering'), 'no');
  });
});

describe('chat/stream.js — onRequestOptions', () => {
  test('returns CORS preflight headers', async () => {
    const res = await streamOptions();
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.ok(res.headers.get('Access-Control-Allow-Methods').includes('POST'));
    assert.ok(res.headers.get('Access-Control-Allow-Headers').includes('Content-Type'));
  });
});
