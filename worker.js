import { ethers } from 'ethers';

const DEFAULT_CONTRACTS = {
  token: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  nft: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  dao: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  portal: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
};

const STATIC_REPO_BASE = 'https://raw.githubusercontent.com/MEECHAIN1/MeeChain-Connect/main';

const NFT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function owner() view returns (address)',
  'function safeMint(address to, string uri) public returns (uint256)',
  'function getAttributes(uint256 tokenId) view returns (tuple(uint8 rarity, uint256 power, uint256 speed, string element, string botType, uint256 mintedAt))',
  'function getRarityLabel(uint256 tokenId) view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event MeeBotMinted(address indexed to, uint256 indexed tokenId, uint8 rarity)',
];

const PORTAL_ABI = [
  'function getPortalStats() view returns (uint256 totalLocked, uint256 totalCeremonies, uint256 contractBalance, address tokenAddr)',
  'function getUserPortal(address user) view returns (tuple(uint256 totalDeposited, uint256 totalWithdrawn, uint256 ceremoniesPerformed, uint256 lastActivity, bool isRegistered))',
  'function getUserCeremonies(address user) view returns (uint256[])',
  'function getCeremony(uint256 ceremonyId) view returns (tuple(uint256 id, address participant, uint8 ctype, uint256 amount, uint256 timestamp, bytes32 ritualHash, bool completed))',
  'function PORTAL_FEE() view returns (uint256)',
];

const CHAT_SYSTEM_PROMPT = `คุณคือ "MeeBot" ผู้ช่วยของแพลตฟอร์ม MeeChain
- ตอบภาษาไทยเป็นหลัก
- ตอบสั้น ชัด ใช้งานได้จริง
- ถ้าไม่แน่ใจให้บอกตรง ๆ
- ข้อมูลหลัก: MeeChain Ritual Chain, chainId 13390, RPC https://rpc.meechain.live`;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=UTF-8',
};

function tupleField(tuple, index, key) {
  if (!tuple) return undefined;
  return tuple[key] !== undefined ? tuple[key] : tuple[index];
}

function toBigInt(value) {
  if (typeof value === 'bigint') return value;
  if (value === undefined || value === null || value === '') return 0n;
  return BigInt(value);
}

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache',
    ...extra,
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({ 'Content-Type': 'application/json', ...extraHeaders }),
  });
}

function buildRpcGateway(env = {}) {
  return {
    primary: {
      type: 'IPv4',
      address: env.RPC_PRIMARY_IPV4 || '172.64.36.1',
      badge: '🥇 Primary RPC',
    },
    secondary: {
      type: 'IPv6',
      address: env.RPC_SECONDARY_IPV6 || '2a06:98c1:54::4b:43e8',
      badge: '🥈 Secondary RPC',
    },
    dns: {
      dot: {
        endpoint: env.RPC_DOT_ENDPOINT || 'ohsut0yy6x.cloudflare-gateway.com',
        badge: '🔒 DoT Secured',
      },
      doh: {
        endpoint: env.RPC_DOH_ENDPOINT || 'https://ohsut0yy6x.cloudflare-gateway.com/dns-query',
        badge: '🔒 DoH Enabled',
      },
    },
    ritualFlow: [
      '✅ Set IPv4 as Primary',
      '✅ Add IPv6 as Fallback',
      '✅ Enable DoT',
      '✅ Enable DoH',
      '🎉 RPC Connection Tested',
    ],
  };
}

function getConfig(env) {
  const chainId = Number.parseInt(env.CHAIN_ID || '13390', 10) || 13390;
  const upstreamRpcUrl = env.DRPC_RPC_URL || env.VITE_RPC_URL || 'https://rpc.meechain.live';
  const portal = env.VITE_STAKING_CONTRACT_ADDRESS || env.NEONOVA_PORTAL_ADDRESS || DEFAULT_CONTRACTS.portal;
  const appOrigin = env.APP_ORIGIN || `https://${env.APP_DOMAIN || 'app.meechain.live'}`;
  return {
    chainId,
    upstreamRpcUrl,
    publicRpcUrl: `${appOrigin.replace(/\/$/, '')}/rpc`,
    appOrigin,
    staticRepoBase: (env.STATIC_REPO_BASE || STATIC_REPO_BASE).replace(/\/$/, ''),
    contracts: {
      token: env.VITE_TOKEN_CONTRACT_ADDRESS || env.MEECHAIN_TOKEN_ADDRESS || DEFAULT_CONTRACTS.token,
      nft: env.VITE_NFT_CONTRACT_ADDRESS || env.MEEBOT_NFT_ADDRESS || DEFAULT_CONTRACTS.nft,
      portal,
      staking: portal,
      dao: env.GOVERNANCE_DAO_ADDRESS || DEFAULT_CONTRACTS.dao,
    },
    rpcGateway: buildRpcGateway(env),
  };
}

function getRpcHeaders(env, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (env.DRPC_ACCESS_KEY) {
    headers.Authorization = `Bearer ${env.DRPC_ACCESS_KEY}`;
  }
  return headers;
}

function getRpcFetchRequest(env) {
  const config = getConfig(env);
  const request = new ethers.FetchRequest(config.upstreamRpcUrl);
  Object.entries(getRpcHeaders(env)).forEach(([key, value]) => {
    if (value) request.setHeader(key, value);
  });
  return request;
}

function createProvider(env) {
  return new ethers.JsonRpcProvider(getRpcFetchRequest(env), undefined, { staticNetwork: true });
}

async function rpcRequest(env, body, init = {}) {
  const config = getConfig(env);
  return fetch(config.upstreamRpcUrl, {
    method: 'POST',
    headers: getRpcHeaders(env, { 'Content-Type': 'application/json' }),
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal: init.signal || AbortSignal.timeout(10000),
  });
}

async function getBlockNumber(env) {
  try {
    const response = await rpcRequest(env, {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1,
    }, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const jsonBody = await response.json();
    return Number.parseInt(jsonBody.result, 16);
  } catch {
    return null;
  }
}

function mimeTypeFor(pathname) {
  const match = pathname.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? MIME_TYPES[match[0]] : null;
}

function sanitizeStaticPath(pathname) {
  if (!pathname || pathname === '/') return '/index.html';
  if (pathname.includes('..')) return null;
  return pathname;
}

function shouldBypassCache(pathname) {
  const lower = String(pathname || '').toLowerCase();
  return (
    lower.endsWith('.html') ||
    lower.endsWith('.js') ||
    lower.endsWith('.css') ||
    lower.endsWith('.json')
  );
}

async function proxyStatic(request, env) {
  const url = new URL(request.url);
  const pathname = sanitizeStaticPath(url.pathname);
  if (!pathname) {
    return new Response('Not found', { status: 404 });
  }

  const config = getConfig(env);
  const upstream = `${config.staticRepoBase}${pathname}`;
  const bypassCache = shouldBypassCache(pathname);
  let response = await fetch(upstream, bypassCache ? {} : {
    cf: { cacheEverything: true, cacheTtl: 300 },
  });

  if (!response.ok && !pathname.includes('.')) {
    response = await fetch(`${config.staticRepoBase}/index.html`, bypassCache ? {} : {
      cf: { cacheEverything: true, cacheTtl: 300 },
    });
  }

  if (!response.ok) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers(response.headers);
  const contentType = mimeTypeFor(pathname) || headers.get('content-type') || 'application/octet-stream';
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', bypassCache ? 'no-cache, no-store, must-revalidate' : 'public, max-age=300');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.delete('content-security-policy');
  headers.delete('x-content-type-options');

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function resolveMinterKey(env) {
  return [
    env.MEEBOT_NFT_MINTER_PRIVATE_KEY,
    env.NFT_MINTER_PRIVATE_KEY,
    env.OWNER_PRIVATE_KEY,
    env.PRIVATE_KEY,
  ].find((value) => typeof value === 'string' && value.trim()) || '';
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCategory(value) {
  const normalized = String(value || 'art').trim().toLowerCase();
  return normalized || 'art';
}

function normalizeRarity(value) {
  const normalized = String(value || 'common').trim().toLowerCase();
  if (normalized === 'legendary') return 'legendary';
  if (normalized === 'rare') return 'rare';
  return 'common';
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function buildTokenUri({ name, description, category, priceMEE, ownerAddress, appOrigin, chainId }) {
  const metadata = {
    name,
    description: description || `MeeBot NFT minted on MeeChain Ritual Chain for ${ownerAddress}`,
    image: `${appOrigin}/src/assets/images/meebot.png`,
    external_url: `${appOrigin}/`,
    attributes: [
      { trait_type: 'Collection', value: 'MeeBotNFT' },
      { trait_type: 'Category', value: category },
      { trait_type: 'Display Price (MEE)', value: priceMEE },
      { trait_type: 'Minted Via', value: 'MeeChain Dashboard' },
      { trait_type: 'Chain ID', value: String(chainId) },
    ],
  };

  return {
    metadata,
    tokenUri: `data:application/json;base64,${encodeBase64(JSON.stringify(metadata))}`,
  };
}

function buildDisplayAttributes({ category, priceMEE, chainAttributes = {} }) {
  const attrs = [];
  if (chainAttributes.element) attrs.push({ type: 'Element', value: chainAttributes.element });
  if (chainAttributes.botType) attrs.push({ type: 'Bot Type', value: chainAttributes.botType });
  if (chainAttributes.power !== undefined) attrs.push({ type: 'Power', value: String(chainAttributes.power) });
  if (chainAttributes.speed !== undefined) attrs.push({ type: 'Speed', value: String(chainAttributes.speed) });
  if (category) attrs.push({ type: 'Category', value: category });
  if (priceMEE > 0) attrs.push({ type: 'Display Price', value: `${priceMEE} MEE` });
  return attrs;
}

function parseMintReceipt(contract, receipt) {
  let tokenId = null;
  let rarityFromEvent = null;

  for (const log of receipt.logs || []) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (!parsed) continue;
      if (parsed.name === 'Transfer' && parsed.args?.from === ethers.ZeroAddress) {
        tokenId = parsed.args.tokenId?.toString?.() || String(parsed.args[2]);
      }
      if (parsed.name === 'MeeBotMinted') {
        rarityFromEvent = safeNumber(parsed.args?.rarity ?? parsed.args?.[2], 0);
      }
    } catch {}
  }

  return { tokenId, rarityFromEvent };
}

async function handleHealth(env) {
  const config = getConfig(env);
  const blockNumber = await getBlockNumber(env);
  return json({
    status: 'ok',
    model: 'gpt-5-mini',
    bot: 'MeeBot AI',
    web3: Number.isInteger(blockNumber),
    blockNumber,
    chainId: config.chainId,
    rpc: config.publicRpcUrl,
    contracts: config.contracts,
    domain: config.appOrigin.replace(/^https?:\/\//, ''),
    version: '2.1.0-worker',
  });
}

async function handleNetwork(env) {
  const config = getConfig(env);
  return json({
    chainId: `0x${config.chainId.toString(16)}`,
    chainName: 'MeeChain Ritual Chain',
    rpcUrls: [config.publicRpcUrl],
    nativeCurrency: { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
    blockExplorerUrls: ['http://explorer.meechain.run.place', `${config.appOrigin}/explorer.html`],
    contracts: config.contracts,
    rpcGateway: config.rpcGateway,
  });
}

async function handleWeb3Status(env) {
  const config = getConfig(env);
  const blockNumber = await getBlockNumber(env);
  return json({
    connected: Number.isInteger(blockNumber),
    blockNumber,
    rpc: config.publicRpcUrl,
    chainId: config.chainId,
    contracts: config.contracts,
  });
}

async function handleTokenPrice() {
  let payload = null;
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true', {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      const usd = data?.ethereum?.usd;
      const change = data?.ethereum?.usd_24h_change;
      if (typeof usd === 'number') {
        payload = {
          symbol: 'MEE',
          price: Number((usd / 20000).toFixed(6)),
          priceUsd: Number((usd / 20000).toFixed(6)),
          change24h: Number((change || 0).toFixed(2)),
          currency: 'USDT',
          source: 'coingecko-derived',
          updatedAt: Date.now(),
          timestamp: Date.now(),
        };
      }
    }
  } catch {}

  if (!payload) {
    payload = {
      symbol: 'MEE',
      price: 0.0842,
      priceUsd: 0.0842,
      change24h: 12.5,
      currency: 'USDT',
      source: 'mock',
      updatedAt: Date.now(),
      timestamp: Date.now(),
    };
  }

  return json(payload);
}

async function handleNftInfo(env) {
  const config = getConfig(env);
  try {
    const provider = createProvider(env);
    const contract = new ethers.Contract(config.contracts.nft, NFT_ABI, provider);
    const [name, symbol, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.totalSupply().catch(() => 0n),
    ]);
    return json({
      name,
      symbol,
      totalSupply: Number(totalSupply),
      address: config.contracts.nft,
      live: true,
    });
  } catch (error) {
    return json({
      name: 'MeeBotNFT',
      symbol: 'MEEBOT',
      totalSupply: 0,
      address: config.contracts.nft,
      live: false,
      error: error.message,
    });
  }
}

async function handlePortalInfo(env) {
  const config = getConfig(env);
  try {
    const provider = createProvider(env);
    const contract = new ethers.Contract(config.contracts.portal, PORTAL_ABI, provider);
    const [stats, fee] = await Promise.all([
      contract.getPortalStats(),
      contract.PORTAL_FEE(),
    ]);

    const totalLocked = toBigInt(tupleField(stats, 0, 'totalLocked'));
    const totalCeremonies = Number(tupleField(stats, 1, 'totalCeremonies') || 0);
    const contractBalance = toBigInt(tupleField(stats, 2, 'contractBalance'));

    return json({
      totalEntered: parseFloat(ethers.formatEther(totalLocked)),
      totalOfferings: parseFloat(ethers.formatEther(totalLocked)),
      totalCeremonies,
      contractBalance: ethers.formatEther(contractBalance),
      fee: `${ethers.formatEther(fee)} MEE`,
      pools: [
        { id: 'standard', name: 'MEE Standard Pool', apy: 85, lockDays: 30, minStake: 100, totalStaked: 8524100, capacity: 72 },
        { id: 'premium', name: 'MEE Premium Pool', apy: 148, lockDays: 90, minStake: 1000, totalStaked: 12840500, capacity: 58 },
        { id: 'ritual', name: 'Ritual Chain Pool', apy: 248, lockDays: 180, minStake: 5000, totalStaked: 24120000, capacity: 34 },
      ],
      live: true,
      address: config.contracts.portal,
    });
  } catch (error) {
    return json({
      totalEntered: 1284,
      totalOfferings: 52840,
      totalCeremonies: 247,
      contractBalance: '42.5000',
      fee: '0.001 MEE',
      pools: [
        { id: 'standard', name: 'MEE Standard Pool', apy: 85, lockDays: 30, minStake: 100, totalStaked: 8524100, capacity: 72 },
        { id: 'premium', name: 'MEE Premium Pool', apy: 148, lockDays: 90, minStake: 1000, totalStaked: 12840500, capacity: 58 },
        { id: 'ritual', name: 'Ritual Chain Pool', apy: 248, lockDays: 180, minStake: 5000, totalStaked: 24120000, capacity: 34 },
      ],
      live: false,
      address: config.contracts.portal,
      error: error.message,
    });
  }
}

async function handleUserStaking(env, address) {
  if (!ethers.isAddress(address)) {
    return json({ error: 'Invalid address' }, 400);
  }

  try {
    const config = getConfig(env);
    const provider = createProvider(env);
    const contract = new ethers.Contract(config.contracts.portal, PORTAL_ABI, provider);
    const [userPortal, ceremonyIds] = await Promise.all([
      contract.getUserPortal(address),
      contract.getUserCeremonies(address),
    ]);

    const ceremonies = await Promise.all(
      (ceremonyIds || []).map(async (ceremonyId) => {
        try {
          const ceremony = await contract.getCeremony(ceremonyId);
          return {
            id: Number(tupleField(ceremony, 0, 'id')),
            participant: tupleField(ceremony, 1, 'participant'),
            ctype: Number(tupleField(ceremony, 2, 'ctype') || 0),
            amount: toBigInt(tupleField(ceremony, 3, 'amount')).toString(),
            timestamp: Number(tupleField(ceremony, 4, 'timestamp') || 0),
            ritualHash: tupleField(ceremony, 5, 'ritualHash'),
            completed: Boolean(tupleField(ceremony, 6, 'completed')),
          };
        } catch {
          return null;
        }
      }),
    );

    const totalDeposited = toBigInt(tupleField(userPortal, 0, 'totalDeposited'));
    const totalWithdrawn = toBigInt(tupleField(userPortal, 1, 'totalWithdrawn'));
    const currentLocked = totalDeposited > totalWithdrawn ? totalDeposited - totalWithdrawn : 0n;
    const activeCeremonies = ceremonies
      .filter(Boolean)
      .filter((ceremony) => toBigInt(ceremony.amount) > 0n)
      .sort((a, b) => b.id - a.id);

    return json({
      address,
      totalStaked: currentLocked.toString(),
      pendingReward: '0',
      totalDeposited: totalDeposited.toString(),
      totalWithdrawn: totalWithdrawn.toString(),
      ceremoniesPerformed: Number(tupleField(userPortal, 2, 'ceremoniesPerformed') || activeCeremonies.length),
      lastActivity: Number(tupleField(userPortal, 3, 'lastActivity') || 0),
      isRegistered: Boolean(tupleField(userPortal, 4, 'isRegistered')),
      activeCeremonies,
      staked: ethers.formatEther(currentLocked),
      live: true,
    });
  } catch (error) {
    return json({
      address,
      totalStaked: '0',
      pendingReward: '0',
      totalDeposited: '0',
      totalWithdrawn: '0',
      ceremoniesPerformed: 0,
      lastActivity: 0,
      isRegistered: false,
      activeCeremonies: [],
      staked: '0',
      live: false,
      error: error.message,
    });
  }
}

async function handleMint(request, env) {
  try {
    const body = await request.json().catch(() => null);
    const name = String(body?.name || '').trim().slice(0, 64);
    const description = String(body?.description || '').trim().slice(0, 280);
    const category = normalizeCategory(body?.category);
    const priceMEE = safeNumber(body?.price, 0);
    const toAddress = body?.toAddress;

    if (!name) return json({ success: false, error: 'name is required' }, 400);
    if (!toAddress) return json({ success: false, error: 'toAddress is required' }, 400);
    if (!ethers.isAddress(toAddress)) return json({ success: false, error: 'Invalid address' }, 400);

    const privateKey = resolveMinterKey(env);
    if (!privateKey) {
      return json({ success: false, error: 'NFT minter private key is not configured' }, 500);
    }

    const config = getConfig(env);
    const provider = createProvider(env);
    const signer = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(config.contracts.nft, NFT_ABI, signer);
    const { metadata, tokenUri } = buildTokenUri({
      name,
      description,
      category,
      priceMEE,
      ownerAddress: toAddress,
      appOrigin: config.appOrigin,
      chainId: config.chainId,
    });

    const owner = await contract.owner().catch(() => null);
    if (owner && owner.toLowerCase() !== signer.address.toLowerCase()) {
      return json({
        success: false,
        error: `Configured minter ${signer.address} is not MeeBotNFT owner ${owner}`,
      }, 500);
    }

    const tx = await contract.safeMint(toAddress, tokenUri);
    const receipt = await tx.wait();
    const { tokenId, rarityFromEvent } = parseMintReceipt(contract, receipt);

    let chainAttributes = {};
    let rarityLabel = ['Common', 'Rare', 'Legendary'][rarityFromEvent] || 'Common';

    if (tokenId !== null) {
      const rawAttributes = await contract.getAttributes(tokenId).catch(() => null);
      if (rawAttributes) {
        chainAttributes = {
          power: safeNumber(rawAttributes.power ?? rawAttributes[1]),
          speed: safeNumber(rawAttributes.speed ?? rawAttributes[2]),
          element: rawAttributes.element ?? rawAttributes[3],
          botType: rawAttributes.botType ?? rawAttributes[4],
          mintedAt: safeNumber(rawAttributes.mintedAt ?? rawAttributes[5]),
        };
      }

      const onChainRarity = await contract.getRarityLabel(tokenId).catch(() => '');
      if (onChainRarity) rarityLabel = onChainRarity;
    }

    return json({
      success: true,
      live: true,
      contract: config.contracts.nft,
      toAddress,
      tokenId: tokenId !== null ? Number(tokenId) : null,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      tokenUri,
      metadata,
      rarity: normalizeRarity(rarityLabel),
      chainAttributes,
      attributes: buildDisplayAttributes({ category, priceMEE, chainAttributes }),
      name,
      description,
      category,
      price: priceMEE,
      message: tokenId !== null
        ? `MeeBotNFT minted on-chain as token #${tokenId}`
        : 'MeeBotNFT minted on-chain',
    });
  } catch (error) {
    return json({
      success: false,
      live: false,
      error: error.message || 'Mint failed',
    }, 500);
  }
}

async function handleChat(request, env) {
  try {
    const { message } = await request.json();
    if (!message?.trim()) {
      return json({ error: 'Message required' }, 400);
    }

    const apiKey = env.OPENAI_API_KEY;
    const baseURL = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

    if (!apiKey) {
      return json({
        reply: 'MeeBot AI ยังไม่ได้กำหนดค่า OPENAI_API_KEY กรุณาติดต่อผู้ดูแลระบบ',
        error: 'API key not configured',
      });
    }

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: CHAT_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return json({
        reply: 'MeeBot AI ไม่สามารถตอบได้ขณะนี้',
        error: `HTTP ${response.status}`,
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'ขออภัย ไม่สามารถตอบได้';
    return json({ reply, usage: data.usage });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

async function handleChatStream(request, env) {
  try {
    const { message } = await request.json();
    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: corsHeaders({ 'Content-Type': 'application/json' }),
      });
    }

    const apiKey = env.OPENAI_API_KEY;
    const baseURL = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

    if (!apiKey) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: 'MeeBot AI ยังไม่ได้กำหนดค่า OPENAI_API_KEY' })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: corsHeaders({
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        }),
      });
    }

    const upstream = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: CHAT_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        stream: true,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!upstream.ok) {
      return new Response(`data: ${JSON.stringify({ error: `AI Error: HTTP ${upstream.status}` })}\n\n`, {
        status: upstream.status,
        headers: corsHeaders({ 'Content-Type': 'text/event-stream' }),
      });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const reader = upstream.body.getReader();

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
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
              continue;
            }

            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
            } catch {}
          }
        }
      } finally {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)).catch(() => {});
        await writer.close().catch(() => {});
      }
    })();

    return new Response(readable, {
      headers: corsHeaders({
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      }),
    });
  } catch (error) {
    return new Response(`data: ${JSON.stringify({ error: error.message })}\n\n`, {
      status: 500,
      headers: corsHeaders({ 'Content-Type': 'text/event-stream' }),
    });
  }
}

async function handleRpcStatus(env) {
  const config = getConfig(env);
  const blockNumber = await getBlockNumber(env);
  return json({
    connected: Number.isInteger(blockNumber),
    blockNumber,
    chainId: config.chainId,
    rpc: config.publicRpcUrl,
    upstreamRpc: config.upstreamRpcUrl,
    contracts: config.contracts,
  });
}

async function handleRpcProxy(request, env) {
  const rawBody = await request.text();
  if (!rawBody.trim()) {
    return json({ error: 'Invalid JSON-RPC request' }, 400);
  }

  try {
    JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON-RPC request' }, 400);
  }

  try {
    const upstream = await rpcRequest(env, rawBody);
    const headers = corsHeaders({
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-cache',
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: error.message || 'RPC proxy failed',
      },
    }, 502);
  }
}

async function handleWebSocket(request, env) {
  const upgrade = request.headers.get('Upgrade');
  if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
    return new Response('Expected websocket upgrade', { status: 426 });
  }

  const config = getConfig(env);
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();

  const blockNumber = await getBlockNumber(env);
  server.send(JSON.stringify({
    type: 'connected',
    chainId: config.chainId,
    blockNumber,
  }));
  server.send(JSON.stringify({
    type: 'price_update',
    price: '0.0842',
    change24h: '+12.5%',
  }));

  server.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload?.type === 'ping') {
        server.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {}
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

async function routeApi(request, env, pathname) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  if (pathname === '/api/health' && request.method === 'GET') return handleHealth(env);
  if (pathname === '/api/network' && request.method === 'GET') return handleNetwork(env);
  if (pathname === '/api/web3/status' && request.method === 'GET') return handleWeb3Status(env);
  if (pathname === '/api/token/price' && request.method === 'GET') return handleTokenPrice();
  if (pathname === '/api/nft/info' && request.method === 'GET') return handleNftInfo(env);
  if (pathname === '/api/portal/info' && request.method === 'GET') return handlePortalInfo(env);
  if (pathname === '/api/staking/info' && request.method === 'GET') return handlePortalInfo(env);
  if (pathname.startsWith('/api/staking/user/') && request.method === 'GET') {
    const address = pathname.split('/').pop();
    return handleUserStaking(env, address);
  }
  if (pathname === '/api/nft/mint' && request.method === 'POST') return handleMint(request, env);
  if (pathname === '/api/chat' && request.method === 'POST') return handleChat(request, env);
  if (pathname === '/api/chat/stream' && request.method === 'POST') return handleChatStream(request, env);
  if (pathname.startsWith('/api/chat/') && request.method === 'DELETE') {
    return json({ success: true, deleted: true });
  }

  return json({ error: 'Not found', path: pathname }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/rpc') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders() });
      }
      if (request.method === 'GET') {
        return handleRpcStatus(env);
      }
      if (request.method === 'POST') {
        return handleRpcProxy(request, env);
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/ws') {
      return handleWebSocket(request, env);
    }

    if (url.pathname.startsWith('/api/')) {
      return routeApi(request, env, url.pathname);
    }

    return proxyStatic(request, env);
  },
};
