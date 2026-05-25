// ===== MeeChain Wallet Hub =====
// Shared wallet session + navigation helpers for all pages.

(() => {
  const STORAGE_KEY = 'meechain_wallet_session_v1';
  const RETURN_KEY = 'meechain_wallet_return_to';
  const HUB_URL = '/index.html#wallet';
  const CHAIN_ID = '0x344e';

  function safeJsonParse(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function fallbackToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }
    if (typeof window.toast === 'function') {
      window.toast(message, type);
      return;
    }
    console[type === 'error' ? 'error' : 'log'](`[WalletHub] ${message}`);
  }

  function shortAddress(address, start = 6, end = 4) {
    if (!address || typeof address !== 'string') return '';
    if (address.length <= start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  }

  function readSession() {
    return safeJsonParse(localStorage.getItem(STORAGE_KEY), {
      connected: false,
      address: '',
      balance: '0',
      balanceMEE: '0',
      isDemo: false,
      updatedAt: 0,
    });
  }

  function writeSession(session) {
    const next = {
      connected: false,
      address: '',
      balance: '0',
      balanceMEE: '0',
      isDemo: false,
      updatedAt: Date.now(),
      ...session,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('meechain:wallet-changed', { detail: next }));
    return next;
  }

  function clearSession() {
    return writeSession({
      connected: false,
      address: '',
      balance: '0',
      balanceMEE: '0',
      isDemo: false,
    });
  }

  function setReturnPath(path) {
    if (!path) return;
    sessionStorage.setItem(RETURN_KEY, path);
  }

  function getReturnPath() {
    return sessionStorage.getItem(RETURN_KEY) || '';
  }

  function consumeReturnPath() {
    const value = getReturnPath();
    sessionStorage.removeItem(RETURN_KEY);
    return value;
  }

  async function syncInjectedAccount() {
    if (!window.ethereum?.request) return readSession();
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts?.[0]) {
        const existing = readSession();
        if (!existing.isDemo) clearSession();
        return readSession();
      }
      const existing = readSession();
      return writeSession({
        ...existing,
        connected: true,
        address: accounts[0],
        isDemo: false,
      });
    } catch {
      return readSession();
    }
  }

  async function ensureMeeChainNetwork() {
    if (!window.ethereum?.request) return false;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_ID }],
      });
      return true;
    } catch (switchErr) {
      if (switchErr.code !== 4902 && switchErr.code !== -32603) return false;
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CHAIN_ID,
            chainName: 'MeeChain Ritual Chain',
            rpcUrls: ['https://rpc.meechain.live', 'https://rpc.meechain.run.place'],
            nativeCurrency: { name: 'MEE Token', symbol: 'MEE', decimals: 18 },
            blockExplorerUrls: ['https://app.meechain.live/explorer.html'],
          }],
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  async function requestMetaMaskSession() {
    if (!window.ethereum?.request) {
      fallbackToast('ไม่พบ MetaMask กรุณาติดตั้งก่อน', 'error');
      window.open('https://metamask.io/download/', '_blank');
      return readSession();
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts?.[0]) return readSession();
    await ensureMeeChainNetwork();
    return writeSession({
      ...readSession(),
      connected: true,
      address: accounts[0],
      isDemo: false,
    });
  }

  function openHub(options = {}) {
    const returnTo = options.returnTo || `${location.pathname}${location.search || ''}`;
    setReturnPath(returnTo);
    if (location.pathname.endsWith('/index.html') || location.pathname === '/' || location.pathname === '') {
      location.hash = 'wallet';
      window.dispatchEvent(new CustomEvent('meechain:open-wallet-hub'));
      return;
    }
    location.href = HUB_URL;
  }

  window.MeeWalletHub = {
    STORAGE_KEY,
    HUB_URL,
    shortAddress,
    notify: fallbackToast,
    getSession: readSession,
    setSession: writeSession,
    clearSession,
    setReturnPath,
    getReturnPath,
    consumeReturnPath,
    syncInjectedAccount,
    ensureMeeChainNetwork,
    requestMetaMaskSession,
    openHub,
  };
})();
