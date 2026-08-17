'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

function getFunctionSource(functionName) {
  const match = appSource.match(
    new RegExp(`function ${functionName}\\([^\\n]*\\) \\{([\\s\\S]*?)\\n\\}`)
  );
  assert.ok(match, `Missing function ${functionName}().`);
  return match[0];
}

class FakeClassList {
  constructor(...values) {
    this.values = new Set(values);
  }

  add(...values) {
    values.forEach(value => this.values.add(value));
  }

  remove(...values) {
    values.forEach(value => this.values.delete(value));
  }

  toggle(value, force) {
    const next = typeof force === 'boolean' ? force : !this.values.has(value);
    if (next) this.values.add(value);
    else this.values.delete(value);
    return next;
  }

  contains(value) {
    return this.values.has(value);
  }
}

function createControl(...classes) {
  return {
    classList: new FakeClassList(...classes),
    attributes: {},
    disabled: false,
    focusCount: 0,
    innerHTML: '',
    textContent: '',
    title: '',
    value: '',
    focus: function() { this.focusCount += 1; },
    setAttribute: function(name, value) { this.attributes[name] = String(value); }
  };
}

let generatedTaskCount = 0;
function generatedTask() {
  generatedTaskCount += 1;
  return {
    id: generatedTaskCount,
    dimension: 1,
    systemKind: 'cardinal',
    isTilted: false,
    showMagnitude: false,
    vector: { name: { latex: 'a' } },
    magnitude: { latex: '1' },
    answer: {
      possible: true,
      coordinates: [{ value: 1, latex: '1' }]
    }
  };
}

const controls = {
  beginRoundButton: createControl(),
  checkButton: createControl(),
  coordinateSymbol: createControl(),
  coordinateInputFrame: createControl('dimension-two'),
  feedback: createControl('hidden'),
  impossibleButton: createControl(),
  inputHint: createControl(),
  magnitudeInfo: createControl('hidden'),
  newRoundButton: createControl(),
  nextButton: createControl(),
  questionArea: createControl('hidden'),
  resultDetail: createControl(),
  resultScore: createControl(),
  resultTime: createControl(),
  roundStartPanel: createControl(),
  scoreCounter: createControl(),
  solution: createControl('hidden'),
  taskCounter: createControl(),
  taskQuestion: createControl(),
  timeCounter: createControl(),
  xCoordinateInput: createControl(),
  yCoordinateInput: createControl(),
  yCoordinateInputLabel: createControl()
};

let now = 1000;
let activeInterval = null;
let visibleScreen = null;
let diagramRenderCount = 0;

const textBundle = {
  quiz: {
    check: 'Check',
    correct: 'Correct',
    incorrect: 'Wrong',
    invalid: 'Invalid',
    next: 'Next',
    nextTitle: 'Next title',
    result: 'Result',
    resultTitle: 'Result title',
    taskCounter: (current, total) => `${current}/${total}`,
    scoreCounter: (correct, answered) => `${correct}/${answered}`,
    timeCounter: time => `Time ${time}`,
    question: () => 'Question',
    magnitude: () => 'Magnitude',
    solutionLead: 'Solution',
    possibleExplanation1d: 'Parallel',
    possibleExplanationStandard: 'Standard',
    possibleExplanationRotated: axis => `Parallel ${axis}`,
    impossibleExplanation: 'Impossible'
  },
  result: {
    score: (correct, total) => `${correct}/${total}`,
    detail: (correct, total) => `${correct} of ${total}`,
    time: time => `Time ${time}`
  }
};

const context = {
  clearMathContent: function(element) { element.innerHTML = ''; },
  clearMathContentNow: function(element) { element.innerHTML = ''; },
  controls,
  getTextBundle: function() { return textBundle; },
  performance: { now: function() { return now; } },
  quizCore: {
    generateTask: generatedTask,
    checkAnswer: function(task, values, impossibleSelected) {
      return {
        correct: !impossibleSelected && values[0] === '1',
        invalidInput: values[0] === ''
      };
    },
    coordinateVectorLatex: function() { return '\\begin{pmatrix}1\\end{pmatrix}'; }
  },
  renderDiagram: function() { diagramRenderCount += 1; },
  renderMath: function(element, content) { element.innerHTML = content; },
  showScreen: function(name) { visibleScreen = name; },
  window: {
    clearInterval: function(interval) {
      if (interval === activeInterval) activeInterval = null;
    },
    setInterval: function(callback) {
      activeInterval = { callback };
      return activeInterval;
    },
    setTimeout: function(callback) {
      callback();
      return 1;
    }
  }
};
vm.createContext(context);

const functionNames = [
  'formatElapsedTime',
  'getCurrentRoundElapsedMs',
  'updateTimeCounter',
  'startRoundTimer',
  'stopRoundTimer',
  'updateTaskCounter',
  'updateScoreCounter',
  'updateNextButton',
  'updateResultText',
  'updateFeedbackText',
  'setDimensionUi',
  'setImpossibleSelected',
  'getTaskQuestion',
  'getMagnitudeInfo',
  'getSolutionContent',
  'scoreCurrentTask',
  'clearSolvedState',
  'showSolvedState',
  'hideQuestionUntilRoundStart',
  'showCurrentQuestion',
  'buildNewTask',
  'submitAnswer',
  'showRoundResult',
  'goToNextTask',
  'beginRound',
  'startNewRound',
  'openQuiz'
];

vm.runInContext(`
  const QUESTIONS_PER_ROUND = 10;
  const TIMER_UPDATE_INTERVAL_MS = 250;
  let currentTask = null;
  let currentTaskScored = false;
  let taskNumber = 0;
  let correctAnswers = 0;
  let answeredQuestions = 0;
  let roundStarted = false;
  let roundFinished = false;
  let roundStartTimestamp = 0;
  let roundElapsedMs = 0;
  let timerIntervalId = null;
  let impossibleSelected = false;
  let lastFeedbackKind = null;

  ${functionNames.map(getFunctionSource).join('\n\n')}

  this.flow = {
    beginRound,
    goToNextTask,
    openQuiz,
    startNewRound,
    submitAnswer,
    state: function() {
      return {
        answeredQuestions,
        correctAnswers,
        currentTask,
        currentTaskScored,
        impossibleSelected,
        roundElapsedMs,
        roundFinished,
        roundStarted,
        taskNumber,
        timerIntervalId
      };
    }
  };
`, context);

const flow = context.flow;
flow.startNewRound();
let state = flow.state();
assert.equal(visibleScreen, 'quiz');
assert.equal(state.taskNumber, 1);
assert.equal(state.roundStarted, false);
assert.equal(controls.questionArea.classList.contains('hidden'), true);
assert.equal(controls.roundStartPanel.classList.contains('hidden'), false);
assert.equal(controls.nextButton.disabled, true);
assert.equal(diagramRenderCount, 1);

const firstTask = state.currentTask;
flow.openQuiz();
state = flow.state();
assert.equal(state.currentTask, firstTask, 'Reopening the quiz discarded its in-memory state.');
assert.equal(state.taskNumber, 1);

flow.beginRound();
state = flow.state();
assert.equal(state.roundStarted, true);
assert.ok(state.timerIntervalId);
assert.equal(controls.questionArea.classList.contains('hidden'), false);
assert.equal(controls.nextButton.disabled, false);

controls.xCoordinateInput.value = '1';
let prevented = false;
flow.submitAnswer({ preventDefault: function() { prevented = true; } });
state = flow.state();
assert.equal(prevented, true);
assert.equal(state.answeredQuestions, 1);
assert.equal(state.correctAnswers, 1);
assert.equal(state.currentTaskScored, true);
assert.equal(controls.feedback.classList.contains('correct'), true);
assert.equal(controls.solution.classList.contains('hidden'), false);
assert.equal(controls.xCoordinateInput.disabled, true);

flow.submitAnswer({ preventDefault: function() {} });
assert.equal(flow.state().answeredQuestions, 1, 'Solved question was scored twice.');

flow.goToNextTask();
state = flow.state();
assert.equal(state.taskNumber, 2);
assert.equal(state.answeredQuestions, 1);
assert.equal(state.currentTaskScored, false);

flow.goToNextTask();
state = flow.state();
assert.equal(state.taskNumber, 3);
assert.equal(state.answeredQuestions, 2, 'Skipped question did not score zero.');
assert.equal(state.correctAnswers, 1);

while (flow.state().taskNumber < 10) {
  flow.goToNextTask();
}
assert.equal(controls.nextButton.textContent, 'Result');

now = 4567;
flow.goToNextTask();
state = flow.state();
assert.equal(state.answeredQuestions, 10);
assert.equal(state.correctAnswers, 1);
assert.equal(state.currentTask, null);
assert.equal(state.roundFinished, true);
assert.equal(state.roundStarted, false);
assert.equal(state.roundElapsedMs, 3567);
assert.equal(state.timerIntervalId, null);
assert.equal(visibleScreen, 'result');

flow.startNewRound();
state = flow.state();
assert.equal(state.taskNumber, 1);
assert.equal(state.answeredQuestions, 0);
assert.equal(state.correctAnswers, 0);
assert.equal(state.roundFinished, false);
assert.equal(state.roundStarted, false);

console.log('Ten-question start, answer, skip, resume, timer, and result flow verified');
