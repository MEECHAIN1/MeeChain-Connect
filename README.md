# MeeChain Dashboard

แดชบอร์ด Web Application สำหรับ MeeChain Blockchain Platform

## Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
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
Open your browser and navigate to `http://localhost:8000`

## Project Structure
```
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
1. Clone project → เข้าไปใน repo
2. รันสคริปต์ เช่น:
   ```bash
   bash scripts/podman-setup.sh
   bash scripts/rpc-check.sh
   ```
3. สคริปต์จะจัดการ install, config, health check, และ fallback อัตโนมัติ
4. ผลลัพธ์ reproducible → contributor ทุกคนได้ flow เดียวกัน

#### ข้อดี
- Automation สูง ลด human error
- ใช้ได้กับ CI/CD pipeline
- Ritualized milestone ชัดเจน

### 📱 Deploy ผ่าน Termux (Mobile)
เหมาะกับ: Contributor ที่ต้องการความยืดหยุ่น, portable environment

#### Flow
1. เปิด Termux → ติดตั้ง cloudflared และ dependencies
2. รันคำสั่งตรง ๆ:
   ```bash
   cloudflared tunnel run 66b8d43c-39f8-4ee1-97db-13cb718825cd
   ```
3. Connector ID จะถูกสร้างใหม่ทุกครั้ง แต่ผูกกับ Tunnel ID เดียวกัน
4. Log แสดง edge connections (เช่น `sin07`, `bkk04`, `sn11`) เมื่อ tunnel active
5. ใช้ `scripts/rpc-check.sh` ได้เช่นกันถ้า copy เข้า Termux

#### ข้อดี
- Portable ใช้ได้แม้ไม่มีเครื่องหลัก
- เหมาะกับ contributor ที่ onboard ผ่านมือถือ
- Tunnel ทำงานจริงแม้มี warning (เช่น `ping_group_range`, `origin lookup`)

### 🎉 Contributor Milestone
- Project Scripts → Automation, reproducible, CI/CD ready
- Termux → Portable, flexible, mobile onboarding

ทั้งสองวิธีถือว่า valid และสามารถใช้ร่วมกันได้ตามสถานการณ์
