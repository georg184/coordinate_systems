'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const coreSource = fs.readFileSync(path.join(ROOT, 'js/quiz-core.js'), 'utf8');
const mathJaxSource = fs.readFileSync(path.join(ROOT, 'js/mathjax-config.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf8');
const workflowSource = fs.readFileSync(
  path.join(ROOT, '.github/workflows/deploy-pages.yml'),
  'utf8'
);

const versionMatch = indexSource.match(/window\.GG_APP_VERSION = '([^']+)'/);
assert.ok(versionMatch, 'index.html does not declare GG_APP_VERSION.');
const version = versionMatch[1];
assert.match(appSource, new RegExp(`const APP_VERSION = '${version.replace('.', '\\.')}'`));
assert.match(coreSource, new RegExp(`const VERSION = '${version.replace('.', '\\.')}'`));
assert.match(indexSource, new RegExp(`>v${version.replace(/(\d{4})(\d{2})(\d{2})\./, '$1\\.$2\\.$3\\.')}`));

const localAssetPattern = /(?:href|src)="((?:css|js)\/[^"?]+)(?:\?v=([^"&]+))?"/g;
const assets = [];
for (const match of indexSource.matchAll(localAssetPattern)) {
  assets.push({ path: match[1], version: match[2] || null });
}
assert.deepEqual(
  assets.map(asset => asset.path).sort(),
  ['css/styles.css', 'js/app.js', 'js/mathjax-config.js', 'js/quiz-core.js'].sort()
);
for (const asset of assets) {
  assert.equal(asset.version, version, `${asset.path} has a stale cache token.`);
  assert.ok(fs.existsSync(path.join(ROOT, asset.path)), `Missing local asset ${asset.path}.`);
}

assert.match(indexSource, /mathjax@3\.2\.2\/es5\/tex-mml-chtml\.js/);
assert.match(mathJaxSource, /matchFontHeight: false/);
assert.match(cssSource, /\.diagram-label mjx-container[\s\S]*background: transparent !important/);
assert.doesNotMatch(cssSource, /\.diagram-label[^{]*\{[^}]*text-shadow/s);
assert.doesNotMatch(indexSource + appSource, /serviceWorker\.register/);

for (const language of ['de', 'en', 'fr']) {
  assert.match(appSource, new RegExp(`\\n  ${language}: \\{`), `Missing ${language} translations.`);
}
assert.match(appSource, /one-dimensional coordinate system/);
assert.match(appSource, /eindimensionalen Koordinatensystem/);
assert.match(appSource, /repère à une dimension/);
assert.match(indexSource, /id="xCoordinateInput"/);
assert.match(indexSource, /id="yCoordinateInput"/);
assert.match(indexSource, /id="impossibleButton"/);
const fallbackHint = indexSource.match(/<p id="inputHint"[^>]*>([^<]+)<\/p>/);
assert.ok(fallbackHint, 'Missing static German input hint.');
assert.ok(
  appSource.includes(`inputHint: '${fallbackHint[1]}'`),
  'Static German input hint and translation dictionary have drifted.'
);

for (const script of [
  'verify-javascript-syntax.js',
  'verify-task-generation.js',
  'verify-answer-checker.js',
  'verify-static-contract.js',
  'verify-task-flow.js'
]) {
  assert.match(workflowSource, new RegExp(script.replace('.', '\\.')));
}

console.log(`Static app, localization, MathJax, and cache contracts verified for ${version}`);
