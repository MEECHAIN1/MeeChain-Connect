# MeeChain Dashboard

แดชบอร์ด Web Application สำหรับ MeeChain Blockchain Platform พร้อม AI Assistant และ Web3 Integration

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.x-brightgreen.svg)](https://nodejs.org/)
[![Chain ID](https://img.shields.io/badge/Chain%20ID-13390-orange.svg)](https://rpc.meechain.run.place:5005)

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/MEECHAIN1/MeeChain-Connect.git
cd MeeChain-Connect

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start everything
./scripts/start.sh  # Linux/Mac
bash scripts/start.sh  # Windows (Git Bash)
```

**🎉 Done!** Open <http://localhost:3000>

📖 **New to MeeChain?** Read [Quick Start Guide](./QUICK_START.md)

---

## ✨ Features

### 🤖 MeeBot AI Assistant
- Chat interface ภาษาไทย
- ตอบคำถามเกี่ยวกับ MeeChain, NFT, Staking
- สร้างคำอธิบาย NFT อัตโนมัติ
- Streaming responses (SSE)

### 🔗 Web3 Integration
- เชื่อมต่อ MetaMask
- รองรับ MeeChain (Ritual Chain, Chain ID: 13390)
- RPC: `https://rpc.meechain.run.place:5005`
- Smart Contract interaction (Token, NFT, Staking)

### 🖼️ NFT Marketplace
- สร้าง (Mint) NFT
- ซื้อขาย NFT
- ดู NFT collection
- AI-generated descriptions

### ⛏️ Staking & Mining
- MEE Standard Pool (APY 85%)
- MEE Premium Pool (APY 148%)
- Ritual Chain Pool (APY 248%)
- Real-time rewards tracking

### 👛 Wallet Management
- ส่ง/รับ MEE Token
- Swap tokens
- Transaction history
- Balance tracking

### 🔍 Block Explorer
- ดู blocks และ transactions
- Chain statistics
- Gas price monitoring
- Network status

---

## 📋 Prerequisites

- **Node.js** >= 18.x
- **npm** หรือ yarn
- **Git**
- **MetaMask** (browser extension)
- **OpenAI API Key** (สำหรับ AI features)

---

## 🛠️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/MEECHAIN1/MeeChain-Connect.git
cd MeeChain-Connect
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

แก้ไข `.env`:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (มี defaults แล้ว)
DRPC_RPC_URL=https://rpc.meechain.run.place:5005
CHAIN_ID=13390
PORT=3000
```

### 4. Start Infrastructure

```bash
# Linux/Mac
./scripts/start.sh

# Windows (Git Bash)
bash scripts/start.sh

# Manual start
npx hardhat node &
npm start
```

---

## 🧪 Testing

### Quick Test

```bash
# Test all RPC endpoints
bash scripts/test-rpc.sh

# Test application health
curl http://localhost:3000/api/health
```

### Full QA Checklist

ดูรายละเอียดใน [QA_CHECKLIST.md](./QA_CHECKLIST.md)

---

## 📁 Project Structure

```
MeeChain-Connect/
├── blockchain/              # Smart contracts & deployment
│   ├── abi/                # Contract ABIs
│   ├── contract/           # Contract addresses
│   └── artifacts/          # Compiled contracts
├── src/
│   ├── web3/               # Web3 integration
│   │   └── contracts.js    # Contract interaction layer
│   ├── js/                 # Frontend JavaScript
│   └── css/                # Stylesheets
├── scripts/                # Utility scripts
│   ├── start.sh           # Start infrastructure
│   ├── stop.sh            # Stop infrastructure
│   └── test-rpc.sh        # Test RPC endpoints
├── docs/                   # Documentation
│   ├── API.md             # API documentation
│   └── METAMASK_SETUP.md  # MetaMask setup guide
├── logs/                   # Log files
├── server.js              # Main application server
├── index.html             # Main dashboard
├── nft-market.html        # NFT Marketplace
├── staking.html           # Staking & Mining
├── wallet.html            # Wallet Management
├── meebot.html            # MeeBot NFT Collection
├── block-explorer.html    # Block Explorer
├── settings.html          # Settings
├── QA_CHECKLIST.md        # QA testing guide
├── QUICK_START.md         # Quick start guide
├── CONTRIBUTING.md        # Contributing guide
└── .env.example           # Environment template
```

---

## 🌐 Network Configuration

### MeeChain (Ritual Chain)

| Field | Value |
|-------|-------|
| Network Name | MeeChain (Ritual Chain) |
| RPC URL | `https://rpc.meechain.run.place:5005` |
| Chain ID | `13390` (hex: `0x344e`) |
| Currency Symbol | `MEE` |
| Decimals | 18 |

### Smart Contracts

| Contract | Address |
|----------|---------|
| MEE Token | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| MeeBot NFT | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| Staking | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |

---

## 🔌 API Endpoints

### Health & Status

- `GET /api/health` - Server health check
- `GET /api/network` - Network information
- `GET /api/web3/status` - Web3 connection status

### Blockchain

- `GET /api/chain/stats` - Chain statistics
- `GET /api/chain/transactions` - Recent transactions

### Token

- `GET /api/token/info` - Token information
- `GET /api/token/balance/:address` - Token balance

### NFT

- `GET /api/nft/info` - NFT contract info
- `GET /api/nft/balance/:address` - NFT balance
- `POST /api/nft/describe` - Generate NFT description (AI)

### Staking

- `GET /api/staking/info` - Staking pools info
- `GET /api/staking/user/:address` - User staking data

### AI Chat

- `POST /api/chat` - Chat with MeeBot (non-streaming)
- `POST /api/chat/stream` - Chat with MeeBot (streaming SSE)
- `DELETE /api/chat/:sessionId` - Clear chat history

📖 **Full API Documentation:** [docs/API.md](./docs/API.md)

---

## 🦊 MetaMask Setup

### Quick Add

1. เปิด MetaMask
2. คลิก network dropdown
3. เลือก "Add Network"
4. กรอกข้อมูล:
   - Network Name: `MeeChain (Ritual Chain)`
   - RPC URL: `https://rpc.meechain.run.place:5005`
   - Chain ID: `13390`
   - Symbol: `MEE`
5. Save & Switch

📖 **Detailed Guide:** [docs/METAMASK_SETUP.md](./docs/METAMASK_SETUP.md)

---

## 🤝 Contributing

เรายินดีรับ contributions! 🎉

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

📖 **Contributing Guide:** [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📚 Documentation

- [Quick Start Guide](./QUICK_START.md) - เริ่มต้นใช้งานภายใน 5 นาที
- [QA Checklist](./QA_CHECKLIST.md) - คู่มือทดสอบระบบ
- [API Documentation](./docs/API.md) - API endpoints และ examples
- [MetaMask Setup](./docs/METAMASK_SETUP.md) - การตั้งค่า MetaMask
- [Contributing Guide](./CONTRIBUTING.md) - คู่มือสำหรับ contributors
- [Scripts README](./scripts/README.md) - คำอธิบาย utility scripts

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
./scripts/stop.sh
# Or kill manually
kill -9 $(lsof -t -i:8545)  # Hardhat
kill -9 $(lsof -t -i:3000)  # Server
```

### Connection Timeout

```bash
# Check services
ps aux | grep hardhat
ps aux | grep node

# Check logs
tail -f logs/hardhat.log
tail -f logs/server.log
```

### MetaMask Not Connecting

1. ตรวจสอบ Chain ID = 13390
2. ตรวจสอบ RPC URL = `https://rpc.meechain.run.place:5005`
3. Reset MetaMask account (Settings → Advanced → Reset Account)

---

## 🔧 Development

### Start Development Server

```bash
npm run dev  # (if configured)
# Or
npm start
```

### Deploy Smart Contracts

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

### Run Tests

```bash
npm test  # (if tests exist)
bash scripts/test-rpc.sh
```

---

## 📊 Tech Stack

### Frontend

- HTML5, CSS3, JavaScript (ES6+)
- Web3.js / Ethers.js
- MetaMask integration
- Server-Sent Events (SSE)

### Backend

- Node.js + Express
- OpenAI API (GPT-5-mini)
- Ethers.js
- CORS, dotenv

### Blockchain

- Hardhat
- Solidity
- OpenZeppelin Contracts
- ERC20, ERC721 standards

---

## 🌟 Features Roadmap

- [ ] Multi-language support (EN, TH, CN)
- [ ] Mobile app (React Native)
- [ ] Advanced NFT features (auctions, bundles)
- [ ] DAO governance
- [ ] Cross-chain bridge
- [ ] DeFi integrations (DEX, lending)
- [ ] Social features (profiles, following)
- [ ] Gamification (achievements, leaderboards)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Discord:** [Join our server](https://discord.gg/meechain)
- **GitHub Issues:** [Report a bug](https://github.com/MEECHAIN1/MeeChain-Connect/issues)
- **Email:** support@meechain.run.place
- **Website:** <https://meechain.run.place>

---

## 🙏 Acknowledgments

- OpenZeppelin for smart contract libraries
- Hardhat for development environment
- OpenAI for AI capabilities
- MetaMask for wallet integration
- All contributors and community members

---

## 🎉 Success!

ตอนนี้คุณพร้อมใช้งาน MeeChain แล้ว! 🚀

**Happy coding!** 💻✨

---

Made with ❤️ by MeeChain Team
