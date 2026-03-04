// ===== MeeChain Dashboard - Mock Data =====

const MEECHAIN_DATA = {
  // Brand Assets
  logos: {
    meechain: 'https://www.genspark.ai/api/files/s/djHvsw51',
    ritual: 'https://www.genspark.ai/api/files/s/sXVY2ZKL',
    meebot: 'https://www.genspark.ai/api/files/s/7KwFcyZ0',
    nftInfo: 'https://www.genspark.ai/api/files/s/hTnbvS3e',
  },

  // NFT Collections
  nfts: [
    {
      id: 1, name: 'MeeBot Alpha #001', category: 'avatar',
      price: 240, likes: 342, creator: 'MeeCreator_01',
      image: 'https://www.genspark.ai/api/files/s/7KwFcyZ0',
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
      image: 'https://www.genspark.ai/api/files/s/djHvsw51',
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
      image: 'https://www.genspark.ai/api/files/s/sXVY2ZKL',
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
      image: 'https://www.genspark.ai/api/files/s/7KwFcyZ0',
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
      image: 'https://www.genspark.ai/api/files/s/sXVY2ZKL',
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
      image: 'https://www.genspark.ai/api/files/s/djHvsw51',
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
      image: 'https://www.genspark.ai/api/files/s/7KwFcyZ0',
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
      image: 'https://www.genspark.ai/api/files/s/sXVY2ZKL',
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
      icon: '🟣'
    },
    {
      name: 'MEE Premium Pool', apy: '148%',
      minStake: '1,000 MEE', lockPeriod: '90 วัน',
      totalStaked: '12,840,500 MEE', capacity: 58,
      icon: '🟠'
    },
    {
      name: 'Ritual Chain Pool', apy: '248%',
      minStake: '5,000 MEE', lockPeriod: '180 วัน',
      totalStaked: '24,120,000 MEE', capacity: 34,
      icon: '🔵'
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

  // MEE Bot Collection
  meebotNFTs: [
    { id: 1, name: 'Alpha MeeBot', rarity: 'legendary', image: 'https://www.genspark.ai/api/files/s/7KwFcyZ0' },
    { id: 2, name: 'Ritual MeeBot', rarity: 'rare', image: 'https://www.genspark.ai/api/files/s/7KwFcyZ0' },
    { id: 3, name: 'Space MeeBot', rarity: 'legendary', image: 'https://www.genspark.ai/api/files/s/7KwFcyZ0' },
    { id: 4, name: 'Fire MeeBot', rarity: 'rare', image: 'https://www.genspark.ai/api/files/s/7KwFcyZ0' },
    { id: 5, name: 'Ice MeeBot', rarity: 'common', image: 'https://www.genspark.ai/api/files/s/7KwFcyZ0' },
    { id: 6, name: 'Thunder MeeBot', rarity: 'common', image: 'https://www.genspark.ai/api/files/s/7KwFcyZ0' },
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
    // Trend upward for last few
    data[data.length - 1] = 0.0842;
    data[data.length - 2] = 0.0810;
    data[data.length - 3] = 0.0795;

    return { labels, data };
  }
};
