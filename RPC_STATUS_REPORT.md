# RPC Status Report (April 11, 2026)

This report captures the latest RPC endpoint verification and the local proxy fixes.

## Endpoint Status Summary

| # | Endpoint | Status | Notes |
|---|---|---|---|
| 1 | `localhost:3000/rpc` | ✅ Working (after fix) | Mock response <30ms |
| 2 | `rpc.meechain.live/health` | ✅ OK | Cloudflare Worker v2.1.0 |
| 3 | `rpc.meechain.live` POST | ❌ 405 Method Not Allowed | Worker does not accept POST at root `/` |
| 4 | `rpc.meechain.live/rpc` POST | ❌ Timeout | Worker forwards to offline origin |
| 5 | `app.meechain.live/rpc` POST | ❌ Timeout | Origin `58.11.89.11:8080` unavailable |
| 6 | `rpc.meechain.run.place` | ❌ No response | DNS/server unreachable |
| 7 | `58.11.89.11:8080` (direct) | ❌ Firewall/Offline | Port closed or blocked |

## Local `server.js` Fixes Applied

1. Reduce upstream timeout from `6000ms` to `3000ms` for faster fallback.
2. Add circuit breaker via `_rpcHealth` tracker:
   - mark failed upstream as dead for 60 seconds
   - skip immediately on subsequent requests (instant mock path)
3. Fix batch JSON-RPC validation:
   - check `Array.isArray(body)` before single-request `.jsonrpc` checks.

## RPC Methods Verified

- `eth_chainId` → `0x344e` ✅
- `eth_blockNumber` → mock block ✅
- `net_version` → `13390` ✅
- `eth_getBalance` → ~100 MEE ✅
- `eth_call` → `0x000...000` ✅
- `eth_getBlockByNumber` → full block ✅
- `eth_estimateGas` → `0x5208` ✅
- `eth_gasPrice` → 1 Gwei ✅
- `eth_feeHistory` → valid ✅
- `eth_sendRawTransaction` → mock tx hash ✅
- `web3_clientVersion` → `MeeChain/v2.0/node` ✅
- Batch (3 methods) → all pass ✅

## Root Cause for External RPC Outage

The origin server `58.11.89.11:8080` is not accessible from the public internet (firewall or port-forwarding issue). Cloudflare Worker requests then time out because upstream is unreachable.

## Related Pull Request

- https://github.com/MEECHAIN1/MeeChain-Connect/pull/26
