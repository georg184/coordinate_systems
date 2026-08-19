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
    attributes: {},
    classList: new FakeClassList(...classes),
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

function createAnswerGroup() {
  return {
    group: createControl(),
    symbol: createControl(),
    frame: createControl('dimension-two'),
    xInput: createControl(),
    yInput: createControl(),
    xPlaceholder: createControl(),
    yPlaceholder: createControl(),
    xLabel: createControl(),
    yLabel: createControl(),
    yInputLabel: createControl(),
    impossibleButton: createControl()
  };
}

const answerControls = {
  point: createAnswerGroup(),
  vector: createAnswerGroup()
};
const controls = {
  beginRoundButton: createControl(),
  checkButton: createControl(),
  feedback: createControl('hidden'),
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
  newRoundButton: createControl()
};

const QUIZ_MODES = {
  vectors: 'vectors',
  points: 'points',
  mixed: 'mixed'
};
let generatedTaskCount = 0;
function generatedTask(mode) {
  generatedTaskCount += 1;
  const base = {
    id: generatedTaskCount,
    mode,
    dimension: 1,
    point: null,
    vector: null
  };
  if (mode !== QUIZ_MODES.points) {
    base.vector = {
      name: { text: 'v', latex: 'v' },
      answer: mode === QUIZ_MODES.mixed
        ? { possible: false, coordinates: null }
        : { possible: true, coordinates: [{ value: 1, latex: '1', input: '1' }] }
    };
  }
  if (mode !== QUIZ_MODES.vectors) {
    base.point = {
      name: { text: 'P', latex: 'P' },
      answer: { possible: true, coordinates: [{ value: 2, latex: '2', input: '2' }] }
    };
  }
  return base;
}

let now = 1000;
let activeInterval = null;
let visibleScreen = null;
let diagramRenderCount = 0;
let configureCount = 0;

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
    timeCounter: time => `Time ${time}`
  },
  result: {
    score: (correct, total) => `${correct}/${total}`,
    detail: (correct, total) => `${correct} of ${total}`,
    time: time => `Time ${time}`
  }
};

const context = {
  QUIZ_MODES,
  answerControls,
  clearMathContent: function(element) { element.innerHTML = ''; },
  clearMathContentNow: function(element) { element.innerHTML = ''; },
  configureAnswerUi: function() { configureCount += 1; },
  controls,
  getSolutionContent: function() { return 'Solution'; },
  getTaskQuestion: function() { return 'Question'; },
  getTextBundle: function() { return textBundle; },
  performance: { now: function() { return now; } },
  quizCore: {
    generateTask: generatedTask,
    checkTaskAnswer: function(task, submissions) {
      if (task.mode === QUIZ_MODES.mixed) {
        const correct = submissions.point.coordinates[0] === '2'
          && submissions.vector.impossibleSelected === true;
        return { correct, invalidInput: submissions.point.coordinates[0] === '' };
      }
      if (task.mode === QUIZ_MODES.points) {
        return {
          correct: submissions.point.coordinates[0] === '2',
          invalidInput: submissions.point.coordinates[0] === ''
        };
      }
      return {
        correct: submissions.vector.coordinates[0] === '1',
        invalidInput: submissions.vector.coordinates[0] === ''
      };
    }
  },
  renderDiagram: function() { diagramRenderCount += 1; },
  renderMath: function(element, content) { element.innerHTML = content; },
  showScreen: function(name) { visibleScreen = name; },
  updateTaskModeUi: function() {},
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
  'taskObjectKinds',
  'setImpossibleSelected',
  'scoreCurrentTask',
  'clearSolvedState',
  'setAllAnswerControlsDisabled',
  'showSolvedState',
  'hideQuestionUntilRoundStart',
  'firstAnswerInput',
  'showCurrentQuestion',
  'buildNewTask',
  'rawCoordinatesFor',
  'submitAnswer',
  'showRoundResult',
  'goToNextTask',
  'beginRound',
  'startNewRound',
  'startQuiz'
];

vm.runInContext(`
  const QUESTIONS_PER_ROUND = 10;
  const TIMER_UPDATE_INTERVAL_MS = 250;
  let activeQuizMode = null;
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
  let impossibleSelections = { vector: false, point: false };
  let lastFeedbackKind = null;

  ${functionNames.map(getFunctionSource).join('\n\n')}

  this.flow = {
    beginRound,
    goToNextTask,
    setImpossibleSelected,
    startNewRound,
    startQuiz,
    submitAnswer,
    state: function() {
      return {
        activeQuizMode,
        answeredQuestions,
        correctAnswers,
        currentTask,
        currentTaskScored,
        impossibleSelections,
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
flow.startQuiz(QUIZ_MODES.vectors);
let state = flow.state();
assert.equal(visibleScreen, 'quiz');
assert.equal(state.activeQuizMode, QUIZ_MODES.vectors);
assert.equal(state.taskNumber, 1);
assert.equal(state.roundStarted, false);
assert.equal(controls.questionArea.classList.contains('hidden'), true);
assert.equal(controls.roundStartPanel.classList.contains('hidden'), false);
assert.equal(controls.nextButton.disabled, true);
assert.equal(diagramRenderCount, 1);

flow.beginRound();
state = flow.state();
assert.equal(state.roundStarted, true);
assert.ok(state.timerIntervalId);
assert.equal(controls.questionArea.classList.contains('hidden'), false);
assert.equal(controls.nextButton.disabled, false);
assert.ok(answerControls.vector.xInput.focusCount > 0);

answerControls.vector.xInput.value = '1';
let prevented = false;
flow.submitAnswer({ preventDefault: function() { prevented = true; } });
state = flow.state();
assert.equal(prevented, true);
assert.equal(state.answeredQuestions, 1);
assert.equal(state.correctAnswers, 1);
assert.equal(state.currentTaskScored, true);
assert.equal(controls.feedback.classList.contains('correct'), true);
assert.equal(answerControls.vector.xInput.disabled, true);

flow.submitAnswer({ preventDefault: function() {} });
assert.equal(flow.state().answeredQuestions, 1, 'Solved question was scored twice.');
flow.goToNextTask();
assert.equal(flow.state().taskNumber, 2);
const resumedTaskId = flow.state().currentTask.id;
flow.startQuiz(QUIZ_MODES.vectors);
assert.equal(flow.state().currentTask.id, resumedTaskId, 'Same-mode round did not resume.');

flow.startQuiz(QUIZ_MODES.points);
state = flow.state();
assert.equal(state.activeQuizMode, QUIZ_MODES.points);
assert.equal(state.taskNumber, 1);
assert.ok(state.currentTask.point);
assert.equal(state.currentTask.vector, null);

flow.startQuiz(QUIZ_MODES.mixed);
state = flow.state();
assert.equal(state.activeQuizMode, QUIZ_MODES.mixed);
assert.equal(state.taskNumber, 1);
assert.ok(state.currentTask.point && state.currentTask.vector);
flow.beginRound();
assert.ok(answerControls.point.xInput.focusCount > 0, 'Mixed mode did not focus point input first.');
answerControls.point.xInput.value = '2';
flow.setImpossibleSelected('vector', true);
assert.equal(flow.state().impossibleSelections.vector, true);
assert.equal(answerControls.vector.xInput.disabled, true);
flow.submitAnswer({ preventDefault: function() {} });
state = flow.state();
assert.equal(state.correctAnswers, 1);
assert.equal(state.answeredQuestions, 1);

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
assert.equal(state.activeQuizMode, QUIZ_MODES.mixed);
assert.equal(state.answeredQuestions, 0);
assert.equal(state.correctAnswers, 0);
assert.equal(state.roundFinished, false);
assert.equal(state.roundStarted, false);
assert.ok(configureCount > 0);

console.log('Mode selection, resume, mixed answers, timer, skip, and ten-question flow verified');
