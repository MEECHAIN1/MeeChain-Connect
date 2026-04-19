/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  MeeChain Cloudflare Worker v2.0 — Smart RPC Gateway               ║
 * ║                                                                      ║
 * ║  สถานการณ์ปัจจุบัน (2026-04):                                        ║
 * ║  - origin server (58.11.89.11:8080) ยังไม่เปิด port forwarding       ║
 * ║  - Worker นี้ทำ mock RPC ที่ถูกต้องสำหรับ MetaMask + web3           ║
 * ║  - เมื่อ port forwarding พร้อม → เปลี่ยน ORIGIN_ONLINE = true        ║
 * ║                                                                      ║
 * ║  Routes ที่รองรับ:                                                    ║
 * ║    POST /          → JSON-RPC gateway (eth_chainId, eth_blockNumber)  ║
 * ║    POST /rpc       → JSON-RPC gateway (alias)                         ║
 * ║    GET  /health    → health check JSON                                ║
 * ║    GET  /api/*     → proxy ไป origin (ถ้า online) หรือ mock          ║
 * ║    GET  /*         → proxy ไป origin (ถ้า online) หรือ static        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * วิธี deploy: Cloudflare Dashboard → Workers & Pages → Create Worker
 * → ใส่ code นี้ → Save & Deploy → Custom Domain: rpc.meechain.live
 */

// ══════════════════════════════════════════════════════════════════
// CONFIG — แก้ตรงนี้เมื่อ port forwarding พร้อม
// ══════════════════════════════════════════════════════════════════
const CONFIG = {
  // ─── Origin Server ──────────────────────────────────────────────
  ORIGIN_IP:     '58.11.89.11',
  ORIGIN_PORT:   8080,
  // ตั้งเป็น true เมื่อ router port forward 80→8080 พร้อมแล้ว
  ORIGIN_ONLINE: false,

  // ─── MeeChain Ritual Chain Info ─────────────────────────────────
  CHAIN_ID:      13390,        // 0x344e
  CHAIN_ID_HEX:  '0x344e',

  // ─── Contract Addresses (MeeChain Ritual Chain mainnet) ─────────
  CONTRACTS: {
    token:   '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    nft:     '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    staking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    portal:  '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    dao:     '0x0000000000000000000000000000000000000000',
  },

  // ─── CORS ────────────────────────────────────────────────────────
  ALLOWED_ORIGINS: [
    'https://app.meechain.live',
    'https://rpc.meechain.live',
    'https://meechain.live',
    'https://meebot.io',
    'https://www.meebot.io',
    'https://meechain.xyz',
    'https://app.meechain.xyz',
    'http://localhost:3000',
    'http://localhost:8080',
  ],
};

// ══════════════════════════════════════════════════════════════════
// MOCK RPC — ตอบ MetaMask / ethers.js เมื่อ chain จริงไม่พร้อม
// ══════════════════════════════════════════════════════════════════
let mockBlockNumber = 1234567;

function handleMockRpc(body) {
  const { method, id, params } = body;
  mockBlockNumber += Math.floor(Math.random() * 3) + 1; // simulate new blocks

  const ok = (result) => ({ jsonrpc: '2.0', id: id ?? null, result });
  const err = (code, msg) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message: msg } });

  switch (method) {
    // ── Chain info ────────────────────────────────────────────
    case 'eth_chainId':
      return ok(CONFIG.CHAIN_ID_HEX);

    case 'net_version':
      return ok(String(CONFIG.CHAIN_ID));

    case 'net_listening':
      return ok(true);

    case 'eth_protocolVersion':
      return ok('0x41');

    // ── Block data ─────────────────────────────────────────────
    case 'eth_blockNumber':
      return ok('0x' + mockBlockNumber.toString(16));

    case 'eth_getBlockByNumber': {
      const bn = params?.[0] === 'latest' ? mockBlockNumber : parseInt(params?.[0], 16);
      return ok({
        number:           '0x' + (bn || mockBlockNumber).toString(16),
        hash:             '0x' + 'a'.repeat(64),
        parentHash:       '0x' + 'b'.repeat(64),
        nonce:            '0x0000000000000000',
        sha3Uncles:       '0x' + 'c'.repeat(64),
        logsBloom:        '0x' + '0'.repeat(512),
        transactionsRoot: '0x' + 'd'.repeat(64),
        stateRoot:        '0x' + 'e'.repeat(64),
        miner:            '0x' + 'f'.repeat(40),
        difficulty:       '0x1',
        totalDifficulty:  '0x1',
        extraData:        '0x4d6565436861696e',
        size:             '0x1000',
        gasLimit:         '0x1c9c380',
        gasUsed:          '0x5208',
        timestamp:        '0x' + Math.floor(Date.now() / 1000).toString(16),
        transactions:     [],
        uncles:           [],
      });
    }

    case 'eth_getBlockByHash':
      return ok(null);

    // ── Account & balance ──────────────────────────────────────
    case 'eth_getBalance':
      // Return small amount so MetaMask shows balance
      return ok('0x56BC75E2D630FFFFF'); // ~100 MEE in wei

    case 'eth_getTransactionCount':
      return ok('0x1');

    case 'eth_getCode': {
      const addr = (params?.[0] || '').toLowerCase();
      const knownContracts = [
        CONFIG.CONTRACTS.token.toLowerCase(),
        CONFIG.CONTRACTS.nft.toLowerCase(),
        CONFIG.CONTRACTS.staking.toLowerCase(),
      ];
      // Return non-empty bytecode for known contracts
      return ok(knownContracts.includes(addr) ? '0x60806040' : '0x');
    }

    case 'eth_getStorageAt':
      return ok('0x' + '0'.repeat(64));

    // ── Gas & fees ────────────────────────────────────────────
    case 'eth_gasPrice':
      return ok('0x3B9ACA00'); // 1 Gwei

    case 'eth_maxPriorityFeePerGas':
      return ok('0x3B9ACA00'); // 1 Gwei

    case 'eth_feeHistory':
      return ok({
        oldestBlock:   '0x' + (mockBlockNumber - 5).toString(16),
        baseFeePerGas: ['0x3B9ACA00', '0x3B9ACA00', '0x3B9ACA00'],
        gasUsedRatio:  [0.5, 0.5, 0.5],
        reward:        [['0x0'], ['0x0'], ['0x0']],
      });

    case 'eth_estimateGas':
      return ok('0x5208'); // 21000 standard gas

    // ── Transaction ───────────────────────────────────────────
    case 'eth_sendRawTransaction':
      return err(-32000, 'Upstream unavailable: cannot perform mutating RPC in offline mode');

    case 'eth_getTransactionByHash':
      return ok(null);

    case 'eth_getTransactionReceipt':
      return ok(null);

    case 'eth_call': {
      // Basic ERC-20 / contract calls — return zeros (chain not connected)
      // MetaMask uses this to check balances
      return ok('0x' + '0'.repeat(64));
    }

    // ── Logs & filters ────────────────────────────────────────
    case 'eth_getLogs':
      return ok([]);

    case 'eth_newFilter':
    case 'eth_newBlockFilter':
      return ok('0x1');

    case 'eth_getFilterChanges':
    case 'eth_getFilterLogs':
      return ok([]);

    case 'eth_uninstallFilter':
      return ok(true);

    // ── Subscription (for walletconnect/websocket) ────────────
    case 'eth_subscribe':
      return ok('0x' + Math.random().toString(16).slice(2, 18));

    case 'eth_unsubscribe':
      return ok(true);

    // ── Network config (for MetaMask wallet_addEthereumChain) ─
    case 'eth_syncing':
      return ok(false); // not syncing = fully synced

    case 'web3_clientVersion':
      return ok('MeeChain/v2.0.0/linux/node');

    case 'web3_sha3':
      return ok('0x' + 'a'.repeat(64));

    default:
      return err(-32601, `Method "${method}" not found`);
  }
}

// ══════════════════════════════════════════════════════════════════
// CORS HELPERS
// ══════════════════════════════════════════════════════════════════
function getCorsHeaders(origin) {
  const allowed = CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Max-Age':       '86400',
  };
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

// ══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors   = getCorsHeaders(origin);
    const path   = url.pathname;
    const method = request.method;

    // ── CORS Preflight ─────────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── Health Check ───────────────────────────────────────────
    if (method === 'GET' && (path === '/health' || path === '/api/health')) {
      return jsonResponse({
        status:  'ok',
        worker:  'MeeChain-CF-Worker-v2.0',
        chainId: CONFIG.CHAIN_ID,
        chainIdHex: CONFIG.CHAIN_ID_HEX,
        chainName: 'MeeChain Ritual Chain',
        rpc:     `https://rpc.meechain.live`,
        rpcMode: CONFIG.ORIGIN_ONLINE ? 'proxy' : 'mock',
        origin:  `http://${CONFIG.ORIGIN_IP}:${CONFIG.ORIGIN_PORT}`,
        originOnline: CONFIG.ORIGIN_ONLINE,
        contracts: CONFIG.CONTRACTS,
        blockNumber: '0x' + mockBlockNumber.toString(16),
        ts: new Date().toISOString(),
      }, 200, cors);
    }

    // ── /api/network — EIP-3085 network config for MetaMask ───
    if (method === 'GET' && path === '/api/network') {
      return jsonResponse({
        chainId:     CONFIG.CHAIN_ID_HEX,
        chainIdDecimal: CONFIG.CHAIN_ID,
        chainName:   'MeeChain Ritual Chain',
        rpcUrls:     ['https://rpc.meechain.live'],
        nativeCurrency: { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
        blockExplorerUrls: ['https://app.meechain.live/explorer.html'],
        contracts:   CONFIG.CONTRACTS,
      }, 200, cors);
    }

    // ── JSON-RPC: POST / or POST /rpc ─────────────────────────
    if (method === 'POST' && (path === '/' || path === '/rpc' || path === '/api/rpc')) {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
          400, cors
        );
      }

      // ── Try to proxy to origin first (if online) ─────────────
      if (CONFIG.ORIGIN_ONLINE) {
        try {
          const originUrl = `http://${CONFIG.ORIGIN_IP}:${CONFIG.ORIGIN_PORT}/rpc`;
          const proxyRes  = await fetch(originUrl, {
            method:  'POST',
            headers: {
              'Content-Type':     'application/json',
              'X-Forwarded-For':  request.headers.get('CF-Connecting-IP') || '',
              'X-Forwarded-Host': url.hostname,
            },
            body: JSON.stringify(body),
            // Cloudflare Worker fetch timeout
            signal: AbortSignal.timeout(8000),
          });
          const data = await proxyRes.json();
          return jsonResponse(data, 200, cors);
        } catch (proxyErr) {
          console.warn(`[Worker] Origin proxy failed: ${proxyErr.message} — falling back to mock`);
        }
      }

      // ── Mock RPC (origin offline / unreachable) ────────────
      // Handle batch requests
      if (Array.isArray(body)) {
        const results = body.map(req => handleMockRpc(req));
        return jsonResponse(results, 200, cors);
      }
      const result = handleMockRpc(body);
      return jsonResponse(result, 200, cors);
    }

    // ── Proxy all other requests to origin ────────────────────
    if (CONFIG.ORIGIN_ONLINE) {
      try {
        const originUrl = `http://${CONFIG.ORIGIN_IP}:${CONFIG.ORIGIN_PORT}${path}${url.search}`;
        const fwdHeaders = new Headers(request.headers);
        fwdHeaders.set('X-Forwarded-For',   request.headers.get('CF-Connecting-IP') || '');
        fwdHeaders.set('X-Forwarded-Proto', 'https');
        fwdHeaders.set('X-Forwarded-Host',  url.hostname);
        fwdHeaders.delete('CF-Connecting-IP');
        fwdHeaders.delete('CF-Ray');

        const proxyRes  = await fetch(originUrl, {
          method,
          headers: fwdHeaders,
          body: (method !== 'GET' && method !== 'HEAD') ? request.body : undefined,
          redirect: 'manual',
          signal: AbortSignal.timeout(15000),
        });

        const resHeaders = new Headers(proxyRes.headers);
        for (const [k, v] of Object.entries(cors)) resHeaders.set(k, v);
        resHeaders.set('X-Served-By', 'MeeChain-CF-Worker-v2.0');

        return new Response(proxyRes.body, { status: proxyRes.status, headers: resHeaders });
      } catch (proxyErr) {
        // Origin down — return 502 with instructions
        return jsonResponse({
          error:   'origin_unreachable',
          message: `Origin server offline (${CONFIG.ORIGIN_IP}:${CONFIG.ORIGIN_PORT})`,
          detail:  proxyErr.message,
          fixes: [
            'ตรวจสอบ Router port forward: WAN 80 → 192.168.1.113:8080',
            'ตรวจสอบ Windows Firewall: allow TCP 8080',
            'ตรวจสอบ server.js running: pm2 status',
            `ทดสอบ: curl http://${CONFIG.ORIGIN_IP}:${CONFIG.ORIGIN_PORT}/health`,
          ],
          worker: 'MeeChain-CF-Worker-v2.0',
          ts: new Date().toISOString(),
        }, 502, cors);
      }
    }

    // ── Origin offline: return 404 for non-RPC routes ─────────
    return jsonResponse({
      error: 'worker_mode',
      message: 'MeeChain Worker is running in RPC-mock mode. Origin server not yet reachable.',
      rpc:    'https://rpc.meechain.live (POST /rpc for JSON-RPC)',
      health: 'https://rpc.meechain.live/health',
      worker: 'MeeChain-CF-Worker-v2.0',
    }, 404, cors);
  },
};
