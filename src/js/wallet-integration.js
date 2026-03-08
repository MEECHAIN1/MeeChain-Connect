// ===== MeeChain Wallet Integration for Frontend =====
// Replace the connectWallet function in app.js with this

async function connectWalletReal(type) {
  const loadingMsg = {
    metamask: 'กำลังเชื่อมต่อ MetaMask...',
    walletconnect: 'กำลังสร้าง QR Code...',
    coinbase: 'กำลังเปิด Coinbase Wallet...',
    demo: 'กำลังสร้าง Demo Wallet...',
  };
  showToast(loadingMsg[type] || 'กำลังเชื่อมต่อ...', 'info');

  // Handle MetaMask connection
  if (type === 'metamask') {
    try {
      // Check if ethers is loaded
      if (typeof ethers === 'undefined') {
        console.error('Ethers.js not loaded');
        showToast('กำลังโหลด Web3 library...', 'info');
        setTimeout(() => connectWalletReal(type), 1000);
        return;
      }

      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        showToast('กรุณาติดตั้ง MetaMask ก่อน', 'error');
        window.open('https://metamask.io/download/', '_blank');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const address = accounts[0];

      // Create provider (ethers v6 syntax)
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Check chain ID
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const targetChainId = 56; // BSC Mainnet

      // Switch to BSC if needed
      if (currentChainId !== targetChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x38' }], // 56 in hex
          });
        } catch (switchError) {
          // Chain not added yet, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x38',
                chainName: 'BNB Smart Chain Mainnet',
                nativeCurrency: {
                  name: 'BNB',
                  symbol: 'BNB',
                  decimals: 18
                },
                rpcUrls: ['https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9'],
                blockExplorerUrls: ['https://bscscan.com']
              }]
            });
          } else {
            throw switchError;
          }
        }
      }

      // Get balance
      const balance = await provider.getBalance(address);
      const balanceInEth = ethers.formatEther(balance);
      
      // Update app state
      AppState.walletConnected = true;
      AppState.walletAddress = address;
      AppState.walletBalance = parseFloat(balanceInEth).toFixed(4);
      AppState.provider = provider;

      // Update UI
      const walletBtnText = document.getElementById('wallet-btn-text');
      const connectBtn = document.getElementById('connect-wallet-btn');
      if (walletBtnText) walletBtnText.textContent = truncateHash(address, 6, 4);
      if (connectBtn) connectBtn.classList.add('connected');

      const walletDisplay = document.getElementById('wallet-address-display');
      if (walletDisplay) walletDisplay.textContent = address;

      // Update wallet balance display
      const balanceEl = document.querySelector('.wcard-balance-value');
      const usdEl = document.querySelector('.wcard-balance-usd');
      if (balanceEl) balanceEl.textContent = `${AppState.walletBalance} MEE`;
      if (usdEl) usdEl.textContent = `≈ ${(AppState.walletBalance * 0.0842).toFixed(2)} USD`;

      // Update token list if exists
      if (typeof MEECHAIN_DATA !== 'undefined' && MEECHAIN_DATA.tokens) {
        MEECHAIN_DATA.tokens[0].amount = AppState.walletBalance;
        MEECHAIN_DATA.tokens[0].usd = `${(AppState.walletBalance * 0.0842).toFixed(2)}`;
        if (typeof renderTokenList === 'function') {
          renderTokenList();
        }
      }

      // Close modal
      const modal = document.getElementById('wallet-modal');
      if (modal) modal.classList.add('hidden');
      
      showToast(`เชื่อมต่อ MetaMask สำเร็จ! 🎉`, 'success');

      // Remove old listeners to prevent duplicates
      if (window.ethereum.removeAllListeners) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }

      // Listen for account changes
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
          // Disconnected
          AppState.walletConnected = false;
          AppState.walletAddress = null;
          if (connectBtn) connectBtn.classList.remove('connected');
          if (walletBtnText) walletBtnText.textContent = 'เชื่อมต่อกระเป๋าเงิน';
          showToast('ตัดการเชื่อมต่อแล้ว', 'info');
        } else {
          // Account changed
          AppState.walletAddress = accounts[0];
          if (walletBtnText) walletBtnText.textContent = truncateHash(accounts[0], 6, 4);
          if (walletDisplay) walletDisplay.textContent = accounts[0];
          
          // Update balance
          const newBalance = await provider.getBalance(accounts[0]);
          AppState.walletBalance = parseFloat(ethers.formatEther(newBalance)).toFixed(4);
          if (balanceEl) balanceEl.textContent = `${AppState.walletBalance} MEE`;
          
          showToast('เปลี่ยน account แล้ว', 'info');
        }
      };

      // Listen for chain changes
      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

    } catch (error) {
      console.error('Wallet connection error:', error);
      let errorMsg = 'ไม่สามารถเชื่อมต่อได้';
      
      if (error.code === 4001) {
        errorMsg = 'คุณปฏิเสธการเชื่อมต่อ';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      showToast(errorMsg, 'error');
    }
    return;
  }

  // Demo wallet (fallback for other wallet types)
  setTimeout(() => {
    AppState.walletConnected = true;
    AppState.walletAddress = `0x${Math.random().toString(16).slice(2,10)}...${Math.random().toString(16).slice(2,6)}`;
    AppState.walletBalance = (Math.random() * 1000 + 50).toFixed(2);

    const walletBtnText = document.getElementById('wallet-btn-text');
    const connectBtn = document.getElementById('connect-wallet-btn');
    if (walletBtnText) walletBtnText.textContent = truncateHash(AppState.walletAddress, 6, 4);
    if (connectBtn) connectBtn.classList.add('connected');

    const walletDisplay = document.getElementById('wallet-address-display');
    if (walletDisplay) walletDisplay.textContent = AppState.walletAddress;

    const balanceEl = document.querySelector('.wcard-balance-value');
    const usdEl = document.querySelector('.wcard-balance-usd');
    if (balanceEl) balanceEl.textContent = `${AppState.walletBalance} MEE`;
    if (usdEl) usdEl.textContent = `≈ ${(AppState.walletBalance * 0.0842).toFixed(2)} USD`;

    if (typeof MEECHAIN_DATA !== 'undefined' && MEECHAIN_DATA.tokens) {
      MEECHAIN_DATA.tokens[0].amount = AppState.walletBalance;
      MEECHAIN_DATA.tokens[0].usd = `${(AppState.walletBalance * 0.0842).toFixed(2)}`;
      if (typeof renderTokenList === 'function') {
        renderTokenList();
      }
    }

    const modal = document.getElementById('wallet-modal');
    if (modal) modal.classList.add('hidden');
    
    showToast(`เชื่อมต่อกระเป๋าเงินสำเร็จ! 🎉`, 'success');
  }, 1500);
}

// Helper function to truncate hash
function truncateHash(hash, start = 6, end = 4) {
  if (!hash) return '';
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

// Export to global scope for app.js to use
window.connectWalletReal = connectWalletReal;
