'use strict';

const assert = require('node:assert/strict');
const quizCore = require('../js/quiz-core.js');

function seededRandom(seed) {
  let state = seed >>> 0;
  return function() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function assertNear(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} ± ${tolerance}, received ${actual}`
  );
}

function coordinateAlongAxis(vector, axis) {
  return quizCore.dot(vector, axis) / Math.sqrt(quizCore.squaredLength(axis));
}

function verifyTask(task) {
  assert.ok(Object.isFrozen(task), 'Generated task is not frozen.');
  assert.ok(task.dimension === 1 || task.dimension === 2);
  assert.ok(Number.isInteger(task.vector.dx));
  assert.ok(Number.isInteger(task.vector.dy));
  assert.notEqual(quizCore.squaredLength(task.vector), 0);
  assert.equal(task.showMagnitude, task.isTilted);
  assert.ok(task.magnitude.value > 0);

  const points = task.vector.points;
  assert.equal(points.end.column - points.start.column, task.vector.dx);
  assert.equal(points.start.row - points.end.row, task.vector.dy);
  for (const point of [points.start, points.end]) {
    assert.ok(Number.isInteger(point.column));
    assert.ok(Number.isInteger(point.row));
    assert.ok(point.column >= quizCore.CONFIG.vectorMinColumn);
    assert.ok(point.column <= quizCore.CONFIG.vectorMaxColumn);
    assert.ok(point.row >= quizCore.CONFIG.vectorMinRow);
    assert.ok(point.row <= quizCore.CONFIG.vectorMaxRow);
  }

  const xAxis = task.coordinateSystem.xAxis;
  assert.ok(quizCore.squaredLength(xAxis) > 0);
  if (task.dimension === 1) {
    assert.equal(task.answer.possible, task.isCoordinatePossible);
    assert.equal(
      quizCore.isParallel(task.vector, xAxis),
      task.answer.possible,
      'One-dimensional representability does not match parallelism.'
    );
    if (task.answer.possible) {
      assert.equal(task.answer.coordinates.length, 1);
      assertNear(
        task.answer.coordinates[0].value,
        coordinateAlongAxis(task.vector, xAxis),
        1e-10,
        'One-dimensional coordinate'
      );
    } else {
      assert.equal(task.answer.coordinates, null);
      assert.equal(quizCore.coordinateVectorLatex(task), null);
    }
    return;
  }

  const yAxis = task.coordinateSystem.yAxis;
  assert.equal(quizCore.dot(xAxis, yAxis), 0, 'Two-dimensional axes are not orthogonal.');
  assert.equal(
    quizCore.squaredLength(xAxis),
    quizCore.squaredLength(yAxis),
    'Two-dimensional axes do not use the same scale.'
  );
  assert.equal(task.answer.possible, true);
  assert.equal(task.answer.coordinates.length, 2);
  assertNear(
    task.answer.coordinates[0].value,
    coordinateAlongAxis(task.vector, xAxis),
    1e-10,
    'x-coordinate'
  );
  assertNear(
    task.answer.coordinates[1].value,
    coordinateAlongAxis(task.vector, yAxis),
    1e-10,
    'y-coordinate'
  );
  if (task.systemKind === 'rotated') {
    const parallelToX = quizCore.isParallel(task.vector, xAxis);
    const parallelToY = quizCore.isParallel(task.vector, yAxis);
    assert.notEqual(parallelToX, parallelToY, 'Rotated task must use exactly one parallel axis.');
    assert.ok(task.showMagnitude, 'Rotated task does not display the vector magnitude.');
  }
}

const sampleSize = 100000;
const random = seededRandom(0x184c0de);
const counts = {
  oneDimensional: 0,
  oneDimensionalCardinal: 0,
  oneDimensionalImpossible: 0,
  impossibleOverall: 0,
  twoDimensional: 0,
  twoDimensionalRotated: 0,
  cardinalDirections: new Map(['1,0', '-1,0', '0,1', '0,-1'].map(key => [key, 0])),
  standardXPositive: 0,
  standardYPositive: 0,
  standardCount: 0
};

for (let index = 0; index < sampleSize; index += 1) {
  const task = quizCore.generateTask(random);
  verifyTask(task);
  if (task.dimension === 1) {
    counts.oneDimensional += 1;
    if (task.systemKind === 'cardinal') {
      counts.oneDimensionalCardinal += 1;
      const key = `${task.coordinateSystem.xAxis.dx},${task.coordinateSystem.xAxis.dy}`;
      counts.cardinalDirections.set(key, counts.cardinalDirections.get(key) + 1);
    }
    if (!task.answer.possible) {
      counts.oneDimensionalImpossible += 1;
      counts.impossibleOverall += 1;
    }
  } else {
    counts.twoDimensional += 1;
    if (task.systemKind === 'rotated') {
      counts.twoDimensionalRotated += 1;
    } else {
      counts.standardCount += 1;
      if (task.coordinateSystem.xAxis.dx > 0) counts.standardXPositive += 1;
      if (task.coordinateSystem.yAxis.dy > 0) counts.standardYPositive += 1;
    }
  }
}

assertNear(counts.oneDimensional / sampleSize, 0.5, 0.006, '1D share');
assertNear(counts.impossibleOverall / sampleSize, 0.15, 0.005, 'Overall impossible share');
assertNear(
  counts.oneDimensionalCardinal / counts.oneDimensional,
  0.7,
  0.008,
  'Cardinal share among 1D tasks'
);
assertNear(
  counts.oneDimensionalImpossible / counts.oneDimensional,
  0.3,
  0.008,
  'Impossible share among 1D tasks'
);
assertNear(
  counts.twoDimensionalRotated / counts.twoDimensional,
  0.3,
  0.008,
  'Rotated share among 2D tasks'
);
for (const [direction, count] of counts.cardinalDirections) {
  assertNear(
    count / counts.oneDimensionalCardinal,
    0.25,
    0.008,
    `Cardinal orientation ${direction}`
  );
}
assertNear(counts.standardXPositive / counts.standardCount, 0.5, 0.01, 'Standard x orientation');
assertNear(counts.standardYPositive / counts.standardCount, 0.5, 0.01, 'Standard y orientation');

console.log('Task geometry and probability contracts verified across 100000 seeded tasks');
