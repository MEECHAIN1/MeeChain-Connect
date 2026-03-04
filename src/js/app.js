// ===== MeeChain Dashboard - Main App =====

// ============================================================
// UTILITIES
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function truncateHash(hash, start = 6, end = 4) {
  if (!hash) return '';
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

function animateCounter(el, target, duration = 1500) {
  const start = 0;
  const startTime = performance.now();
  const update = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString('th-TH');
    el.classList.add('counting');
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target.toLocaleString('th-TH');
  };
  requestAnimationFrame(update);
}

function createParticles() {
  const container = $('#hero-particles');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const star = document.createElement('div');
    star.className = 'star-particle';
    star.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      --dur: ${1.5 + Math.random() * 2.5}s;
      --delay: ${Math.random() * 2}s;
      width: ${2 + Math.random() * 4}px;
      height: ${2 + Math.random() * 4}px;
      opacity: ${0.2 + Math.random() * 0.8};
    `;
    container.appendChild(star);
  }
}

function addRipple(btn) {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    ripple.className = 'ripple-effect';
    ripple.style.left = `${e.clientX - rect.left - 10}px`;
    ripple.style.top = `${e.clientY - rect.top - 10}px`;
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// ============================================================
// PAGE NAVIGATION
// ============================================================
const pageLabels = {
  'dashboard': '🏠 แดชบอร์ด',
  'nft-market': '🖼️ ตลาด NFT',
  'ritual': '🚀 Mee Ritual Chain',
  'staking': '⛏️ Staking & Mining',
  'wallet': '👛 กระเป๋าเงิน',
  'meebot': '🤖 MeeBot',
  'settings': '⚙️ ตั้งค่า',
};

function switchPage(pageId) {
  // Hide all pages
  $$('.page-section').forEach(p => p.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target page
  const page = $(`#page-${pageId}`);
  if (page) {
    page.classList.add('active');
    page.style.animation = 'none';
    requestAnimationFrame(() => {
      page.style.animation = 'slide-up 0.3s ease';
    });
  }

  // Update nav
  const navItem = $(`.nav-item[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add('active');

  // Update breadcrumb
  const bc = $('#breadcrumb');
  if (bc) bc.textContent = pageLabels[pageId] || pageId;

  // Close mobile sidebar
  $('#sidebar')?.classList.remove('mobile-open');

  // Page-specific init
  if (pageId === 'dashboard' && window.ChartManager) {
    setTimeout(() => ChartManager.init(), 100);
  }
}

window.switchPage = switchPage;

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderActivityList() {
  const list = $('#activity-list');
  if (!list) return;
  list.innerHTML = MEECHAIN_DATA.activities.map(a => `
    <li class="activity-item">
      <span class="activity-icon">${a.icon}</span>
      <div class="activity-info">
        <div class="activity-title">${a.title}</div>
        <div class="activity-time">${a.time}</div>
      </div>
      <span class="activity-amount ${a.amount.startsWith('+') ? 'positive' : 'negative'}">
        ${a.amount}
      </span>
    </li>
  `).join('');
}

function renderTrendingNFTs() {
  const grid = $('#trending-nft-grid');
  if (!grid) return;
  const trending = MEECHAIN_DATA.nfts.slice(0, 6);
  grid.innerHTML = trending.map(nft => `
    <div class="nft-card" onclick="openNFTModal(${nft.id})">
      <div class="nft-img-wrap">
        ${MEECHAIN_DATA.getNFTImageHTML(nft)}
        <div class="nft-overlay">
          <button class="nft-buy-btn" onclick="event.stopPropagation(); handleBuyNFT(${nft.id})">ซื้อเลย</button>
        </div>
      </div>
      <div class="nft-info">
        <div class="nft-name" title="${nft.name}">${nft.name}</div>
        <div class="nft-price-row">
          <span class="nft-price">${nft.price} MEE</span>
          <span class="nft-likes">❤️ ${nft.likes}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderMainNFTGrid(filter = 'all') {
  const grid = $('#nft-grid');
  if (!grid) return;
  const filtered = filter === 'all'
    ? MEECHAIN_DATA.nfts
    : MEECHAIN_DATA.nfts.filter(n => n.category === filter);

  grid.innerHTML = filtered.map(nft => `
    <div class="nft-grid-card" onclick="openNFTModal(${nft.id})">
      <div class="nft-grid-img">
        ${MEECHAIN_DATA.getNFTImageHTML(nft)}
      </div>
      <div class="nft-grid-info">
        <div class="nft-grid-name">${nft.name}</div>
        <div class="nft-grid-meta">
          <span class="nft-grid-creator">by ${nft.creator}</span>
          <span class="nft-grid-cat">${nft.category}</span>
        </div>
        <div class="nft-grid-price-row">
          <span class="nft-grid-price">${nft.price} MEE</span>
          <button class="nft-grid-buy" onclick="event.stopPropagation(); handleBuyNFT(${nft.id})">ซื้อ</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderStakingPools() {
  const container = $('#staking-pools');
  if (!container) return;
  container.innerHTML = MEECHAIN_DATA.stakingPools.map(pool => `
    <div class="pool-card">
      <div class="pool-header">
        <span class="pool-name">${pool.icon} ${pool.name}</span>
        <span class="pool-apy">APY ${pool.apy}</span>
      </div>
      <div class="pool-stats">
        <div class="pool-stat">
          <span>ขั้นต่ำ</span>
          <span>${pool.minStake}</span>
        </div>
        <div class="pool-stat">
          <span>Lock Period</span>
          <span>${pool.lockPeriod}</span>
        </div>
        <div class="pool-stat">
          <span>Staked ทั้งหมด</span>
          <span>${pool.totalStaked}</span>
        </div>
      </div>
      <div class="pool-progress">
        <div class="progress-label">
          <span>ความจุที่ใช้ไป</span>
          <span>${pool.capacity}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${pool.capacity}%"></div>
        </div>
      </div>
      <button class="btn btn-primary w-full" onclick="handleStake('${pool.name}')">
        Stake เลย ⛏️
      </button>
    </div>
  `).join('');
}

function renderTokenList() {
  const list = $('#token-list');
  if (!list) return;
  list.innerHTML = MEECHAIN_DATA.tokens.map(t => `
    <div class="token-item">
      <div class="token-icon">${t.icon}</div>
      <div class="token-info">
        <div class="token-name">${t.name}</div>
        <div class="token-symbol">${t.symbol}</div>
      </div>
      <div class="token-balance">
        <div class="token-amount">${t.amount}</div>
        <div class="token-usd" style="color: ${t.positive ? '#10B981' : '#EF4444'}">${t.change}</div>
      </div>
    </div>
  `).join('');
}

function renderWalletTxHistory() {
  const list = $('#wallet-tx-history');
  if (!list) return;
  list.innerHTML = MEECHAIN_DATA.walletTxs.map(tx => `
    <div class="tx-history-item">
      <div class="tx-type-icon">${tx.icon}</div>
      <div class="tx-type-info">
        <div class="tx-type-name">${tx.name}</div>
        <div class="tx-type-hash">${tx.hash}</div>
      </div>
      <div class="tx-type-amount ${tx.amount.startsWith('+') ? '' : 'negative'}" 
           style="color: ${tx.amount.startsWith('+') ? '#10B981' : '#EF4444'}">
        ${tx.amount}
      </div>
    </div>
  `).join('');
}

function renderRecentBlocks() {
  const container = $('#recent-blocks');
  if (!container) return;
  container.innerHTML = MEECHAIN_DATA.recentBlocks.map((b, i) => `
    <div class="block-item ${i === 0 ? 'new-block' : ''}">
      <div>
        <div class="block-num">#${b.num}</div>
        <div class="block-hash">${b.hash}</div>
      </div>
      <div class="block-txns">🔗 ${b.txns} Txns</div>
      <div class="block-time">⏱ ${b.time}</div>
    </div>
  `).join('');
}

function renderExplorerTxs() {
  const tbody = $('#tx-table-body');
  if (!tbody) return;
  tbody.innerHTML = MEECHAIN_DATA.explorerTxs.map(tx => `
    <tr>
      <td><span class="tx-hash">${tx.hash}</span></td>
      <td><span class="tx-addr">${tx.from}</span></td>
      <td><span class="tx-addr">${tx.to}</span></td>
      <td>${tx.amount}</td>
      <td><span class="status-badge ${tx.status}">${tx.status === 'success' ? '✅ สำเร็จ' : '⏳ รอดำเนินการ'}</span></td>
      <td>${tx.time}</td>
    </tr>
  `).join('');
}

function renderMeeBotCollection() {
  const container = $('#meebot-collection');
  if (!container) return;
  container.innerHTML = MEECHAIN_DATA.meebotNFTs.map(bot => `
    <div class="meebot-nft-card">
      <div class="meebot-nft-img">
        ${MEECHAIN_DATA.getNFTImageHTML(bot)}
      </div>
      <div class="meebot-nft-info">
        <div class="meebot-nft-name">${bot.name}</div>
        <span class="meebot-nft-rarity rarity-${bot.rarity}">
          ${bot.rarity === 'legendary' ? '⭐ Legendary' : bot.rarity === 'rare' ? '💜 Rare' : '⬜ Common'}
        </span>
      </div>
    </div>
  `).join('');
}

// ============================================================
// COUNTERS & LIVE DATA
// ============================================================
function initCounters() {
  $$('.stat-value[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    animateCounter(el, target, 2000);
  });
}

let blockNumber = 1248753;
function startLiveBlockUpdate() {
  setInterval(() => {
    blockNumber++;
    const el = $('#block-number');
    const totalEl = $('#total-blocks');
    if (el) { el.textContent = blockNumber.toLocaleString('th-TH'); }
    if (totalEl) { totalEl.textContent = blockNumber.toLocaleString('th-TH'); }

    // Add new block to explorer
    const newBlock = {
      num: blockNumber.toLocaleString('en-US'),
      hash: `0x${Math.random().toString(16).slice(2,10)}...`,
      time: '1 วิ',
      txns: Math.floor(Math.random() * 200 + 50)
    };
    MEECHAIN_DATA.recentBlocks.unshift(newBlock);
    MEECHAIN_DATA.recentBlocks = MEECHAIN_DATA.recentBlocks.slice(0, 5);

    const activePage = $('.page-section.active');
    if (activePage && activePage.id === 'page-ritual') {
      renderRecentBlocks();
    }
  }, 12000);
}

// ============================================================
// NFT MODAL
// ============================================================
function openNFTModal(nftId) {
  const nft = MEECHAIN_DATA.nfts.find(n => n.id === nftId);
  if (!nft) return;

  $('#nft-modal-title').textContent = nft.name;
  $('#nft-modal-body').innerHTML = `
    <div class="nft-modal-grid">
      <div class="nft-modal-img">
        ${MEECHAIN_DATA.getNFTImageHTML(nft)}
      </div>
      <div class="nft-modal-details">
        <div class="nft-modal-name">${nft.name}</div>
        <div class="nft-modal-creator">โดย ${nft.creator}</div>
        <div class="nft-modal-desc">${nft.desc}</div>
        <div class="nft-modal-price-box">
          <div class="nmp-label">ราคาปัจจุบัน</div>
          <div class="nmp-value">${nft.price} MEE</div>
          <div class="nmp-usd">≈ $${(nft.price * 0.0842).toFixed(2)} USD</div>
        </div>
        <div class="nft-modal-actions">
          <button class="btn btn-primary" onclick="handleBuyNFT(${nft.id})">🛒 ซื้อเลย</button>
          <button class="btn btn-outline" onclick="handleMakeOffer(${nft.id})">💰 เสนอราคา</button>
        </div>
        <div class="nft-modal-attrs">
          <h4>คุณสมบัติ</h4>
          <div class="attrs-grid">
            ${nft.attributes.map(a => `
              <div class="attr-item">
                <div class="attr-type">${a.type}</div>
                <div class="attr-value">${a.value}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  $('#nft-modal').classList.remove('hidden');
}

function handleBuyNFT(nftId) {
  const nft = MEECHAIN_DATA.nfts.find(n => n.id === nftId);
  if (!nft) return;
  if (!AppState.walletConnected) {
    showToast('กรุณาเชื่อมต่อกระเป๋าเงินก่อน', 'warning');
    openWalletModal();
    return;
  }
  showToast(`กำลังซื้อ ${nft.name} ราคา ${nft.price} MEE...`, 'info');
  setTimeout(() => showToast(`ซื้อ ${nft.name} สำเร็จ! 🎉`, 'success'), 2000);
  $('#nft-modal').classList.add('hidden');
}

function handleMakeOffer(nftId) {
  showToast('ฟีเจอร์ "เสนอราคา" กำลังพัฒนา', 'info');
}

function handleStake(poolName) {
  if (!AppState.walletConnected) {
    showToast('กรุณาเชื่อมต่อกระเป๋าเงินก่อน', 'warning');
    openWalletModal();
    return;
  }
  showToast(`เริ่ม Staking ใน ${poolName}...`, 'success');
}

// ============================================================
// WALLET
// ============================================================
const AppState = {
  walletConnected: false,
  walletAddress: '',
  walletBalance: 0,
};

function openWalletModal() {
  $('#wallet-modal').classList.remove('hidden');
}

function connectWallet(type) {
  const loadingMsg = {
    metamask: 'กำลังเชื่อมต่อ MetaMask...',
    walletconnect: 'กำลังสร้าง QR Code...',
    coinbase: 'กำลังเปิด Coinbase Wallet...',
    demo: 'กำลังสร้าง Demo Wallet...',
  };
  showToast(loadingMsg[type] || 'กำลังเชื่อมต่อ...', 'info');

  setTimeout(() => {
    AppState.walletConnected = true;
    AppState.walletAddress = `0x${Math.random().toString(16).slice(2,10)}...${Math.random().toString(16).slice(2,6)}`;
    AppState.walletBalance = (Math.random() * 1000 + 50).toFixed(2);

    const walletBtnText = $('#wallet-btn-text');
    const connectBtn = $('#connect-wallet-btn');
    if (walletBtnText) walletBtnText.textContent = truncateHash(AppState.walletAddress, 6, 4);
    if (connectBtn) connectBtn.classList.add('connected');

    const walletDisplay = $('#wallet-address-display');
    if (walletDisplay) walletDisplay.textContent = AppState.walletAddress;

    // Update wallet balance display
    const balanceEl = $('.wcard-balance-value');
    const usdEl = $('.wcard-balance-usd');
    if (balanceEl) balanceEl.textContent = `${AppState.walletBalance} MEE`;
    if (usdEl) usdEl.textContent = `≈ $${(AppState.walletBalance * 0.0842).toFixed(2)} USD`;

    // Update token list
    MEECHAIN_DATA.tokens[0].amount = AppState.walletBalance;
    MEECHAIN_DATA.tokens[0].usd = `$${(AppState.walletBalance * 0.0842).toFixed(2)}`;
    renderTokenList();

    $('#wallet-modal').classList.add('hidden');
    showToast(`เชื่อมต่อกระเป๋าเงินสำเร็จ! 🎉`, 'success');
  }, 1500);
}

// ============================================================
// SEARCH
// ============================================================
let searchTimeout = null;
function handleSearch(query) {
  clearTimeout(searchTimeout);
  if (!query.trim()) return;
  searchTimeout = setTimeout(() => {
    const results = MEECHAIN_DATA.nfts.filter(n =>
      n.name.toLowerCase().includes(query.toLowerCase()) ||
      n.creator.toLowerCase().includes(query.toLowerCase())
    );
    if (results.length > 0) {
      showToast(`พบ ${results.length} NFT สำหรับ "${query}"`, 'info');
      switchPage('nft-market');
    } else {
      showToast(`ไม่พบผลลัพธ์สำหรับ "${query}"`, 'warning');
    }
  }, 500);
}

// ============================================================
// FILTER TABS
// ============================================================
function initFilterTabs() {
  $$('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderMainNFTGrid(tab.dataset.filter);
    });
  });

  const sortSelect = $('#sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const sorted = [...MEECHAIN_DATA.nfts];
      if (sortSelect.value === 'price-asc') sorted.sort((a,b) => a.price - b.price);
      if (sortSelect.value === 'price-desc') sorted.sort((a,b) => b.price - a.price);
      if (sortSelect.value === 'popular') sorted.sort((a,b) => b.likes - a.likes);
      MEECHAIN_DATA.nfts = sorted;
      renderMainNFTGrid($('.filter-tab.active')?.dataset.filter || 'all');
      showToast('จัดเรียง NFT แล้ว', 'info');
    });
  }
}

// ============================================================
// EXPLORER SEARCH
// ============================================================
function initExplorerSearch() {
  const searchBtn = $('#explorer-search-btn');
  const searchInput = $('#explorer-search');
  if (!searchBtn || !searchInput) return;

  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (!query) { showToast('กรุณาใส่ Hash หรือ Address', 'warning'); return; }
    showToast(`กำลังค้นหา "${query}"...`, 'info');
    setTimeout(() => showToast('ไม่พบข้อมูลที่ต้องการ (Demo Mode)', 'warning'), 1000);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchBtn.click();
  });
}

// ============================================================
// CREATE NFT
// ============================================================
function initCreateNFT() {
  const createBtn = $('#create-nft-btn');
  const closeBtn = $('#create-nft-modal-close');
  const mintBtn = $('#mint-nft-btn');
  const uploadArea = $('#nft-upload-area');
  const fileInput = $('#nft-file-input');

  if (createBtn) createBtn.addEventListener('click', () => $('#create-nft-modal').classList.remove('hidden'));
  if (closeBtn) closeBtn.addEventListener('click', () => $('#create-nft-modal').classList.add('hidden'));

  if (uploadArea) {
    uploadArea.addEventListener('click', () => fileInput?.click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#7C3AED'; });
    uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file) {
        uploadArea.querySelector('p').textContent = `✅ ${file.name}`;
        showToast(`อัปโหลด ${file.name} สำเร็จ`, 'success');
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        uploadArea.querySelector('p').textContent = `✅ ${file.name}`;
        showToast(`อัปโหลด ${file.name} สำเร็จ`, 'success');
      }
    });
  }

  if (mintBtn) {
    mintBtn.addEventListener('click', () => {
      const name = $('#nft-name')?.value.trim();
      const price = $('#nft-price')?.value;
      if (!name) { showToast('กรุณาใส่ชื่อ NFT', 'warning'); return; }
      if (!AppState.walletConnected) { showToast('กรุณาเชื่อมต่อกระเป๋าเงินก่อน', 'warning'); return; }

      mintBtn.innerHTML = '<span class="loading-spinner"></span> กำลัง Mint...';
      mintBtn.disabled = true;

      setTimeout(() => {
        mintBtn.innerHTML = 'Mint NFT 🚀';
        mintBtn.disabled = false;
        $('#create-nft-modal').classList.add('hidden');
        showToast(`Mint NFT "${name}" สำเร็จ! 🎉`, 'success');

        // Add to NFT list
        const newNFT = {
          id: Date.now(),
          name, category: $('#nft-category')?.value || 'art',
          price: parseFloat(price) || 0,
          likes: 0, creator: 'You',
          image: MEECHAIN_DATA.logos.meebot,
          artColor: '#7C3AED',
          desc: $('#nft-desc')?.value || '',
          attributes: [],
          rarity: 'common'
        };
        MEECHAIN_DATA.nfts.unshift(newNFT);
        renderMainNFTGrid();
        renderTrendingNFTs();
      }, 2000);
    });
  }
}

// ============================================================
// WALLET ACTIONS
// ============================================================
function initWalletActions() {
  const actions = {
    'send-btn': () => {
      if (!AppState.walletConnected) { showToast('กรุณาเชื่อมต่อกระเป๋าเงินก่อน', 'warning'); return; }
      showToast('เปิดหน้าต่างส่ง MEE...', 'info');
    },
    'receive-btn': () => {
      if (!AppState.walletConnected) { showToast('กรุณาเชื่อมต่อกระเป๋าเงินก่อน', 'warning'); return; }
      showToast('คัดลอก Address เพื่อรับ MEE', 'info');
    },
    'swap-btn': () => {
      if (!AppState.walletConnected) { showToast('กรุณาเชื่อมต่อกระเป๋าเงินก่อน', 'warning'); return; }
      showToast('เปิดหน้าต่าง Swap...', 'info');
    },
    'buy-btn': () => {
      showToast('เปิดหน้าต่างซื้อ MEE ด้วยบัตรเครดิต...', 'info');
    },
  };

  Object.entries(actions).forEach(([id, handler]) => {
    const btn = $(`#${id}`);
    if (btn) btn.addEventListener('click', handler);
  });

  const copyBtn = $('#copy-address-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (!AppState.walletConnected) { showToast('ยังไม่ได้เชื่อมต่อกระเป๋าเงิน', 'warning'); return; }
      navigator.clipboard.writeText(AppState.walletAddress).then(() => {
        showToast('คัดลอก Address แล้ว!', 'success');
      }).catch(() => {
        showToast('คัดลอก Address แล้ว!', 'success');
      });
    });
  }
}

// ============================================================
// MODALS
// ============================================================
function initModals() {
  // Wallet modal
  const connectBtn = $('#connect-wallet-btn');
  const walletModalClose = $('#wallet-modal-close');
  if (connectBtn) connectBtn.addEventListener('click', openWalletModal);
  if (walletModalClose) walletModalClose.addEventListener('click', () => $('#wallet-modal').classList.add('hidden'));

  $$('.wallet-option').forEach(opt => {
    opt.addEventListener('click', () => connectWallet(opt.dataset.wallet));
  });

  // NFT modal close
  const nftModalClose = $('#nft-modal-close');
  if (nftModalClose) nftModalClose.addEventListener('click', () => $('#nft-modal').classList.add('hidden'));

  // Close on overlay click
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function initNotifications() {
  const notifBtn = $('#notif-btn');
  const notifDropdown = $('#notif-dropdown');
  if (!notifBtn || !notifDropdown) return;

  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    notifDropdown?.classList.add('hidden');
  });
}

// ============================================================
// SIDEBAR
// ============================================================
function initSidebar() {
  // Desktop toggle
  const toggleBtn = $('#sidebar-toggle');
  const sidebar = $('#sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      toggleBtn.querySelector('.toggle-icon').textContent =
        sidebar.classList.contains('collapsed') ? '»' : '☰';
    });
  }

  // Mobile toggle
  const mobileMenuBtn = $('#mobile-menu-btn');
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }

  // Nav items
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      switchPage(item.dataset.page);
    });
  });
}

// ============================================================
// SETTINGS
// ============================================================
function initSettings() {
  $$('.settings-form .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('บันทึกการตั้งค่าแล้ว ✅', 'success');
    });
  });

  $$('.network-option .btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const networkText = e.target.closest('.network-option').querySelector('span:not([class])').textContent;
      showToast(`สลับไปยัง ${networkText}`, 'info');
    });
  });
}

// ============================================================
// RIPPLE EFFECTS
// ============================================================
function initRipples() {
  $$('.btn-primary, .btn-outline, .btn-secondary').forEach(addRipple);
}

// ============================================================
// LOADING SCREEN
// ============================================================
function hideLoadingScreen() {
  const screen = $('#loading-screen');
  const app = $('#app');
  if (!screen) return;

  setTimeout(() => {
    screen.classList.add('fade-out');
    if (app) {
      app.classList.remove('hidden');
      app.classList.add('visible');
    }
    setTimeout(() => {
      screen.style.display = 'none';
    }, 500);
  }, 2200);
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.altKey) {
      const shortcuts = { '1': 'dashboard', '2': 'nft-market', '3': 'ritual', '4': 'staking', '5': 'wallet' };
      if (shortcuts[e.key]) { switchPage(shortcuts[e.key]); e.preventDefault(); }
    }
    if (e.key === 'Escape') {
      $$('.modal-overlay').forEach(m => m.classList.add('hidden'));
      $('#notif-dropdown')?.classList.add('hidden');
    }
  });
}

// ============================================================
// WEB3 / NETWORK STATUS BAR
// ============================================================
async function checkWeb3Status() {
  try {
    const res = await fetch('/api/web3/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // ── Update the top network status bar ──────────────────
    const dot   = $('#net-dot');
    const label = $('#net-label');
    const block = $('#net-block');

    if (dot) {
      dot.className = `net-dot ${data.connected ? 'online' : 'offline'}`;
    }
    if (label) {
      label.textContent = data.connected
        ? `🟢 เชื่อมต่อ Ritual Chain สำเร็จ (Chain ID: ${data.chainId || 13390})`
        : '🔴 Ritual Chain: Offline — ใช้ข้อมูล Mock';
    }
    if (block && data.blockNumber) {
      block.textContent = '#' + Number(data.blockNumber).toLocaleString();
    }

    // ── Also update live block counter ─────────────────────
    if (data.connected && data.blockNumber) {
      blockNumber = Number(data.blockNumber);
      const el      = $('#block-number');
      const totalEl = $('#total-blocks');
      if (el)      el.textContent      = blockNumber.toLocaleString('th-TH');
      if (totalEl) totalEl.textContent = blockNumber.toLocaleString('th-TH');
    }

    if (data.connected) {
      showToast(`✅ เชื่อมต่อ Ritual Chain | Block #${data.blockNumber || '—'}`, 'success');
    }
  } catch(e) {
    console.warn('Web3 status check failed:', e.message);
    const dot   = $('#net-dot');
    const label = $('#net-label');
    if (dot)   dot.className   = 'net-dot offline';
    if (label) label.textContent = '🔴 ไม่สามารถเชื่อมต่อ Server ได้';
  }
}

// Poll network status every 30 seconds
function startNetworkStatusPoll() {
  checkWeb3Status();
  setInterval(checkWeb3Status, 30000);
}

// ============================================================
// MAIN INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Render all data
  renderActivityList();
  renderTrendingNFTs();
  renderMainNFTGrid();
  renderStakingPools();
  renderTokenList();
  renderWalletTxHistory();
  renderRecentBlocks();
  renderExplorerTxs();
  renderMeeBotCollection();

  // Init components
  initSidebar();
  initModals();
  initNotifications();
  initFilterTabs();
  initCreateNFT();
  initWalletActions();
  initExplorerSearch();
  initSettings();
  initRipples();
  initKeyboardShortcuts();

  // Particles & counters
  createParticles();

  // Init chart after short delay
  setTimeout(() => {
    if (window.ChartManager) ChartManager.init();
    initCounters();
  }, 300);

  // Live updates
  startLiveBlockUpdate();

  // Hide loading screen
  hideLoadingScreen();

  // Search
  const searchInput = $('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => handleSearch(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch(searchInput.value);
    });
  }

  // Welcome toast
  setTimeout(() => {
    showToast('ยินดีต้อนรับสู่ MeeChain Dashboard! 🚀', 'success');
  }, 2800);

  // Web3 / network status polling
  startNetworkStatusPoll();

  console.log('✅ MeeChain Dashboard initialized successfully!');
});
