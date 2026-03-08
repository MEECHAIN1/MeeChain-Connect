# 🌐 DNS Configuration Guide for meebot.io

## Current Status

**Nameservers:** dns-parking.com (Cloudflare-based)
- ns1.dns-parking.com (162.159.24.201)
- ns2.dns-parking.com (162.159.25.42)

**Current A Record:** 2.57.91.91 (old server)
**Target A Record:** 76.76.21.21 (Vercel)

## 📋 Step-by-Step: Change DNS to Point to Vercel

### Option 1: Change A Record (Recommended - Faster)

1. **Login to Domain Registrar**
   - ไปที่เว็บไซต์ที่คุณซื้อโดเมน meebot.io (เช่น Namecheap, GoDaddy, Hostinger, etc.)
   - Login เข้าสู่ระบบ

2. **Find DNS Management**
   - หา "DNS Management" หรือ "DNS Settings"
   - หรือ "Advanced DNS" / "Manage DNS"

3. **Edit A Record**
   - หา record ที่มี:
     ```
     Type: A
     Host: @ (or meebot.io)
     Value: 2.57.91.91
     ```
   - แก้ไข Value เป็น: `76.76.21.21`
   - Save changes

4. **Add www Subdomain (Optional)**
   ```
   Type: CNAME
   Host: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

### Option 2: Change Nameservers to Vercel (Complete Control)

1. **Login to Domain Registrar**

2. **Find Nameserver Settings**
   - หา "Nameservers" หรือ "Custom DNS"

3. **Change Nameservers**
   - จาก:
     ```
     ns1.dns-parking.com
     ns2.dns-parking.com
     ```
   - เป็น:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```

4. **Save Changes**
   - รอ propagation (24-48 ชั่วโมง แต่มักจะเร็วกว่า)

## 🔍 Common Domain Registrars

### Namecheap
1. Login → Domain List
2. Click "Manage" next to meebot.io
3. Advanced DNS tab
4. Edit A Record → Change to 76.76.21.21

### GoDaddy
1. Login → My Products → Domains
2. Click DNS next to meebot.io
3. Edit A Record → Change to 76.76.21.21

### Hostinger
1. Login → Domains
2. Click Manage next to meebot.io
3. DNS / Name Servers
4. Edit A Record → Change to 76.76.21.21

### Cloudflare (if using)
1. Login → Select meebot.io
2. DNS → Records
3. Edit A Record → Change to 76.76.21.21
4. Make sure Proxy status is "DNS only" (gray cloud)

## ✅ Verify DNS Changes

### Check DNS Propagation

```powershell
# ตรวจสอบ DNS (ต้องได้ 76.76.21.21)
nslookup meebot.io

# ตรวจสอบจาก DNS servers ต่างๆ
nslookup meebot.io 8.8.8.8
nslookup meebot.io 1.1.1.1
```

### Online Tools

- https://dnschecker.org/#A/meebot.io
- https://www.whatsmydns.net/#A/meebot.io

### Test Website

```powershell
# ทดสอบ HTTP
curl http://meebot.io/api/health

# ทดสอบ HTTPS (หลัง SSL พร้อม)
curl https://meebot.io/api/health

# เปิดใน browser
start https://meebot.io
```

## ⏱️ DNS Propagation Time

- **A Record Change:** 5-30 นาที (ปกติ)
- **Nameserver Change:** 24-48 ชั่วโมง (แต่มักจะ 2-4 ชั่วโมง)

## 🔐 SSL Certificate

หลังจาก DNS ชี้ไปที่ Vercel แล้ว:
- Vercel จะสร้าง SSL certificate อัตโนมัติ (5-10 นาที)
- คุณจะได้รับ email แจ้งเมื่อเสร็จ
- HTTPS จะใช้งานได้ทันที

## 🚀 Current Working URLs

ขณะรอ DNS propagate คุณสามารถใช้:

```
https://meebot-steel.vercel.app
https://meebot-steel.vercel.app/api/health
```

## 📞 Need Help?

ถ้าไม่แน่ใจว่าต้องเข้าไปแก้ไขที่ไหน:
1. ตรวจสอบ email ที่ใช้ซื้อโดเมน
2. หา email จาก domain registrar
3. Login เข้าไปที่เว็บไซต์นั้น
4. หา DNS settings

## 🎯 Summary

1. ✅ Deploy บน Vercel สำเร็จ
2. ✅ Domain meebot.io เพิ่มใน Vercel แล้ว
3. ⏳ รอเปลี่ยน DNS A record จาก 2.57.91.91 → 76.76.21.21
4. ⏳ รอ DNS propagate (5-30 นาที)
5. ⏳ รอ Vercel สร้าง SSL certificate (อัตโนมัติ)

---

**Next Step:** ไปที่ domain registrar และเปลี่ยน A record เป็น 76.76.21.21
