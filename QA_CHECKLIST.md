# MeeChain RPC QA Checklist

## ✅ สถานะปัจจุบัน
MeeChain RPC ผ่าน Nginx (HTTPS) ตอบกลับได้แล้ว:
```json
{"jsonrpc":"2.0","id":1,"result":"0x344e"}
```
ซึ่ง `0x344e` = Chain ID 13390 ในรูปแบบ hex — แสดงว่า node ทำงานสมบูรณ์และ SSL proxy forward ได้ถูกต้อง ✅

---

## 🔍 ทำไมก่อนหน้านี้ถึง error?

### ❌ ตอนยิงด้วย `http://127.0.0.1:5005`
```bash
curl -X POST http://127.0.0.1:5005 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```
**ผลลัพธ์:** `400 The plain HTTP request was sent to HTTPS port`

**สาเหตุ:** Nginx ถูกตั้งค่าให้ใช้ SSL → เลยขึ้น error

---

### ✅ ตอนยิงด้วย `https://127.0.0.1:5005` พร้อม `--insecure`
```bash
curl -X POST https://127.0.0.1:5005 \
  -H "Content-Type: application/json" \
  --insecure \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```
**ผลลัพธ์:** สำเร็จทันที เพราะตรงกับการตั้งค่า SSL ของ proxy

---

## 🎯 ขั้นตอน QA (Contributor Friendly)

### 1️⃣ Start Infrastructure
```bash
./scripts/start.sh
```
หรือถ้าไม่มี script ให้รัน:
```bash
# Start local Ethereum node (Hardhat/Ganache)
npx hardhat node

# Start Nginx proxy (ถ้ามี)
sudo systemctl start nginx
# หรือ
nginx -c /path/to/nginx.conf
```

---

### 2️⃣ Verify Local Node (Direct Connection)
```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```
**✅ Expected:** `{"jsonrpc":"2.0","id":1,"result":"0x344e"}`

---

### 3️⃣ Verify Local Proxy (HTTPS via Nginx)
```bash
curl -X POST https://127.0.0.1:5005 \
  -H "Content-Type: application/json" \
  --insecure \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```
**✅ Expected:** `{"jsonrpc":"2.0","id":1,"result":"0x344e"}`

---

### 4️⃣ Verify External RPC (Public Domain)
```bash
curl -X POST https://rpc.meechain.run.place:5005 \
  -H "Content-Type: application/json" \
  --insecure \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```
**✅ Expected:** `{"jsonrpc":"2.0","id":1,"result":"0x344e"}`

---

### 5️⃣ Test Web3 Connection in Application
```bash
# Start the server
npm start

# Test health endpoint
curl http://localhost:3000/api/health

# Test web3 status
curl http://localhost:3000/api/web3/status
```
**✅ Expected:**
```json
{
  "connected": true,
  "blockNumber": 12345,
  "rpc": "https://rpc.meechain.run.place:5005",
  "chainId": 13390,
  "contracts": { ... }
}
```

---

### 6️⃣ Switch Wallet to MeeChain in Dashboard
1. เปิด MetaMask
2. คลิก "Add Network" หรือ "Switch Network"
3. กรอกข้อมูล:
   - **Network Name:** MeeChain (Ritual Chain)
   - **RPC URL:** `https://rpc.meechain.run.place:5005`
   - **Chain ID:** `13390`
   - **Currency Symbol:** `MEE`
   - **Block Explorer:** (optional)
4. คลิก "Save" และ "Switch Network"

---

### 7️⃣ Confirm NFT Contract Address
ตรวจสอบว่า contract address ใน `blockchain/contract/addresses.ts` ตรงกับที่ deploy จริง:
```typescript
export const CHAIN_ID = 13390;
export const MCT_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const MEEBOT_NFT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const PORTAL_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
```

---

## 📌 สรุป
ตอนนี้ RPC ของคุณ **live และ healthy** แล้ว 🎉

### Network Configuration
- **Chain ID:** 13390 (0x344e)
- **RPC URL:** https://rpc.meechain.run.place:5005
- **Local Node:** http://127.0.0.1:8545
- **SSL Proxy:** Nginx (port 5005)

### Next Steps
- [ ] Deploy contracts to mainnet (if not done)
- [ ] Update frontend to use new RPC URL
- [ ] Test wallet connection in browser
- [ ] Verify NFT minting works
- [ ] Test staking functionality
- [ ] Monitor RPC performance

---

## 🐛 Troubleshooting

### Problem: "Connection timeout"
**Solution:** ตรวจสอบว่า Nginx และ local node รันอยู่
```bash
# Check Nginx
sudo systemctl status nginx

# Check node
ps aux | grep hardhat
```

### Problem: "Invalid Chain ID"
**Solution:** ตรวจสอบว่า Chain ID ตรงกันทุกที่ (13390)

### Problem: "Contract not deployed"
**Solution:** Deploy contracts ใหม่
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

---

## 📚 Resources
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [MetaMask Documentation](https://docs.metamask.io/)
