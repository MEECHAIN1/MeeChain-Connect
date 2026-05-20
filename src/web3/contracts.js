'use strict';

const { ethers } = require('ethers');

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

const NFT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function mint(address to, string uri) returns (uint256)',
];

const STAKING_ABI = [
  'function stake(uint256 amount)',
  'function unstake(uint256 amount)',
  'function claimReward()',
  'function getStakedAmount(address user) view returns (uint256)',
  'function getPendingReward(address user) view returns (uint256)',
  'function stakeInPool(uint256 poolId, uint256 amount)',
  'function getPoolInfo(uint256 poolId) view returns (uint256 apy, uint256 lockDays, uint256 minStake, uint256 totalStaked, bool active)',
  'function getUserPoolInfo(address user, uint256 poolId) view returns (uint256 staked, uint256 reward, uint256 lockEnd)',
];

const DAO_ABI = [
  'function propose(string description) returns (uint256)',
  'function castVote(uint256 proposalId, bool support)',
  'function proposalCount() view returns (uint256)',
  'function getProposal(uint256 proposalId) view returns (uint256 forVotes, uint256 againstVotes, bool executed)',
  'function hasVoted(uint256 proposalId, address voter) view returns (bool)',
];

const PORTAL_ABI = [
  'function performCeremony(uint256 amount)',
  'function ceremonyCount() view returns (uint256)',
  'function totalValue() view returns (uint256)',
];

const DEFAULT_CHAIN_ID = 13390;
const MEE_USD = 0.0842;

function isAddress(address) {
  return typeof address === 'string' && ethers.isAddress(address);
}

function formatUnits(value, decimals = 18) {
  try {
    return ethers.formatUnits(value ?? 0n, decimals);
  } catch {
    return '0';
  }
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

class MeeChainWeb3 {
  constructor(rpcUrl, addresses = {}) {
    this.rpcUrl = rpcUrl;
    this.addresses = addresses;
    this.provider = null;
    this.contracts = {};
    this.chainInfo = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl, undefined, { staticNetwork: false });
      const network = await this.provider.getNetwork();
      this.chainInfo = {
        chainId: Number(network.chainId),
        name: network.name,
      };

      this.contracts = {};
      if (isAddress(this.addresses.token)) {
        this.contracts.token = new ethers.Contract(this.addresses.token, ERC20_ABI, this.provider);
      }
      if (isAddress(this.addresses.nft)) {
        this.contracts.nft = new ethers.Contract(this.addresses.nft, NFT_ABI, this.provider);
      }
      if (isAddress(this.addresses.staking)) {
        this.contracts.staking = new ethers.Contract(this.addresses.staking, STAKING_ABI, this.provider);
      }
      if (isAddress(this.addresses.dao)) {
        this.contracts.dao = new ethers.Contract(this.addresses.dao, DAO_ABI, this.provider);
      }
      if (isAddress(this.addresses.portal)) {
        this.contracts.portal = new ethers.Contract(this.addresses.portal, PORTAL_ABI, this.provider);
      }

      this.connected = true;
      return true;
    } catch (error) {
      this.provider = null;
      this.contracts = {};
      this.chainInfo = null;
      this.connected = false;
      return false;
    }
  }

  async getTokenInfo() {
    if (!this.connected || !this.contracts.token) {
      return {
        name: 'MeeChain Token',
        symbol: 'MEE',
        decimals: 18,
        totalSupply: '1000000000.0',
        address: this.addresses.token,
        live: false,
      };
    }

    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.contracts.token.name(),
        this.contracts.token.symbol(),
        this.contracts.token.decimals(),
        this.contracts.token.totalSupply(),
      ]);
      const dec = toNumber(decimals, 18);
      return {
        name,
        symbol,
        decimals: dec,
        totalSupply: formatUnits(totalSupply, dec),
        address: this.addresses.token,
        live: true,
      };
    } catch {
      return { ...(await this.getTokenInfoFallback()), live: false };
    }
  }

  async getTokenInfoFallback() {
    return {
      name: 'MeeChain Token',
      symbol: 'MEE',
      decimals: 18,
      totalSupply: '1000000000.0',
      address: this.addresses.token,
    };
  }

  async getNFTInfo() {
    if (!this.connected || !this.contracts.nft) {
      return {
        name: 'MeeBot NFT',
        symbol: 'MEEBOT',
        totalSupply: 128,
        address: this.addresses.nft,
        live: false,
      };
    }

    try {
      const [name, symbol, totalSupply] = await Promise.all([
        this.contracts.nft.name(),
        this.contracts.nft.symbol(),
        this.contracts.nft.totalSupply(),
      ]);
      return {
        name,
        symbol,
        totalSupply: toNumber(totalSupply),
        address: this.addresses.nft,
        live: true,
      };
    } catch {
      return {
        name: 'MeeBot NFT',
        symbol: 'MEEBOT',
        totalSupply: 128,
        address: this.addresses.nft,
        live: false,
      };
    }
  }

  async getStakingInfo() {
    if (!this.connected || !this.contracts.staking) {
      return {
        totalStaked: '2500000',
        apr: '85%',
        address: this.addresses.staking,
        live: false,
      };
    }

    try {
      const pools = await this.getStakingPools();
      const total = pools.reduce((sum, pool) => sum + toNumber(pool.totalStaked), 0);
      return {
        totalStaked: String(total),
        apr: '85%',
        address: this.addresses.staking,
        live: true,
      };
    } catch {
      return {
        totalStaked: '2500000',
        apr: '85%',
        address: this.addresses.staking,
        live: false,
      };
    }
  }

  async getChainStats() {
    if (!this.connected || !this.provider) return this._mockChainStats();

    try {
      const [blockNumber, feeData, network] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getFeeData(),
        this.provider.getNetwork(),
      ]);
      const gasPrice = feeData.gasPrice ? `${Number(ethers.formatUnits(feeData.gasPrice, 'gwei')).toFixed(2)} Gwei` : '1.00 Gwei';
      return {
        blockNumber,
        chainId: Number(network.chainId),
        gasPrice,
        live: true,
      };
    } catch {
      return this._mockChainStats();
    }
  }

  async getRecentTransactions() {
    return [];
  }

  async getBlock(blockNumber) {
    if (!this.connected || !this.provider) return null;
    try {
      return await this.provider.getBlock(blockNumber);
    } catch {
      return null;
    }
  }

  async getBlockNumber() {
    if (!this.connected || !this.provider) return this._mockChainStats().blockNumber;
    try {
      return await this.provider.getBlockNumber();
    } catch {
      return this._mockChainStats().blockNumber;
    }
  }

  async getTokenBalance(address) {
    if (!isAddress(address) || !this.connected || !this.contracts.token) return '0';
    try {
      const decimals = await this.contracts.token.decimals();
      const balance = await this.contracts.token.balanceOf(address);
      return formatUnits(balance, toNumber(decimals, 18));
    } catch {
      return '0';
    }
  }

  async getNFTBalance(address) {
    if (!isAddress(address) || !this.connected || !this.contracts.nft) return 0;
    try {
      return toNumber(await this.contracts.nft.balanceOf(address));
    } catch {
      return 0;
    }
  }

  async getUserStaking(address) {
    if (!isAddress(address) || !this.connected || !this.contracts.staking) {
      return { staked: '0', pendingReward: '0' };
    }

    try {
      const [staked, pendingReward] = await Promise.all([
        this.contracts.staking.getStakedAmount(address),
        this.contracts.staking.getPendingReward(address),
      ]);
      return {
        staked: formatUnits(staked),
        pendingReward: formatUnits(pendingReward),
      };
    } catch {
      return { staked: '0', pendingReward: '0' };
    }
  }

  calculateReward(amount, apyPercent, days) {
    const principal = parseFloat(amount);
    const apy = parseFloat(apyPercent);
    const duration = parseFloat(days);
    if (!principal || !apy || !duration) {
      return { reward: '0', total: '0', amount: '0', apy: apyPercent, days, rewardUsd: '0.00', dailyReward: '0' };
    }

    const reward = principal * (apy / 100) * (duration / 365);
    return {
      amount: principal.toFixed(4),
      reward: reward.toFixed(4),
      total: (principal + reward).toFixed(4),
      apy: apyPercent,
      days,
      rewardUsd: (reward * MEE_USD).toFixed(2),
      dailyReward: (reward / duration).toFixed(6),
    };
  }

  async getStakingPools() {
    const mockPools = [
      { id: 0, name: 'MEE Standard Pool', apy: 85, lockDays: 30, minStake: 100, totalStaked: '1000000', live: false },
      { id: 1, name: 'MEE Premium Pool', apy: 148, lockDays: 90, minStake: 1000, totalStaked: '900000', live: false },
      { id: 2, name: 'Ritual Chain Pool', apy: 248, lockDays: 180, minStake: 5000, totalStaked: '600000', live: false },
    ];

    if (!this.connected || !this.contracts.staking?.getPoolInfo) return mockPools;

    try {
      return await Promise.all(mockPools.map(async (pool) => {
        const info = await this.contracts.staking.getPoolInfo(pool.id);
        return {
          ...pool,
          apy: toNumber(info.apy ?? info[0], pool.apy),
          lockDays: toNumber(info.lockDays ?? info[1], pool.lockDays),
          minStake: toNumber(formatUnits(info.minStake ?? info[2] ?? 0n), pool.minStake),
          totalStaked: formatUnits(info.totalStaked ?? info[3] ?? 0n),
          live: true,
        };
      }));
    } catch {
      return mockPools;
    }
  }

  async getDaoStats() {
    if (!this.connected || !this.contracts.dao) {
      return { total: 0, active: 0, passed: 0, rejected: 0, live: false };
    }

    try {
      const total = toNumber(await this.contracts.dao.proposalCount());
      return { total, active: 0, passed: 0, rejected: 0, live: true };
    } catch {
      return { total: 0, active: 0, passed: 0, rejected: 0, live: false };
    }
  }

  async getPortalStats() {
    if (!this.connected || !this.contracts.portal) {
      return { ceremonyCount: 0, totalValue: '0', live: false };
    }

    try {
      const [ceremonyCount, totalValue] = await Promise.all([
        this.contracts.portal.ceremonyCount(),
        this.contracts.portal.totalValue(),
      ]);
      return {
        ceremonyCount: toNumber(ceremonyCount),
        totalValue: formatUnits(totalValue),
        live: true,
      };
    } catch {
      return { ceremonyCount: 0, totalValue: '0', live: false };
    }
  }

  async getDaoReceipt(proposalId, address) {
    if (!isAddress(address) || !this.connected || !this.contracts.dao) {
      return { proposalId, address, hasVoted: false, live: false };
    }

    try {
      return {
        proposalId,
        address,
        hasVoted: !!(await this.contracts.dao.hasVoted(proposalId, address)),
        live: true,
      };
    } catch {
      return { proposalId, address, hasVoted: false, live: false };
    }
  }

  async getUserPoolInfo(address, poolId) {
    if (!isAddress(address) || !this.connected || !this.contracts.staking?.getUserPoolInfo) {
      return { staked: '0', reward: '0', lockEnd: 0, live: false };
    }

    try {
      const info = await this.contracts.staking.getUserPoolInfo(address, poolId);
      return {
        staked: formatUnits(info.staked ?? info[0] ?? 0n),
        reward: formatUnits(info.reward ?? info[1] ?? 0n),
        lockEnd: toNumber(info.lockEnd ?? info[2] ?? 0),
        live: true,
      };
    } catch {
      return { staked: '0', reward: '0', lockEnd: 0, live: false };
    }
  }

  _mockChainStats() {
    const baseBlock = 1248753;
    const elapsedSeconds = Math.floor(Date.now() / 1000) - 1712800000;
    return {
      blockNumber: baseBlock + Math.max(0, elapsedSeconds),
      chainId: DEFAULT_CHAIN_ID,
      gasPrice: '1.00 Gwei',
      tps: 2400,
      validators: 128,
      live: false,
    };
  }
}

module.exports = {
  MeeChainWeb3,
  ERC20_ABI,
  NFT_ABI,
  STAKING_ABI,
  DAO_ABI,
  PORTAL_ABI,
};
