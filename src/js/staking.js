/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MeeChain — Real Staking System v2.0                        ║
 * ║  NeonovaPortal Contract Integration                         ║
 * ║  Pools: Standard 85% | Premium 148% | Ritual Chain 248%    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ── Pool Definitions ────────────────────────────────────────────────
const STAKING_POOLS = [
  {
    id:          'standard',
    name:        'MEE Standard Pool',
    icon:        '🟣',
    apy:         85,
    lockDays:    30,
    minStake:    100,
    color:       '#7C3AED',
    colorLight:  'rgba(124,58,237,0.15)',
    desc:        'เหมาะสำหรับผู้เริ่มต้น ล็อก 30 วัน ถอนได้หลัง lock period',
    ceremonyType: 0,   // CeremonyType.Stake
  },
  {
    id:          'premium',
    name:        'MEE Premium Pool',
    icon:        '🟠',
    apy:         148,
    lockDays:    90,
    minStake:    1000,
    color:       '#F97316',
    colorLight:  'rgba(249,115,22,0.15)',
    desc:        'ผลตอบแทนสูง ล็อก 90 วัน เหมาะสำหรับ HODLer',
    ceremonyType: 0,
  },
  {
    id:          'ritual',
    name:        'Ritual Chain Pool',
    icon:        '🔵',
    apy:         248,
    lockDays:    180,
    minStake:    5000,
    color:       '#06B6D4',
    colorLight:  'rgba(6,182,212,0.15)',
    desc:        'APY สูงสุด ล็อก 180 วัน สำหรับ Validator และ Ritual Participant',
    ceremonyType: 4,   // CeremonyType.Ritual
  },
];

// ── NeonovaPortal ABI (minimal for staking) ────────────────────────
const PORTAL_ABI = [
  'function enterPortal(uint8 ctype, string calldata message) payable returns (uint256)',
  'function exitPortal(uint256 ceremonyId)',
  'function completeCeremony(uint256 ceremonyId)',
  'function getUserPortal(address user) view returns (tuple(uint256 totalDeposited,uint256 totalWithdrawn,uint256 ceremoniesPerformed,uint256 lastActivity,bool isRegistered))',
  'function getUserCeremonies(address user) view returns (uint256[])',
  'function getCeremony(uint256 id) view returns (tuple(uint256 id,address participant,uint8 ctype,uint256 amount,uint256 timestamp,bytes32 ritualHash,bool completed))',
  'function getPortalStats() view returns (uint256,uint256,uint256,address)',
  'function PORTAL_FEE() view returns (uint256)',
  'event PortalEntered(address indexed user,uint256 amount,uint8 ctype,uint256 ceremonyId)',
  'event PortalExited(address indexed user,uint256 amount,uint256 ceremonyId)',
];

const MEE_TOKEN_STAKING_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

// ── State ───────────────────────────────────────────────────────────
const StakingState = {
  selectedPool:    null,
  userCeremonies:  [],
  portalStats:     null,
  userPortal:      null,
  isLoading:       false,
  portalAddress:   null,
  tokenAddress:    null,
};

// ── Utilities ───────────────────────────────────────────────────────
function meeToWei(mee) {
  return BigInt(Math.floor(parseFloat(mee) * 1e18)).toString();
}
function weiToMee(wei) {
  return (Number(BigInt(wei)) / 1e18).toFixed(4);
}
function formatMee(amount) {
  return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}
function daysSince(ts) {
  return Math.floor((Date.now() / 1000 - Number(ts)) / 86400);
}
function timeAgo(ts) {
  const d = daysSince(ts);
  if (d === 0) return 'วันนี้';
  if (d === 1) return 'เมื่อวาน';
  return `${d} วันที่แล้ว`;
}

// ── Load contract addresses from API ───────────────────────────────
async function loadContractAddresses() {
  try {
    const res  = await fetch('/api/network');
    const data = await res.json();
    StakingState.portalAddress = data.contracts?.portal  || data.contracts?.staking || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
    StakingState.tokenAddress  = data.contracts?.token   || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  } catch {
    StakingState.portalAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
    StakingState.tokenAddress  = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  }
}

// ── Fetch portal stats from API / on-chain ──────────────────────────
async function fetchPortalStats() {
  try {
    const res  = await fetch('/api/portal/info');
    const data = await res.json();
    StakingState.portalStats = data;
    renderPortalStats(data);
  } catch (e) {
    console.warn('Portal stats unavailable:', e.message);
  }
}

// ── Fetch user's staking position ───────────────────────────────────
async function fetchUserStaking(address) {
  if (!address) return;
  try {
    const res  = await fetch(`/api/staking/user/${address}`);
    const data = await res.json();
    StakingState.userPortal = data;
    renderUserPosition(data);
  } catch (e) {
    console.warn('User staking fetch failed:', e.message);
  }
}

// ── Render pool cards ────────────────────────────────────────────────
function renderStakingPools() {
  const container = document.getElementById('staking-pools-v2');
  if (!container) return;

  container.innerHTML = STAKING_POOLS.map(pool => `
    <div class="pool-card-v2" id="pool-${pool.id}" onclick="selectPool('${pool.id}')">
      <div class="pool-card-header" style="border-color: ${pool.color}">
        <div class="pool-icon-title">
          <span class="pool-icon-big">${pool.icon}</span>
          <div>
            <div class="pool-name-v2">${pool.name}</div>
            <div class="pool-desc">${pool.desc}</div>
          </div>
        </div>
        <div class="pool-apy-badge" style="background: ${pool.colorLight}; color: ${pool.color}">
          ${pool.apy}% APY
        </div>
      </div>
      <div class="pool-stats-grid">
        <div class="pool-stat-item">
          <span class="stat-label">⏱ Lock Period</span>
          <span class="stat-value">${pool.lockDays} วัน</span>
        </div>
        <div class="pool-stat-item">
          <span class="stat-label">📉 ขั้นต่ำ</span>
          <span class="stat-value">${pool.minStake.toLocaleString()} MEE</span>
        </div>
        <div class="pool-stat-item">
          <span class="stat-label">💰 รายได้ต่อวัน</span>
          <span class="stat-value" style="color:${pool.color}">
            ~${((pool.minStake * pool.apy / 100) / 365).toFixed(2)} MEE
          </span>
        </div>
        <div class="pool-stat-item">
          <span class="stat-label">🎁 รายได้ (lock)</span>
          <span class="stat-value" style="color:${pool.color}">
            ~${((pool.minStake * pool.apy / 100) * pool.lockDays / 365).toFixed(1)} MEE
          </span>
        </div>
      </div>
      <div class="pool-action-row">
        <button class="btn-stake-now" style="background: ${pool.color}"
          onclick="event.stopPropagation(); openStakeModal('${pool.id}')">
          ⚡ Stake ทันที
        </button>
        <div class="pool-capacity-bar">
          <div class="capacity-fill" style="width: ${60 + Math.random() * 30}%; background: ${pool.color}"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Render portal stats ─────────────────────────────────────────────
function renderPortalStats(stats) {
  const el = document.getElementById('portal-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="portal-stat"><span>🔒 Total Locked</span><strong>${Number(stats.totalEntered || 0).toLocaleString()} MEE</strong></div>
    <div class="portal-stat"><span>🎭 Ceremonies</span><strong>${Number(stats.totalCeremonies || 0).toLocaleString()}</strong></div>
    <div class="portal-stat"><span>📡 Live</span><strong style="color:${stats.live ? '#10b981' : '#f59e0b'}">${stats.live ? '🟢 ON-CHAIN' : '🟡 MOCK'}</strong></div>
  `;
}

// ── Render user position ─────────────────────────────────────────────
function renderUserPosition(data) {
  const el = document.getElementById('user-staking-position');
  if (!el) return;
  if (!window.WalletState?.connected) {
    el.innerHTML = `<div class="connect-prompt">🔌 เชื่อมต่อ Wallet เพื่อดูตำแหน่ง Staking ของคุณ</div>`;
    return;
  }
  el.innerHTML = `
    <div class="user-position-grid">
      <div class="pos-stat"><span>💰 Total Staked</span><strong>${formatMee(weiToMee(data.totalStaked || '0'))} MEE</strong></div>
      <div class="pos-stat"><span>🎁 Pending Reward</span><strong style="color:#10b981">${formatMee(weiToMee(data.pendingReward || '0'))} MEE</strong></div>
      <div class="pos-stat"><span>🎭 Ceremonies</span><strong>${data.ceremoniesPerformed || 0}</strong></div>
      <div class="pos-stat"><span>📅 Last Active</span><strong>${data.lastActivity ? timeAgo(data.lastActivity) : '-'}</strong></div>
    </div>
    ${(data.activeCeremonies || []).length > 0 ? renderActiveCeremonies(data.activeCeremonies) : ''}
  `;
}

function renderActiveCeremonies(ceremonies) {
  return `
    <div class="active-ceremonies">
      <h4>📋 Active Stakings</h4>
      ${ceremonies.map(c => `
        <div class="ceremony-row">
          <span>#${c.id}</span>
          <span>${formatMee(weiToMee(c.amount))} MEE</span>
          <span>${timeAgo(c.timestamp)}</span>
          <span class="badge ${c.completed ? 'badge-success' : 'badge-pending'}">
            ${c.completed ? '✅ เสร็จแล้ว' : '⏳ กำลัง Lock'}
          </span>
          ${c.completed ? `<button class="btn-small btn-unstake" onclick="handleUnstake(${c.id})">💸 Unstake</button>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// ── Open Stake Modal ─────────────────────────────────────────────────
function openStakeModal(poolId) {
  const pool = STAKING_POOLS.find(p => p.id === poolId);
  if (!pool) return;
  StakingState.selectedPool = pool;

  if (!window.WalletState?.connected) {
    showToast('⚠️ กรุณาเชื่อมต่อ Wallet ก่อน', 'warning');
    document.getElementById('wallet-modal')?.classList.remove('hidden');
    return;
  }

  const modal = document.getElementById('stake-modal');
  if (!modal) return;

  document.getElementById('stake-modal-title').textContent  = `${pool.icon} ${pool.name}`;
  document.getElementById('stake-modal-apy').textContent    = `${pool.apy}% APY`;
  document.getElementById('stake-modal-lock').textContent   = `${pool.lockDays} วัน`;
  document.getElementById('stake-modal-min').textContent    = `${pool.minStake.toLocaleString()} MEE`;
  document.getElementById('stake-amount-input').value       = pool.minStake;
  document.getElementById('stake-modal-color').style.borderColor = pool.color;

  updateStakePreview();
  modal.classList.remove('hidden');
}

function closeStakeModal() {
  document.getElementById('stake-modal')?.classList.add('hidden');
  StakingState.selectedPool = null;
}

function updateStakePreview() {
  const pool   = StakingState.selectedPool;
  if (!pool) return;
  const amount = parseFloat(document.getElementById('stake-amount-input')?.value) || 0;
  const dailyReward  = (amount * pool.apy / 100) / 365;
  const totalReward  = dailyReward * pool.lockDays;

  const previewEl = document.getElementById('stake-preview');
  if (previewEl) {
    previewEl.innerHTML = `
      <div class="preview-row"><span>💰 Stake Amount</span><strong>${formatMee(amount)} MEE</strong></div>
      <div class="preview-row"><span>📅 Unlock Date</span><strong>${unlockDate(pool.lockDays)}</strong></div>
      <div class="preview-row"><span>💵 Daily Reward</span><strong style="color:#10b981">~${dailyReward.toFixed(4)} MEE</strong></div>
      <div class="preview-row"><span>🎁 Total Reward</span><strong style="color:#10b981">~${totalReward.toFixed(2)} MEE</strong></div>
      <div class="preview-row"><span>📦 You Receive</span><strong style="color:#f59e0b">~${(amount + totalReward).toFixed(2)} MEE</strong></div>
    `;
  }
}

function unlockDate(lockDays) {
  const d = new Date();
  d.setDate(d.getDate() + lockDays);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * ส่งคำสั่ง Stake ไปยังสัญญา Portal ผ่าน MetaMask และบันทึกกิจกรรมการสเตก
 *
 * จะตรวจสอบค่าที่ผู้ใช้ป้อนและการเชื่อมต่อกระเป๋า, เรียกตัวช่วยสลับเครือข่ายเมื่อมี, คำนวณค่าใช้จ่าย (รวมค่าธรรมเนียมพอร์ทัล), สร้าง calldata สำหรับฟังก์ชัน `enterPortal(uint8,string)` และเรียก `eth_sendTransaction` เพื่อส่งธุรกรรม
 *
 * พฤติกรรมสังเกตได้:
 * - ถ้ายอดไม่ถึงขั้นต่ำหรือไม่มี MetaMask จะยกเลิกและแสดง toast ข้อความที่เหมาะสม
 * - เมื่อผู้ใช้ปฏิเสธธุรกรรมจะแสดง toast ยกเลิก; เมื่อเกิดข้อผิดพลาดอื่นจะแสดง toast ข้อความข้อผิดพลาดย่อ
 * - เมื่อสำเร็จ จะปิดโมดัล, เพิ่มรายการกิจกรรม staking ลงใน localStorage และเริ่มรีเฟรชข้อมูลการสเตกของผู้ใช้
 */
async function executeStake() {
  const pool   = StakingState.selectedPool;
  if (!pool) return;

  const amount = parseFloat(document.getElementById('stake-amount-input')?.value);
  if (!amount || amount < pool.minStake) {
    showToast(`❌ ขั้นต่ำ ${pool.minStake.toLocaleString()} MEE`, 'error');
    return;
  }

  if (!window.ethereum) {
    showToast('❌ MetaMask ไม่พบ กรุณาติดตั้ง', 'error');
    return;
  }

  const btn = document.getElementById('btn-confirm-stake');
  btn.disabled    = true;
  btn.textContent = '⏳ กำลัง Stake...';

  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const address  = accounts[0];

    // Ensure user is on MeeChain Ritual Chain before transacting
    if (typeof window.ensureMeeChainNetwork === 'function') {
      await window.ensureMeeChainNetwork();
    }

    // Verify chain ID after network switch
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId !== '0x344e') {
      throw new Error('Failed to switch to MeeChain Ritual Chain (Chain ID: 13390). Please switch manually.');
    }

    // Portal fee = 0.001 MEE = 1e15 wei (fetched from contract or hardcoded)
    const PORTAL_FEE_WEI = BigInt('1000000000000000');   // 0.001 MEE
    const stakeWei       = BigInt(meeToWei(amount));
    const totalWei       = stakeWei + PORTAL_FEE_WEI;

    // Build enterPortal() calldata
    // function enterPortal(uint8 ctype, string calldata message)
    const fnSelector  = '0x' + keccak256Selector('enterPortal(uint8,string)');
    const ctypeHex    = pool.ceremonyType.toString(16).padStart(64, '0');
    // ABI encode string: offset=64, length, data (padded)
    const msgBytes    = new TextEncoder().encode(`Staking ${amount} MEE in ${pool.name}`);
    const msgOffset   = '0000000000000000000000000000000000000000000000000000000000000040';
    const msgLen      = msgBytes.length.toString(16).padStart(64, '0');
    const msgData     = Array.from(msgBytes).map(b => b.toString(16).padStart(2, '0')).join('').padEnd(64, '0');
    const calldata    = fnSelector + ctypeHex + msgOffset + msgLen + msgData;

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from:  address,
        to:    StakingState.portalAddress,
        value: '0x' + totalWei.toString(16),
        data:  calldata,
        gas:   '0x30D40',  // 200,000 gas
      }],
    });

    showToast(`✅ Stake สำเร็จ! TX: ${txHash.slice(0, 10)}...`, 'success');
    closeStakeModal();
    addStakingActivity({
      type:   'stake',
      pool:   pool.name,
      amount: amount,
      tx:     txHash,
      time:   new Date().toISOString(),
    });
    setTimeout(() => fetchUserStaking(address), 3000);

  } catch (err) {
    if (err.code === 4001) {
      showToast('❌ ยกเลิกการทำรายการ', 'warning');
    } else {
      showToast(`❌ ${err.message?.slice(0, 60) || 'เกิดข้อผิดพลาด'}`, 'error');
    }
  } finally {
    btn.disabled    = false;
    btn.textContent = '⚡ ยืนยัน Stake';
  }
}

// ── Execute Unstake via MetaMask → NeonovaPortal.exitPortal ─────────
async function handleUnstake(ceremonyId) {
  if (!window.ethereum) {
    showToast('❌ MetaMask ไม่พบ', 'error');
    return;
  }
  if (!confirm(`ยืนยัน Unstake ceremony #${ceremonyId}?`)) return;

  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    // exitPortal(uint256 ceremonyId)
    const fnSel   = '0x' + keccak256Selector('exitPortal(uint256)');
    const idHex   = BigInt(ceremonyId).toString(16).padStart(64, '0');
    const calldata = fnSel + idHex;

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: accounts[0],
        to:   StakingState.portalAddress,
        data: calldata,
        gas:  '0x30D40',
      }],
    });
    showToast(`✅ Unstake TX: ${txHash.slice(0, 10)}...`, 'success');
    setTimeout(() => fetchUserStaking(accounts[0]), 3000);
  } catch (err) {
    showToast(`❌ ${err.message?.slice(0, 60)}`, 'error');
  }
}

// ── Simple keccak256 function selector ────────────────────────────
// This is a simplified approach — in production use ethers.js
function keccak256Selector(signature) {
  // Fallback to hardcoded selectors for common functions
  const selectors = {
    'enterPortal(uint8,string)': 'f6d96e6b',
    'exitPortal(uint256)':        '6e05d2cd',
    'completeCeremony(uint256)':  '7f4af490',
  };
  return selectors[signature] || '00000000';
}

// ── Staking Activity Log ─────────────────────────────────────────────
const STAKING_ACTIVITY_KEY = 'meechain_staking_activity';

function loadStakingActivity() {
  try {
    return JSON.parse(localStorage.getItem(STAKING_ACTIVITY_KEY) || '[]');
  } catch { return []; }
}

function addStakingActivity(activity) {
  const list = loadStakingActivity();
  list.unshift(activity);
  localStorage.setItem(STAKING_ACTIVITY_KEY, JSON.stringify(list.slice(0, 50)));
  renderStakingActivity();
}

function renderStakingActivity() {
  const el = document.getElementById('staking-activity-log');
  if (!el) return;
  const list = loadStakingActivity();
  if (list.length === 0) {
    el.innerHTML = '<div class="no-activity">ยังไม่มีกิจกรรม Staking</div>';
    return;
  }
  el.innerHTML = list.slice(0, 10).map(a => `
    <div class="activity-row">
      <span class="activity-icon">${a.type === 'stake' ? '⬇️' : a.type === 'unstake' ? '⬆️' : '🎁'}</span>
      <div class="activity-info">
        <span class="activity-type">${a.type === 'stake' ? 'Staked' : a.type === 'unstake' ? 'Unstaked' : 'Claimed'}</span>
        <span class="activity-pool">${a.pool}</span>
      </div>
      <div class="activity-amount">
        <span class="${a.type === 'stake' ? 'text-red' : 'text-green'}">
          ${a.type === 'stake' ? '-' : '+'}${formatMee(a.amount)} MEE
        </span>
        <span class="activity-time">${new Date(a.time).toLocaleTimeString('th-TH')}</span>
      </div>
      ${a.tx ? `<a href="http://explorer.meechain.run.place/tx/${a.tx}" target="_blank" class="tx-link">🔗</a>` : ''}
    </div>
  `).join('');
}

// ── Calculate Estimated Reward ────────────────────────────────────────
function calcReward(amount, apy, days) {
  return (amount * apy / 100) * (days / 365);
}

// ── APY Calculator ────────────────────────────────────────────────────
function renderApyCalculator() {
  const el = document.getElementById('apy-calculator');
  if (!el) return;
  el.innerHTML = `
    <div class="calc-section">
      <h4>🧮 APY Calculator</h4>
      <div class="calc-form">
        <label>จำนวน MEE ที่ต้องการ Stake</label>
        <input type="number" id="calc-amount" value="1000" min="100" step="100"
          oninput="updateApyCalc()" class="calc-input">
        <label>เลือก Pool</label>
        <select id="calc-pool" onchange="updateApyCalc()" class="calc-select">
          ${STAKING_POOLS.map(p => `<option value="${p.apy},${p.lockDays}">${p.name} (${p.apy}% / ${p.lockDays} วัน)</option>`).join('')}
        </select>
      </div>
      <div id="calc-results" class="calc-results"></div>
    </div>
  `;
  updateApyCalc();
}

function updateApyCalc() {
  const amount = parseFloat(document.getElementById('calc-amount')?.value) || 1000;
  const [apy, days] = (document.getElementById('calc-pool')?.value || '85,30').split(',').map(Number);
  const daily   = calcReward(amount, apy, 1);
  const weekly  = calcReward(amount, apy, 7);
  const reward  = calcReward(amount, apy, days);
  const total   = amount + reward;
  const usdRate = 0.0842;

  const el = document.getElementById('calc-results');
  if (el) {
    el.innerHTML = `
      <div class="calc-result-grid">
        <div class="calc-result-item">
          <span>📅 ต่อวัน</span>
          <strong>+${daily.toFixed(4)} MEE</strong>
          <small>≈ $${(daily * usdRate).toFixed(4)}</small>
        </div>
        <div class="calc-result-item">
          <span>📆 ต่อสัปดาห์</span>
          <strong>+${weekly.toFixed(3)} MEE</strong>
          <small>≈ $${(weekly * usdRate).toFixed(3)}</small>
        </div>
        <div class="calc-result-item highlight">
          <span>🔒 เมื่อครบ ${days} วัน</span>
          <strong>+${reward.toFixed(2)} MEE</strong>
          <small>≈ $${(reward * usdRate).toFixed(2)}</small>
        </div>
        <div class="calc-result-item total">
          <span>💰 รับทั้งหมด</span>
          <strong>${total.toFixed(2)} MEE</strong>
          <small>≈ $${(total * usdRate).toFixed(2)}</small>
        </div>
      </div>
    `;
  }
}

// ── Init Staking Page ────────────────────────────────────────────────
async function initStaking() {
  await loadContractAddresses();
  renderStakingPools();
  renderApyCalculator();
  renderStakingActivity();
  fetchPortalStats();

  // Load user data if wallet connected
  if (window.WalletState?.connected && window.WalletState?.address) {
    fetchUserStaking(window.WalletState.address);
  }

  // Listen for wallet changes
  window.addEventListener('walletConnected', (e) => {
    fetchUserStaking(e.detail?.address);
  });

  // Stake modal event listeners
  document.getElementById('stake-amount-input')?.addEventListener('input', updateStakePreview);
  document.getElementById('btn-confirm-stake')?.addEventListener('click', executeStake);
  document.getElementById('btn-cancel-stake')?.addEventListener('click',  closeStakeModal);
  document.getElementById('stake-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeStakeModal();
  });
}

// ── Expose globals ────────────────────────────────────────────────────
window.openStakeModal   = openStakeModal;
window.closeStakeModal  = closeStakeModal;
window.executeStake     = executeStake;
window.handleUnstake    = handleUnstake;
window.updateStakePreview = updateStakePreview;
window.updateApyCalc    = updateApyCalc;
window.initStaking      = initStaking;
window.selectPool       = function(id) {
  document.querySelectorAll('.pool-card-v2').forEach(el => el.classList.remove('selected'));
  document.getElementById(`pool-${id}`)?.classList.add('selected');
  StakingState.selectedPool = STAKING_POOLS.find(p => p.id === id);
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStaking);
} else {
  initStaking();
}