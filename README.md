# MeeChain Dashboard

แดชบอร์ด Web Application สำหรับ MeeChain Blockchain Platform

## Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (เช่น `python3 -m http.server` หรือ `npx serve`)

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
Open your browser and navigate to `http://localhost:8000`

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
