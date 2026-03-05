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
const MEECHAIN_NETWORK = {
  chainId:        '0x344e',   // 13390 decimal
  chainName:      'MeeChain Ritual Chain',
  rpcUrls:        ['http://rpc.meechain.run.place'],
  nativeCurrency: { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
  blockExplorerUrls: ['http://explorer.meechain.run.place'],
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
let TOKEN_ADDRESS   = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
let NFT_ADDRESS     = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
let PORTAL_ADDRESS  = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

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

// ── Load contract addresses from server ──────────────────────────────
async function loadContractAddresses() {
  try {
    const resp = await fetch('/api/network');
    const data = await resp.json();
    if (data.contracts) {
      TOKEN_ADDRESS  = data.contracts.token   || TOKEN_ADDRESS;
      NFT_ADDRESS    = data.contracts.nft     || NFT_ADDRESS;
      PORTAL_ADDRESS = data.contracts.portal  || PORTAL_ADDRESS;
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
    // Chain not added — add it
    if (switchErr.code === 4902 || switchErr.code === -32603) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [MEECHAIN_NETWORK],
        });
        showToast('✅ เพิ่ม MeeChain Ritual Chain ใน MetaMask แล้ว', 'success');
      } catch (addErr) {
        console.warn('[Wallet] Could not add chain:', addErr.message);
        // Continue anyway — user may be on wrong chain
      }
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
  } else if (type === 'demo' || type === 'walletconnect' || type === 'coinbase') {
    connectDemoWallet();
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
