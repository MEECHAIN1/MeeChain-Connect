# 📋 Contributor Checklist: Wallet & RPC Onboarding

## 1) Preflight Health Check
- Endpoint: `GET /rpc/health`
- Payload: ใช้โครงสร้างเดียวกับ `/health` และเพิ่ม `mode` + `rpcState`
- Purpose: ให้ Wallet/MetaMask ตรวจ local proxy ก่อนเชื่อมต่อ
- ✅ ต้องได้ response JSON ที่ถูกต้อง

## 2) MetaMask Connection Flow
- Function: `ensureMeeChainNetwork()`
- รองรับ error code `4200` แบบ explicit
- Fallback: `wallet_addEthereumChain`
- มีข้อความแนะนำเมื่อ wallet ไม่รองรับ switch chain อัตโนมัติ

## 3) RPC Proxy Default
- `wallet.js` ใช้ `rpcUrls[0] = location.origin + '/rpc'`
- `server.js` (`/api/network`) ส่ง local proxy เป็น RPC URL ลำดับแรกเสมอ
- README ระบุชัดว่า contributors ต้องใช้ local proxy `/rpc` เป็น default

## 4) Celebration Overlay
- Overlay หลังเชื่อมต่อสำเร็จ:
  - MetaMask: `✅ RPC Connected → 🎉 Badge Claimed`
  - Demo Wallet: `✅ RPC Connected → 🎉 Badge Claimed`
- มี style overlay เพื่อ visual feedback ชัดเจน

## 5) External RPC Status
- ตรวจทั้ง public + origin DNS:
  - `https://rpc.meechain.live/rpc`
  - `https://origin-rpc.meechain.live/rpc`
  (ต้องเช็คทั้ง GET และ POST JSON-RPC)
- สถานะล่าสุด (April 27, 2026): GET/POST ตอบ `502` (error code: 502)
- สรุป: endpoint ภายนอกยังไม่พร้อมสำหรับ wallet client จนกว่า POST จะตอบ JSON-RPC ปกติ
- Contributors ต้องใช้ local proxy `/rpc` เป็น default

## 6) Testing Checklist
- ✅ `node --check server.js`
- ✅ `node --check src/js/wallet.js`
- ✅ `bash -n scripts/test-rpc.sh`
- ✅ `npm run test:rpc:integration`
- ⚠️ `node server.js` (หากไม่ตั้ง `OPENAI_API_KEY` จะรันไม่ขึ้น)
- ✅ `npm run verify:rpc:matrix`

---

## 🎯 Key Takeaways
- ใช้ local proxy `/rpc` เป็น default เสมอ
- เช็ค `/rpc/health` ก่อน add/switch network
- รองรับ code `4200` พร้อม fallback และคำแนะนำ
- Celebration overlay = ritualized feedback สำหรับ contributors
- External RPC ยังไม่เสถียร จึงไม่ควรเป็น default
