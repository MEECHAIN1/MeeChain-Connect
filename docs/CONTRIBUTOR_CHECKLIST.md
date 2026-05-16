# 📝 Contributor Onboarding Checklist (Flow-based)

Checklist นี้ออกแบบให้ contributor ใหม่ทำตามได้แบบ step-by-step: **Connect Wallet → REST API Test → WebSocket Subscribe → Smart Contract Interaction → DAO Vote**.

## 1️⃣ Connect Wallet
- ติดตั้ง MetaMask หรือ Wallet ที่รองรับ EVM
- เพิ่ม MeeChain Network
  - RPC: `https://rpc.meechain.live/rpc`
  - Chain ID: `13390`
  - Symbol: `MEE`
  - Explorer: `https://explorer.meechain.live`
- ยืนยันว่า wallet เชื่อมต่อกับ dApp ได้

## 2️⃣ REST API Quick Test
ตรวจสอบว่า backend พร้อมใช้งานก่อนเริ่ม flow ถัดไป:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/analytics/snapshot
```

## 3️⃣ WebSocket Subscription
เชื่อมต่อและ subscribe channel ที่จำเป็น:

```bash
wscat -c ws://localhost:3000/ws
```

ส่งคำสั่ง subscribe:

```json
{"type":"subscribe","channels":["blocks","txs","price"]}
```

ตรวจสอบว่าได้รับ event ต่อไปนี้:
- `connected`
- `pong`
- `new_block`
- `new_tx`
- `price_update`

## 4️⃣ Smart Contract Interaction
ทดสอบ interaction หลักของระบบ:
- **Token:** `balanceOf`, `transfer`
- **NFT:** `mint`, `ownerOf`
- **Staking:** `stake`, `unstake`, `stakedBalance`
- **DAO:** `vote`, `proposalResult`

ตัวอย่างคำสั่ง:

```bash
cast call 0xTokenContract "balanceOf(address)(uint256)" 0xYourWallet
cast send 0xNFTContract "mint(address,uint256)" 0xYourWallet 1
cast send 0xStakingContract "stake(uint256)" 1000
cast send 0xDaoContract "vote(uint256,bool)" 1 true
```

## 5️⃣ Celebrate & Verify 🎉
- ตรวจสอบธุรกรรมใน Explorer
- ยืนยันว่า block/tx ถูก broadcast ผ่าน WebSocket
- แชร์ผลลัพธ์ใน contributor channel พร้อม badge overlay 🏅

---

## 🎯 สรุป
Checklist นี้ช่วยให้ contributor ใหม่ทำครบทุกขั้นตอนโดยไม่หลงทาง:
**เชื่อมต่อ Wallet → ทดสอบ API → Subscribe WS → เรียก Contract → Vote DAO**.
