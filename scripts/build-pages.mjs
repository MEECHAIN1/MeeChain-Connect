#!/usr/bin/env node
import { cpSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const distDir = join(projectRoot, 'dist');

const includeFiles = new Set(['_headers', '_redirects', 'manifest.json', 'sw.js', 'worker.js', 'cloudflare-worker.js']);
const includeExt = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.txt', '.xml']);
const skipDirs = new Set(['node_modules', '.git', '.venv', 'dist', 'test', 'tests', 'attached_assets']);

mkdirSync(distDir, { recursive: true });

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (skipDirs.has(entry)) continue;
    const abs = join(dir, entry);
    const rel = abs.slice(projectRoot.length + 1);
    const st = statSync(abs);
    if (st.isDirectory()) {
      walk(abs);
      continue;
    }

    const ext = entry.includes('.') ? entry.slice(entry.lastIndexOf('.')) : '';
    if (!includeFiles.has(entry) && !includeExt.has(ext)) continue;

    const dest = join(distDir, rel);
    mkdirSync(join(dest, '..'), { recursive: true });
    cpSync(abs, dest, { force: true });
  }
}

walk(projectRoot);
console.log('Static pages build complete: dist/');
import { access } from 'node:fs/promises';
import path from 'node:path';

const requiredFiles = [
  'index.html',
  'analytics.html',
  'dao.html',
  'explorer.html',
  'nft-market.html',
];

async function main() {
  const missing = [];

  for (const file of requiredFiles) {
    const target = path.resolve(process.cwd(), file);
    try {
      await access(target);
    } catch {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    console.error(`Build failed: missing required page files: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('Build completed: static pages are ready for deployment.');
}

main().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
