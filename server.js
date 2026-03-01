// ===== MeeChain MeeBot AI Chat Server =====
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Load OpenAI credentials ──────────────────────────────────────
let apiKey = process.env.OPENAI_API_KEY;
let baseURL = process.env.OPENAI_BASE_URL;

const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
if (fs.existsSync(configPath)) {
  const cfg = yaml.load(fs.readFileSync(configPath, 'utf8'));
  apiKey  = apiKey  || cfg?.openai?.api_key;
  baseURL = baseURL || cfg?.openai?.base_url;
}

const openai = new OpenAI({ apiKey, baseURL });

// ── MeeBot System Prompt ─────────────────────────────────────────
const MEEBOT_SYSTEM_PROMPT = `คุณคือ "MeeBot" — AI Assistant ผู้ช่วยอัจฉริยะของแพลตฟอร์ม MeeChain
ตัวละครของคุณ: หุ่นยนต์น่ารักสีเงิน ตาสีฟ้านีออน สวมผ้าพันคอสีแดง ถือดอกบัวไฟ มีเขาเล็กๆ บนหัว
บุคลิก: เป็นมิตร, กระตือรือร้น, ฉลาด, พูดภาษาไทยเป็นหลัก, ใช้อิโมจิประกอบบ้างเพื่อความน่ารัก

ความรู้ของคุณครอบคลุม:
🔗 MeeChain Blockchain
  - MeeChain Mainnet: TPS 2,400 | Validators 128 | Fee 0.0001 MEE
  - MEE Token ราคาปัจจุบัน ~0.0842 USDT (+12.5% 24h)
  - Mee Ritual Chain: บล็อกเชนสำหรับพิธีกรรมและศิลปะดิจิทัล

🖼️ NFT บน MeeChain
  - สร้าง NFT: ไปที่เมนู "ตลาด NFT" → "สร้าง NFT" → อัปโหลดไฟล์ → ตั้งชื่อและราคา → Mint
  - ซื้อขาย NFT: เมนู "ตลาด NFT" → เลือก NFT → กดซื้อ (ต้องเชื่อมต่อ Wallet ก่อน)
  - NFT ยอดนิยม: MeeBot Alpha #001 (240 MEE), Space Astronaut #007 (320 MEE), Chain Guardian #003 (560 MEE)

⛏️ Staking & Mining
  - MEE Standard Pool: APY 85%, Lock 30 วัน, ขั้นต่ำ 100 MEE
  - MEE Premium Pool: APY 148%, Lock 90 วัน, ขั้นต่ำ 1,000 MEE
  - Ritual Chain Pool: APY 248%, Lock 180 วัน, ขั้นต่ำ 5,000 MEE

👛 Wallet
  - รองรับ: MetaMask, WalletConnect, Coinbase Wallet
  - ฟีเจอร์: ส่ง/รับ/Swap/ซื้อ MEE Token

กฎ:
- ตอบภาษาไทยเป็นหลัก (ภาษาอังกฤษเฉพาะคำเทคนิคที่จำเป็น)
- ตอบกระชับ ชัดเจน เป็นประโยชน์
- ถ้าไม่รู้ให้บอกตรงๆ อย่าแต่งข้อมูล
- แนะนำผู้ใช้ไปยังเมนูที่เกี่ยวข้องใน Dashboard เสมอ`;

// ── Chat History Storage (in-memory per session) ─────────────────
const sessions = new Map();

// ── API: Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: 'gpt-5-mini', bot: 'MeeBot AI' });
});

// ── API: Chat (Streaming) ─────────────────────────────────────────
app.post('/api/chat/stream', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  // Init session history
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  const history = sessions.get(sessionId);
  history.push({ role: 'user', content: message });

  // Keep last 20 messages to save tokens
  const trimmed = history.slice(-20);

  // SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let fullReply = '';
  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: MEEBOT_SYSTEM_PROMPT },
        ...trimmed
      ],
      stream: true,
      max_tokens: 800,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullReply += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    // Save assistant reply to history
    history.push({ role: 'assistant', content: fullReply });
    sessions.set(sessionId, history.slice(-30));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('AI Error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' })}\n\n`);
    res.end();
  }
});

// ── API: Chat (Non-streaming fallback) ───────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  const history = sessions.get(sessionId);
  history.push({ role: 'user', content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: MEEBOT_SYSTEM_PROMPT },
        ...history.slice(-20)
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;
    history.push({ role: 'assistant', content: reply });
    sessions.set(sessionId, history.slice(-30));

    res.json({ reply, usage: completion.usage });
  } catch (err) {
    console.error('AI Error:', err.message);
    res.status(500).json({ error: 'AI ไม่สามารถตอบได้ตอนนี้ กรุณาลองใหม่' });
  }
});

// ── API: Clear Session ────────────────────────────────────────────
app.delete('/api/chat/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ cleared: true });
});

// ── API: NFT Description Generator ───────────────────────────────
app.post('/api/nft/describe', async (req, res) => {
  const { name, category, traits } = req.body;
  if (!name) return res.status(400).json({ error: 'NFT name required' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{
        role: 'user',
        content: `สร้างคำอธิบาย NFT ภาษาไทยสั้นๆ น่าสนใจ (2-3 ประโยค) สำหรับ:
ชื่อ: ${name}
หมวดหมู่: ${category || 'art'}
คุณสมบัติ: ${traits || 'ไม่ระบุ'}
ใช้ภาษาสร้างสรรค์ เหมาะสำหรับ NFT บน MeeChain Blockchain`
      }],
      max_tokens: 200,
      temperature: 0.9,
    });
    res.json({ description: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถสร้างคำอธิบายได้' });
  }
});

// ── Start Server ──────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MeeBot AI Server running on http://0.0.0.0:${PORT}`);
  console.log(`   OpenAI Base URL: ${baseURL}`);
  console.log(`   Model: gpt-5-mini`);
});
