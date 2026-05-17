'use strict';
/**
 * Tests for cf-deploy/functions/api/chat/stream.js
 *
 * Tests the Cloudflare Pages Function for streaming MeeBot AI responses
 * via Server-Sent Events (SSE). Logic is replicated from the source file.
 *
 * Functions under test:
 *   onRequestPost(ctx) — streams AI response as SSE events
 *   onRequestOptions() — returns CORS preflight headers
 *
 * Key behaviours:
 *   - Empty/missing message → 400 JSON (not SSE)
 *   - No OPENAI_API_KEY → SSE stream with delta error message + done:true
 *   - OpenAI upstream error → SSE stream with error field
 *   - OpenAI succeeds → SSE stream with delta chunks + done:true
 *   - OPENAI_BASE_URL trailing slash is stripped
 *   - OPTIONS → CORS headers
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/chat/stream.js ───

const SYSTEM_PROMPT = `MeeBot system prompt (test stub)`;

async function onRequestPost(ctx) {
  const { request, env } = ctx;

  try {
    const { message } = await request.json();
    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey  = env.OPENAI_API_KEY;
    const baseURL = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

    if (!apiKey) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const msg = 'MeeBot AI ยังไม่ได้กำหนดค่า OPENAI_API_KEY กรุณาติดต่อผู้ดูแลระบบ';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: msg })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const upstreamRes = await globalThis.fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'gpt-5-mini',
        messages:    [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: message },
        ],
        stream:      true,
        max_tokens:  800,
        temperature: 0.7,
      }),
    });

    if (!upstreamRes.ok) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `AI Error: HTTP ${upstreamRes.status}` })}\n\n`));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { readable, writable } = new TransformStream();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const writer = writable.getWriter();
    const reader = upstreamRes.body.getReader();

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
              const parsed = JSON.parse(raw);
              const delta  = parsed.choices?.[0]?.delta?.content;
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

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    return new Response(
      `data: ${JSON.stringify({ error: err.message })}\n\n`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}

async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function mkCtx(env = {}, bodyJson = {}) {
  return {
    env,
    request: { json: async () => bodyJson },
  };
}

/**
 * Reads all text from a Response body (SSE stream) and returns it as a string.
 */
async function readResponseText(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

/**
 * Parses SSE text into an array of data objects.
 * Each line of form `data: {...}` is parsed to its JSON value.
 */
function parseSseEvents(text) {
  return text
    .split('\n')
    .filter(line => line.startsWith('data: '))
    .map(line => JSON.parse(line.slice(6).trim()));
}

/**
 * Creates a ReadableStream that emits the given SSE lines.
 */
function makeSseStream(lines) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'));
      }
      controller.close();
    },
  });
}

// ── fetch mock management ─────────────────────────────────────────────────

let _originalFetch;
beforeEach(() => {
  _originalFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = _originalFetch;
});

// ── Tests: input validation ────────────────────────────────────────────────

describe('/api/chat/stream (CF) — input validation', () => {
  it('returns 400 when message is missing', async () => {
    const res = await onRequestPost(mkCtx({}, {}));
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('Message'));
  });

  it('returns 400 when message is empty string', async () => {
    const res = await onRequestPost(mkCtx({}, { message: '' }));
    assert.strictEqual(res.status, 400);
  });

  it('returns 400 when message is whitespace only', async () => {
    const res = await onRequestPost(mkCtx({}, { message: '   ' }));
    assert.strictEqual(res.status, 400);
  });

  it('400 response is JSON, not SSE', async () => {
    const res = await onRequestPost(mkCtx({}, { message: '' }));
    assert.ok((res.headers.get('Content-Type') || '').includes('application/json'));
  });
});

// ── Tests: missing API key ─────────────────────────────────────────────────

describe('/api/chat/stream (CF) — missing API key', () => {
  it('returns 200 status (not 400/500)', async () => {
    const res = await onRequestPost(mkCtx({}, { message: 'สวัสดี' }));
    assert.strictEqual(res.status, 200);
  });

  it('Content-Type is text/event-stream', async () => {
    const res = await onRequestPost(mkCtx({}, { message: 'สวัสดี' }));
    assert.ok((res.headers.get('Content-Type') || '').includes('text/event-stream'));
  });

  it('Access-Control-Allow-Origin is *', async () => {
    const res = await onRequestPost(mkCtx({}, { message: 'สวัสดี' }));
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('stream contains a delta event with error message', async () => {
    const res = await onRequestPost(mkCtx({}, { message: 'สวัสดี' }));
    const text = await readResponseText(res);
    const events = parseSseEvents(text);
    const deltaEvent = events.find(e => e.delta);
    assert.ok(deltaEvent, 'must emit at least one delta event');
    assert.ok(deltaEvent.delta.includes('OPENAI_API_KEY'), 'delta must mention OPENAI_API_KEY');
  });

  it('stream ends with done:true event', async () => {
    const res = await onRequestPost(mkCtx({}, { message: 'สวัสดี' }));
    const text = await readResponseText(res);
    const events = parseSseEvents(text);
    const lastEvent = events[events.length - 1];
    assert.strictEqual(lastEvent.done, true);
  });

  it('stream contains exactly 2 events (delta + done)', async () => {
    const res = await onRequestPost(mkCtx({}, { message: 'สวัสดี' }));
    const text = await readResponseText(res);
    const events = parseSseEvents(text);
    assert.strictEqual(events.length, 2);
  });
});

// ── Tests: upstream error ──────────────────────────────────────────────────

describe('/api/chat/stream (CF) — upstream HTTP error', () => {
  it('returns SSE stream when upstream returns 500', async () => {
    globalThis.fetch = async () => new Response('Server Error', { status: 500 });

    const res = await onRequestPost(mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'สวัสดี' }));
    assert.ok((res.headers.get('Content-Type') || '').includes('text/event-stream'));
  });

  it('SSE stream contains error event with HTTP status', async () => {
    globalThis.fetch = async () => new Response('Too Many Requests', { status: 429 });

    const res = await onRequestPost(mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'สวัสดี' }));
    const text = await readResponseText(res);
    const events = parseSseEvents(text);
    const errorEvent = events.find(e => e.error);
    assert.ok(errorEvent, 'must have error event');
    assert.ok(errorEvent.error.includes('429'), `error must include status code, got: ${errorEvent.error}`);
  });

  it('returns 500 SSE stream on network exception', async () => {
    globalThis.fetch = async () => { throw new Error('Connection refused'); };

    const res = await onRequestPost(mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'สวัสดี' }));
    assert.strictEqual(res.status, 500);
    const text = await res.text();
    assert.ok(text.includes('Connection refused'));
  });
});

// ── Tests: successful streaming ────────────────────────────────────────────

describe('/api/chat/stream (CF) — successful streaming', () => {
  it('returns SSE stream with correct Content-Type', async () => {
    const sseLines = [
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'สวัส' } }] }),
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'ดีครับ' } }] }),
      'data: [DONE]',
    ];

    globalThis.fetch = async () => new Response(makeSseStream(sseLines), { status: 200 });

    const res = await onRequestPost(mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'hi' }));
    assert.ok((res.headers.get('Content-Type') || '').includes('text/event-stream'));
  });

  it('stream emits done:true event at end', async () => {
    const sseLines = [
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] }),
      'data: [DONE]',
    ];

    globalThis.fetch = async () => new Response(makeSseStream(sseLines), { status: 200 });

    const res = await onRequestPost(mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'hi' }));
    const text = await readResponseText(res);
    const events = parseSseEvents(text);
    assert.ok(events.some(e => e.done === true), 'must have done:true event');
  });

  it('stream emits delta events with content', async () => {
    const sseLines = [
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'ทดสอบ' } }] }),
      'data: [DONE]',
    ];

    globalThis.fetch = async () => new Response(makeSseStream(sseLines), { status: 200 });

    const res = await onRequestPost(mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'hi' }));
    const text = await readResponseText(res);
    const events = parseSseEvents(text);
    const deltaEvents = events.filter(e => e.delta);
    assert.ok(deltaEvents.length > 0, 'must have at least one delta event');
    assert.strictEqual(deltaEvents[0].delta, 'ทดสอบ');
  });

  it('skips SSE lines without delta content', async () => {
    // Empty delta (e.g., role announcement) should not emit an event
    const sseLines = [
      'data: ' + JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] }),
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'ตอบ' } }] }),
      'data: [DONE]',
    ];

    globalThis.fetch = async () => new Response(makeSseStream(sseLines), { status: 200 });

    const res = await onRequestPost(mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'test' }));
    const text = await readResponseText(res);
    const events = parseSseEvents(text);
    const deltaEvents = events.filter(e => e.delta);
    // Only the content delta (not the role delta) should be emitted
    assert.strictEqual(deltaEvents.length, 1);
    assert.strictEqual(deltaEvents[0].delta, 'ตอบ');
  });

  it('uses OPENAI_BASE_URL env var without trailing slash', async () => {
    let calledUrl = '';
    globalThis.fetch = async (url) => {
      calledUrl = url;
      return new Response(makeSseStream(['data: [DONE]']), { status: 200 });
    };

    const ctx = mkCtx(
      { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://custom.api.example.com/v1/' },
      { message: 'test' }
    );
    await onRequestPost(ctx);
    assert.ok(!calledUrl.includes('//chat'), 'trailing slash must be stripped before path join');
    assert.ok(calledUrl.includes('/chat/completions'));
  });

  it('response headers include X-Accel-Buffering: no', async () => {
    globalThis.fetch = async () => new Response(makeSseStream(['data: [DONE]']), { status: 200 });

    const res = await onRequestPost(mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'test' }));
    assert.strictEqual(res.headers.get('X-Accel-Buffering'), 'no');
  });

  it('response headers include Cache-Control: no-cache', async () => {
    globalThis.fetch = async () => new Response(makeSseStream(['data: [DONE]']), { status: 200 });

    const res = await onRequestPost(mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'test' }));
    assert.strictEqual(res.headers.get('Cache-Control'), 'no-cache');
  });

  it('CORS header present on successful streaming response', async () => {
    globalThis.fetch = async () => new Response(makeSseStream(['data: [DONE]']), { status: 200 });

    const res = await onRequestPost(mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'test' }));
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  });
});

// ── Tests: OPTIONS preflight ───────────────────────────────────────────────

describe('/api/chat/stream (CF) — OPTIONS preflight', () => {
  it('returns 200 status', async () => {
    const res = await onRequestOptions();
    assert.strictEqual(res.status, 200);
  });

  it('Access-Control-Allow-Origin is *', async () => {
    const res = await onRequestOptions();
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('Access-Control-Allow-Methods includes POST and OPTIONS', async () => {
    const res = await onRequestOptions();
    const methods = res.headers.get('Access-Control-Allow-Methods') || '';
    assert.ok(methods.includes('POST'));
    assert.ok(methods.includes('OPTIONS'));
  });

  it('Access-Control-Allow-Headers includes Content-Type', async () => {
    const res = await onRequestOptions();
    const headers = res.headers.get('Access-Control-Allow-Headers') || '';
    assert.ok(headers.includes('Content-Type'));
  });
});

// ── Tests: request payload shape ──────────────────────────────────────────

describe('/api/chat/stream (CF) — OpenAI request payload', () => {
  it('sends stream: true to OpenAI', async () => {
    let capturedBody = null;
    globalThis.fetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return new Response(makeSseStream(['data: [DONE]']), { status: 200 });
    };

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'test' });
    await onRequestPost(ctx);
    assert.strictEqual(capturedBody.stream, true);
  });

  it('sends model gpt-5-mini', async () => {
    let capturedBody = null;
    globalThis.fetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return new Response(makeSseStream(['data: [DONE]']), { status: 200 });
    };

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'test' });
    await onRequestPost(ctx);
    assert.strictEqual(capturedBody.model, 'gpt-5-mini');
  });

  it('sends user message content correctly', async () => {
    let capturedBody = null;
    globalThis.fetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return new Response(makeSseStream(['data: [DONE]']), { status: 200 });
    };

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'คำถามทดสอบ' });
    await onRequestPost(ctx);
    const userMsg = capturedBody.messages.find(m => m.role === 'user');
    assert.strictEqual(userMsg.content, 'คำถามทดสอบ');
  });
});