# 🟡 BSC (Binance Smart Chain) Configuration

## Network Information

### BSC Mainnet
- **Chain ID:** 56 (0x38)
- **Network Name:** BNB Smart Chain Mainnet
- **Currency:** BNB
- **RPC URL:** https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9
- **WebSocket:** wss://bsc-mainnet.nodereal.io/ws/v1/b08e185f1d8041d2b035dc0f4c747dd9
- **Explorer:** https://bscscan.com

### BSC Testnet
- **Chain ID:** 97 (0x61)
- **Network Name:** BNB Smart Chain Testnet
- **Currency:** tBNB
- **RPC URL:** https://bsc-testnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9
- **Explorer:** https://testnet.bscscan.com

---

## Contract Addresses

### MCB Token
- **Mainnet:** `0x8da6eb1cd5c0c8cf84bd522ab7c11747db1128c9`
- **Testnet:** `0x45b6c114287f465597262d7981c4d29914a2a579`

---

## MetaMask Setup

### เพิ่ม BSC Mainnet ใน MetaMask:

1. เปิด MetaMask
2. คลิก Network dropdown
3. คลิก "Add Network"
4. กรอกข้อมูล:
   ```
   Network Name: BNB Smart Chain
   RPC URL: https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9
   Chain ID: 56
   Currency Symbol: BNB
   Block Explorer: https://bscscan.com
   ```
5. คลิก "Save"

---

## ทดสอบ RPC Connection

### ใช้ curl:
```bash
curl -X POST https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### ใช้ Python:
```python
import requests

url = "https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9"
payload = {
    "id": 1,
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": []
}
headers = {
    "accept": "application/json",
    "content-type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
print(response.text)
```

### ใช้ JavaScript:
```javascript
const response = await fetch('https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_blockNumber',
    params: [],
    id: 1
  })
});
const data = await response.json();
console.log(data);
```

---

## ข้อดีของการใช้ BSC

✅ **RPC ทำงานได้จริง** - ไม่ต้องรัน local node  
✅ **Block Explorer** - ดูธุรกรรมได้ที่ bscscan.com  
✅ **Testnet ฟรี** - ทดสอบได้โดยไม่เสียเงิน  
✅ **ความเร็วสูง** - Block time ~3 วินาที  
✅ **Gas fee ต่ำ** - ถูกกว่า Ethereum มาก  
✅ **Ecosystem ใหญ่** - มี DeFi, NFT, DEX มากมาย

---

## การรับ Testnet BNB

1. ไปที่: https://testnet.bnbchain.org/faucet-smart
2. เชื่อมต่อ wallet
3. กรอก address
4. รับ 0.5 tBNB ฟรี

---

## ขั้นตอนการใช้งาน

### 1. Restart Server
```bash
# Stop current server (Ctrl+C)
node server.js
```

### 2. เปิดเบราว์เซอร์
```
http://localhost:3000
```

### 3. เชื่อมต่อ MetaMask
- คลิก "เชื่อมต่อกระเป๋าเงิน"
- เลือก MetaMask
- MetaMask จะขอให้เพิ่ม/สลับไปยัง BSC Mainnet
- ยืนยันการเชื่อมต่อ

### 4. ตรวจสอบ
- ดู Chain ID: 56
- ดู Currency: BNB
- ดู Balance ของคุณ

---

## Troubleshooting

### ถ้า RPC ไม่ทำงาน:
1. ตรวจสอบ API key ใน .env
2. ลองใช้ public RPC:
   ```
   https://bsc-dataseed.binance.org/
   https://bsc-dataseed1.defibit.io/
   https://bsc-dataseed1.ninicoin.io/
   ```

### ถ้า MetaMask ไม่สลับ network:
1. เพิ่ม BSC network manually
2. สลับ network ใน MetaMask dropdown
3. Refresh หน้าเว็บ

---

## สลับกลับไปใช้ MeeChain

แก้ไข `.env`:
```env
DRPC_RPC_URL=http://127.0.0.1:8545
VITE_RPC_URL=http://127.0.0.1:8545
CHAIN_ID=13390
```

แก้ไข `src/js/wallet-integration.js`:
```javascript
const targetChainId = 13390; // MeeChain
chainId: '0x344e', // 13390 in hex
chainName: 'MeeChain (Ritual Chain)',
```

---

**พร้อมใช้งาน BSC แล้วครับ!** 🚀
