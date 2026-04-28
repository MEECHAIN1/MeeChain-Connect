#!/usr/bin/env node
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
