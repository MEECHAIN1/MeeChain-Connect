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
Open your browser and navigate to `http://localhost:8000`.

## Deployment Options
MeeChain contributors สามารถ deploy Cloudflare Tunnel ได้สองวิธีหลัก:

### 🗂️ Deploy ผ่าน Project Scripts
เหมาะกับ: Contributor ที่ทำงานบนเครื่องหลัก (PC/Server/CI/CD)

**Flow**
1. Clone project และเข้าไปใน repo.
2. รันสคริปต์ในโปรเจกต์ เช่น:
   ```bash
   bash scripts/podman-setup.sh
   # หากทีมมีไฟล์ตรวจ RPC ใน environment นั้น
   bash scripts/rpc-check.sh
   ```
3. สคริปต์จะช่วยจัดการ install, config, health check และ fallback อัตโนมัติ.
4. ผลลัพธ์ reproducible ทำให้ contributor ทุกคนได้ flow เดียวกัน.

**ข้อดี**
- Automation สูง ลด human error
- ใช้ได้กับ CI/CD pipeline
- Milestone ใน onboarding ชัดเจนและทำซ้ำได้

### 📱 Deploy ผ่าน Termux (Mobile)
เหมาะกับ: Contributor ที่ต้องการความยืดหยุ่นและ portable environment

**Flow**
1. เปิด Termux และติดตั้ง `cloudflared` + dependencies.
2. รันคำสั่งตรง ๆ:
   ```bash
   cloudflared tunnel run 66b8d43c-39f8-4ee1-97db-13cb718825cd
   ```
3. Connector ID จะถูกสร้างใหม่ทุกครั้ง แต่ผูกกับ Tunnel ID เดียวกัน.
4. ใช้ `rpc-check.sh` ได้เช่นกัน ถ้านำสคริปต์เข้า Termux.
5. ดู log edge connections (เช่น `sin07`, `bkk04`, `sin11`) เพื่อยืนยันว่า tunnel active.

**ข้อดี**
- Portable ใช้ได้แม้ไม่มีเครื่องหลัก
- เหมาะกับ contributor ที่ onboard ผ่านมือถือ
- Tunnel ทำงานได้จริงแม้มี warning บางประเภท (เช่น `ping_group_range` หรือ origin lookup)

### 🎉 Contributor Milestone
- **Project Scripts** → Automation, reproducible, CI/CD ready
- **Termux** → Portable, flexible, mobile onboarding

ทั้งสองวิธีถือว่า valid และสามารถใช้ร่วมกันได้ตามสถานการณ์.

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
