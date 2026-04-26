/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  MeeChain Wallet Integration                                    ║
 * ║  - MetaMask connect / disconnect                                ║
 * ║  - Send MEE Token (ERC-20)                                      ║
 * ║  - Receive (QR code display)                                    ║
 * ║  - Network: Ritual Chain, Chain ID 13390                        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ── Chain & Contract Config ──────────────────────────────────────────
const RUNTIME_RPC_URL = `${location.origin}/rpc`;
const MEECHAIN_NETWORK = {
  chainId:        '0x344e',   // 13390 decimal
  chainName:      'MeeChain Ritual Chain',
  rpcUrls:        [RUNTIME_RPC_URL],
  nativeCurrency: { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
  blockExplorerUrls: ['http://explorer.meechain.run.place', 'https://app.meechain.live/explorer'],
};

// Minimal ERC-20 ABI for transfer + balanceOf
const MEE_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// Will be populated from /api/network or fallback
let TOKEN_ADDRESS   = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
let NFT_ADDRESS     = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
let PORTAL_ADDRESS  = '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853';

// ── Wallet State ─────────────────────────────────────────────────────
window.WalletState = {
  connected:   false,
  address:     null,
  balance:     '0',
  balanceMEE:  '0',
  provider:    null,
  signer:      null,
  tokenContract: null,
  isDemo:      false,
  demoBalance: 50000,
};

const walletToast = (message, type = 'info') => {
  if (typeof window.showToast === 'function') return window.showToast(message, type);
  if (typeof window.toast === 'function') return window.toast(message, type);
  console[type === 'error' ? 'error' : 'log'](`[Wallet] ${message}`);
};

const walletShortHash = (hash, start = 6, end = 4) => {
  if (typeof window.truncateHash === 'function') return window.truncateHash(hash, start, end);
  if (!hash) return '';
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
};

function syncWalletSession() {
  window.MeeWalletHub?.setSession({
    connected: window.WalletState.connected,
    address: window.WalletState.address || '',
    balance: window.WalletState.balance || '0',
    balanceMEE: window.WalletState.balanceMEE || '0',
    isDemo: Boolean(window.WalletState.isDemo),
  });
}

function clearWalletPageUI() {
  const addrEl = document.getElementById('wallet-address-display');
  const cardBalEl = document.querySelector('.wcard-balance-value');
  const cardUsdEl = document.querySelector('.wcard-balance-usd');
  const hubAddress = document.getElementById('wallet-hub-address');
  const hubBalance = document.getElementById('wallet-hub-balance');

  if (addrEl) addrEl.textContent = 'ยังไม่ได้เชื่อมต่อ';
  if (cardBalEl) cardBalEl.textContent = '0.00 MEE';
  if (cardUsdEl) cardUsdEl.textContent = '≈ $0.00 USD';
  if (hubAddress) hubAddress.textContent = '-';
  if (hubBalance) hubBalance.textContent = '0.00 MEE';
}

function updateWalletHubPanel() {
  const { connected, address, balanceMEE, isDemo } = window.WalletState;
  const statusEl = document.getElementById('wallet-hub-status');
  const detailEl = document.getElementById('wallet-hub-detail');
  const addressEl = document.getElementById('wallet-hub-address');
  const balanceEl = document.getElementById('wallet-hub-balance');
  const returnBtn = document.getElementById('wallet-return-btn');
  const returnPath = window.MeeWalletHub?.getReturnPath?.();

  if (statusEl) statusEl.textContent = connected ? (isDemo ? 'Demo Wallet' : 'MetaMask Connected') : 'ยังไม่ได้เชื่อมต่อ';
  if (detailEl) {
    detailEl.textContent = connected
      ? (isDemo ? 'กำลังใช้งาน Demo Wallet จากจุดจัดการกลาง' : 'พร้อมใช้งานสำหรับรับ ส่ง stake และทำธุรกรรม on-chain จาก Wallet Hub')
      : 'เชื่อมต่อ MetaMask, รับและส่ง MEE, คัดลอกที่อยู่, เปิด Explorer และกลับไปหน้าที่เรียก wallet ได้จากจุดเดียว';
  }
  if (addressEl) addressEl.textContent = connected && address ? walletShortHash(address, 8, 6) : '-';
  if (balanceEl) {
    const mee = Number.parseFloat(balanceMEE || '0');
    balanceEl.textContent = `${Number.isFinite(mee) ? mee.toLocaleString('th-TH', { maximumFractionDigits: 4 }) : '0.00'} MEE`;
  }
  if (returnBtn) returnBtn.style.display = returnPath ? 'inline-flex' : 'none';
}

function navigateBackFromWalletHub() {
  const returnPath = window.MeeWalletHub?.consumeReturnPath?.();
  if (returnPath) location.href = returnPath;
}

// ── Load contract addresses from server ──────────────────────────────
async function loadContractAddresses() {
  try {
    const resp = await fetch('/api/network');
    const data = await resp.json();
    if (Array.isArray(data.rpcUrls) && data.rpcUrls[0]) {
      MEECHAIN_NETWORK.rpcUrls = data.rpcUrls;
    }
    if (data.contracts) {
      TOKEN_ADDRESS  = data.contracts.token   || TOKEN_ADDRESS;
      NFT_ADDRESS    = data.contracts.nft     || NFT_ADDRESS;
      PORTAL_ADDRESS = data.contracts.portal  || data.contracts.staking || PORTAL_ADDRESS;
    }
  } catch (_) {}
}

// ── Connect MetaMask ─────────────────────────────────────────────────
async function connectMetaMask() {
  if (typeof window.ethereum === 'undefined') {
    showToast('ไม่พบ MetaMask — กรุณาติดตั้งก่อนใช้งาน 🦊', 'error');
    window.open('https://metamask.io/download/', '_blank');
    return false;
  }

  try {
    showToast('กำลังเชื่อมต่อ MetaMask... 🦊', 'info');

    // Request accounts
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) throw new Error('No accounts returned');

    // Switch / add MeeChain network
    await ensureMeeChainNetwork();

    // Setup ethers provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();
    const address  = await signer.getAddress();

    // Get native balance
    const rawBalance = await provider.getBalance(address);
    const balance    = ethers.formatEther(rawBalance);

    // Setup token contract
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, MEE_TOKEN_ABI, signer);
    let balanceMEE = '0';
    try {
      const tokenBal = await tokenContract.balanceOf(address);
      balanceMEE = ethers.formatUnits(tokenBal, 18);
    } catch (_) {}

    // Update state
    Object.assign(window.WalletState, {
      connected: true, address, balance, balanceMEE,
      provider, signer, tokenContract, isDemo: false,
    });

    updateWalletUI();
    showToast(`✅ เชื่อมต่อสำเร็จ: ${truncateHash(address)}`, 'success');

    // Listen for account/chain changes
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', () => window.location.reload());

    return true;
  } catch (err) {
    console.error('[Wallet] MetaMask error:', err);
    showToast(`❌ เชื่อมต่อ MetaMask ล้มเหลว: ${err.message}`, 'error');
    return false;
  }
}

// ── Ensure MeeChain network is added/active ──────────────────────────
async function ensureMeeChainNetwork() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MEECHAIN_NETWORK.chainId }],
    });
  } catch (switchErr) {
    // 4902: chain missing, -32603: wallet internal error, 4200: method not supported in some wallets
    if (switchErr.code === 4902 || switchErr.code === -32603 || switchErr.code === 4200) {
      console.info(`[Wallet] switchChain fallback triggered (code=${switchErr.code}) -> wallet_addEthereumChain`);
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [MEECHAIN_NETWORK],
        });
        walletToast('✅ เพิ่ม MeeChain Ritual Chain ใน MetaMask แล้ว', 'success');
      } catch (addErr) {
        console.warn('[Wallet] Could not add chain:', addErr.message);
        if (switchErr.code === 4200) {
          console.warn('[Wallet] wallet_switchEthereumChain is not supported by this wallet (code 4200)');
          walletToast('MetaMask/Wallet นี้ไม่รองรับการ switch chain อัตโนมัติ กรุณาเพิ่มเครือข่ายด้วยตนเองจาก Network settings', 'warning');
        }
      }
    } else {
      console.error('[Wallet] wallet_switchEthereumChain failed without fallback path', switchErr);
      throw switchErr;
    }
  }
}


// ── Connect Demo Wallet ──────────────────────────────────────────────
function connectDemoWallet() {
  const demoAddr = '0x' + Array.from({length: 40}, () =>
    '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  const demoBal  = (Math.random() * 50000 + 1000).toFixed(2);

  Object.assign(window.WalletState, {
    connected: true, address: demoAddr, balance: '0',
    balanceMEE: demoBal, provider: null, signer: null,
    tokenContract: null, isDemo: true, demoBalance: parseFloat(demoBal),
  });

  updateWalletUI();
  showToast(`🤖 Demo Wallet เชื่อมต่อแล้ว — ${demoBal} MEE`, 'success');
  document.getElementById('wallet-modal')?.classList.add('hidden');
}

function handleUnavailableWallet(type) {
  const labels = {
    walletconnect: 'WalletConnect',
    coinbase: 'Coinbase Wallet',
  };
  const label = labels[type] || 'Wallet';
  showToast(`${label} ยังไม่เปิดใช้งานบนหน้าเว็บตอนนี้ กรุณาใช้ MetaMask หรือ MeeBot Demo Wallet`, 'warning');
}

// ── Handle account change ────────────────────────────────────────────
async function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    disconnectWallet();
  } else {
    window.WalletState.address = accounts[0];
    await refreshBalance();
    updateWalletUI();
  }
}

// ── Refresh balances ─────────────────────────────────────────────────
async function refreshBalance() {
  const { address, provider, tokenContract, isDemo, demoBalance } = window.WalletState;
  if (!address) return;
  if (isDemo) {
    window.WalletState.balanceMEE = demoBalance.toFixed(2);
    return;
  }
  try {
    if (provider) {
      const raw = await provider.getBalance(address);
      window.WalletState.balance = ethers.formatEther(raw);
    }
    if (tokenContract) {
      const tok = await tokenContract.balanceOf(address);
      window.WalletState.balanceMEE = ethers.formatUnits(tok, 18);
    }
  } catch (_) {}
}

// ── Disconnect wallet ────────────────────────────────────────────────
function disconnectWallet() {
  Object.assign(window.WalletState, {
    connected: false, address: null, balance: '0', balanceMEE: '0',
    provider: null, signer: null, tokenContract: null, isDemo: false,
  });
  updateWalletUI();
  window.dispatchEvent(new CustomEvent('walletDisconnected'));
  showToast('ตัดการเชื่อมต่อกระเป๋าแล้ว', 'info');
}

// ── Update wallet button & UI ────────────────────────────────────────
function updateWalletUI() {
  const btn  = document.getElementById('connect-wallet-btn');
  const text = document.getElementById('wallet-btn-text');
  const { connected, address, balanceMEE, isDemo } = window.WalletState;

  if (connected && address) {
    const shortAddr = truncateHash(address, 6, 4);
    const bal       = parseFloat(balanceMEE).toLocaleString('th-TH', { maximumFractionDigits: 2 });
    if (text) text.textContent = `${isDemo ? '🤖' : '🦊'} ${shortAddr} (${bal} MEE)`;
    if (btn)  btn.style.cssText = 'background:linear-gradient(135deg,#10B981,#059669);color:#fff;';

    // Update wallet page info
    updateWalletPageUI();

    // Dispatch event for app.js to listen
    window.dispatchEvent(new CustomEvent('walletConnected', { detail: window.WalletState }));
  } else {
    if (text) text.textContent = 'เชื่อมต่อกระเป๋า';
    if (btn)  btn.style.cssText = '';
  }
}

function updateWalletPageUI() {
  const { address, balanceMEE, balance, isDemo } = window.WalletState;
  if (!address) return;

  // Update various wallet display elements
  const addrEl  = document.getElementById('wallet-address-display');
  const balEl   = document.getElementById('wallet-mee-balance');
  const nativeEl= document.getElementById('wallet-native-balance');

  if (addrEl)   addrEl.textContent  = address;
  if (balEl)    balEl.textContent   = `${parseFloat(balanceMEE).toLocaleString('th-TH', {maximumFractionDigits:4})} MEE`;
  if (nativeEl) nativeEl.textContent= `${parseFloat(balance).toLocaleString('th-TH', {maximumFractionDigits:6})} MEE (native)`;

  // Copy address button
  document.querySelectorAll('.copy-address-btn').forEach(el => {
    el.onclick = () => {
      navigator.clipboard.writeText(address).then(() => showToast('📋 คัดลอกที่อยู่แล้ว', 'success'));
    };
  });
}

// ── Send Token ───────────────────────────────────────────────────────
function openSendModal() {
  if (!window.WalletState.connected) {
    showToast('กรุณาเชื่อมต่อ Wallet ก่อน', 'warning');
    document.getElementById('wallet-modal')?.classList.remove('hidden');
    return;
  }
  const { address, balanceMEE } = window.WalletState;
  const el = document.getElementById('send-from-addr');
  const blEl = document.getElementById('send-from-bal');
  if (el) el.textContent = truncateHash(address, 8, 6);
  if (blEl) blEl.textContent = `${parseFloat(balanceMEE).toLocaleString('th-TH', {maximumFractionDigits:4})} MEE`;

  // Reset
  const toEl = document.getElementById('send-to-address');
  const amEl = document.getElementById('send-amount');
  const stEl = document.getElementById('send-tx-status');
  if (toEl) toEl.value = '';
  if (amEl) amEl.value = '';
  if (stEl) { stEl.style.display = 'none'; stEl.textContent = ''; }

  document.getElementById('send-modal')?.classList.remove('hidden');
}

async function executeSendToken() {
  const toAddr = document.getElementById('send-to-address')?.value?.trim();
  const amount = document.getElementById('send-amount')?.value?.trim();
  const statusEl = document.getElementById('send-tx-status');
  const btnEl    = document.getElementById('send-confirm-btn');

  if (!toAddr || !amount) {
    showToast('กรุณากรอกที่อยู่และจำนวน MEE', 'error');
    return;
  }

  if (!window.WalletState.connected) {
    showToast('กรุณาเชื่อมต่อ Wallet ก่อน', 'warning');
    return;
  }

  const setStatus = (msg, type = 'info') => {
    if (!statusEl) return;
    statusEl.style.display = 'block';
    statusEl.style.background = type === 'error' ? 'rgba(239,68,68,0.2)'
      : type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.2)';
    statusEl.style.color = type === 'error' ? '#EF4444'
      : type === 'success' ? '#10B981' : '#A78BFA';
    statusEl.style.border = `1px solid ${statusEl.style.color}`;
    statusEl.innerHTML = msg;
  };

  // Demo mode
  if (window.WalletState.isDemo) {
    setStatus('⏳ Demo: กำลังส่ง MEE...', 'info');
    if (btnEl) btnEl.disabled = true;
    await new Promise(r => setTimeout(r, 1500));

    const demoHash = '0x' + Array.from({length: 64}, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
    window.WalletState.demoBalance = Math.max(0, window.WalletState.demoBalance - parseFloat(amount));
    window.WalletState.balanceMEE  = window.WalletState.demoBalance.toFixed(2);

    setStatus(`✅ ส่งสำเร็จ (Demo)!<br>Hash: <code>${truncateHash(demoHash, 8, 8)}</code><br>ส่ง ${amount} MEE → ${truncateHash(toAddr)}`, 'success');
    if (btnEl) btnEl.disabled = false;
    updateWalletUI();
    showToast(`✅ ส่ง ${amount} MEE ไป ${truncateHash(toAddr)} แล้ว (Demo)`, 'success');
    return;
  }

  // Real MetaMask send
  try {
    if (btnEl) btnEl.disabled = true;
    setStatus('⏳ กำลังเตรียม transaction...', 'info');

    // Validate address
    if (!ethers.isAddress(toAddr)) throw new Error(`ที่อยู่ไม่ถูกต้อง: ${toAddr}`);

    const { signer, tokenContract } = window.WalletState;
    if (!signer || !tokenContract) throw new Error('ไม่ได้เชื่อมต่อ wallet');

    setStatus('⏳ กรุณายืนยันใน MetaMask...', 'info');

    const amountWei = ethers.parseUnits(amount, 18);
    const tx = await tokenContract.transfer(toAddr, amountWei);

    setStatus(`⏳ รอ confirmation...<br>TX: <code>${truncateHash(tx.hash, 8, 8)}</code>`, 'info');
    showToast(`📡 TX: ${truncateHash(tx.hash)}`, 'info');

    const receipt = await tx.wait();

    setStatus(`✅ ส่งสำเร็จ!<br>Hash: <code>${truncateHash(tx.hash, 8, 8)}</code><br>Block: ${receipt.blockNumber}<br>ส่ง ${amount} MEE → ${truncateHash(toAddr)}`, 'success');
    showToast(`✅ ส่ง ${amount} MEE สำเร็จ`, 'success');

    // Refresh balance
    await refreshBalance();
    updateWalletUI();
  } catch (err) {
    console.error('[Wallet] Transfer error:', err);
    const msg = err.code === 4001 ? 'ยกเลิกการส่ง' : err.message;
    setStatus(`❌ ส่งล้มเหลว: ${msg}`, 'error');
    showToast(`❌ ${msg}`, 'error');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

// ── Receive (QR) ─────────────────────────────────────────────────────
function openReceiveModal() {
  if (!window.WalletState.connected) {
    showToast('กรุณาเชื่อมต่อ Wallet ก่อน', 'warning');
    document.getElementById('wallet-modal')?.classList.remove('hidden');
    return;
  }
  const { address } = window.WalletState;
  const addrBox = document.getElementById('receive-address-box');
  if (addrBox) addrBox.textContent = address;

  document.getElementById('receive-modal')?.classList.remove('hidden');

  // Draw QR code using QRCode library
  const canvas = document.getElementById('receive-qr-canvas');
  if (canvas && typeof QRCode !== 'undefined') {
    QRCode.toCanvas(canvas, `ethereum:${address}@13390`, {
      width: 200,
      color: { dark: '#A78BFA', light: '#0A0E1A' },
    }, err => { if (err) console.warn('[QR]', err); });
  }
}

function copyReceiveAddress() {
  const addr = window.WalletState.address;
  if (!addr) return;
  navigator.clipboard.writeText(addr).then(() => showToast('📋 คัดลอกที่อยู่แล้ว', 'success'));
}

// ── Override connectWallet from app.js ───────────────────────────────
window.connectWallet = async function(type) {
  document.getElementById('wallet-modal')?.classList.add('hidden');

  if (type === 'metamask') {
    await connectMetaMask();
  } else if (type === 'demo') {
    connectDemoWallet();
  } else if (type === 'walletconnect' || type === 'coinbase') {
    handleUnavailableWallet(type);
  }
};

// ── Expose helpers to global ─────────────────────────────────────────
window.openSendModal    = openSendModal;
window.executeSendToken = executeSendToken;
window.openReceiveModal = openReceiveModal;
window.copyReceiveAddress = copyReceiveAddress;
window.disconnectWallet   = disconnectWallet;
window.WalletConnected    = () => window.WalletState.connected;

// ── Wire up send/receive buttons ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadContractAddresses();

  // Override wallet action buttons
  document.querySelectorAll('[onclick*="handleSend"], .send-btn, [data-action="send"]').forEach(el => {
    el.addEventListener('click', openSendModal);
  });
  document.querySelectorAll('[onclick*="handleReceive"], .receive-btn, [data-action="receive"]').forEach(el => {
    el.addEventListener('click', openReceiveModal);
  });

  // Listen for send/receive button events from app.js wallet page
  window.addEventListener('walletActionSend', openSendModal);
  window.addEventListener('walletActionReceive', openReceiveModal);
});

// Shared wallet hub override layer
function showConnectionCelebration(address) {
  if (document.getElementById('rpc-connected-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'rpc-connected-overlay';
  overlay.className = 'rpc-connected-overlay';
  overlay.innerHTML = `
    <div class="rpc-connected-overlay-card">
      <div class="rpc-connected-overlay-title">✅ RPC Connected</div>
      <div class="rpc-connected-overlay-subtitle">🎉 Badge Claimed</div>
      <div class="rpc-connected-overlay-address">${walletShortHash(address, 10, 6)}</div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 260);
  };
  setTimeout(close, 2400);
  overlay.addEventListener('click', close, { once: true });
}

async function connectMetaMask(options = {}) {
  const silent = Boolean(options.silent);
  if (typeof window.ethereum === 'undefined') {
    if (!silent) {
      walletToast('ไม่พบ MetaMask กรุณาติดตั้งก่อนใช้งาน', 'error');
      window.open('https://metamask.io/download/', '_blank');
    }
    return false;
  }

  try {
    if (!silent) walletToast('กำลังเชื่อมต่อ MetaMask...', 'info');
    const accounts = await window.ethereum.request({
      method: silent ? 'eth_accounts' : 'eth_requestAccounts',
    });
    if (!accounts?.[0]) {
      if (silent) return false;
      throw new Error('No accounts returned');
    }

    await ensureMeeChainNetwork();

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const rawBalance = await provider.getBalance(address);
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, MEE_TOKEN_ABI, signer);
    let balanceMEE = '0';

    try {
      const tokenBal = await tokenContract.balanceOf(address);
      balanceMEE = ethers.formatUnits(tokenBal, 18);
    } catch {}

    Object.assign(window.WalletState, {
      connected: true,
      address,
      balance: ethers.formatEther(rawBalance),
      balanceMEE,
      provider,
      signer,
      tokenContract,
      isDemo: false,
    });

    syncWalletSession();
    updateWalletUI();
    if (!silent) {
      walletToast(`เชื่อมต่อสำเร็จ: ${walletShortHash(address)}`, 'success');
      showConnectionCelebration(address);
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', () => window.location.reload());
    return true;
  } catch (err) {
    console.error('[Wallet] MetaMask error:', err);
    if (!silent) walletToast(`เชื่อมต่อ MetaMask ล้มเหลว: ${err.message}`, 'error');
    return false;
  }
}

async function handleAccountsChanged(accounts) {
  if (!accounts.length) {
    disconnectWallet();
    return;
  }
  window.WalletState.connected = true;
  window.WalletState.address = accounts[0];
  window.WalletState.isDemo = false;
  await refreshBalance();
  syncWalletSession();
  updateWalletUI();
}

async function refreshBalance() {
  const { address, provider, tokenContract, isDemo, demoBalance } = window.WalletState;
  if (!address) return;
  if (isDemo) {
    window.WalletState.balanceMEE = Number.parseFloat(demoBalance || 0).toFixed(2);
    syncWalletSession();
    return;
  }

  try {
    if (provider) {
      const raw = await provider.getBalance(address);
      window.WalletState.balance = ethers.formatEther(raw);
    }
    if (tokenContract) {
      const tok = await tokenContract.balanceOf(address);
      window.WalletState.balanceMEE = ethers.formatUnits(tok, 18);
    }
  } catch {}

  syncWalletSession();
}

function updateWalletPageUI() {
  const { address, balanceMEE, balance } = window.WalletState;
  const addrEl = document.getElementById('wallet-address-display');
  const balEl = document.getElementById('wallet-mee-balance');
  const nativeEl = document.getElementById('wallet-native-balance');
  const cardBalEl = document.querySelector('.wcard-balance-value');
  const cardUsdEl = document.querySelector('.wcard-balance-usd');

  if (!address) {
    clearWalletPageUI();
    updateWalletHubPanel();
    return;
  }

  if (addrEl) addrEl.textContent = address;
  if (balEl) balEl.textContent = `${parseFloat(balanceMEE).toLocaleString('th-TH', { maximumFractionDigits: 4 })} MEE`;
  if (nativeEl) nativeEl.textContent = `${parseFloat(balance).toLocaleString('th-TH', { maximumFractionDigits: 6 })} MEE (native)`;
  if (cardBalEl) cardBalEl.textContent = `${parseFloat(balanceMEE).toLocaleString('th-TH', { maximumFractionDigits: 4 })} MEE`;
  if (cardUsdEl) cardUsdEl.textContent = `≈ $${(parseFloat(balanceMEE || '0') * 0.0842).toFixed(2)} USD`;

  document.querySelectorAll('.copy-address-btn').forEach((el) => {
    el.onclick = () => {
      navigator.clipboard.writeText(address).then(() => walletToast('คัดลอกที่อยู่แล้ว', 'success'));
    };
  });

  updateWalletHubPanel();
}

function updateWalletUI() {
  const btn = document.getElementById('connect-wallet-btn');
  const text = document.getElementById('wallet-btn-text');
  const { connected, address, balanceMEE, isDemo } = window.WalletState;

  if (connected && address) {
    const shortAddr = walletShortHash(address, 6, 4);
    const bal = parseFloat(balanceMEE).toLocaleString('th-TH', { maximumFractionDigits: 2 });
    if (text) text.textContent = `${isDemo ? '🤖' : '🦊'} ${shortAddr} (${bal} MEE)`;
    if (btn) btn.style.cssText = 'background:linear-gradient(135deg,#10B981,#059669);color:#fff;';
    updateWalletPageUI();
    window.dispatchEvent(new CustomEvent('walletConnected', { detail: window.WalletState }));
  } else {
    if (text) text.textContent = 'เชื่อมต่อกระเป๋า';
    if (btn) btn.style.cssText = '';
    clearWalletPageUI();
    updateWalletHubPanel();
  }
}

function disconnectWallet() {
  Object.assign(window.WalletState, {
    connected: false,
    address: null,
    balance: '0',
    balanceMEE: '0',
    provider: null,
    signer: null,
    tokenContract: null,
    isDemo: false,
  });
  window.MeeWalletHub?.clearSession?.();
  updateWalletUI();
  window.dispatchEvent(new CustomEvent('walletDisconnected'));
  walletToast('ตัดการเชื่อมต่อกระเป๋าแล้ว', 'info');
}

function openSendModal() {
  if (!window.WalletState.connected) {
    walletToast('กรุณาเชื่อมต่อ Wallet ก่อน', 'warning');
    document.getElementById('wallet-modal')?.classList.remove('hidden');
    return;
  }
  const { address, balanceMEE } = window.WalletState;
  const el = document.getElementById('send-from-addr');
  const blEl = document.getElementById('send-from-bal');
  if (el) el.textContent = walletShortHash(address, 8, 6);
  if (blEl) blEl.textContent = `${parseFloat(balanceMEE).toLocaleString('th-TH', { maximumFractionDigits: 4 })} MEE`;

  const toEl = document.getElementById('send-to-address');
  const amEl = document.getElementById('send-amount');
  const stEl = document.getElementById('send-tx-status');
  if (toEl) toEl.value = '';
  if (amEl) amEl.value = '';
  if (stEl) {
    stEl.style.display = 'none';
    stEl.textContent = '';
  }

  document.getElementById('send-modal')?.classList.remove('hidden');
}

function openReceiveModal() {
  if (!window.WalletState.connected) {
    walletToast('กรุณาเชื่อมต่อ Wallet ก่อน', 'warning');
    document.getElementById('wallet-modal')?.classList.remove('hidden');
    return;
  }
  const { address } = window.WalletState;
  const addrBox = document.getElementById('receive-address-box');
  if (addrBox) addrBox.textContent = address;

  document.getElementById('receive-modal')?.classList.remove('hidden');
  const canvas = document.getElementById('receive-qr-canvas');
  if (canvas && typeof QRCode !== 'undefined') {
    QRCode.toCanvas(canvas, `ethereum:${address}@13390`, {
      width: 200,
      color: { dark: '#A78BFA', light: '#0A0E1A' },
    }, (err) => { if (err) console.warn('[QR]', err); });
  }
}

function copyReceiveAddress() {
  const addr = window.WalletState.address;
  if (!addr) return;
  navigator.clipboard.writeText(addr).then(() => walletToast('คัดลอกที่อยู่แล้ว', 'success'));
}

function bindWalletCommandCenter() {
  document.getElementById('wallet-connect-metamask')?.addEventListener('click', () => connectMetaMask());
  document.getElementById('wallet-connect-demo')?.addEventListener('click', connectDemoWallet);
  document.getElementById('wallet-disconnect-btn')?.addEventListener('click', disconnectWallet);
  document.getElementById('wallet-return-btn')?.addEventListener('click', navigateBackFromWalletHub);
  document.getElementById('add-wallet-btn')?.addEventListener('click', () => {
    document.getElementById('wallet-modal')?.classList.remove('hidden');
  });
}

function connectDemoWallet() {
  const demoAddr = '0x' + Array.from({ length: 40 }, () =>
    '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  const demoBal = (Math.random() * 50000 + 1000).toFixed(2);

  Object.assign(window.WalletState, {
    connected: true,
    address: demoAddr,
    balance: '0',
    balanceMEE: demoBal,
    provider: null,
    signer: null,
    tokenContract: null,
    isDemo: true,
    demoBalance: parseFloat(demoBal),
  });

  syncWalletSession();
  updateWalletUI();
  walletToast(`Demo Wallet เชื่อมต่อแล้ว — ${demoBal} MEE`, 'success');
  showConnectionCelebration(demoAddr);
  document.getElementById('wallet-modal')?.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
  bindWalletCommandCenter();
  window.addEventListener('meechain:open-wallet-hub', () => {
    document.getElementById('wallet-modal')?.classList.remove('hidden');
  });

  await window.MeeWalletHub?.syncInjectedAccount?.();
  const session = window.MeeWalletHub?.getSession?.();
  if (session?.connected) {
    if (session.isDemo) {
      Object.assign(window.WalletState, {
        connected: true,
        address: session.address,
        balance: session.balance || '0',
        balanceMEE: session.balanceMEE || '0',
        provider: null,
        signer: null,
        tokenContract: null,
        isDemo: true,
        demoBalance: Number.parseFloat(session.balanceMEE || '0') || 50000,
      });
      updateWalletUI();
    } else {
      await connectMetaMask({ silent: true });
    }
  } else {
    updateWalletUI();
  }
});
