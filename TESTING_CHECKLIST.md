# 🧪 Testing Checklist - MetaMask Integration

## Pre-Testing Setup

- [ ] Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
- [ ] Open Developer Console (F12)
- [ ] Clear browser cache if needed
- [ ] Ensure MetaMask extension is installed

---

## Test 1: Basic MetaMask Connection

### Steps:
1. [ ] Click "เชื่อมต่อกระเป๋าเงิน" button
2. [ ] Select "MetaMask" option
3. [ ] Approve connection in MetaMask popup

### Expected Results:
- [ ] MetaMask popup appears
- [ ] Connection succeeds
- [ ] Wallet address displays in header (truncated format: 0x1234...5678)
- [ ] Balance displays correctly
- [ ] Success toast appears: "เชื่อมต่อ MetaMask สำเร็จ! 🎉"
- [ ] No errors in console

---

## Test 2: MeeChain Network Auto-Switch

### Steps:
1. [ ] Connect MetaMask (if not already connected)
2. [ ] Observe if MetaMask prompts to switch network

### Expected Results:
- [ ] If on different network, MetaMask asks to switch to MeeChain
- [ ] If MeeChain not added, MetaMask asks to add network
- [ ] Network switches to Chain ID 13390 (0x344e)
- [ ] Connection completes successfully

---

## Test 3: Event Listener Duplication Fix

### Steps:
1. [ ] Connect wallet
2. [ ] Open console and check for event listeners
3. [ ] Disconnect wallet (in MetaMask)
4. [ ] Connect wallet again
5. [ ] Change account in MetaMask
6. [ ] Observe console logs

### Expected Results:
- [ ] Account change callback fires ONLY ONCE
- [ ] No duplicate toast messages
- [ ] No duplicate console logs
- [ ] UI updates correctly with new account

---

## Test 4: Account Change Detection

### Steps:
1. [ ] Connect wallet
2. [ ] Switch to different account in MetaMask
3. [ ] Observe UI updates

### Expected Results:
- [ ] Address in header updates immediately
- [ ] Balance updates to new account's balance
- [ ] Toast notification: "เปลี่ยน account แล้ว"
- [ ] No page reload required

---

## Test 5: Network Change Detection

### Steps:
1. [ ] Connect wallet
2. [ ] Switch to different network in MetaMask (e.g., Ethereum Mainnet)
3. [ ] Observe behavior

### Expected Results:
- [ ] Page reloads automatically
- [ ] After reload, prompts to switch back to MeeChain

---

## Test 6: Disconnect Handling

### Steps:
1. [ ] Connect wallet
2. [ ] Disconnect from MetaMask extension
3. [ ] Observe UI updates

### Expected Results:
- [ ] Button text changes back to "เชื่อมต่อกระเป๋าเงิน"
- [ ] Connected state removed
- [ ] Toast notification: "ตัดการเชื่อมต่อแล้ว"

---

## Test 7: Fallback to Demo Wallet

### Steps:
1. [ ] Disable MetaMask extension
2. [ ] Refresh page
3. [ ] Click "เชื่อมต่อกระเป๋าเงิน"
4. [ ] Select any wallet option

### Expected Results:
- [ ] Falls back to demo wallet
- [ ] Generates random address
- [ ] Shows mock balance
- [ ] Success toast appears

---

## Test 8: Multiple Connection Attempts

### Steps:
1. [ ] Connect wallet
2. [ ] Disconnect
3. [ ] Connect again
4. [ ] Repeat 3-4 times

### Expected Results:
- [ ] Each connection works correctly
- [ ] No memory leaks
- [ ] No duplicate event listeners
- [ ] Console remains clean (no errors)

---

## Test 9: NFT Purchase with Wallet

### Steps:
1. [ ] Connect wallet
2. [ ] Navigate to NFT Market
3. [ ] Click "ซื้อ" on any NFT
4. [ ] Observe behavior

### Expected Results:
- [ ] Purchase flow initiates
- [ ] Toast shows purchase in progress
- [ ] Success toast appears after delay
- [ ] No errors in console

---

## Test 10: Staking with Wallet

### Steps:
1. [ ] Connect wallet
2. [ ] Navigate to Staking page
3. [ ] Click "Stake เลย" on any pool
4. [ ] Observe behavior

### Expected Results:
- [ ] Staking flow initiates
- [ ] Success toast appears
- [ ] No errors in console

---

## Console Checks

### Things to verify in console:
- [ ] No "ethers is not defined" errors
- [ ] No CSP eval() violations
- [ ] No duplicate event listener warnings
- [ ] "✅ MeeChain Dashboard initialized successfully!" appears
- [ ] Web3 status check succeeds or fails gracefully

---

## Network Status Bar

### Verify:
- [ ] Status bar shows connection state
- [ ] Green dot (🟢) when connected
- [ ] Red dot (🔴) when disconnected
- [ ] Chain ID displays correctly (13390)
- [ ] Block number updates

---

## Known Issues / Limitations

- Demo wallet (non-MetaMask) uses mock data
- Actual blockchain transactions not implemented (UI only)
- Balance updates are simulated

---

## Success Criteria

All tests must pass with:
- ✅ No console errors
- ✅ No duplicate event listeners
- ✅ Smooth user experience
- ✅ Proper error handling
- ✅ Correct UI updates

---

**Tester:** _________________
**Date:** _________________
**Browser:** _________________
**MetaMask Version:** _________________
**Result:** ⬜ PASS / ⬜ FAIL

**Notes:**
