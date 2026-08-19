'use strict';

const assert = require('node:assert/strict');
const quizCore = require('../js/quiz-core.js');

const RESERVED_VECTOR_NAMES = new Set(['x', 'y', 'z']);
for (const name of quizCore.VECTOR_NAMES) {
  assert.ok(
    !RESERVED_VECTOR_NAMES.has(name.text),
    `Coordinate-axis symbol ${name.text} must not be used as a vector name.`
  );
}
assert.ok(
  quizCore.POINT_NAMES.every(name => name.text !== 'O'),
  'The origin symbol O must not be used as a point name.'
);

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

function coordinateAlongAxis(displacement, axis) {
  return quizCore.dot(displacement, axis) / Math.sqrt(quizCore.squaredLength(axis));
}

function assertCoordinate(actual, expected, label) {
  assertNear(actual.value, expected, 1e-10, label);
}

function liesOnVectorSegment(point, vector) {
  const start = vector.points.start;
  const end = vector.points.end;
  const firstColumn = point.column - start.column;
  const firstRow = point.row - start.row;
  const segmentColumn = end.column - start.column;
  const segmentRow = end.row - start.row;
  return firstColumn * segmentRow - firstRow * segmentColumn === 0
    && point.column >= Math.min(start.column, end.column)
    && point.column <= Math.max(start.column, end.column)
    && point.row >= Math.min(start.row, end.row)
    && point.row <= Math.max(start.row, end.row);
}

function colorDistanceSquared(first, second) {
  const firstChannels = first.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16));
  const secondChannels = second.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16));
  return firstChannels.reduce(function(total, channel, index) {
    const difference = channel - secondChannels[index];
    return total + difference * difference;
  }, 0);
}

function verifyCoordinateSystem(task) {
  const xAxis = task.coordinateSystem.xAxis;
  assert.ok(quizCore.squaredLength(xAxis) > 0);
  if (task.dimension === 2) {
    const yAxis = task.coordinateSystem.yAxis;
    assert.equal(quizCore.dot(xAxis, yAxis), 0, 'Two-dimensional axes are not orthogonal.');
    assert.equal(
      quizCore.squaredLength(xAxis),
      quizCore.squaredLength(yAxis),
      'Two-dimensional axes do not use the same scale.'
    );
  }

  if (task.mode === quizCore.QUIZ_MODES.vectors) {
    assert.equal(task.coordinateSystem.origin, null);
    assert.equal(task.showOrigin, false);
    assert.equal(task.showAxisLabels, true);
    return;
  }

  assert.equal(task.showOrigin, true);
  assert.equal(task.showAxisLabels, false);
  assert.equal(task.isTilted, false);
  const origin = task.coordinateSystem.origin;
  assert.ok(Number.isInteger(origin.column));
  assert.ok(Number.isInteger(origin.row));
  assert.ok(origin.column >= quizCore.CONFIG.originMinColumn);
  assert.ok(origin.column <= quizCore.CONFIG.originMaxColumn);
  assert.ok(origin.row >= quizCore.CONFIG.originMinRow);
  assert.ok(origin.row <= quizCore.CONFIG.originMaxRow);
  assert.equal(quizCore.squaredLength(xAxis), 1);
  if (task.dimension === 2) {
    assert.equal(Math.abs(xAxis.dx), 1);
    assert.equal(xAxis.dy, 0);
    assert.equal(task.coordinateSystem.yAxis.dx, 0);
    assert.equal(Math.abs(task.coordinateSystem.yAxis.dy), 1);
  }
}

function verifyVector(task) {
  const vector = task.vector;
  assert.ok(vector);
  assert.ok(Number.isInteger(vector.dx));
  assert.ok(Number.isInteger(vector.dy));
  assert.notEqual(quizCore.squaredLength(vector), 0);
  assert.ok(!RESERVED_VECTOR_NAMES.has(vector.name.text));
  assert.ok(quizCore.VECTOR_COLORS.includes(vector.color));
  assert.notEqual(vector.color.toLowerCase(), '#cf2f3f');
  assert.equal(vector.showMagnitude, task.isTilted);
  assert.ok(vector.magnitude.value > 0);

  assert.equal(vector.points.end.column - vector.points.start.column, vector.dx);
  assert.equal(vector.points.start.row - vector.points.end.row, vector.dy);
  for (const point of [vector.points.start, vector.points.end]) {
    assert.ok(Number.isInteger(point.column));
    assert.ok(Number.isInteger(point.row));
    assert.ok(point.column >= quizCore.CONFIG.vectorMinColumn);
    assert.ok(point.column <= quizCore.CONFIG.vectorMaxColumn);
    assert.ok(point.row >= quizCore.CONFIG.vectorMinRow);
    assert.ok(point.row <= quizCore.CONFIG.vectorMaxRow);
  }

  const xAxis = task.coordinateSystem.xAxis;
  if (task.dimension === 1) {
    assert.equal(
      vector.answer.possible,
      quizCore.isParallel(vector, xAxis),
      'Vector representability does not match parallelism.'
    );
    if (vector.answer.possible) {
      assert.equal(vector.answer.coordinates.length, 1);
      assertCoordinate(
        vector.answer.coordinates[0],
        coordinateAlongAxis(vector, xAxis),
        'One-dimensional vector coordinate'
      );
    } else {
      assert.equal(vector.answer.coordinates, null);
      assert.equal(quizCore.coordinateVectorLatex(task), null);
    }
    return;
  }

  assert.equal(vector.answer.possible, true);
  assert.equal(vector.answer.coordinates.length, 2);
  assertCoordinate(
    vector.answer.coordinates[0],
    coordinateAlongAxis(vector, xAxis),
    'Vector x-coordinate'
  );
  assertCoordinate(
    vector.answer.coordinates[1],
    coordinateAlongAxis(vector, task.coordinateSystem.yAxis),
    'Vector y-coordinate'
  );
  if (task.systemKind === 'rotated') {
    const parallelToX = quizCore.isParallel(vector, xAxis);
    const parallelToY = quizCore.isParallel(vector, task.coordinateSystem.yAxis);
    assert.notEqual(parallelToX, parallelToY);
    assert.equal(vector.showMagnitude, true);
  }
}

function verifyPoint(task) {
  const point = task.point;
  assert.ok(point);
  assert.ok(quizCore.POINT_NAMES.some(name => name.text === point.name.text));
  assert.ok(quizCore.POINT_COLORS.includes(point.color));
  assert.notEqual(point.color.toLowerCase(), '#cf2f3f');
  assert.ok(point.position.column >= quizCore.CONFIG.pointMinColumn);
  assert.ok(point.position.column <= quizCore.CONFIG.pointMaxColumn);
  assert.ok(point.position.row >= quizCore.CONFIG.pointMinRow);
  assert.ok(point.position.row <= quizCore.CONFIG.pointMaxRow);
  const expectedDisplacement = quizCore.gridDisplacement(
    task.coordinateSystem.origin,
    point.position
  );
  assert.deepEqual(point.displacement, expectedDisplacement);
  assert.ok(quizCore.squaredLength(point.displacement) >= 4);
  if (task.vector) {
    assert.equal(liesOnVectorSegment(point.position, task.vector), false);
    assert.ok(
      colorDistanceSquared(point.color, task.vector.color) >= 6400,
      'Mixed point and vector colors are too similar.'
    );
  }

  if (task.dimension === 1) {
    assert.equal(
      point.answer.possible,
      quizCore.isParallel(point.displacement, task.coordinateSystem.xAxis),
      'Point representability does not match axis incidence.'
    );
    if (point.answer.possible) {
      assertCoordinate(
        point.answer.coordinates[0],
        coordinateAlongAxis(point.displacement, task.coordinateSystem.xAxis),
        'One-dimensional point coordinate'
      );
    } else {
      assert.equal(point.answer.coordinates, null);
      assert.equal(quizCore.coordinatePointLatex(task), null);
    }
    return;
  }

  assert.equal(point.answer.possible, true);
  assertCoordinate(
    point.answer.coordinates[0],
    coordinateAlongAxis(point.displacement, task.coordinateSystem.xAxis),
    'Point x-coordinate'
  );
  assertCoordinate(
    point.answer.coordinates[1],
    coordinateAlongAxis(point.displacement, task.coordinateSystem.yAxis),
    'Point y-coordinate'
  );
}

function verifyTask(task, expectedMode) {
  assert.ok(Object.isFrozen(task));
  assert.equal(task.mode, expectedMode);
  assert.ok(task.dimension === 1 || task.dimension === 2);
  verifyCoordinateSystem(task);
  assert.equal(Boolean(task.vector), expectedMode !== quizCore.QUIZ_MODES.points);
  assert.equal(Boolean(task.point), expectedMode !== quizCore.QUIZ_MODES.vectors);
  if (task.vector) verifyVector(task);
  if (task.point) verifyPoint(task);
}

function freshCounts() {
  return {
    oneDimensional: 0,
    twoDimensional: 0,
    oneDimensionalCardinal: 0,
    oneDimensionalVectorImpossible: 0,
    oneDimensionalPointImpossible: 0,
    twoDimensionalRotated: 0,
    oneDimensionalDirections: new Map(
      ['1,0', '-1,0', '0,1', '0,-1'].map(key => [key, 0])
    ),
    standardCount: 0,
    standardXPositive: 0,
    standardYPositive: 0
  };
}

function collect(task, counts) {
  if (task.dimension === 1) {
    counts.oneDimensional += 1;
    if (task.systemKind === 'cardinal') {
      counts.oneDimensionalCardinal += 1;
      const axis = task.coordinateSystem.xAxis;
      const key = `${axis.dx},${axis.dy}`;
      counts.oneDimensionalDirections.set(
        key,
        counts.oneDimensionalDirections.get(key) + 1
      );
    }
    if (task.vector && !task.vector.answer.possible) {
      counts.oneDimensionalVectorImpossible += 1;
    }
    if (task.point && !task.point.answer.possible) {
      counts.oneDimensionalPointImpossible += 1;
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

function verifyProbabilityContracts(mode, counts, sampleSize) {
  assertNear(counts.oneDimensional / sampleSize, 0.5, 0.006, `${mode} 1D share`);
  if (mode === quizCore.QUIZ_MODES.vectors) {
    assertNear(
      counts.oneDimensionalCardinal / counts.oneDimensional,
      0.7,
      0.008,
      'Cardinal share among vector-only 1D tasks'
    );
    assertNear(
      counts.twoDimensionalRotated / counts.twoDimensional,
      0.3,
      0.008,
      'Rotated share among vector-only 2D tasks'
    );
  } else {
    assert.equal(counts.oneDimensionalCardinal, counts.oneDimensional);
    assert.equal(counts.twoDimensionalRotated, 0);
  }
  if (mode !== quizCore.QUIZ_MODES.points) {
    assertNear(
      counts.oneDimensionalVectorImpossible / counts.oneDimensional,
      0.3,
      0.008,
      `${mode} impossible vector share among 1D tasks`
    );
  }
  if (mode !== quizCore.QUIZ_MODES.vectors) {
    assertNear(
      counts.oneDimensionalPointImpossible / counts.oneDimensional,
      0.3,
      0.008,
      `${mode} impossible point share among 1D tasks`
    );
  }
  const directionDenominator = counts.oneDimensionalCardinal;
  for (const [direction, count] of counts.oneDimensionalDirections) {
    assertNear(
      count / directionDenominator,
      0.25,
      0.009,
      `${mode} cardinal orientation ${direction}`
    );
  }
  assertNear(
    counts.standardXPositive / counts.standardCount,
    0.5,
    0.011,
    `${mode} standard x orientation`
  );
  assertNear(
    counts.standardYPositive / counts.standardCount,
    0.5,
    0.011,
    `${mode} standard y orientation`
  );
}

const sampleSize = 100000;
const modes = Object.values(quizCore.QUIZ_MODES);
for (let modeIndex = 0; modeIndex < modes.length; modeIndex += 1) {
  const mode = modes[modeIndex];
  const random = seededRandom(0x184c0de + modeIndex * 0x10001);
  const counts = freshCounts();
  for (let index = 0; index < sampleSize; index += 1) {
    const task = quizCore.generateTask(mode, random);
    verifyTask(task, mode);
    collect(task, counts);
  }
  verifyProbabilityContracts(mode, counts, sampleSize);
}

console.log('Vector, point, and mixed geometry contracts verified across 300000 seeded tasks');
