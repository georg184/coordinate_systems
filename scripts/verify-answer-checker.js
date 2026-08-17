'use strict';

const assert = require('node:assert/strict');
const quizCore = require('../js/quiz-core.js');

function assertParsed(expression, expected) {
  const actual = quizCore.parseCoordinateExpression(expression);
  assert.ok(actual !== null, `Expected ${expression} to be parsed.`);
  assert.ok(
    Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)),
    `${expression}: expected ${expected}, received ${actual}`
  );
}

assertParsed('3', 3);
assertParsed('-4', -4);
assertParsed('1,5', 1.5);
assertParsed('3/2', 1.5);
assertParsed('sqrt(5)', Math.sqrt(5));
assertParsed('2sqrt(5)', 2 * Math.sqrt(5));
assertParsed('2√5', 2 * Math.sqrt(5));
assertParsed('2\\sqrt{5}', 2 * Math.sqrt(5));
assertParsed('-(sqrt(8)/2)', -Math.sqrt(2));
assert.equal(quizCore.parseCoordinateExpression(''), null);
assert.equal(quizCore.parseCoordinateExpression('sqrt(-1)'), null);
assert.equal(quizCore.parseCoordinateExpression('1/0'), null);
assert.equal(quizCore.parseCoordinateExpression('process.exit()'), null);
assert.equal(quizCore.parseCoordinateExpression('2**3'), null);

const possibleTask = {
  dimension: 2,
  answer: {
    possible: true,
    coordinates: [
      { value: 2 * Math.sqrt(5) },
      { value: -3 }
    ]
  }
};
assert.equal(
  quizCore.checkAnswer(possibleTask, ['2sqrt(5)', '-3'], false).correct,
  true
);
assert.equal(
  quizCore.checkAnswer(possibleTask, ['2√5', '-3.0'], false).correct,
  true
);
assert.equal(
  quizCore.checkAnswer(possibleTask, ['sqrt(5)', '-3'], false).correct,
  false
);
assert.equal(
  quizCore.checkAnswer(possibleTask, ['2sqrt(5)', '-3'], true).correct,
  false
);
assert.equal(
  quizCore.checkAnswer(possibleTask, ['', '-3'], false).invalidInput,
  true
);

const impossibleTask = {
  dimension: 1,
  answer: { possible: false, coordinates: null }
};
assert.equal(quizCore.checkAnswer(impossibleTask, [''], true).correct, true);
assert.equal(quizCore.checkAnswer(impossibleTask, ['7'], false).correct, false);

console.log('Coordinate expression and answer-checker contracts verified');
