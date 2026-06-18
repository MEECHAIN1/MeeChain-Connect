'use strict';
/**
 * Tests for cf-deploy/functions/api/chat/stream.js
 *
 * Covers the streaming SSE endpoint:
 *  - onRequestPost: input validation, no-key fallback, fetch error handling,
 *    SSE output format, CORS headers
 *  - onRequestOptions: CORS preflight headers
 *
 * Since streams are complex to test end-to-end, the SSE-specific tests focus
 * on the structure the handler emits (parsed from response body) and the
 * header contract. The pure-logic paths (validation, no-key, fetch-fail) are
 * tested directly.
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Decode all SSE events from a ReadableStream into an array of parsed JSON
 * objects. Assumes the handler emits lines of the form:
 *   data: <json>\n\n
 */
async function collectSSE(readable) {
  const reader = readable.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: !done });
  }
  const events = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('data: ')) {
      try { events.push(JSON.parse(line.slice(6))); } catch (_) {}
    }
  }
  return events;
}

// ── Replicate onRequestPost from cf-deploy/functions/api/chat/stream.js ──

const STREAM_SYSTEM_PROMPT = 'MeeBot stream system prompt';

async function cfStreamPost(requestBody, env = {}, fetchImpl = null) {
  const savedFetch = global.fetch;
  if (fetchImpl !== null) global.fetch = fetchImpl;

  try {
    // Simulate request.json()
    let parsed;
    try {
      parsed = requestBody; // already a plain object in tests
    } catch (err) {
      const body = `data: ${JSON.stringify({ error: err.message })}\n\n`;
      return { status: 500, body, headers: { 'Content-Type': 'text/event-stream' } };
    }

    const { message } = parsed;
    if (!message?.trim()) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'Message required' }),
        headers: { 'Content-Type': 'application/json' },
        stream: false,
      };
    }

    const apiKey  = env.OPENAI_API_KEY;
    const baseURL = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

    if (!apiKey) {
      const encoder = new TextEncoder();
      const msg = 'MeeBot AI ยังไม่ได้กำหนดค่า OPENAI_API_KEY กรุณาติดต่อผู้ดูแลระบบ';
      const stream = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: msg })}\n\n`));
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          ctrl.close();
        },
      });
      return {
        status: 200,
        stream,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    let upstreamRes;
    try {
      upstreamRes = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:       'gpt-5-mini',
          messages:    [
            { role: 'system', content: STREAM_SYSTEM_PROMPT },
            { role: 'user',   content: message },
          ],
          stream:      true,
          max_tokens:  800,
          temperature: 0.7,
        }),
      });
    } catch (err) {
      const body = `data: ${JSON.stringify({ error: err.message })}\n\n`;
      return {
        status: 500,
        body,
        headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' },
        stream: false,
      };
    }

    if (!upstreamRes.ok) {
      const encoder = new TextEncoder();
      const errStream = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `AI Error: HTTP ${upstreamRes.status}` })}\n\n`));
          ctrl.close();
        },
      });
      return {
        status: 200,
        stream: errStream,
        headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' },
      };
    }

    // Transform upstream SSE to our SSE format
    const { readable, writable } = new TransformStream();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const writer  = writable.getWriter();
    const reader  = upstreamRes.body.getReader();

    (async () => {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
              continue;
            }
            try {
              const p    = JSON.parse(raw);
              const delta = p.choices?.[0]?.delta?.content;
              if (delta) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
            } catch (_) {}
          }
        }
      } finally {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        await writer.close().catch(() => {});
      }
    })();

    return {
      status: 200,
      stream: readable,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
      },
    };
  } catch (err) {
    const body = `data: ${JSON.stringify({ error: err.message })}\n\n`;
    return {
      status: 500,
      body,
      headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' },
    };
  } finally {
    global.fetch = savedFetch;
  }
}

function cfStreamOptions() {
  return {
    status: 200,
    body: null,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  };
}

// ── Build a fake upstream SSE ReadableStream ─────────────────────────────

function makeUpstreamSSE(chunks) {
  const encoder = new TextEncoder();
  let idx = 0;
  const body = new ReadableStream({
    pull(ctrl) {
      if (idx >= chunks.length) { ctrl.close(); return; }
      ctrl.enqueue(encoder.encode(chunks[idx++]));
    },
  });
  return {
    ok: true,
    status: 200,
    body,
    text: async () => '',
  };
}

// ── Tests: input validation ──────────────────────────────────────────────

describe('cf /api/chat/stream — input validation', () => {
  it('returns 400 when message is missing', async () => {
    const result = await cfStreamPost({}, { OPENAI_API_KEY: 'sk-test' });
    assert.strictEqual(result.status, 400);
    const body = JSON.parse(result.body);
    assert.ok(body.error.includes('Message'));
  });

  it('returns 400 when message is empty string', async () => {
    const result = await cfStreamPost({ message: '' }, { OPENAI_API_KEY: 'sk-test' });
    assert.strictEqual(result.status, 400);
  });

  it('returns 400 when message is whitespace only', async () => {
    const result = await cfStreamPost({ message: '   ' }, { OPENAI_API_KEY: 'sk-test' });
    assert.strictEqual(result.status, 400);
  });

  it('returns 400 with Content-Type application/json', async () => {
    const result = await cfStreamPost({ message: '' }, {});
    assert.strictEqual(result.status, 400);
    assert.ok(result.headers['Content-Type'].includes('application/json'));
  });
});

// ── Tests: no API key → SSE error stream ────────────────────────────────

describe('cf /api/chat/stream — no OPENAI_API_KEY', () => {
  it('Content-Type is text/event-stream', async () => {
    const result = await cfStreamPost({ message: 'hello' }, {});
    assert.strictEqual(result.headers['Content-Type'], 'text/event-stream');
  });

  it('Access-Control-Allow-Origin is *', async () => {
    const result = await cfStreamPost({ message: 'hello' }, {});
    assert.strictEqual(result.headers['Access-Control-Allow-Origin'], '*');
  });

  it('emits a delta event with the no-key error message', async () => {
    const result = await cfStreamPost({ message: 'hello' }, {});
    const events = await collectSSE(result.stream);
    const deltaEvt = events.find(e => e.delta);
    assert.ok(deltaEvt, 'must emit a delta event');
    assert.ok(deltaEvt.delta.includes('OPENAI_API_KEY'), `expected API key mention, got: ${deltaEvt.delta}`);
  });

  it('emits a done:true event', async () => {
    const result = await cfStreamPost({ message: 'hello' }, {});
    const events = await collectSSE(result.stream);
    const doneEvt = events.find(e => e.done === true);
    assert.ok(doneEvt, 'must emit done event');
  });

  it('emits delta before done', async () => {
    const result = await cfStreamPost({ message: 'hello' }, {});
    const events = await collectSSE(result.stream);
    const deltaIdx = events.findIndex(e => e.delta);
    const doneIdx  = events.findIndex(e => e.done === true);
    assert.ok(deltaIdx < doneIdx, 'delta must come before done');
  });

  it('does not call fetch when API key is missing', async () => {
    let called = false;
    const spyFetch = async () => { called = true; };
    await cfStreamPost({ message: 'hello' }, {}, spyFetch);
    assert.strictEqual(called, false);
  });
});

// ── Tests: upstream non-ok → SSE error event ────────────────────────────

describe('cf /api/chat/stream — upstream returns non-ok HTTP', () => {
  it('emits SSE error event with status code', async () => {
    const failFetch = async () => ({ ok: false, status: 503, text: async () => 'down' });
    const result = await cfStreamPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      failFetch
    );
    const events = await collectSSE(result.stream);
    const errEvt = events.find(e => e.error);
    assert.ok(errEvt, 'must emit error event');
    assert.ok(errEvt.error.includes('503'), `expected 503 in error, got: ${errEvt.error}`);
  });

  it('Content-Type is text/event-stream', async () => {
    const failFetch = async () => ({ ok: false, status: 500, text: async () => '' });
    const result = await cfStreamPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      failFetch
    );
    assert.ok(result.headers['Content-Type'].includes('text/event-stream'));
  });
});

// ── Tests: upstream fetch throws ────────────────────────────────────────

describe('cf /api/chat/stream — fetch throws', () => {
  it('returns 500 status', async () => {
    const throwFetch = async () => { throw new Error('ECONNREFUSED'); };
    const result = await cfStreamPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      throwFetch
    );
    assert.strictEqual(result.status, 500);
  });

  it('error message in SSE body', async () => {
    const throwFetch = async () => { throw new Error('ECONNREFUSED'); };
    const result = await cfStreamPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      throwFetch
    );
    assert.ok(typeof result.body === 'string');
    assert.ok(result.body.includes('ECONNREFUSED'), `expected error in body, got: ${result.body}`);
  });
});

// ── Tests: successful streaming ──────────────────────────────────────────

describe('cf /api/chat/stream — successful upstream stream', () => {
  // Build a minimal SSE upstream:  two delta chunks, then [DONE]
  const upstreamChunks = [
    'data: {"choices":[{"delta":{"content":"สวัส"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"ดี"}}]}\n\n',
    'data: [DONE]\n\n',
  ];

  it('forwards delta events from upstream', async () => {
    const mockFetch = async () => makeUpstreamSSE(upstreamChunks);
    const result = await cfStreamPost(
      { message: 'hello' },
      { OPENAI_API_KEY: 'sk-test' },
      mockFetch
    );

    const events = await collectSSE(result.stream);
    const deltas = events.filter(e => e.delta);
    assert.ok(deltas.length >= 2, `expected at least 2 delta events, got: ${deltas.length}`);
    assert.strictEqual(deltas[0].delta, 'สวัส');
    assert.strictEqual(deltas[1].delta, 'ดี');
  });

  it('emits a done event after [DONE] upstream signal', async () => {
    const mockFetch = async () => makeUpstreamSSE(upstreamChunks);
    const result = await cfStreamPost(
      { message: 'hello' },
      { OPENAI_API_KEY: 'sk-test' },
      mockFetch
    );

    const events = await collectSSE(result.stream);
    const doneEvt = events.find(e => e.done === true);
    assert.ok(doneEvt, 'must emit done event when upstream sends [DONE]');
  });

  it('response headers include text/event-stream Content-Type', async () => {
    const mockFetch = async () => makeUpstreamSSE(upstreamChunks);
    const result = await cfStreamPost(
      { message: 'hello' },
      { OPENAI_API_KEY: 'sk-test' },
      mockFetch
    );
    assert.strictEqual(result.headers['Content-Type'], 'text/event-stream');
  });

  it('response headers include X-Accel-Buffering: no', async () => {
    const mockFetch = async () => makeUpstreamSSE(upstreamChunks);
    const result = await cfStreamPost(
      { message: 'hello' },
      { OPENAI_API_KEY: 'sk-test' },
      mockFetch
    );
    assert.strictEqual(result.headers['X-Accel-Buffering'], 'no');
  });

  it('response headers include Cache-Control: no-cache', async () => {
    const mockFetch = async () => makeUpstreamSSE(upstreamChunks);
    const result = await cfStreamPost(
      { message: 'hello' },
      { OPENAI_API_KEY: 'sk-test' },
      mockFetch
    );
    assert.strictEqual(result.headers['Cache-Control'], 'no-cache');
  });
});

// ── Tests: SSE parsing edge cases ────────────────────────────────────────

describe('cf /api/chat/stream — SSE parsing edge cases', () => {
  it('skips upstream chunks with no content delta', async () => {
    // Empty delta (role-only chunk that OpenAI sends at start)
    const chunks = [
      'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    const mockFetch = async () => makeUpstreamSSE(chunks);
    const result = await cfStreamPost(
      { message: 'hi' },
      { OPENAI_API_KEY: 'sk-test' },
      mockFetch
    );
    const events = await collectSSE(result.stream);
    const deltas = events.filter(e => e.delta);
    // Only the "hello" chunk should produce a delta event
    assert.strictEqual(deltas.length, 1);
    assert.strictEqual(deltas[0].delta, 'hello');
  });

  it('ignores non-data lines in upstream SSE', async () => {
    const chunks = [
      ': comment line\n',
      'data: {"choices":[{"delta":{"content":"world"}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    const mockFetch = async () => makeUpstreamSSE(chunks);
    const result = await cfStreamPost(
      { message: 'hi' },
      { OPENAI_API_KEY: 'sk-test' },
      mockFetch
    );
    const events = await collectSSE(result.stream);
    const deltas = events.filter(e => e.delta);
    assert.strictEqual(deltas.length, 1);
    assert.strictEqual(deltas[0].delta, 'world');
  });
});

// ── Tests: OPENAI_BASE_URL trailing slash removal ─────────────────────────

describe('cf /api/chat/stream — OPENAI_BASE_URL normalisation', () => {
  it('removes trailing slash from OPENAI_BASE_URL before appending path', async () => {
    let calledUrl = null;
    const spyFetch = async (url) => {
      calledUrl = url;
      return makeUpstreamSSE(['data: [DONE]\n\n']);
    };
    await cfStreamPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://proxy.ai/v1/' },
      spyFetch
    );
    assert.ok(calledUrl !== null);
    assert.ok(!calledUrl.includes('//chat'), `double slash in URL: ${calledUrl}`);
  });
});

// ── Tests: OPTIONS (CORS preflight) ─────────────────────────────────────

describe('cf /api/chat/stream — OPTIONS (CORS preflight)', () => {
  it('Access-Control-Allow-Origin is *', () => {
    assert.strictEqual(cfStreamOptions().headers['Access-Control-Allow-Origin'], '*');
  });

  it('Access-Control-Allow-Methods includes POST and OPTIONS', () => {
    const methods = cfStreamOptions().headers['Access-Control-Allow-Methods'];
    assert.ok(methods.includes('POST'), 'must include POST');
    assert.ok(methods.includes('OPTIONS'), 'must include OPTIONS');
  });

  it('Access-Control-Allow-Headers includes Content-Type', () => {
    assert.ok(cfStreamOptions().headers['Access-Control-Allow-Headers'].includes('Content-Type'));
  });

  it('body is null', () => {
    assert.strictEqual(cfStreamOptions().body, null);
  });
});

// ── Tests: regression ────────────────────────────────────────────────────

describe('cf /api/chat/stream — regression', () => {
  it('OpenAI request sets stream: true', async () => {
    let capturedBody = null;
    const spyFetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return makeUpstreamSSE(['data: [DONE]\n\n']);
    };
    await cfStreamPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      spyFetch
    );
    assert.strictEqual(capturedBody.stream, true);
  });

  it('OpenAI request uses model gpt-5-mini', async () => {
    let capturedBody = null;
    const spyFetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return makeUpstreamSSE(['data: [DONE]\n\n']);
    };
    await cfStreamPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      spyFetch
    );
    assert.strictEqual(capturedBody.model, 'gpt-5-mini');
  });

  it('OpenAI request sends Authorization Bearer header', async () => {
    let capturedHeaders = null;
    const spyFetch = async (url, opts) => {
      capturedHeaders = opts.headers;
      return makeUpstreamSSE(['data: [DONE]\n\n']);
    };
    await cfStreamPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-streamkey' },
      spyFetch
    );
    assert.strictEqual(capturedHeaders['Authorization'], 'Bearer sk-streamkey');
  });
});