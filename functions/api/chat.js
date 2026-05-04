// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/chat               ║
// ║  MeeBot AI — powered by OpenAI GPT-5-mini           ║
// ╚══════════════════════════════════════════════════════╝

import { buildChatMessages, getOpenAIBaseUrl, MEEBOT_MODEL } from './_shared/meebot.js';

export async function onRequestPost(ctx) {
  const { request, env } = ctx;

  try {
    const { message } = await request.json();
    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = env.OPENAI_API_KEY;
    const baseURL = getOpenAIBaseUrl(env);

    if (!apiKey) {
      return new Response(JSON.stringify({ reply: 'MeeBot AI ยังไม่ได้กำหนดค่า API key กรุณาติดต่อผู้ดูแลระบบ', error: 'API key not configured' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MEEBOT_MODEL,
        messages: buildChatMessages(message),
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI error:', response.status, errText);
      return new Response(JSON.stringify({ reply: 'MeeBot AI ไม่สามารถตอบได้ขณะนี้', error: `HTTP ${response.status}` }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await response.json();
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

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
