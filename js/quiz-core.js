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

  const VERSION = '20260817.1';
  const CONFIG = Object.freeze({
    oneDimensionalProbability: 0.5,
    oneDimensionalCardinalProbability: 0.7,
    oneDimensionalImpossibleProbability: 0.3,
    twoDimensionalRotatedProbability: 0.3,
    vectorMinColumn: 9,
    vectorMaxColumn: 21,
    vectorMinRow: 1,
    vectorMaxRow: 13
  });

  const VECTOR_NAMES = Object.freeze([
    Object.freeze({ text: 'a', latex: 'a' }),
    Object.freeze({ text: 'b', latex: 'b' }),
    Object.freeze({ text: 'c', latex: 'c' }),
    Object.freeze({ text: 'u', latex: 'u' }),
    Object.freeze({ text: 'v', latex: 'v' }),
    Object.freeze({ text: 'w', latex: 'w' })
  ]);

  const CARDINAL_DIRECTIONS = Object.freeze([
    Object.freeze({ dx: 1, dy: 0 }),
    Object.freeze({ dx: -1, dy: 0 }),
    Object.freeze({ dx: 0, dy: 1 }),
    Object.freeze({ dx: 0, dy: -1 })
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

  function randomInt(min, max, random) {
    return Math.floor(assertRandom(random)() * (max - min + 1)) + min;
  }

  function randomChoice(items, random) {
    return items[randomInt(0, items.length - 1, random)];
  }

  function randomSign(random) {
    return assertRandom(random)() < 0.5 ? -1 : 1;
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

  function buildOneDimensionalTask(random) {
    const cardinal = random() < CONFIG.oneDimensionalCardinalProbability;
    const impossible = random() < CONFIG.oneDimensionalImpossibleProbability;
    const xAxis = cardinal
      ? Object.assign({}, randomChoice(CARDINAL_DIRECTIONS, random))
      : orientedDiagonalDirection(random);
    let displacement;
    let coordinates = null;

    if (impossible) {
      displacement = randomNonParallelDisplacement(xAxis, random);
    } else {
      const parallel = randomParallelDisplacement(xAxis, random);
      displacement = parallel.displacement;
      coordinates = [cardinal
        ? integerCoordinate(parallel.multiple)
        : signedMagnitudeExact(displacement, parallel.multiple)];
    }

    return {
      dimension: 1,
      systemKind: cardinal ? 'cardinal' : 'diagonal',
      isTilted: !cardinal,
      coordinateSystem: { xAxis },
      isCoordinatePossible: !impossible,
      displacement,
      answer: {
        possible: !impossible,
        coordinates
      }
    };
  }

  function buildStandardTwoDimensionalTask(random) {
    const xAxis = { dx: randomSign(random), dy: 0 };
    const yAxis = { dx: 0, dy: randomSign(random) };
    const displacement = randomGeneralDisplacement(random);
    return {
      dimension: 2,
      systemKind: 'standard',
      isTilted: false,
      coordinateSystem: { xAxis, yAxis },
      isCoordinatePossible: true,
      displacement,
      answer: {
        possible: true,
        coordinates: [
          integerCoordinate(dot(displacement, xAxis)),
          integerCoordinate(dot(displacement, yAxis))
        ]
      }
    };
  }

  function buildRotatedTwoDimensionalTask(random) {
    const xAxis = orientedDiagonalDirection(random);
    const yAxis = perpendicular(xAxis, randomSign(random));
    const selectedAxisIndex = random() < 0.5 ? 0 : 1;
    const selectedAxis = selectedAxisIndex === 0 ? xAxis : yAxis;
    const parallel = randomParallelDisplacement(selectedAxis, random);
    const displacement = parallel.displacement;
    const nonZeroCoordinate = signedMagnitudeExact(displacement, parallel.multiple);
    const coordinates = selectedAxisIndex === 0
      ? [nonZeroCoordinate, integerCoordinate(0)]
      : [integerCoordinate(0), nonZeroCoordinate];

    return {
      dimension: 2,
      systemKind: 'rotated',
      isTilted: true,
      coordinateSystem: { xAxis, yAxis },
      isCoordinatePossible: true,
      displacement,
      parallelAxis: selectedAxisIndex === 0 ? 'x' : 'y',
      answer: { possible: true, coordinates }
    };
  }

  function generateTask(random = Math.random) {
    assertRandom(random);
    const dimension = random() < CONFIG.oneDimensionalProbability ? 1 : 2;
    const partial = dimension === 1
      ? buildOneDimensionalTask(random)
      : random() < CONFIG.twoDimensionalRotatedProbability
        ? buildRotatedTwoDimensionalTask(random)
        : buildStandardTwoDimensionalTask(random);
    const vector = partial.displacement;
    const task = Object.assign({}, partial, {
      vector: {
        name: Object.assign({}, randomChoice(VECTOR_NAMES, random)),
        dx: vector.dx,
        dy: vector.dy,
        points: placeDisplacementOnGrid(vector, random)
      },
      magnitude: magnitudeExact(vector),
      showMagnitude: partial.isTilted
    });
    delete task.displacement;
    return deepFreeze(task);
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

  function checkAnswer(task, rawCoordinates, impossibleSelected) {
    if (!task || !task.answer) {
      throw new TypeError('A generated task is required.');
    }
    if (!task.answer.possible) {
      return deepFreeze({
        correct: Boolean(impossibleSelected),
        invalidInput: false
      });
    }
    if (impossibleSelected) {
      return deepFreeze({ correct: false, invalidInput: false });
    }
    if (!Array.isArray(rawCoordinates) || rawCoordinates.length !== task.dimension) {
      return deepFreeze({ correct: false, invalidInput: true });
    }
    const parsed = rawCoordinates.map(parseCoordinateExpression);
    if (parsed.some(value => value === null)) {
      return deepFreeze({ correct: false, invalidInput: true });
    }
    const correct = parsed.every(function(value, coordinateIndex) {
      const expected = task.answer.coordinates[coordinateIndex].value;
      return Math.abs(value - expected) <= 1e-8 * Math.max(1, Math.abs(expected));
    });
    return deepFreeze({ correct, invalidInput: false });
  }

  function coordinateVectorLatex(task) {
    if (!task.answer.possible) {
      return null;
    }
    const rows = task.answer.coordinates.map(function(coordinate) {
      return coordinate.latex;
    }).join('\\\\');
    return `\\begin{pmatrix}${rows}\\end{pmatrix}`;
  }

  return deepFreeze({
    VERSION,
    CONFIG,
    VECTOR_NAMES,
    CARDINAL_DIRECTIONS,
    DIAGONAL_DIRECTIONS,
    generateTask,
    checkAnswer,
    parseCoordinateExpression,
    coordinateVectorLatex,
    magnitudeExact,
    isParallel,
    dot,
    cross,
    squaredLength
  });
});
