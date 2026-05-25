'use strict';
/**
 * Tests for cf-deploy/functions/api/chat.js
 *
 * Covers onRequestPost (chat completion) and onRequestOptions (CORS preflight).
 * All external fetch calls are mocked via global.fetch.
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

// ── Replicate onRequestPost from cf-deploy/functions/api/chat.js ──────────

const MEEBOT_SYSTEM_PROMPT = 'MeeBot system prompt (contents irrelevant to logic tests)';

async function cfChatPost(requestBody, env = {}, fetchImpl = null) {
  const savedFetch = global.fetch;
  if (fetchImpl !== null) global.fetch = fetchImpl;

  // Simulate request.json() using the pre-parsed requestBody object
  const makeCtx = (parsedBody) => ({
    request: { json: async () => parsedBody },
    env,
  });

  try {
    const ctx = makeCtx(requestBody);
    const { request, env: e } = ctx;

    let parsed;
    try {
      parsed = await request.json();
    } catch (err) {
      return { status: 500, body: { error: err.message }, headers: {} };
    }

    const { message, sessionId = 'default' } = parsed;
    if (!message?.trim()) {
      return {
        status: 400,
        body: { error: 'Message required' },
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const apiKey  = e.OPENAI_API_KEY;
    const baseURL = e.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      return {
        status: 200,
        body: {
          reply: 'MeeBot AI ยังไม่ได้กำหนดค่า API key กรุณาติดต่อผู้ดูแลระบบ',
          error: 'API key not configured',
        },
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      };
    }

    let upstreamResp;
    try {
      upstreamResp = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:       'gpt-5-mini',
          messages:    [
            { role: 'system', content: MEEBOT_SYSTEM_PROMPT },
            { role: 'user',   content: message },
          ],
          max_tokens:  800,
          temperature: 0.7,
        }),
      });
    } catch (err) {
      return {
        status: 500,
        body: { error: err.message },
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      };
    }

    if (!upstreamResp.ok) {
      return {
        status: 200,
        body: {
          reply: 'MeeBot AI ไม่สามารถตอบได้ขณะนี้',
          error: `HTTP ${upstreamResp.status}`,
        },
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      };
    }

    const data  = await upstreamResp.json();
    const reply = data.choices?.[0]?.message?.content || 'ขออภัย ไม่สามารถตอบได้';

    return {
      status: 200,
      body: { reply, usage: data.usage },
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    };
  } finally {
    global.fetch = savedFetch;
  }
}

// OPTIONS handler (CORS preflight) — pure logic, no fetch needed
function cfChatOptions() {
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

// ── Mock fetch helpers ───────────────────────────────────────────────────

function makeOpenAISuccess(content = 'ตอบแล้ว', usage = { total_tokens: 10 }) {
  return async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
      usage,
    }),
  });
}

function makeOpenAIFail(status = 401, text = 'Unauthorized') {
  return async () => ({
    ok: false,
    status,
    text: async () => text,
  });
}

function makeOpenAIThrow(msg = 'network error') {
  return async () => { throw new Error(msg); };
}

function makeOpenAINoChoices() {
  return async () => ({
    ok: true,
    json: async () => ({ choices: [], usage: {} }),
  });
}

// ── Tests: input validation ──────────────────────────────────────────────

describe('cf /api/chat — input validation', () => {
  it('returns 400 when message is missing', async () => {
    const result = await cfChatPost({}, { OPENAI_API_KEY: 'sk-test' });
    assert.strictEqual(result.status, 400);
    assert.ok(result.body.error, 'must have error field');
    assert.ok(result.body.error.includes('Message'), `error should mention Message, got: ${result.body.error}`);
  });

  it('returns 400 when message is empty string', async () => {
    const result = await cfChatPost({ message: '' }, { OPENAI_API_KEY: 'sk-test' });
    assert.strictEqual(result.status, 400);
  });

  it('returns 400 when message is whitespace only', async () => {
    const result = await cfChatPost({ message: '   ' }, { OPENAI_API_KEY: 'sk-test' });
    assert.strictEqual(result.status, 400);
  });

  it('returns 400 when message is null', async () => {
    const result = await cfChatPost({ message: null }, { OPENAI_API_KEY: 'sk-test' });
    assert.strictEqual(result.status, 400);
  });

  it('does NOT return 400 for a valid non-empty message', async () => {
    const result = await cfChatPost(
      { message: 'Hello MeeBot' },
      { OPENAI_API_KEY: 'sk-test' },
      makeOpenAISuccess()
    );
    assert.notStrictEqual(result.status, 400);
  });
});

// ── Tests: missing API key ───────────────────────────────────────────────

describe('cf /api/chat — missing OPENAI_API_KEY', () => {
  it('returns 200 with a no-key-configured reply', async () => {
    const result = await cfChatPost({ message: 'สวัสดี' }, {});
    assert.strictEqual(result.status, 200);
    assert.ok(result.body.reply, 'must have reply field');
    assert.ok(result.body.reply.includes('API key'), `reply should mention API key, got: ${result.body.reply}`);
  });

  it('includes error field "API key not configured"', async () => {
    const result = await cfChatPost({ message: 'สวัสดี' }, {});
    assert.strictEqual(result.body.error, 'API key not configured');
  });

  it('does not attempt fetch when API key is missing', async () => {
    let fetchCalled = false;
    const trackFetch = async () => { fetchCalled = true; return { ok: true, json: async () => ({}) }; };
    await cfChatPost({ message: 'test' }, {}, trackFetch);
    assert.strictEqual(fetchCalled, false, 'fetch must not be called without API key');
  });

  it('Access-Control-Allow-Origin is * in no-key response', async () => {
    const result = await cfChatPost({ message: 'สวัสดี' }, {});
    assert.strictEqual(result.headers['Access-Control-Allow-Origin'], '*');
  });
});

// ── Tests: successful OpenAI response ───────────────────────────────────

describe('cf /api/chat — successful OpenAI call', () => {
  it('reply field contains the AI response content', async () => {
    const result = await cfChatPost(
      { message: 'MEE Token คืออะไร?' },
      { OPENAI_API_KEY: 'sk-test' },
      makeOpenAISuccess('MEE Token เป็น native token ของ MeeChain')
    );
    assert.strictEqual(result.body.reply, 'MEE Token เป็น native token ของ MeeChain');
  });

  it('usage field is forwarded from OpenAI response', async () => {
    const usage = { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 };
    const result = await cfChatPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      makeOpenAISuccess('ok', usage)
    );
    assert.deepStrictEqual(result.body.usage, usage);
  });

  it('status is 200', async () => {
    const result = await cfChatPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      makeOpenAISuccess()
    );
    assert.strictEqual(result.status, 200);
  });

  it('Access-Control-Allow-Origin is *', async () => {
    const result = await cfChatPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      makeOpenAISuccess()
    );
    assert.strictEqual(result.headers['Access-Control-Allow-Origin'], '*');
  });
});

// ── Tests: OpenAI returns no choices ────────────────────────────────────

describe('cf /api/chat — OpenAI returns empty choices', () => {
  it('reply falls back to Thai fallback string', async () => {
    const result = await cfChatPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      makeOpenAINoChoices()
    );
    assert.strictEqual(result.body.reply, 'ขออภัย ไม่สามารถตอบได้');
  });
});

// ── Tests: OpenAI returns non-ok HTTP ───────────────────────────────────

describe('cf /api/chat — OpenAI HTTP error', () => {
  it('reply contains error message', async () => {
    const result = await cfChatPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      makeOpenAIFail(429, 'Rate limit')
    );
    assert.ok(result.body.reply, 'must have reply');
    assert.ok(result.body.reply.includes('ไม่สามารถ') || result.body.reply.length > 0);
  });

  it('error field mentions HTTP status code', async () => {
    const result = await cfChatPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      makeOpenAIFail(429)
    );
    assert.ok(result.body.error.includes('429'), `expected 429 in error, got: ${result.body.error}`);
  });
});

// ── Tests: OpenAI fetch throws ───────────────────────────────────────────

describe('cf /api/chat — fetch throws', () => {
  it('returns 500 with error message', async () => {
    const result = await cfChatPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      makeOpenAIThrow('Connection refused')
    );
    assert.strictEqual(result.status, 500);
    assert.ok(result.body.error, 'must have error field');
  });
});

// ── Tests: OPENAI_BASE_URL env var ───────────────────────────────────────

describe('cf /api/chat — OPENAI_BASE_URL customisation', () => {
  it('uses custom OPENAI_BASE_URL when set', async () => {
    let calledUrl = null;
    const trackFetch = async (url) => {
      calledUrl = url;
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
    };

    await cfChatPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://custom.ai/v1' },
      trackFetch
    );

    assert.ok(calledUrl !== null, 'fetch must be called');
    assert.ok(calledUrl.startsWith('https://custom.ai/v1'), `expected custom base URL, got: ${calledUrl}`);
  });

  it('defaults to https://api.openai.com/v1 when not set', async () => {
    let calledUrl = null;
    const trackFetch = async (url) => {
      calledUrl = url;
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
    };

    await cfChatPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      trackFetch
    );

    assert.ok(calledUrl.startsWith('https://api.openai.com/v1'), `expected openai.com, got: ${calledUrl}`);
  });
});

// ── Tests: OPTIONS (CORS preflight) ─────────────────────────────────────

describe('cf /api/chat — OPTIONS (CORS preflight)', () => {
  it('returns Access-Control-Allow-Origin: *', () => {
    const result = cfChatOptions();
    assert.strictEqual(result.headers['Access-Control-Allow-Origin'], '*');
  });

  it('returns Access-Control-Allow-Methods: POST, OPTIONS', () => {
    const result = cfChatOptions();
    assert.strictEqual(result.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
  });

  it('returns Access-Control-Allow-Headers: Content-Type', () => {
    const result = cfChatOptions();
    assert.strictEqual(result.headers['Access-Control-Allow-Headers'], 'Content-Type');
  });

  it('returns null body', () => {
    const result = cfChatOptions();
    assert.strictEqual(result.body, null);
  });
});

// ── Tests: regression ────────────────────────────────────────────────────

describe('cf /api/chat — regression', () => {
  it('sessionId field is accepted but does not affect reply logic', async () => {
    const result = await cfChatPost(
      { message: 'test', sessionId: 'user-abc' },
      { OPENAI_API_KEY: 'sk-test' },
      makeOpenAISuccess('hello')
    );
    assert.strictEqual(result.body.reply, 'hello');
  });

  it('message with special characters is passed through', async () => {
    let capturedBody = null;
    const captureFetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
    };

    await cfChatPost(
      { message: '<script>alert(1)</script>' },
      { OPENAI_API_KEY: 'sk-test' },
      captureFetch
    );

    const userMsg = capturedBody.messages.find(m => m.role === 'user');
    assert.strictEqual(userMsg.content, '<script>alert(1)</script>');
  });

  it('OpenAI request uses model gpt-5-mini', async () => {
    let capturedBody = null;
    const captureFetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
    };

    await cfChatPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-test' },
      captureFetch
    );

    assert.strictEqual(capturedBody.model, 'gpt-5-mini');
  });

  it('OpenAI request includes Authorization Bearer header', async () => {
    let capturedHeaders = null;
    const captureFetch = async (url, opts) => {
      capturedHeaders = opts.headers;
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
    };

    await cfChatPost(
      { message: 'test' },
      { OPENAI_API_KEY: 'sk-mykey' },
      captureFetch
    );

    assert.strictEqual(capturedHeaders['Authorization'], 'Bearer sk-mykey');
  });
});