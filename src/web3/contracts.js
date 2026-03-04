// ===== MeeChain Web3 Service =====
// เชื่อมต่อ Smart Contract บน Ritual Chain (Chain ID: 13390)
// RPC: http://rpc.meechain.run.place  (dRPC gateway)
// Fallback: https://ritual-chain--pouaun2499.replit.app

const { ethers } = require('ethers');

// ── Contract ABIs ────────────────────────────────────────────────
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

const NFT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function mint(address to, string memory uri) returns (uint256)',
  'function safeMint(address to, string memory uri) public',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Mint(address indexed to, uint256 indexed tokenId)',
];

const STAKING_ABI = [
  'function stake(uint256 amount) external',
  'function unstake(uint256 amount) external',
  'function claimReward() external',
  'function getStakedAmount(address user) view returns (uint256)',
  'function getPendingReward(address user) view returns (uint256)',
  'function totalStaked() view returns (uint256)',
  'function rewardRate() view returns (uint256)',
  'function getAPR() view returns (uint256)',
  'event Staked(address indexed user, uint256 amount)',
  'event Unstaked(address indexed user, uint256 amount)',
  'event RewardClaimed(address indexed user, uint256 reward)',
];

// ── Web3 Provider & Contracts ────────────────────────────────────
class MeeChainWeb3 {
  constructor(rpcUrl, addresses) {
    this.rpcUrl = rpcUrl;
    this.addresses = addresses;
    this.provider = null;
    this.contracts = {};
    this.connected = false;
    this.chainInfo = null;
  }

  async connect() {
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl, undefined, {
        staticNetwork: true,
      });

      // Test connection with timeout
      const network = await Promise.race([
        this.provider.getNetwork(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 8000)
        ),
      ]);

      this.chainInfo = {
        chainId: Number(network.chainId),
        name: network.name || 'Ritual Chain',
      };

      // Init contracts
      this.contracts.token = new ethers.Contract(
        this.addresses.token, ERC20_ABI, this.provider
      );
      this.contracts.nft = new ethers.Contract(
        this.addresses.nft, NFT_ABI, this.provider
      );
      this.contracts.staking = new ethers.Contract(
        this.addresses.staking, STAKING_ABI, this.provider
      );

      this.connected = true;
      console.log(`✅ Web3 connected: Chain ${this.chainInfo.chainId} (${this.chainInfo.name})`);
      return true;
    } catch (err) {
      console.warn('⚠️ Web3 connection failed:', err.message);
      this.connected = false;
      return false;
    }
  }

  // ── Token Info ──────────────────────────────────────────────────
  async getTokenInfo() {
    if (!this.connected) return this._mockTokenInfo();
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.contracts.token.name(),
        this.contracts.token.symbol(),
        this.contracts.token.decimals(),
        this.contracts.token.totalSupply(),
      ]);
      return {
        name, symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        address: this.addresses.token,
        live: true,
      };
    } catch (e) {
      console.warn('Token info fallback:', e.message);
      return this._mockTokenInfo();
    }
  }

  // ── Token Balance ───────────────────────────────────────────────
  async getTokenBalance(address) {
    if (!this.connected || !ethers.isAddress(address)) return '0';
    try {
      const decimals = await this.contracts.token.decimals();
      const balance = await this.contracts.token.balanceOf(address);
      return ethers.formatUnits(balance, decimals);
    } catch (e) {
      return '0';
    }
  }

  // ── NFT Info ────────────────────────────────────────────────────
  async getNFTInfo() {
    if (!this.connected) return this._mockNFTInfo();
    try {
      const [name, symbol, totalSupply] = await Promise.all([
        this.contracts.nft.name(),
        this.contracts.nft.symbol(),
        this.contracts.nft.totalSupply().catch(() => 0n),
      ]);
      return {
        name, symbol,
        totalSupply: Number(totalSupply),
        address: this.addresses.nft,
        live: true,
      };
    } catch (e) {
      console.warn('NFT info fallback:', e.message);
      return this._mockNFTInfo();
    }
  }

  // ── NFT Balance for address ──────────────────────────────────────
  async getNFTBalance(address) {
    if (!this.connected || !ethers.isAddress(address)) return 0;
    try {
      const bal = await this.contracts.nft.balanceOf(address);
      return Number(bal);
    } catch (e) {
      return 0;
    }
  }

  // ── Staking Info ────────────────────────────────────────────────
  async getStakingInfo() {
    if (!this.connected) return this._mockStakingInfo();
    try {
      const [totalStaked, rewardRate] = await Promise.all([
        this.contracts.staking.totalStaked().catch(() => 0n),
        this.contracts.staking.rewardRate().catch(() => 0n),
      ]);
      const apr = await this.contracts.staking.getAPR().catch(() => 8500n); // 85%
      return {
        totalStaked: ethers.formatEther(totalStaked),
        rewardRate: ethers.formatEther(rewardRate),
        apr: (Number(apr) / 100).toFixed(1) + '%',
        address: this.addresses.staking,
        live: true,
      };
    } catch (e) {
      console.warn('Staking info fallback:', e.message);
      return this._mockStakingInfo();
    }
  }

  // ── User Staking ────────────────────────────────────────────────
  async getUserStaking(address) {
    if (!this.connected || !ethers.isAddress(address)) {
      return { staked: '0', pendingReward: '0' };
    }
    try {
      const [staked, pending] = await Promise.all([
        this.contracts.staking.getStakedAmount(address),
        this.contracts.staking.getPendingReward(address),
      ]);
      return {
        staked: ethers.formatEther(staked),
        pendingReward: ethers.formatEther(pending),
      };
    } catch (e) {
      return { staked: '0', pendingReward: '0' };
    }
  }

  // ── Chain Stats ─────────────────────────────────────────────────
  async getChainStats() {
    if (!this.connected) return this._mockChainStats();
    try {
      const [blockNumber, feeData] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getFeeData(),
      ]);
      const gasPrice = feeData.gasPrice
        ? ethers.formatUnits(feeData.gasPrice, 'gwei')
        : '0.1';
      return {
        blockNumber,
        gasPrice: parseFloat(gasPrice).toFixed(4) + ' Gwei',
        chainId: this.chainInfo?.chainId || 1337,
        live: true,
      };
    } catch (e) {
      return this._mockChainStats();
    }
  }

  // ── Recent Transactions ─────────────────────────────────────────
  async getRecentTransactions(blockCount = 5) {
    if (!this.connected) return [];
    try {
      const latestBlock = await this.provider.getBlockNumber();
      const txList = [];
      const maxBlocks = Math.min(blockCount, 5, latestBlock + 1);
      for (let i = 0; i < maxBlocks; i++) {
        const block = await this.provider.getBlock(latestBlock - i, true);
        if (!block) continue;
        const txs = block.transactions?.slice(0, 3) || [];
        for (const tx of txs) {
          if (typeof tx === 'object' && tx.hash) {
            txList.push({
              hash: tx.hash.slice(0, 10) + '...',
              from: tx.from ? tx.from.slice(0, 8) + '...' : '0x???',
              to: tx.to ? tx.to.slice(0, 8) + '...' : 'Contract',
              value: ethers.formatEther(tx.value || 0n) + ' MEE',
              blockNumber: block.number,
              timestamp: block.timestamp,
            });
          }
        }
      }
      return txList.slice(0, 5);
    } catch (e) {
      return [];
    }
  }

  // ── Mock Fallbacks ──────────────────────────────────────────────
  _mockTokenInfo() {
    return {
      name: 'MeeChain Token', symbol: 'MEE',
      decimals: 18, totalSupply: '100000000',
      address: this.addresses.token, live: false,
    };
  }
  _mockNFTInfo() {
    return {
      name: 'MeeChain NFT', symbol: 'MEENFT',
      totalSupply: 8432,
      address: this.addresses.nft, live: false,
    };
  }
  _mockStakingInfo() {
    return {
      totalStaked: '8524100',
      rewardRate: '0.001',
      apr: '85.0%',
      address: this.addresses.staking, live: false,
    };
  }
  _mockChainStats() {
    return {
      blockNumber: 1248753 + Math.floor(Date.now() / 12000),
      gasPrice: '0.0001 Gwei',
      chainId: 13390,
      live: false,
    };
  }
}

module.exports = { MeeChainWeb3, ERC20_ABI, NFT_ABI, STAKING_ABI };
