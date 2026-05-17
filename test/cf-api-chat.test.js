'use strict';
/**
 * Tests for cf-deploy/functions/api/chat.js
 *
 * Tests the Cloudflare Pages Function for MeeBot AI chat (non-streaming).
 * Logic is replicated from the source file to enable unit testing without
 * loading the ESM module directly.
 *
 * Functions under test:
 *   onRequestPost(ctx) — validates message, calls OpenAI, returns reply
 *   onRequestOptions() — returns CORS preflight headers
 *
 * Key behaviours:
 *   - Empty/missing message → 400
 *   - No OPENAI_API_KEY → 200 with error message in reply field
 *   - OpenAI returns error status → 200 with fallback reply + error field
 *   - OpenAI succeeds → 200 with reply from choices[0].message.content
 *   - Network/parse exception → 500
 *   - OPTIONS → CORS headers, null body
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/chat.js ───────────

const MEEBOT_SYSTEM_PROMPT = `MeeBot system prompt (test stub)`;

async function onRequestPost(ctx) {
  const { request, env } = ctx;

  try {
    const { message, sessionId = 'default' } = await request.json();
    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey  = env.OPENAI_API_KEY;
    const baseURL = env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      return new Response(JSON.stringify({ reply: 'MeeBot AI ยังไม่ได้กำหนดค่า API key กรุณาติดต่อผู้ดูแลระบบ', error: 'API key not configured' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const response = await globalThis.fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'gpt-5-mini',
        messages:    [
          { role: 'system',  content: MEEBOT_SYSTEM_PROMPT },
          { role: 'user',    content: message },
        ],
        max_tokens:  800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ reply: 'MeeBot AI ไม่สามารถตอบได้ขณะนี้', error: `HTTP ${response.status}` }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data  = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'ขออภัย ไม่สามารถตอบได้';

    return new Response(JSON.stringify({ reply, usage: data.usage }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
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
    request: {
      json: async () => bodyJson,
    },
  };
}

/** Creates a mock Response as returned by a successful OpenAI call. */
function mockOpenAISuccess(replyText = 'สวัสดีครับ') {
  const body = {
    choices: [{ message: { content: replyText } }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
  return new Response(JSON.stringify(body), { status: 200 });
}

/** Creates a mock Response simulating an OpenAI HTTP error. */
function mockOpenAIError(status = 500) {
  return new Response('Internal Server Error', { status });
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

describe('/api/chat (CF) — input validation', () => {
  it('returns 400 when message is missing', async () => {
    const ctx = mkCtx({}, {});
    const res = await onRequestPost(ctx);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error, 'must have error field');
    assert.ok(body.error.includes('Message'), 'error should mention "Message"');
  });

  it('returns 400 when message is empty string', async () => {
    const ctx = mkCtx({}, { message: '' });
    const res = await onRequestPost(ctx);
    assert.strictEqual(res.status, 400);
  });

  it('returns 400 when message is whitespace only', async () => {
    const ctx = mkCtx({}, { message: '   ' });
    const res = await onRequestPost(ctx);
    assert.strictEqual(res.status, 400);
  });

  it('returns 400 when message is null', async () => {
    const ctx = mkCtx({}, { message: null });
    const res = await onRequestPost(ctx);
    assert.strictEqual(res.status, 400);
  });

  it('400 response has Content-Type application/json', async () => {
    const ctx = mkCtx({}, { message: '' });
    const res = await onRequestPost(ctx);
    assert.ok((res.headers.get('Content-Type') || '').includes('application/json'));
  });
});

// ── Tests: missing API key ─────────────────────────────────────────────────

describe('/api/chat (CF) — missing API key', () => {
  it('returns HTTP 200 (not 5xx) when OPENAI_API_KEY is absent', async () => {
    const ctx = mkCtx({}, { message: 'สวัสดี' });
    const res = await onRequestPost(ctx);
    assert.strictEqual(res.status, 200);
  });

  it('response body includes error field "API key not configured"', async () => {
    const ctx = mkCtx({}, { message: 'สวัสดี' });
    const res = await onRequestPost(ctx);
    const body = await res.json();
    assert.ok(body.error, 'must have error field');
    assert.ok(body.error.includes('API key'), `error should mention "API key", got: ${body.error}`);
  });

  it('response body includes reply field with Thai text', async () => {
    const ctx = mkCtx({}, { message: 'สวัสดี' });
    const res = await onRequestPost(ctx);
    const body = await res.json();
    assert.ok(body.reply, 'must have reply field');
    assert.strictEqual(typeof body.reply, 'string');
  });

  it('response has CORS header when API key is missing', async () => {
    const ctx = mkCtx({}, { message: 'สวัสดี' });
    const res = await onRequestPost(ctx);
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  });
});

// ── Tests: OpenAI call succeeds ────────────────────────────────────────────

describe('/api/chat (CF) — successful OpenAI response', () => {
  it('returns 200 with reply from AI', async () => {
    globalThis.fetch = async () => mockOpenAISuccess('ยินดีต้อนรับสู่ MeeChain!');

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'สวัสดี' });
    const res = await onRequestPost(ctx);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.reply, 'ยินดีต้อนรับสู่ MeeChain!');
  });

  it('includes usage field from OpenAI response', async () => {
    globalThis.fetch = async () => mockOpenAISuccess('Hello');

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'hi' });
    const res = await onRequestPost(ctx);
    const body = await res.json();
    assert.ok(body.usage, 'usage field must be present');
    assert.ok('total_tokens' in body.usage);
  });

  it('uses fallback reply when choices array is empty', async () => {
    globalThis.fetch = async () => new Response(
      JSON.stringify({ choices: [], usage: {} }),
      { status: 200 }
    );

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'hi' });
    const res = await onRequestPost(ctx);
    const body = await res.json();
    assert.ok(typeof body.reply === 'string' && body.reply.length > 0);
  });

  it('uses OPENAI_BASE_URL env var when provided', async () => {
    let calledUrl = '';
    globalThis.fetch = async (url) => {
      calledUrl = url;
      return mockOpenAISuccess('ok');
    };

    const ctx = mkCtx(
      { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://custom.openai.example.com/v1' },
      { message: 'test' }
    );
    await onRequestPost(ctx);
    assert.ok(calledUrl.startsWith('https://custom.openai.example.com/v1'), `fetch must use custom base URL, got: ${calledUrl}`);
  });

  it('sends Authorization: Bearer header with API key', async () => {
    let capturedHeaders = null;
    globalThis.fetch = async (url, opts) => {
      capturedHeaders = opts.headers;
      return mockOpenAISuccess('ok');
    };

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-my-key' }, { message: 'test' });
    await onRequestPost(ctx);
    assert.ok(capturedHeaders, 'fetch must be called with headers');
    assert.strictEqual(capturedHeaders['Authorization'], 'Bearer sk-my-key');
  });

  it('response has CORS header on success', async () => {
    globalThis.fetch = async () => mockOpenAISuccess('ok');

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'test' });
    const res = await onRequestPost(ctx);
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  });
});

// ── Tests: OpenAI upstream error ───────────────────────────────────────────

describe('/api/chat (CF) — OpenAI upstream error', () => {
  it('returns 200 (not 5xx) when OpenAI returns HTTP 500', async () => {
    globalThis.fetch = async () => mockOpenAIError(500);

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'สวัสดี' });
    const res = await onRequestPost(ctx);
    assert.strictEqual(res.status, 200);
  });

  it('response includes error field with HTTP status code', async () => {
    globalThis.fetch = async () => mockOpenAIError(429);

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'สวัสดี' });
    const res = await onRequestPost(ctx);
    const body = await res.json();
    assert.ok(body.error, 'must have error field');
    assert.ok(body.error.includes('429'), `error must reference status code, got: ${body.error}`);
  });

  it('response includes fallback Thai reply on upstream error', async () => {
    globalThis.fetch = async () => mockOpenAIError(503);

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'สวัสดี' });
    const res = await onRequestPost(ctx);
    const body = await res.json();
    assert.ok(typeof body.reply === 'string' && body.reply.length > 0, 'reply must be non-empty string');
  });

  it('returns 500 when fetch throws a network error', async () => {
    globalThis.fetch = async () => { throw new Error('Network failure'); };

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'สวัสดี' });
    const res = await onRequestPost(ctx);
    assert.strictEqual(res.status, 500);
    const body = await res.json();
    assert.ok(body.error.includes('Network failure'));
  });

  it('CORS header present even on error response', async () => {
    globalThis.fetch = async () => mockOpenAIError(500);

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'สวัสดี' });
    const res = await onRequestPost(ctx);
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  });
});

// ── Tests: OPTIONS preflight ───────────────────────────────────────────────

describe('/api/chat (CF) — OPTIONS preflight', () => {
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
    assert.ok(methods.includes('POST'), 'must allow POST');
    assert.ok(methods.includes('OPTIONS'), 'must allow OPTIONS');
  });

  it('Access-Control-Allow-Headers includes Content-Type', async () => {
    const res = await onRequestOptions();
    const headers = res.headers.get('Access-Control-Allow-Headers') || '';
    assert.ok(headers.includes('Content-Type'), 'must allow Content-Type header');
  });

  it('response body is null/empty', async () => {
    const res = await onRequestOptions();
    const text = await res.text();
    assert.strictEqual(text, '');
  });
});

// ── Tests: request body shape sent to OpenAI ──────────────────────────────

describe('/api/chat (CF) — OpenAI request payload', () => {
  it('sends model gpt-5-mini', async () => {
    let capturedBody = null;
    globalThis.fetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return mockOpenAISuccess('ok');
    };

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'hello' });
    await onRequestPost(ctx);
    assert.strictEqual(capturedBody.model, 'gpt-5-mini');
  });

  it('sends system + user messages in correct order', async () => {
    let capturedBody = null;
    globalThis.fetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return mockOpenAISuccess('ok');
    };

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'test question' });
    await onRequestPost(ctx);
    assert.strictEqual(capturedBody.messages[0].role, 'system');
    assert.strictEqual(capturedBody.messages[1].role, 'user');
    assert.strictEqual(capturedBody.messages[1].content, 'test question');
  });

  it('sends max_tokens: 800', async () => {
    let capturedBody = null;
    globalThis.fetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return mockOpenAISuccess('ok');
    };

    const ctx = mkCtx({ OPENAI_API_KEY: 'sk-test' }, { message: 'test' });
    await onRequestPost(ctx);
    assert.strictEqual(capturedBody.max_tokens, 800);
  });
});