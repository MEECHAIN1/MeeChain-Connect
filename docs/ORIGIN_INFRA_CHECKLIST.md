# Origin Infra Checklist (Cloudflare Worker/ Tunnel Timeout)

## Root Cause (current incident)
- Worker timeout ต่อเนื่องเพราะ upstream origin `58.11.89.11:8080` เข้าถึงไม่ได้จากอินเทอร์เน็ต (no public route / blocked by NAT or firewall).
- เมื่อ Worker ยิง `POST /rpc` ไป origin แล้วไม่ได้รับ response ภายใน timeout จะเกิด 52x/timeout ต่อเนื่อง.

## Checklist: NAT / Port-forward / Firewall

### Router Mapping ที่ควรตั้ง (จากหน้า IPv4 Port Mapping)
- [ ] `Protocol: TCP`
- [ ] `Internal host: 58.11.89.46` (เครื่อง MeeChain ใน LAN)
- [ ] `Internal port: 8080 -> 8080`
- [ ] `External port: 8080 -> 8080` (ไม่ควรใช้ 80 ถ้า service ฟัง 8080)
- [ ] `External Source IP`: **เว้นว่าง/Any** (ห้าม lock เป็น `10.146.211.188` เพราะจะอนุญาตเฉพาะ source เดียว)
- [ ] `Enable Port Mapping`: เปิดใช้งาน

> จากภาพที่ส่งมา มี rule ที่ดูเหมือนตั้ง `External port = 80` แต่ `External source port = 8080` และมีการผูก `External Source IP = 10.146.211.188` ซึ่งเสี่ยงทำให้ Cloudflare/Internet เข้าไม่ถึง origin ได้.

### 1) Confirm listener on origin host
- [ ] แอปฟังพอร์ตจริง `0.0.0.0:8080` (ไม่ใช่แค่ `127.0.0.1`).
- [ ] ตรวจด้วย `ss -ltnp | rg 8080` หรือ `netstat -ltnp`.
- [ ] ทดสอบในเครื่อง origin: `curl -i http://127.0.0.1:8080/health` และ `curl -i http://<LAN_IP>:8080/health`.

### 2) Router NAT / Port-forward
- [ ] ตั้ง port-forward: `WAN:8080 -> <ORIGIN_LAN_IP>:8080` (TCP).
- [ ] จอง DHCP lease หรือ static IP ให้ origin เพื่อไม่ให้ปลายทางเปลี่ยน.
- [ ] ปิด double-NAT ถ้าเป็นไปได้ (หรือ forward ทุกชั้น).
- [ ] ลบ/ปิด rule ซ้ำที่ใช้ mapping name เดียวกันแต่ค่า port ไม่ตรงกัน เพื่อลดชนกันของ policy.

### 3) Host firewall (origin machine)
- [ ] Linux (ufw/firewalld/iptables/nftables) อนุญาต TCP/8080 จาก Cloudflare egress หรืออย่างน้อยจากอินเทอร์เน็ตที่ต้องการ.
- [ ] Windows Firewall: inbound allow TCP/8080.
- [ ] ยืนยันว่าไม่มี rule drop ก่อน allow.

### 4) Upstream provider/ISP restrictions
- [ ] ตรวจว่า ISP ไม่บล็อก inbound port 8080.
- [ ] ถ้าบล็อก ให้ย้ายเป็นพอร์ตที่อนุญาต (เช่น 443/8443) แล้วปรับ Worker/Tunnel config ให้ตรงกัน.

### 5) External verification (outside LAN)
- [ ] `curl -i http://58.11.89.11:8080/health` ต้องตอบกลับได้.
- [ ] `nc -vz 58.11.89.11 8080` ผ่าน.
- [ ] ทดสอบจากคนละเครือข่าย (มือถือ 4G/5G) เพื่อเลี่ยง hairpin NAT false-positive.

### 6) Cloudflare side
- [ ] ถ้าใช้ Worker: upstream URL ต้องตรงกับพอร์ตที่เปิดจริง.
- [ ] ถ้าใช้ Tunnel: ingress `hostname` และ `service` ตรง (`rpc` ไม่ใช่ `prc`).
- [ ] ปรับ timeout ในแอปให้น้อยพอสำหรับ fail-fast และ circuit breaker.

## Production-safe Fallback Strategy (Mock vs Upstream)

### Mode policy
- **Production (enforced by server):** `NODE_ENV=production` จะบังคับเป็น `RPC_MODE=upstream-only` และ `RPC_ALLOW_MOCK_FALLBACK=false` อัตโนมัติ
  - ควรตั้งค่าให้สอดคล้องไว้ใน env ด้วยเพื่อความชัดเจนในการปฏิบัติการ
  - แนะนำกำหนดตรงๆ: `RPC_MODE=upstream-only` และ `RPC_ALLOW_MOCK_FALLBACK=false`
- **Production (recommended explicit env):** `RPC_MODE=upstream-only`, `RPC_ALLOW_MOCK_FALLBACK=false`
  - write/read ทุกเมธอดต้องพึ่ง upstream จริง
  - ถ้า upstream ล่มให้ตอบ 503 พร้อม JSON-RPC error
- **Staging/Dev:** `RPC_MODE=auto`, `RPC_ALLOW_MOCK_FALLBACK=true`
  - read-only methods fallback ไป mock ได้
  - mutating methods (`eth_send*`) ห้าม fallback mock (ต้อง fail ชัดเจน)

### Guardrails
- [ ] แยก read-only vs write methods ชัดเจนใน proxy layer.
- [ ] ใช้ circuit breaker (failure threshold + cooldown) ลด retry storm.
- [ ] บันทึก metric: upstream latency, timeout rate, fallback rate, write-fail rate.
- [ ] ตั้ง alert เมื่อ fallback ratio สูงผิดปกติ (เช่น >5% ต่อ 5 นาที).

### Rollout pattern
- [ ] เริ่ม canary: เปิด `auto+mock` เฉพาะ internal/staging.
- [ ] production เปิด `upstream-only` เป็นค่า default.
- [ ] มี runbook สำหรับสลับ mode ชั่วคราวตอน incident และ rollback หลัง origin ฟื้น.
