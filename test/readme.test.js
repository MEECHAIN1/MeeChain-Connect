'use strict';
/**
 * Tests for README.md (Usage section updated in PR).
 *
 * The PR adds a clarifying comment (`# from the project root`) above the
 * `node server.js` command in the "## Usage" code block. These tests verify
 * that the Usage section's fenced code block has the expected shape and
 * that the advertised command actually matches how the project is started
 * (per package.json's "start" script and the presence of server.js).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it, before } = require('mocha');

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT, 'README.md');
const PKG_PATH = path.join(ROOT, 'package.json');

/**
 * Extract the content of the first fenced code block that appears after a
 * given Markdown heading (e.g. "## Usage"), up to the next heading or the
 * next fenced code block delimiter.
 */
function extractCodeBlockAfterHeading(content, heading) {
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) return null;

  const afterHeading = content.slice(headingIndex + heading.length);
  const fenceMatch = afterHeading.match(/```[^\n]*\n([\s\S]*?)```/);
  if (!fenceMatch) return null;

  return fenceMatch[1];
}

// ── Fixtures (loaded once) ────────────────────────────────────────────────────

let readmeContent = '';
let pkg = {};
let usageBlock = '';
let usageLines = [];

before(() => {
  readmeContent = fs.readFileSync(README_PATH, 'utf8');
  pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  usageBlock = extractCodeBlockAfterHeading(readmeContent, '## Usage') || '';
  usageLines = usageBlock.split('\n').filter(line => line.length > 0);
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe('README.md — file integrity', () => {
  it('exists on disk', () => {
    assert.ok(fs.existsSync(README_PATH), `Expected ${README_PATH} to exist`);
  });

  it('is non-empty', () => {
    assert.ok(readmeContent.length > 0, 'File should not be empty');
  });

  it('contains a "## Usage" heading', () => {
    assert.ok(
      readmeContent.includes('## Usage'),
      'Expected README to contain a "## Usage" section'
    );
  });
});

describe('README.md — Usage section code block', () => {
  it('has a fenced code block directly under "## Usage"', () => {
    assert.ok(
      usageBlock !== null && usageBlock.length > 0,
      'Expected a non-empty fenced code block after "## Usage"'
    );
  });

  it('contains exactly two lines: a comment and the run command', () => {
    assert.strictEqual(
      usageLines.length,
      2,
      `Expected Usage code block to contain exactly 2 non-empty lines, found ${usageLines.length}: ${JSON.stringify(usageLines)}`
    );
  });

  it('first line is the "# from the project root" comment', () => {
    assert.strictEqual(
      usageLines[0],
      '# from the project root',
      'Expected first line of the Usage code block to be the clarifying comment'
    );
  });

  it('second line is the "node server.js" command', () => {
    assert.strictEqual(
      usageLines[1],
      'node server.js',
      'Expected second line of the Usage code block to be "node server.js"'
    );
  });

  it('comment line precedes the command line (correct ordering)', () => {
    const commentIndex = usageBlock.indexOf('# from the project root');
    const commandIndex = usageBlock.indexOf('node server.js');
    assert.ok(
      commentIndex !== -1 && commandIndex !== -1 && commentIndex < commandIndex,
      'Expected the comment to appear before the command in the Usage code block'
    );
  });

  it('comment line starts with "#" (valid shell comment syntax)', () => {
    assert.ok(
      usageLines[0].startsWith('#'),
      'Expected the clarifying line to be a valid shell comment'
    );
  });
});

describe('README.md — Usage command matches project configuration', () => {
  it('server.js referenced in the Usage section exists at the project root', () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, 'server.js')),
      'Expected server.js to exist at the project root, matching the Usage instructions'
    );
  });

  it('package.json "start" script matches the documented "node server.js" command', () => {
    assert.strictEqual(
      pkg.scripts && pkg.scripts.start,
      'node server.js',
      'Expected package.json "start" script to match the README Usage command'
    );
  });
});

describe('README.md — regression / boundary checks', () => {
  it('Usage code block does not leak the following prose line into the block', () => {
    assert.ok(
      !usageBlock.includes('เปิดเว็บที่'),
      'Usage code block should not include the prose that follows it in the document'
    );
  });

  it('Usage code block has no leading/trailing blank lines', () => {
    const rawLines = usageBlock.split('\n');
    // The captured block always ends with a trailing newline before the
    // closing fence, so drop that final empty segment before checking edges.
    const trimmedRawLines = rawLines[rawLines.length - 1] === ''
      ? rawLines.slice(0, -1)
      : rawLines;
    assert.notStrictEqual(trimmedRawLines[0], '', 'Unexpected leading blank line');
    assert.notStrictEqual(
      trimmedRawLines[trimmedRawLines.length - 1],
      '',
      'Unexpected trailing blank line'
    );
  });

  it('extractCodeBlockAfterHeading helper returns null for a missing heading', () => {
    const result = extractCodeBlockAfterHeading(readmeContent, '## Nonexistent Section');
    assert.strictEqual(result, null);
  });

  it('extractCodeBlockAfterHeading helper correctly isolates a block from surrounding text', () => {
    const sample = '## Usage\nSome intro text\n```bash\n# comment\ncommand --flag\n```\nTrailing text';
    const result = extractCodeBlockAfterHeading(sample, '## Usage');
    assert.strictEqual(result, '# comment\ncommand --flag\n');
  });
});