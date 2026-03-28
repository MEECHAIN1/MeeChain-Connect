/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  MeeChain Cloudflare Worker — RPC & App Proxy                   ║
 * ║                                                                  ║
 * ║  Deploy this Worker to fix NoSuchBucket error.                  ║
 * ║  Routes:                                                         ║
 * ║    rpc.meechain.live  → YOUR_SERVER_IP:PORT                     ║
 * ║    app.meechain.live  → YOUR_SERVER_IP:PORT                     ║
 * ║                                                                  ║
 * ║  Deploy steps (in Cloudflare Dashboard):                        ║
 * ║    1. Workers & Pages → Create Worker                           ║
 * ║    2. Paste this script → Save & Deploy                         ║
 * ║    3. Settings → Triggers → Add Custom Domain:                  ║
 * ║       rpc.meechain.live  (remove R2 binding first)              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * ⚠️  IMPORTANT: Change ORIGIN_URL below to your actual server IP:PORT
 */

// ── Config ────────────────────────────────────────────────────────────────
// Change this to your server's public IP and port
// If using Cloudflare Tunnel (cloudflared), use the tunnel URL instead
const CONFIG = {
  // Your home server public IP and port (the one running server.js)
  ORIGIN_IP:    '58.11.89.11',
  ORIGIN_PORT:  8080,   // Port forwarded from router → 192.168.1.113:8080 (or 3000)

  // Optional: Cloudflare Tunnel URL (if you prefer tunnel over port forward)
  // TUNNEL_URL: 'https://your-tunnel-name.cfargotunnel.com',

  ALLOWED_ORIGINS: [
    'https://app.meechain.live',
    'https://rpc.meechain.live',
    'https://meechain.live',
    'https://meebot.io',
    'http://localhost:3000',
    'http://localhost:8080',
  ],
};

// ── CORS Headers ─────────────────────────────────────────────────────────
function corsHeaders(origin) {
  const allowed = CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age':       '86400',
  };
}

// ── Main Handler ─────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const host   = url.hostname; // e.g. rpc.meechain.live

    // ── Handle CORS preflight ─────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // ── Build origin URL ─────────────────────────────────────────
    // Use http:// because SSL is handled by Cloudflare (flexible SSL)
    const originBase = `http://${CONFIG.ORIGIN_IP}:${CONFIG.ORIGIN_PORT}`;
    const targetUrl  = originBase + url.pathname + url.search;

    // ── Build forwarded request ───────────────────────────────────
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set('X-Forwarded-For',   request.headers.get('CF-Connecting-IP') || '');
    forwardHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
    forwardHeaders.set('X-Forwarded-Host',  host);
    forwardHeaders.set('X-Real-IP',         request.headers.get('CF-Connecting-IP') || '');
    forwardHeaders.set('Host',              `${CONFIG.ORIGIN_IP}:${CONFIG.ORIGIN_PORT}`);
    // Remove Cloudflare-specific headers that shouldn't be forwarded
    forwardHeaders.delete('CF-Connecting-IP');
    forwardHeaders.delete('CF-Ray');

    try {
      // ── Proxy request to origin ───────────────────────────────
      const proxyRes = await fetch(targetUrl, {
        method:  request.method,
        headers: forwardHeaders,
        body:    request.method !== 'GET' && request.method !== 'HEAD'
                   ? request.body
                   : undefined,
        // Don't follow redirects from origin
        redirect: 'manual',
      });

      // ── Build response ────────────────────────────────────────
      const responseHeaders = new Headers(proxyRes.headers);

      // Add CORS headers
      const cors = corsHeaders(origin);
      for (const [k, v] of Object.entries(cors)) {
        responseHeaders.set(k, v);
      }

      // Add identifying header
      responseHeaders.set('X-Served-By', 'MeeChain-CF-Worker');
      responseHeaders.set('X-Origin',    `${CONFIG.ORIGIN_IP}:${CONFIG.ORIGIN_PORT}`);

      return new Response(proxyRes.body, {
        status:  proxyRes.status,
        headers: responseHeaders,
      });

    } catch (err) {
      // ── Origin unreachable — return diagnostic JSON ───────────
      const diagnostic = {
        error:   'origin_unreachable',
        message: `Cannot connect to origin server at ${CONFIG.ORIGIN_IP}:${CONFIG.ORIGIN_PORT}`,
        detail:  err.message,
        fixes: [
          '1. Check Router port forward: WAN 80/443 → 192.168.1.113:8080/8445',
          '2. Check Windows Firewall: allow port 8080',
          '3. Verify server is running: pm2 status',
          '4. Test direct: curl http://58.11.89.11:8080/health',
        ],
        worker:  'MeeChain CF Worker v1.0',
        ts:      new Date().toISOString(),
      };

      return new Response(JSON.stringify(diagnostic, null, 2), {
        status:  502,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-By':  'MeeChain-CF-Worker',
          ...corsHeaders(origin),
        },
      });
    }
  },
};
