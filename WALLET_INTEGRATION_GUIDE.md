# 🦊 MeeChain Wallet Integration Guide

คู่มือการเชื่อมต่อ MetaMask กับ MeeChain Dashboard

---

## ✅ สิ่งที่ทำเสร็จแล้ว

### 1. เพิ่ม Ethers.js Library
- ✅ เพิ่ม CDN ใน `index.html`
- ✅ ใช้ ethers.js v5.7.2

### 2. สร้าง Wallet Integration
- ✅ `src/web3/wallet.js` - Wallet class (backend)
- ✅ `src/js/wallet-integration.js` - Frontend integration
- ✅ อัปเดต `index.html` ให้โหลด scripts

### 3. Features
- ✅ เชื่อมต่อ MetaMask
- ✅ ตรวจสอบและสลับ network อัตโนมัติ
- ✅ เพิ่ม MeeChain network ถ้ายังไม่มี
- ✅ แสดง balance จริง
- ✅ รับฟัง account changes
- ✅ รับฟัง network changes

---

## 🚀 วิธีใช้งาน

### 1. เปิด Application
```bash
# Make sure server is running
npm start

# Open browser
http://localhost:3000
```

### 2. เชื่อมต่อ MetaMask

#### ขั้นตอนที่ 1: คลิกปุ่ม "เชื่อมต่อกระเป๋าเงิน"
- อยู่มุมขวาบนของ Dashboard
- หรือคลิกที่เมนู Wallet

#### ขั้นตอนที่ 2: เลือก MetaMask
- คลิกที่ไอคอน 🦊 MetaMask
- MetaMask popup จะเปิดขึ้นมา

#### ขั้นตอนที่ 3: อนุมัติการเชื่อมต่อ
- คลิก "Connect" ใน MetaMask
- เลือก account ที่ต้องการใช้

#### ขั้นตอนที่ 4: สลับ Network (ถ้าจำเป็น)
- ถ้าคุณไม่ได้อยู่ใน MeeChain network
- MetaMask จะถามให้สลับ network
- คลิก "Switch network"

#### ขั้นตอนที่ 5: เพิ่ม Network (ถ้ายังไม่มี)
- ถ้า MeeChain network ยังไม่ได้เพิ่ม
- MetaMask จะถามให้เพิ่ม network
- คลิก "Approve" เพื่อเพิ่ม

---

## 🌐 MeeChain Network Configuration

### Network Details
```
Network Name: MeeChain (Ritual Chain)
RPC URL: https://42c7069b-865d-4df8-b7c6-7e205ac23047-00-3hc01fewihowr.pike.replit.dev:3003
Chain ID: 13390 (0x344e in hex)
Currency Symbol: MEE
Decimals: 18
```

### เพิ่ม Network ด้วยตนเอง

#### ใน MetaMask:
1. คลิก network dropdown (ด้านบนซ้าย)
2. คลิก "Add network"
3. คลิก "Add a network manually"
4. กรอกข้อมูลตามด้านบน
5. คลิก "Save"

---

## 🎯 Features ที่ทำงานได้

### ✅ Wallet Connection
- เชื่อมต่อ MetaMask
- แสดง address
- แสดง balance จริง
- ตัดการเชื่อมต่อ

### ✅ Network Management
- ตรวจสอบ Chain ID
- สลับ network อัตโนมัติ
- เพิ่ม network ถ้ายังไม่มี

### ✅ Account Management
- รับฟัง account changes
- อัปเดต UI เมื่อเปลี่ยน account
- แสดง balance ใหม่

### ✅ UI Updates
- แสดง address แบบย่อ (0x1234...5678)
- แสดง balance ใน MEE
- แสดง balance ใน USD
- อัปเดต token list

---

## 🧪 Testing

### Test 1: เชื่อมต่อ MetaMask
```
1. เปิด http://localhost:3000
2. คลิก "เชื่อมต่อกระเป๋าเงิน"
3. เลือก MetaMask
4. อนุมัติใน MetaMask popup
5. ✅ ควรเห็น address และ balance
```

### Test 2: สลับ Network
```
1. เชื่อมต่อ MetaMask
2. สลับไปยัง network อื่นใน MetaMask
3. ✅ หน้าเว็บควร reload อัตโนมัติ
```

### Test 3: เปลี่ยน Account
```
1. เชื่อมต่อ MetaMask
2. เปลี่ยน account ใน MetaMask
3. ✅ UI ควรอัปเดต address และ balance ใหม่
```

### Test 4: ตัดการเชื่อมต่อ
```
1. เชื่อมต่อ MetaMask
2. Disconnect ใน MetaMask
3. ✅ UI ควรกลับไปสถานะไม่ได้เชื่อมต่อ
```

---

## 🐛 Troubleshooting

### Problem: "กรุณาติดตั้ง MetaMask ก่อน"
**Solution:** 
- ติดตั้ง MetaMask extension
- https://metamask.io/download/

### Problem: "คุณปฏิเสธการเชื่อมต่อ"
**Solution:**
- คลิก "เชื่อมต่อกระเป๋าเงิน" อีกครั้ง
- อนุมัติใน MetaMask popup

### Problem: "ไม่สามารถเชื่อมต่อได้"
**Solution:**
1. ตรวจสอบว่า MetaMask ติดตั้งแล้ว
2. ตรวจสอบว่า MetaMask ไม่ถูก lock
3. ลอง refresh หน้าเว็บ
4. ลอง restart browser

### Problem: Balance แสดง 0
**Solution:**
- ตรวจสอบว่าคุณอยู่ใน MeeChain network
- ตรวจสอบว่า account มี MEE token
- ลอง refresh หน้าเว็บ

### Problem: Network ไม่ถูกต้อง
**Solution:**
1. เปิด MetaMask
2. คลิก network dropdown
3. เลือก "MeeChain (Ritual Chain)"
4. หรือให้ application สลับให้อัตโนมัติ

---

## 📝 Code Examples

### ตรวจสอบว่าเชื่อมต่อหรือไม่
```javascript
if (AppState.walletConnected) {
  console.log('Connected:', AppState.walletAddress);
  console.log('Balance:', AppState.walletBalance);
} else {
  console.log('Not connected');
}
```

### ดึง balance ใหม่
```javascript
if (AppState.provider) {
  const balance = await AppState.provider.getBalance(AppState.walletAddress);
  const balanceInEth = ethers.formatEther(balance);
  console.log('Balance:', balanceInEth, 'MEE');
}
```

### ส่ง transaction
```javascript
if (AppState.provider) {
  const signer = await AppState.provider.getSigner();
  const tx = await signer.sendTransaction({
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    value: ethers.parseEther('0.1') // 0.1 MEE
  });
  await tx.wait();
  console.log('Transaction sent:', tx.hash);
}
```

---

## 🔐 Security Notes

### ⚠️ Important
1. **Never share your private key**
2. **Always verify transaction details**
3. **Use hardware wallet for large amounts**
4. **Keep MetaMask updated**
5. **Be careful with phishing sites**

### Best Practices
- ✅ Always check the URL
- ✅ Verify contract addresses
- ✅ Start with small amounts
- ✅ Use test networks first
- ✅ Keep seed phrase safe

---

## 🚀 Next Steps

### Immediate
1. ✅ Test wallet connection
2. ✅ Verify balance display
3. ✅ Test account switching
4. ✅ Test network switching

### Short Term
5. ✅ Add token transfer functionality
6. ✅ Add NFT minting
7. ✅ Add staking operations
8. ✅ Add transaction history

### Long Term
9. ✅ Add WalletConnect support
10. ✅ Add Coinbase Wallet support
11. ✅ Add hardware wallet support
12. ✅ Add multi-chain support

---

## 📚 Resources

- [MetaMask Documentation](https://docs.metamask.io/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [EIP-3085: wallet_addEthereumChain](https://eips.ethereum.org/EIPS/eip-3085)
- [EIP-3326: wallet_switchEthereumChain](https://eips.ethereum.org/EIPS/eip-3326)

---

## ✅ Checklist

- [x] เพิ่ม Ethers.js CDN
- [x] สร้าง wallet integration code
- [x] อัปเดต HTML
- [x] ทดสอบ MetaMask connection
- [ ] ทดสอบ transaction sending
- [ ] ทดสอบ NFT minting
- [ ] ทดสอบ staking operations
- [ ] เพิ่ม error handling
- [ ] เพิ่ม loading states
- [ ] เพิ่ม transaction confirmations

---

Made with ❤️ by MeeChain Team
Updated: 2024-03-05
