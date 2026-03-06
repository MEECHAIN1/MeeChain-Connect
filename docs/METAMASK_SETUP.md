# MetaMask Setup Guide for MeeChain

คู่มือการตั้งค่า MetaMask เพื่อเชื่อมต่อกับ MeeChain (Ritual Chain)

## 📋 Network Information

| Field | Value |
|-------|-------|
| Network Name | MeeChain (Ritual Chain) |
| RPC URL | `https://rpc.meechain.run.place:5005` |
| Chain ID | `13390` (hex: `0x344e`) |
| Currency Symbol | `MEE` |
| Block Explorer | (optional) |

---

## 🦊 Manual Setup

### Step 1: Open MetaMask
1. คลิกที่ MetaMask extension ในเบราว์เซอร์
2. คลิกที่ network dropdown (ด้านบนซ้าย)
3. เลือก "Add Network" หรือ "Add a network manually"

### Step 2: Fill Network Details
กรอกข้อมูลดังนี้:

```
Network Name:       MeeChain (Ritual Chain)
New RPC URL:        https://rpc.meechain.run.place:5005
Chain ID:           13390
Currency Symbol:    MEE
Block Explorer URL: (leave blank or add later)
```

### Step 3: Save and Switch
1. คลิก "Save"
2. MetaMask จะสลับไปยัง MeeChain network อัตโนมัติ
3. ตรวจสอบว่า network name แสดง "MeeChain (Ritual Chain)"

---

## 🔧 Programmatic Setup (Web3)

### Using window.ethereum (MetaMask Provider)

```javascript
async function addMeeChainNetwork() {
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x344e', // 13390 in hex
        chainName: 'MeeChain (Ritual Chain)',
        nativeCurrency: {
          name: 'MeeChain',
          symbol: 'MEE',
          decimals: 18
        },
        rpcUrls: ['https://rpc.meechain.run.place:5005'],
        blockExplorerUrls: [] // optional
      }]
    });
    console.log('✅ MeeChain network added successfully');
  } catch (error) {
    console.error('❌ Failed to add network:', error);
  }
}

// Call the function
addMeeChainNetwork();
```

### Using ethers.js

```javascript
import { ethers } from 'ethers';

async function connectToMeeChain() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Check current network
      const network = await provider.getNetwork();
      
      if (network.chainId !== 13390n) {
        // Switch to MeeChain
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x344e' }]
        });
      }
      
      console.log('✅ Connected to MeeChain');
      return provider;
    } catch (error) {
      if (error.code === 4902) {
        // Network not added yet, add it
        await addMeeChainNetwork();
      } else {
        console.error('❌ Connection error:', error);
      }
    }
  } else {
    console.error('❌ MetaMask not installed');
  }
}
```

---

## 🧪 Testing Connection

### Test 1: Check Chain ID
```javascript
async function checkChainId() {
  const chainId = await window.ethereum.request({ 
    method: 'eth_chainId' 
  });
  console.log('Current Chain ID:', parseInt(chainId, 16));
  // Should output: 13390
}
```

### Test 2: Get Account Balance
```javascript
async function getBalance() {
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  const balance = await window.ethereum.request({
    method: 'eth_getBalance',
    params: [accounts[0], 'latest']
  });
  console.log('Balance:', parseInt(balance, 16) / 1e18, 'MEE');
}
```

### Test 3: Send Transaction
```javascript
async function sendTransaction() {
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  
  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from: accounts[0],
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      value: '0x29a2241af62c0000', // 0.3 MEE
      gas: '0x5208', // 21000
    }]
  });
  
  console.log('Transaction Hash:', txHash);
}
```

---

## 🔐 Import Contract to MetaMask

### Add MEE Token
```javascript
async function addMEEToken() {
  try {
    await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          symbol: 'MCT',
          decimals: 18,
          image: 'https://meechain.run.place/logo.png' // optional
        }
      }
    });
    console.log('✅ MEE Token added to MetaMask');
  } catch (error) {
    console.error('❌ Failed to add token:', error);
  }
}
```

---

## 🐛 Troubleshooting

### Problem: "Chain ID mismatch"
**Solution:** ตรวจสอบว่า Chain ID เป็น `13390` (hex: `0x344e`)

### Problem: "RPC URL not responding"
**Solution:** 
1. ตรวจสอบว่า RPC server รันอยู่
2. ลอง ping: `curl https://rpc.meechain.run.place:5005`
3. ตรวจสอบ firewall settings

### Problem: "Insufficient funds"
**Solution:** 
1. ตรวจสอบ balance: `eth_getBalance`
2. ขอ test tokens จาก faucet (ถ้ามี)
3. Transfer MEE จาก account อื่น

### Problem: "Transaction failed"
**Solution:**
1. ตรวจสอบ gas price และ gas limit
2. ตรวจสอบ nonce
3. ดู transaction logs ใน console

---

## 📱 Mobile Setup (MetaMask Mobile)

### iOS/Android
1. เปิด MetaMask app
2. Tap hamburger menu (☰)
3. Tap "Settings"
4. Tap "Networks"
5. Tap "Add Network"
6. กรอกข้อมูลเหมือนกับ desktop version
7. Tap "Add"

---

## 🔗 Quick Links

- [MetaMask Documentation](https://docs.metamask.io/)
- [EIP-3085: wallet_addEthereumChain](https://eips.ethereum.org/EIPS/eip-3085)
- [EIP-3326: wallet_switchEthereumChain](https://eips.ethereum.org/EIPS/eip-3326)
- [MeeChain QA Checklist](../QA_CHECKLIST.md)

---

## 💡 Tips

1. **Backup Your Seed Phrase:** อย่าลืม backup seed phrase ของ MetaMask
2. **Test with Small Amounts:** ทดสอบด้วยจำนวนเงินน้อยๆ ก่อน
3. **Check Gas Prices:** ตรวจสอบ gas price ก่อนส่ง transaction
4. **Use Hardware Wallet:** ใช้ hardware wallet สำหรับ production
5. **Enable 2FA:** เปิด 2FA ใน MetaMask (ถ้ามี)

---

## 📞 Support

ติดปัญหา? ติดต่อเราได้ที่:
- Discord: [Join our server](https://discord.gg/meechain)
- GitHub: [Create an issue](https://github.com/your-org/meechain/issues)
- Email: support@meechain.run.place
