# MeeChain Dashboard

[![🚀 Deploy MeeChain to Cloudflare Pages (meechain)](https://github.com/MEECHAIN1/MeeChain-Connect/actions/workflows/deploy.yml/badge.svg)](https://github.com/MEECHAIN1/MeeChain-Connect/actions/workflows/deploy.yml)

แดชบอร์ด Web Application สำหรับ MeeChain Blockchain Platform

## Prerequisites
 - Modern web browser (Chrome, Firefox, Safari, Edge)
 - Local web server (e.g., `python3 -m http.server` or `npx serve`)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (เช่น `python3 -m http.server` หรือ `npx serve`)
- Local web server (e.g., `python3 -m http.server` or `npx serve`)

## Installation
```bash
# Clone the repository
git clone https://github.com/MEECHAIN1/MeeChain-Connect.git
cd MeeChain-Connect

# Start local server
python3 -m http.server 8000
# OR
npx serve
```

## Usage
Open your browser and navigate to `http://localhost:8000`.

## RPC Ritual Health Check

This section documents how contributors can verify the health of MeeChain RPC endpoints using `scripts/rpc-check.sh`.

### Overview
The script performs a complete health check across DNS resolution, JSON-RPC method calls, and latency measurement. It supports multiple resolvers and fallback RPC endpoints for reproducible checks.

### Usage
```bash
bash scripts/rpc-check.sh
```

The script runs these checks:
- **DNS Check** — Query the RPC host against multiple public resolvers (default: Cloudflare `1.1.1.1`, Google `8.8.8.8`).
- **RPC Method Check** — Call `eth_chainId` and `eth_blockNumber` to validate JSON-RPC responses.
- **Latency Measurement** — Measure response time for each endpoint.
- **Summary** — Print consolidated results with ritual overlay badges.

### Ritual Overlay
| Step | Action | Ritual Overlay |
|---|---|---|
| DNS Check | Query via multiple resolvers | 🔍 Resolve or Fail |
| RPC Method | Call `eth_chainId` / `eth_blockNumber` | ⛓️ Chain Linked |
| Latency Measure | Curl timing output | ⏱️ Pulse Measured |
| Summary | Print consolidated status | 🎉 Badge Claimed |

### Example Output
```text
🔍 DNS check for rpc.meechain.live
⛓️ RPC check for https://rpc.meechain.live
⏱️ Latency test for https://rpc.meechain.live
-----------------------------------
✅ RPC health check completed
```

### Contributor Milestone
Passing all checks earns the contributor the **RPC Ready Badge** as part of the ritualized onboarding flow.

## Project Structure
```
├── index.html          # Main dashboard page
├── explorer.html       # Mee Ritual Chain Explorer
├── dao.html            # Governance / DAO dashboard
├── analytics.html      # Analytics dashboard
├── nft-market.html     # NFT Marketplace
├── scripts/
│   ├── start.sh        # Service start helper
│   ├── stop.sh         # Service stop helper
│   └── rpc-check.sh    # RPC ritual health check
├── src/
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript files
│   └── assets/         # Images and resources
├── contracts/          # Smart contracts
├── functions/          # Serverless API functions
└── test/               # Test files
```
## Project Structure
```text
├── index.html          # Main dashboard page
├── nft-market.html     # NFT Marketplace
├── block-explorer.html # Mee Ritual Chain Explorer
├── staking.html        # Staking & Mining
├── wallet.html         # Wallet Management
├── meebot.html         # MeeBot NFT Collection
├── settings.html       # Settings page
├── css/                # Stylesheets
├── js/                 # JavaScript files
└── assets/             # Images and resources
```

## Deployment Options
MeeChain contributors สามารถ deploy Cloudflare Tunnel ได้สองวิธีหลัก:

### 🗂️ Deploy ผ่าน Project Scripts
เหมาะกับ: Contributor ที่ทำงานบนเครื่องหลัก (PC/Server/CI/CD)

#### Flow
1. Clone project แล้วเข้าไปใน repo.
2. รันสคริปต์ เช่น:
   ```bash
   bash scripts/podman-setup.sh
   bash scripts/rpc-check.sh
   ```
3. สคริปต์จะจัดการ install, config, health check และ fallback อัตโนมัติ.
4. ผลลัพธ์ reproducible ทำให้ contributor ทุกคนได้ flow เดียวกัน.

#### ข้อดี
- Automation สูง ลด human error
- ใช้ได้กับ CI/CD pipeline
- Ritualized milestone ชัดเจน

### 📱 Deploy ผ่าน Termux (Mobile)
เหมาะกับ: Contributor ที่ต้องการความยืดหยุ่นและ portable environment

#### Flow
1. เปิด Termux แล้วติดตั้ง `cloudflared` และ dependencies.
2. รันคำสั่งตรง ๆ:
   ```bash
   cloudflared tunnel run 66b8d43c-39f8-4ee1-97db-13cb718825cd
   ```
3. Connector ID จะถูกสร้างใหม่ทุกครั้ง แต่ผูกกับ Tunnel ID เดียวกัน.
4. ใช้ `scripts/rpc-check.sh` ได้เช่นกัน ถ้า copy script เข้า Termux.

#### ข้อดี
- Portable ใช้ได้แม้ไม่มีเครื่องหลัก
- เหมาะกับ contributor ที่ onboard ผ่านมือถือ
- Tunnel ทำงานจริงแม้มี warning (เช่น `ping_group_range`, `origin lookup`)

### 🎉 Contributor Milestone
- Project Scripts → Automation, reproducible, CI/CD ready
- Termux → Portable, flexible, mobile onboarding

ทั้งสองวิธีถือว่า valid และสามารถใช้ร่วมกันได้ตามสถานการณ์.
