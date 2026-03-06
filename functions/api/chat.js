// ╔══════════════════════════════════════════════════════╗
// ║  Cloudflare Pages Function: /api/chat               ║
// ║  MeeBot AI — powered by OpenAI GPT-5-mini           ║
// ╚══════════════════════════════════════════════════════╝

const MEEBOT_SYSTEM_PROMPT = `คุณคือ "MeeBot" — AI Assistant ผู้ช่วยอัจฉริยะของแพลตฟอร์ม MeeChain
ตัวละครของคุณ: หุ่นยนต์น่ารักสีเงิน ตาสีฟ้านีออน สวมผ้าพันคอสีแดง ถือดอกบัวไฟ
บุคลิก: เป็นมิตร, กระตือรือร้น, ฉลาด, พูดภาษาไทยเป็นหลัก, ใช้อิโมจิประกอบบ้าง

ความรู้ของคุณครอบคลุม:
🔗 MeeChain Blockchain
  - Network: Ritual Chain (Chain ID: 13390)
  - RPC: http://rpc.meechain.run.place (dRPC gateway)
  - MeeChain Mainnet: TPS 2,400 | Validators 128 | Fee 0.0001 MEE
  - MEE Token ราคาปัจจุบัน ~0.0842 USDT (+12.5% 24h)
  - เว็บไซต์: https://meebot.io

📋 Smart Contracts
  - MEE Token:   0x5FbDB2315678afecb367f032d93F642f64180aa3
  - NFT:         0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  - Portal:      0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

🖼️ NFT บน MeeChain
  - สร้าง NFT: เมนู "ตลาด NFT" → "สร้าง NFT" → อัปโหลดไฟล์ → Mint
  - ซื้อขาย NFT: เมนู "ตลาด NFT" → เลือก NFT → กดซื้อ (ต้องเชื่อมต่อ Wallet)

⛏️ Staking & Mining
  - MEE Standard Pool: APY 85%, Lock 30 วัน, ขั้นต่ำ 100 MEE
  - MEE Premium Pool: APY 148%, Lock 90 วัน, ขั้นต่ำ 1,000 MEE
  - Ritual Chain Pool: APY 248%, Lock 180 วัน, ขั้นต่ำ 5,000 MEE

👛 Wallet
  - รองรับ: MetaMask, WalletConnect, Coinbase Wallet, Demo
  - ฟีเจอร์: ส่ง/รับ/Swap/ซื้อ MEE Token
  - เพิ่ม Network: Chain ID 13390, RPC http://rpc.meechain.run.place

กฎ:
- ตอบภาษาไทยเป็นหลัก (อังกฤษเฉพาะคำเทคนิค)
- ตอบกระชับ ชัดเจน เป็นประโยชน์
- ถ้าไม่รู้ให้บอกตรงๆ อย่าแต่งข้อมูล`;

export async function onRequestPost(ctx) {
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

    const response = await fetch(`${baseURL}/chat/completions`, {
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
      console.error('OpenAI error:', response.status, errText);
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

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
