# How to Start RPC Proxy (Port 5005)

คุณบอกว่า `https://127.0.0.1:5005` สามารถใช้ได้ แสดงว่ามี Nginx หรือ proxy รันอยู่

## 🔍 ตรวจสอบว่า RPC Proxy รันอยู่หรือไม่

### Windows (PowerShell)
```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 5005
```

### Windows (CMD)
```cmd
netstat -ano | findstr :5005
```

### Test RPC Connection
```bash
curl -X POST https://127.0.0.1:5005 \
  -H "Content-Type: application/json" \
  -k \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

**Expected Response:**
```json
{"jsonrpc":"2.0","id":1,"result":"0x344e"}
```

---

## 🚀 วิธีเริ่ม RPC Proxy

### Option 1: Nginx (Recommended)

#### 1. Check if Nginx is installed
```bash
nginx -v
```

#### 2. Start Nginx
```bash
# Windows
start nginx

# Linux/Mac
sudo systemctl start nginx
# or
sudo nginx
```

#### 3. Nginx Configuration
สร้างไฟล์ `nginx.conf` หรือแก้ไข existing config:

```nginx
server {
    listen 5005 ssl;
    server_name localhost;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8545;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 4. Reload Nginx
```bash
nginx -s reload
```

---

### Option 2: Node.js Proxy (Quick & Easy)

สร้างไฟล์ `proxy-server.js`:

```javascript
const https = require('https');
const httpProxy = require('http-proxy');
const fs = require('fs');

const proxy = httpProxy.createProxyServer({
  target: 'http://127.0.0.1:8545',
  changeOrigin: true
});

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, (req, res) => {
  proxy.web(req, res);
}).listen(5005);

console.log('✅ HTTPS Proxy running on https://127.0.0.1:5005');
console.log('   Forwarding to: http://127.0.0.1:8545');
```

#### Install dependencies:
```bash
npm install http-proxy
```

#### Generate self-signed certificate:
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

#### Start proxy:
```bash
node proxy-server.js
```

---

### Option 3: SSH Tunnel (For Remote Server)

```bash
ssh -L 5005:localhost:8545 user@remote-server
```

---

## 🧪 Test After Starting

### Test 1: Check Port
```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 5005
```

### Test 2: Test RPC
```bash
curl -X POST https://127.0.0.1:5005 \
  -H "Content-Type: application/json" \
  -k \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

### Test 3: Test from Application
```bash
curl http://localhost:3000/api/web3/status
```

**Expected:**
```json
{
  "connected": true,
  "blockNumber": 12345,
  "rpc": "https://127.0.0.1:5005",
  "chainId": 13390
}
```

---

## 🐛 Troubleshooting

### Problem: "Connection refused"
**Solution:** RPC proxy ยังไม่ได้เริ่ม ให้เริ่มตาม Option 1 หรือ 2

### Problem: "SSL certificate error"
**Solution:** ใช้ `-k` หรือ `--insecure` flag กับ curl

### Problem: "Port already in use"
**Solution:**
```bash
# Find process using port 5005
netstat -ano | findstr :5005

# Kill process (Windows)
taskkill /PID <PID> /F
```

---

## 📝 Current Status

ตอนนี้:
- ✅ Application server running (port 3000)
- ✅ Configuration updated to use `https://127.0.0.1:5005`
- ⚠️ RPC Proxy not running (port 5005)
- ⚠️ Hardhat node not running (port 8545)

**Next Steps:**
1. เริ่ม Hardhat node: `npx hardhat node` (in blockchain directory)
2. เริ่ม RPC proxy (Nginx หรือ Node.js proxy)
3. Restart application server
4. Test connection

---

## 🎯 Quick Start (All-in-One)

```bash
# Terminal 1: Start Hardhat node
cd blockchain
npx hardhat node

# Terminal 2: Start RPC proxy (if using Node.js proxy)
node proxy-server.js

# Terminal 3: Start application
npm start

# Terminal 4: Test
curl http://localhost:3000/api/web3/status
```

---

## 📞 Need Help?

ถ้าคุณรู้วิธีที่คุณใช้เปิด RPC proxy บอกผมได้เลย แล้วผมจะอัปเดต documentation ให้ถูกต้อง!
