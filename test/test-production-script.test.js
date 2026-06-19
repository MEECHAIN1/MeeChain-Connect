




















































































































































































































































































































































































































































































































































































































































































































































































































































    }
  });
});

// ── --insecure / -k flag ──────────────────────────────────────────────────────

describe('test-production.sh — --insecure flag', function() {
  this.timeout(20000);

  it('accepts --insecure flag without error and exits 0 against a plain HTTP server', async () => {
    // The mock server is plain HTTP, so --insecure is effectively a no-op here,
    // but it must be accepted without "Unknown option" and must not cause exit 2.
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { status, stderr } = runScript([base, '--insecure', '--skip-network']);
      assert.strictEqual(status, 0, `Expected exit 0 with --insecure; stderr: ${stderr}`);
      assert.ok(!stderr.includes('Unknown option'), 'Expected --insecure to be a recognised flag');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('accepts -k shorthand as an alias for --insecure', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { status, stderr } = runScript([base, '-k', '--skip-network']);
      assert.strictEqual(status, 0, `Expected exit 0 with -k; stderr: ${stderr}`);
      assert.ok(!stderr.includes('Unknown option'), 'Expected -k to be a recognised flag');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── PROD_TEST_TIMEOUT env var ─────────────────────────────────────────────────

describe('test-production.sh — PROD_TEST_TIMEOUT env var', function() {
  this.timeout(20000);

  it('respects PROD_TEST_TIMEOUT env var and displays it in the run header', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { status, stdout } = runScript([base, '--skip-network'], { PROD_TEST_TIMEOUT: '7' });
      assert.strictEqual(status, 0, 'Expected exit 0 with PROD_TEST_TIMEOUT set');
      assert.ok(
        stdout.includes('7s'),
        'Expected timeout value "7s" in header output',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('uses default timeout of 10s when PROD_TEST_TIMEOUT is not set', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { status, stdout } = runScript([base, '--skip-network'], { PROD_TEST_TIMEOUT: '' });
      assert.strictEqual(status, 0);
      assert.ok(stdout.includes('10s'), 'Expected default timeout "10s" in header output');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── /rpc/health missing mode field ───────────────────────────────────────────

describe('test-production.sh — /rpc/health missing mode field causes failure', function() {
  this.timeout(20000);

  it('exits non-zero when /rpc/health response has no mode field', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /rpc/health': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        // mode field deliberately omitted
        res.end(JSON.stringify({ status: 'ok', chainId: 13390 }));
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when mode field is absent from /rpc/health');
      assert.ok(
        stderr.includes('missing or invalid JSON field') || stderr.includes('mode'),
        'Expected JSON field error mentioning mode in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── /api/network wrong chainId values ────────────────────────────────────────

describe('test-production.sh — /api/network wrong JSON values', function() {
  this.timeout(20000);

  it('exits non-zero when /api/network chainId does not match expected hex', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/network': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          chainId: '0x1',        // wrong — should be 0x344e
          chainIdDecimal: '1',   // wrong — should be 13390
          rpcUrls: [`${b}/rpc`],
        }));
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when /api/network chainId is wrong');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when /api/network chainIdDecimal does not match expected decimal', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/network': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          chainId: '0x344e',
          chainIdDecimal: '99999', // wrong decimal
          rpcUrls: [`${b}/rpc`],
        }));
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when /api/network chainIdDecimal is wrong');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when /api/network rpcUrls first entry does not match base URL', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/network': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          chainId: '0x344e',
          chainIdDecimal: '13390',
          rpcUrls: ['https://other.example.com/rpc'], // wrong rpcUrl
        }));
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when rpcUrls[0] does not match base URL');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when /api/network rpcUrls field is absent', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/network': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        // rpcUrls deliberately omitted
        res.end(JSON.stringify({ chainId: '0x344e', chainIdDecimal: '13390' }));
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when rpcUrls is absent');
      assert.ok(
        stderr.includes('missing or invalid JSON field') || stderr.includes('rpcUrl'),
        'Expected error about missing rpcUrls in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── normalize_url: query string and fragment stripping ────────────────────────

describe('test-production.sh — normalize_url strips query and fragment', function() {
  it('strips a query string from the URL and emits normalisation info', () => {
    const { stderr } = runScript(
      ['http://127.0.0.1:1/?foo=bar', '--skip-network'],
    );
    assert.ok(
      stderr.includes('using origin:') || stderr.includes('http://127.0.0.1:1'),
      'Expected normalisation message or origin when URL contains a query string',
    );
  });

  it('strips a fragment from the URL and emits normalisation info', () => {
    const { stderr } = runScript(
      ['http://127.0.0.1:1/#section', '--skip-network'],
    );
    assert.ok(
      stderr.includes('using origin:') || stderr.includes('http://127.0.0.1:1'),
      'Expected normalisation message or origin when URL contains a fragment',
    );
  });
});

// ── CF Access partial credentials ─────────────────────────────────────────────

describe('test-production.sh — CF Access headers with partial credentials', function() {
  this.timeout(20000);

  it('does not add CF Access headers when only CF_ACCESS_CLIENT_ID is set', async () => {
    let receivedId = 'not-set';
    const { server, base } = await startMockServer(b => ({
      'GET /': (req, res) => {
        receivedId = req.headers['cf-access-client-id'] || '';
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><body>MeeChain</body></html>');
      },
    }));
    try {
      runScript([base, '--skip-network'], {
        CF_ACCESS_CLIENT_ID: 'my-id',
        CF_ACCESS_CLIENT_SECRET: '', // secret intentionally missing
      });
      // Header must not be sent when secret is absent
      assert.strictEqual(receivedId, '', 'Expected no CF-Access-Client-Id when secret is absent');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('does not add CF Access headers when only CF_ACCESS_CLIENT_SECRET is set', async () => {
    let receivedSecret = 'not-set';
    const { server, base } = await startMockServer(b => ({
      'GET /': (req, res) => {
        receivedSecret = req.headers['cf-access-client-secret'] || '';
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><body>MeeChain</body></html>');
      },
    }));
    try {
      runScript([base, '--skip-network'], {
        CF_ACCESS_CLIENT_ID: '', // ID intentionally missing
        CF_ACCESS_CLIENT_SECRET: 'my-secret',
      });
      assert.strictEqual(receivedSecret, '', 'Expected no CF-Access-Client-Secret when ID is absent');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('does not log service token message when credentials are absent', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { stdout } = runScript([base, '--skip-network'], {
        CF_ACCESS_CLIENT_ID: '',
        CF_ACCESS_CLIENT_SECRET: '',
      });
      assert.ok(
        !stdout.includes('Cloudflare Access service token'),
        'Expected no service token message when credentials are not set',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── /api/web3/status missing connected field ──────────────────────────────────

describe('test-production.sh — /api/web3/status missing connected field', function() {
  this.timeout(20000);

  it('exits non-zero when /api/web3/status has no connected field', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/web3/status': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        // connected field deliberately omitted
        res.end(JSON.stringify({ status: 'ok' }));
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when connected field is absent');
      assert.ok(
        stderr.includes('missing or invalid JSON field') || stderr.includes('connected'),
        'Expected JSON field error in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── /api/health wrong status value ────────────────────────────────────────────

describe('test-production.sh — /api/health wrong status value', function() {
  this.timeout(20000);

  it('exits non-zero when /api/health status is not "ok"', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/health': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'error' }));
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when /api/health status is not "ok"');
      assert.ok(
        stderr.includes('error') || stderr.includes('expected') || stderr.includes('ok'),
        'Expected mismatch message in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── eth_blockNumber result must be present ────────────────────────────────────

describe('test-production.sh — eth_blockNumber result field', function() {
  this.timeout(20000);

  it('exits non-zero when /rpc eth_blockNumber response has no result field', async () => {
    const { server, base } = await startMockServer(b => ({
      'POST /rpc': (req, res) => {
        let body = '';
        req.on('data', c => { body += c; });
        req.on('end', () => {
          let method = '';
          try { method = JSON.parse(body).method; } catch (_) { /* ignore */ }
          res.writeHead(200, { 'content-type': 'application/json' });
          if (method === 'eth_blockNumber') {
            // Respond without result field to trigger failure
            res.end(JSON.stringify({ error: { code: -32000, message: 'not available' } }));
          } else {
            res.end(JSON.stringify({ result: '0x344e' }));
          }
        });
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when eth_blockNumber result is absent');
      assert.ok(
        stderr.includes('missing or invalid JSON field') || stderr.includes('result'),
        'Expected JSON field error in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── Regression: /rpc/health RPC status not "ok" ───────────────────────────────

describe('test-production.sh — /rpc/health status field regression', function() {
  this.timeout(20000);

  it('exits non-zero when /rpc/health status is not "ok"', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /rpc/health': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'degraded', chainId: 13390, mode: 'proxy' }));
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when /rpc/health status is not "ok"');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});
