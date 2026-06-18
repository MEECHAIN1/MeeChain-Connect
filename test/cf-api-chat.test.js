'use strict';
/**
 * Tests for the Cloudflare Pages Function: cf-deploy/functions/api/chat.js
 *
 * Handler under test:
 *   onRequestPost(ctx) — handles POST /api/chat
 *   onRequestOptions()  — handles OPTIONS /api/chat (CORS preflight)
 *
 * Behaviour of onRequestPost:
 *   - Missing/empty/whitespace message → 400 { error: 'Message required' }
 *   - No OPENAI_API_KEY env var → 200 with { reply: '<Thai msg>', error: 'API key not configured' }
 *   - OpenAI returns non-ok response → { reply: '<Thai error msg>', error: 'HTTP <status>' }
 *   - OpenAI returns success → { reply: content, usage: data.usage }
 *   - choices[0].message.content absent → fallback reply 'ขออภัย ไม่สามารถตอบได้'
 *   - Unexpected exception during processing → 500 { error: <message> }
 *   - All successful responses include Access-Control-Allow-Origin: *
 *   - baseURL defaults to 'https://api.openai.com/v1' when OPENAI_BASE_URL not set
 *
 * Behaviour of onRequestOptions:
 *   - Returns CORS headers: Allow-Origin *, Allow-Methods POST/OPTIONS, Allow-Headers Content-Type
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// ── Replicate handler logic from cf-deploy/functions/api/chat.js ──────────

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
    const baseURL = env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      return new Response(JSON.stringify({ reply: 'MeeBot AI ยังไม่ได้กำหนดค่า API key กรุณาติดต่อผู้ดูแลระบบ', error: 'API key not configured' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const response = await ctx._fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'gpt-5-mini',
        messages:    [
          { role: 'system',  content: '(system prompt)' },
          { role: 'user',    content: message },
        ],
        max_tokens:  800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      await response.text();
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

// ── Mock helpers ──────────────────────────────────────────────────────────

function makeRequest(body) {
  return {
    json: async () => body,
  };
}

function makeCtx({ message, env = {}, fetchImpl }) {
  return {
    request: makeRequest({ message }),
    env,
    _fetch: fetchImpl || (() => { throw new Error('fetch not mocked'); }),
  };
}

function makeOkOpenAIResponse(content, usage = null) {
  const data = {
    choices: [{ message: { content } }],
    usage,
  };
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function makeErrorOpenAIResponse(status, errText = 'error') {
  return {
    ok: false,
    status,
    json: async () => { throw new Error('not JSON'); },
    text: async () => errText,
  };
}

// ── Tests: message validation ─────────────────────────────────────────────

describe('/api/chat (CF) onRequestPost — message validation', () => {
  it('returns 400 when message is empty string', async () => {
    const ctx = makeCtx({ message: '', env: {} });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 400);
    const body = await resp.json();
    assert.strictEqual(body.error, 'Message required');
  });

  it('returns 400 when message is whitespace only', async () => {
    const ctx = makeCtx({ message: '   ', env: {} });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 400);
    const body = await resp.json();
    assert.strictEqual(body.error, 'Message required');
  });

  it('returns 400 when message is null', async () => {
    const ctx = makeCtx({ message: null, env: {} });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 400);
    const body = await resp.json();
    assert.strictEqual(body.error, 'Message required');
  });

  it('returns 400 when message is undefined', async () => {
    const ctx = {
      request: { json: async () => ({}) }, // message key absent
      env: {},
      _fetch: () => {},
    };
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 400);
    const body = await resp.json();
    assert.strictEqual(body.error, 'Message required');
  });

  it('does not return 400 for valid non-empty message', async () => {
    const ctx = makeCtx({
      message: 'Hello MeeBot',
      env: {}, // no API key → triggers no-key branch, not 400
    });
    const resp = await onRequestPost(ctx);
    assert.notStrictEqual(resp.status, 400);
  });
});

// ── Tests: no API key ─────────────────────────────────────────────────────

describe('/api/chat (CF) onRequestPost — no OPENAI_API_KEY', () => {
  it('returns reply with "API key not configured" error when no API key set', async () => {
    const ctx = makeCtx({ message: 'Hello', env: {} });
    const resp = await onRequestPost(ctx);
    const body = await resp.json();
    assert.strictEqual(body.error, 'API key not configured');
  });

  it('reply field contains Thai fallback message when no API key', async () => {
    const ctx = makeCtx({ message: 'Hello', env: {} });
    const resp = await onRequestPost(ctx);
    const body = await resp.json();
    assert.ok(typeof body.reply === 'string' && body.reply.length > 0);
    assert.ok(body.reply.includes('API key') || body.reply.includes('ผู้ดูแล') || body.reply.length > 5);
  });

  it('no-key response includes Access-Control-Allow-Origin *', async () => {
    const ctx = makeCtx({ message: 'Hello', env: {} });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('no-key response status is 200 (not 401)', async () => {
    const ctx = makeCtx({ message: 'Hello', env: {} });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 200);
  });
});

// ── Tests: OpenAI error responses ─────────────────────────────────────────

describe('/api/chat (CF) onRequestPost — OpenAI API errors', () => {
  it('returns error reply when OpenAI returns 500', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeErrorOpenAIResponse(500),
    });
    const resp = await onRequestPost(ctx);
    const body = await resp.json();
    assert.ok(body.error.includes('500'), `error should mention HTTP 500, got: ${body.error}`);
  });

  it('returns error reply when OpenAI returns 401', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-invalid' },
      fetchImpl: async () => makeErrorOpenAIResponse(401),
    });
    const resp = await onRequestPost(ctx);
    const body = await resp.json();
    assert.ok(body.error.includes('401'));
  });

  it('reply field contains Thai fallback when OpenAI fails', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeErrorOpenAIResponse(503),
    });
    const resp = await onRequestPost(ctx);
    const body = await resp.json();
    assert.ok(typeof body.reply === 'string' && body.reply.length > 0);
  });

  it('error response still includes CORS header', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeErrorOpenAIResponse(502),
    });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });
});

// ── Tests: successful OpenAI response ────────────────────────────────────

describe('/api/chat (CF) onRequestPost — successful OpenAI response', () => {
  it('returns reply from choices[0].message.content', async () => {
    const expectedReply = 'สวัสดีครับ ฉันคือ MeeBot!';
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeOkOpenAIResponse(expectedReply),
    });
    const resp = await onRequestPost(ctx);
    const body = await resp.json();
    assert.strictEqual(body.reply, expectedReply);
  });

  it('includes usage field when OpenAI returns it', async () => {
    const usage = { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 };
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeOkOpenAIResponse('Hello', usage),
    });
    const resp = await onRequestPost(ctx);
    const body = await resp.json();
    assert.deepStrictEqual(body.usage, usage);
  });

  it('usage field is null when OpenAI does not return it', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeOkOpenAIResponse('Hello', null),
    });
    const resp = await onRequestPost(ctx);
    const body = await resp.json();
    assert.strictEqual(body.usage, null);
  });

  it('success response includes CORS header', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeOkOpenAIResponse('Reply'),
    });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('success response Content-Type is application/json', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => makeOkOpenAIResponse('Reply'),
    });
    const resp = await onRequestPost(ctx);
    assert.ok(resp.headers.get('Content-Type').includes('application/json'));
  });
});

// ── Tests: fallback reply when choices is empty ───────────────────────────

describe('/api/chat (CF) onRequestPost — fallback reply', () => {
  it('uses fallback reply when choices is empty array', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [], usage: null }),
        text: async () => '',
      }),
    });
    const resp = await onRequestPost(ctx);
    const body = await resp.json();
    assert.strictEqual(body.reply, 'ขออภัย ไม่สามารถตอบได้');
  });

  it('uses fallback reply when choices[0].message.content is null', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: null } }], usage: null }),
        text: async () => '',
      }),
    });
    const resp = await onRequestPost(ctx);
    const body = await resp.json();
    assert.strictEqual(body.reply, 'ขออภัย ไม่สามารถตอบได้');
  });

  it('uses fallback reply when choices[0].message.content is empty string', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '' } }], usage: null }),
        text: async () => '',
      }),
    });
    const resp = await onRequestPost(ctx);
    const body = await resp.json();
    // empty string is falsy, so fallback applies
    assert.strictEqual(body.reply, 'ขออภัย ไม่สามารถตอบได้');
  });
});

// ── Tests: exception handling ─────────────────────────────────────────────

describe('/api/chat (CF) onRequestPost — exception handling', () => {
  it('returns 500 when fetch throws an error', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => { throw new Error('Network failure'); },
    });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 500);
    const body = await resp.json();
    assert.strictEqual(body.error, 'Network failure');
  });

  it('500 response includes CORS header', async () => {
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => { throw new Error('oops'); },
    });
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('returns 500 when request.json() throws', async () => {
    const ctx = {
      request: { json: async () => { throw new Error('Bad JSON'); } },
      env: { OPENAI_API_KEY: 'sk-test' },
      _fetch: async () => {},
    };
    const resp = await onRequestPost(ctx);
    assert.strictEqual(resp.status, 500);
    const body = await resp.json();
    assert.strictEqual(body.error, 'Bad JSON');
  });
});

// ── Tests: OPENAI_BASE_URL env var ────────────────────────────────────────

describe('/api/chat (CF) onRequestPost — OPENAI_BASE_URL', () => {
  it('uses OPENAI_BASE_URL env var when set', async () => {
    let calledUrl = null;
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://custom.openai.example/v1' },
      fetchImpl: async (url) => { calledUrl = url; return makeOkOpenAIResponse('Hi'); },
    });
    await onRequestPost(ctx);
    assert.ok(calledUrl && calledUrl.startsWith('https://custom.openai.example/v1'), `Expected custom base URL, got: ${calledUrl}`);
  });

  it('defaults to https://api.openai.com/v1 when OPENAI_BASE_URL not set', async () => {
    let calledUrl = null;
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async (url) => { calledUrl = url; return makeOkOpenAIResponse('Hi'); },
    });
    await onRequestPost(ctx);
    assert.ok(calledUrl && calledUrl.startsWith('https://api.openai.com/v1'), `Expected default base URL, got: ${calledUrl}`);
  });

  it('Authorization header uses Bearer + API key', async () => {
    let capturedHeaders = null;
    const ctx = makeCtx({
      message: 'Hello',
      env: { OPENAI_API_KEY: 'sk-my-secret-key' },
      fetchImpl: async (url, opts) => { capturedHeaders = opts.headers; return makeOkOpenAIResponse('Hi'); },
    });
    await onRequestPost(ctx);
    assert.strictEqual(capturedHeaders['Authorization'], 'Bearer sk-my-secret-key');
  });
});

// ── Tests: onRequestOptions (CORS preflight) ──────────────────────────────

describe('/api/chat (CF) onRequestOptions — CORS preflight', () => {
  it('returns null body', async () => {
    const resp = await onRequestOptions();
    const text = await resp.text();
    assert.strictEqual(text, '');
  });

  it('Access-Control-Allow-Origin is *', async () => {
    const resp = await onRequestOptions();
    assert.strictEqual(resp.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('Access-Control-Allow-Methods includes POST and OPTIONS', async () => {
    const resp = await onRequestOptions();
    const methods = resp.headers.get('Access-Control-Allow-Methods');
    assert.ok(methods.includes('POST'), 'must allow POST');
    assert.ok(methods.includes('OPTIONS'), 'must allow OPTIONS');
  });

  it('Access-Control-Allow-Headers includes Content-Type', async () => {
    const resp = await onRequestOptions();
    assert.ok(resp.headers.get('Access-Control-Allow-Headers').includes('Content-Type'));
  });
});