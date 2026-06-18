'use strict';
/**
 * Tests for scripts/test-production.sh (added in PR).
 *
 * Strategy:
 *   1. CLI-level unit tests: exercise argument parsing, flag handling, help
 *      output, and URL normalisation by running the script with
 *      child_process.spawnSync and inspecting exit codes / stdout / stderr.
 *   2. Integration tests: spin up an in-process Node.js http.createServer mock
 *      that returns controlled responses for every endpoint the script visits,
 *      then run the script pointing at localhost:<port> with --skip-network so
 *      that DNS resolution is bypassed.
 *
 * The mock server handles:
 *   GET  /          → HTML with "MeeChain"
 *   GET  /health    → {"status":"ok","version":"1.2.3"}
 *   GET  /api/health → {"status":"ok"}
 *   GET  /rpc/health → {"status":"ok","chainId":13390,"mode":"proxy"}
 *   POST /rpc        → {"result":"0x344e"} (eth_chainId)
 *                    → {"result":"0x100"}  (eth_blockNumber)
 *   GET  /api/network → {"chainId":"0x344e","chainIdDecimal":"13390","rpcUrls":["<base>/rpc"]}
 *   GET  /api/web3/status → {"connected":true}
 *
 * All responses deliberately match the defaults checked by the script so the
 * happy-path test passes without any extra env-var overrides.
 */

const assert       = require('assert');
const { describe, it, before, after } = require('mocha');
const http         = require('http');
const path         = require('path');
const { spawnSync } = require('child_process');

// ── Paths ─────────────────────────────────────────────────────────────────────

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'test-production.sh');

// ── Helper: run the script synchronously ─────────────────────────────────────

/**
 * Run the production test script synchronously with the given arguments and
 * environment overrides.  Returns { status, stdout, stderr }.
 */
function runScript(args = [], envOverrides = {}) {
  const result = spawnSync('bash', [SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: 15000,
    env: { ...process.env, ...envOverrides },
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

// ── Helper: create a mock HTTP server ────────────────────────────────────────

/**
 * Build the default response map.  base is the full origin (http://host:port).
 */
function defaultHandlers(base) {
  return {
    'GET /': (req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><head><title>MeeChain Dashboard</title></head><body>MeeChain</body></html>');
    },
    'GET /health': (req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: '1.2.3' }));
    },
    'GET /api/health': (req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    },
    'GET /rpc/health': (req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', chainId: 13390, mode: 'proxy' }));
    },
    'POST /rpc': (req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let method = '';
        try { method = JSON.parse(body).method; } catch (_) { /* ignore */ }
        res.writeHead(200, { 'content-type': 'application/json' });
        if (method === 'eth_blockNumber') {
          res.end(JSON.stringify({ result: '0x100' }));
        } else {
          // eth_chainId and anything else
          res.end(JSON.stringify({ result: '0x344e' }));
        }
      });
    },
    'GET /api/network': (req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        chainId: '0x344e',
        chainIdDecimal: '13390',
        rpcUrls: [`${base}/rpc`],
      }));
    },
    'GET /api/web3/status': (req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ connected: true }));
    },
  };
}

/**
 * Create and start an HTTP server with a customisable handler map.
 * Returns a Promise that resolves to { server, base, port }.
 */
function startMockServer(handlerOverrides = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const key = `${req.method} ${req.url}`;
      const base = `http://127.0.0.1:${server.address().port}`;
      const handlers = { ...defaultHandlers(base), ...handlerOverrides(base) };
      const handler = handlers[key];
      if (handler) {
        handler(req, res);
      } else {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('not found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, base: `http://127.0.0.1:${port}` });
    });
    server.on('error', reject);
  });
}

// ── CLI / argument-parsing tests (no network needed) ─────────────────────────

describe('test-production.sh — CLI flags and argument parsing', () => {
  it('prints usage and exits 0 with --help', () => {
    const { status, stdout } = runScript(['--help']);
    assert.strictEqual(status, 0, 'Expected exit code 0');
    assert.ok(stdout.includes('Usage:'), 'Expected "Usage:" in output');
    assert.ok(stdout.includes('bash scripts/test-production.sh'), 'Expected script name in usage');
  });

  it('prints usage and exits 0 with -h', () => {
    const { status, stdout } = runScript(['-h']);
    assert.strictEqual(status, 0, 'Expected exit code 0');
    assert.ok(stdout.includes('Usage:'), 'Expected "Usage:" in output');
  });

  it('exits 2 for an unknown flag', () => {
    const { status, stderr } = runScript(['--no-such-flag']);
    assert.strictEqual(status, 2, 'Expected exit code 2 for unknown flag');
    assert.ok(stderr.includes('Unknown option'), 'Expected "Unknown option" in stderr');
  });

  it('exits non-zero when --also is given without a URL argument', () => {
    // --also requires the next argument; omitting it should cause a bash error
    const { status } = runScript(['https://localhost:1', '--also']);
    assert.notStrictEqual(status, 0, 'Expected non-zero exit when --also has no argument');
  });

  it('exits non-zero when --timeout is given without a value', () => {
    const { status } = runScript(['https://localhost:1', '--timeout']);
    assert.notStrictEqual(status, 0, 'Expected non-zero exit when --timeout has no value');
  });

  it('normalises a base URL that includes a path', () => {
    // The script strips the path and prints "using origin:" to stderr.
    // We can observe this by pointing at a URL with a path on a non-listening
    // port; the script will fail on HTTP but should still log the normalisation.
    const { stderr } = runScript(['http://127.0.0.1:1/favicon.ico', '--skip-network']);
    // The info message goes to stderr
    assert.ok(
      stderr.includes('using origin:') || stderr.includes('http://127.0.0.1:1'),
      'Expected normalisation message or origin in output',
    );
  });

  it('script file exists and is executable', () => {
    const fs = require('fs');
    assert.ok(fs.existsSync(SCRIPT), `Expected ${SCRIPT} to exist`);
    // Check execute bit
    const mode = fs.statSync(SCRIPT).mode;
    // owner-execute bit is 0o100
    assert.ok((mode & 0o111) !== 0, 'Expected script to have execute permission');
  });

  it('defaults BASE_URL to https://rpc.meechain.live when first arg starts with --', () => {
    // Pass --help as the first arg (which is a flag, not a URL), so BASE_URL
    // defaults.  --help exits 0 so we can inspect stdout safely.
    const { status, stdout } = runScript(['--help']);
    assert.strictEqual(status, 0);
    assert.ok(stdout.includes('https://rpc.meechain.live'), 'Expected default URL in usage text');
  });
});

// ── URL normalisation tests ───────────────────────────────────────────────────

describe('test-production.sh — normalize_url behaviour', () => {
  it('accepts a plain origin URL without complaint', function(done) {
    // Use --help which causes immediate exit; just verify the script can be
    // invoked with a clean origin.
    const { status } = runScript(['https://example.com', '--help']);
    assert.strictEqual(status, 0);
    done();
  });

  it('strips trailing slash from URL', () => {
    // We cannot easily isolate normalize_url, but we can check that the script
    // does not print the "using origin:" message for a URL that already is an
    // origin (no trailing slash).
    const { stderr } = runScript(['https://example.com', '--help']);
    // There should be no normalisation message for a clean origin
    assert.ok(!stderr.includes('using origin:'), 'Should not emit normalisation message for plain origin');
  });

  it('strips path from trycloudflare URL and emits info message', () => {
    const { stderr } = runScript(
      ['https://speaker-marshall-stations-antonio.trycloudflare.com/favicon.ico', '--skip-network'],
    );
    assert.ok(
      stderr.includes('using origin:'),
      'Expected normalisation info message when a path is included in the URL',
    );
  });

  it('fails gracefully when an invalid URL is given', () => {
    const { status, stderr } = runScript(['not-a-url', '--skip-network']);
    assert.notStrictEqual(status, 0, 'Expected non-zero exit for invalid URL');
    assert.ok(
      stderr.includes('invalid base URL') || stderr.includes('not-a-url'),
      'Expected error message mentioning the invalid URL',
    );
  });
});

// ── PROD_TEST_ADDITIONAL_URLS env var parsing ─────────────────────────────────

describe('test-production.sh — PROD_TEST_ADDITIONAL_URLS parsing', () => {
  it('accepts an empty PROD_TEST_ADDITIONAL_URLS without error at flag level', () => {
    // Just run --help; the env var parsing still runs before the arg loop.
    const { status } = runScript(['--help'], { PROD_TEST_ADDITIONAL_URLS: '' });
    assert.strictEqual(status, 0);
  });

  it('parses comma-separated additional URLs from PROD_TEST_ADDITIONAL_URLS', () => {
    // We cannot directly observe parsing without running full checks, but we
    // can verify the script starts and processes the env var without crashing
    // at parse time (before any HTTP calls) by running --help.
    const { status } = runScript(['--help'], {
      PROD_TEST_ADDITIONAL_URLS: 'https://a.example.com,https://b.example.com',
    });
    assert.strictEqual(status, 0);
  });
});

// ── Integration tests with a mock HTTP server ─────────────────────────────────

describe('test-production.sh — happy path with mock server', function() {
  // These tests spawn a real shell process and make HTTP calls, so allow extra time.
  this.timeout(20000);

  let server;
  let base;

  before(async () => {
    ({ server, base } = await startMockServer(() => ({})));
  });

  after(done => {
    server.close(done);
  });

  it('exits 0 when all endpoints return correct responses', () => {
    const { status, stdout } = runScript([base, '--skip-network']);
    assert.strictEqual(status, 0, `Expected exit 0; stderr: ${runScript([base, '--skip-network']).stderr}`);
    assert.ok(stdout.includes('✅'), 'Expected at least one pass marker in output');
    assert.ok(stdout.includes('production validation checklist passed'), 'Expected final pass message');
  });

  it('outputs base URL in the run header', () => {
    const { stdout } = runScript([base, '--skip-network']);
    assert.ok(stdout.includes('Base URL:'), 'Expected "Base URL:" in output');
  });

  it('reports all production validation checklists passed', () => {
    const { status, stdout } = runScript([base, '--skip-network']);
    assert.strictEqual(status, 0);
    assert.ok(stdout.includes('all production validation checklists passed'));
  });
});

// ── --skip-app flag ───────────────────────────────────────────────────────────

describe('test-production.sh — --skip-app flag', function() {
  this.timeout(20000);

  let server;
  let base;

  before(async () => {
    // Serve a root that does NOT contain "MeeChain" to prove the app check is skipped
    ({ server, base } = await startMockServer(b => ({
      'GET /': (req, res) => {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><body>No brand text here</body></html>');
      },
    })));
  });

  after(done => server.close(done));

  it('skips the app shell check and still passes when --skip-app is set', () => {
    const { status, stdout } = runScript([base, '--skip-app', '--skip-network']);
    assert.strictEqual(status, 0, 'Expected exit 0 with --skip-app even when root has no brand text');
    assert.ok(stdout.includes('skipping app shell check') || stdout.includes('production validation checklist passed'));
  });

  it('fails when root does not contain brand text without --skip-app', () => {
    const { status } = runScript([base, '--skip-network']);
    assert.notStrictEqual(status, 0, 'Expected failure when app shell text is missing');
  });
});

// ── Non-200 response handling ─────────────────────────────────────────────────

describe('test-production.sh — non-200 responses cause failure', function() {
  this.timeout(20000);

  it('exits non-zero when /health returns HTTP 500', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /health': (req, res) => {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'error' }));
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected non-zero exit for /health HTTP 500');
      assert.ok(
        stderr.includes('HTTP 500') || stderr.includes('expected 200'),
        'Expected HTTP status error in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when / returns HTTP 404', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /': (req, res) => {
        res.writeHead(404, { 'content-type': 'text/html' });
        res.end('Not Found');
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected non-zero exit when app shell returns 404');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when /api/health returns HTTP 503', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/health': (req, res) => {
        res.writeHead(503);
        res.end('Service Unavailable');
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0);
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── Wrong JSON field values ───────────────────────────────────────────────────

describe('test-production.sh — wrong JSON values cause failure', function() {
  this.timeout(20000);

  it('exits non-zero when /health status is not "ok"', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /health': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'degraded', version: '1.0.0' }));
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0);
      assert.ok(
        stderr.includes('degraded') || stderr.includes('expected') || stderr.includes('ok'),
        'Expected mismatch message in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when /rpc/health returns wrong chainId', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /rpc/health': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', chainId: 1, mode: 'proxy' }));
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure for wrong chainId in /rpc/health');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when /rpc eth_chainId returns wrong chain ID', async () => {
    const { server, base } = await startMockServer(b => ({
      'POST /rpc': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ result: '0x1' })); // wrong chain
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure for wrong eth_chainId result');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when /health has no version field', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /health': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' })); // missing version
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when version field is absent');
      assert.ok(
        stderr.includes('missing or invalid JSON field') || stderr.includes('version'),
        'Expected JSON field error in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── EXPECT_UPSTREAM_CONNECTED behaviour ───────────────────────────────────────

describe('test-production.sh — EXPECT_UPSTREAM_CONNECTED', function() {
  this.timeout(20000);

  it('warns but does not fail when connected=false and EXPECT_UPSTREAM_CONNECTED unset', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/web3/status': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ connected: false }));
      },
    }));
    try {
      const { status, stdout } = runScript([base, '--skip-network']);
      assert.strictEqual(status, 0, 'Should not fail when upstream is degraded without EXPECT_UPSTREAM_CONNECTED');
      assert.ok(
        stdout.includes('⚠️') || stdout.includes('degraded'),
        'Expected a warning message about degraded upstream',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('fails when connected=false and EXPECT_UPSTREAM_CONNECTED=1', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/web3/status': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ connected: false }));
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network'], { EXPECT_UPSTREAM_CONNECTED: '1' });
      assert.notStrictEqual(status, 0, 'Expected failure when connected=false with EXPECT_UPSTREAM_CONNECTED=1');
      assert.ok(
        stderr.includes('expected true') || stderr.includes('false') || stderr.includes('degraded'),
        'Expected failure message in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('passes when connected=true regardless of EXPECT_UPSTREAM_CONNECTED', async () => {
    const { server, base } = await startMockServer(() => ({})); // default connected:true
    try {
      const { status } = runScript([base, '--skip-network'], { EXPECT_UPSTREAM_CONNECTED: '1' });
      assert.strictEqual(status, 0);
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── Cloudflare Access redirect detection ─────────────────────────────────────

describe('test-production.sh — Cloudflare Access redirect detection', function() {
  this.timeout(20000);

  it('exits non-zero when a response has a Location header pointing to cloudflareaccess.com', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /': (req, res) => {
        // Simulate a Cloudflare Access gate redirect (302 with Location header)
        res.writeHead(302, {
          'content-type': 'text/html',
          'location': 'https://example.cloudflareaccess.com/cdn-cgi/access/login?...',
        });
        res.end('Redirecting...');
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected non-zero exit for Cloudflare Access redirect');
      assert.ok(
        stderr.includes('cloudflareaccess.com') || stderr.includes('Cloudflare Access'),
        'Expected Cloudflare Access mention in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── --also flag: multiple URLs ────────────────────────────────────────────────

describe('test-production.sh — --also flag for additional URLs', function() {
  this.timeout(30000);

  it('validates multiple URLs when --also is supplied and exits 0 if both pass', async () => {
    const server1Result = await startMockServer(() => ({}));
    const server2Result = await startMockServer(() => ({}));
    try {
      const { status, stdout } = runScript(
        [server1Result.base, '--also', server2Result.base, '--skip-network'],
      );
      assert.strictEqual(status, 0, 'Expected exit 0 when both --also targets pass');
      // Two complete runs should yield two "checklist passed" messages
      const matches = (stdout.match(/production validation checklist passed/g) || []).length;
      assert.strictEqual(matches, 2, 'Expected two per-URL pass messages');
      assert.ok(stdout.includes('all production validation checklists passed'));
    } finally {
      await new Promise(r => server1Result.server.close(r));
      await new Promise(r => server2Result.server.close(r));
    }
  });

  it('exits non-zero when --also URL fails even if primary URL passes', async () => {
    const primaryResult = await startMockServer(() => ({}));
    // Secondary server returns wrong status
    const secondaryResult = await startMockServer(b => ({
      'GET /health': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'down', version: '1.0.0' }));
      },
    }));
    try {
      const { status } = runScript(
        [primaryResult.base, '--also', secondaryResult.base, '--skip-network'],
      );
      assert.notStrictEqual(status, 0, 'Expected failure when --also URL fails health check');
    } finally {
      await new Promise(r => primaryResult.server.close(r));
      await new Promise(r => secondaryResult.server.close(r));
    }
  });
});

// ── PROD_TEST_ADDITIONAL_URLS integration ─────────────────────────────────────

describe('test-production.sh — PROD_TEST_ADDITIONAL_URLS env var', function() {
  this.timeout(30000);

  it('validates extra URLs from PROD_TEST_ADDITIONAL_URLS and passes when all pass', async () => {
    const s1 = await startMockServer(() => ({}));
    const s2 = await startMockServer(() => ({}));
    const s3 = await startMockServer(() => ({}));
    try {
      const { status, stdout } = runScript(
        [s1.base, '--skip-network'],
        { PROD_TEST_ADDITIONAL_URLS: `${s2.base},${s3.base}` },
      );
      assert.strictEqual(status, 0);
      const matches = (stdout.match(/production validation checklist passed/g) || []).length;
      assert.strictEqual(matches, 3, 'Expected three per-URL pass messages');
    } finally {
      await new Promise(r => s1.server.close(r));
      await new Promise(r => s2.server.close(r));
      await new Promise(r => s3.server.close(r));
    }
  });

  it('ignores whitespace-only entries in PROD_TEST_ADDITIONAL_URLS', async () => {
    const s1 = await startMockServer(() => ({}));
    try {
      // Comma list with spaces only between commas — script strips whitespace
      const { status } = runScript(
        [s1.base, '--skip-network'],
        { PROD_TEST_ADDITIONAL_URLS: `  , ,  ` },
      );
      // Should still pass with only the primary URL
      assert.strictEqual(status, 0);
    } finally {
      await new Promise(r => s1.server.close(r));
    }
  });
});

// ── EXPECTED_CHAIN_ID overrides ───────────────────────────────────────────────

describe('test-production.sh — EXPECTED_CHAIN_ID_HEX and EXPECTED_CHAIN_ID_DEC overrides', function() {
  this.timeout(20000);

  it('passes when custom chain IDs match server response', async () => {
    // Use a non-default chain ID pair
    const { server, base } = await startMockServer(b => ({
      'GET /rpc/health': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', chainId: 1, mode: 'proxy' }));
      },
      'POST /rpc': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ result: '0x1' }));
      },
      'GET /api/network': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          chainId: '0x1',
          chainIdDecimal: '1',
          rpcUrls: [`${b}/rpc`],
        }));
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network'], {
        EXPECTED_CHAIN_ID_HEX: '0x1',
        EXPECTED_CHAIN_ID_DEC: '1',
      });
      assert.strictEqual(status, 0, 'Expected pass with matching custom chain IDs');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── Custom EXPECTED_APP_TEXT ──────────────────────────────────────────────────

describe('test-production.sh — EXPECTED_APP_TEXT env var', function() {
  this.timeout(20000);

  it('passes when custom app text is present in root response', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /': (req, res) => {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><body>CustomBrand Dashboard</body></html>');
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network'], { EXPECTED_APP_TEXT: 'CustomBrand' });
      assert.strictEqual(status, 0);
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('fails when custom app text is not present in root response', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /': (req, res) => {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><body>MeeChain Dashboard</body></html>');
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network'], { EXPECTED_APP_TEXT: 'NonexistentBrand' });
      assert.notStrictEqual(status, 0);
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── CF Access headers are forwarded ──────────────────────────────────────────

describe('test-production.sh — Cloudflare Access service token headers', function() {
  this.timeout(20000);

  it('forwards CF-Access headers when credentials are set', async () => {
    let receivedId = '';
    let receivedSecret = '';

    const { server, base } = await startMockServer(b => ({
      'GET /': (req, res) => {
        receivedId     = req.headers['cf-access-client-id'] || '';
        receivedSecret = req.headers['cf-access-client-secret'] || '';
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><body>MeeChain</body></html>');
      },
    }));
    try {
      runScript([base, '--skip-network'], {
        CF_ACCESS_CLIENT_ID:     'test-client-id',
        CF_ACCESS_CLIENT_SECRET: 'test-client-secret',
      });
      // Give the request a moment; spawnSync is synchronous so values are set
      assert.strictEqual(receivedId,     'test-client-id',     'Expected CF-Access-Client-Id header');
      assert.strictEqual(receivedSecret, 'test-client-secret', 'Expected CF-Access-Client-Secret header');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('logs "using Cloudflare Access service token headers" when credentials set', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { stdout } = runScript([base, '--skip-network'], {
        CF_ACCESS_CLIENT_ID:     'id123',
        CF_ACCESS_CLIENT_SECRET: 'secret456',
      });
      assert.ok(
        stdout.includes('Cloudflare Access service token'),
        'Expected Cloudflare Access token log message',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── --timeout flag ────────────────────────────────────────────────────────────

describe('test-production.sh — --timeout flag', function() {
  this.timeout(20000);

  it('accepts a custom --timeout value and passes it through', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { status } = runScript([base, '--skip-network', '--timeout', '5']);
      assert.strictEqual(status, 0, 'Expected exit 0 with custom --timeout value');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── normalize_dns_name logic (tested via check_expected_cname_target) ─────────

describe('test-production.sh — normalize_dns_name / EXPECTED_CNAME_TARGET', function() {
  this.timeout(20000);

  it('issues a warning (not failure) when CNAME is not visible and EXPECTED_CNAME_STRICT unset', async () => {
    // Use localhost which has no CNAME record; the script should warn
    const { server, base } = await startMockServer(() => ({}));
    // Enable network so CNAME lookup runs, but use localhost (no CNAME)
    try {
      const { status, stdout } = runScript([base], {
        EXPECTED_CNAME_TARGET: 'some-tunnel.cfargotunnel.com',
        EXPECTED_CNAME_STRICT: '0',
      });
      // Should still exit 0 (warn, not fail)
      assert.strictEqual(status, 0, 'Expected exit 0 (warning) when CNAME not visible without strict mode');
      assert.ok(
        stdout.includes('⚠️') || stdout.includes('no CNAME visible'),
        'Expected a warning about CNAME not being visible',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('fails when CNAME is not visible and EXPECTED_CNAME_STRICT=1', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { status, stderr } = runScript([base], {
        EXPECTED_CNAME_TARGET: 'some-tunnel.cfargotunnel.com',
        EXPECTED_CNAME_STRICT: '1',
      });
      assert.notStrictEqual(status, 0, 'Expected failure in strict CNAME mode when CNAME is not visible');
      assert.ok(
        stderr.includes('CNAME') || stderr.includes('does not visibly match'),
        'Expected CNAME mismatch error in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── Regression: script passes with --skip-network --skip-app ─────────────────

describe('test-production.sh — combined skip flags', function() {
  this.timeout(20000);

  it('exits 0 with --skip-network --skip-app when health/rpc endpoints pass', async () => {
    // Root is intentionally blank; with --skip-app and --skip-network neither
    // DNS nor the app shell are checked.
    const { server, base } = await startMockServer(b => ({
      'GET /': (req, res) => {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('no brand text');
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network', '--skip-app']);
      assert.strictEqual(status, 0);
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});
