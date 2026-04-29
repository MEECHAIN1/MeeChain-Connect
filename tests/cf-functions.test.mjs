/**
 * Unit tests for Cloudflare Pages Functions added in this PR:
 *   cf-deploy/functions/api/health.js
 *   cf-deploy/functions/api/network.js
 *   cf-deploy/functions/api/chat.js
 *   cf-deploy/functions/api/chat/stream.js
 *   cf-deploy/functions/api/nodecloud/stats.js
 *   cf-deploy/functions/api/web3/status.js
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build a fake ctx object for CF Pages Functions */
function makeCtx({ env = {}, body = null, method = 'GET' } = {}) {
  const request = new Request('https://example.com/', {
    method,
    body: body !== null ? JSON.stringify(body) : undefined,
    headers: body !== null ? { 'Content-Type': 'application/json' } : {},
  });
  return { request, env };
}

/** Read all bytes from a ReadableStream and return as string */
async function streamToText(readable) {
  const reader = readable.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

/** Parse SSE text into array of parsed data payloads */
function parseSseLines(text) {
  return text
    .split('\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6).trim()));
}

// ─── /api/health ────────────────────────────────────────────────────────────

describe('/api/health', () => {
  let onRequestGet;

  beforeEach(async () => {
    ({ onRequestGet } = await import('../cf-deploy/functions/api/health.js'));
  });

  test('returns status ok with default contract addresses', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await onRequestGet(ctx);

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.model, 'gpt-5-mini');
    assert.equal(body.bot, 'MeeBot AI');
    assert.equal(body.web3, false);
    assert.equal(body.chainId, 13390);
    assert.equal(body.domain, 'meebot.io');
    assert.equal(body.version, '2.0.0');
  });

  test('uses default RPC URL when DRPC_RPC_URL is not set', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await onRequestGet(ctx);
    const body = await res.json();
    assert.equal(body.rpc, 'http://rpc.meechain.run.place');
  });

  test('uses DRPC_RPC_URL from env when provided', async () => {
    const ctx = makeCtx({ env: { DRPC_RPC_URL: 'https://my-custom-rpc.example.com' } });
    const res = await onRequestGet(ctx);
    const body = await res.json();
    assert.equal(body.rpc, 'https://my-custom-rpc.example.com');
  });

  test('returns default contract addresses when env vars are missing', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await onRequestGet(ctx);
    const body = await res.json();
    assert.equal(body.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
    assert.equal(body.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
    assert.equal(body.contracts.staking, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  test('uses contract addresses from env when provided', async () => {
    const ctx = makeCtx({
      env: {
        VITE_TOKEN_CONTRACT_ADDRESS: '0xAAAA',
        VITE_NFT_CONTRACT_ADDRESS: '0xBBBB',
        VITE_STAKING_CONTRACT_ADDRESS: '0xCCCC',
      },
    });
    const res = await onRequestGet(ctx);
    const body = await res.json();
    assert.equal(body.contracts.token, '0xAAAA');
    assert.equal(body.contracts.nft, '0xBBBB');
    assert.equal(body.contracts.staking, '0xCCCC');
  });

  test('sets correct Content-Type and CORS headers', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await onRequestGet(ctx);
    assert.equal(res.headers.get('Content-Type'), 'application/json');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Cache-Control'), 'no-cache');
  });
});

// ─── /api/network ───────────────────────────────────────────────────────────

describe('/api/network', () => {
  let onRequestGet;

  beforeEach(async () => {
    ({ onRequestGet } = await import('../cf-deploy/functions/api/network.js'));
  });

  test('returns hex chainId 0x344e for default chain 13390', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await onRequestGet(ctx);
    const body = await res.json();
    assert.equal(body.chainId, '0x344e');
  });

  test('converts custom CHAIN_ID to hex', async () => {
    const ctx = makeCtx({ env: { CHAIN_ID: '1' } });
    const res = await onRequestGet(ctx);
    const body = await res.json();
    assert.equal(body.chainId, '0x1');
  });

  test('returns correct chainName', async () => {
    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.chainName, 'MeeChain Ritual Chain');
  });

  test('returns two RPC URLs by default', async () => {
    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.ok(Array.isArray(body.rpcUrls));
    assert.equal(body.rpcUrls.length, 2);
    assert.equal(body.rpcUrls[0], 'http://rpc.meechain.run.place');
  });

  test('uses env RPC URLs when provided', async () => {
    const ctx = makeCtx({
      env: {
        DRPC_RPC_URL: 'https://drpc.example.com',
        VITE_RPC_URL: 'https://vite-rpc.example.com',
      },
    });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.rpcUrls[0], 'https://drpc.example.com');
    assert.equal(body.rpcUrls[1], 'https://vite-rpc.example.com');
  });

  test('returns native currency with correct symbol and decimals', async () => {
    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.nativeCurrency.symbol, 'MEE');
    assert.equal(body.nativeCurrency.decimals, 18);
    assert.equal(body.nativeCurrency.name, 'MEE Token');
  });

  test('returns blockExplorerUrls array', async () => {
    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.ok(Array.isArray(body.blockExplorerUrls));
    assert.ok(body.blockExplorerUrls.length > 0);
  });

  test('returns default contract addresses', async () => {
    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
    assert.equal(body.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
    assert.equal(body.contracts.portal, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  test('sets CORS header', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await onRequestGet(ctx);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Content-Type'), 'application/json');
  });

  test('returns 0x0 for CHAIN_ID=0 edge case', async () => {
    const ctx = makeCtx({ env: { CHAIN_ID: '0' } });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.chainId, '0x0');
  });
});

// ─── /api/chat ──────────────────────────────────────────────────────────────

describe('/api/chat', () => {
  let onRequestPost, onRequestOptions;
  let originalFetch;

  beforeEach(async () => {
    ({ onRequestPost, onRequestOptions } = await import('../cf-deploy/functions/api/chat.js'));
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns 400 when message is empty string', async () => {
    const ctx = makeCtx({ env: {}, body: { message: '' }, method: 'POST' });
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Message required');
  });

  test('returns 400 when message is whitespace only', async () => {
    const ctx = makeCtx({ env: {}, body: { message: '   ' }, method: 'POST' });
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 400);
  });

  test('returns 400 when message field is missing', async () => {
    const ctx = makeCtx({ env: {}, body: {}, method: 'POST' });
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 400);
  });

  test('returns error reply when OPENAI_API_KEY is not configured', async () => {
    const ctx = makeCtx({ env: {}, body: { message: 'สวัสดี' }, method: 'POST' });
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.error, 'API key not configured');
    assert.ok(body.reply.includes('API key'));
  });

  test('returns CORS headers when API key is not configured', async () => {
    const ctx = makeCtx({ env: {}, body: { message: 'hello' }, method: 'POST' });
    const res = await onRequestPost(ctx);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  test('returns reply and usage on successful OpenAI call', async () => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'สวัสดีครับ!' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test' },
      body: { message: 'สวัสดี' },
      method: 'POST',
    });
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.reply, 'สวัสดีครับ!');
    assert.ok(body.usage);
    assert.equal(body.usage.total_tokens, 15);
  });

  test('returns fallback reply when choices array is empty', async () => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({ choices: [], usage: {} }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test' },
      body: { message: 'test' },
      method: 'POST',
    });
    const res = await onRequestPost(ctx);
    const body = await res.json();
    assert.ok(body.reply); // fallback string present
  });

  test('handles OpenAI HTTP error response', async () => {
    global.fetch = async () =>
      new Response('Unauthorized', { status: 401 });

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-bad' },
      body: { message: 'test' },
      method: 'POST',
    });
    const res = await onRequestPost(ctx);
    const body = await res.json();
    assert.ok(body.error.includes('401'));
    assert.ok(body.reply);
  });

  test('uses custom OPENAI_BASE_URL when provided', async () => {
    let capturedUrl = '';
    global.fetch = async (url) => {
      capturedUrl = url;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok' } }], usage: {} }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://custom.api.example.com/v1' },
      body: { message: 'test' },
      method: 'POST',
    });
    await onRequestPost(ctx);
    assert.ok(capturedUrl.startsWith('https://custom.api.example.com/v1'), `URL was: ${capturedUrl}`);
  });

  test('sends Authorization header with bearer token', async () => {
    let capturedHeaders = {};
    global.fetch = async (_url, opts) => {
      capturedHeaders = Object.fromEntries(Object.entries(opts.headers));
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok' } }], usage: {} }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-mykey' },
      body: { message: 'hi' },
      method: 'POST',
    });
    await onRequestPost(ctx);
    assert.equal(capturedHeaders['Authorization'], 'Bearer sk-mykey');
  });

  test('returns 500 on unexpected exception', async () => {
    global.fetch = async () => { throw new Error('Network failure'); };

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test' },
      body: { message: 'hello' },
      method: 'POST',
    });
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'Network failure');
  });

  test('onRequestOptions returns correct CORS preflight headers', async () => {
    const res = await onRequestOptions();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.ok(res.headers.get('Access-Control-Allow-Methods').includes('POST'));
    assert.ok(res.headers.get('Access-Control-Allow-Headers').includes('Content-Type'));
  });
});

// ─── /api/chat/stream ───────────────────────────────────────────────────────

describe('/api/chat/stream', () => {
  let onRequestPost, onRequestOptions;
  let originalFetch;

  beforeEach(async () => {
    ({ onRequestPost, onRequestOptions } = await import('../cf-deploy/functions/api/chat/stream.js'));
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns 400 when message is empty', async () => {
    const ctx = makeCtx({ env: {}, body: { message: '' }, method: 'POST' });
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Message required');
  });

  test('returns 400 when message is whitespace', async () => {
    const ctx = makeCtx({ env: {}, body: { message: '  ' }, method: 'POST' });
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 400);
  });

  test('returns SSE stream with error delta when API key missing', async () => {
    const ctx = makeCtx({ env: {}, body: { message: 'hello' }, method: 'POST' });
    const res = await onRequestPost(ctx);
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    const text = await streamToText(res.body);
    const events = parseSseLines(text);
    assert.ok(events.length >= 2, 'should have at least delta and done events');
    assert.ok(events[0].delta, 'first event should have delta with error message');
    assert.ok(events[0].delta.includes('OPENAI_API_KEY'));
    assert.equal(events[events.length - 1].done, true);
  });

  test('returns SSE stream CORS headers when API key missing', async () => {
    const ctx = makeCtx({ env: {}, body: { message: 'hello' }, method: 'POST' });
    const res = await onRequestPost(ctx);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  test('returns SSE stream with error event when upstream fails', async () => {
    global.fetch = async () => new Response('Bad Gateway', { status: 502 });

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test' },
      body: { message: 'hello' },
      method: 'POST',
    });
    const res = await onRequestPost(ctx);
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    const text = await streamToText(res.body);
    const events = parseSseLines(text);
    const errorEvent = events.find((e) => e.error);
    assert.ok(errorEvent, 'should have an error event');
    assert.ok(errorEvent.error.includes('502'));
  });

  test('streams delta chunks from upstream SSE', async () => {
    // Simulate OpenAI streaming SSE format
    const sseChunks = [
      'data: {"choices":[{"delta":{"content":"สวัสดี"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"ครับ"}}]}\n\n',
      'data: [DONE]\n\n',
    ].map((s) => new TextEncoder().encode(s));

    let chunkIndex = 0;
    const mockReadable = new ReadableStream({
      pull(controller) {
        if (chunkIndex < sseChunks.length) {
          controller.enqueue(sseChunks[chunkIndex++]);
        } else {
          controller.close();
        }
      },
    });

    global.fetch = async () =>
      new Response(mockReadable, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test' },
      body: { message: 'สวัสดี' },
      method: 'POST',
    });
    const res = await onRequestPost(ctx);
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    assert.equal(res.headers.get('Cache-Control'), 'no-cache');

    const text = await streamToText(res.body);
    const events = parseSseLines(text);

    const deltas = events.filter((e) => e.delta).map((e) => e.delta);
    assert.ok(deltas.includes('สวัสดี'), `deltas were: ${JSON.stringify(deltas)}`);
    assert.ok(deltas.includes('ครับ'));

    const doneEvent = events.find((e) => e.done === true);
    assert.ok(doneEvent, 'should have a done event');
  });

  test('trims trailing slash from OPENAI_BASE_URL', async () => {
    let capturedUrl = '';
    global.fetch = async (url) => {
      capturedUrl = url;
      const empty = new ReadableStream({ start(c) { c.close(); } });
      return new Response(empty, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    };

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://api.example.com/v1/' },
      body: { message: 'hi' },
      method: 'POST',
    });
    await onRequestPost(ctx);
    assert.ok(!capturedUrl.includes('//chat'), `URL should not have double slash: ${capturedUrl}`);
  });

  test('returns 500 SSE on unexpected exception', async () => {
    global.fetch = async () => { throw new Error('Connection refused'); };

    const ctx = makeCtx({
      env: { OPENAI_API_KEY: 'sk-test' },
      body: { message: 'hello' },
      method: 'POST',
    });
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.ok(text.includes('Connection refused'));
  });

  test('onRequestOptions returns CORS preflight headers', async () => {
    const res = await onRequestOptions();
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.ok(res.headers.get('Access-Control-Allow-Methods').includes('POST'));
    assert.ok(res.headers.get('Access-Control-Allow-Headers').includes('Content-Type'));
  });
});

// ─── /api/nodecloud/stats ───────────────────────────────────────────────────

describe('/api/nodecloud/stats', () => {
  let onRequestGet;
  let originalFetch;

  beforeEach(async () => {
    ({ onRequestGet } = await import('../cf-deploy/functions/api/nodecloud/stats.js'));
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns mock data when NODECLOUD_STATS_KEY is not configured', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await onRequestGet(ctx);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, 'nodecloud_mock');
  });

  test('mock response contains expected fields', async () => {
    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.ok(body.uptime);
    assert.equal(typeof body.requests, 'number');
    assert.ok(body.cost);
    assert.equal(body.chainId, 13390);
    assert.equal(body.network, 'MeeChain Ritual Chain');
    assert.ok(body.lastUpdated); // ISO timestamp
    assert.equal(body.keyHint, 'not-configured');
  });

  test('mock response includes badges object', async () => {
    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.ok(body.badges);
    assert.ok(body.badges.health);
    assert.ok(body.badges.network);
    assert.ok(body.badges.stats);
  });

  test('uses default RPC endpoint in mock when DRPC_RPC_URL is not set', async () => {
    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.rpcEndpoint, 'http://rpc.meechain.run.place');
  });

  test('uses DRPC_RPC_URL from env in mock fallback', async () => {
    const ctx = makeCtx({ env: { DRPC_RPC_URL: 'https://custom-rpc.example.com' } });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.rpcEndpoint, 'https://custom-rpc.example.com');
  });

  test('shows partial key hint when stats key is configured', async () => {
    // API call will fail (no mock), falls back to mock data with key hint
    global.fetch = async () => new Response('Error', { status: 500 });

    const ctx = makeCtx({ env: { NODECLOUD_STATS_KEY: 'abcdefgh1234' } });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.source, 'nodecloud_mock');
    assert.equal(body.keyHint, 'abcdefgh...');
  });

  test('returns live data when nodecloud API responds ok', async () => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({ nodes: 42, status: 'healthy' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const ctx = makeCtx({ env: { NODECLOUD_STATS_KEY: 'live-key-123' } });
    const res = await onRequestGet(ctx);
    const body = await res.json();
    assert.equal(body.source, 'nodecloud_live');
    assert.equal(body.nodes, 42);
    assert.equal(body.status, 'healthy');
  });

  test('falls back to mock when nodecloud API returns non-ok status', async () => {
    global.fetch = async () => new Response('Not Found', { status: 404 });

    const ctx = makeCtx({ env: { NODECLOUD_STATS_KEY: 'some-key' } });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.source, 'nodecloud_mock');
  });

  test('falls back to mock when nodecloud API throws exception', async () => {
    global.fetch = async () => { throw new Error('DNS failure'); };

    const ctx = makeCtx({ env: { NODECLOUD_STATS_KEY: 'some-key' } });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.source, 'nodecloud_mock');
  });

  test('sets CORS headers', async () => {
    const ctx = makeCtx({ env: {} });
    const res = await onRequestGet(ctx);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Content-Type'), 'application/json');
  });
});

// ─── /api/web3/status ───────────────────────────────────────────────────────

describe('/api/web3/status', () => {
  let onRequestGet;
  let originalFetch;

  beforeEach(async () => {
    ({ onRequestGet } = await import('../cf-deploy/functions/api/web3/status.js'));
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns connected=true and blockNumber when RPC responds ok', async () => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x1E8480' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const ctx = makeCtx({ env: {} });
    const res = await onRequestGet(ctx);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.connected, true);
    assert.equal(body.blockNumber, 0x1E8480); // 2000000 decimal
  });

  test('returns connected=false and blockNumber=null when fetch throws', async () => {
    global.fetch = async () => { throw new Error('Network error'); };

    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.connected, false);
    assert.equal(body.blockNumber, null);
  });

  test('returns connected=false when RPC response is not ok', async () => {
    global.fetch = async () => new Response('Bad Gateway', { status: 502 });

    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.connected, false);
    assert.equal(body.blockNumber, null);
  });

  test('returns connected=false when result is not a valid hex number', async () => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: 'not-a-hex' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.connected, false);
  });

  test('uses default RPC URL when DRPC_RPC_URL is not set', async () => {
    let capturedUrl = '';
    global.fetch = async (url) => {
      capturedUrl = url;
      return new Response(
        JSON.stringify({ result: '0x1' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const ctx = makeCtx({ env: {} });
    await onRequestGet(ctx);
    assert.equal(capturedUrl, 'http://rpc.meechain.run.place');
  });

  test('uses DRPC_RPC_URL from env', async () => {
    let capturedUrl = '';
    global.fetch = async (url) => {
      capturedUrl = url;
      return new Response(
        JSON.stringify({ result: '0x1' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const ctx = makeCtx({ env: { DRPC_RPC_URL: 'https://custom-rpc.test' } });
    await onRequestGet(ctx);
    assert.equal(capturedUrl, 'https://custom-rpc.test');
  });

  test('returns default chainId 13390', async () => {
    global.fetch = async () => new Response('Error', { status: 500 });

    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.chainId, 13390);
  });

  test('uses custom CHAIN_ID from env', async () => {
    global.fetch = async () => new Response('Error', { status: 500 });

    const ctx = makeCtx({ env: { CHAIN_ID: '1' } });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.chainId, 1);
  });

  test('returns default contract addresses', async () => {
    global.fetch = async () => new Response('Error', { status: 500 });

    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
    assert.equal(body.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
    assert.equal(body.contracts.portal, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  test('returns contract addresses from env', async () => {
    global.fetch = async () => new Response('Error', { status: 500 });

    const ctx = makeCtx({
      env: {
        VITE_TOKEN_CONTRACT_ADDRESS: '0xTOK',
        VITE_NFT_CONTRACT_ADDRESS: '0xNFT',
        VITE_STAKING_CONTRACT_ADDRESS: '0xSTK',
      },
    });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.contracts.token, '0xTOK');
    assert.equal(body.contracts.nft, '0xNFT');
    assert.equal(body.contracts.portal, '0xSTK');
  });

  test('returns rpc URL in response body', async () => {
    global.fetch = async () => new Response('Error', { status: 500 });

    const ctx = makeCtx({ env: { DRPC_RPC_URL: 'https://my-rpc.example.com' } });
    const body = await (await onRequestGet(ctx)).json();
    assert.equal(body.rpc, 'https://my-rpc.example.com');
  });

  test('sets correct response headers', async () => {
    global.fetch = async () => new Response('Error', { status: 500 });

    const ctx = makeCtx({ env: {} });
    const res = await onRequestGet(ctx);
    assert.equal(res.headers.get('Content-Type'), 'application/json');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Cache-Control'), 'no-cache');
  });

  test('sends POST request with eth_blockNumber JSON-RPC body', async () => {
    let capturedMethod = '';
    let capturedBody = null;
    global.fetch = async (_url, opts) => {
      capturedMethod = opts.method;
      capturedBody = JSON.parse(opts.body);
      return new Response(JSON.stringify({ result: '0x1' }), { status: 200 });
    };

    const ctx = makeCtx({ env: {} });
    await onRequestGet(ctx);
    assert.equal(capturedMethod, 'POST');
    assert.equal(capturedBody.method, 'eth_blockNumber');
    assert.equal(capturedBody.jsonrpc, '2.0');
  });

  test('handles result of 0x0 (block zero) as connected', async () => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({ result: '0x0' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const ctx = makeCtx({ env: {} });
    const body = await (await onRequestGet(ctx)).json();
    // parseInt('0x0', 16) = 0, !isNaN(0) = true
    assert.equal(body.connected, true);
    assert.equal(body.blockNumber, 0);
  });
});
