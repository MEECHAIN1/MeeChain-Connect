// ===== MeeChain MeeBot AI + Web3 Server =====
// Key Architecture:
//   dRPC Access Key    → frontend/DApp RPC gateway
//   NodeCore API Key   → server-side proxy layer
//   NodeCloud API Key  → infra management
//   NodeCloud Stats    → monitoring & cost intelligence
// =====================================================
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const OpenAI  = require('openai');
const fs      = require('fs');
const yaml    = require('js-yaml');
const path    = require('path');
const os      = require('os');
const https   = require('https');
const http    = require('http');
const { MeeChainWeb3 } = require('./src/web3/contracts');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── RPC Configuration ────────────────────────────────────────────
const RPC_CONFIG = {
  // Primary: dRPC gateway (used by frontend DApp via DRPC_ACCESS_KEY)
  drpcUrl:        process.env.DRPC_RPC_URL          || 'http://rpc.meechain.run.place',
  drpcAccessKey:  process.env.DRPC_ACCESS_KEY        || '06411549-4e0b-46ac-943c-d4ae580a7a9b',

  // NodeCore: server-side proxy layer
  nodecoreKey:    process.env.NODECORE_API_KEY       || 'b5541d67bbd86c9b474928976884b360ab38e8bcbd78fd88d354f3882194c2ef',

  // NodeCloud: infra + monitoring
  nodecloudKey:   process.env.NODECLOUD_API_KEY      || '339f5fe83effa15f7e37939d9a53f6b3109364a599668d33a5eb8146099c76c5',
  nodecloudStats: process.env.NODECLOUD_STATS_KEY    || 'fdcefb680e09a2605b2c3be8cdca65f45962780fb76e598c443fec7063d13d30',

  // Fallback: original Ritual Chain endpoint
  fallbackUrl:    process.env.VITE_RPC_URL           || 'https://ritual-chain--pouaun2499.replit.app',
  chainId:        parseInt(process.env.CHAIN_ID)     || 13390,
};

// ── Contract Addresses ───────────────────────────────────────────
const CONTRACTS = {
  token:   process.env.VITE_TOKEN_CONTRACT_ADDRESS   || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  nft:     process.env.VITE_NFT_CONTRACT_ADDRESS     || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  staking: process.env.VITE_STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
};

// ── Init Web3 (tries dRPC first, falls back to original RPC) ─────
const web3 = new MeeChainWeb3(
  RPC_CONFIG.drpcUrl,   // primary: dRPC gateway
  CONTRACTS
);
web3.connect().then(ok => {
  if (ok) {
    console.log(`✅ Web3 connected via dRPC: ${RPC_CONFIG.drpcUrl}`);
  } else {
    console.log('⚠️  dRPC offline — trying fallback RPC...');
    const web3Fallback = new MeeChainWeb3(RPC_CONFIG.fallbackUrl, CONTRACTS);
    web3Fallback.connect().then(ok2 => {
      if (ok2) {
        console.log(`✅ Web3 connected via fallback: ${RPC_CONFIG.fallbackUrl}`);
        // Swap to fallback
        Object.assign(web3, web3Fallback);
      } else {
        console.log('⚠️  All RPC offline — using mock data');
      }
    });
  }
});

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
  - Network: Ritual Chain (Chain ID: 13390)
  - RPC: http://rpc.meechain.run.place (dRPC gateway)
  - MeeChain Mainnet: TPS 2,400 | Validators 128 | Fee 0.0001 MEE
  - MEE Token ราคาปัจจุบัน ~0.0842 USDT (+12.5% 24h)

📋 Smart Contracts
  - MEE Token:   0x5FbDB2315678afecb367f032d93F642f64180aa3
  - NFT:         0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  - Staking:     0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

🖼️ NFT บน MeeChain
  - สร้าง NFT: เมนู "ตลาด NFT" → "สร้าง NFT" → อัปโหลดไฟล์ → ตั้งชื่อและราคา → Mint
  - ซื้อขาย NFT: เมนู "ตลาด NFT" → เลือก NFT → กดซื้อ (ต้องเชื่อมต่อ Wallet ก่อน)
  - NFT ยอดนิยม: MeeBot Alpha #001 (240 MEE), Space Astronaut #007 (320 MEE), Chain Guardian #003 (560 MEE)

⛏️ Staking & Mining
  - MEE Standard Pool: APY 85%, Lock 30 วัน, ขั้นต่ำ 100 MEE
  - MEE Premium Pool: APY 148%, Lock 90 วัน, ขั้นต่ำ 1,000 MEE
  - Ritual Chain Pool: APY 248%, Lock 180 วัน, ขั้นต่ำ 5,000 MEE

👛 Wallet
  - รองรับ: MetaMask, WalletConnect, Coinbase Wallet
  - ฟีเจอร์: ส่ง/รับ/Swap/ซื้อ MEE Token
  - เพิ่ม Network: Chain ID 13390, RPC http://rpc.meechain.run.place

🔧 Infrastructure
  - dRPC Gateway: จัดการ RPC routing, failover, caching
  - NodeCore: proxy layer ความเสถียรสูง
  - NodeCloud: monitoring, cost intelligence, infra management

กฎ:
- ตอบภาษาไทยเป็นหลัก (ภาษาอังกฤษเฉพาะคำเทคนิคที่จำเป็น)
- ตอบกระชับ ชัดเจน เป็นประโยชน์
- ถ้าไม่รู้ให้บอกตรงๆ อย่าแต่งข้อมูล
- แนะนำผู้ใช้ไปยังเมนูที่เกี่ยวข้องใน Dashboard เสมอ`;

// ── Chat History Storage (in-memory per session) ─────────────────
const sessions = new Map();

// ── Helper: NodeCloud Stats API ──────────────────────────────────
async function fetchNodeCloudStats() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.nodecloud.io',
      path: '/v1/stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RPC_CONFIG.nodecloudStats}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ ok: true, data: JSON.parse(data) }); }
        catch { resolve({ ok: false, raw: data }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.end();
  });
}

// ── API: Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    model:     'gpt-5-mini',
    bot:       'MeeBot AI',
    web3:      web3.connected,
    chainId:   RPC_CONFIG.chainId,
    rpc:       RPC_CONFIG.drpcUrl,
    contracts: CONTRACTS,
    uptime:    Math.floor(process.uptime()),
  });
});

// ── API: Network Info (for frontend DApp / MetaMask add network) ──
app.get('/api/network', (req, res) => {
  res.json({
    chainId:         `0x${RPC_CONFIG.chainId.toString(16)}`,
    chainName:       'Ritual Chain (MeeChain)',
    rpcUrls:         [RPC_CONFIG.drpcUrl],
    nativeCurrency:  { name: 'MeeChain', symbol: 'MEE', decimals: 18 },
    blockExplorerUrls: ['https://ritual-chain--pouaun2499.replit.app'],
    contracts:       CONTRACTS,
  });
});

// ── API: Web3 Status ──────────────────────────────────────────────
app.get('/api/web3/status', async (req, res) => {
  try {
    const stats = await web3.getChainStats();
    res.json({
      connected:   web3.connected,
      blockNumber: stats.blockNumber || null,
      rpc:         RPC_CONFIG.drpcUrl,
      chainId:     RPC_CONFIG.chainId,
      contracts:   CONTRACTS,
    });
  } catch(e) {
    res.json({ connected: false, error: e.message });
  }
});

// ── API: Chain Stats ──────────────────────────────────────────────
app.get('/api/chain/stats', async (req, res) => {
  try {
    const stats = await web3.getChainStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: NodeCloud Stats (monitoring) ────────────────────────────
app.get('/api/nodecloud/stats', async (req, res) => {
  const result = await fetchNodeCloudStats();
  res.json({
    source:      'NodeCloud Statistics API',
    key_hint:    RPC_CONFIG.nodecloudStats.slice(0,8) + '...',
    ...result,
  });
});

// ── API: Token Info ───────────────────────────────────────────────
app.get('/api/token/info', async (req, res) => {
  try {
    const info = await web3.getTokenInfo();
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Token Balance ────────────────────────────────────────────
app.get('/api/token/balance/:address', async (req, res) => {
  try {
    const balance = await web3.getTokenBalance(req.params.address);
    res.json({ address: req.params.address, balance, symbol: 'MEE' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: NFT Info ─────────────────────────────────────────────────
app.get('/api/nft/info', async (req, res) => {
  try {
    const info = await web3.getNFTInfo();
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: NFT Balance ──────────────────────────────────────────────
app.get('/api/nft/balance/:address', async (req, res) => {
  try {
    const balance = await web3.getNFTBalance(req.params.address);
    res.json({ address: req.params.address, balance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Staking Info ─────────────────────────────────────────────
app.get('/api/staking/info', async (req, res) => {
  try {
    const info = await web3.getStakingInfo();
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: User Staking ─────────────────────────────────────────────
app.get('/api/staking/user/:address', async (req, res) => {
  try {
    const data = await web3.getUserStaking(req.params.address);
    res.json({ address: req.params.address, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Recent Transactions ──────────────────────────────────────
app.get('/api/chain/transactions', async (req, res) => {
  try {
    const txs = await web3.getRecentTransactions(5);
    res.json({ transactions: txs, live: web3.connected });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Chat (Streaming SSE) ─────────────────────────────────────
app.post('/api/chat/stream', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  const history = sessions.get(sessionId);
  history.push({ role: 'user', content: message });
  const trimmed = history.slice(-20);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let fullReply = '';
  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'system', content: MEEBOT_SYSTEM_PROMPT }, ...trimmed],
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
      messages: [{ role: 'system', content: MEEBOT_SYSTEM_PROMPT }, ...history.slice(-20)],
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

// ── API: NFT Description Generator (AI) ──────────────────────────
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
ใช้ภาษาสร้างสรรค์ เหมาะสำหรับ NFT บน MeeChain Blockchain (Ritual Chain, Chain ID: 13390)`
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
const PORT = parseInt(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MeeBot AI Server running on http://0.0.0.0:${PORT}`);
  console.log(`   OpenAI Base URL : ${baseURL}`);
  console.log(`   Model           : gpt-5-mini`);
  console.log(`   dRPC RPC URL    : ${RPC_CONFIG.drpcUrl}`);
  console.log(`   Fallback RPC    : ${RPC_CONFIG.fallbackUrl}`);
  console.log(`   Chain ID        : ${RPC_CONFIG.chainId}`);
  console.log(`   Contracts:`);
  console.log(`     Token   : ${CONTRACTS.token}`);
  console.log(`     NFT     : ${CONTRACTS.nft}`);
  console.log(`     Staking : ${CONTRACTS.staking}`);
});
