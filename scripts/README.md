# MeeChain Scripts

Utility scripts สำหรับจัดการ MeeChain infrastructure

## 📜 Available Scripts

### 🚀 start.sh
เริ่มต้น MeeChain development environment

**Usage:**
```bash
# Linux/Mac
./scripts/start.sh

# Windows (Git Bash)
bash scripts/start.sh
```

**What it does:**
1. ✅ Check และเริ่ม Hardhat node (port 8545)
2. ✅ Test local node connection
3. ✅ Check Nginx SSL proxy (port 5005)
4. ✅ Start application server (port 3000)
5. ✅ Display summary และ logs location

**Output:**
```
🚀 Starting MeeChain Infrastructure...
📡 Checking Hardhat node (port 8545)...
✅ Hardhat node started (PID: 12345)
🔍 Testing local node connection...
✅ Local node responding (Chain ID: 13390)
🔒 Checking Nginx SSL proxy (port 5005)...
✅ Nginx SSL proxy working correctly
🌐 Starting application server...
✅ Application server started (PID: 12346)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 MeeChain Infrastructure Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 Local Node:      http://127.0.0.1:8545
🔒 Nginx Proxy:     https://127.0.0.1:5005
🌐 Application:     http://localhost:3000
🌍 Public RPC:      https://rpc.meechain.run.place:5005
```

---

### 🛑 stop.sh
หยุด MeeChain infrastructure

**Usage:**
```bash
# Linux/Mac
./scripts/stop.sh

# Windows (Git Bash)
bash scripts/stop.sh
```

**What it does:**
1. ✅ Stop Hardhat node
2. ✅ Stop application server
3. ✅ Clean up PID files

---

### 🧪 test-rpc.sh
ทดสอบ RPC endpoints ทั้งหมด

**Usage:**
```bash
# Linux/Mac
./scripts/test-rpc.sh

# Windows (Git Bash)
bash scripts/test-rpc.sh
```

**What it tests:**
1. ✅ Local Node (Direct) - `http://127.0.0.1:8545`
2. ✅ Local Proxy (HTTPS) - `https://127.0.0.1:5005`
3. ✅ Public RPC - `https://rpc.meechain.run.place:5005`
4. ✅ Application Health API - `http://localhost:3000/api/health`
5. ✅ Web3 Status API - `http://localhost:3000/api/web3/status`

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 MeeChain RPC Test Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Testing: Local Node (Direct)
URL: http://127.0.0.1:8545
✅ PASS - Chain ID: 13390 (0x344e)
Response: {"jsonrpc":"2.0","id":1,"result":"0x344e"}

Testing: Local Proxy (HTTPS)
URL: https://127.0.0.1:5005
✅ PASS - Chain ID: 13390 (0x344e)
Response: {"jsonrpc":"2.0","id":1,"result":"0x344e"}

...
```

---

## 🔧 Manual Commands

### Start Hardhat Node
```bash
npx hardhat node
```

### Start Application Server
```bash
npm start
```

### Test RPC Manually
```bash
# Test local node
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Test HTTPS proxy
curl -X POST https://127.0.0.1:5005 \
  -H "Content-Type: application/json" \
  --insecure \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Test public RPC
curl -X POST https://rpc.meechain.run.place:5005 \
  -H "Content-Type: application/json" \
  --insecure \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

---

## 📝 Notes

### Windows Users
- ใช้ Git Bash หรือ WSL เพื่อรัน shell scripts
- หรือรัน commands แบบ manual ใน PowerShell/CMD

### Port Conflicts
ถ้า port ถูกใช้งานอยู่แล้ว:
```bash
# Check what's using port 8545
lsof -i :8545  # Linux/Mac
netstat -ano | findstr :8545  # Windows

# Kill process
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows
```

### Logs Location
- Hardhat: `logs/hardhat.log`
- Server: `logs/server.log`

### PID Files
- Hardhat: `.hardhat.pid`
- Server: `.server.pid`

---

## 🐛 Troubleshooting

### "npx not found"
```bash
# Install Node.js first
# Download from: https://nodejs.org/
```

### "Port already in use"
```bash
# Stop existing processes
./scripts/stop.sh

# Or kill manually
kill -9 $(lsof -t -i:8545)  # Linux/Mac
```

### "Nginx not running"
```bash
# Start Nginx (optional for local dev)
sudo systemctl start nginx  # Linux
brew services start nginx   # Mac
```

### "Connection timeout"
```bash
# Check if services are running
ps aux | grep hardhat
ps aux | grep node

# Check logs
tail -f logs/hardhat.log
tail -f logs/server.log
```

---

## 📚 See Also

- [QA Checklist](../QA_CHECKLIST.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Main README](../README.md)
