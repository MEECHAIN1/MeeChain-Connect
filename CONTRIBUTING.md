# Contributing to MeeChain

ยินดีต้อนรับสู่ MeeChain! 🎉 เราขอขอบคุณที่คุณสนใจมีส่วนร่วมในโปรเจกต์นี้

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.x
- npm หรือ yarn
- Git

### Setup Development Environment

1. Clone repository:
```bash
git clone https://github.com/your-org/meechain.git
cd meechain
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Edit `.env` และกรอกค่าที่จำเป็น (อย่างน้อย `OPENAI_API_KEY`)

5. Start infrastructure:
```bash
# On Linux/Mac
./scripts/start.sh

# On Windows (Git Bash)
bash scripts/start.sh

# Manual start (all platforms)
npx hardhat node &
npm start
```

---

## 🧪 Testing

### Run QA Checklist
ดูรายละเอียดใน [QA_CHECKLIST.md](./QA_CHECKLIST.md)

### Quick Test
```bash
# Test RPC endpoints
bash scripts/test-rpc.sh

# Test application
curl http://localhost:3000/api/health
curl http://localhost:3000/api/web3/status
```

---

## 📋 Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes
- เขียนโค้ดตาม coding standards
- เพิ่ม comments ภาษาไทยหรืออังกฤษ
- Test ให้แน่ใจว่าทำงานได้

### 3. Test Your Changes
```bash
# Test RPC connection
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Test application
npm test  # (if tests exist)
```

### 4. Commit Changes
```bash
git add .
git commit -m "feat: add new feature"
# or
git commit -m "fix: resolve bug in RPC connection"
```

**Commit Message Format:**
- `feat:` - new feature
- `fix:` - bug fix
- `docs:` - documentation changes
- `style:` - formatting, missing semicolons, etc.
- `refactor:` - code refactoring
- `test:` - adding tests
- `chore:` - maintenance tasks

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
```
จากนั้นสร้าง Pull Request บน GitHub

---

## 🏗️ Project Structure

```
MeeChain-Connect/
├── blockchain/              # Smart contracts & deployment
│   ├── abi/                # Contract ABIs
│   ├── contract/           # Contract addresses
│   └── artifacts/          # Compiled contracts
├── src/
│   ├── web3/               # Web3 integration
│   │   └── contracts.js    # Contract interaction layer
│   └── js/                 # Frontend JavaScript
├── scripts/                # Utility scripts
│   ├── start.sh           # Start infrastructure
│   ├── stop.sh            # Stop infrastructure
│   └── test-rpc.sh        # Test RPC endpoints
├── server.js              # Main application server
├── QA_CHECKLIST.md        # QA testing guide
└── .env.example           # Environment template
```

---

## 🔧 Common Tasks

### Deploy Smart Contracts
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

### Update Contract Addresses
หลัง deploy แล้ว อัปเดตที่ `blockchain/contract/addresses.ts`

### Add New RPC Endpoint
1. แก้ไข `server.js` → `RPC_CONFIG`
2. อัปเดต `.env.example`
3. Test ด้วย `scripts/test-rpc.sh`

### Add New API Endpoint
1. เพิ่ม route ใน `server.js`
2. เพิ่ม method ใน `src/web3/contracts.js` (ถ้าจำเป็น)
3. Test ด้วย `curl` หรือ Postman

---

## 📝 Coding Standards

### JavaScript/TypeScript
- ใช้ ES6+ syntax
- ใช้ `const` และ `let` แทน `var`
- เพิ่ม JSDoc comments สำหรับ functions
- ใช้ async/await แทน callbacks

### Smart Contracts (Solidity)
- ตั้งชื่อ contract ด้วย PascalCase
- ตั้งชื่อ function ด้วย camelCase
- เพิ่ม NatSpec comments
- ใช้ OpenZeppelin libraries เมื่อเป็นไปได้

### Git
- Branch names: `feature/`, `fix/`, `docs/`, `refactor/`
- Commit messages: ใช้ conventional commits
- PR titles: ชัดเจนและสื่อความหมาย

---

## 🐛 Reporting Bugs

พบ bug? สร้าง issue บน GitHub พร้อมข้อมูล:
- **Description:** อธิบาย bug
- **Steps to Reproduce:** ขั้นตอนทำซ้ำ
- **Expected Behavior:** ผลลัพธ์ที่คาดหวัง
- **Actual Behavior:** ผลลัพธ์ที่เกิดขึ้นจริง
- **Environment:** OS, Node version, etc.
- **Logs:** Error messages หรือ logs

---

## 💡 Feature Requests

มีไอเดียใหม่? สร้าง issue พร้อม:
- **Description:** อธิบาย feature
- **Use Case:** ใช้งานอย่างไร
- **Benefits:** ประโยชน์ที่ได้รับ
- **Alternatives:** ทางเลือกอื่นที่พิจารณาแล้ว

---

## 📚 Resources

### Documentation
- [Hardhat Docs](https://hardhat.org/docs)
- [Ethers.js Docs](https://docs.ethers.org/)
- [OpenZeppelin Docs](https://docs.openzeppelin.com/)
- [MetaMask Docs](https://docs.metamask.io/)

### MeeChain Specific
- [QA Checklist](./QA_CHECKLIST.md)
- [API Documentation](./docs/API.md) (if exists)
- [Smart Contract Docs](./blockchain/README.md) (if exists)

---

## 🤝 Code Review Process

1. **Submit PR** - สร้าง Pull Request พร้อม description ชัดเจน
2. **Automated Checks** - CI/CD จะรัน tests อัตโนมัติ
3. **Code Review** - Maintainers จะ review code
4. **Address Feedback** - แก้ไขตาม comments
5. **Merge** - เมื่อ approved แล้วจะ merge เข้า main branch

---

## 📞 Getting Help

- **Discord:** [Join our server](https://discord.gg/meechain)
- **GitHub Issues:** [Create an issue](https://github.com/your-org/meechain/issues)
- **Email:** support@meechain.run.place

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

## 🙏 Thank You!

ขอบคุณที่มีส่วนร่วมทำให้ MeeChain ดีขึ้น! 🚀
