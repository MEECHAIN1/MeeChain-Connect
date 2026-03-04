// ===== MeeChain Dashboard - Mock Data =====

// ── NFT Art Generator ──────────────────────────────────────────
// Generate unique SVG art for each NFT (fallback when images fail)
function generateNFTArt(id, name, rarity) {
  const palettes = {
    legendary: ['#FFD700', '#FF6B00', '#FF3E00', '#FFA500', '#FFED4E'],
    rare:      ['#7C3AED', '#A855F7', '#6366F1', '#8B5CF6', '#C084FC'],
    common:    ['#0EA5E9', '#06B6D4', '#3B82F6', '#22D3EE', '#60A5FA'],
  };
  const colors = palettes[rarity] || palettes.common;
  const c1 = colors[id % colors.length];
  const c2 = colors[(id + 1) % colors.length];
  const c3 = colors[(id + 2) % colors.length];

  const shapes = [
    // Robot/MeeBot style
    `<circle cx="120" cy="90" r="40" fill="${c2}" opacity="0.8"/>
     <rect x="90" y="90" width="60" height="70" rx="8" fill="${c1}"/>
     <circle cx="107" cy="82" r="8" fill="white" opacity="0.9"/>
     <circle cx="133" cy="82" r="8" fill="white" opacity="0.9"/>
     <circle cx="107" cy="82" r="4" fill="${c3}"/>
     <circle cx="133" cy="82" r="4" fill="${c3}"/>
     <rect x="105" y="120" width="30" height="6" rx="3" fill="white" opacity="0.6"/>`,

    // Bear style
    `<circle cx="120" cy="100" r="55" fill="${c1}" opacity="0.9"/>
     <circle cx="88" cy="62" r="20" fill="${c1}"/>
     <circle cx="152" cy="62" r="20" fill="${c1}"/>
     <circle cx="108" cy="93" r="8" fill="${c3}"/>
     <circle cx="132" cy="93" r="8" fill="${c3}"/>
     <ellipse cx="120" cy="108" rx="12" ry="8" fill="${c2}"/>
     <rect x="100" y="130" width="40" height="12" rx="6" fill="${c2}" opacity="0.7"/>`,

    // Astronaut style
    `<circle cx="120" cy="100" r="50" fill="${c1}" opacity="0.3"/>
     <circle cx="120" cy="95" r="35" fill="${c2}"/>
     <rect x="85" y="125" width="70" height="50" rx="12" fill="${c1}"/>
     <circle cx="120" cy="95" r="28" fill="#0D1117" opacity="0.6"/>
     <circle cx="120" cy="95" r="20" fill="${c3}" opacity="0.5"/>
     <ellipse cx="112" cy="88" rx="8" ry="6" fill="white" opacity="0.8"/>`,

    // Crystal/Art style
    `<polygon points="120,30 180,100 150,175 90,175 60,100" fill="${c1}" opacity="0.7"/>
     <polygon points="120,50 165,105 142,165 98,165 75,105" fill="${c2}" opacity="0.6"/>
     <polygon points="120,70 148,108 136,148 104,148 92,108" fill="${c3}" opacity="0.8"/>
     <circle cx="120" cy="108" r="15" fill="white" opacity="0.4"/>`,

    // Guardian/Warrior style
    `<rect x="85" y="60" width="70" height="90" rx="10" fill="${c1}"/>
     <polygon points="120,40 95,65 145,65" fill="${c2}"/>
     <circle cx="107" cy="93" r="8" fill="${c3}"/>
     <circle cx="133" cy="93" r="8" fill="${c3}"/>
     <rect x="100" y="115" width="40" height="8" rx="4" fill="white" opacity="0.5"/>
     <rect x="110" y="150" width="20" height="30" rx="5" fill="${c2}"/>`,

    // Music/Sound style
    `<circle cx="120" cy="100" r="60" fill="${c1}" opacity="0.2"/>
     <circle cx="120" cy="100" r="45" fill="${c2}" opacity="0.4"/>
     <circle cx="120" cy="100" r="30" fill="${c3}" opacity="0.6"/>
     <circle cx="120" cy="100" r="15" fill="${c1}"/>
     <line x1="120" y1="40" x2="120" y2="160" stroke="white" stroke-width="2" opacity="0.4"/>
     <line x1="60" y1="100" x2="180" y2="100" stroke="white" stroke-width="2" opacity="0.4"/>`,

    // Cosmic style
    `<circle cx="120" cy="100" r="60" fill="${c1}" opacity="0.15"/>
     <circle cx="80" cy="70" r="15" fill="${c2}" opacity="0.7"/>
     <circle cx="160" cy="130" r="20" fill="${c3}" opacity="0.7"/>
     <circle cx="140" cy="65" r="10" fill="${c1}" opacity="0.9"/>
     <circle cx="90" cy="140" r="12" fill="${c2}" opacity="0.9"/>
     <circle cx="120" cy="100" r="25" fill="${c3}" opacity="0.8"/>
     <circle cx="120" cy="100" r="8" fill="white" opacity="0.9"/>`,

    // Lotus/Ritual style
    `<ellipse cx="120" cy="110" rx="50" ry="60" fill="${c1}" opacity="0.3"/>
     <ellipse cx="120" cy="100" rx="35" ry="45" fill="${c2}" opacity="0.5"/>
     <ellipse cx="120" cy="90" rx="20" ry="30" fill="${c3}" opacity="0.7"/>
     <ellipse cx="120" cy="95" rx="8" ry="12" fill="${c1}" opacity="0.9"/>
     <circle cx="120" cy="80" r="10" fill="white" opacity="0.8"/>`,
  ];

  const bgGradient = `
    <defs>
      <radialGradient id="bg${id}" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#0D1117"/>
      </radialGradient>
      <filter id="glow${id}">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>`;

  const shapeIdx = (id - 1) % shapes.length;
  const rarityBadge = rarity === 'legendary'
    ? `<text x="10" y="188" font-size="11" fill="#FFD700" font-family="sans-serif">⭐ LEGENDARY</text>`
    : rarity === 'rare'
    ? `<text x="10" y="188" font-size="11" fill="#A855F7" font-family="sans-serif">💜 RARE</text>`
    : `<text x="10" y="188" font-size="11" fill="#60A5FA" font-family="sans-serif">⬜ COMMON</text>`;

  const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" width="240" height="200">
    ${bgGradient}
    <rect width="240" height="200" fill="url(%23bg${id})" rx="12"/>
    <g filter="url(%23glow${id})" transform="translate(0,-10)">
      ${shapes[shapeIdx]}
    </g>
    <text x="120" y="175" text-anchor="middle" font-size="10" fill="white" opacity="0.7" font-family="sans-serif">${name}</text>
    ${rarityBadge}
    <text x="230" y="188" text-anchor="end" font-size="9" fill="${c1}" font-family="sans-serif" opacity="0.8">#${String(id).padStart(3,'0')}</text>
  </svg>`;

  return svg.replace(/#/g, '%23').replace(/"/g, "'");
}

const MEECHAIN_DATA = {
  // Brand Assets
  logos: {
    meechain: 'src/assets/images/meechain_logo.png',
    ritual:   'src/assets/images/ritual_chain.png',
    meebot:   'src/assets/images/meebot.png',
    nftInfo:  'src/assets/images/nft_info.png',
  },

  // Smart Contract Addresses (Ritual Chain)
  contracts: {
    token:   '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    nft:     '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    staking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    rpc:     'https://ritual-chain--pouaun2499.replit.app',
  },

  // NFT Collections (uses local brand images with SVG fallback art)
  nfts: [
    {
      id: 1, name: 'MeeBot Alpha #001', category: 'avatar',
      price: 240, likes: 342, creator: 'MeeCreator_01',
      image: 'src/assets/images/meebot.png',
      artColor: '#7C3AED',
      desc: 'MeeBot Alpha ตัวแรกของคอลเลกชัน เต็มไปด้วยพลังพิเศษจาก Ritual Chain',
      attributes: [
        { type: 'ประเภท', value: 'Alpha Bot' },
        { type: 'พลัง', value: 'สูงมาก' },
        { type: 'ธาตุ', value: 'ไฟ🔥' },
        { type: 'ระดับ', value: 'Legendary' },
        { type: 'รุ่น', value: 'Gen 1' },
        { type: 'เลขที่', value: '#001' },
      ],
      rarity: 'legendary'
    },
    {
      id: 2, name: 'Ritual Bear #042', category: 'avatar',
      price: 185, likes: 217, creator: 'BearMaster',
      image: 'src/assets/images/meechain_logo.png',
      artColor: '#A855F7',
      desc: 'Ritual Bear นักขุดบล็อกเชนผู้เชี่ยวชาญ พร้อมหมวกนิรภัยทอง',
      attributes: [
        { type: 'ประเภท', value: 'Mining Bear' },
        { type: 'ทักษะ', value: 'Blockchain Mining' },
        { type: 'หมวก', value: 'ทอง' },
        { type: 'ระดับ', value: 'Rare' },
        { type: 'รุ่น', value: 'Gen 1' },
        { type: 'เลขที่', value: '#042' },
      ],
      rarity: 'rare'
    },
    {
      id: 3, name: 'Space Astronaut #007', category: 'art',
      price: 320, likes: 489, creator: 'SpaceArtist',
      image: 'src/assets/images/ritual_chain.png',
      artColor: '#FF6B00',
      desc: 'นักบินอวกาศสุดน่ารักจาก Mee Ritual Chain ผจญภัยในห้วงอวกาศ',
      attributes: [
        { type: 'ประเภท', value: 'Space Explorer' },
        { type: 'ชุด', value: 'Ritual Suit' },
        { type: 'พื้นหลัง', value: 'Deep Space' },
        { type: 'ระดับ', value: 'Legendary' },
        { type: 'ชุดฝา', value: 'Orange' },
        { type: 'เลขที่', value: '#007' },
      ],
      rarity: 'legendary'
    },
    {
      id: 4, name: 'MeeBot Lotus #128', category: 'art',
      price: 95, likes: 156, creator: 'LotusArt',
      image: 'src/assets/images/meebot.png',
      artColor: '#10B981',
      desc: 'MeeBot ถือดอกบัวแห่งการตรัสรู้ พิเศษจากคอลเลกชัน Ritual',
      attributes: [
        { type: 'ประเภท', value: 'Ritual Bot' },
        { type: 'ถือ', value: 'ดอกบัวไฟ' },
        { type: 'ตา', value: 'ฟ้านีออน' },
        { type: 'ระดับ', value: 'Rare' },
        { type: 'พิเศษ', value: 'มี Aura' },
        { type: 'เลขที่', value: '#128' },
      ],
      rarity: 'rare'
    },
    {
      id: 5, name: 'Chain Guardian #003', category: 'gaming',
      price: 560, likes: 891, creator: 'GuardianDev',
      image: 'src/assets/images/ritual_chain.png',
      artColor: '#EF4444',
      desc: 'ผู้พิทักษ์บล็อกเชนผู้ทรงพลัง ออกแบบพิเศษสำหรับเกม MeeRealm',
      attributes: [
        { type: 'ประเภท', value: 'Guardian' },
        { type: 'อาวุธ', value: 'Chain Sword' },
        { type: 'เกราะ', value: 'Ritual Armor' },
        { type: 'ระดับ', value: 'Legendary' },
        { type: 'เกม', value: 'MeeRealm' },
        { type: 'เลขที่', value: '#003' },
      ],
      rarity: 'legendary'
    },
    {
      id: 6, name: 'Mee Sound #022', category: 'music',
      price: 72, likes: 134, creator: 'SoundMee',
      image: 'src/assets/images/meechain_logo.png',
      artColor: '#F59E0B',
      desc: 'ดนตรีแห่งบล็อกเชน เสียงพิเศษที่สร้างขึ้นด้วย AI',
      attributes: [
        { type: 'ประเภท', value: 'Music NFT' },
        { type: 'ระยะเวลา', value: '3:24' },
        { type: 'ประเภทดนตรี', value: 'Electronic' },
        { type: 'ระดับ', value: 'Common' },
        { type: 'BPM', value: '128' },
        { type: 'เลขที่', value: '#022' },
      ],
      rarity: 'common'
    },
    {
      id: 7, name: 'MeeBot Warrior #055', category: 'gaming',
      price: 280, likes: 376, creator: 'WarriorCraft',
      image: 'src/assets/images/meebot.png',
      artColor: '#06B6D4',
      desc: 'นักรบ MeeBot สำหรับเกม P2E บน MeeChain Mainnet',
      attributes: [
        { type: 'ประเภท', value: 'Battle Bot' },
        { type: 'ความแข็งแกร่ง', value: '9500' },
        { type: 'ความเร็ว', value: '8800' },
        { type: 'ระดับ', value: 'Rare' },
        { type: 'คลาส', value: 'Warrior' },
        { type: 'เลขที่', value: '#055' },
      ],
      rarity: 'rare'
    },
    {
      id: 8, name: 'Cosmic Ritual #011', category: 'art',
      price: 145, likes: 203, creator: 'CosmicMee',
      image: 'src/assets/images/ritual_chain.png',
      artColor: '#8B5CF6',
      desc: 'ศิลปะดิจิทัลแห่งจักรวาล ผสมผสานระหว่างอวกาศและพิธีกรรม',
      attributes: [
        { type: 'ประเภท', value: 'Cosmic Art' },
        { type: 'พื้นหลัง', value: 'Galaxy' },
        { type: 'สไตล์', value: 'Abstract' },
        { type: 'ระดับ', value: 'Common' },
        { type: 'ชุด', value: 'Ritual' },
        { type: 'เลขที่', value: '#011' },
      ],
      rarity: 'common'
    },
  ],

  // Get NFT display image: uses local file with SVG art as fallback
  getNFTImageHTML(nft, cssClass = '') {
    const fallbackSVG = generateNFTArt(nft.id, nft.name, nft.rarity);
    return `<img src="${nft.image}" 
      alt="${nft.name}" 
      class="${cssClass}"
      loading="lazy"
      onerror="this.onerror=null;this.src='${fallbackSVG}'"
    />`;
  },

  // Recent Activity
  activities: [
    { icon: '🛒', title: 'ซื้อ MeeBot Alpha #001', time: '2 นาทีที่แล้ว', amount: '+240 MEE', type: 'buy' },
    { icon: '⛏️', title: 'รับรางวัล Staking', time: '15 นาทีที่แล้ว', amount: '+42.5 MEE', type: 'reward' },
    { icon: '🎨', title: 'Mint NFT Space Astronaut #007', time: '1 ชั่วโมงที่แล้ว', amount: '-5 MEE', type: 'mint' },
    { icon: '💱', title: 'แลกเปลี่ยน MEE → USDT', time: '3 ชั่วโมงที่แล้ว', amount: '-500 MEE', type: 'swap' },
    { icon: '📤', title: 'ส่ง MEE ไปยัง 0x742...', time: '5 ชั่วโมงที่แล้ว', amount: '-100 MEE', type: 'send' },
    { icon: '🏆', title: 'รางวัล Daily Mining', time: '1 วันที่แล้ว', amount: '+85.2 MEE', type: 'reward' },
  ],

  // Staking Pools
  stakingPools: [
    {
      name: 'MEE Standard Pool', apy: '85%',
      minStake: '100 MEE', lockPeriod: '30 วัน',
      totalStaked: '8,524,100 MEE', capacity: 72,
      icon: '🟣',
      contractAddr: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
    },
    {
      name: 'MEE Premium Pool', apy: '148%',
      minStake: '1,000 MEE', lockPeriod: '90 วัน',
      totalStaked: '12,840,500 MEE', capacity: 58,
      icon: '🟠',
      contractAddr: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
    },
    {
      name: 'Ritual Chain Pool', apy: '248%',
      minStake: '5,000 MEE', lockPeriod: '180 วัน',
      totalStaked: '24,120,000 MEE', capacity: 34,
      icon: '🔵',
      contractAddr: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
    },
  ],

  // Tokens
  tokens: [
    { icon: '🟣', name: 'MeeChain', symbol: 'MEE', amount: '0.00', usd: '$0.00', change: '+12.5%', positive: true },
    { icon: '💲', name: 'USD Coin', symbol: 'USDC', amount: '0.00', usd: '$0.00', change: '+0.1%', positive: true },
    { icon: '🔷', name: 'Wrapped ETH', symbol: 'WETH', amount: '0.00', usd: '$0.00', change: '-2.3%', positive: false },
    { icon: '🟡', name: 'Wrapped BTC', symbol: 'WBTC', amount: '0.00', usd: '$0.00', change: '+1.8%', positive: true },
  ],

  // Recent Transactions (Wallet)
  walletTxs: [
    { icon: '↗️', name: 'ส่ง MEE', hash: '0x742d...8f3a', amount: '-100 MEE', type: 'send' },
    { icon: '↙️', name: 'รับ MEE', hash: '0x891c...2b4d', amount: '+500 MEE', type: 'receive' },
    { icon: '🔄', name: 'Swap MEE→USDT', hash: '0x3f82...9e1c', amount: '-200 MEE', type: 'swap' },
    { icon: '🛒', name: 'ซื้อ NFT', hash: '0xa12b...7d5e', amount: '-240 MEE', type: 'buy' },
    { icon: '⛏️', name: 'Staking Reward', hash: '0x5c4d...1f8b', amount: '+42.5 MEE', type: 'reward' },
  ],

  // Block Explorer Data
  recentBlocks: [
    { num: '1,248,753', hash: '0x7a3f...8b2c', time: '5 วิ', txns: 124 },
    { num: '1,248,752', hash: '0x2d1e...4f9a', time: '17 วิ', txns: 98 },
    { num: '1,248,751', hash: '0x9c8b...3e7f', time: '29 วิ', txns: 211 },
    { num: '1,248,750', hash: '0x4f2a...6d1c', time: '41 วิ', txns: 87 },
    { num: '1,248,749', hash: '0x8e5d...2a4b', time: '53 วิ', txns: 145 },
  ],

  // Recent Transactions (Explorer)
  explorerTxs: [
    { hash: '0x7a3f8b2c...', from: '0x742d...8f3a', to: '0x891c...2b4d', amount: '240 MEE', status: 'success', time: '5 วิ' },
    { hash: '0x2d1e4f9a...', from: '0x3f82...9e1c', to: '0xa12b...7d5e', amount: '100 MEE', status: 'success', time: '12 วิ' },
    { hash: '0x9c8b3e7f...', from: '0x5c4d...1f8b', to: '0x742d...8f3a', amount: '500 USDT', status: 'pending', time: '25 วิ' },
    { hash: '0x4f2a6d1c...', from: '0x8e5d...2a4b', to: '0x3f82...9e1c', amount: '42.5 MEE', status: 'success', time: '38 วิ' },
    { hash: '0x8e5d2a4b...', from: '0xa12b...7d5e', to: '0x9c8b...3e7f', amount: '1000 MEE', status: 'success', time: '52 วิ' },
  ],

  // MeeBot NFT Collection — unique image for each
  meebotNFTs: [
    { id: 1,  name: 'Alpha MeeBot',   rarity: 'legendary', image: 'src/assets/images/meebot.png' },
    { id: 2,  name: 'Ritual MeeBot',  rarity: 'rare',      image: 'src/assets/images/meechain_logo.png' },
    { id: 3,  name: 'Space MeeBot',   rarity: 'legendary', image: 'src/assets/images/ritual_chain.png' },
    { id: 4,  name: 'Fire MeeBot',    rarity: 'rare',      image: 'src/assets/images/nft_info.png' },
    { id: 5,  name: 'Ice MeeBot',     rarity: 'common',    image: 'src/assets/images/meebot.png' },
    { id: 6,  name: 'Thunder MeeBot', rarity: 'common',    image: 'src/assets/images/meechain_logo.png' },
  ],

  // Price Chart Data
  generateChartData(period) {
    const points = { '1D': 24, '7D': 7, '1M': 30, '1Y': 12 };
    const count = points[period] || 24;
    const labels = [];
    const data = [];
    let price = 0.065;

    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.45) * 0.005;
      price = Math.max(0.04, price + change);
      data.push(parseFloat(price.toFixed(5)));

      if (period === '1D') {
        labels.push(`${String(i).padStart(2,'0')}:00`);
      } else if (period === '7D') {
        const days = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
        labels.push(days[i % 7]);
      } else if (period === '1M') {
        labels.push(`${i+1}`);
      } else {
        const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
        labels.push(months[i]);
      }
    }
    data[data.length - 1] = 0.0842;
    data[data.length - 2] = 0.0810;
    data[data.length - 3] = 0.0795;

    return { labels, data };
  }
};
