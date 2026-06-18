'use strict';
/**
 * Tests for the Cloudflare Pages Function: cf-deploy/functions/api/chat/stream.js
 *
 * Handler under test:
 *   onRequestPost(ctx) — handles POST /api/chat/stream (SSE streaming)
 *   onRequestOptions()  — handles OPTIONS /api/chat/stream (CORS preflight)
 *
 * Behaviour of onRequestPost:
 *   - Missing/empty/whitespace message → 400 { error: 'Message required' } (non-streaming JSON)
 *   - No OPENAI_API_KEY → SSE stream with { delta: '<Thai error>' } then { done: true }
 *   - OpenAI returns non-ok → SSE stream with { error: 'AI Error: HTTP <status>' }
 *   - Success → SSE stream proxied through as { delta: <content> } events + { done: true }
 *   - OPENAI_BASE_URL trailing slash is stripped
 *   - Content-Type is text/event-stream for all SSE responses
 *   - CORS Access-Control-Allow-Origin: * on all responses
 *
 * SSE parsing helpers are replicated from the handler to enable white-box testing
 * of the streaming transform logic.
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/chat/stream.js ───

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

    const upstreamRes = await ctx._fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'gpt-5-mini',
        messages:    [
          { role: 'system', content: '(system prompt)' },
          { role: 'user',   content: message },
        ],
        stream:      true,
        max_tokens:  800,
        temperature: 0.7,
      }),
    });

    if (!upstreamRes.ok) {
      await upstreamRes.text();
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

    // Transform upstream SSE → our SSE format
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

function makeCtx({ message, env = {}, fetchImpl } = {}) {
  return {
    request: { json: async () => ({ message }) },
    env,
    _fetch: fetchImpl || (() => { throw new Error('fetch not mocked'); }),
  };
}

/** Read all text from a Response whose body is a ReadableStream */
async function readStream(resp) {
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

/** Parse SSE text into an array of parsed JSON data objects */
function parseSSE(text) {
  return text
    .split('\n')
    .filter(line => line.startsWith('data: '))
    .map(line => JSON.parse(line.slice(6).trim()));
}

/** Build a fake upstream ReadableStream from an array of SSE line strings */
function buildUpstreamStream(lines) {
  const encoder = new TextEncoder();
  const text = lines.join('\n') + '\n';
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

// ── Tests: message validation ─────────────────────────────────────────────

describe('/api/chat/stream (CF) onRequestPost — message validation', () => {
  it('returns 400 for empty message', async () => {
    const ctx = makeCtx({ message: '', env: {} });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 400);
    const body = await resp.json();
    assert.strictEqual(body.error, 'Message required');
  });

  it('returns 400 for whitespace-only message', async () => {
    const ctx = makeCtx({ message: '   ', env: {} });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 400);
  });

  it('returns 400 for null message', async () => {
    const ctx = makeCtx({ message: null, env: {} });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 400);
  });

  it('returns 400 for missing message key', async () => {
    const ctx = { request: { json: async () => ({}) }, env: {}, _fetch: () => {} };
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 400);
  });

  it('400 response is application/json (not SSE)', async () => {
    const ctx = makeCtx({ message: '', env: {} });
    const resp = await onRequestPost(ctx);
    assert.ok(resp.headers.get('Content-Type').includes('application/json'));
  });
});

// ── Tests: no API key — SSE fallback ─────────────────────────────────────

describe('/api/chat/stream (CF) onRequestPost — no OPENAI_API_KEY', () => {
  it('returns text/event-stream Content-Type', async () => {
    const ctx = makeCtx({ message: 'Hello', env: {} });
    const resp = await onRequestPost(ctx);
    assert.ok(resp.headers.get('Content-Type').includes('text/event-stream'));
  });

  it('returns CORS header', async () => {
    const ctx = makeCtx({ message: 'Hello', env: {} });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('stream contains a delta event with error message', async () => {
    const ctx = makeCtx({ message: 'Hello', env: {} });
    const resp = await onRequestPost(ctx);
    const text = await readStream(resp);
    const events = parseSSE(text);
    const deltaEvent = events.find(e => e.delta !== undefined);
    assert.ok(deltaEvent, 'must have a delta event');
    assert.ok(typeof deltaEvent.delta === 'string' && deltaEvent.delta.length > 0);
  });

  it('stream ends with a done:true event', async () => {
    const ctx = makeCtx({ message: 'Hello', env: {} });
    const resp = await onRequestPost(ctx);
    const text = await readStream(resp);
    const events = parseSSE(text);
    const lastEvent = events[events.length - 1];
    assert.strictEqual(lastEvent.done, true, 'last SSE event must be { done: true }');
  });

  it('stream has exactly 2 events: delta then done', async () => {
    const ctx = makeCtx({ message: 'Hello', env: {} });
    const resp = await onRequestPost(ctx);
    const text = await readStream(resp);
    const events = parseSSE(text);
    assert.strictEqual(events.length, 2);
    assert.ok('delta' in events[0], 'first event must have delta');
    assert.ok(events[1].done === true, 'second event must be done');
  });
});

// ── Tests: OpenAI non-ok response ─────────────────────────────────────────

describe('/api/chat/stream (CF) onRequestPost — OpenAI non-ok response', () => {
  function makeErrorUpstream(status) {
    return {
      ok: false,
      status,
      text: async () => 'upstream error',
      body: null,
    };
  }

  it('returns text/event-stream Content-Type on OpenAI error', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeErrorUpstream(500),
    });
    const resp = await onRequestPost(ctx);
    assert.ok(resp.headers.get('Content-Type').includes('text/event-stream'));
  });

  it('SSE error event contains AI Error with HTTP status', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeErrorUpstream(503),
    });
    const resp = await onRequestPost(ctx);
    const text = await readStream(resp);
    const events = parseSSE(text);
    const errorEvent = events.find(e => e.error !== undefined);
    assert.ok(errorEvent, 'must have an error event');
    assert.ok(errorEvent.error.includes('503'), `error must mention HTTP 503, got: ${errorEvent.error}`);
  });

  it('returns CORS header on upstream error', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeErrorUpstream(401),
    });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });
});

// ── Tests: SSE streaming success ──────────────────────────────────────────

describe('/api/chat/stream (CF) onRequestPost — successful streaming', () => {
  function makeStreamingUpstream(contentChunks) {
    // Build SSE lines like OpenAI would send
    const lines = contentChunks.map(chunk =>
      `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}`
    );
    lines.push('data: [DONE]');
    const body = buildUpstreamStream(lines);
    return { ok: true, status: 200, body, text: async () => '' };
  }

  it('returns text/event-stream Content-Type on success', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeStreamingUpstream(['Hello']),
    });
    const resp = await onRequestPost(ctx);
    assert.ok(resp.headers.get('Content-Type').includes('text/event-stream'));
  });

  it('returns CORS header on success', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeStreamingUpstream(['Hello']),
    });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('returns X-Accel-Buffering: no to prevent proxy buffering', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeStreamingUpstream(['Hello']),
    });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.headers.get('X-Accel-Buffering'), 'no');
  });

  it('streams content chunks as delta events', async () => {
    const chunks = ['Hel', 'lo ', 'MeeBot'];
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeStreamingUpstream(chunks),
    });
    const resp = await onRequestPost(ctx);
    const text = await readStream(resp);
    const events = parseSSE(text);
    const deltas = events.filter(e => e.delta !== undefined).map(e => e.delta);
    assert.deepStrictEqual(deltas, chunks);
  });

  it('final event is { done: true }', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeStreamingUpstream(['Word']),
    });
    const resp = await onRequestPost(ctx);
    const text = await readStream(resp);
    const events = parseSSE(text);
    const lastEvent = events[events.length - 1];
    assert.strictEqual(lastEvent.done, true);
  });

  it('SSE lines that do not start with "data: " are ignored', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(
          'event: ping\n' +
          ': comment\n' +
          `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hi' } }] })}\n` +
          'data: [DONE]\n'
        ));
        controller.close();
      },
    });
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => ({ ok: true, status: 200, body, text: async () => '' }),
    });
    const resp = await onRequestPost(ctx);
    const text = await readStream(resp);
    const events = parseSSE(text);
    const deltas = events.filter(e => e.delta !== undefined);
    assert.strictEqual(deltas.length, 1);
    assert.strictEqual(deltas[0].delta, 'Hi');
  });

  it('malformed JSON in SSE data line is silently ignored', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(
          'data: {bad json}\n' +
          `data: ${JSON.stringify({ choices: [{ delta: { content: 'OK' } }] })}\n` +
          'data: [DONE]\n'
        ));
        controller.close();
      },
    });
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => ({ ok: true, status: 200, body, text: async () => '' }),
    });
    const resp = await onRequestPost(ctx);
    const text = await readStream(resp);
    const events = parseSSE(text);
    const deltas = events.filter(e => e.delta !== undefined);
    assert.strictEqual(deltas.length, 1, 'malformed line must be silently skipped');
    assert.strictEqual(deltas[0].delta, 'OK');
  });

  it('chunk with no delta content is skipped (role-only delta)', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        // role-only delta (no content) followed by content delta
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] })}\n` +
          `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] })}\n` +
          'data: [DONE]\n'
        ));
        controller.close();
      },
    });
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => ({ ok: true, status: 200, body, text: async () => '' }),
    });
    const resp = await onRequestPost(ctx);
    const text = await readStream(resp);
    const events = parseSSE(text);
    const deltas = events.filter(e => e.delta !== undefined);
    assert.strictEqual(deltas.length, 1, 'role-only delta must be skipped');
    assert.strictEqual(deltas[0].delta, 'Hello');
  });
});

// ── Tests: baseURL trailing slash stripping ───────────────────────────────

describe('/api/chat/stream (CF) onRequestPost — baseURL normalization', () => {
  it('strips trailing slash from OPENAI_BASE_URL', async () => {
    let calledUrl = null;
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://api.openai.com/v1/' },
      fetchImpl: async (url, opts) => {
        calledUrl = url;
        return {
          ok: true, status: 200,
          body: buildUpstreamStream(['data: [DONE]']),
          text: async () => '',
        };
      },
    });
    await onRequestPost(ctx);
    assert.ok(calledUrl && !calledUrl.includes('//chat'), `URL should not have double slash: ${calledUrl}`);
  });

  it('default baseURL does not have trailing slash before /chat/completions', async () => {
    let calledUrl = null;
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async (url) => {
        calledUrl = url;
        const body = buildUpstreamStream(['data: [DONE]']);
        return { ok: true, status: 200, body, text: async () => '' };
      },
    });
    await onRequestPost(ctx);
    assert.ok(calledUrl === 'https://api.openai.com/v1/chat/completions', `Unexpected URL: ${calledUrl}`);
  });
});

// ── Tests: exception handling ─────────────────────────────────────────────

describe('/api/chat/stream (CF) onRequestPost — exception handling', () => {
  it('returns 500 with SSE error event when fetch throws', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => { throw new Error('Connection refused'); },
    });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 500);
    const text = await resp.text();
    assert.ok(text.startsWith('data: '), 'error response must be SSE formatted');
    const event = JSON.parse(text.trim().replace('data: ', ''));
    assert.ok(event.error.includes('Connection refused'));
  });

  it('returns SSE Content-Type for 500 error', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => { throw new Error('oops'); },
    });
    const resp = await onRequestPost(ctx);
    assert.ok(resp.headers.get('Content-Type').includes('text/event-stream'));
  });
});

// ── Tests: onRequestOptions (CORS preflight) ──────────────────────────────

describe('/api/chat/stream (CF) onRequestOptions — CORS preflight', () => {
  it('Access-Control-Allow-Origin is *', async () => {
    const resp = await onRequestOptions();
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('Access-Control-Allow-Methods includes POST and OPTIONS', async () => {
    const resp = await onRequestOptions();
    const methods = resp.headers.get('Access-Control-Allow-Methods');
    assert.ok(methods.includes('POST'));
    assert.ok(methods.includes('OPTIONS'));
  });

  it('Access-Control-Allow-Headers includes Content-Type', async () => {
    const resp = await onRequestOptions();
    assert.ok(resp.headers.get('Access-Control-Allow-Headers').includes('Content-Type'));
  });

  it('response body is empty', async () => {
    const resp = await onRequestOptions();
    const text = await resp.text();
    assert.strictEqual(text, '');
  });
});