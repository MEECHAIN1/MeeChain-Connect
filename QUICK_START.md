# MeeChain Quick Start Guide 🚀

เริ่มต้นใช้งาน MeeChain ภายใน 5 นาที!

## ✅ Prerequisites

- Node.js >= 18.x
- npm หรือ yarn
- Git
- MetaMask (browser extension)

---

## 🎯 Quick Setup (3 Steps)

### 1️⃣ Clone & Install
```bash
git clone https://github.com/your-org/meechain.git
cd meechain
npm install
```

### 2️⃣ Configure Environment
```bash
cp .env.example .env
```

แก้ไข `.env` และเพิ่ม OpenAI API key:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3️⃣ Start Everything
```bash
# Linux/Mac
./scripts/start.sh

# Windows (Git Bash)
bash scripts/start.sh

# Manual (all platforms)
npx hardhat node &
npm start
```

---

## 🎉 You're Ready!

เปิดเบราว์เซอร์ไปที่:
- **Application:** http://localhost:3000
- **API Health:** http://localhost:3000/api/health

---

## 🦊 Connect MetaMask

### Quick Add Network
1. เปิด MetaMask
2. คลิก network dropdown
3. เลือก "Add Network"
4. กรอก:
   ```
   Network Name: MeeChain (Ritual Chain)
   RPC URL:      https://rpc.meechain.run.place:5005
   Chain ID:     13390
   Symbol:       MEE
   ```
5. Save & Switch

### Or Use Auto-Add Button
ใน application จะมีปุ่ม "Add MeeChain to MetaMask" ให้กดเพื่อเพิ่ม network อัตโนมัติ

---

## 🧪 Test Your Setup

### Test 1: RPC Connection
```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```
**Expected:** `{"jsonrpc":"2.0","id":1,"result":"0x344e"}`

### Test 2: Application Health
```bash
curl http://localhost:3000/api/health
```
**Expected:** `{"status":"ok","web3":true,...}`

### Test 3: Web3 Status
```bash
curl http://localhost:3000/api/web3/status
```
**Expected:** `{"connected":true,"chainId":13390,...}`

---

## 🎮 Try These Features

### 1. Chat with MeeBot AI
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"สวัสดี MeeBot!","sessionId":"test"}'
```

### 2. Check Token Info
```bash
curl http://localhost:3000/api/token/info
```

### 3. Check NFT Info
```bash
curl http://localhost:3000/api/nft/info
```

### 4. Generate NFT Description
```bash
curl -X POST http://localhost:3000/api/nft/describe \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cyber Dragon #001",
    "category": "art",
    "traits": "Legendary, Animated, Fire"
  }'
```

---

## 📚 Next Steps

### Learn More
- 📖 [Full Documentation](./README.md)
- 🧪 [QA Checklist](./QA_CHECKLIST.md)
- 🦊 [MetaMask Setup](./docs/METAMASK_SETUP.md)
- 🔌 [API Documentation](./docs/API.md)
- 🤝 [Contributing Guide](./CONTRIBUTING.md)

### Deploy Contracts
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

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Stop everything
./scripts/stop.sh

# Or kill manually
kill -9 $(lsof -t -i:8545)  # Hardhat
kill -9 $(lsof -t -i:3000)  # Server
```

### Connection Timeout
```bash
# Check if services are running
ps aux | grep hardhat
ps aux | grep node

# Check logs
tail -f logs/hardhat.log
tail -f logs/server.log
```

### MetaMask Not Connecting
1. ตรวจสอบว่า Chain ID = 13390
2. ตรวจสอบ RPC URL = `https://rpc.meechain.run.place:5005`
3. ลอง reset MetaMask account (Settings → Advanced → Reset Account)

---

## 💡 Pro Tips

1. **Use Git Bash on Windows** - สำหรับรัน shell scripts
2. **Check Logs** - ถ้ามีปัญหาให้ดู logs ใน `logs/` directory
3. **Test Locally First** - ทดสอบกับ local node ก่อนใช้ public RPC
4. **Backup Seed Phrase** - อย่าลืม backup MetaMask seed phrase
5. **Use Small Amounts** - ทดสอบด้วยจำนวนเงินน้อยๆ ก่อน

---

## 🎯 Common Use Cases

### Use Case 1: Mint NFT
1. เชื่อมต่อ MetaMask
2. ไปที่ "ตลาด NFT" → "สร้าง NFT"
3. อัปโหลดรูปภาพ
4. ตั้งชื่อและราคา
5. กด "Mint" และยืนยัน transaction

### Use Case 2: Stake MEE Tokens
1. เชื่อมต่อ MetaMask
2. ไปที่ "Staking"
3. เลือก pool (Standard/Premium/Ritual Chain)
4. ใส่จำนวน MEE ที่ต้องการ stake
5. กด "Stake" และยืนยัน transaction

### Use Case 3: Chat with AI
1. เปิด chat interface
2. พิมพ์คำถาม เช่น "สอนวิธีซื้อ NFT"
3. MeeBot จะตอบและแนะนำ
4. ถามต่อได้เรื่อยๆ

---

## 📞 Get Help

- **Discord:** [Join our server](https://discord.gg/meechain)
- **GitHub Issues:** [Report a bug](https://github.com/your-org/meechain/issues)
- **Email:** support@meechain.run.place
- **Documentation:** [Read the docs](./README.md)

---

## 🎉 Success!

ตอนนี้คุณพร้อมใช้งาน MeeChain แล้ว! 🚀

Happy coding! 💻✨
