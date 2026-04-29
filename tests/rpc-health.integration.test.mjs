import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const PORT = 3105;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await wait(250);
  }
  throw new Error(`Server did not become ready in ${timeoutMs}ms`);
}

test('GET /rpc/health returns expected structure + rpc mode state', async () => {
  const child = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'integration-test-key',
      RPC_MODE: 'mock-only',
      RPC_ALLOW_MOCK_FALLBACK: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForServer(`${BASE_URL}/health`);

    const healthResp = await fetch(`${BASE_URL}/rpc/health`);
    assert.equal(healthResp.status, 200);
    const health = await healthResp.json();

    assert.equal(health.status, 'ok');
    assert.equal(health.service, 'MeeChain RPC Gateway');
    assert.equal(health.chainId, 13390);
    assert.equal(health.mode, 'mock-only');
    assert.equal(typeof health.rpc, 'string');
    assert.equal(typeof health.web3, 'boolean');
    assert.equal(typeof health.uptime, 'number');
    assert.equal(typeof health.version, 'string');
    assert.equal(typeof health.ts, 'string');

    assert.equal(typeof health.rpcState, 'object');
    assert.equal(typeof health.rpcState.allowMockFallback, 'boolean');
    assert.ok(Array.isArray(health.rpcState.upstreams));

    const statusResp = await fetch(`${BASE_URL}/api/rpc/status`);
    assert.equal(statusResp.status, 200);
    const status = await statusResp.json();

    assert.equal(status.mode, 'mock-only');
    assert.equal(status.allowMockFallback, true);
    assert.equal(typeof status.timeoutMs, 'number');
    assert.equal(typeof status.breakerCooldownMs, 'number');
    assert.equal(typeof status.breakerFailureThreshold, 'number');
    assert.ok(Array.isArray(status.upstreams));
    assert.ok(status.upstreams.length >= 1);

    const rpcResp = await fetch(`${BASE_URL}/rpc`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    });
    assert.equal(rpcResp.status, 200);
    const rpcJson = await rpcResp.json();
    assert.equal(rpcJson.jsonrpc, '2.0');
    assert.equal(rpcJson.id, 1);
    assert.equal(rpcJson.result, '0x344e');
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      await new Promise((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) return resolve();
        child.once('exit', resolve);
      });
    }
  }

  assert.equal(stderr.includes('Missing credentials'), false, 'server should boot in test with dummy key');
});
