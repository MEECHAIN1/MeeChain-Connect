'use strict';
/**
 * Tests for CONTRIBUTOR_QUICKSTART.md (added in PR).
 *
 * Strategy: the document's primary contract is that every npm command it
 * advertises to contributors actually exists as a script in package.json.
 * Secondary checks validate structure (required sections, code blocks, tables).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it, before } = require('mocha');

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const DOC_PATH = path.join(ROOT, 'CONTRIBUTOR_QUICKSTART.md');
const PKG_PATH = path.join(ROOT, 'package.json');

/** Return all backtick-quoted tokens that look like npm run <script> or npm <cmd>. */
function extractNpmCommands(content) {
  // Match `npm run <name>` and bare `npm <verb>` inside backticks
  const pattern = /`(npm(?:\s+run)?\s+[\w:]+)`/g;
  const commands = [];
  let m;
  while ((m = pattern.exec(content)) !== null) {
    commands.push(m[1].trim());
  }
  return commands;
}

/** Parse a command like "npm run foo" or "npm test" into the script key used
 *  in package.json (e.g. "foo" or "test"). */
function scriptKeyFromCommand(cmd) {
  // "npm run foo:bar" → "foo:bar"
  const runMatch = cmd.match(/^npm\s+run\s+([\w:]+)$/);
  if (runMatch) return runMatch[1];
  // "npm test" → "test", "npm start" → "start"
  const shortMatch = cmd.match(/^npm\s+([\w:]+)$/);
  if (shortMatch) return shortMatch[1];
  return null;
}

// ── Fixtures (loaded once) ────────────────────────────────────────────────────

let docContent = '';
let pkg = {};

before(() => {
  docContent = fs.readFileSync(DOC_PATH, 'utf8');
  pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe('CONTRIBUTOR_QUICKSTART.md — file integrity', () => {
  it('exists on disk', () => {
    assert.ok(fs.existsSync(DOC_PATH), `Expected ${DOC_PATH} to exist`);
  });

  it('is non-empty', () => {
    assert.ok(docContent.length > 0, 'File should not be empty');
  });

  it('has a top-level H1 heading', () => {
    assert.ok(
      /^#\s+.+/m.test(docContent),
      'Document should start with an H1 heading'
    );
  });

  it('ends with a newline', () => {
    assert.ok(docContent.endsWith('\n'), 'File should end with a trailing newline');
  });

  it('contains at least 6 H2 sections', () => {
    const h2Sections = (docContent.match(/^##\s+/gm) || []).length;
    assert.ok(
      h2Sections >= 6,
      `Expected ≥ 6 H2 sections, found ${h2Sections}`
    );
  });
});

describe('CONTRIBUTOR_QUICKSTART.md — required sections', () => {
  const REQUIRED_SECTIONS = [
    'Script Reference',
    'Infrastructure',
    'Blockchain',
    'Testing',
    'Documentation',
  ];

  for (const section of REQUIRED_SECTIONS) {
    it(`contains a section for "${section}"`, () => {
      assert.ok(
        docContent.includes(section),
        `Expected document to contain section "${section}"`
      );
    });
  }

  it('contains dependency installation instructions', () => {
    assert.ok(
      docContent.includes('npm install'),
      'Expected document to mention "npm install"'
    );
  });

  it('contains npm audit fix instruction', () => {
    assert.ok(
      docContent.includes('npm audit fix'),
      'Expected document to mention "npm audit fix"'
    );
  });
});

describe('CONTRIBUTOR_QUICKSTART.md — npm commands reference valid package.json scripts', () => {
  it('package.json has a scripts section', () => {
    assert.ok(
      pkg.scripts && typeof pkg.scripts === 'object',
      'package.json should have a scripts object'
    );
  });

  it('every `npm run <script>` command in the doc exists in package.json', () => {
    const commands = extractNpmCommands(docContent);
    const missing = [];

    for (const cmd of commands) {
      const key = scriptKeyFromCommand(cmd);
      if (!key) continue;
      // "install" and "audit" are npm built-ins, not package.json scripts
      if (['install', 'audit'].includes(key)) continue;
      if (!pkg.scripts[key]) {
        missing.push(`\`${cmd}\` (key: "${key}")`);
      }
    }

    assert.strictEqual(
      missing.length,
      0,
      `The following commands in CONTRIBUTOR_QUICKSTART.md have no corresponding script in package.json:\n  ${missing.join('\n  ')}`
    );
  });
});

describe('CONTRIBUTOR_QUICKSTART.md — Script Reference table', () => {
  // Every script listed in the table header row must appear as a backtick token
  const TABLE_SCRIPTS = [
    'start',
    'dev',
    'build',
    'deploy:worker',
    'hardhat',
    'deploy',
    'test',
    'test:rpc',
    'infra:start',
    'infra:start:podman',
    'infra:start:docker',
    'infra:start:pm2',
    'container:build',
    'docs',
    'docs:watch',
  ];

  for (const script of TABLE_SCRIPTS) {
    it(`lists script \`${script}\` in the Script Reference table`, () => {
      // Match the script name wrapped in backticks anywhere in the document
      const pattern = new RegExp('`' + script.replace(/:/g, ':') + '`');
      assert.ok(
        pattern.test(docContent),
        `Expected Script Reference table to list \`${script}\``
      );
    });
  }

  it('has three columns in the Script Reference table header', () => {
    // The header row should contain "Script", a Thai column, and another Thai column
    const headerLine = docContent
      .split('\n')
      .find(line => line.includes('Script') && line.includes('|'));
    assert.ok(headerLine, 'Could not find the Script Reference table header row');
    const cols = headerLine.split('|').filter(c => c.trim().length > 0);
    assert.strictEqual(cols.length, 3, `Expected 3 columns in Script Reference table header, got ${cols.length}`);
  });

  it('Script Reference table has at least 14 data rows', () => {
    // Count pipe-delimited rows that contain backtick script names
    const tableRows = docContent
      .split('\n')
      .filter(line => /^\|.*`[\w:]+`.*\|/.test(line) && !line.includes('---'));
    assert.ok(
      tableRows.length >= 14,
      `Expected ≥ 14 script rows in Script Reference table, found ${tableRows.length}`
    );
  });
});

describe('CONTRIBUTOR_QUICKSTART.md — Testing section commands', () => {
  const TESTING_COMMANDS = [
    { cmd: 'npm test', script: 'test' },
    { cmd: 'npm run test:rpc', script: 'test:rpc' },
    { cmd: 'npm run test:prod', script: 'test:prod' },
    { cmd: 'npm run test:browser:live', script: 'test:browser:live' },
  ];

  for (const { cmd, script } of TESTING_COMMANDS) {
    it(`Testing section mentions \`${cmd}\` which exists in package.json`, () => {
      assert.ok(
        docContent.includes(cmd),
        `Expected Testing section to include command \`${cmd}\``
      );
      assert.ok(
        pkg.scripts[script] !== undefined,
        `Expected package.json to define script "${script}" (referenced by \`${cmd}\`)`
      );
    });
  }
});

describe('CONTRIBUTOR_QUICKSTART.md — Infrastructure section commands', () => {
  const INFRA_COMMANDS = [
    { cmd: 'npm run infra:start', script: 'infra:start' },
    { cmd: 'npm run infra:start:podman', script: 'infra:start:podman' },
    { cmd: 'npm run infra:start:docker', script: 'infra:start:docker' },
    { cmd: 'npm run infra:start:pm2', script: 'infra:start:pm2' },
  ];

  for (const { cmd, script } of INFRA_COMMANDS) {
    it(`Infrastructure section mentions \`${cmd}\` which exists in package.json`, () => {
      assert.ok(
        docContent.includes(cmd),
        `Expected Infrastructure section to include command \`${cmd}\``
      );
      assert.ok(
        pkg.scripts[script] !== undefined,
        `Expected package.json to define script "${script}"`
      );
    });
  }
});

describe('CONTRIBUTOR_QUICKSTART.md — Blockchain section commands', () => {
  it('Blockchain section mentions `npm run hardhat`', () => {
    assert.ok(
      docContent.includes('npm run hardhat'),
      'Expected Blockchain section to include `npm run hardhat`'
    );
    assert.ok(
      pkg.scripts['hardhat'] !== undefined,
      'Expected package.json to define script "hardhat"'
    );
  });

  it('Blockchain section mentions `npm run deploy`', () => {
    assert.ok(
      docContent.includes('npm run deploy'),
      'Expected Blockchain section to include `npm run deploy`'
    );
    assert.ok(
      pkg.scripts['deploy'] !== undefined,
      'Expected package.json to define script "deploy"'
    );
  });
});

describe('CONTRIBUTOR_QUICKSTART.md — Documentation section commands', () => {
  it('Documentation section mentions `npm run docs`', () => {
    assert.ok(
      docContent.includes('npm run docs'),
      'Expected Documentation section to include `npm run docs`'
    );
    assert.ok(
      pkg.scripts['docs'] !== undefined,
      'Expected package.json to define script "docs"'
    );
  });

  it('Documentation section mentions `npm run docs:watch`', () => {
    assert.ok(
      docContent.includes('npm run docs:watch'),
      'Expected Documentation section to include `npm run docs:watch`'
    );
    assert.ok(
      pkg.scripts['docs:watch'] !== undefined,
      'Expected package.json to define script "docs:watch"'
    );
  });
});

describe('CONTRIBUTOR_QUICKSTART.md — regression / boundary checks', () => {
  it('file size is within a reasonable range (> 500 bytes, < 20 KB)', () => {
    const stat = fs.statSync(DOC_PATH);
    assert.ok(stat.size > 500, `File is suspiciously small: ${stat.size} bytes`);
    assert.ok(stat.size < 20480, `File is unexpectedly large: ${stat.size} bytes`);
  });

  it('contains no broken npm run commands (all script names are non-empty)', () => {
    const badPattern = /`npm run\s*`/g;
    assert.ok(
      !badPattern.test(docContent),
      'Document contains a `npm run` with no script name following it'
    );
  });

  it('does not reference a script called "install" via `npm run install`', () => {
    // "npm run install" is a common mistake; correct form is "npm install"
    assert.ok(
      !docContent.includes('npm run install'),
      'Document should use `npm install`, not `npm run install`'
    );
  });

  it('no duplicate script names appear in the Script Reference table', () => {
    const tableSection = docContent.split('---')[0]; // before the first HR
    const scriptNames = [];
    const rowPattern = /^\|\s*`([\w:]+)`/gm;
    let m;
    while ((m = rowPattern.exec(tableSection)) !== null) {
      scriptNames.push(m[1]);
    }
    const unique = new Set(scriptNames);
    assert.strictEqual(
      scriptNames.length,
      unique.size,
      `Duplicate script names found in Script Reference table: ${scriptNames.filter((s, i) => scriptNames.indexOf(s) !== i)}`
    );
  });

  it('extractNpmCommands helper correctly parses `npm run foo:bar`', () => {
    const result = extractNpmCommands('use `npm run foo:bar` to do it');
    assert.deepStrictEqual(result, ['npm run foo:bar']);
  });

  it('scriptKeyFromCommand helper returns correct key for `npm run test:rpc`', () => {
    assert.strictEqual(scriptKeyFromCommand('npm run test:rpc'), 'test:rpc');
  });

  it('scriptKeyFromCommand helper returns correct key for bare `npm test`', () => {
    assert.strictEqual(scriptKeyFromCommand('npm test'), 'test');
  });

  it('scriptKeyFromCommand helper returns null for unrecognised patterns', () => {
    assert.strictEqual(scriptKeyFromCommand('npx hardhat node'), null);
  });
});
