import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, request } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://app.meechain.live';
const OUTPUT_DIR = path.join(process.cwd(), 'test-results', 'browser-regression');

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function preflightApiChecks() {
  const api = await request.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { 'User-Agent': 'MeeChain Browser Regression' },
  });

  const checks = [];
  const getTargets = ['/api/health', '/api/web3/status', '/api/network'];

  for (const target of getTargets) {
    const response = await api.get(target);
    const body = await response.text();
    checks.push({
      method: 'GET',
      target,
      ok: response.ok(),
      status: response.status(),
      bodyPreview: body.slice(0, 220),
    });
  }

  const mintResponse = await api.post('/api/nft/mint', {
    data: {},
    failOnStatusCode: false,
  });
  checks.push({
    method: 'POST',
    target: '/api/nft/mint',
    ok: mintResponse.status() === 400,
    status: mintResponse.status(),
    bodyPreview: (await mintResponse.text()).slice(0, 220),
  });

  await api.dispose();
  return checks;
}

async function runBrowserChecks() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      baseURL: BASE_URL,
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 1100 },
    });

    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    page.on('requestfailed', (requestItem) => {
      requestFailures.push({
        url: requestItem.url(),
        error: requestItem.failure()?.errorText || 'unknown',
      });
    });

    const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    ensure(response, `No response returned from ${BASE_URL}`);
    if (response.status() >= 400) {
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'http-error.png'), fullPage: true });
      await writeFile(path.join(OUTPUT_DIR, 'http-error.html'), await page.content(), 'utf8');
      throw new Error(`${BASE_URL} returned HTTP ${response.status()}`);
    }

    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForSelector('#block-number', { timeout: 15000 });
    await page.waitForSelector('#net-chain-id', { timeout: 15000 });
    await page.waitForSelector('#connect-wallet-btn', { timeout: 15000 });

    const dashboard = await page.evaluate(() => ({
      title: document.title,
      blockNumber: document.querySelector('#block-number')?.textContent?.trim() || '',
      chainIdChip: document.querySelector('#net-chain-id')?.textContent?.trim() || '',
      tokenChip: document.querySelector('#net-token')?.textContent?.trim() || '',
      nftChip: document.querySelector('#net-nft')?.textContent?.trim() || '',
      portalChip: document.querySelector('#net-portal')?.textContent?.trim() || '',
    }));

    ensure(Boolean(dashboard.blockNumber), 'Dashboard block number is empty');
    ensure(Boolean(dashboard.chainIdChip), 'Chain ID chip is empty');
    ensure(Boolean(dashboard.tokenChip), 'Token contract chip is empty');
    ensure(Boolean(dashboard.nftChip), 'NFT contract chip is empty');
    ensure(Boolean(dashboard.portalChip), 'Portal contract chip is empty');

    await page.locator('.nav-item[data-page="nft-market"]').click();
    await page.waitForTimeout(800);
    await page.click('#create-nft-btn');
    await page.waitForSelector('#create-nft-modal:not(.hidden)', { timeout: 5000 });
    await page.fill('#nft-name', 'Regression MeeBot');
    await page.fill('#nft-desc', 'Browser regression smoke test');
    await page.fill('#nft-price', '5');
    await page.click('#mint-nft-btn');
    await page.waitForSelector('.toast.warning, .toast.error, .toast.success', { timeout: 5000 });

    const mintToast = await page.locator('.toast').last().innerText();
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard.png'), fullPage: true });
    await page.click('#create-nft-modal-close');

    await page.locator('.nav-item[data-page="staking"]').click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'staking.png'), fullPage: true });

    const stakingVisible = await page.locator('#page-staking').evaluate((node) =>
      node.classList.contains('active')
    );
    ensure(stakingVisible, 'Staking page did not become active');

    return {
      pageStatus: response.status(),
      finalUrl: page.url(),
      dashboard,
      mintToast,
      consoleErrors,
      pageErrors,
      requestFailures,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const report = {
    baseUrl: BASE_URL,
    startedAt: new Date().toISOString(),
    apiChecks: [],
    browser: null,
    success: false,
  };

  try {
    report.apiChecks = await preflightApiChecks();
    report.browser = await runBrowserChecks();
    report.success = true;
  } catch (error) {
    report.success = false;
    report.error = error.message;
  }

  const reportPath = path.join(OUTPUT_DIR, 'report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Report:   ${reportPath}`);

  for (const check of report.apiChecks) {
    console.log(`${check.method} ${check.target} -> ${check.status} ${check.ok ? 'OK' : 'FAIL'}`);
  }

  if (report.browser) {
    console.log(`Page:     ${report.browser.pageStatus} ${report.browser.finalUrl}`);
    console.log(`Mint UI:  ${report.browser.mintToast}`);
    console.log(`Errors:   console=${report.browser.consoleErrors.length} page=${report.browser.pageErrors.length} request=${report.browser.requestFailures.length}`);
  }

  if (!report.success) {
    console.error(`Regression failed: ${report.error}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
