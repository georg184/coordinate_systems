'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const IGNORED_DIRECTORIES = new Set(['.git', '_site', 'node_modules']);

function collectJavaScriptFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(absolutePath);
    }
  }
  return files;
}

const javaScriptFiles = collectJavaScriptFiles(ROOT).sort();
assert.ok(javaScriptFiles.length > 0, 'No local JavaScript files found.');

for (const absolutePath of javaScriptFiles) {
  const relativePath = path.relative(ROOT, absolutePath);
  const result = childProcess.spawnSync(process.execPath, ['--check', relativePath], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  if (result.error) {
    throw result.error;
  }
  assert.equal(
    result.status,
    0,
    `JavaScript syntax check failed for ${relativePath}:\n${result.stdout || ''}${result.stderr || ''}`
  );
}

console.log(`JavaScript syntax verified for ${javaScriptFiles.length} local files`);
