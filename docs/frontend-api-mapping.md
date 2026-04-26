# Frontend ↔ Functions API Mapping (Gap Analysis + Critical Path)

สรุปจากไฟล์ frontend หลักที่ร้องขอ: `index.html`, `nft-market.html`, `explorer.html`, `dao.html`, `analytics.html` และ `src/js/*` เทียบกับไฟล์ที่มีจริงใน `functions/api`.

## 1) Functions API ที่มีจริงตอนนี้

จากโครงสร้างไฟล์ `functions/api` มี endpoint ที่ map ได้ดังนี้

| Endpoint | Method (ตามโค้ด) | ไฟล์ |
|---|---:|---|
| `/api/health` | GET | `functions/api/health.js` |
| `/api/network` | GET | `functions/api/network.js` |
| `/api/web3/status` | GET | `functions/api/web3/status.js` |
| `/api/nodecloud/stats` | GET | `functions/api/nodecloud/stats.js` |
| `/api/chat` | POST, OPTIONS | `functions/api/chat.js` |
| `/api/chat/stream` | POST, OPTIONS | `functions/api/chat/stream.js` |

---

## 2) Mapping endpoint ที่ frontend เรียก

> Legend: ✅ มีไฟล์จริงใน `functions/api`, ❌ ยังไม่มี

| Frontend Source | Endpoint ที่เรียก | กลุ่ม | จุดใช้งาน | สถานะใน `functions/api` | ไฟล์ที่รองรับ (ถ้ามี) |
|---|---|---|---|---|---|
| `src/js/wallet.js` | `/api/network` | chain/network | wallet init | ✅ | `functions/api/network.js` |
| `src/js/staking.js` | `/api/network` | chain/network | staking init | ✅ | `functions/api/network.js` |
| `src/js/staking.js` | `/api/portal/info` | portal | staking stats | ❌ | - |
| `src/js/staking.js` | `/api/staking/user/:address` | staking | staking user | ❌ | - |
| `src/js/data.js` | `/api/token/price` | token | live price widget | ❌ | - |
| `src/js/app.js` | `/api/nft/mint` | nft | NFT mint (dashboard) | ❌ | - |
| `src/js/app.js` | `/api/web3/status` | web3/chain | dashboard status badge | ✅ | `functions/api/web3/status.js` |
| `src/js/chat-widget.js` | `/api/chat/stream` | chat | chat stream | ✅ | `functions/api/chat/stream.js` |
| `src/js/chat-widget.js` | `/api/chat` | chat | chat completion | ✅ | `functions/api/chat.js` |
| `src/js/chat-widget.js` | `/api/chat/:sessionId` (DELETE) | chat | clear session | ❌ *(ยังไม่มี route ลบ session)* | - |
| `src/js/chat-widget.js` | `/api/health` | health | chat health check | ✅ | `functions/api/health.js` |
| `analytics.html` | `/api/analytics/overview` | analytics | **first load summary cards** | ❌ | - |
| `analytics.html` | `/api/analytics/tvl` | analytics | chart tvl | ❌ | - |
| `analytics.html` | `/api/analytics/volume` | analytics | chart volume | ❌ | - |
| `analytics.html` | `/api/token/history` | token | price chart | ❌ | - |
| `analytics.html` | `/api/analytics/users` | analytics | users panel | ❌ | - |
| `analytics.html` | `/api/analytics/transactions` | analytics | tx breakdown | ❌ | - |
| `analytics.html` | `/api/analytics/gas` | analytics | gas panel | ❌ | - |
| `analytics.html` | `/api/analytics/leaderboard` | analytics | leaderboard list | ❌ | - |
| `analytics.html` | `/api/analytics/events` | analytics | events feed list | ❌ | - |
| `dao.html` | `/api/auth/nonce` | auth | wallet auth step 1 | ❌ | - |
| `dao.html` | `/api/auth/verify` | auth | wallet auth step 2 | ❌ | - |
| `dao.html` | `/api/dao/proposals` | dao | **first load proposal list** | ❌ | - |
| `dao.html` | `/api/dao/stats` | dao | **first load stats** | ❌ | - |
| `dao.html` | `/api/dao/vote` | dao | vote action | ❌ | - |
| `dao.html` | `/api/dao/propose` | dao | create proposal action | ❌ | - |
| `explorer.html` | `/api/blocks` | explorer | first load block list | ❌ | - |
| `explorer.html` | `/api/chain/transactions` | chain | first load tx list | ❌ | - |
| `explorer.html` | `/api/blocks/:num` | explorer | block detail | ❌ | - |
| `explorer.html` | `/api/tx/:hash` | explorer | tx detail | ❌ | - |
| `explorer.html` | `/api/address/:addr` | explorer | address detail | ❌ | - |
| `explorer.html` | `/api/chain/stats` | chain | first load KPI | ❌ | - |
| `nft-market.html` | `/api/nft/marketplace` | nft | **first load marketplace list** | ❌ | - |
| `nft-market.html` | `/api/nft/token/:tokenId` | nft | token detail modal | ❌ | - |
| `nft-market.html` | `/api/nft/describe` | nft | AI describe action | ❌ | - |
| `nft-market.html` | `/api/nft/balance/:wallet` | nft | my NFTs list | ❌ | - |
| `nft-market.html` | `/api/nft/info` | nft | collection stats/info | ❌ | - |

> หมายเหตุ: `index.html` ไม่มีการเรียก `/api/*` โดยตรง (ส่วน API call หลักอยู่ใน `src/js/*`).

---

## 3) Implementation order ตาม critical path ที่ขอ

เรียงตามลำดับกลุ่ม: `/api/analytics/*` → `/api/dao/*` → `/api/nft/*` → `/api/chain/*` → `/api/token/*` → `/api/auth/*`

โดยในแต่ละกลุ่มให้ทำ endpoint ที่กระทบ “หน้าโหลดแรก” ก่อน (overview/stats/list):

### Phase A — `/api/analytics/*` (Critical สูงสุด)
1. `GET /api/analytics/overview` *(การ์ดสรุปหน้า Analytics)*
2. `GET /api/analytics/users` *(panel หลัก)*
3. `GET /api/analytics/transactions` *(panel หลัก)*
4. `GET /api/analytics/events?limit=20` *(feed list)*
5. `GET /api/analytics/leaderboard?type=holders` *(default leaderboard)*
6. `GET /api/analytics/tvl?days=7`
7. `GET /api/analytics/volume?days=7`
8. `GET /api/analytics/gas`

### Phase B — `/api/dao/*`
1. `GET /api/dao/proposals` *(proposal list หน้าแรก)*
2. `GET /api/dao/stats` *(stats cards หน้าแรก)*
3. `POST /api/dao/vote`
4. `POST /api/dao/propose`

### Phase C — `/api/nft/*`
1. `GET /api/nft/marketplace?page=1&limit=12&sort=latest` *(market list หน้าแรก)*
2. `GET /api/nft/info` *(summary widget หน้าแรก)*
3. `GET /api/nft/token/:tokenId` *(detail modal)*
4. `GET /api/nft/balance/:wallet` *(tab My NFTs)*
5. `POST /api/nft/describe` *(enhancement)*
6. `POST /api/nft/mint` *(dashboard mint flow)*

### Phase D — `/api/chain/*`
1. `GET /api/chain/stats` *(explorer KPI หน้าแรก)*
2. `GET /api/chain/transactions` *(explorer tx list หน้าแรก)*

### Phase E — `/api/token/*`
1. `GET /api/token/price` *(live price auto-refresh)*
2. `GET /api/token/history?points=48` *(analytics price chart)*

### Phase F — `/api/auth/*`
1. `GET /api/auth/nonce?address=...` *(auth bootstrap)*
2. `POST /api/auth/verify` *(auth completion)*

---

## 4) Suggested minimal stub set เพื่อให้ “หน้าไม่พัง” เร็วสุด

ถ้าต้องการแก้หน้าแตกทันทีด้วย effort ต่ำ ให้ทำเป็น stub JSON ก่อนตามลำดับนี้:

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

จากนั้นค่อยเติม endpoint เชิง action (`vote/propose/mint/verify`) และ detail (`token/:id`, `balance/:wallet`) เป็นลำดับถัดไป.
