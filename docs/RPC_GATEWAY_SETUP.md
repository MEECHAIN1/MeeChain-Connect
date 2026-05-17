# Cloudflare Gateway RPC Setup

Use Cloudflare Gateway as the RPC connectivity profile while keeping wallet-facing JSON-RPC URLs in `rpcUrls`.

## Architecture Flow

```text
[ MeeChain Client ]
   │
   ├─► 🥇 Primary RPC Gateway → IPv4: 172.64.36.1
   ├─► 🥈 Secondary RPC Gateway → IPv6: 2a06:98c1:54::4b:43e8
   ├─► 🔒 Secure DNS → DoT: ohsut0yy6x.cloudflare-gateway.com
   └─► 🔒 Secure DNS → DoH: https://ohsut0yy6x.cloudflare-gateway.com/dns-query
```

## Runtime Metadata

`GET /api/network` exposes the gateway metadata in `rpcGateway` so clients can show the RPC setup badge flow without placing DNS gateway IPs directly into EIP-3085 `rpcUrls`.

```json
{
  "rpcGateway": {
    "primary": {
      "type": "IPv4",
      "address": "172.64.36.1",
      "badge": "🥇 Primary RPC"
    },
    "secondary": {
      "type": "IPv6",
      "address": "2a06:98c1:54::4b:43e8",
      "badge": "🥈 Secondary RPC"
    },
    "dns": {
      "dot": {
        "endpoint": "ohsut0yy6x.cloudflare-gateway.com",
        "badge": "🔒 DoT Secured"
      },
      "doh": {
        "endpoint": "https://ohsut0yy6x.cloudflare-gateway.com/dns-query",
        "badge": "🔒 DoH Enabled"
      }
    }
  }
}
```

## Ritual Checklist

- Set IPv4 Gateway as the primary connectivity path.
- Add IPv6 Gateway as fallback for IPv6-first networks.
- Enable DoT to reduce DNS interception risk.
- Enable DoH for modern clients that support HTTPS DNS.
- Test RPC connectivity and latency before claiming the badge.

## Automation Template

Use the repository-level [`sessions.json`](../sessions.json) file as the copy-paste workflow template for RPC setup automation.
