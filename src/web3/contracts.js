// ===== MeeChain Web3 Service v2.0 =====
// เชื่อมต่อ Smart Contract บน Ritual Chain (Chain ID: 13390)
// RPC: https://rpc.meechain.live  (dRPC gateway)
// Supports: ERC-20 MEE, ERC-721 MeeBotNFT, Staking, NeonovaPortal, GovernanceDAO

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
  // State-changing functions
  'function stake(uint256 amount) external',
  'function unstake(uint256 amount) external',
  'function claimReward() external',
  'function emergencyWithdraw() external',
  // Pool management (multi-pool staking)
  'function stakeInPool(uint256 poolId, uint256 amount) external',
  'function unstakeFromPool(uint256 poolId, uint256 amount) external',
  'function claimPoolReward(uint256 poolId) external',
  // View functions
  'function getStakedAmount(address user) view returns (uint256)',
  'function getPendingReward(address user) view returns (uint256)',
  'function totalStaked() view returns (uint256)',
  'function rewardRate() view returns (uint256)',
  'function getAPR() view returns (uint256)',
  'function getUserPoolInfo(address user, uint256 poolId) view returns (uint256 staked, uint256 reward, uint256 lockEnd)',
  'function getPoolInfo(uint256 poolId) view returns (uint256 totalStaked, uint256 apr, uint256 lockDays, uint256 minStake)',
  'function poolCount() view returns (uint256)',
  // Events
  'event Staked(address indexed user, uint256 amount)',
  'event Unstaked(address indexed user, uint256 amount)',
  'event RewardClaimed(address indexed user, uint256 reward)',
  'event PoolStaked(address indexed user, uint256 indexed poolId, uint256 amount)',
  'event PoolUnstaked(address indexed user, uint256 indexed poolId, uint256 amount)',
];

// ── GovernanceDAO ABI ────────────────────────────────────────────
const DAO_ABI = [
  // State-changing
  'function propose(string title, string description, string category, address target, bytes callData) returns (uint256)',
  'function castVote(uint256 proposalId, uint8 voteType, string reason) external',
  'function voteFor(uint256 proposalId, string reason) external',
  'function voteAgainst(uint256 proposalId, string reason) external',
  'function execute(uint256 proposalId) external',
  'function cancel(uint256 proposalId, string reason) external',
  // View
  'function proposalCount() view returns (uint256)',
  'function getProposalState(uint256 proposalId) view returns (uint8)',
  'function getReceipt(uint256 proposalId, address voter) view returns (bool hasVoted, uint8 vote, uint256 power)',
  'function getVotePercentages(uint256 proposalId) view returns (uint256 forPct, uint256 againstPct, uint256 abstainPct, uint256 total)',
  'function getUserProposals(address user) view returns (uint256[])',
  'function getUserVotes(address user) view returns (uint256[])',
  'function quorumReached(uint256 proposalId) view returns (bool)',
  'function getStats() view returns (uint256 total, uint256 active, uint256 passed, uint256 rejected)',
  'function QUORUM() view returns (uint256)',
  'function PROPOSAL_STAKE() view returns (uint256)',
  'function VOTING_PERIOD() view returns (uint256)',
  // Events
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, string category, uint256 startTime, uint256 endTime)',
  'event VoteCast(uint256 indexed proposalId, address indexed voter, uint8 vote, uint256 power, string reason)',
  'event ProposalExecuted(uint256 indexed proposalId)',
  'event ProposalCancelled(uint256 indexed proposalId, string reason)',
];

// ── NeonovaPortal ABI ────────────────────────────────────────────
const PORTAL_ABI = [
  'function performCeremony(uint8 ctype, uint256 amount) external payable',
  'function getCeremonyCount() view returns (uint256)',
  'function getTotalPortalValue() view returns (uint256)',
  'function getUserPortal(address user) view returns (uint256 totalDeposited, uint256 totalWithdrawn)',
  'function PORTAL_FEE() view returns (uint256)',
  'event CeremonyPerformed(uint256 indexed id, address indexed participant, uint8 ctype, uint256 amount)',
];

// ── Web3 Provider & Contracts ────────────────────────────────────
class MeeChainWeb3 {
  constructor(rpcUrl, addresses) {
    this.rpcUrl    = rpcUrl;
    this.addresses = addresses; // { token, nft, staking, dao?, portal? }
    this.provider  = null;
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
      this.contracts.token   = new ethers.Contract(this.addresses.token,   ERC20_ABI,   this.provider);
      this.contracts.nft     = new ethers.Contract(this.addresses.nft,     NFT_ABI,     this.provider);
      this.contracts.staking = new ethers.Contract(this.addresses.staking, STAKING_ABI, this.provider);

      // Optional: DAO & Portal (only if address is provided and not same as staking)
      if (this.addresses.dao && ethers.isAddress(this.addresses.dao)) {
        this.contracts.dao = new ethers.Contract(this.addresses.dao, DAO_ABI, this.provider);
      }
      if (this.addresses.portal && ethers.isAddress(this.addresses.portal)) {
        this.contracts.portal = new ethers.Contract(this.addresses.portal, PORTAL_ABI, this.provider);
      }

      this.connected = true;
      console.log(`✅ Web3 v2 connected: Chain ${this.chainInfo.chainId} (${this.chainInfo.name})`);
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
        chainId: this.chainInfo?.chainId || 13390,
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

  // ── Multi-Pool Staking ──────────────────────────────────────────

  /** Get all pool infos (0=Standard, 1=Premium, 2=Ritual) */
  async getStakingPools() {
    const POOLS = [
      { id: 0, name: 'Standard Pool',     color: '#06B6D4', apy: 85,  lockDays: 30,  minStake: 100  },
      { id: 1, name: 'Premium Pool',      color: '#7C3AED', apy: 148, lockDays: 90,  minStake: 1000 },
      { id: 2, name: 'Ritual Chain Pool', color: '#F97316', apy: 248, lockDays: 180, minStake: 5000 },
    ];
    if (!this.connected) return POOLS.map(p => ({ ...p, totalStaked: 0, live: false }));

    return Promise.all(POOLS.map(async (p) => {
      try {
        const info = await this.contracts.staking.getPoolInfo(p.id);
        return {
          ...p,
          totalStaked: parseFloat(ethers.formatEther(info.totalStaked || 0n)).toFixed(2),
          apr:         info.apr ? Number(info.apr) / 100 : p.apy,
          lockDays:    info.lockDays ? Number(info.lockDays) : p.lockDays,
          minStake:    info.minStake ? parseFloat(ethers.formatEther(info.minStake)) : p.minStake,
          live:        true,
        };
      } catch {
        return { ...p, totalStaked: 0, live: false };
      }
    }));
  }

  /** Get user's position in a specific pool */
  async getUserPoolInfo(address, poolId) {
    if (!this.connected || !ethers.isAddress(address)) {
      return { staked: '0', reward: '0', lockEnd: 0, live: false };
    }
    try {
      const info = await this.contracts.staking.getUserPoolInfo(address, poolId);
      return {
        staked:  ethers.formatEther(info.staked  || 0n),
        reward:  ethers.formatEther(info.reward  || 0n),
        lockEnd: Number(info.lockEnd || 0n) * 1000, // ms
        live:    true,
      };
    } catch {
      return { staked: '0', reward: '0', lockEnd: 0, live: false };
    }
  }

  /** Calculate staking reward for a given amount, pool, days */
  calculateReward(amount, apyPercent, days) {
    const principal = parseFloat(amount);
    if (!principal || !apyPercent || !days) return { reward: '0', total: '0' };
    const reward = (principal * (apyPercent / 100) * (days / 365));
    return {
      amount:      principal.toFixed(4),
      apy:         apyPercent,
      days,
      reward:      reward.toFixed(4),
      total:       (principal + reward).toFixed(4),
      rewardUsd:   (reward * 0.0842).toFixed(2),
      dailyReward: (reward / days).toFixed(6),
    };
  }

  // ── GovernanceDAO Read ──────────────────────────────────────────

  /** Get live proposal count and stats from chain */
  async getDaoStats() {
    if (!this.connected || !this.contracts.dao) {
      return { total: 0, active: 0, passed: 0, rejected: 0, live: false };
    }
    try {
      const stats = await this.contracts.dao.getStats();
      return {
        total:    Number(stats.total),
        active:   Number(stats.active),
        passed:   Number(stats.passed),
        rejected: Number(stats.rejected),
        quorum:   ethers.formatEther(await this.contracts.dao.QUORUM()),
        live:     true,
      };
    } catch (e) {
      return { total: 0, active: 0, passed: 0, rejected: 0, live: false };
    }
  }

  /** Get user's vote receipt for a proposal */
  async getDaoReceipt(proposalId, address) {
    if (!this.connected || !this.contracts.dao || !ethers.isAddress(address)) {
      return { hasVoted: false, live: false };
    }
    try {
      const r = await this.contracts.dao.getReceipt(proposalId, address);
      return { hasVoted: r.hasVoted, vote: Number(r.vote), power: ethers.formatEther(r.power || 0n), live: true };
    } catch {
      return { hasVoted: false, live: false };
    }
  }

  // ── NeonovaPortal ───────────────────────────────────────────────

  /** Get portal stats */
  async getPortalStats() {
    if (!this.connected || !this.contracts.portal) {
      return { ceremonyCount: 0, totalValue: '0', live: false };
    }
    try {
      const [count, tvl, fee] = await Promise.all([
        this.contracts.portal.getCeremonyCount(),
        this.contracts.portal.getTotalPortalValue(),
        this.contracts.portal.PORTAL_FEE(),
      ]);
      return {
        ceremonyCount: Number(count),
        totalValue:    ethers.formatEther(tvl),
        portalFee:     ethers.formatEther(fee),
        live:          true,
      };
    } catch (e) {
      return { ceremonyCount: 0, totalValue: '0', live: false };
    }
  }

  // ── Block & Tx helpers ──────────────────────────────────────────

  /** Get latest block number with safe fallback */
  async getBlockNumber() {
    if (!this.connected) return this._mockChainStats().blockNumber;
    try {
      return await this.provider.getBlockNumber();
    } catch {
      return this._mockChainStats().blockNumber;
    }
  }

  /** Get block by number with transactions */
  async getBlock(blockNumber, withTxs = false) {
    if (!this.connected) return null;
    try {
      return await this.provider.getBlock(blockNumber, withTxs);
    } catch {
      return null;
    }
  }

  // ── Mock Fallbacks ──────────────────────────────────────────────
  _mockTokenInfo() {
    return {
      name: 'MeeChain Token', symbol: 'MCT',
      decimals: 18, totalSupply: '10000000',
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

module.exports = { MeeChainWeb3, ERC20_ABI, NFT_ABI, STAKING_ABI, DAO_ABI, PORTAL_ABI };
