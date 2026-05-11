'use strict';
/**
 * Tests for README.md (rewritten in PR: "MeeChain Dashboard → MeeChain Connect").
 *
 * Strategy: the document's primary contract is that every script path and file
 * it advertises to users actually exists on disk, and that the structural claims
 * (title, sections, endpoints, env vars, run modes) are accurate.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it, before } = require('mocha');

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT, 'README.md');
const ENV_EXAMPLE_PATH = path.join(ROOT, '.env.example');

/** Extract all `bash scripts/<name>.sh` paths mentioned in the document. */
function extractScriptPaths(content) {
  const pattern = /scripts\/([\w.-]+\.sh)/g;
  const scripts = new Set();
  let m;
  while ((m = pattern.exec(content)) !== null) {
    scripts.add(m[1]);
  }
  return [...scripts];
}

/** Extract all env var names from a dotenv-style block in the document. */
function extractDocumentedEnvVars(content) {
  // Match lines like `KEY=value` or `KEY=` inside ```env ... ``` blocks
  const envBlockPattern = /```env([\s\S]*?)```/g;
  const vars = [];
  let block;
  while ((block = envBlockPattern.exec(content)) !== null) {
    const lines = block[1].split('\n');
    for (const line of lines) {
      const varMatch = line.match(/^([A-Z][A-Z0-9_]+)=/);
      if (varMatch) vars.push(varMatch[1]);
    }
  }
  return vars;
}

// ── Fixtures (loaded once) ────────────────────────────────────────────────────

let readmeContent = '';

before(() => {
  readmeContent = fs.readFileSync(README_PATH, 'utf8');
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe('README.md — file integrity', () => {
  it('exists on disk', () => {
    assert.ok(fs.existsSync(README_PATH), `Expected ${README_PATH} to exist`);
  });

  it('is non-empty', () => {
    assert.ok(readmeContent.length > 0, 'README.md should not be empty');
  });

  it('has a top-level H1 heading', () => {
    assert.ok(
      /^#\s+.+/m.test(readmeContent),
      'README.md should have an H1 heading'
    );
  });

  it('H1 heading is "MeeChain Connect" (new project title from this PR)', () => {
    assert.ok(
      /^#\s+MeeChain Connect\s*$/m.test(readmeContent),
      'H1 title should be "MeeChain Connect"'
    );
  });

  it('ends with a newline', () => {
    assert.ok(readmeContent.endsWith('\n'), 'README.md should end with a trailing newline');
  });

  it('contains at least 8 H2 sections', () => {
    const h2Count = (readmeContent.match(/^##\s+/gm) || []).length;
    assert.ok(
      h2Count >= 8,
      `Expected ≥ 8 H2 sections, found ${h2Count}`
    );
  });

  it('file size is within a reasonable range (> 500 bytes, < 30 KB)', () => {
    const stat = fs.statSync(README_PATH);
    assert.ok(stat.size > 500, `README.md is suspiciously small: ${stat.size} bytes`);
    assert.ok(stat.size < 30720, `README.md is unexpectedly large: ${stat.size} bytes`);
  });
});

describe('README.md — required sections present', () => {
  const REQUIRED_SECTIONS = [
    'Features',
    'Requirements',
    'Quick Start',
    'Run Modes',
    'Useful Commands',
    'Health Check',
    'PM2',
    'Environment',
    'Project Structure',
    'Notes',
    'License',
  ];

  for (const section of REQUIRED_SECTIONS) {
    it(`contains section "${section}"`, () => {
      assert.ok(
        readmeContent.includes(section),
        `README.md should contain a "${section}" section`
      );
    });
  }
});

describe('README.md — Quick Start commands are correct', () => {
  it('mentions "npm install"', () => {
    assert.ok(readmeContent.includes('npm install'), 'Quick Start should include "npm install"');
  });

  it('mentions ".env.example" (template copy step)', () => {
    assert.ok(
      readmeContent.includes('.env.example'),
      'Quick Start should mention ".env.example"'
    );
  });

  it('mentions "bash scripts/doctor.sh" as setup step', () => {
    assert.ok(
      readmeContent.includes('bash scripts/doctor.sh'),
      'Quick Start should include "bash scripts/doctor.sh"'
    );
  });

  it('mentions "bash scripts/start.sh" as launch step', () => {
    assert.ok(
      readmeContent.includes('bash scripts/start.sh'),
      'Quick Start should include "bash scripts/start.sh"'
    );
  });
});

describe('README.md — Run Modes section covers all supported modes', () => {
  const EXPECTED_MODES = ['pm2', 'docker', 'compose', 'node'];

  for (const mode of EXPECTED_MODES) {
    it(`documents run mode "${mode}" via "bash scripts/start.sh ${mode}"`, () => {
      assert.ok(
        readmeContent.includes(`bash scripts/start.sh ${mode}`),
        `README.md should document run mode "${mode}" with bash scripts/start.sh ${mode}`
      );
    });
  }

  it('documents the "--explain" flag for environment report', () => {
    assert.ok(
      readmeContent.includes('bash scripts/start.sh --explain'),
      'README.md should mention "bash scripts/start.sh --explain"'
    );
  });
});

describe('README.md — referenced shell scripts exist on disk', () => {
  const EXPECTED_SCRIPTS = [
    'doctor.sh',
    'start.sh',
    'stop.sh',
    'status.sh',
    'logs.sh',
  ];

  for (const script of EXPECTED_SCRIPTS) {
    it(`scripts/${script} exists on disk`, () => {
      const scriptPath = path.join(ROOT, 'scripts', script);
      assert.ok(
        fs.existsSync(scriptPath),
        `Expected scripts/${script} to exist (referenced in README.md)`
      );
    });
  }

  it('all script paths extracted from README.md resolve to existing files', () => {
    const mentionedScripts = extractScriptPaths(readmeContent);
    const missing = mentionedScripts.filter(
      s => !fs.existsSync(path.join(ROOT, 'scripts', s))
    );
    assert.strictEqual(
      missing.length,
      0,
      `README.md references scripts that do not exist on disk: ${missing.join(', ')}`
    );
  });
});

describe('README.md — referenced project files exist on disk', () => {
  const PROJECT_FILES = [
    'server.js',
    'ecosystem.config.cjs',
    'docker-compose.yml',
    'Dockerfile',
    '.env.example',
  ];

  for (const file of PROJECT_FILES) {
    it(`${file} exists on disk (listed in Project Structure)`, () => {
      const filePath = path.join(ROOT, file);
      assert.ok(
        fs.existsSync(filePath),
        `Expected ${file} to exist (listed in README.md Project Structure)`
      );
    });
  }

  it('src/ directory exists on disk (listed in Project Structure)', () => {
    const srcPath = path.join(ROOT, 'src');
    assert.ok(
      fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory(),
      'Expected src/ directory to exist (listed in README.md Project Structure)'
    );
  });
});

describe('README.md — Health Check endpoints are documented', () => {
  const EXPECTED_ENDPOINTS = ['/health', '/api/health', '/api/config'];

  for (const endpoint of EXPECTED_ENDPOINTS) {
    it(`documents endpoint "${endpoint}"`, () => {
      assert.ok(
        readmeContent.includes(endpoint),
        `README.md should document endpoint "${endpoint}"`
      );
    });
  }

  it('references default port 3000 in health check URLs', () => {
    assert.ok(
      readmeContent.includes('127.0.0.1:3000'),
      'README.md should show health check URLs with default port 3000'
    );
  });
});

describe('README.md — Environment section documents required variables', () => {
  const EXPECTED_ENV_VARS = [
    'PORT',
    'NODE_ENV',
    'CHAIN_ID',
    'DRPC_RPC_URL',
    'VITE_RPC_URL',
    'OPENAI_API_KEY',
    'OPENAI_BASE_URL',
  ];

  for (const envVar of EXPECTED_ENV_VARS) {
    it(`documents env var "${envVar}"`, () => {
      assert.ok(
        readmeContent.includes(envVar),
        `README.md should document environment variable "${envVar}"`
      );
    });
  }

  it('documents default PORT=3000', () => {
    assert.ok(
      readmeContent.includes('PORT=3000'),
      'README.md should show PORT=3000 as the default port'
    );
  });

  it('documents CHAIN_ID=13390 (MeeChain network ID)', () => {
    assert.ok(
      readmeContent.includes('CHAIN_ID=13390'),
      'README.md should document CHAIN_ID=13390 for MeeChain'
    );
  });

  it('all documented env vars appear in .env.example', () => {
    if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
      // Skip gracefully if .env.example is not present
      return;
    }
    const envExampleContent = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf8');
    const documentedVars = extractDocumentedEnvVars(readmeContent);

    const missingFromExample = documentedVars.filter(v => !envExampleContent.includes(v));
    assert.strictEqual(
      missingFromExample.length,
      0,
      `README.md documents env vars not found in .env.example: ${missingFromExample.join(', ')}`
    );
  });
});

describe('README.md — PM2 section accuracy', () => {
  it('mentions ecosystem.config.cjs for PM2 setup', () => {
    assert.ok(
      readmeContent.includes('ecosystem.config.cjs'),
      'PM2 section should reference ecosystem.config.cjs'
    );
  });

  it('shows "pm2 start ecosystem.config.cjs --env production" command', () => {
    assert.ok(
      readmeContent.includes('pm2 start ecosystem.config.cjs --env production'),
      'PM2 section should show the full pm2 start command'
    );
  });

  it('references "meechain-dashboard" as the PM2 process name', () => {
    assert.ok(
      readmeContent.includes('meechain-dashboard'),
      'PM2 section should use "meechain-dashboard" as the process name'
    );
  });
});

describe('README.md — regression and boundary checks', () => {
  it('title changed from "MeeChain Dashboard" to "MeeChain Connect"', () => {
    // The new title should appear in the H1
    assert.ok(
      readmeContent.includes('MeeChain Connect'),
      'README.md should use the new title "MeeChain Connect"'
    );
    // The old H1 title should NOT be the heading (may appear elsewhere as text)
    assert.ok(
      !/^#\s+MeeChain Dashboard\s*$/m.test(readmeContent),
      'README.md H1 should no longer be "MeeChain Dashboard"'
    );
  });

  it('does not use "npm run install" (common mistake; correct form is "npm install")', () => {
    assert.ok(
      !readmeContent.includes('npm run install'),
      'README.md should not contain "npm run install" — use "npm install" instead'
    );
  });

  it('does not contain placeholder text like "<your-value>" or "TODO"', () => {
    assert.ok(
      !/<your-[\w-]+>/i.test(readmeContent),
      'README.md should not contain unfilled placeholder text like <your-value>'
    );
    assert.ok(
      !/\bTODO\b/.test(readmeContent),
      'README.md should not contain "TODO" markers'
    );
  });

  it('extractScriptPaths helper correctly parses "scripts/start.sh"', () => {
    const result = extractScriptPaths('run `bash scripts/start.sh` to launch');
    assert.ok(result.includes('start.sh'), 'Should extract start.sh from inline reference');
  });

  it('extractDocumentedEnvVars helper correctly parses env blocks', () => {
    const sample = '```env\nPORT=3000\nNODE_ENV=production\n```';
    const vars = extractDocumentedEnvVars(sample);
    assert.deepStrictEqual(vars, ['PORT', 'NODE_ENV']);
  });

  it('extractDocumentedEnvVars handles empty OPENAI_API_KEY (value is blank)', () => {
    const sample = '```env\nOPENAI_API_KEY=\n```';
    const vars = extractDocumentedEnvVars(sample);
    assert.ok(vars.includes('OPENAI_API_KEY'), 'Should extract OPENAI_API_KEY even with empty value');
  });

  it('contains a License section with MIT', () => {
    assert.ok(
      readmeContent.includes('MIT'),
      'README.md should include an MIT license reference'
    );
  });
});
