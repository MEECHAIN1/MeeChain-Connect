#!/usr/bin/env node
import { cp, mkdir, rm, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'dist');

const entries = [
  'index.html',
  'analytics.html',
  'dao.html',
  'explorer.html',
  'nft-market.html',
  'manifest.json',
  '_headers',
  '_redirects',
  'sw.js',
  'src',
  'functions',
  'contracts'
];

async function exists(relPath) {
  try {
    await access(path.join(root, relPath));
    return true;
  } catch {
    return false;
  }
}

async function build() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const entry of entries) {
    if (!(await exists(entry))) {
      console.warn(`[build-pages] skipped missing: ${entry}`);
      continue;
    }
    await cp(path.join(root, entry), path.join(outDir, entry), { recursive: true });
    console.log(`[build-pages] copied: ${entry}`);
  }

  console.log('[build-pages] complete');
}

build().catch((error) => {
  console.error('[build-pages] failed', error);
  process.exit(1);
});
