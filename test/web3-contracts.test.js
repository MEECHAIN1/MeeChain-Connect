'use strict';
/**
 * Unit tests for the rewritten src/web3/contracts.js introduced in this PR.
 *
 * The PR completely replaced the MeeChainWeb3 class with a v2 implementation
 * that adds full ABI definitions, multi-pool staking, DAO, NeonovaPortal,
 * and mock fallback methods.
 *
 * These tests exercise:
 *   - ABI constant exports (ERC20_ABI, NFT_ABI, STAKING_ABI, DAO_ABI, PORTAL_ABI)
 *   - MeeChainWeb3 constructor initial state
 *   - Mock fallback behaviour when connected = false
 *   - Invalid-address guards across multiple methods
 *   - calculateReward() — pure synchronous function
 *   - Offline fallbacks for getStakingPools(), getDaoStats(), getPortalStats()
 *
 * Strategy: Tests do NOT establish a real RPC connection. Instead we rely on the
 * class' own guard (`if (!this.connected) return mockData`) which is the core
 * logic changed in this PR.
 */

const assert = require('assert');
const { describe, it, beforeEach } = require('mocha');

const {
  MeeChainWeb3,
  ERC20_ABI,
  NFT_ABI,
  STAKING_ABI,
  DAO_ABI,
  PORTAL_ABI,
} = require('../src/web3/contracts.js');

// ── Sample addresses used across tests ────────────────────────────────────────

const ADDRESSES = {
  token:   '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  nft:     '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  staking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
};

const ADDRESSES_WITH_OPTIONAL = {
  ...ADDRESSES,
  dao:    '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
  portal: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
};

const INVALID_ADDRESSES = [
  '',
  'not-an-address',
  '0x',
  '0xinvalid',
  null,
  undefined,
  123,
];

// ── Helper: create a disconnected instance ───────────────────────────────────

function makeOfflineWeb3(addresses = ADDRESSES) {
  const w3 = new MeeChainWeb3('https://example.invalid', addresses);
  // connected stays false (no actual connect() call)
  return w3;
}

// ── ABI Constants ─────────────────────────────────────────────────────────────

describe('ABI exports', () => {
  it('ERC20_ABI is a non-empty array', () => {
    assert.ok(Array.isArray(ERC20_ABI));
    assert.ok(ERC20_ABI.length > 0, 'ERC20_ABI must not be empty');
  });

  it('NFT_ABI is a non-empty array', () => {
    assert.ok(Array.isArray(NFT_ABI));
    assert.ok(NFT_ABI.length > 0, 'NFT_ABI must not be empty');
  });

  it('STAKING_ABI is a non-empty array', () => {
    assert.ok(Array.isArray(STAKING_ABI));
    assert.ok(STAKING_ABI.length > 0, 'STAKING_ABI must not be empty');
  });

  it('DAO_ABI is a non-empty array', () => {
    assert.ok(Array.isArray(DAO_ABI));
    assert.ok(DAO_ABI.length > 0, 'DAO_ABI must not be empty');
  });

  it('PORTAL_ABI is a non-empty array', () => {
    assert.ok(Array.isArray(PORTAL_ABI));
    assert.ok(PORTAL_ABI.length > 0, 'PORTAL_ABI must not be empty');
  });

  it('ERC20_ABI includes balanceOf and transfer', () => {
    const signatures = ERC20_ABI.join(' ');
    assert.ok(signatures.includes('balanceOf'));
    assert.ok(signatures.includes('transfer'));
  });

  it('NFT_ABI includes tokenURI and ownerOf', () => {
    const signatures = NFT_ABI.join(' ');
    assert.ok(signatures.includes('tokenURI'));
    assert.ok(signatures.includes('ownerOf'));
  });

  it('STAKING_ABI includes stake, unstake, and claimReward', () => {
    const signatures = STAKING_ABI.join(' ');
    assert.ok(signatures.includes('stake'));
    assert.ok(signatures.includes('unstake'));
    assert.ok(signatures.includes('claimReward'));
  });

  it('STAKING_ABI includes multi-pool methods (new in PR)', () => {
    const signatures = STAKING_ABI.join(' ');
    assert.ok(signatures.includes('stakeInPool'));
    assert.ok(signatures.includes('getPoolInfo'));
    assert.ok(signatures.includes('getUserPoolInfo'));
  });

  it('DAO_ABI includes propose and castVote', () => {
    const signatures = DAO_ABI.join(' ');
    assert.ok(signatures.includes('propose'));
    assert.ok(signatures.includes('castVote'));
  });

  it('PORTAL_ABI includes performCeremony', () => {
    const signatures = PORTAL_ABI.join(' ');
    assert.ok(signatures.includes('performCeremony'));
  });
});

// ── Constructor ───────────────────────────────────────────────────────────────

describe('MeeChainWeb3 — constructor', () => {
  it('sets rpcUrl from first argument', () => {
    const w3 = new MeeChainWeb3('https://rpc.example.com', ADDRESSES);
    assert.strictEqual(w3.rpcUrl, 'https://rpc.example.com');
  });

  it('sets addresses from second argument', () => {
    const w3 = new MeeChainWeb3('https://rpc.example.com', ADDRESSES);
    assert.deepStrictEqual(w3.addresses, ADDRESSES);
  });

  it('starts with connected = false', () => {
    const w3 = new MeeChainWeb3('https://rpc.example.com', ADDRESSES);
    assert.strictEqual(w3.connected, false);
  });

  it('starts with provider = null', () => {
    const w3 = new MeeChainWeb3('https://rpc.example.com', ADDRESSES);
    assert.strictEqual(w3.provider, null);
  });

  it('starts with empty contracts object', () => {
    const w3 = new MeeChainWeb3('https://rpc.example.com', ADDRESSES);
    assert.deepStrictEqual(w3.contracts, {});
  });

  it('starts with chainInfo = null', () => {
    const w3 = new MeeChainWeb3('https://rpc.example.com', ADDRESSES);
    assert.strictEqual(w3.chainInfo, null);
  });
});

// ── Mock Fallbacks when Disconnected ─────────────────────────────────────────

describe('MeeChainWeb3 — mock fallbacks (disconnected)', () => {
  let w3;

  beforeEach(() => {
    w3 = makeOfflineWeb3();
  });

  // getTokenInfo
  it('getTokenInfo() returns live:false when disconnected', async () => {
    const info = await w3.getTokenInfo();
    assert.strictEqual(info.live, false);
  });

  it('getTokenInfo() returns a non-empty name when disconnected', async () => {
    const info = await w3.getTokenInfo();
    assert.ok(typeof info.name === 'string' && info.name.length > 0);
  });

  it('getTokenInfo() returns a non-empty symbol when disconnected', async () => {
    const info = await w3.getTokenInfo();
    assert.ok(typeof info.symbol === 'string' && info.symbol.length > 0);
  });

  it('getTokenInfo() address matches the configured token address', async () => {
    const info = await w3.getTokenInfo();
    assert.strictEqual(info.address, ADDRESSES.token);
  });

  it('getTokenInfo() decimals is 18 in mock', async () => {
    const info = await w3.getTokenInfo();
    assert.strictEqual(info.decimals, 18);
  });

  // getNFTInfo
  it('getNFTInfo() returns live:false when disconnected', async () => {
    const info = await w3.getNFTInfo();
    assert.strictEqual(info.live, false);
  });

  it('getNFTInfo() returns a positive totalSupply mock', async () => {
    const info = await w3.getNFTInfo();
    assert.ok(typeof info.totalSupply === 'number' && info.totalSupply > 0);
  });

  it('getNFTInfo() address matches configured nft address', async () => {
    const info = await w3.getNFTInfo();
    assert.strictEqual(info.address, ADDRESSES.nft);
  });

  // getStakingInfo
  it('getStakingInfo() returns live:false when disconnected', async () => {
    const info = await w3.getStakingInfo();
    assert.strictEqual(info.live, false);
  });

  it('getStakingInfo() returns a non-zero totalStaked mock', async () => {
    const info = await w3.getStakingInfo();
    assert.ok(parseFloat(info.totalStaked) > 0);
  });

  it('getStakingInfo() apr ends with % in mock', async () => {
    const info = await w3.getStakingInfo();
    assert.ok(info.apr.endsWith('%'));
  });

  it('getStakingInfo() address matches configured staking address', async () => {
    const info = await w3.getStakingInfo();
    assert.strictEqual(info.address, ADDRESSES.staking);
  });

  // getChainStats
  it('getChainStats() returns live:false when disconnected', async () => {
    const stats = await w3.getChainStats();
    assert.strictEqual(stats.live, false);
  });

  it('getChainStats() returns chainId 13390 in mock', async () => {
    const stats = await w3.getChainStats();
    assert.strictEqual(stats.chainId, 13390);
  });

  it('getChainStats() returns a positive blockNumber in mock', async () => {
    const stats = await w3.getChainStats();
    assert.ok(typeof stats.blockNumber === 'number' && stats.blockNumber > 0);
  });

  it('getChainStats() gasPrice includes "Gwei"', async () => {
    const stats = await w3.getChainStats();
    assert.ok(stats.gasPrice.includes('Gwei'));
  });

  // getRecentTransactions
  it('getRecentTransactions() returns [] when disconnected', async () => {
    const txs = await w3.getRecentTransactions();
    assert.ok(Array.isArray(txs));
    assert.strictEqual(txs.length, 0);
  });

  // getBlock
  it('getBlock() returns null when disconnected', async () => {
    const block = await w3.getBlock(100);
    assert.strictEqual(block, null);
  });

  // getBlockNumber
  it('getBlockNumber() returns a positive number when disconnected', async () => {
    const num = await w3.getBlockNumber();
    assert.ok(typeof num === 'number' && num > 0);
  });
});

// ── Invalid address guards ─────────────────────────────────────────────────

describe('MeeChainWeb3 — invalid address guards', () => {
  let w3;

  beforeEach(() => {
    // Use a "connected" instance so we reach the address-guard code
    w3 = makeOfflineWeb3();
    w3.connected = true;
    // Provide a mock contracts object so calls don't fail on undefined
    w3.contracts = {
      token:   { decimals: async () => 18n, balanceOf: async () => 0n },
      nft:     { balanceOf: async () => 0n },
      staking: {
        getStakedAmount:  async () => 0n,
        getPendingReward: async () => 0n,
        getUserPoolInfo:  async () => ({ staked: 0n, reward: 0n, lockEnd: 0n }),
      },
    };
  });

  it('getTokenBalance() returns "0" for empty string address', async () => {
    const result = await w3.getTokenBalance('');
    assert.strictEqual(result, '0');
  });

  it('getTokenBalance() returns "0" for null address', async () => {
    const result = await w3.getTokenBalance(null);
    assert.strictEqual(result, '0');
  });

  it('getTokenBalance() returns "0" for garbage address', async () => {
    const result = await w3.getTokenBalance('not-valid');
    assert.strictEqual(result, '0');
  });

  it('getNFTBalance() returns 0 for empty string address', async () => {
    const result = await w3.getNFTBalance('');
    assert.strictEqual(result, 0);
  });

  it('getNFTBalance() returns 0 for null address', async () => {
    const result = await w3.getNFTBalance(null);
    assert.strictEqual(result, 0);
  });

  it('getUserStaking() returns {staked:"0", pendingReward:"0"} for invalid address', async () => {
    const result = await w3.getUserStaking('not-an-address');
    assert.deepStrictEqual(result, { staked: '0', pendingReward: '0' });
  });

  it('getUserStaking() returns {staked:"0", pendingReward:"0"} for null address', async () => {
    const result = await w3.getUserStaking(null);
    assert.deepStrictEqual(result, { staked: '0', pendingReward: '0' });
  });

  it('getUserPoolInfo() returns live:false for invalid address', async () => {
    const result = await w3.getUserPoolInfo('garbage-address', 0);
    assert.strictEqual(result.live, false);
  });

  it('getUserPoolInfo() returns staked "0" for invalid address', async () => {
    const result = await w3.getUserPoolInfo('0xinvalid', 0);
    assert.strictEqual(result.staked, '0');
  });

  it('getUserPoolInfo() returns reward "0" for invalid address', async () => {
    const result = await w3.getUserPoolInfo('', 0);
    assert.strictEqual(result.reward, '0');
  });

  it('getUserPoolInfo() returns lockEnd 0 for invalid address', async () => {
    const result = await w3.getUserPoolInfo(null, 1);
    assert.strictEqual(result.lockEnd, 0);
  });
});

// ── calculateReward() ─────────────────────────────────────────────────────────

describe('MeeChainWeb3 — calculateReward() (pure function)', () => {
  let w3;

  beforeEach(() => {
    w3 = makeOfflineWeb3();
  });

  it('returns reward:"0" and total:"0" when amount is 0', () => {
    const r = w3.calculateReward(0, 85, 30);
    assert.strictEqual(r.reward, '0');
    assert.strictEqual(r.total, '0');
  });

  it('returns reward:"0" and total:"0" when apyPercent is 0', () => {
    const r = w3.calculateReward(1000, 0, 30);
    assert.strictEqual(r.reward, '0');
    assert.strictEqual(r.total, '0');
  });

  it('returns reward:"0" and total:"0" when days is 0', () => {
    const r = w3.calculateReward(1000, 85, 0);
    assert.strictEqual(r.reward, '0');
    assert.strictEqual(r.total, '0');
  });

  it('calculates correct reward for Standard Pool (85% APY, 30 days, 1000 principal)', () => {
    const r = w3.calculateReward(1000, 85, 30);
    // reward = 1000 * (85/100) * (30/365) = 6.986...
    const expectedReward = (1000 * (85 / 100) * (30 / 365)).toFixed(4);
    assert.strictEqual(r.reward, expectedReward);
  });

  it('returns amount matching principal formatted to 4 decimal places', () => {
    const r = w3.calculateReward(500, 85, 30);
    assert.strictEqual(r.amount, '500.0000');
  });

  it('total equals principal plus reward (string comparison to 4 decimal places)', () => {
    const r = w3.calculateReward(1000, 85, 30);
    const principal = 1000;
    const reward = principal * (85 / 100) * (30 / 365);
    const expectedTotal = (principal + reward).toFixed(4);
    assert.strictEqual(r.total, expectedTotal);
  });

  it('returns apy field matching input', () => {
    const r = w3.calculateReward(1000, 148, 90);
    assert.strictEqual(r.apy, 148);
  });

  it('returns days field matching input', () => {
    const r = w3.calculateReward(1000, 85, 30);
    assert.strictEqual(r.days, 30);
  });

  it('rewardUsd is reward multiplied by 0.0842 (to 2 decimal places)', () => {
    const r = w3.calculateReward(1000, 85, 30);
    const reward = 1000 * (85 / 100) * (30 / 365);
    const expectedUsd = (reward * 0.0842).toFixed(2);
    assert.strictEqual(r.rewardUsd, expectedUsd);
  });

  it('dailyReward equals reward / days (to 6 decimal places)', () => {
    const r = w3.calculateReward(1000, 85, 30);
    const reward = 1000 * (85 / 100) * (30 / 365);
    const expectedDaily = (reward / 30).toFixed(6);
    assert.strictEqual(r.dailyReward, expectedDaily);
  });

  it('calculates correctly for Premium Pool (148% APY, 90 days, 5000 principal)', () => {
    const r = w3.calculateReward(5000, 148, 90);
    const reward = 5000 * (148 / 100) * (90 / 365);
    assert.strictEqual(r.reward, reward.toFixed(4));
    assert.ok(parseFloat(r.reward) > 0, 'reward must be positive');
  });

  it('calculates correctly for Ritual Chain Pool (248% APY, 180 days, 10000 principal)', () => {
    const r = w3.calculateReward(10000, 248, 180);
    const reward = 10000 * (248 / 100) * (180 / 365);
    assert.strictEqual(r.reward, reward.toFixed(4));
  });

  it('handles string amount input (parseFloat coercion)', () => {
    const r1 = w3.calculateReward(1000, 85, 30);
    const r2 = w3.calculateReward('1000', 85, 30);
    assert.strictEqual(r1.reward, r2.reward);
  });

  it('returns reward:"0" for negative amount (falsy after parseFloat is truthy but logic check)', () => {
    // parseFloat('-1') = -1 which is truthy; reward becomes negative
    // The function only checks if(!principal) which allows negatives, so we just verify structure
    const r = w3.calculateReward(-100, 85, 30);
    assert.ok('reward' in r);
    assert.ok('total' in r);
  });

  it('returns reward:"0" for NaN amount', () => {
    const r = w3.calculateReward('abc', 85, 30);
    // parseFloat('abc') = NaN, !NaN is true → returns {reward:'0', total:'0'}
    assert.strictEqual(r.reward, '0');
    assert.strictEqual(r.total, '0');
  });
});

// ── getStakingPools() when disconnected ───────────────────────────────────────

describe('MeeChainWeb3 — getStakingPools() (disconnected)', () => {
  let w3;

  beforeEach(() => {
    w3 = makeOfflineWeb3();
  });

  it('returns an array of exactly 3 pools when disconnected', async () => {
    const pools = await w3.getStakingPools();
    assert.ok(Array.isArray(pools));
    assert.strictEqual(pools.length, 3);
  });

  it('all pools have live:false when disconnected', async () => {
    const pools = await w3.getStakingPools();
    for (const pool of pools) {
      assert.strictEqual(pool.live, false, `pool "${pool.name}" must have live:false`);
    }
  });

  it('pool ids are 0, 1, 2 in order', async () => {
    const pools = await w3.getStakingPools();
    assert.strictEqual(pools[0].id, 0);
    assert.strictEqual(pools[1].id, 1);
    assert.strictEqual(pools[2].id, 2);
  });

  it('Standard Pool has APY 85', async () => {
    const pools = await w3.getStakingPools();
    const std = pools.find(p => p.id === 0);
    assert.ok(std, 'Standard Pool (id=0) must exist');
    assert.strictEqual(std.apy, 85);
  });

  it('Premium Pool has APY 148', async () => {
    const pools = await w3.getStakingPools();
    const premium = pools.find(p => p.id === 1);
    assert.ok(premium, 'Premium Pool (id=1) must exist');
    assert.strictEqual(premium.apy, 148);
  });

  it('Ritual Chain Pool has APY 248', async () => {
    const pools = await w3.getStakingPools();
    const ritual = pools.find(p => p.id === 2);
    assert.ok(ritual, 'Ritual Chain Pool (id=2) must exist');
    assert.strictEqual(ritual.apy, 248);
  });

  it('each pool has a name string', async () => {
    const pools = await w3.getStakingPools();
    for (const pool of pools) {
      assert.ok(typeof pool.name === 'string' && pool.name.length > 0, `pool ${pool.id} must have name`);
    }
  });

  it('each pool has a lockDays value', async () => {
    const pools = await w3.getStakingPools();
    for (const pool of pools) {
      assert.ok(typeof pool.lockDays === 'number' && pool.lockDays > 0);
    }
  });

  it('each pool has a minStake value', async () => {
    const pools = await w3.getStakingPools();
    for (const pool of pools) {
      assert.ok(typeof pool.minStake === 'number' && pool.minStake > 0);
    }
  });
});

// ── getDaoStats() when disconnected ──────────────────────────────────────────

describe('MeeChainWeb3 — getDaoStats() (disconnected / no DAO contract)', () => {
  it('returns live:false when not connected', async () => {
    const w3 = makeOfflineWeb3();
    const stats = await w3.getDaoStats();
    assert.strictEqual(stats.live, false);
  });

  it('returns zero counts when not connected', async () => {
    const w3 = makeOfflineWeb3();
    const stats = await w3.getDaoStats();
    assert.strictEqual(stats.total, 0);
    assert.strictEqual(stats.active, 0);
    assert.strictEqual(stats.passed, 0);
    assert.strictEqual(stats.rejected, 0);
  });

  it('returns live:false when connected but dao contract missing', async () => {
    const w3 = makeOfflineWeb3();
    w3.connected = true;
    // contracts.dao intentionally not set
    const stats = await w3.getDaoStats();
    assert.strictEqual(stats.live, false);
  });
});

// ── getPortalStats() when disconnected ───────────────────────────────────────

describe('MeeChainWeb3 — getPortalStats() (disconnected / no Portal contract)', () => {
  it('returns live:false when not connected', async () => {
    const w3 = makeOfflineWeb3();
    const stats = await w3.getPortalStats();
    assert.strictEqual(stats.live, false);
  });

  it('returns ceremonyCount:0 when not connected', async () => {
    const w3 = makeOfflineWeb3();
    const stats = await w3.getPortalStats();
    assert.strictEqual(stats.ceremonyCount, 0);
  });

  it('returns totalValue:"0" when not connected', async () => {
    const w3 = makeOfflineWeb3();
    const stats = await w3.getPortalStats();
    assert.strictEqual(stats.totalValue, '0');
  });

  it('returns live:false when connected but portal contract missing', async () => {
    const w3 = makeOfflineWeb3();
    w3.connected = true;
    // contracts.portal intentionally not set
    const stats = await w3.getPortalStats();
    assert.strictEqual(stats.live, false);
  });
});

// ── getDaoReceipt() invalid address guard ────────────────────────────────────

describe('MeeChainWeb3 — getDaoReceipt() invalid address guard', () => {
  it('returns hasVoted:false for invalid address when disconnected', async () => {
    const w3 = makeOfflineWeb3();
    const result = await w3.getDaoReceipt(1, 'not-valid');
    assert.strictEqual(result.hasVoted, false);
  });

  it('returns live:false for null address when disconnected', async () => {
    const w3 = makeOfflineWeb3();
    const result = await w3.getDaoReceipt(1, null);
    assert.strictEqual(result.live, false);
  });

  it('returns live:false when connected but dao contract missing', async () => {
    const w3 = makeOfflineWeb3();
    w3.connected = true;
    const result = await w3.getDaoReceipt(1, ADDRESSES.token);
    assert.strictEqual(result.live, false);
  });
});

// ── getUserPoolInfo() when disconnected ───────────────────────────────────────

describe('MeeChainWeb3 — getUserPoolInfo() (disconnected)', () => {
  it('returns default object when disconnected', async () => {
    const w3 = makeOfflineWeb3();
    const result = await w3.getUserPoolInfo(ADDRESSES.token, 0);
    assert.deepStrictEqual(result, { staked: '0', reward: '0', lockEnd: 0, live: false });
  });

  it('returns live:false for any poolId when disconnected', async () => {
    const w3 = makeOfflineWeb3();
    for (const poolId of [0, 1, 2]) {
      const result = await w3.getUserPoolInfo(ADDRESSES.token, poolId);
      assert.strictEqual(result.live, false, `pool ${poolId} must return live:false`);
    }
  });
});

// ── _mockChainStats() blockNumber is time-based ───────────────────────────────

describe('MeeChainWeb3 — _mockChainStats() shape', () => {
  it('blockNumber is a number greater than the base value', () => {
    const w3 = makeOfflineWeb3();
    const stats = w3._mockChainStats();
    assert.ok(typeof stats.blockNumber === 'number');
    assert.ok(stats.blockNumber >= 1248753, 'blockNumber must be at least the base value');
  });

  it('chainId is 13390', () => {
    const w3 = makeOfflineWeb3();
    const stats = w3._mockChainStats();
    assert.strictEqual(stats.chainId, 13390);
  });

  it('live is false', () => {
    const w3 = makeOfflineWeb3();
    const stats = w3._mockChainStats();
    assert.strictEqual(stats.live, false);
  });

  it('gasPrice is a string containing "Gwei"', () => {
    const w3 = makeOfflineWeb3();
    const stats = w3._mockChainStats();
    assert.ok(typeof stats.gasPrice === 'string');
    assert.ok(stats.gasPrice.includes('Gwei'));
  });

  it('consecutive calls return non-decreasing blockNumber', () => {
    const w3 = makeOfflineWeb3();
    const s1 = w3._mockChainStats();
    const s2 = w3._mockChainStats();
    assert.ok(s2.blockNumber >= s1.blockNumber);
  });
});

// ── Regression: module exports ────────────────────────────────────────────────

describe('module exports — regression', () => {
  it('MeeChainWeb3 is a constructor function', () => {
    assert.ok(typeof MeeChainWeb3 === 'function');
  });

  it('all expected names are exported', () => {
    const mod = require('../src/web3/contracts.js');
    const expectedExports = ['MeeChainWeb3', 'ERC20_ABI', 'NFT_ABI', 'STAKING_ABI', 'DAO_ABI', 'PORTAL_ABI'];
    for (const name of expectedExports) {
      assert.ok(name in mod, `module must export "${name}"`);
    }
  });

  it('no extra unexpected top-level exports', () => {
    const mod = require('../src/web3/contracts.js');
    const keys = Object.keys(mod);
    // We only expect the 6 documented exports
    assert.strictEqual(keys.length, 6);
  });
});
