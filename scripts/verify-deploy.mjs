import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const wranglerPath = path.join(rootDir, 'wrangler.toml');

function readWranglerOutputDir(content) {
  const match = content.match(/^pages_build_output_dir\s*=\s*"([^"]+)"/m);
  return match?.[1] ?? null;
}

function assertPathExists(relPath, kind) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing ${kind}: ${relPath}`);
  }
}

function run() {
  assertPathExists('deploy/public/index.html', 'build output file');
  assertPathExists('deploy/public/src/js/app.js', 'build output file');
  assertPathExists('deploy/public/src/css/main.css', 'build output file');
  assertPathExists('deploy/functions/api/health.js', 'functions output file');

  const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
  const outputDir = readWranglerOutputDir(wranglerContent);

  if (!outputDir) {
    throw new Error('wrangler.toml is missing pages_build_output_dir');
  }

  if (outputDir !== 'deploy/public') {
    throw new Error(`pages_build_output_dir is \"${outputDir}\" but expected \"deploy/public\"`);
  }

  console.log('Deployment verification passed.');
  console.log(`- pages_build_output_dir: ${outputDir}`);
  console.log('- required static assets and functions were found in deploy/');
}

run();
