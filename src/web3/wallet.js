// ===== MeeChain Wallet Integration =====
// เชื่อมต่อ MetaMask และ Web3 Wallets

class MeeChainWallet {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.chainId = 13390; // MeeChain Chain ID
    this.rpcUrl = 'https://42c7069b-865d-4df8-b7c6-7e205ac23047-00-3hc01fewihowr.pike.replit.dev:3003';
  }

  // ตรวจสอบว่ามี MetaMask หรือไม่
  isMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined';
  }

  // เชื่อมต่อ MetaMask
  async connectMetaMask() {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('กรุณาติดตั้ง MetaMask ก่อน');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.address = accounts[0];

      // Check chain ID
      const network = await this.provider.getNetwork();
      const currentChainId = Number(network.chainId);

      // Switch to MeeChain if needed
      if (currentChainId !== this.chainId) {
        await this.switchToMeeChain();
      }

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.address = accounts[0];
          window.dispatchEvent(new CustomEvent('walletAccountChanged', { 
            detail: { address: this.address } 
          }));
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      return {
        address: this.address,
        chainId: currentChainId
      };
    } catch (error) {
      console.error('MetaMask connection error:', error);
      throw error;
    }
  }

  // สลับไปยัง MeeChain network
  async switchToMeeChain() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${this.chainId.toString(16)}` }], // 0x344e
      });
    } catch (switchError) {
      // Chain not added yet, add it
      if (switchError.code === 4902) {
        await this.addMeeChainNetwork();
      } else {
        throw switchError;
      }
    }
  }

  // เพิ่ม MeeChain network ใน MetaMask
  async addMeeChainNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${this.chainId.toString(16)}`, // 0x344e
          chainName: 'MeeChain (Ritual Chain)',
          nativeCurrency: {
            name: 'MeeChain',
            symbol: 'MEE',
            decimals: 18
          },
          rpcUrls: [this.rpcUrl],
          blockExplorerUrls: []
        }]
      });
    } catch (error) {
      console.error('Add network error:', error);
      throw error;
    }
  }

  // ดึง balance
  async getBalance() {
    if (!this.provider || !this.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.provider.getBalance(this.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Get balance error:', error);
      return '0';
    }
  }

  // ดึง token balance
  async getTokenBalance(tokenAddress) {
    if (!this.provider || !this.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
        this.provider
      );

      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(this.address),
        tokenContract.decimals()
      ]);

      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Get token balance error:', error);
      return '0';
    }
  }

  // ส่ง transaction
  async sendTransaction(to, amount) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.signer.sendTransaction({
        to: to,
        value: ethers.parseEther(amount.toString())
      });

      return await tx.wait();
    } catch (error) {
      console.error('Send transaction error:', error);
      throw error;
    }
  }

  // Disconnect wallet
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
  }

  // Get current address
  getAddress() {
    return this.address;
  }

  // Check if connected
  isConnected() {
    return this.address !== null;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MeeChainWallet };
}
