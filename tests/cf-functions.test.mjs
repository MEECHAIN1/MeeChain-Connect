/**
 * Unit tests for Cloudflare Pages Functions in cf-deploy/functions/api/
 *
 * Tests: health, network, chat, chat/stream, nodecloud/stats, web3/status
 *
 * Uses Node.js built-in test runner (node:test) + node:assert/strict.
 * Handlers are called directly with a mock context object { request, env }.
 * global.fetch is monkey-patched per-test and restored after.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet as healthHandler } from '../cf-deploy/functions/api/health.js';
import { onRequestGet as networkHandler } from '../cf-deploy/functions/api/network.js';
import {
  onRequestPost as chatPost,
  onRequestOptions as chatOptions,
} from '../cf-deploy/functions/api/chat.js';
import {
  onRequestPost as streamPost,
  onRequestOptions as streamOptions,
} from '../cf-deploy/functions/api/chat/stream.js';
import { onRequestGet as nodecloudHandler } from '../cf-deploy/functions/api/nodecloud/stats.js';
import { onRequestGet as web3StatusHandler } from '../cf-deploy/functions/api/web3/status.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal mock POST request with JSON body. */
function makeJsonRequest(body) {
  return {
    json: async () => body,
  };
}

/** Build a context object with optional env overrides. */
function makeCtx(request = {}, envOverrides = {}) {
  return { request, env: envOverrides };
}

/** Monkey-patch global.fetch; returns a restore function. */
function mockFetch(impl) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return () => {
    globalThis.fetch = original;
  };
}

/**
 * Read all bytes from a ReadableStream<Uint8Array> and decode as UTF-8.
 */
async function readStream(readable) {
  const reader = readable.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    total.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(total);
}

/**
 * Parse SSE text into an array of parsed JSON data objects.
 * Skips non-data lines and [DONE] sentinel.
 */
function parseSseText(text) {
  return text
    .split('\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => l.slice(6).trim())
    .filter((raw) => raw && raw !== '[DONE]')
    .map((raw) => JSON.parse(raw));
}

// ─── /api/health ─────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  test('returns status ok with default values when env is empty', async () => {
    const ctx = makeCtx({}, {});
    const res = await healthHandler(ctx);

    assert.equal(res.status, 200);

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

  test('returns default contract addresses when env vars are not set', async () => {
    const ctx = makeCtx({}, {});
    const res = await healthHandler(ctx);
    const data = await res.json();

    assert.equal(data.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
    assert.equal(data.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
    assert.equal(data.contracts.staking, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  test('uses env.DRPC_RPC_URL when provided', async () => {
    const ctx = makeCtx({}, { DRPC_RPC_URL: 'https://custom-rpc.example.com' });
    const res = await healthHandler(ctx);
    const data = await res.json();

    assert.equal(data.rpc, 'https://custom-rpc.example.com');
  });

  test('uses env contract addresses when provided', async () => {
    const ctx = makeCtx({}, {
      VITE_TOKEN_CONTRACT_ADDRESS: '0xAAAA',
      VITE_NFT_CONTRACT_ADDRESS: '0xBBBB',
      VITE_STAKING_CONTRACT_ADDRESS: '0xCCCC',
    });
    const res = await healthHandler(ctx);
    const data = await res.json();

    assert.equal(data.contracts.token, '0xAAAA');
    assert.equal(data.contracts.nft, '0xBBBB');
    assert.equal(data.contracts.staking, '0xCCCC');
  });

  test('response headers include CORS and no-cache', async () => {
    const ctx = makeCtx({}, {});
    const res = await healthHandler(ctx);

    assert.equal(res.headers.get('Content-Type'), 'application/json');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Cache-Control'), 'no-cache');
  });
});

// ─── /api/network ────────────────────────────────────────────────────────────

describe('GET /api/network', () => {
  test('returns correct chainId hex with default chain 13390', async () => {
    const ctx = makeCtx({}, {});
    const res = await networkHandler(ctx);
    const data = await res.json();

    // 13390 decimal = 0x344e
    assert.equal(data.chainId, '0x344e');
    assert.equal(data.chainName, 'MeeChain Ritual Chain');
  });

  test('converts custom CHAIN_ID env var to hex', async () => {
    const ctx = makeCtx({}, { CHAIN_ID: '1' });
    const res = await networkHandler(ctx);
    const data = await res.json();

    assert.equal(data.chainId, '0x1');
  });

  test('includes default rpcUrls when env is empty', async () => {
    const ctx = makeCtx({}, {});
    const res = await networkHandler(ctx);
    const data = await res.json();

    assert.ok(Array.isArray(data.rpcUrls));
    assert.equal(data.rpcUrls.length, 2);
    assert.equal(data.rpcUrls[0], 'http://rpc.meechain.run.place');
    assert.equal(data.rpcUrls[1], 'https://ritual-chain--pouaun2499.replit.app');
  });

  test('uses env RPC URLs when provided', async () => {
    const ctx = makeCtx({}, {
      DRPC_RPC_URL: 'https://drpc.example.com',
      VITE_RPC_URL: 'https://vite-rpc.example.com',
    });
    const res = await networkHandler(ctx);
    const data = await res.json();

    assert.equal(data.rpcUrls[0], 'https://drpc.example.com');
    assert.equal(data.rpcUrls[1], 'https://vite-rpc.example.com');
  });

  test('returns correct nativeCurrency', async () => {
    const ctx = makeCtx({}, {});
    const res = await networkHandler(ctx);
    const data = await res.json();

    assert.deepEqual(data.nativeCurrency, { name: 'MEE Token', symbol: 'MEE', decimals: 18 });
  });

  test('includes block explorer URL', async () => {
    const ctx = makeCtx({}, {});
    const res = await networkHandler(ctx);
    const data = await res.json();

    assert.ok(Array.isArray(data.blockExplorerUrls));
    assert.equal(data.blockExplorerUrls[0], 'http://explorer.meechain.run.place');
  });

  test('returns default contracts', async () => {
    const ctx = makeCtx({}, {});
    const res = await networkHandler(ctx);
    const data = await res.json();

    assert.equal(data.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
    assert.equal(data.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
    assert.equal(data.contracts.portal, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  });

  test('response headers include CORS and Content-Type', async () => {
    const ctx = makeCtx({}, {});
    const res = await networkHandler(ctx);

    assert.equal(res.headers.get('Content-Type'), 'application/json');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  test('CHAIN_ID=0 results in 0x0', async () => {
    const ctx = makeCtx({}, { CHAIN_ID: '0' });
    const res = await networkHandler(ctx);
    const data = await res.json();

    assert.equal(data.chainId, '0x0');
  });
});

// ─── /api/chat ───────────────────────────────────────────────────────────────

describe('POST /api/chat', () => {
  test('returns 400 when message is empty string', async () => {
    const ctx = makeCtx(makeJsonRequest({ message: '' }), {});
    const res = await chatPost(ctx);

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'Message required');
  });

  test('returns 400 when message is whitespace only', async () => {
    const ctx = makeCtx(makeJsonRequest({ message: '   ' }), {});
    const res = await chatPost(ctx);

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'Message required');
  });

  test('returns 400 when message is missing from body', async () => {
    const ctx = makeCtx(makeJsonRequest({}), {});
    const res = await chatPost(ctx);

    assert.equal(res.status, 400);
  });

  test('returns API key not configured error when no OPENAI_API_KEY', async () => {
    const ctx = makeCtx(makeJsonRequest({ message: 'Hello' }), {});
    const res = await chatPost(ctx);

    const data = await res.json();
    assert.ok(data.reply.includes('API key'));
    assert.equal(data.error, 'API key not configured');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  test('returns OpenAI error message when upstream returns non-ok', async () => {
    const restore = mockFetch(async () => ({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    }));

    try {
      const ctx = makeCtx(makeJsonRequest({ message: 'Hello' }), { OPENAI_API_KEY: 'sk-test' });
      const res = await chatPost(ctx);
      const data = await res.json();

      assert.ok(data.error.includes('429'));
      assert.ok(data.reply.length > 0);
    } finally {
      restore();
    }
  });

  test('returns successful reply from OpenAI response', async () => {
    const restore = mockFetch(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'สวัสดี ฉันคือ MeeBot' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    }));

    try {
      const ctx = makeCtx(makeJsonRequest({ message: 'สวัสดี' }), { OPENAI_API_KEY: 'sk-test' });
      const res = await chatPost(ctx);
      const data = await res.json();

      assert.equal(data.reply, 'สวัสดี ฉันคือ MeeBot');
      assert.deepEqual(data.usage, { prompt_tokens: 10, completion_tokens: 5 });
    } finally {
      restore();
    }
  });

  test('uses fallback reply when choices array is empty', async () => {
    const restore = mockFetch(async () => ({
      ok: true,
      json: async () => ({ choices: [], usage: null }),
    }));

    try {
      const ctx = makeCtx(makeJsonRequest({ message: 'Test' }), { OPENAI_API_KEY: 'sk-test' });
      const res = await chatPost(ctx);
      const data = await res.json();

      assert.equal(data.reply, 'ขออภัย ไม่สามารถตอบได้');
    } finally {
      restore();
    }
  });

  test('returns 500 when request.json() throws', async () => {
    const brokenRequest = {
      json: async () => { throw new Error('Invalid JSON'); },
    };
    const ctx = makeCtx(brokenRequest, {});
    const res = await chatPost(ctx);

    assert.equal(res.status, 500);
    const data = await res.json();
    assert.equal(data.error, 'Invalid JSON');
  });

  test('uses custom OPENAI_BASE_URL from env', async () => {
    let calledUrl = null;
    const restore = mockFetch(async (url) => {
      calledUrl = url;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          usage: {},
        }),
      };
    });

    try {
      const ctx = makeCtx(makeJsonRequest({ message: 'hi' }), {
        OPENAI_API_KEY: 'sk-test',
        OPENAI_BASE_URL: 'https://custom-openai.example.com/v1',
      });
      await chatPost(ctx);
      assert.ok(calledUrl.startsWith('https://custom-openai.example.com/v1'));
    } finally {
      restore();
    }
  });

  test('CORS headers present on success response', async () => {
    const restore = mockFetch(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'reply' } }], usage: {} }),
    }));

    try {
      const ctx = makeCtx(makeJsonRequest({ message: 'hi' }), { OPENAI_API_KEY: 'sk-test' });
      const res = await chatPost(ctx);

      assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
      assert.equal(res.headers.get('Content-Type'), 'application/json');
    } finally {
      restore();
    }
  });
});

describe('OPTIONS /api/chat', () => {
  test('returns correct CORS preflight headers', async () => {
    const res = await chatOptions();

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
    assert.equal(res.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
  });

  test('OPTIONS response body is null/empty', async () => {
    const res = await chatOptions();
    const text = await res.text();
    assert.equal(text, '');
  });
});

// ─── /api/chat/stream ────────────────────────────────────────────────────────

describe('POST /api/chat/stream', () => {
  test('returns 400 with JSON when message is empty', async () => {
    const ctx = makeCtx(makeJsonRequest({ message: '' }), {});
    const res = await streamPost(ctx);

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'Message required');
  });

  test('returns 400 when message is whitespace', async () => {
    const ctx = makeCtx(makeJsonRequest({ message: '  ' }), {});
    const res = await streamPost(ctx);

    assert.equal(res.status, 400);
  });

  test('returns SSE stream with error delta when no API key', async () => {
    const ctx = makeCtx(makeJsonRequest({ message: 'Hello' }), {});
    const res = await streamPost(ctx);

    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');

    const text = await readStream(res.body);
    const events = parseSseText(text);

    // First event: delta with error message
    assert.ok(events.length >= 2);
    assert.ok(typeof events[0].delta === 'string');
    assert.ok(events[0].delta.includes('OPENAI_API_KEY'));
    // Last event: done: true
    assert.equal(events[events.length - 1].done, true);
  });

  test('returns SSE stream with error event when upstream returns non-ok', async () => {
    const restore = mockFetch(async () => ({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    }));

    try {
      const ctx = makeCtx(makeJsonRequest({ message: 'hi' }), { OPENAI_API_KEY: 'sk-test' });
      const res = await streamPost(ctx);

      assert.equal(res.headers.get('Content-Type'), 'text/event-stream');

      const text = await readStream(res.body);
      const events = parseSseText(text);

      assert.ok(events.length >= 1);
      assert.ok(events[0].error.includes('503'));
    } finally {
      restore();
    }
  });

  test('streams delta chunks from OpenAI SSE response', async () => {
    // Simulate OpenAI SSE response body
    const sseChunks = [
      'data: {"choices":[{"delta":{"content":"สวัสดี"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" MeeBot"}}]}\n\n',
      'data: [DONE]\n\n',
    ];

    const encoder = new TextEncoder();
    let chunkIdx = 0;

    const mockBody = new ReadableStream({
      pull(controller) {
        if (chunkIdx < sseChunks.length) {
          controller.enqueue(encoder.encode(sseChunks[chunkIdx++]));
        } else {
          controller.close();
        }
      },
    });

    const restore = mockFetch(async () => ({
      ok: true,
      body: mockBody,
    }));

    try {
      const ctx = makeCtx(makeJsonRequest({ message: 'hi' }), { OPENAI_API_KEY: 'sk-test' });
      const res = await streamPost(ctx);

      assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
      assert.equal(res.headers.get('Cache-Control'), 'no-cache');

      const text = await readStream(res.body);
      const events = parseSseText(text);

      const deltas = events.filter((e) => e.delta).map((e) => e.delta);
      assert.ok(deltas.includes('สวัสดี'));
      assert.ok(deltas.includes(' MeeBot'));

      // Should have a done event
      const doneEvents = events.filter((e) => e.done === true);
      assert.ok(doneEvents.length >= 1);
    } finally {
      restore();
    }
  });

  test('trims trailing slash from OPENAI_BASE_URL', async () => {
    let calledUrl = null;
    const restore = mockFetch(async (url, opts) => {
      calledUrl = url;
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      return { ok: true, body };
    });

    try {
      const ctx = makeCtx(makeJsonRequest({ message: 'hi' }), {
        OPENAI_API_KEY: 'sk-test',
        OPENAI_BASE_URL: 'https://api.example.com/v1/',
      });
      await streamPost(ctx);
      assert.ok(!calledUrl.includes('//chat'), 'should not have double slash');
      assert.ok(calledUrl.startsWith('https://api.example.com/v1/'));
    } finally {
      restore();
    }
  });

  test('returns 500 SSE error when request.json() throws', async () => {
    const brokenRequest = {
      json: async () => { throw new Error('parse error'); },
    };
    const ctx = makeCtx(brokenRequest, {});
    const res = await streamPost(ctx);

    assert.equal(res.status, 500);
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    const text = await res.text();
    const events = parseSseText(text);
    assert.ok(events[0].error.includes('parse error'));
  });
});

describe('OPTIONS /api/chat/stream', () => {
  test('returns correct CORS preflight headers', async () => {
    const res = await streamOptions();

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
    assert.equal(res.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
  });
});

// ─── /api/nodecloud/stats ────────────────────────────────────────────────────

describe('GET /api/nodecloud/stats', () => {
  test('returns mock data when NODECLOUD_STATS_KEY is not set', async () => {
    const ctx = makeCtx({}, {});
    const res = await nodecloudHandler(ctx);
    const data = await res.json();

    assert.equal(data.source, 'nodecloud_mock');
    assert.equal(data.keyHint, 'not-configured');
    assert.ok(data.uptime);
    assert.ok(typeof data.requests === 'number');
    assert.ok(data.lastUpdated);
  });

  test('returns default RPC endpoint in mock data', async () => {
    const ctx = makeCtx({}, {});
    const res = await nodecloudHandler(ctx);
    const data = await res.json();

    assert.equal(data.rpcEndpoint, 'http://rpc.meechain.run.place');
    assert.equal(data.chainId, 13390);
    assert.equal(data.network, 'MeeChain Ritual Chain');
  });

  test('uses env.DRPC_RPC_URL for rpcEndpoint in mock fallback', async () => {
    const ctx = makeCtx({}, { DRPC_RPC_URL: 'https://my-rpc.example.com' });
    const res = await nodecloudHandler(ctx);
    const data = await res.json();

    assert.equal(data.rpcEndpoint, 'https://my-rpc.example.com');
  });

  test('returns live data when NODECLOUD_STATS_KEY is set and API succeeds', async () => {
    const restore = mockFetch(async () => ({
      ok: true,
      json: async () => ({ nodes: 42, uptime: '100%' }),
    }));

    try {
      const ctx = makeCtx({}, { NODECLOUD_STATS_KEY: 'abc123xyz' });
      const res = await nodecloudHandler(ctx);
      const data = await res.json();

      assert.equal(data.source, 'nodecloud_live');
      assert.equal(data.nodes, 42);
      assert.equal(data.uptime, '100%');
    } finally {
      restore();
    }
  });

  test('falls back to mock when NODECLOUD_STATS_KEY is set but API returns non-ok', async () => {
    const restore = mockFetch(async () => ({
      ok: false,
      status: 503,
    }));

    try {
      const ctx = makeCtx({}, { NODECLOUD_STATS_KEY: 'abc123xyz' });
      const res = await nodecloudHandler(ctx);
      const data = await res.json();

      assert.equal(data.source, 'nodecloud_mock');
    } finally {
      restore();
    }
  });

  test('falls back to mock when NODECLOUD_STATS_KEY is set but fetch throws', async () => {
    const restore = mockFetch(async () => {
      throw new Error('Network error');
    });

    try {
      const ctx = makeCtx({}, { NODECLOUD_STATS_KEY: 'secretkey' });
      const res = await nodecloudHandler(ctx);
      const data = await res.json();

      assert.equal(data.source, 'nodecloud_mock');
    } finally {
      restore();
    }
  });

  test('keyHint shows first 8 chars of key when key is configured but API fails', async () => {
    const restore = mockFetch(async () => ({ ok: false, status: 500 }));

    try {
      const ctx = makeCtx({}, { NODECLOUD_STATS_KEY: 'abcdefghijklmnop' });
      const res = await nodecloudHandler(ctx);
      const data = await res.json();

      assert.equal(data.keyHint, 'abcdefgh...');
    } finally {
      restore();
    }
  });

  test('mock data includes expected badges', async () => {
    const ctx = makeCtx({}, {});
    const res = await nodecloudHandler(ctx);
    const data = await res.json();

    assert.equal(data.badges.health, 'Bug Slayer');
    assert.equal(data.badges.network, 'Chain Weaver');
    assert.equal(data.badges.stats, 'Workspace Architect');
  });

  test('response headers include CORS', async () => {
    const ctx = makeCtx({}, {});
    const res = await nodecloudHandler(ctx);

    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Content-Type'), 'application/json');
  });

  test('lastUpdated is a valid ISO date string', async () => {
    const ctx = makeCtx({}, {});
    const res = await nodecloudHandler(ctx);
    const data = await res.json();

    const parsed = new Date(data.lastUpdated);
    assert.ok(!isNaN(parsed.getTime()), 'lastUpdated should be a valid date');
  });
});

// ─── /api/web3/status ────────────────────────────────────────────────────────

describe('GET /api/web3/status', () => {
  test('returns connected:false and blockNumber:null when RPC fetch throws', async () => {
    const restore = mockFetch(async () => {
      throw new Error('ECONNREFUSED');
    });

    try {
      const ctx = makeCtx({}, {});
      const res = await web3StatusHandler(ctx);
      const data = await res.json();

      assert.equal(data.connected, false);
      assert.equal(data.blockNumber, null);
    } finally {
      restore();
    }
  });

  test('returns connected:false when RPC returns non-ok HTTP status', async () => {
    const restore = mockFetch(async () => ({
      ok: false,
      status: 502,
    }));

    try {
      const ctx = makeCtx({}, {});
      const res = await web3StatusHandler(ctx);
      const data = await res.json();

      assert.equal(data.connected, false);
      assert.equal(data.blockNumber, null);
    } finally {
      restore();
    }
  });

  test('returns connected:true with blockNumber when RPC succeeds', async () => {
    // 0x13ae0 = 80608 decimal
    const restore = mockFetch(async () => ({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x13ae0' }),
    }));

    try {
      const ctx = makeCtx({}, {});
      const res = await web3StatusHandler(ctx);
      const data = await res.json();

      assert.equal(data.connected, true);
      assert.equal(data.blockNumber, 80608);
    } finally {
      restore();
    }
  });

  test('returns connected:false when RPC result is not a valid hex', async () => {
    const restore = mockFetch(async () => ({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: 'not-a-hex' }),
    }));

    try {
      const ctx = makeCtx({}, {});
      const res = await web3StatusHandler(ctx);
      const data = await res.json();

      // parseInt('not-a-hex', 16) = NaN → connected = false
      assert.equal(data.connected, false);
    } finally {
      restore();
    }
  });

  test('returns default rpc and chainId when env is empty', async () => {
    const restore = mockFetch(async () => { throw new Error('skip'); });

    try {
      const ctx = makeCtx({}, {});
      const res = await web3StatusHandler(ctx);
      const data = await res.json();

      assert.equal(data.rpc, 'http://rpc.meechain.run.place');
      assert.equal(data.chainId, 13390);
    } finally {
      restore();
    }
  });

  test('uses env.DRPC_RPC_URL and env.CHAIN_ID when provided', async () => {
    const restore = mockFetch(async () => { throw new Error('skip'); });

    try {
      const ctx = makeCtx({}, {
        DRPC_RPC_URL: 'https://my-rpc.example.com',
        CHAIN_ID: '1337',
      });
      const res = await web3StatusHandler(ctx);
      const data = await res.json();

      assert.equal(data.rpc, 'https://my-rpc.example.com');
      assert.equal(data.chainId, 1337);
    } finally {
      restore();
    }
  });

  test('returns default contracts when env vars not set', async () => {
    const restore = mockFetch(async () => { throw new Error('skip'); });

    try {
      const ctx = makeCtx({}, {});
      const res = await web3StatusHandler(ctx);
      const data = await res.json();

      assert.equal(data.contracts.token, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
      assert.equal(data.contracts.nft, '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
      assert.equal(data.contracts.portal, '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
    } finally {
      restore();
    }
  });

  test('uses env contract addresses when provided', async () => {
    const restore = mockFetch(async () => { throw new Error('skip'); });

    try {
      const ctx = makeCtx({}, {
        VITE_TOKEN_CONTRACT_ADDRESS: '0xTOKEN',
        VITE_NFT_CONTRACT_ADDRESS: '0xNFT',
        VITE_STAKING_CONTRACT_ADDRESS: '0xPORTAL',
      });
      const res = await web3StatusHandler(ctx);
      const data = await res.json();

      assert.equal(data.contracts.token, '0xTOKEN');
      assert.equal(data.contracts.nft, '0xNFT');
      assert.equal(data.contracts.portal, '0xPORTAL');
    } finally {
      restore();
    }
  });

  test('response headers include CORS and no-cache', async () => {
    const restore = mockFetch(async () => { throw new Error('skip'); });

    try {
      const ctx = makeCtx({}, {});
      const res = await web3StatusHandler(ctx);

      assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
      assert.equal(res.headers.get('Cache-Control'), 'no-cache');
      assert.equal(res.headers.get('Content-Type'), 'application/json');
    } finally {
      restore();
    }
  });

  test('sends eth_blockNumber JSON-RPC call to rpcUrl', async () => {
    let capturedBody = null;
    const restore = mockFetch(async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({ result: '0x1' }),
      };
    });

    try {
      const ctx = makeCtx({}, {});
      await web3StatusHandler(ctx);

      assert.equal(capturedBody.method, 'eth_blockNumber');
      assert.equal(capturedBody.jsonrpc, '2.0');
    } finally {
      restore();
    }
  });
});
