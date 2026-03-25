// ============================================================
//  MeeChain i18n — Multi-language Support v1.0
//  Supported: th (Thai), en (English), ja (Japanese)
//  Usage:
//    i18n.set('en')           — switch language
//    i18n.t('nav.dashboard')  — get translation
//    i18n.applyDOM()          — update all [data-i18n] elements
// ============================================================

const TRANSLATIONS = {
  // ─── Thai (Default) ───────────────────────────────────────
  th: {
    lang: { name: 'ภาษาไทย', flag: '🇹🇭', code: 'th' },
    nav: {
      dashboard:  'แดชบอร์ด',
      nft:        'ตลาด NFT',
      ritual:     'Mee Ritual Chain',
      staking:    'Staking / Mining',
      wallet:     'กระเป๋าเงิน',
      meebot:     'MeeBot',
      settings:   'ตั้งค่า',
      explorer:   'Block Explorer',
      nftMarket:  'NFT Market',
      dao:        'DAO Governance',
      analytics:  'Analytics',
    },
    dashboard: {
      title:        'แดชบอร์ด',
      welcome:      'ยินดีต้อนรับสู่ MeeChain Dashboard',
      totalValue:   'มูลค่ารวมตลาด',
      totalNft:     'NFT ทั้งหมด',
      totalUsers:   'ผู้ใช้งาน',
      stakingReward:'รางวัล Staking',
      latestBlock:  'บล็อคล่าสุด',
      tps:          'TPS',
      validators:   'ผู้ตรวจสอบ',
      networkFee:   'ค่าธรรมเนียม',
    },
    wallet: {
      connect:      'เชื่อมต่อ Wallet',
      disconnect:   'ตัดการเชื่อมต่อ',
      connected:    'เชื่อมต่อแล้ว',
      balance:      'ยอดคงเหลือ',
      address:      'ที่อยู่กระเป๋า',
      network:      'เครือข่าย',
      copy:         'คัดลอก',
      copied:       'คัดลอกแล้ว!',
    },
    staking: {
      title:        'Staking & Mining',
      maxApy:       'APY สูงสุด',
      totalLocked:  'MEE ล็อคทั้งหมด',
      yourPosition: 'Position ของคุณ',
      stakeNow:     'Stake เลย',
      unstake:      'ถอน',
      claimReward:  'รับรางวัล',
      apy:          'APY',
      lockPeriod:   'ระยะล็อค',
      minimum:      'ขั้นต่ำ',
      enterAmount:  'ใส่จำนวน MEE',
      poolStandard: 'Standard Pool',
      poolPremium:  'Premium Pool',
      poolRitual:   'Ritual Chain Pool',
    },
    nft: {
      title:        'ตลาด NFT',
      mint:         'Mint NFT',
      buy:          'ซื้อ',
      sell:         'ขาย',
      listed:       'ราคา',
      rarity:       'ระดับความหายาก',
      collection:   'คอลเลกชัน',
      owner:        'เจ้าของ',
      history:      'ประวัติการซื้อขาย',
      common:       'ธรรมดา',
      rare:         'หายาก',
      legendary:    'ตำนาน',
    },
    dao: {
      title:        'DAO Governance',
      propose:      'เสนอข้อเสนอ',
      vote:         'ลงคะแนน',
      voteFor:      'เห็นด้วย',
      voteAgainst:  'ไม่เห็นด้วย',
      abstain:      'งดออกเสียง',
      active:       'กำลัง Vote',
      passed:       'ผ่านแล้ว',
      rejected:     'ไม่ผ่าน',
      pending:      'รอเริ่ม',
      quorum:       'Quorum',
      voted:        'ลงคะแนนแล้ว',
    },
    analytics: {
      title:        'Analytics',
      tvl:          'Total Value Locked',
      volume:       'Volume',
      activeUsers:  'ผู้ใช้งานที่ใช้งาน',
      transactions: 'ธุรกรรม',
      leaderboard:  'อันดับ',
      holders:      'ผู้ถือ',
      stakers:      'ผู้ Stake',
    },
    meebot: {
      placeholder:  'ถามฉันเกี่ยวกับ MeeChain...',
      send:         'ส่ง',
      clear:        'ล้างการสนทนา',
      thinking:     'กำลังคิด...',
    },
    common: {
      loading:      'กำลังโหลด...',
      error:        'เกิดข้อผิดพลาด',
      retry:        'ลองอีกครั้ง',
      close:        'ปิด',
      confirm:      'ยืนยัน',
      cancel:       'ยกเลิก',
      save:         'บันทึก',
      back:         'กลับ',
      viewAll:      'ดูทั้งหมด',
      search:       'ค้นหา',
      noData:       'ไม่มีข้อมูล',
      success:      'สำเร็จ!',
    },
  },

  // ─── English ──────────────────────────────────────────────
  en: {
    lang: { name: 'English', flag: '🇺🇸', code: 'en' },
    nav: {
      dashboard:  'Dashboard',
      nft:        'NFT Market',
      ritual:     'Mee Ritual Chain',
      staking:    'Staking / Mining',
      wallet:     'Wallet',
      meebot:     'MeeBot',
      settings:   'Settings',
      explorer:   'Block Explorer',
      nftMarket:  'NFT Market',
      dao:        'DAO Governance',
      analytics:  'Analytics',
    },
    dashboard: {
      title:        'Dashboard',
      welcome:      'Welcome to MeeChain Dashboard',
      totalValue:   'Total Market Value',
      totalNft:     'Total NFTs',
      totalUsers:   'Total Users',
      stakingReward:'Staking Rewards',
      latestBlock:  'Latest Block',
      tps:          'TPS',
      validators:   'Validators',
      networkFee:   'Network Fee',
    },
    wallet: {
      connect:      'Connect Wallet',
      disconnect:   'Disconnect',
      connected:    'Connected',
      balance:      'Balance',
      address:      'Wallet Address',
      network:      'Network',
      copy:         'Copy',
      copied:       'Copied!',
    },
    staking: {
      title:        'Staking & Mining',
      maxApy:       'Max APY',
      totalLocked:  'Total MEE Locked',
      yourPosition: 'Your Position',
      stakeNow:     'Stake Now',
      unstake:      'Unstake',
      claimReward:  'Claim Reward',
      apy:          'APY',
      lockPeriod:   'Lock Period',
      minimum:      'Minimum',
      enterAmount:  'Enter MEE Amount',
      poolStandard: 'Standard Pool',
      poolPremium:  'Premium Pool',
      poolRitual:   'Ritual Chain Pool',
    },
    nft: {
      title:        'NFT Marketplace',
      mint:         'Mint NFT',
      buy:          'Buy',
      sell:         'Sell',
      listed:       'Price',
      rarity:       'Rarity',
      collection:   'Collection',
      owner:        'Owner',
      history:      'Trade History',
      common:       'Common',
      rare:         'Rare',
      legendary:    'Legendary',
    },
    dao: {
      title:        'DAO Governance',
      propose:      'Submit Proposal',
      vote:         'Vote',
      voteFor:      'Vote For',
      voteAgainst:  'Vote Against',
      abstain:      'Abstain',
      active:       'Active',
      passed:       'Passed',
      rejected:     'Rejected',
      pending:      'Pending',
      quorum:       'Quorum',
      voted:        'Voted',
    },
    analytics: {
      title:        'Analytics',
      tvl:          'Total Value Locked',
      volume:       'Volume',
      activeUsers:  'Active Users',
      transactions: 'Transactions',
      leaderboard:  'Leaderboard',
      holders:      'Holders',
      stakers:      'Stakers',
    },
    meebot: {
      placeholder:  'Ask me about MeeChain...',
      send:         'Send',
      clear:        'Clear Chat',
      thinking:     'Thinking...',
    },
    common: {
      loading:      'Loading...',
      error:        'Error occurred',
      retry:        'Retry',
      close:        'Close',
      confirm:      'Confirm',
      cancel:       'Cancel',
      save:         'Save',
      back:         'Back',
      viewAll:      'View All',
      search:       'Search',
      noData:       'No data',
      success:      'Success!',
    },
  },

  // ─── Japanese ─────────────────────────────────────────────
  ja: {
    lang: { name: '日本語', flag: '🇯🇵', code: 'ja' },
    nav: {
      dashboard:  'ダッシュボード',
      nft:        'NFTマーケット',
      ritual:     'Mee Ritual Chain',
      staking:    'ステーキング',
      wallet:     'ウォレット',
      meebot:     'MeeBot',
      settings:   '設定',
      explorer:   'ブロックエクスプローラー',
      nftMarket:  'NFTマーケット',
      dao:        'DAOガバナンス',
      analytics:  'アナリティクス',
    },
    dashboard: {
      title:        'ダッシュボード',
      welcome:      'MeeChainへようこそ',
      totalValue:   '総市場価値',
      totalNft:     '総NFT数',
      totalUsers:   'ユーザー数',
      stakingReward:'ステーキング報酬',
      latestBlock:  '最新ブロック',
      tps:          'TPS',
      validators:   'バリデーター',
      networkFee:   'ネットワーク手数料',
    },
    wallet: {
      connect:      'ウォレット接続',
      disconnect:   '切断',
      connected:    '接続済み',
      balance:      '残高',
      address:      'ウォレットアドレス',
      network:      'ネットワーク',
      copy:         'コピー',
      copied:       'コピー済み！',
    },
    staking: {
      title:        'ステーキング',
      maxApy:       '最大APY',
      totalLocked:  'ロック済MEE',
      yourPosition: 'あなたのポジション',
      stakeNow:     'ステーク',
      unstake:      '引き出し',
      claimReward:  '報酬を受け取る',
      apy:          'APY',
      lockPeriod:   'ロック期間',
      minimum:      '最低額',
      enterAmount:  'MEE数量を入力',
      poolStandard: 'スタンダードプール',
      poolPremium:  'プレミアムプール',
      poolRitual:   'リチュアルチェーンプール',
    },
    nft: {
      title:        'NFTマーケットプレイス',
      mint:         'NFTをミント',
      buy:          '購入',
      sell:         '売却',
      listed:       '価格',
      rarity:       'レアリティ',
      collection:   'コレクション',
      owner:        'オーナー',
      history:      '取引履歴',
      common:       'コモン',
      rare:         'レア',
      legendary:    'レジェンダリー',
    },
    dao: {
      title:        'DAOガバナンス',
      propose:      'プロポーザル作成',
      vote:         '投票',
      voteFor:      '賛成',
      voteAgainst:  '反対',
      abstain:      '棄権',
      active:       '投票中',
      passed:       '可決',
      rejected:     '否決',
      pending:      '待機中',
      quorum:       'クォーラム',
      voted:        '投票済み',
    },
    analytics: {
      title:        'アナリティクス',
      tvl:          '総ロック額',
      volume:       '取引量',
      activeUsers:  'アクティブユーザー',
      transactions: 'トランザクション',
      leaderboard:  'リーダーボード',
      holders:      '保有者',
      stakers:      'ステーカー',
    },
    meebot: {
      placeholder:  'MeeChainについて質問してください...',
      send:         '送信',
      clear:        'チャットをクリア',
      thinking:     '考え中...',
    },
    common: {
      loading:      '読み込み中...',
      error:        'エラーが発生しました',
      retry:        '再試行',
      close:        '閉じる',
      confirm:      '確認',
      cancel:       'キャンセル',
      save:         '保存',
      back:         '戻る',
      viewAll:      'すべて表示',
      search:       '検索',
      noData:       'データなし',
      success:      '成功！',
    },
  },
};

// ─────────────────────────────────────────────────────────────
//  i18n Engine
// ─────────────────────────────────────────────────────────────
const i18n = {
  current: localStorage.getItem('meechain-lang') || 'th',
  listeners: [],

  /** Get translation by dot-notation key, e.g. 'nav.dashboard' */
  t(key, lang) {
    const l   = lang || this.current;
    const src = TRANSLATIONS[l] || TRANSLATIONS.th;
    const parts = key.split('.');
    let val = src;
    for (const p of parts) {
      val = val?.[p];
      if (val === undefined) {
        // Fallback to Thai
        val = TRANSLATIONS.th;
        for (const fp of parts) val = val?.[fp];
        break;
      }
    }
    return typeof val === 'string' ? val : key;
  },

  /** Switch language */
  set(code) {
    if (!TRANSLATIONS[code]) return console.warn(`[i18n] Language "${code}" not found`);
    this.current = code;
    localStorage.setItem('meechain-lang', code);
    this.applyDOM();
    this.listeners.forEach(fn => fn(code));
    document.documentElement.lang = code;
    console.log(`[i18n] Language set to: ${code}`);
  },

  /** Update all DOM elements with data-i18n attribute */
  applyDOM(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key  = el.dataset.i18n;
      const attr = el.dataset.i18nAttr; // e.g. "placeholder"
      const val  = this.t(key);
      if (attr) {
        el.setAttribute(attr, val);
      } else {
        el.textContent = val;
      }
    });

    // Update lang selector if present
    const sel = document.getElementById('lang-selector');
    if (sel) sel.value = this.current;
  },

  /** Listen to language changes */
  onChange(fn) {
    this.listeners.push(fn);
  },

  /** Get all available languages */
  languages() {
    return Object.entries(TRANSLATIONS).map(([code, data]) => ({
      code,
      name: data.lang.name,
      flag: data.lang.flag,
    }));
  },

  /** Render language switcher HTML */
  renderSwitcher(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const langs = this.languages();
    el.innerHTML = `
      <div class="lang-switcher" style="display:flex;gap:4px;align-items:center">
        ${langs.map(l => `
          <button
            class="lang-btn ${l.code === this.current ? 'active' : ''}"
            onclick="i18n.set('${l.code}')"
            title="${l.name}"
            style="background:none;border:1px solid ${l.code === this.current ? 'var(--purple,#7C3AED)' : 'rgba(255,255,255,.1)'};
                   border-radius:20px;color:inherit;padding:4px 10px;font-size:12px;cursor:pointer;transition:.2s;
                   ${l.code === this.current ? 'background:rgba(124,58,237,.15)' : ''}"
          >${l.flag} ${l.name}</button>
        `).join('')}
      </div>`;
    this.onChange(() => this.renderSwitcher(containerId));
  },
};

// ── Auto-init when DOM ready ──
const _i18nInit = () => {
  i18n.applyDOM();

  // Render switcher if placeholder exists
  if (document.getElementById('lang-switcher')) {
    i18n.renderSwitcher('lang-switcher');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _i18nInit);
} else {
  _i18nInit();
}

// Expose globally
window.i18n = i18n;
window.TRANSLATIONS = TRANSLATIONS;
