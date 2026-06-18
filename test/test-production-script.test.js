




















































































































































































































































































































































































































































































































































































































































































































































































































































    }
  });
});

// ── --skip-network flag alone ─────────────────────────────────────────────────

describe('test-production.sh — --skip-network flag standalone', function() {
  this.timeout(20000);

  it('skips DNS check and emits "skipping external network checks" message', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { status, stdout } = runScript([base, '--skip-network']);
      assert.strictEqual(status, 0, 'Expected exit 0 with --skip-network');
      assert.ok(
        stdout.includes('skipping external network checks'),
        'Expected skip message in stdout',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── /rpc/health missing required JSON fields ──────────────────────────────────

describe('test-production.sh — /rpc/health missing fields', function() {
  this.timeout(20000);

  it('exits non-zero when /rpc/health response is missing the "mode" field', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /rpc/health': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        // No "mode" field — should trigger assert_json_field_present failure
        res.end(JSON.stringify({ status: 'ok', chainId: 13390 }));
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when /rpc/health has no mode field');
      assert.ok(
        stderr.includes('missing or invalid JSON field') || stderr.includes('mode'),
        'Expected JSON field error in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when /rpc/health response is missing "status" field', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /rpc/health': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ chainId: 13390, mode: 'proxy' }));
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when /rpc/health has no status field');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── /api/network field mismatches ─────────────────────────────────────────────

describe('test-production.sh — /api/network field validation', function() {
  this.timeout(20000);

  it('exits non-zero when /api/network returns wrong chainId hex', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/network': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          chainId: '0x1',           // wrong — expected 0x344e
          chainIdDecimal: '13390',
          rpcUrls: [`${b}/rpc`],
        }));
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when network chainId hex is wrong');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when /api/network returns wrong chainIdDecimal', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/network': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          chainId: '0x344e',
          chainIdDecimal: '1',      // wrong — expected 13390
          rpcUrls: [`${b}/rpc`],
        }));
      },
    }));
    try {
      const { status } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when network chainIdDecimal is wrong');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when /api/network rpcUrls[0] does not match base URL', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/network': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          chainId: '0x344e',
          chainIdDecimal: '13390',
          rpcUrls: ['https://wrong.example.com/rpc'],  // doesn't match base
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
});

// ── /rpc eth_blockNumber missing result field ─────────────────────────────────

describe('test-production.sh — /rpc eth_blockNumber missing result', function() {
  this.timeout(20000);

  it('exits non-zero when /rpc eth_blockNumber response has no result field', async () => {
    const { server, base } = await startMockServer(b => ({
      'POST /rpc': (req, res) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          let method = '';
          try { method = JSON.parse(body).method; } catch (_) { /* ignore */ }
          res.writeHead(200, { 'content-type': 'application/json' });
          if (method === 'eth_blockNumber') {
            // Missing result field
            res.end(JSON.stringify({ id: 2 }));
          } else {
            res.end(JSON.stringify({ result: '0x344e' }));
          }
        });
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure when eth_blockNumber has no result field');
      assert.ok(
        stderr.includes('missing or invalid JSON field') || stderr.includes('result'),
        'Expected JSON field error in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── Partial Cloudflare Access credentials ─────────────────────────────────────

describe('test-production.sh — partial Cloudflare Access credentials', function() {
  this.timeout(20000);

  it('does not forward CF-Access headers when only client ID is set (secret missing)', async () => {
    let receivedId = null;

    const { server, base } = await startMockServer(b => ({
      'GET /': (req, res) => {
        receivedId = req.headers['cf-access-client-id'] || null;
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><body>MeeChain</body></html>');
      },
    }));
    try {
      runScript([base, '--skip-network'], {
        CF_ACCESS_CLIENT_ID: 'only-the-id',
        CF_ACCESS_CLIENT_SECRET: '',
      });
      // Without both credentials the ACCESS_HEADERS block is skipped
      assert.strictEqual(receivedId, null, 'Expected no CF-Access-Client-Id header when secret is absent');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('does not forward CF-Access headers when only secret is set (ID missing)', async () => {
    let receivedSecret = null;

    const { server, base } = await startMockServer(b => ({
      'GET /': (req, res) => {
        receivedSecret = req.headers['cf-access-client-secret'] || null;
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><body>MeeChain</body></html>');
      },
    }));
    try {
      runScript([base, '--skip-network'], {
        CF_ACCESS_CLIENT_ID: '',
        CF_ACCESS_CLIENT_SECRET: 'only-the-secret',
      });
      assert.strictEqual(receivedSecret, null, 'Expected no CF-Access-Client-Secret header when ID is absent');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── PROD_TEST_TIMEOUT env var ─────────────────────────────────────────────────

describe('test-production.sh — PROD_TEST_TIMEOUT env var', function() {
  this.timeout(20000);

  it('uses PROD_TEST_TIMEOUT when --timeout is not specified', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      // A valid timeout; if the env var is honoured the run should still pass
      const { status, stdout } = runScript([base, '--skip-network'], { PROD_TEST_TIMEOUT: '8' });
      assert.strictEqual(status, 0, 'Expected exit 0 with PROD_TEST_TIMEOUT env override');
      // The header line prints "Timeout : Xs"
      assert.ok(stdout.includes('Timeout'), 'Expected Timeout header in output');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('--timeout flag overrides PROD_TEST_TIMEOUT env var', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { status, stdout } = runScript(
        [base, '--skip-network', '--timeout', '7'],
        { PROD_TEST_TIMEOUT: '3' },
      );
      assert.strictEqual(status, 0, 'Expected exit 0 when --timeout overrides env var');
      assert.ok(stdout.includes('Timeout'), 'Expected Timeout header in output');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── Header/banner output ──────────────────────────────────────────────────────

describe('test-production.sh — output banner and header lines', function() {
  this.timeout(20000);

  it('prints "MeeChain production validation" banner', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { stdout } = runScript([base, '--skip-network']);
      assert.ok(
        stdout.includes('MeeChain production validation'),
        'Expected production validation banner in output',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('prints the Base URL and Timeout lines in the header', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      const { stdout } = runScript([base, '--skip-network']);
      assert.ok(stdout.includes('Base URL:'), 'Expected "Base URL:" header line');
      assert.ok(stdout.includes('Timeout'), 'Expected "Timeout" header line');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── Multiple --also flags ─────────────────────────────────────────────────────

describe('test-production.sh — multiple --also flags', function() {
  this.timeout(30000);

  it('accepts more than one --also flag and validates all URLs', async () => {
    const s1 = await startMockServer(() => ({}));
    const s2 = await startMockServer(() => ({}));
    const s3 = await startMockServer(() => ({}));
    try {
      const { status, stdout } = runScript([
        s1.base,
        '--also', s2.base,
        '--also', s3.base,
        '--skip-network',
      ]);
      assert.strictEqual(status, 0, 'Expected exit 0 with two --also targets');
      const matches = (stdout.match(/production validation checklist passed/g) || []).length;
      assert.strictEqual(matches, 3, 'Expected three per-URL pass messages (primary + 2 --also)');
    } finally {
      await new Promise(r => s1.server.close(r));
      await new Promise(r => s2.server.close(r));
      await new Promise(r => s3.server.close(r));
    }
  });
});

// ── connected field edge cases ────────────────────────────────────────────────

describe('test-production.sh — web3 status connected field edge cases', function() {
  this.timeout(20000);

  it('warns but passes when connected is null and EXPECT_UPSTREAM_CONNECTED unset', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/web3/status': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ connected: null }));
      },
    }));
    try {
      // json_field exits 3 for null — assert_json_field_truthy_or_warn calls
      // json_field which exits 3, so the outer `|| fail` branch fires.
      // The script fails because null is treated as a missing/invalid field.
      const { status } = runScript([base, '--skip-network']);
      // null causes json_field to exit(3), so the script should fail
      assert.notStrictEqual(status, 0, 'Expected failure when connected is null');
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('exits non-zero when /api/web3/status JSON body is invalid', async () => {
    const { server, base } = await startMockServer(b => ({
      'GET /api/web3/status': (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('not-json-at-all');
      },
    }));
    try {
      const { status, stderr } = runScript([base, '--skip-network']);
      assert.notStrictEqual(status, 0, 'Expected failure for invalid JSON in /api/web3/status');
      assert.ok(
        stderr.includes('missing or invalid JSON field') || stderr.includes('invalid'),
        'Expected JSON parse error in stderr',
      );
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── -k short form for --insecure ──────────────────────────────────────────────

describe('test-production.sh — -k short flag for --insecure', function() {
  this.timeout(20000);

  it('accepts -k as an alias for --insecure without parse error', async () => {
    const { server, base } = await startMockServer(() => ({}));
    try {
      // -k should not cause "Unknown option" error; use --skip-network to avoid DNS
      const { status, stderr } = runScript([base, '-k', '--skip-network']);
      assert.notStrictEqual(stderr.includes('Unknown option'), true, 'Expected -k to be recognised');
      assert.strictEqual(status, 0, 'Expected exit 0 with -k flag');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

// ── /api/health wrong status value ────────────────────────────────────────────

describe('test-production.sh — /api/health field validation', function() {
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

// ── Regression: run_checks_for_base_url normalises its own input ──────────────

describe('test-production.sh — run_checks_for_base_url URL normalisation', function() {
  this.timeout(20000);

  it('strips a trailing slash from the base URL before making requests', async () => {
    // The server should receive /health, not //health
    const receivedPaths = [];
    const { server, base } = await startMockServer(b => ({
      'GET /health': (req, res) => {
        receivedPaths.push(req.url);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }));
      },
    }));
    const trailingSlashBase = base + '/';
    try {
      const { status } = runScript([trailingSlashBase, '--skip-network']);
      // If normalisation works, health endpoints respond correctly and we exit 0
      assert.strictEqual(status, 0, 'Expected exit 0 after trailing-slash normalisation');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});
