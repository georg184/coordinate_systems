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

const possibleVectorTask = {
  dimension: 2,
  vector: {
    answer: {
      possible: true,
      coordinates: [
        { value: 2 * Math.sqrt(5) },
        { value: -3 }
      ]
    }
  },
  point: null
};
assert.equal(
  quizCore.checkAnswer(possibleVectorTask, ['2sqrt(5)', '-3'], false).correct,
  true
);
assert.equal(
  quizCore.checkAnswer(possibleVectorTask, ['2√5', '-3.0'], false).correct,
  true
);
assert.equal(
  quizCore.checkAnswer(possibleVectorTask, ['sqrt(5)', '-3'], false).correct,
  false
);
assert.equal(
  quizCore.checkAnswer(possibleVectorTask, ['2sqrt(5)', '-3'], true).correct,
  false
);
assert.equal(
  quizCore.checkAnswer(possibleVectorTask, ['', '-3'], false).invalidInput,
  true
);

const impossiblePointTask = {
  dimension: 1,
  vector: null,
  point: {
    answer: { possible: false, coordinates: null }
  }
};
assert.equal(quizCore.checkAnswer(impossiblePointTask, [''], true).correct, true);
assert.equal(quizCore.checkAnswer(impossiblePointTask, ['7'], false).correct, false);

const mixedTask = {
  dimension: 1,
  point: {
    answer: {
      possible: true,
      coordinates: [{ value: -4 }]
    }
  },
  vector: {
    answer: { possible: false, coordinates: null }
  }
};
const correctMixed = quizCore.checkTaskAnswer(mixedTask, {
  point: { coordinates: ['-4'], impossibleSelected: false },
  vector: { coordinates: [''], impossibleSelected: true }
});
assert.equal(correctMixed.correct, true);
assert.equal(correctMixed.invalidInput, false);
assert.equal(correctMixed.objectResults.point.correct, true);
assert.equal(correctMixed.objectResults.vector.correct, true);

const partiallyWrongMixed = quizCore.checkTaskAnswer(mixedTask, {
  point: { coordinates: ['4'], impossibleSelected: false },
  vector: { coordinates: [''], impossibleSelected: true }
});
assert.equal(partiallyWrongMixed.correct, false);
assert.equal(partiallyWrongMixed.invalidInput, false);

const invalidMixed = quizCore.checkTaskAnswer(mixedTask, {
  point: { coordinates: [''], impossibleSelected: false },
  vector: { coordinates: [''], impossibleSelected: true }
});
assert.equal(invalidMixed.correct, false);
assert.equal(invalidMixed.invalidInput, true);
assert.throws(
  () => quizCore.checkAnswer(mixedTask, ['-4'], false),
  /single-object task/
);

console.log('Single-object and mixed coordinate answer contracts verified');
