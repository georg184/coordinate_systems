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
assert.match(
  indexSource,
  new RegExp(`>v${version.replace(/(\d{4})(\d{2})(\d{2})\./, '$1\\.$2\\.$3\\.')}`)
);

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

assert.match(indexSource, /<title>Koordinatisieren von Punkten und Vektoren<\/title>/);
assert.match(indexSource, /id="introScreen" class="screen intro-screen"/);
assert.match(indexSource, /id="quizScreen" class="screen quiz-screen hidden"/);
assert.match(indexSource, /id="startVectorsButton"/);
assert.match(indexSource, /id="startPointsButton"/);
assert.match(indexSource, /id="startMixedButton"/);
assert.match(indexSource, /id="backButton"/);
assert.match(indexSource, /id="resultHomeButton"/);
assert.match(cssSource, /\.intro-choice-list\s*\{[^}]*repeat\(3,/s);
assert.match(appSource, /startQuiz\(QUIZ_MODES\.vectors\)/);
assert.match(appSource, /startQuiz\(QUIZ_MODES\.points\)/);
assert.match(appSource, /startQuiz\(QUIZ_MODES\.mixed\)/);
assert.match(appSource, /applyLanguage\(\);\s*showScreen\('intro'\);/);

for (const language of ['de', 'en', 'fr']) {
  assert.match(appSource, new RegExp(`\\n  ${language}: \\{`), `Missing ${language} translations.`);
}
assert.match(appSource, /Koordinatisieren von Punkten und Vektoren/);
assert.match(appSource, /Coordinates of Points and Vectors/);
assert.match(appSource, /Coordonnées de points et de vecteurs/);
assert.match(appSource, /one-dimensional coordinate system/);
assert.match(appSource, /eindimensionalen Koordinatensystem/);
assert.match(appSource, /repère à une dimension/);
assert.ok((appSource.match(/&shy;/g) || []).length >= 18, 'Missing multilingual discretionary hyphens.');

for (const id of [
  'xCoordinateInput',
  'yCoordinateInput',
  'pointXCoordinateInput',
  'pointYCoordinateInput'
]) {
  assert.match(indexSource, new RegExp(`id="${id}"[^>]*placeholder=" "`));
}
assert.equal((indexSource.match(/placeholder=" "/g) || []).length, 4);
assert.doesNotMatch(indexSource, /placeholder="[A-Za-z]+_[xy]"/);
assert.match(indexSource, /id="xCoordinatePlaceholder"[^>]*>\\\(v_x\\\)<\/span>/);
assert.match(indexSource, /id="yCoordinatePlaceholder"[^>]*>\\\(v_y\\\)<\/span>/);
assert.match(indexSource, /id="pointXCoordinatePlaceholder"[^>]*>\\\(P_x\\\)<\/span>/);
assert.match(indexSource, /id="pointYCoordinatePlaceholder"[^>]*>\\\(P_y\\\)<\/span>/);
assert.match(appSource, /renderMath\(group\.xPlaceholder, `\\\\\(\$\{object\.name\.latex\}_\{x\}\\\\\)`\)/);
assert.match(appSource, /renderMath\(group\.yPlaceholder, `\\\\\(\$\{object\.name\.latex\}_\{y\}\\\\\)`\)/);
assert.match(cssSource, /\.coordinate-input-placeholder mjx-container\s*\{[^}]*background: transparent !important/s);
assert.match(cssSource, /input:not\(:placeholder-shown\) \+ \.coordinate-input-placeholder\s*\{[^}]*visibility: hidden/s);
assert.doesNotMatch(cssSource, /\.coordinate-input-placeholder[^{]*\{[^}]*text-shadow/s);

assert.equal((indexSource.match(/class="coordinate-parenthesis parenthesis-left"/g) || []).length, 2);
assert.equal((indexSource.match(/class="coordinate-parenthesis parenthesis-right"/g) || []).length, 2);
assert.doesNotMatch(indexSource, /coordinate-bracket|bracket-left|bracket-right/);
assert.match(cssSource, /\.coordinate-parenthesis\s*\{[^}]*translateY\(-5px\) scaleX\(0\.62\)/s);
assert.match(cssSource, /\.dimension-one \.coordinate-parenthesis\s*\{[^}]*translateY\(-5px\) scaleX\(0\.62\)/s);
assert.match(cssSource, /\.task-question\s*\{[^}]*text-align: justify;/s);
assert.match(cssSource, /\.task-question\s*\{[^}]*text-align-last: left;/s);
assert.match(cssSource, /\.task-question\s*\{[^}]*hyphens: auto;/s);

assert.match(coreSource, /const QUIZ_MODES = Object\.freeze/);
assert.match(coreSource, /const POINT_NAMES = Object\.freeze/);
assert.match(coreSource, /const POINT_COLORS = Object\.freeze/);
assert.match(coreSource, /generateAbsoluteTask\(mode, random\)/);
assert.match(coreSource, /showOrigin: true/);
assert.doesNotMatch(coreSource, /showAxisLabels: false/);
assert.match(coreSource, /showOrigin: false/);
assert.match(coreSource, /showAxisLabels: true/);
assert.match(appSource, /if \(task\.showAxisLabels\)/);
assert.match(appSource, /if \(task\.showOrigin\)/);
assert.match(appSource, /const labelDirection = task\.showOrigin[\s\S]*direction\.x \/ 2[\s\S]*direction\.y \/ 2/);
assert.match(appSource, /'diagram-label-origin',\s*'\\\\\(O\\\\\)'/s);
assert.match(appSource, /direction\.x \/ 2/);
assert.match(appSource, /direction\.y \/ 2/);
assert.match(appSource, /if \(task\.dimension === 1\) \{\s*svg\.appendChild\(createSvgElement\('circle', \{\s*class: 'origin-marker'/s);
assert.match(appSource, /class: 'origin-marker'[\s\S]*fill: AXIS_COLOR/);
assert.match(appSource, /createSvgElement\('circle', \{\s*class: 'point-marker'/s);
assert.match(appSource, /class: 'vector-shaft'/);
const appendVectorSource = appSource.match(/function appendVector[\s\S]*?\n\}\n\nfunction appendPoint/);
assert.ok(appendVectorSource, 'Missing isolated vector renderer.');
assert.doesNotMatch(appendVectorSource[0], /createSvgElement\('circle'/);
assert.match(appSource, /markerDefinition\('vector-arrow', task\.vector\.color/);
assert.match(appSource, /markerDefinition\('axis-arrow', AXIS_COLOR/);
assert.match(appSource, /function magnitudeLabelPoint\(\)/);
assert.match(appSource, /magnitudeLabelPoint\(\),\s*'diagram-label-magnitude'/);
assert.match(cssSource, /\.diagram-label-magnitude\s*\{[^}]*translate\(-100%, -100%\)/s);

assert.match(indexSource, /id="pointImpossibleButton"/);
assert.match(indexSource, /id="impossibleButton"/);
assert.match(appSource, /quizCore\.checkTaskAnswer\(currentTask, submissions\)/);
assert.match(appSource, /taskObjectKinds\(currentTask\)/);
assert.match(coreSource, /function checkTaskAnswer\(/);
assert.match(coreSource, /function coordinatePointLatex\(/);
assert.doesNotMatch(appSource, /\\\\left\[/);

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

console.log(`Point, vector, mixed-mode, MathJax, and cache contracts verified for ${version}`);
