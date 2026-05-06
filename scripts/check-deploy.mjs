import fs from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'deploy/public/index.html',
  'deploy/public/dao.html',
  'deploy/public/nft-market.html',
  'deploy/public/explorer.html',
  'deploy/public/analytics.html',
  'deploy/public/manifest.json',
  'deploy/public/sw.js',
  'deploy/public/src/js/app.js',
  'deploy/public/src/css/main.css',
  'deploy/functions/api/health.js',
  'deploy/functions/api/chat.js',
  'deploy/functions/api/network.js',
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.resolve(file)));

if (missing.length > 0) {
  console.error('❌ Deploy check failed. Missing files:');
  for (const file of missing) console.error(` - ${file}`);
  process.exit(1);
}

console.log('✅ Deploy check passed. All required deployment artifacts are present.');
