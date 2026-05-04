# Frontend ↔ Functions API Mapping (Critical Path Plan)

อัปเดตจากไฟล์ frontend ที่ระบุ: `index.html`, `nft-market.html`, `explorer.html`, `dao.html`, `analytics.html` และ `src/js/*` แล้วเทียบกับ endpoint ที่มีจริงใน `functions/api/*`.

## 1) Endpoint ที่มีจริงใน `functions/api`

| Endpoint | Method | ไฟล์จริง |
# Frontend ↔ Functions API Mapping (Critical-Path Plan)

อัปเดต mapping จากไฟล์ที่ผู้ใช้ระบุ: `index.html`, `nft-market.html`, `explorer.html`, `dao.html`, `analytics.html` และ `src/js/*` โดยเทียบกับไฟล์ endpoint ที่มีจริงใน `functions/api`.

## 1) Functions API ที่มีจริงใน repo ตอนนี้

| Endpoint | Method | File |
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
> สรุป: กลุ่มที่ต้องเร่งทำตามคำขอ (`/api/analytics/*`, `/api/dao/*`, `/api/nft/*`, `/api/chain/*`, `/api/token/*`, `/api/auth/*`) **ยังไม่มีไฟล์จริง** ใน `functions/api` ณ ตอนนี้.

---

## 2) Mapping endpoint ที่ frontend เรียก เทียบกับ `functions/api`

Legend: ✅ มีใน `functions/api`, ❌ ยังไม่มี

| Frontend Source | Endpoint ที่เรียก | Group | หน้า/ฟังก์ชัน | มีใน `functions/api` |
|---|---|---|---|---|
| `src/js/wallet.js` | `/api/network` | chain/network | wallet init | ✅ |
| `src/js/staking.js` | `/api/network` | chain/network | staking init | ✅ |
| `src/js/staking.js` | `/api/portal/info` | portal | staking summary | ❌ |
| `src/js/staking.js` | `/api/staking/user/:address` | staking | staking user data | ❌ |
| `src/js/data.js` | `/api/token/price` | token | live price widget | ❌ |
| `src/js/app.js` | `/api/nft/mint` | nft | mint action | ❌ |
| `src/js/app.js` | `/api/web3/status` | chain/web3 | status badge | ✅ |
| `src/js/chat-widget.js` | `/api/chat/stream` | chat | stream chat | ✅ |
| `src/js/chat-widget.js` | `/api/chat` | chat | non-stream chat | ✅ |
| `src/js/chat-widget.js` | `/api/chat/:sessionId` (DELETE) | chat | clear session | ❌ |
| `src/js/chat-widget.js` | `/api/health` | health | health check | ✅ |
| `analytics.html` | `/api/analytics/overview` | analytics | **first-load overview cards** | ❌ |
| `analytics.html` | `/api/analytics/tvl` | analytics | tvl chart | ❌ |
| `analytics.html` | `/api/analytics/volume` | analytics | volume chart | ❌ |
| `analytics.html` | `/api/token/history` | token | price chart | ❌ |
| `analytics.html` | `/api/analytics/users` | analytics | users panel | ❌ |
| `analytics.html` | `/api/analytics/transactions` | analytics | tx panel | ❌ |
| `analytics.html` | `/api/analytics/gas` | analytics | gas panel | ❌ |
| `analytics.html` | `/api/analytics/leaderboard` | analytics | leaderboard | ❌ |
| `analytics.html` | `/api/analytics/events` | analytics | events list | ❌ |
| `analytics.html` | `/api/analytics/snapshot` | analytics | hydrate all analytics widgets | ❌ |
| `dao.html` | `/api/auth/nonce` | auth | sign-in step 1 | ❌ |
| `dao.html` | `/api/auth/verify` | auth | sign-in step 2 | ❌ |
| `dao.html` | `/api/dao/proposals` | dao | **first-load proposal list** | ❌ |
| `dao.html` | `/api/dao/stats` | dao | **first-load stats cards** | ❌ |
| `dao.html` | `/api/dao/vote` | dao | vote action | ❌ |
| `dao.html` | `/api/dao/propose` | dao | propose action | ❌ |
| `explorer.html` | `/api/blocks` | explorer | block list | ❌ |
| `explorer.html` | `/api/chain/transactions` | chain | **first-load tx list** | ❌ |
| `explorer.html` | `/api/blocks/:num` | explorer | block detail | ❌ |
| `explorer.html` | `/api/tx/:hash` | explorer | tx detail | ❌ |
| `explorer.html` | `/api/address/:addr` | explorer | address detail | ❌ |
| `explorer.html` | `/api/chain/stats` | chain | **first-load KPI cards** | ❌ |
| `nft-market.html` | `/api/nft/marketplace` | nft | **first-load marketplace list** | ❌ |
| `nft-market.html` | `/api/nft/info` | nft | **first-load collection stats** | ❌ |
| `nft-market.html` | `/api/nft/token/:tokenId` | nft | token detail modal | ❌ |
| `nft-market.html` | `/api/nft/describe` | nft | AI description action | ❌ |
| `nft-market.html` | `/api/nft/balance/:wallet` | nft | my NFTs list | ❌ |

> หมายเหตุ: `index.html` ไม่พบการเรียก `/api/*` โดยตรง.

---

## 3) ลำดับ implement ตาม critical path ที่ขอ

ลำดับกลุ่ม: `/api/analytics/*` → `/api/dao/*` → `/api/nft/*` → `/api/chain/*` → `/api/token/*` → `/api/auth/*`

### Phase 1 — `/api/analytics/*` (กันหน้า Analytics พังก่อน)
1. `GET /api/analytics/overview` *(overview cards)*
2. `GET /api/analytics/users` *(panel สำคัญ)*
3. `GET /api/analytics/transactions` *(panel สำคัญ)*
4. `GET /api/analytics/events?limit=20` *(list component)*
5. `GET /api/analytics/leaderboard?type=holders` *(default list)*
6. `GET /api/analytics/tvl?days=7`
7. `GET /api/analytics/volume?days=7`
8. `GET /api/analytics/gas`
9. `GET /api/analytics/snapshot?...` *(aggregate endpoint เพื่อลด N+1 fetch)*

### Phase 2 — `/api/dao/*`
1. `GET /api/dao/proposals` *(first-load list)*
2. `GET /api/dao/stats` *(first-load stats)*
3. `POST /api/dao/vote`
4. `POST /api/dao/propose`

### Phase 3 — `/api/nft/*`
1. `GET /api/nft/marketplace?page=1&limit=12&sort=latest` *(first-load list)*
2. `GET /api/nft/info` *(first-load stats)*
3. `GET /api/nft/token/:tokenId`
4. `GET /api/nft/balance/:wallet`
5. `POST /api/nft/describe`
6. `POST /api/nft/mint`

### Phase 4 — `/api/chain/*`
1. `GET /api/chain/stats` *(explorer first-load KPI)*
2. `GET /api/chain/transactions` *(explorer first-load tx list)*

### Phase 5 — `/api/token/*`
1. `GET /api/token/price` *(live price widget)*
2. `GET /api/token/history?points=48` *(analytics chart)*

### Phase 6 — `/api/auth/*`
1. `GET /api/auth/nonce?address=...`
2. `POST /api/auth/verify`

---

## 4) Minimal stub set (ให้หน้าโหลดแรกไม่พังเร็วสุด)

แนะนำสร้าง stub JSON ที่ response shape ตรงกับ UI ก่อน โดยเรียงดังนี้:

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
จากนั้นค่อยตามด้วย endpoint ฝั่ง action/auth/detail (`vote`, `propose`, `mint`, `nonce`, `verify`, `token/:id`, `balance/:wallet`).
