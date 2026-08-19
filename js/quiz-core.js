(function(root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.GGCoordinateQuizCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const VERSION = '20260819.5';
  const QUIZ_MODES = Object.freeze({
    vectors: 'vectors',
    points: 'points',
    mixed: 'mixed'
  });
  const CONFIG = Object.freeze({
    oneDimensionalProbability: 0.5,
    oneDimensionalCardinalProbability: 0.7,
    oneDimensionalImpossibleProbability: 0.3,
    twoDimensionalRotatedProbability: 0.3,
    axisLengthScaleMin: 1,
    axisLengthScaleMax: 1.6,
    vectorMinColumn: 9,
    vectorMaxColumn: 21,
    vectorMinRow: 1,
    vectorMaxRow: 11,
    pointMinColumn: 1,
    pointMaxColumn: 21,
    pointMinRow: 1,
    pointMaxRow: 13,
    originMinColumn: 3,
    originMaxColumn: 7,
    originMinRow: 2,
    originMaxRow: 12
  });

  // Coordinate-axis symbols stay reserved for component indices.
  const VECTOR_NAMES = Object.freeze([
    Object.freeze({ text: 'a', latex: 'a' }),
    Object.freeze({ text: 'b', latex: 'b' }),
    Object.freeze({ text: 'c', latex: 'c' }),
    Object.freeze({ text: 'u', latex: 'u' }),
    Object.freeze({ text: 'v', latex: 'v' }),
    Object.freeze({ text: 'w', latex: 'w' })
  ]);
  const POINT_NAMES = Object.freeze([
    Object.freeze({ text: 'A', latex: 'A' }),
    Object.freeze({ text: 'B', latex: 'B' }),
    Object.freeze({ text: 'C', latex: 'C' }),
    Object.freeze({ text: 'P', latex: 'P' }),
    Object.freeze({ text: 'Q', latex: 'Q' }),
    Object.freeze({ text: 'R', latex: 'R' })
  ]);

  const VECTOR_COLORS = Object.freeze([
    '#145ca8',
    '#0b7463',
    '#6f42a5',
    '#9a5d00',
    '#006d8f',
    '#5a6f18'
  ]);
  const POINT_COLORS = Object.freeze([
    '#9c2c77',
    '#7b4f00',
    '#08726a',
    '#5b4bb7',
    '#2f6d1f',
    '#9b431d'
  ]);

  const CARDINAL_DIRECTIONS = Object.freeze([
    Object.freeze({ dx: 1, dy: 0 }),
    Object.freeze({ dx: -1, dy: 0 }),
    Object.freeze({ dx: 0, dy: 1 }),
    Object.freeze({ dx: 0, dy: -1 })
  ]);
  const HORIZONTAL_DIRECTIONS = Object.freeze([
    CARDINAL_DIRECTIONS[0],
    CARDINAL_DIRECTIONS[1]
  ]);
  const VERTICAL_DIRECTIONS = Object.freeze([
    CARDINAL_DIRECTIONS[2],
    CARDINAL_DIRECTIONS[3]
  ]);

  // One representative per unoriented grid slope. A random sign supplies
  // both orientations without changing the recorded slope family.
  const DIAGONAL_DIRECTIONS = Object.freeze([
    Object.freeze({ dx: 1, dy: 1 }),
    Object.freeze({ dx: 1, dy: -1 }),
    Object.freeze({ dx: 1, dy: 2 }),
    Object.freeze({ dx: 1, dy: -2 }),
    Object.freeze({ dx: 2, dy: 1 }),
    Object.freeze({ dx: 2, dy: -1 })
  ]);

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  function assertRandom(random) {
    if (typeof random !== 'function') {
      throw new TypeError('random must be a function.');
    }
    return random;
  }

  function assertQuizMode(mode) {
    if (!Object.values(QUIZ_MODES).includes(mode)) {
      throw new RangeError(`Unknown quiz mode: ${mode}`);
    }
    return mode;
  }

  function randomInt(min, max, random) {
    return Math.floor(assertRandom(random)() * (max - min + 1)) + min;
  }

  function randomChoice(items, random) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new RangeError('A non-empty choice list is required.');
    }
    return items[randomInt(0, items.length - 1, random)];
  }

  function randomSign(random) {
    return assertRandom(random)() < 0.5 ? -1 : 1;
  }

  function randomAxisLengthScale(random) {
    return CONFIG.axisLengthScaleMin
      + assertRandom(random)() * (CONFIG.axisLengthScaleMax - CONFIG.axisLengthScaleMin);
  }

  function colorDistanceSquared(first, second) {
    const firstChannels = first.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16));
    const secondChannels = second.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16));
    return firstChannels.reduce(function(total, channel, index) {
      const difference = channel - secondChannels[index];
      return total + difference * difference;
    }, 0);
  }

  function scaleVector(vector, factor) {
    const dx = vector.dx * factor;
    const dy = vector.dy * factor;
    return {
      dx: dx === 0 ? 0 : dx,
      dy: dy === 0 ? 0 : dy
    };
  }

  function dot(first, second) {
    const value = first.dx * second.dx + first.dy * second.dy;
    return value === 0 ? 0 : value;
  }

  function cross(first, second) {
    const value = first.dx * second.dy - first.dy * second.dx;
    return value === 0 ? 0 : value;
  }

  function squaredLength(vector) {
    return dot(vector, vector);
  }

  function isParallel(first, second) {
    return cross(first, second) === 0;
  }

  function simplifySquareRoot(radicand) {
    if (!Number.isSafeInteger(radicand) || radicand <= 0) {
      throw new RangeError('A square-root radicand must be a positive integer.');
    }
    let coefficient = 1;
    let remainder = radicand;
    for (let factor = 2; factor * factor <= remainder; factor += 1) {
      const square = factor * factor;
      while (remainder % square === 0) {
        coefficient *= factor;
        remainder /= square;
      }
    }
    return deepFreeze({ coefficient, radicand: remainder });
  }

  function magnitudeExact(vector) {
    const simplified = simplifySquareRoot(squaredLength(vector));
    const value = Math.sqrt(squaredLength(vector));
    let latex;
    let input;
    if (simplified.radicand === 1) {
      latex = String(simplified.coefficient);
      input = latex;
    } else {
      const coefficientText = simplified.coefficient === 1
        ? ''
        : String(simplified.coefficient);
      latex = `${coefficientText}\\sqrt{${simplified.radicand}}`;
      input = `${coefficientText || '1'}sqrt(${simplified.radicand})`;
    }
    return deepFreeze({
      value,
      coefficient: simplified.coefficient,
      radicand: simplified.radicand,
      latex,
      input
    });
  }

  function signedMagnitudeExact(vector, sign) {
    const magnitude = magnitudeExact(vector);
    const normalizedSign = sign < 0 ? -1 : 1;
    return deepFreeze({
      value: normalizedSign * magnitude.value,
      latex: normalizedSign < 0 ? `-${magnitude.latex}` : magnitude.latex,
      input: normalizedSign < 0 ? `-${magnitude.input}` : magnitude.input
    });
  }

  function integerCoordinate(value) {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError('Integer coordinates must be safe integers.');
    }
    return deepFreeze({ value, latex: String(value), input: String(value) });
  }

  function impossibleAnswer() {
    return deepFreeze({ possible: false, coordinates: null });
  }

  function possibleAnswer(coordinates) {
    return deepFreeze({ possible: true, coordinates });
  }

  function randomGeneralDisplacement(random) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const displacement = {
        dx: randomInt(-6, 6, random),
        dy: randomInt(-5, 5, random)
      };
      const lengthSquared = squaredLength(displacement);
      if (lengthSquared >= 4 && lengthSquared <= 61) {
        return displacement;
      }
    }
    throw new Error('Could not generate a non-degenerate grid vector.');
  }

  function randomNonParallelDisplacement(axis, random) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const displacement = randomGeneralDisplacement(random);
      if (!isParallel(displacement, axis)) {
        return displacement;
      }
    }
    throw new Error('Could not generate a vector outside the one-dimensional axis.');
  }

  function randomParallelDisplacement(axis, random) {
    const componentLimit = Math.max(Math.abs(axis.dx), Math.abs(axis.dy));
    const maxMultiple = Math.max(1, Math.min(3, Math.floor(6 / componentLimit)));
    const multiple = randomInt(1, maxMultiple, random) * randomSign(random);
    return {
      displacement: scaleVector(axis, multiple),
      multiple
    };
  }

  function placeDisplacementOnGrid(displacement, random) {
    const minColumn = Math.max(
      CONFIG.vectorMinColumn,
      CONFIG.vectorMinColumn - displacement.dx
    );
    const maxColumn = Math.min(
      CONFIG.vectorMaxColumn,
      CONFIG.vectorMaxColumn - displacement.dx
    );
    const minRow = Math.max(
      CONFIG.vectorMinRow,
      CONFIG.vectorMinRow + displacement.dy
    );
    const maxRow = Math.min(
      CONFIG.vectorMaxRow,
      CONFIG.vectorMaxRow + displacement.dy
    );
    if (minColumn > maxColumn || minRow > maxRow) {
      throw new RangeError('The generated vector does not fit inside the drawing region.');
    }
    const start = {
      column: randomInt(minColumn, maxColumn, random),
      row: randomInt(minRow, maxRow, random)
    };
    const end = {
      column: start.column + displacement.dx,
      row: start.row - displacement.dy
    };
    return deepFreeze({ start, end });
  }

  function orientedDiagonalDirection(random) {
    return scaleVector(randomChoice(DIAGONAL_DIRECTIONS, random), randomSign(random));
  }

  function perpendicular(vector, sign) {
    const result = { dx: -vector.dy, dy: vector.dx };
    return sign < 0 ? scaleVector(result, -1) : result;
  }

  function buildOneDimensionalVectorSpec(random) {
    const cardinal = random() < CONFIG.oneDimensionalCardinalProbability;
    const impossible = random() < CONFIG.oneDimensionalImpossibleProbability;
    const xAxis = cardinal
      ? Object.assign({}, randomChoice(CARDINAL_DIRECTIONS, random))
      : orientedDiagonalDirection(random);
    let displacement;
    let answer;

    if (impossible) {
      displacement = randomNonParallelDisplacement(xAxis, random);
      answer = impossibleAnswer();
    } else {
      const parallel = randomParallelDisplacement(xAxis, random);
      displacement = parallel.displacement;
      answer = possibleAnswer([cardinal
        ? integerCoordinate(parallel.multiple)
        : signedMagnitudeExact(displacement, parallel.multiple)]);
    }

    return {
      dimension: 1,
      systemKind: cardinal ? 'cardinal' : 'diagonal',
      isTilted: !cardinal,
      coordinateSystem: { xAxis, origin: null },
      displacement,
      answer,
      parallelAxis: null
    };
  }

  function buildStandardVectorSpec(random) {
    const xAxis = { dx: randomSign(random), dy: 0 };
    const yAxis = { dx: 0, dy: randomSign(random) };
    const displacement = randomGeneralDisplacement(random);
    return {
      dimension: 2,
      systemKind: 'standard',
      isTilted: false,
      coordinateSystem: { xAxis, yAxis, origin: null },
      displacement,
      answer: possibleAnswer([
        integerCoordinate(dot(displacement, xAxis)),
        integerCoordinate(dot(displacement, yAxis))
      ]),
      parallelAxis: null
    };
  }

  function buildRotatedVectorSpec(random) {
    const xAxis = orientedDiagonalDirection(random);
    const yAxis = perpendicular(xAxis, randomSign(random));
    const selectedAxisIndex = random() < 0.5 ? 0 : 1;
    const selectedAxis = selectedAxisIndex === 0 ? xAxis : yAxis;
    const parallel = randomParallelDisplacement(selectedAxis, random);
    const displacement = parallel.displacement;
    const nonZeroCoordinate = signedMagnitudeExact(displacement, parallel.multiple);
    return {
      dimension: 2,
      systemKind: 'rotated',
      isTilted: true,
      coordinateSystem: { xAxis, yAxis, origin: null },
      displacement,
      answer: possibleAnswer(selectedAxisIndex === 0
        ? [nonZeroCoordinate, integerCoordinate(0)]
        : [integerCoordinate(0), nonZeroCoordinate]),
      parallelAxis: selectedAxisIndex === 0 ? 'x' : 'y'
    };
  }

  function createVectorEntity(spec, random) {
    const displacement = spec.displacement;
    return deepFreeze({
      kind: 'vector',
      name: Object.assign({}, randomChoice(VECTOR_NAMES, random)),
      color: randomChoice(VECTOR_COLORS, random),
      dx: displacement.dx,
      dy: displacement.dy,
      points: placeDisplacementOnGrid(displacement, random),
      magnitude: magnitudeExact(displacement),
      showMagnitude: spec.isTilted,
      answer: spec.answer
    });
  }

  function generateVectorTask(random) {
    const dimension = random() < CONFIG.oneDimensionalProbability ? 1 : 2;
    const spec = dimension === 1
      ? buildOneDimensionalVectorSpec(random)
      : random() < CONFIG.twoDimensionalRotatedProbability
        ? buildRotatedVectorSpec(random)
        : buildStandardVectorSpec(random);
    const axisLengthScale = randomAxisLengthScale(random);
    return deepFreeze({
      mode: QUIZ_MODES.vectors,
      dimension: spec.dimension,
      systemKind: spec.systemKind,
      isTilted: spec.isTilted,
      coordinateSystem: spec.coordinateSystem,
      axisLengthScale,
      showOrigin: false,
      showAxisLabels: true,
      parallelAxis: spec.parallelAxis,
      vector: createVectorEntity(spec, random),
      point: null
    });
  }

  function randomOrigin(random) {
    return {
      column: randomInt(CONFIG.originMinColumn, CONFIG.originMaxColumn, random),
      row: randomInt(CONFIG.originMinRow, CONFIG.originMaxRow, random)
    };
  }

  function buildAbsoluteCoordinateSystem(dimension, random) {
    const coordinateSystem = {
      xAxis: dimension === 1
        ? Object.assign({}, randomChoice(CARDINAL_DIRECTIONS, random))
        : Object.assign({}, randomChoice(HORIZONTAL_DIRECTIONS, random)),
      origin: randomOrigin(random)
    };
    if (dimension === 2) {
      coordinateSystem.yAxis = Object.assign({}, randomChoice(VERTICAL_DIRECTIONS, random));
    }
    return coordinateSystem;
  }

  function buildCardinalVectorSpec(dimension, coordinateSystem, random) {
    let displacement;
    let answer;
    if (dimension === 1) {
      const impossible = random() < CONFIG.oneDimensionalImpossibleProbability;
      if (impossible) {
        displacement = randomNonParallelDisplacement(coordinateSystem.xAxis, random);
        answer = impossibleAnswer();
      } else {
        const parallel = randomParallelDisplacement(coordinateSystem.xAxis, random);
        displacement = parallel.displacement;
        answer = possibleAnswer([integerCoordinate(parallel.multiple)]);
      }
    } else {
      displacement = randomGeneralDisplacement(random);
      answer = possibleAnswer([
        integerCoordinate(dot(displacement, coordinateSystem.xAxis)),
        integerCoordinate(dot(displacement, coordinateSystem.yAxis))
      ]);
    }
    return {
      dimension,
      systemKind: dimension === 1 ? 'cardinal' : 'standard',
      isTilted: false,
      coordinateSystem,
      displacement,
      answer,
      parallelAxis: null
    };
  }

  function gridDisplacement(origin, point) {
    return {
      dx: point.column - origin.column,
      dy: origin.row - point.row
    };
  }

  function liesOnVectorSegment(point, vector) {
    if (!vector) {
      return false;
    }
    const start = vector.points.start;
    const end = vector.points.end;
    const firstColumn = point.column - start.column;
    const firstRow = point.row - start.row;
    const segmentColumn = end.column - start.column;
    const segmentRow = end.row - start.row;
    const collinear = firstColumn * segmentRow - firstRow * segmentColumn === 0;
    const withinColumns = point.column >= Math.min(start.column, end.column)
      && point.column <= Math.max(start.column, end.column);
    const withinRows = point.row >= Math.min(start.row, end.row)
      && point.row <= Math.max(start.row, end.row);
    return collinear && withinColumns && withinRows;
  }

  function pointCandidates(dimension, coordinateSystem, possible, vector, avoidVector) {
    const candidates = [];
    for (let column = CONFIG.pointMinColumn; column <= CONFIG.pointMaxColumn; column += 1) {
      for (let row = CONFIG.pointMinRow; row <= CONFIG.pointMaxRow; row += 1) {
        const point = { column, row };
        const displacement = gridDisplacement(coordinateSystem.origin, point);
        const distanceSquared = squaredLength(displacement);
        if (distanceSquared < 4) {
          continue;
        }
        const onAxis = isParallel(displacement, coordinateSystem.xAxis);
        if (dimension === 1 && onAxis !== possible) {
          continue;
        }
        if (avoidVector && liesOnVectorSegment(point, vector)) {
          continue;
        }
        candidates.push(point);
      }
    }
    return candidates;
  }

  function createPointEntity(dimension, coordinateSystem, random, vector) {
    const possible = dimension === 2
      || random() >= CONFIG.oneDimensionalImpossibleProbability;
    let candidates = pointCandidates(dimension, coordinateSystem, possible, vector, true);
    if (candidates.length === 0) {
      candidates = pointCandidates(dimension, coordinateSystem, possible, vector, false);
    }
    const position = Object.assign({}, randomChoice(candidates, random));
    const displacement = gridDisplacement(coordinateSystem.origin, position);
    const coordinates = possible
      ? dimension === 1
        ? [integerCoordinate(dot(displacement, coordinateSystem.xAxis))]
        : [
            integerCoordinate(dot(displacement, coordinateSystem.xAxis)),
            integerCoordinate(dot(displacement, coordinateSystem.yAxis))
          ]
      : null;
    const availableColors = POINT_COLORS.filter(function(color) {
      return !vector || colorDistanceSquared(color, vector.color) >= 6400;
    });
    return deepFreeze({
      kind: 'point',
      name: Object.assign({}, randomChoice(POINT_NAMES, random)),
      color: randomChoice(availableColors, random),
      position,
      displacement,
      answer: possible ? possibleAnswer(coordinates) : impossibleAnswer()
    });
  }

  function generateAbsoluteTask(mode, random) {
    const dimension = random() < CONFIG.oneDimensionalProbability ? 1 : 2;
    const coordinateSystem = buildAbsoluteCoordinateSystem(dimension, random);
    const axisLengthScale = randomAxisLengthScale(random);
    const vector = mode === QUIZ_MODES.mixed
      ? createVectorEntity(
          buildCardinalVectorSpec(dimension, coordinateSystem, random),
          random
        )
      : null;
    const point = createPointEntity(dimension, coordinateSystem, random, vector);
    return deepFreeze({
      mode,
      dimension,
      systemKind: dimension === 1 ? 'cardinal' : 'standard',
      isTilted: false,
      coordinateSystem,
      axisLengthScale,
      showOrigin: true,
      showAxisLabels: true,
      parallelAxis: null,
      vector,
      point
    });
  }

  function generateTask(mode = QUIZ_MODES.vectors, random = Math.random) {
    if (typeof mode === 'function') {
      random = mode;
      mode = QUIZ_MODES.vectors;
    }
    assertQuizMode(mode);
    assertRandom(random);
    return mode === QUIZ_MODES.vectors
      ? generateVectorTask(random)
      : generateAbsoluteTask(mode, random);
  }

  function normalizeExpression(rawValue) {
    if (typeof rawValue !== 'string') {
      throw new TypeError('Coordinate input must be text.');
    }
    if (rawValue.length > 80) {
      throw new RangeError('Coordinate input is too long.');
    }
    let source = rawValue
      .trim()
      .toLowerCase()
      .replace(/[−–—]/g, '-')
      .replace(/(\d),(\d)/g, '$1.$2')
      .replace(/\\(?:cdot|times)/g, '*')
      .replace(/·|×/g, '*')
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)')
      .replace(/√\s*\{([^{}]+)\}/g, 'sqrt($1)')
      .replace(/√\s*(\d+(?:\.\d+)?)/g, 'sqrt($1)')
      .replace(/\s+/g, '');
    source = source
      .replace(/(\d|\))(?=sqrt|\()/g, '$1*')
      .replace(/\)(?=\d)/g, ')*');
    return source;
  }

  function parseCoordinateExpression(rawValue) {
    const source = normalizeExpression(rawValue);
    if (!source || !/^[0-9a-z+\-*/().]+$/.test(source)) {
      return null;
    }
    let index = 0;
    let depth = 0;

    function peek() {
      return source[index] || '';
    }

    function consume(character) {
      if (peek() === character) {
        index += 1;
        return true;
      }
      return false;
    }

    function parseNumber() {
      const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) {
        return null;
      }
      index += match[0].length;
      return Number(match[0]);
    }

    function parsePrimary() {
      if (source.startsWith('sqrt', index)) {
        index += 4;
        if (!consume('(')) {
          throw new SyntaxError('sqrt requires parentheses.');
        }
        depth += 1;
        if (depth > 8) {
          throw new RangeError('Expression nesting is too deep.');
        }
        const value = parseExpression();
        depth -= 1;
        if (!consume(')') || value < 0) {
          throw new SyntaxError('Invalid square root.');
        }
        return Math.sqrt(value);
      }
      if (consume('(')) {
        depth += 1;
        if (depth > 8) {
          throw new RangeError('Expression nesting is too deep.');
        }
        const value = parseExpression();
        depth -= 1;
        if (!consume(')')) {
          throw new SyntaxError('Missing closing parenthesis.');
        }
        return value;
      }
      const value = parseNumber();
      if (value === null) {
        throw new SyntaxError('Expected a number.');
      }
      return value;
    }

    function parseUnary() {
      if (consume('+')) {
        return parseUnary();
      }
      if (consume('-')) {
        return -parseUnary();
      }
      return parsePrimary();
    }

    function parseTerm() {
      let value = parseUnary();
      while (peek() === '*' || peek() === '/') {
        const operator = source[index];
        index += 1;
        const right = parseUnary();
        if (operator === '/' && right === 0) {
          throw new RangeError('Division by zero.');
        }
        value = operator === '*' ? value * right : value / right;
      }
      return value;
    }

    function parseExpression() {
      let value = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const operator = source[index];
        index += 1;
        const right = parseTerm();
        value = operator === '+' ? value + right : value - right;
      }
      return value;
    }

    try {
      const value = parseExpression();
      if (index !== source.length || !Number.isFinite(value)) {
        return null;
      }
      return value;
    } catch (error) {
      return null;
    }
  }

  function checkExpectedAnswer(answer, dimension, rawCoordinates, impossibleSelected) {
    if (!answer.possible) {
      return deepFreeze({
        correct: Boolean(impossibleSelected),
        invalidInput: false
      });
    }
    if (impossibleSelected) {
      return deepFreeze({ correct: false, invalidInput: false });
    }
    if (!Array.isArray(rawCoordinates) || rawCoordinates.length !== dimension) {
      return deepFreeze({ correct: false, invalidInput: true });
    }
    const parsed = rawCoordinates.map(parseCoordinateExpression);
    if (parsed.some(value => value === null)) {
      return deepFreeze({ correct: false, invalidInput: true });
    }
    const correct = parsed.every(function(value, coordinateIndex) {
      const expected = answer.coordinates[coordinateIndex].value;
      return Math.abs(value - expected) <= 1e-8 * Math.max(1, Math.abs(expected));
    });
    return deepFreeze({ correct, invalidInput: false });
  }

  function checkObjectAnswer(task, objectKind, rawCoordinates, impossibleSelected) {
    if (!task || !['vector', 'point'].includes(objectKind) || !task[objectKind]) {
      throw new TypeError(`Task does not contain a ${objectKind}.`);
    }
    return checkExpectedAnswer(
      task[objectKind].answer,
      task.dimension,
      rawCoordinates,
      impossibleSelected
    );
  }

  function checkTaskAnswer(task, submissions) {
    if (!task || (!task.vector && !task.point)) {
      throw new TypeError('A generated task is required.');
    }
    const objectResults = {};
    for (const objectKind of ['point', 'vector']) {
      if (!task[objectKind]) {
        continue;
      }
      const submission = submissions && submissions[objectKind]
        ? submissions[objectKind]
        : {};
      objectResults[objectKind] = checkObjectAnswer(
        task,
        objectKind,
        submission.coordinates,
        submission.impossibleSelected
      );
    }
    const results = Object.values(objectResults);
    return deepFreeze({
      correct: results.every(result => result.correct),
      invalidInput: results.some(result => result.invalidInput),
      objectResults
    });
  }

  // Backwards-compatible helper for a single-object task.
  function checkAnswer(task, rawCoordinates, impossibleSelected) {
    const objectKinds = ['vector', 'point'].filter(kind => task && task[kind]);
    if (objectKinds.length !== 1) {
      throw new TypeError('checkAnswer requires a single-object task.');
    }
    return checkObjectAnswer(task, objectKinds[0], rawCoordinates, impossibleSelected);
  }

  function coordinateObjectLatex(task, objectKind) {
    if (!task || !task[objectKind] || !task[objectKind].answer.possible) {
      return null;
    }
    const rows = task[objectKind].answer.coordinates.map(function(coordinate) {
      return coordinate.latex;
    }).join('\\\\');
    return `\\begin{pmatrix}${rows}\\end{pmatrix}`;
  }

  function coordinateVectorLatex(task) {
    return coordinateObjectLatex(task, 'vector');
  }

  function coordinatePointLatex(task) {
    return coordinateObjectLatex(task, 'point');
  }

  return deepFreeze({
    VERSION,
    QUIZ_MODES,
    CONFIG,
    VECTOR_NAMES,
    POINT_NAMES,
    VECTOR_COLORS,
    POINT_COLORS,
    CARDINAL_DIRECTIONS,
    DIAGONAL_DIRECTIONS,
    generateTask,
    checkAnswer,
    checkObjectAnswer,
    checkTaskAnswer,
    parseCoordinateExpression,
    coordinateObjectLatex,
    coordinateVectorLatex,
    coordinatePointLatex,
    magnitudeExact,
    gridDisplacement,
    isParallel,
    dot,
    cross,
    squaredLength
  });
});
