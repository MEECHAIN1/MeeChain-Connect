// ===== MeeChain MeeBot AI + Web3 Server =====
// Key Architecture:
//   dRPC Access Key    → frontend/DApp RPC gateway
//   NodeCore API Key   → server-side proxy layer
//   NodeCloud API Key  → infra management
//   NodeCloud Stats    → monitoring & cost intelligence
// =====================================================
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const OpenAI    = require('openai');
const fs        = require('fs');
const yaml      = require('js-yaml');
const path      = require('path');
const os        = require('os');
const https     = require('https');
const http      = require('http');
const WebSocket = require('ws');
const { MeeChainWeb3 } = require('./src/web3/contracts');

// ── IPv4-only DNS resolver (สำหรับ environment ที่ไม่รองรับ IPv6) ──
// rpc.meechain.live มีเฉพาะ AAAA record → ต้อง force IPv4 หรือใช้ IP โดยตรง
const dnsLookup4 = (hostname, options, callback) => {
  const dns = require('dns');
  dns.lookup(hostname, { family: 4, ...options }, (err, address, family) => {
    if (err) {
      // IPv4 ไม่พบ ลอง IPv6
      dns.lookup(hostname, { family: 6, ...options }, callback);
    } else {
      callback(null, address, family);
    }
  });
};

const app = express();
const allowedOrigins = [
  'https://meebot.io',
  'https://www.meebot.io',
  // .live domains (PRIMARY — Cloudflare Tunnel ใช้งานได้)
  'https://app.meechain.live',
  'https://rpc.meechain.live',
  // .xyz domains (fallback)
  'https://app.meechain.xyz',
  'https://rpc.meechain.xyz',
  'https://meebot-io.pages.dev',
  ...(process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow no-origin requests (curl, mobile apps, etc.)
    if (!origin) return cb(null, true);
    // Allow any meechain.live / meechain.xyz / meebot.io subdomain + localhost
    if (
      allowedOrigins.includes(origin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
      /^https:\/\/[\w-]+\.meechain\.live$/.test(origin) ||
      /^https:\/\/[\w-]+\.meechain\.xyz$/.test(origin)  ||
      /^https:\/\/[\w-]+\.meebot\.io$/.test(origin)     ||
      /^https:\/\/[\w-]+\.pages\.dev$/.test(origin)
    ) return cb(null, true);
    return cb(new Error('CORS blocked'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));
app.options('*', cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── RPC Configuration ────────────────────────────────────────────
const RPC_CONFIG = {
  // Primary: dRPC gateway (used by frontend DApp via DRPC_ACCESS_KEY)
  drpcUrl:        process.env.DRPC_RPC_URL          || 'https://rpc.meechain.live',
  drpcAccessKey:  process.env.DRPC_ACCESS_KEY,

  // NodeCore: server-side proxy layer
  nodecoreKey:    process.env.NODECORE_API_KEY,

  // NodeCloud: infra + monitoring
  nodecloudKey:   process.env.NODECLOUD_API_KEY,
  nodecloudStats: process.env.NODECLOUD_STATS_KEY,
  // Fallback: original Ritual Chain endpoint
  fallbackUrl:    process.env.VITE_RPC_URL           || 'https://rpc.meechain.live',
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

// ── Health Check (root level — for rpc.meechain.live/health & app.meechain.live/health) ──
app.get('/health', (req, res) => {
  const host = req.hostname || '';
  const isRpcHost = host.includes('rpc.');
  res.json({
    status:   'ok',
    service:  isRpcHost ? 'MeeChain RPC Gateway' : 'MeeChain App Server',
    host:     host,
    chainId:  RPC_CONFIG.chainId,
    rpc:      RPC_CONFIG.drpcUrl,
    web3:     web3.connected,
    uptime:   Math.floor(process.uptime()),
    version:  '2.0.0',
    ts:       new Date().toISOString(),
  });
});

// ── RPC Proxy (JSON-RPC forward) ─────────────────────────────────
// Handles: POST / and POST /rpc  →  used by rpc.meechain.xyz
// Forwards JSON-RPC calls to the actual Ritual Chain node
async function handleRpcProxy(req, res) {
  const body = req.body;
  if (!body || !body.jsonrpc) {
    return res.status(400).json({ error: 'Invalid JSON-RPC request' });
  }

  // Pick target RPC (dRPC primary, fallback secondary)
  const targets = [
    RPC_CONFIG.drpcUrl,
    RPC_CONFIG.fallbackUrl,
  ].filter(Boolean);

  let lastError = null;
  for (const target of targets) {
    try {
      const url = new URL(target);
      const isHttps = url.protocol === 'https:';
      const reqLib  = isHttps ? https : http;
      const postData = JSON.stringify(body);

      const result = await new Promise((resolve, reject) => {
        const options = {
          hostname: url.hostname,
          port:     url.port || (isHttps ? 443 : 80),
          path:     url.pathname || '/',
          method:   'POST',
          headers:  {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 10000,
        };
        // Attach dRPC access key if available
        if (RPC_CONFIG.drpcAccessKey && target === RPC_CONFIG.drpcUrl) {
          options.headers['Authorization'] = `Bearer ${RPC_CONFIG.drpcAccessKey}`;
        }
        const r = reqLib.request(options, (resp) => {
          let data = '';
          resp.on('data', d => data += d);
          resp.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch { reject(new Error('Invalid JSON from RPC node')); }
          });
        });
        r.on('error', reject);
        r.on('timeout', () => { r.destroy(); reject(new Error('RPC timeout')); });
        r.write(postData);
        r.end();
      });

      // Forward the RPC response
      return res.json(result);
    } catch (err) {
      lastError = err;
      console.warn(`RPC proxy failed for ${target}: ${err.message}`);
    }
  }

  // All targets failed — return JSON-RPC error
  return res.status(502).json({
    jsonrpc: '2.0',
    id:      body.id || null,
    error: {
      code:    -32603,
      message: `RPC unavailable: ${lastError?.message || 'all nodes offline'}`,
    },
  });
}

app.post('/',    handleRpcProxy);   // rpc.meechain.xyz  POST /
app.post('/rpc', handleRpcProxy);   // rpc.meechain.xyz  POST /rpc

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
const PORT   = parseInt(process.env.PORT) || 3000;
const server = http.createServer(app);

// ════════════════════════════════════════════════════════
//  PHASE 2 — WebSocket Real-time Server
// ════════════════════════════════════════════════════════
const wss = new WebSocket.Server({ server, path: '/ws' });

let wsBlockNumber  = 1_248_753;
let wsClients      = new Set();
const WS_INTERVAL  = 5000;   // push every 5 seconds

function randomHex(len) {
  return '0x' + [...Array(len)].map(() => Math.floor(Math.random()*16).toString(16)).join('');
}
function genWsBlock() {
  wsBlockNumber++;
  return {
    type:        'new_block',
    blockNumber: wsBlockNumber,
    hash:        randomHex(64),
    timestamp:   Math.floor(Date.now() / 1000),
    txCount:     50 + Math.floor(Math.random() * 200),
    gasUsed:     (1_000_000 + Math.floor(Math.random() * 5_000_000)).toString(),
    miner:       randomHex(40),
    tps:         80 + Math.floor(Math.random() * 60),
  };
}
function genWsTx() {
  const types = ['Transfer', 'NFT Mint', 'Stake', 'Unstake', 'Swap'];
  return {
    type:        'new_tx',
    hash:        randomHex(64),
    blockNumber: wsBlockNumber,
    from:        randomHex(40),
    to:          randomHex(40),
    value:       (Math.random() * 500).toFixed(4),
    txType:      types[Math.floor(Math.random() * types.length)],
    timestamp:   Math.floor(Date.now() / 1000),
  };
}

wss.on('connection', (ws, req) => {
  wsClients.add(ws);
  console.log(`🔌 WS client connected (total: ${wsClients.size})`);

  // Send welcome + current stats
  ws.send(JSON.stringify({
    type:        'connected',
    chainId:     RPC_CONFIG.chainId,
    blockNumber: wsBlockNumber,
    rpc:         RPC_CONFIG.drpcUrl,
    contracts:   CONTRACTS,
    ts:          Date.now(),
  }));

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'ping') ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      if (data.type === 'subscribe') {
        ws.subscriptions = data.channels || ['blocks', 'txs', 'price'];
        ws.send(JSON.stringify({ type: 'subscribed', channels: ws.subscriptions }));
      }
    } catch {}
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`🔌 WS client disconnected (total: ${wsClients.size})`);
  });
  ws.on('error', () => wsClients.delete(ws));
});

// Broadcast to all clients
function wsBroadcast(data) {
  const msg = JSON.stringify(data);
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(msg); } catch {}
    }
  });
}

// Push new block every 12s (Ritual Chain block time)
setInterval(() => {
  const block = genWsBlock();
  wsBroadcast(block);
  // Also push 2-5 new transactions with each block
  const txCount = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < txCount; i++) wsBroadcast(genWsTx());
}, 12000);

// Push price update every 30s
setInterval(() => {
  const basePrice  = 0.0842;
  const jitter     = (Math.random() - 0.5) * 0.004;
  wsBroadcast({
    type:      'price_update',
    symbol:    'MEE',
    price:     (basePrice + jitter).toFixed(4),
    change24h: '+12.5%',
    ts:        Date.now(),
  });
}, 30000);

// ════════════════════════════════════════════════════════
//  PHASE 2 — NFT Marketplace API
// ════════════════════════════════════════════════════════

// GET /api/nft/marketplace  — list all NFTs for sale
app.get('/api/nft/marketplace', async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 12;
  const sort  = req.query.sort            || 'recent';  // recent | price_asc | price_desc | rarity

  // Mock marketplace listings (in prod: query on-chain events or indexer DB)
  const rarities = ['Common', 'Rare', 'Legendary'];
  const elements  = ['Fire', 'Water', 'Earth', 'Wind', 'Lightning', 'Void'];
  const botTypes  = ['Alpha Bot', 'Warrior Bot', 'Lotus Bot', 'Ritual Bot'];

  const listings = [...Array(50)].map((_, i) => {
    const id      = i + 1;
    const rarityIdx = id % 20 === 0 ? 2 : id % 5 === 0 ? 1 : 0;
    const price   = rarityIdx === 2 ? 500 + id * 10 : rarityIdx === 1 ? 200 + id * 5 : 50 + id * 2;
    return {
      tokenId:   id,
      name:      `MeeBot #${String(id).padStart(3, '0')}`,
      rarity:    rarities[rarityIdx],
      price:     price,
      priceUsd:  (price * 0.0842).toFixed(2),
      seller:    randomHex(40),
      element:   elements[id % 6],
      botType:   botTypes[id % 4],
      power:     rarityIdx === 2 ? 9000 + id * 10 : rarityIdx === 1 ? 6000 + id * 20 : 2000 + id * 30,
      speed:     rarityIdx === 2 ? 8800 + id * 8  : rarityIdx === 1 ? 5500 + id * 18 : 1800 + id * 25,
      listedAt:  Date.now() - id * 3600000,
      contract:  CONTRACTS.nft,
    };
  });

  // Sort
  if (sort === 'price_asc')  listings.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') listings.sort((a, b) => b.price - a.price);
  if (sort === 'rarity') {
    const order = { Legendary: 0, Rare: 1, Common: 2 };
    listings.sort((a, b) => order[a.rarity] - order[b.rarity]);
  }

  const start = (page - 1) * limit;
  res.json({
    listings: listings.slice(start, start + limit),
    total:    listings.length,
    page,
    pages:    Math.ceil(listings.length / limit),
    live:     web3.connected,
  });
});

// GET /api/nft/token/:id  — single NFT detail
app.get('/api/nft/token/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 0) return res.status(400).json({ error: 'Invalid token ID' });

  const rarities = ['Common', 'Rare', 'Legendary'];
  const elements  = ['Fire', 'Water', 'Earth', 'Wind', 'Lightning', 'Void'];
  const botTypes  = ['Alpha Bot', 'Warrior Bot', 'Lotus Bot', 'Ritual Bot'];
  const rarityIdx = id % 20 === 0 ? 2 : id % 5 === 0 ? 1 : 0;

  res.json({
    tokenId:   id,
    name:      `MeeBot #${String(id).padStart(3, '0')}`,
    rarity:    rarities[rarityIdx],
    element:   elements[id % 6],
    botType:   botTypes[id % 4],
    power:     rarityIdx === 2 ? 9000 + id * 10 : rarityIdx === 1 ? 6000 + id * 20 : 2000 + id * 30,
    speed:     rarityIdx === 2 ? 8800 + id * 8  : rarityIdx === 1 ? 5500 + id * 18 : 1800 + id * 25,
    owner:     randomHex(40),
    contract:  CONTRACTS.nft,
    mintedAt:  Date.now() - id * 86400000,
    history:   [
      { event: 'Minted',    from: '0x0000...0000', to: randomHex(40), price: 0,        time: Date.now() - id * 86400000 },
      { event: 'Transferred', from: randomHex(40), to: randomHex(40), price: 0,        time: Date.now() - id * 43200000 },
    ],
    live:      web3.connected,
  });
});

// POST /api/nft/mint  — mint via server (for non-MetaMask users)
app.post('/api/nft/mint', async (req, res) => {
  const { name, uri, toAddress } = req.body;
  if (!name || !toAddress) return res.status(400).json({ error: 'name and toAddress required' });
  if (!/^0x[0-9a-fA-F]{40}$/.test(toAddress)) return res.status(400).json({ error: 'Invalid address' });

  // In prod: call MeeBotNFT.safeMint() with owner private key
  // For demo: return mock tx
  res.json({
    success:   true,
    message:   'NFT Mint queued (MetaMask mint is instant, server mint is queued)',
    tokenId:   Math.floor(Math.random() * 10000),
    txHash:    randomHex(64),
    toAddress,
    name,
    live:      false,
    note:      'Use MetaMask + wallet.js for real on-chain mint',
  });
});

// ════════════════════════════════════════════════════════
//  PHASE 2 — Staking/Portal API (extended)
// ════════════════════════════════════════════════════════

// GET /api/portal/info  — portal stats
app.get('/api/portal/info', async (req, res) => {
  try {
    if (web3.connected) {
      const stats = await web3.getPortalStats?.() || null;
      if (stats) return res.json({ ...stats, live: true });
    }
  } catch {}

  // Mock portal stats
  res.json({
    totalEntered:    1_284 + Math.floor(Math.random() * 50),
    totalOfferings:  52_840 + Math.floor(Math.random() * 100),
    totalCeremonies: 247 + Math.floor(Math.random() * 10),
    contractBalance: (42.5 + Math.random()).toFixed(4),
    fee:             '0.001 MEE',
    pools: [
      { id: 'standard', name: 'MEE Standard Pool', apy: 85,  lockDays: 30,  minStake: 100,  totalStaked: 8_524_100,  capacity: 72 },
      { id: 'premium',  name: 'MEE Premium Pool',  apy: 148, lockDays: 90,  minStake: 1000, totalStaked: 12_840_500, capacity: 58 },
      { id: 'ritual',   name: 'Ritual Chain Pool', apy: 248, lockDays: 180, minStake: 5000, totalStaked: 24_120_000, capacity: 34 },
    ],
    live: false,
  });
});

// GET /api/staking/pools  — pool list with live TVL
app.get('/api/staking/pools', (req, res) => {
  res.json({
    pools: [
      { id: 'standard', name: 'MEE Standard Pool', apy: 85,  lockDays: 30,  minStake: 100,  totalStaked: 8_524_100,  capacity: 72,  color: '#7C3AED' },
      { id: 'premium',  name: 'MEE Premium Pool',  apy: 148, lockDays: 90,  minStake: 1000, totalStaked: 12_840_500, capacity: 58,  color: '#F97316' },
      { id: 'ritual',   name: 'Ritual Chain Pool', apy: 248, lockDays: 180, minStake: 5000, totalStaked: 24_120_000, capacity: 34,  color: '#06B6D4' },
    ],
    totalTVL:  45_484_600,
    tvlUSD:    (45_484_600 * 0.0842).toFixed(0),
    live:      web3.connected,
  });
});

// POST /api/staking/calculate  — calculate reward
app.post('/api/staking/calculate', (req, res) => {
  const { amount, poolId, days } = req.body;
  if (!amount || !poolId) return res.status(400).json({ error: 'amount and poolId required' });

  const apyMap = { standard: 85, premium: 148, ritual: 248 };
  const apy    = apyMap[poolId] || 85;
  const d      = parseInt(days) || 30;
  const reward = parseFloat(amount) * apy / 100 * d / 365;

  res.json({
    amount:     parseFloat(amount),
    apy,
    days:       d,
    reward:     reward.toFixed(4),
    total:      (parseFloat(amount) + reward).toFixed(4),
    rewardUSD:  (reward * 0.0842).toFixed(2),
    dailyReward: (parseFloat(amount) * apy / 100 / 365).toFixed(6),
  });
});

// GET /api/staking/history/:address  — user staking history
app.get('/api/staking/history/:address', async (req, res) => {
  const addr = req.params.address;
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return res.status(400).json({ error: 'Invalid address' });

  // Mock history (prod: query events from blockchain indexer)
  const history = [
    { type: 'stake',   pool: 'MEE Standard Pool', amount: 1000, reward: 0,    tx: randomHex(64), time: Date.now() - 86400000 * 25 },
    { type: 'stake',   pool: 'MEE Premium Pool',  amount: 5000, reward: 0,    tx: randomHex(64), time: Date.now() - 86400000 * 15 },
    { type: 'reward',  pool: 'MEE Standard Pool', amount: 0,    reward: 58.2, tx: randomHex(64), time: Date.now() - 86400000 * 5  },
    { type: 'unstake', pool: 'MEE Standard Pool', amount: 1000, reward: 58.2, tx: randomHex(64), time: Date.now() - 86400000 * 2  },
  ];
  res.json({ address: addr, history, live: false });
});

// ════════════════════════════════════════════════════════
//  PHASE 2 — Block Explorer API (extended)
// ════════════════════════════════════════════════════════

// GET /api/blocks  — recent blocks
app.get('/api/blocks', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  try {
    const chainStats = await web3.getChainStats();
    const currentBlock = parseInt(chainStats.blockNumber) || 1_248_753;
    const blocks = [...Array(limit)].map((_, i) => ({
      number:    currentBlock - i,
      hash:      randomHex(64),
      timestamp: Math.floor(Date.now()/1000) - i * 12,
      txCount:   50 + Math.floor(Math.random() * 200),
      gasUsed:   (1_000_000 + Math.floor(Math.random() * 5_000_000)).toString(),
      miner:     randomHex(40),
      size:      10_000 + Math.floor(Math.random() * 50_000),
    }));
    res.json({ blocks, live: web3.connected });
  } catch {
    const blocks = [...Array(limit)].map((_, i) => ({
      number:    1_248_753 - i,
      hash:      randomHex(64),
      timestamp: Math.floor(Date.now()/1000) - i * 12,
      txCount:   50 + Math.floor(Math.random() * 200),
      gasUsed:   (1_000_000 + Math.floor(Math.random() * 5_000_000)).toString(),
      miner:     randomHex(40),
      size:      10_000 + Math.floor(Math.random() * 50_000),
    }));
    res.json({ blocks, live: false });
  }
});

// GET /api/blocks/:number  — single block
app.get('/api/blocks/:number', (req, res) => {
  const num = parseInt(req.params.number);
  if (isNaN(num)) return res.status(400).json({ error: 'Invalid block number' });
  res.json({
    number:     num,
    hash:       randomHex(64),
    parentHash: randomHex(64),
    timestamp:  Math.floor(Date.now()/1000) - (1_248_753 - num) * 12,
    miner:      randomHex(40),
    txCount:    50 + Math.floor(Math.random() * 200),
    gasUsed:    (1_000_000 + Math.floor(Math.random() * 5_000_000)).toString(),
    gasLimit:   '15000000',
    size:       10_000 + Math.floor(Math.random() * 50_000),
    chainId:    RPC_CONFIG.chainId,
    live:       false,
  });
});

// GET /api/tx/:hash  — tx detail
app.get('/api/tx/:hash', (req, res) => {
  const hash = req.params.hash;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return res.status(400).json({ error: 'Invalid tx hash' });
  const types = ['Transfer', 'NFT Mint', 'Stake', 'Unstake', 'Swap', 'Portal'];
  res.json({
    hash,
    blockNumber: 1_248_753 - Math.floor(Math.random() * 100),
    from:        randomHex(40),
    to:          randomHex(40),
    value:       (Math.random() * 500).toFixed(4),
    gas:         21000 + Math.floor(Math.random() * 100000),
    gasPrice:    '0.0001',
    status:      'success',
    txType:      types[Math.floor(Math.random() * types.length)],
    timestamp:   Math.floor(Date.now()/1000) - Math.floor(Math.random() * 3600),
    chainId:     RPC_CONFIG.chainId,
    live:        false,
  });
});

// GET /api/address/:addr  — address info
app.get('/api/address/:addr', async (req, res) => {
  const addr = req.params.addr;
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return res.status(400).json({ error: 'Invalid address' });

  try {
    const [bal, nftBal] = await Promise.allSettled([
      web3.getTokenBalance(addr),
      web3.getNFTBalance(addr),
    ]);
    res.json({
      address:    addr,
      meeBalance: bal.status === 'fulfilled'    ? bal.value    : '0',
      nftBalance: nftBal.status === 'fulfilled' ? nftBal.value : 0,
      txCount:    50 + Math.floor(Math.random() * 500),
      firstSeen:  Date.now() - 86400000 * 180,
      live:       web3.connected,
    });
  } catch {
    res.json({ address: addr, meeBalance: '0', nftBalance: 0, txCount: 0, live: false });
  }
});

// ── Start Server ──────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
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
  console.log(`   Domains:`);
  console.log(`     App  : https://${process.env.APP_DOMAIN || 'app.meechain.live'}`);
  console.log(`     RPC  : https://${process.env.RPC_DOMAIN || 'rpc.meechain.live'}`);
  console.log(`   Endpoints:`);
  console.log(`     GET  /health         (root health check)`);
  console.log(`     POST /               (JSON-RPC proxy)`);
  console.log(`     POST /rpc            (JSON-RPC proxy alias)`);
  console.log(`     GET  /api/health     (API health check)`);
});
