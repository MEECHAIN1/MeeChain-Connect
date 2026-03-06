# MeeChain API Documentation

API endpoints สำหรับ MeeChain platform

## 🌐 Base URL

```
Local:      http://localhost:3000
Production: https://meechain.run.place
```

---

## 📋 Table of Contents

- [Health & Status](#health--status)
- [Network Info](#network-info)
- [Web3 Integration](#web3-integration)
- [Token Operations](#token-operations)
- [NFT Operations](#nft-operations)
- [Staking Operations](#staking-operations)
- [AI Chat](#ai-chat)

---

## Health & Status

### GET /api/health

ตรวจสอบสถานะของ server

**Response:**
```json
{
  "status": "ok",
  "model": "gpt-5-mini",
  "bot": "MeeBot AI",
  "web3": true,
  "chainId": 13390,
  "rpc": "https://rpc.meechain.run.place:5005",
  "contracts": {
    "token": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "nft": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "staking": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  },
  "uptime": 3600
}
```

**Example:**
```bash
curl http://localhost:3000/api/health
```

---

## Network Info

### GET /api/network

ข้อมูล network สำหรับเพิ่มใน MetaMask

**Response:**
```json
{
  "chainId": "0x344e",
  "chainName": "Ritual Chain (MeeChain)",
  "rpcUrls": ["https://rpc.meechain.run.place:5005"],
  "nativeCurrency": {
    "name": "MeeChain",
    "symbol": "MEE",
    "decimals": 18
  },
  "blockExplorerUrls": ["https://ritual-chain--pouaun2499.replit.app"],
  "contracts": {
    "token": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "nft": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "staking": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/network
```

---

## Web3 Integration

### GET /api/web3/status

สถานะการเชื่อมต่อ Web3

**Response:**
```json
{
  "connected": true,
  "blockNumber": 1248753,
  "rpc": "https://rpc.meechain.run.place:5005",
  "chainId": 13390,
  "contracts": {
    "token": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "nft": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "staking": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/web3/status
```

---

### GET /api/chain/stats

สถิติของ blockchain

**Response:**
```json
{
  "blockNumber": 1248753,
  "gasPrice": "0.0001 Gwei",
  "chainId": 13390,
  "live": true
}
```

**Example:**
```bash
curl http://localhost:3000/api/chain/stats
```

---

### GET /api/chain/transactions

รายการ transactions ล่าสุด

**Response:**
```json
{
  "transactions": [
    {
      "hash": "0x1234567...",
      "from": "0xabcd...",
      "to": "0xefgh...",
      "value": "1.5 MEE",
      "blockNumber": 1248753,
      "timestamp": 1709654400
    }
  ],
  "live": true
}
```

**Example:**
```bash
curl http://localhost:3000/api/chain/transactions
```

---

## Token Operations

### GET /api/token/info

ข้อมูล MEE Token

**Response:**
```json
{
  "name": "MeeChain Token",
  "symbol": "MCT",
  "decimals": 18,
  "totalSupply": "10000000",
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "live": true
}
```

**Example:**
```bash
curl http://localhost:3000/api/token/info
```

---

### GET /api/token/balance/:address

ตรวจสอบ balance ของ address

**Parameters:**
- `address` (path) - Ethereum address

**Response:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "balance": "1234.567890123456789",
  "symbol": "MEE"
}
```

**Example:**
```bash
curl http://localhost:3000/api/token/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

---

## NFT Operations

### GET /api/nft/info

ข้อมูล NFT contract

**Response:**
```json
{
  "name": "MeeChain NFT",
  "symbol": "MEENFT",
  "totalSupply": 8432,
  "address": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "live": true
}
```

**Example:**
```bash
curl http://localhost:3000/api/nft/info
```

---

### GET /api/nft/balance/:address

จำนวน NFT ที่ address ถือครอง

**Parameters:**
- `address` (path) - Ethereum address

**Response:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "balance": 5
}
```

**Example:**
```bash
curl http://localhost:3000/api/nft/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

---

### POST /api/nft/describe

สร้างคำอธิบาย NFT ด้วย AI

**Request Body:**
```json
{
  "name": "Space Astronaut #007",
  "category": "art",
  "traits": "Rare, Animated, Glowing"
}
```

**Response:**
```json
{
  "description": "นักบินอวกาศผู้กล้าหาญจากมิติอนาคต พร้อมชุดเกราะเรืองแสงสีน้ำเงินนีออน มีความหายากสูงและเคลื่อนไหวได้อย่างลื่นไหล เหมาะสำหรับนักสะสม NFT ที่ชื่นชอบธีมอวกาศและเทคโนโลยี"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/nft/describe \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Space Astronaut #007",
    "category": "art",
    "traits": "Rare, Animated, Glowing"
  }'
```

---

## Staking Operations

### GET /api/staking/info

ข้อมูล staking pools

**Response:**
```json
{
  "totalStaked": "8524100",
  "rewardRate": "0.001",
  "apr": "85.0%",
  "address": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  "live": true
}
```

**Example:**
```bash
curl http://localhost:3000/api/staking/info
```

---

### GET /api/staking/user/:address

ข้อมูล staking ของ user

**Parameters:**
- `address` (path) - Ethereum address

**Response:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "staked": "1000.0",
  "pendingReward": "85.5"
}
```

**Example:**
```bash
curl http://localhost:3000/api/staking/user/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

---

## AI Chat

### POST /api/chat

Chat กับ MeeBot AI (non-streaming)

**Request Body:**
```json
{
  "message": "สอนวิธีซื้อ NFT หน่อย",
  "sessionId": "user123"
}
```

**Response:**
```json
{
  "reply": "สวัสดีค่ะ! 🤖 การซื้อ NFT บน MeeChain ทำได้ง่ายๆ นะคะ:\n\n1. เชื่อมต่อ Wallet (MetaMask) กับ MeeChain network\n2. ไปที่เมนู \"ตลาด NFT\"\n3. เลือก NFT ที่ชอบ\n4. กดปุ่ม \"ซื้อ\" และยืนยัน transaction\n5. รอ transaction สำเร็จ NFT จะเข้า wallet ของคุณทันที!\n\nมี MEE Token พอสำหรับซื้อไหมคะ? 💰",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "สอนวิธีซื้อ NFT หน่อย",
    "sessionId": "user123"
  }'
```

---

### POST /api/chat/stream

Chat กับ MeeBot AI (streaming SSE)

**Request Body:**
```json
{
  "message": "อธิบาย staking ให้หน่อย",
  "sessionId": "user123"
}
```

**Response:** (Server-Sent Events)
```
data: {"delta":"สวัสดี"}
data: {"delta":"ค่ะ"}
data: {"delta":" 🤖"}
...
data: {"done":true}
```

**Example:**
```javascript
const eventSource = new EventSource('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'อธิบาย staking ให้หน่อย',
    sessionId: 'user123'
  })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.done) {
    eventSource.close();
  } else {
    console.log(data.delta);
  }
};
```

---

### DELETE /api/chat/:sessionId

ลบ chat history ของ session

**Parameters:**
- `sessionId` (path) - Session ID

**Response:**
```json
{
  "cleared": true
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/chat/user123
```

---

## 🔐 Authentication

ปัจจุบัน API ไม่ต้องใช้ authentication สำหรับ local development

สำหรับ production ควรเพิ่ม:
- API Key authentication
- Rate limiting
- CORS configuration

---

## 📊 Rate Limits

ปัจจุบันไม่มี rate limits สำหรับ local development

สำหรับ production แนะนำ:
- 100 requests/minute per IP
- 1000 requests/hour per API key

---

## 🐛 Error Responses

### 400 Bad Request
```json
{
  "error": "Message required"
}
```

### 500 Internal Server Error
```json
{
  "error": "AI ไม่สามารถตอบได้ตอนนี้ กรุณาลองใหม่"
}
```

---

## 📚 See Also

- [QA Checklist](../QA_CHECKLIST.md)
- [MetaMask Setup](./METAMASK_SETUP.md)
- [Contributing Guide](../CONTRIBUTING.md)
