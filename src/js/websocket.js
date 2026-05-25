/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MeeChain — WebSocket Real-time Client v2.0                 ║
 * ║  Receives: new_block, new_tx, price_update                  ║
 * ║  Server: ws://app.meechain.xyz/ws                           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const WsClient = (function () {
  // ── Config ────────────────────────────────────────────────────
  const WS_URL        = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  const RECONNECT_MS  = 3000;
  const MAX_RETRIES   = 10;
  const MAX_ACTIVITY  = 20;    // max items in live feed

  // ── State ──────────────────────────────────────────────────────
  let ws           = null;
  let retries      = 0;
  let pingInterval = null;
  let connected    = false;
  const listeners  = {};       // eventType → [callbacks]
  const activity   = [];       // live activity feed

  // ── Connect ─────────────────────────────────────────────────────
  function connect() {
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.warn('[WS] Cannot connect:', e.message);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      connected = true;
      retries   = 0;
      console.log('[WS] Connected to MeeChain real-time feed');

      // Subscribe to all channels
      ws.send(JSON.stringify({ type: 'subscribe', channels: ['blocks', 'txs', 'price'] }));

      // Heartbeat ping every 30s
      clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 30000);

      emit('status', { connected: true });
      updateStatusDot(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch {}
    };

    ws.onclose = () => {
      connected = false;
      clearInterval(pingInterval);
      console.log('[WS] Disconnected');
      emit('status', { connected: false });
      updateStatusDot(false);
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  function scheduleReconnect() {
    if (retries >= MAX_RETRIES) return;
    retries++;
    setTimeout(connect, RECONNECT_MS * Math.min(retries, 5));
  }

  // ── Handle messages ─────────────────────────────────────────────
  function handleMessage(data) {
    switch (data.type) {
      case 'connected':
        handleConnected(data);
        break;
      case 'new_block':
        handleNewBlock(data);
        break;
      case 'new_tx':
        handleNewTx(data);
        break;
      case 'price_update':
        handlePriceUpdate(data);
        break;
      case 'pong':
        // heartbeat OK
        break;
    }
    emit(data.type, data);
  }

  function handleConnected(data) {
    // Update network info from server
    if (data.blockNumber) updateBlockNumber(data.blockNumber);
  }

  function handleNewBlock(data) {
    updateBlockNumber(data.blockNumber);
    addActivityItem({
      icon:  '⬛',
      label: `Block #${Number(data.blockNumber).toLocaleString()}`,
      sub:   `${data.txCount} txs • ${data.tps} TPS`,
      time:  new Date().toLocaleTimeString('th-TH'),
      type:  'block',
    });
    updateTPS(data.tps);
  }

  function handleNewTx(data) {
    addActivityItem({
      icon:  txIcon(data.txType),
      label: data.txType,
      sub:   `${parseFloat(data.value).toFixed(2)} MEE`,
      time:  new Date().toLocaleTimeString('th-TH'),
      type:  'tx',
      hash:  data.hash,
    });
  }

  function handlePriceUpdate(data) {
    updatePrice(data.price, data.change24h);
  }

  // ── DOM Updates ─────────────────────────────────────────────────
  function updateBlockNumber(num) {
    // Network status bar (if exists)
    document.querySelectorAll('[data-ws="block-number"]').forEach(el => {
      el.textContent = '#' + Number(num).toLocaleString();
    });
    // Dashboard stat
    const statEl = document.getElementById('current-block');
    if (statEl) statEl.textContent = Number(num).toLocaleString();
  }

  function updateTPS(tps) {
    document.querySelectorAll('[data-ws="tps"]').forEach(el => {
      el.textContent = tps;
    });
    const tpsEl = document.getElementById('network-tps');
    if (tpsEl) tpsEl.textContent = tps;
  }

  function updatePrice(price, change) {
    document.querySelectorAll('[data-ws="mee-price"]').forEach(el => {
      el.textContent = '$' + price;
    });
    const priceEl  = document.getElementById('mee-price-live');
    const changeEl = document.getElementById('mee-price-change-live');
    if (priceEl)  priceEl.textContent  = '$' + price;
    if (changeEl) {
      changeEl.textContent = change;
      changeEl.className   = parseFloat(change) >= 0 ? 'price-up' : 'price-down';
    }
  }

  function updateStatusDot(online) {
    document.querySelectorAll('[data-ws="status-dot"]').forEach(el => {
      el.className = 'ws-status-dot ' + (online ? 'ws-online' : 'ws-offline');
    });
    document.querySelectorAll('[data-ws="status-text"]').forEach(el => {
      el.textContent = online ? 'Live' : 'Offline';
    });
  }

  function addActivityItem(item) {
    activity.unshift(item);
    if (activity.length > MAX_ACTIVITY) activity.pop();
    renderActivityFeed();
  }

  function renderActivityFeed() {
    const el = document.getElementById('ws-activity-feed');
    if (!el) return;
    el.innerHTML = activity.map(a => `
      <div class="ws-activity-item ws-activity-${a.type}">
        <span class="ws-activity-icon">${a.icon}</span>
        <div class="ws-activity-body">
          <span class="ws-activity-label">${a.label}</span>
          <span class="ws-activity-sub">${a.sub}</span>
        </div>
        <span class="ws-activity-time">${a.time}</span>
      </div>
    `).join('');
  }

  // ── TX Icon helper ─────────────────────────────────────────────
  function txIcon(type) {
    const icons = { Transfer: '💸', 'NFT Mint': '🖼️', Stake: '⛏️', Unstake: '💰', Swap: '🔄', Portal: '🌀' };
    return icons[type] || '📋';
  }

  // ── Event emitter ──────────────────────────────────────────────
  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
    return () => { listeners[event] = listeners[event].filter(f => f !== cb); };
  }
  function emit(event, data) {
    (listeners[event] || []).forEach(cb => { try { cb(data); } catch {} });
  }

  // ── Public API ─────────────────────────────────────────────────
  return {
    connect,
    on,
    emit,
    isConnected: () => connected,
    getActivity: () => [...activity],
  };
})();

// ── Auto-start on page load ────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => WsClient.connect());
} else {
  WsClient.connect();
}

// ── Expose globally ────────────────────────────────────────────────
window.WsClient = WsClient;
