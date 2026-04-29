# Frontend ↔ Functions API Mapping (Critical Path Plan)

อัปเดตจากไฟล์ frontend ที่ระบุ: `index.html`, `nft-market.html`, `explorer.html`, `dao.html`, `analytics.html` และ `src/js/*` แล้วเทียบกับ endpoint ที่มีจริงใน `functions/api/*`.

## 1) Endpoint ที่มีจริงใน `functions/api`

| Endpoint | Method | ไฟล์จริง |
|---|---|---|
| `/api/health` | GET | `functions/api/health.js` |
| `/api/network` | GET | `functions/api/network.js` |
| `/api/web3/status` | GET | `functions/api/web3/status.js` |
| `/api/nodecloud/stats` | GET | `functions/api/nodecloud/stats.js` |
| `/api/chat` | POST, OPTIONS | `functions/api/chat.js` |
| `/api/chat/stream` | POST, OPTIONS | `functions/api/chat/stream.js` |

> ปัจจุบันยังไม่มีไฟล์จริงสำหรับกลุ่ม `/api/analytics/*`, `/api/dao/*`, `/api/nft/*`, `/api/chain/*`, `/api/token/*`, `/api/auth/*`.

## 2) Mapping: Frontend เรียกอะไรบ้าง เทียบกับไฟล์ `functions/api`

Legend: ✅ มี endpoint file รองรับแล้ว, ❌ ยังไม่มี

| Source | Endpoint ที่ frontend เรียก | หมวด | First-load impact | สถานะ |
|---|---|---|---|---|
| `index.html` | *(ไม่พบ `fetch('/api/...')` โดยตรง)* | - | - | - |
| `analytics.html` | `/api/analytics/overview` | analytics | สูง (overview cards) | ❌ |
| `analytics.html` | `/api/analytics/tvl?days=...` | analytics | กลาง (chart) | ❌ |
| `analytics.html` | `/api/analytics/volume?days=...` | analytics | กลาง (chart) | ❌ |
| `analytics.html` | `/api/token/history?points=48` | token | กลาง (chart) | ❌ |
| `analytics.html` | `/api/analytics/users` | analytics | สูง (panel) | ❌ |
| `analytics.html` | `/api/analytics/transactions` | analytics | สูง (panel) | ❌ |
| `analytics.html` | `/api/analytics/gas` | analytics | กลาง | ❌ |
| `analytics.html` | `/api/analytics/leaderboard?type=...` | analytics | กลาง (list) | ❌ |
| `analytics.html` | `/api/analytics/events?limit=20` | analytics | สูง (events list) | ❌ |
| `analytics.html` | `/api/analytics/snapshot?...` | analytics | เสริม (batch hydrate) | ❌ |
| `dao.html` | `/api/auth/nonce?address=...` | auth | สูง (login flow) | ❌ |
| `dao.html` | `/api/auth/verify` | auth | สูง (login flow) | ❌ |
| `dao.html` | `/api/dao/proposals` | dao | สูง (first list) | ❌ |
| `dao.html` | `/api/dao/stats` | dao | สูง (stats cards) | ❌ |
| `dao.html` | `/api/dao/vote` | dao | action | ❌ |
| `dao.html` | `/api/dao/propose` | dao | action | ❌ |
| `nft-market.html` | `/api/nft/marketplace?page=...` | nft | สูง (first list) | ❌ |
| `nft-market.html` | `/api/nft/token/:tokenId` | nft | detail | ❌ |
| `nft-market.html` | `/api/nft/describe` | nft | action | ❌ |
| `nft-market.html` | `/api/nft/balance/:wallet` | nft | กลาง (my NFTs) | ❌ |
| `nft-market.html` | `/api/nft/info` | nft | สูง (summary) | ❌ |
| `explorer.html` | `/api/blocks?limit=...` | explorer | สูง (first list) | ❌ |
| `explorer.html` | `/api/chain/transactions` | chain | สูง (first list) | ❌ |
| `explorer.html` | `/api/blocks/:num` | explorer | detail | ❌ |
| `explorer.html` | `/api/tx/:hash` | explorer | detail | ❌ |
| `explorer.html` | `/api/address/:addr` | explorer | detail | ❌ |
| `explorer.html` | `/api/chain/stats` | chain | สูง (KPI) | ❌ |
| `src/js/app.js` | `/api/nft/mint` | nft | action | ❌ |
| `src/js/app.js` | `/api/web3/status` | chain/web3 | กลาง (status badge) | ✅ |
| `src/js/data.js` | `/api/token/price` | token | สูง (price widget) | ❌ |
| `src/js/staking.js` | `/api/network` | chain/network | สูง (init) | ✅ |
| `src/js/staking.js` | `/api/portal/info` | portal | กลาง | ❌ |
| `src/js/staking.js` | `/api/staking/user/:address` | staking | กลาง | ❌ |
| `src/js/wallet.js` | `/api/network` | chain/network | สูง (wallet init) | ✅ |
| `src/js/chat-widget.js` | `/api/chat/stream` | chat | กลาง | ✅ |
| `src/js/chat-widget.js` | `/api/chat` | chat | กลาง | ✅ |
| `src/js/chat-widget.js` | `/api/chat/:sessionId` (DELETE) | chat | กลาง | ❌ |
| `src/js/chat-widget.js` | `/api/health` | health | ต่ำ | ✅ |

## 3) ลำดับ implement ตาม critical path ที่กำหนด

เรียงตามกลุ่มที่ขอ: `/api/analytics/*` → `/api/dao/*` → `/api/nft/*` → `/api/chain/*` → `/api/token/*` → `/api/auth/*`

### A) `/api/analytics/*` (เริ่มก่อนสุด)
1. `GET /api/analytics/overview`  
2. `GET /api/analytics/users`  
3. `GET /api/analytics/transactions`  
4. `GET /api/analytics/events?limit=20`  
5. `GET /api/analytics/leaderboard?type=holders`  
6. `GET /api/analytics/tvl?days=7`  
7. `GET /api/analytics/volume?days=7`  
8. `GET /api/analytics/gas`  
9. `GET /api/analytics/snapshot?...` *(optional แต่ช่วยลดจำนวน request ตอน initial load)*

### B) `/api/dao/*`
1. `GET /api/dao/proposals`  
2. `GET /api/dao/stats`  
3. `POST /api/dao/vote`  
4. `POST /api/dao/propose`  

### C) `/api/nft/*`
1. `GET /api/nft/marketplace?page=1&limit=12&sort=latest`  
2. `GET /api/nft/info`  
3. `GET /api/nft/token/:tokenId`  
4. `GET /api/nft/balance/:wallet`  
5. `POST /api/nft/describe`  
6. `POST /api/nft/mint`  

### D) `/api/chain/*`
1. `GET /api/chain/stats`  
2. `GET /api/chain/transactions`  

### E) `/api/token/*`
1. `GET /api/token/price`  
2. `GET /api/token/history?points=48`  

### F) `/api/auth/*`
1. `GET /api/auth/nonce?address=...`  
2. `POST /api/auth/verify`  

## 4) ชุด endpoint ขั้นต่ำที่ควรทำเป็น stub ก่อน เพื่อ “หน้าแรกไม่พัง”

แนะนำทำ JSON stub ตามลำดับนี้ก่อน:

1. `/api/analytics/overview`
2. `/api/analytics/users`
3. `/api/analytics/transactions`
4. `/api/analytics/events`
5. `/api/analytics/leaderboard`
6. `/api/dao/proposals`
7. `/api/dao/stats`
8. `/api/nft/marketplace`
9. `/api/nft/info`
10. `/api/chain/stats`
11. `/api/chain/transactions`
12. `/api/token/price`

หลังจากนั้นค่อยต่อ action/detail endpoint (`vote`, `propose`, `mint`, `verify`, `token/:id`, `balance/:wallet`, `token/history`).
