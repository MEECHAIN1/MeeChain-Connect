// ╔══════════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/chat/stream (SSE)      ║
// ║  Streaming MeeBot AI responses via Server-Sent Events   ║
// ╚══════════════════════════════════════════════════════════╝

const SYSTEM_PROMPT = `คุณคือ "MeeBot" — AI Assistant ผู้ช่วยอัจฉริยะของแพลตฟอร์ม MeeChain
ตัวละครของคุณ: หุ่นยนต์น่ารักสีเงิน ตาสีฟ้านีออน สวมผ้าพันคอสีแดง ถือดอกบัวไฟ
บุคลิก: เป็นมิตร, กระตือรือร้น, ฉลาด, พูดภาษาไทยเป็นหลัก, ใช้อิโมจิประกอบบ้าง

🔗 MeeChain Blockchain: Ritual Chain (Chain ID: 13390) | RPC: http://rpc.meechain.run.place
💰 MEE Token: ~0.0842 USDT | Contracts: 0x5FbDB... (Token) | 0xe7f17... (NFT) | 0x9fE46... (Portal)
🌐 Dashboard: https://meebot.io

กฎ: ตอบภาษาไทยเป็นหลัก, กระชับ, ชัดเจน, ไม่แต่งข้อมูล`;

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

    const apiKey  = env.OPENAI_API_KEY;
    const baseURL = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

    if (!apiKey) {
      // Return non-stream fallback with error message
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

    // Call OpenAI streaming
    const upstreamRes = await fetch(`${baseURL}/chat/completions`, {
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
      const errTxt = await upstreamRes.text();
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

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
