'use strict';

const APP_VERSION = '20260817.10';
const VERSION_MISMATCH_TEXT = {
  de: {
    title: 'Neue Version verfügbar',
    body: 'Diese Seite hat HTML und JavaScript aus unterschiedlichen Versionen geladen. Bitte lade die Seite neu.'
  },
  en: {
    title: 'New version available',
    body: 'This page loaded HTML and JavaScript from different versions. Please reload the page.'
  },
  fr: {
    title: 'Nouvelle version disponible',
    body: 'Cette page a chargé le HTML et le JavaScript de versions différentes. Veuillez recharger la page.'
  }
};

function stopForVersionMismatch(detail) {
  const initialLanguage = VERSION_MISMATCH_TEXT[document.documentElement.lang]
    ? document.documentElement.lang
    : 'de';
  const message = VERSION_MISMATCH_TEXT[initialLanguage];
  document.body.innerHTML = [
    '<main style="max-width:720px;margin:40px auto;padding:20px;font-family:system-ui,sans-serif;line-height:1.5">',
    `<h1>${message.title}</h1>`,
    `<p>${message.body}</p>`,
    '</main>'
  ].join('');
  throw new Error(detail);
}

if (window.GG_APP_VERSION !== APP_VERSION) {
  stopForVersionMismatch(
    `Version mismatch: index ${window.GG_APP_VERSION || 'missing'}, app ${APP_VERSION}`
  );
}

const quizCore = window.GGCoordinateQuizCore;
if (!quizCore || quizCore.VERSION !== APP_VERSION) {
  stopForVersionMismatch(
    `Quiz-core mismatch: expected ${APP_VERSION}, received ${quizCore ? quizCore.VERSION : 'missing'}`
  );
}

const QUESTIONS_PER_ROUND = 10;
const TIMER_UPDATE_INTERVAL_MS = 250;
const SUPPORTED_LANGUAGES = Object.freeze(['de', 'en', 'fr']);
const LANGUAGE_STORAGE_KEY = 'coordinate-systems-language';
const SVG_NS = 'http://www.w3.org/2000/svg';
const AXIS_COLOR = '#cf2f3f';
const DIAGRAM = Object.freeze({
  width: 720,
  height: 480,
  gridLeft: 30,
  gridTop: 30,
  gridCell: 30,
  columnCount: 22,
  rowCount: 14,
  axesOriginColumn: 3,
  axesOriginRow: 7
});

const TEXT = {
  de: {
    pageTitle: 'Vektoren koordinatisieren',
    heading: 'Vektoren koordinatisieren',
    languageSelectorAria: 'Sprachauswahl',
    diagram: {
      heading: 'Vektor und Koordinatensystem',
      legendAria: 'Legende',
      vectorLegend: 'Vektor',
      axesLegend: 'Koordinatenachsen',
      aria: function(task) {
        const dimension = task.dimension === 1 ? 'eindimensionalen' : 'zweidimensionalen';
        return `Gitter mit dem Vektor ${task.vector.name.text} und einem roten ${dimension} Koordinatensystem.`;
      }
    },
    quiz: {
      taskPanelAria: 'Aufgabe',
      next: 'Nächste Aufgabe',
      nextTitle: 'Unbeantwortete Aufgabe überspringen und mit 0 Punkten werten.',
      result: 'Ergebnis anzeigen',
      resultTitle: 'Runde beenden. Eine unbeantwortete Aufgabe wird mit 0 Punkten gewertet.',
      taskCounter: function(current, total) { return `Aufgabe ${current}/${total}`; },
      scoreCounter: function(correct, answered) { return `Punkte: ${correct}/${answered}`; },
      timeCounter: function(time) { return `Zeit: ${time}`; },
      roundStartText: 'Die erste Zeichnung ist bereit. Die Zeit beginnt erst mit einem Klick auf Start.',
      begin: 'Start',
      question: function(vectorLatex, dimension) {
        const adjective = dimension === 1 ? 'ein&shy;dimensionalen' : 'zwei&shy;dimensionalen';
        return `Bestimme die Koordinaten&shy;darstellung von \\(\\vec{${vectorLatex}}\\) bezüglich des roten ${adjective} Koordinaten&shy;systems.`;
      },
      answerLegend: 'Koordinatendarstellung',
      xCoordinateAria: 'x-Koordinate',
      yCoordinateAria: 'y-Koordinate',
      impossible: 'Nicht koordinatisierbar',
      inputHint: 'Wurzeln kannst du zum Beispiel als sqrt(5), 2sqrt(5) oder √5 eingeben.',
      check: 'Prüfen',
      correct: 'Richtig.',
      incorrect: 'Falsch.',
      invalid: 'Die Eingabe konnte nicht gelesen werden.',
      possibleExplanation1d: 'Der Vektor ist parallel zur roten \\(x\\)-Achse. Das Vorzeichen folgt der Pfeilrichtung dieser Achse.',
      possibleExplanationStandard: 'Die Verschiebung wird in Richtung der roten \\(x\\)- und \\(y\\)-Achse abgelesen.',
      possibleExplanationRotated: function(axisName) {
        return `Der Vektor ist parallel zur roten \\(${axisName}\\)-Achse; seine andere Koordinate ist \\(0\\).`;
      },
      impossibleExplanation: 'Der Vektor ist nicht parallel zur einzigen roten \\(x\\)-Achse. In diesem eindimensionalen Koordinatensystem besitzt er deshalb keine Koordinatendarstellung.',
      solutionLead: 'Lösung:'
    },
    result: {
      eyebrow: 'Auswertung',
      title: 'Runde abgeschlossen',
      score: function(correct, total) { return `${correct}/${total} Punkte`; },
      detail: function(correct, total) { return `Du hast ${correct} von ${total} Aufgaben richtig beantwortet.`; },
      time: function(time) { return `Zeit: ${time}`; },
      newRound: 'Neues Quiz starten'
    }
  },
  en: {
    pageTitle: 'Vector Coordinates',
    heading: 'Expressing Vectors in Coordinate Systems',
    languageSelectorAria: 'Language selector',
    diagram: {
      heading: 'Vector and Coordinate System',
      legendAria: 'Legend',
      vectorLegend: 'Vector',
      axesLegend: 'Coordinate axes',
      aria: function(task) {
        return `Grid with vector ${task.vector.name.text} and a red ${task.dimension}D coordinate system.`;
      }
    },
    quiz: {
      taskPanelAria: 'Question',
      next: 'Next Question',
      nextTitle: 'Skip an unanswered question and score 0 points.',
      result: 'Show Result',
      resultTitle: 'Finish the round. An unanswered question is scored as 0 points.',
      taskCounter: function(current, total) { return `Question ${current}/${total}`; },
      scoreCounter: function(correct, answered) { return `Points: ${correct}/${answered}`; },
      timeCounter: function(time) { return `Time: ${time}`; },
      roundStartText: 'The first diagram is ready. The timer starts only when you press Start.',
      begin: 'Start',
      question: function(vectorLatex, dimension) {
        return `Give the coor&shy;dinate represen&shy;tation of \\(\\vec{${vectorLatex}}\\) with respect to the red ${dimension}D coor&shy;dinate system.`;
      },
      answerLegend: 'Coordinate representation',
      xCoordinateAria: 'x-coordinate',
      yCoordinateAria: 'y-coordinate',
      impossible: 'Cannot be represented',
      inputHint: 'You can enter roots as sqrt(5), 2sqrt(5), or √5, for example.',
      check: 'Check',
      correct: 'Correct.',
      incorrect: 'Wrong.',
      invalid: 'The input could not be read.',
      possibleExplanation1d: 'The vector is parallel to the red \\(x\\)-axis. Its sign follows the arrow direction of that axis.',
      possibleExplanationStandard: 'Read the displacement in the directions of the red \\(x\\)- and \\(y\\)-axes.',
      possibleExplanationRotated: function(axisName) {
        return `The vector is parallel to the red \\(${axisName}\\)-axis; its other coordinate is \\(0\\).`;
      },
      impossibleExplanation: 'The vector is not parallel to the only red \\(x\\)-axis. It therefore has no coordinate representation in this one-dimensional coordinate system.',
      solutionLead: 'Solution:'
    },
    result: {
      eyebrow: 'Result',
      title: 'Round Complete',
      score: function(correct, total) { return `${correct}/${total} points`; },
      detail: function(correct, total) { return `You answered ${correct} of ${total} questions correctly.`; },
      time: function(time) { return `Time: ${time}`; },
      newRound: 'Start New Quiz'
    }
  },
  fr: {
    pageTitle: 'Coordonnées de vecteurs',
    heading: 'Coordonner des vecteurs',
    languageSelectorAria: 'Sélecteur de langue',
    diagram: {
      heading: 'Vecteur et repère',
      legendAria: 'Légende',
      vectorLegend: 'Vecteur',
      axesLegend: 'Axes du repère',
      aria: function(task) {
        return `Quadrillage avec le vecteur ${task.vector.name.text} et un repère rouge à ${task.dimension} dimension${task.dimension === 1 ? '' : 's'}.`;
      }
    },
    quiz: {
      taskPanelAria: 'Question',
      next: 'Question suivante',
      nextTitle: 'Passer une question sans réponse et compter 0 point.',
      result: 'Afficher le résultat',
      resultTitle: 'Terminer la manche. Une question sans réponse compte pour 0 point.',
      taskCounter: function(current, total) { return `Question ${current}/${total}`; },
      scoreCounter: function(correct, answered) { return `Points : ${correct}/${answered}`; },
      timeCounter: function(time) { return `Temps : ${time}`; },
      roundStartText: 'Le premier dessin est prêt. Le chronomètre ne démarre qu’après un clic sur Démarrer.',
      begin: 'Démarrer',
      question: function(vectorLatex, dimension) {
        return `Donne la repré&shy;sentation en coor&shy;données de \\(\\vec{${vectorLatex}}\\) dans le repère rouge à ${dimension} dimen&shy;sion${dimension === 1 ? '' : 's'}.`;
      },
      answerLegend: 'Représentation en coordonnées',
      xCoordinateAria: 'Coordonnée x',
      yCoordinateAria: 'Coordonnée y',
      impossible: 'Impossible à coordonner',
      inputHint: 'Tu peux par exemple saisir les racines sous la forme sqrt(5), 2sqrt(5) ou √5.',
      check: 'Vérifier',
      correct: 'Correct.',
      incorrect: 'Faux.',
      invalid: 'La saisie n’a pas pu être interprétée.',
      possibleExplanation1d: 'Le vecteur est parallèle à l’axe rouge \\(x\\). Son signe dépend du sens de la flèche de cet axe.',
      possibleExplanationStandard: 'Le déplacement se lit dans les directions des axes rouges \\(x\\) et \\(y\\).',
      possibleExplanationRotated: function(axisName) {
        return `Le vecteur est parallèle à l’axe rouge \\(${axisName}\\) ; son autre coordonnée vaut \\(0\\).`;
      },
      impossibleExplanation: 'Le vecteur n’est pas parallèle à l’unique axe rouge \\(x\\). Il ne possède donc pas de représentation dans ce repère à une dimension.',
      solutionLead: 'Solution :'
    },
    result: {
      eyebrow: 'Résultat',
      title: 'Manche terminée',
      score: function(correct, total) { return `${correct}/${total} points`; },
      detail: function(correct, total) { return `Tu as répondu correctement à ${correct} question${correct === 1 ? '' : 's'} sur ${total}.`; },
      time: function(time) { return `Temps : ${time}`; },
      newRound: 'Commencer un nouveau quiz'
    }
  }
};

const controls = {
  languageSwitcher: document.querySelector('.language-switcher'),
  langDeButton: document.getElementById('langDeButton'),
  langEnButton: document.getElementById('langEnButton'),
  langFrButton: document.getElementById('langFrButton'),
  mainHeading: document.getElementById('mainHeading'),
  quizScreen: document.getElementById('quizScreen'),
  nextButton: document.getElementById('nextButton'),
  diagramPanel: document.getElementById('diagramPanel'),
  diagramHeading: document.getElementById('diagramHeading'),
  diagramLegend: document.querySelector('.diagram-legend'),
  vectorLegend: document.getElementById('vectorLegend'),
  axesLegend: document.getElementById('axesLegend'),
  coordinateDiagram: document.getElementById('coordinateDiagram'),
  taskPanelHeading: document.getElementById('taskPanelHeading'),
  taskCounter: document.getElementById('taskCounter'),
  scoreCounter: document.getElementById('scoreCounter'),
  timeCounter: document.getElementById('timeCounter'),
  roundStartPanel: document.getElementById('roundStartPanel'),
  roundStartText: document.getElementById('roundStartText'),
  beginRoundButton: document.getElementById('beginRoundButton'),
  questionArea: document.getElementById('questionArea'),
  taskQuestion: document.getElementById('taskQuestion'),
  answerForm: document.getElementById('answerForm'),
  answerLegend: document.getElementById('answerLegend'),
  coordinateSymbol: document.getElementById('coordinateSymbol'),
  coordinateInputFrame: document.getElementById('coordinateInputFrame'),
  xCoordinateInput: document.getElementById('xCoordinateInput'),
  yCoordinateInput: document.getElementById('yCoordinateInput'),
  xCoordinatePlaceholder: document.getElementById('xCoordinatePlaceholder'),
  yCoordinatePlaceholder: document.getElementById('yCoordinatePlaceholder'),
  yCoordinateInputLabel: document.getElementById('yCoordinateInputLabel'),
  xCoordinateLabel: document.getElementById('xCoordinateLabel'),
  yCoordinateLabel: document.getElementById('yCoordinateLabel'),
  impossibleButton: document.getElementById('impossibleButton'),
  inputHint: document.getElementById('inputHint'),
  checkButton: document.getElementById('checkButton'),
  feedback: document.getElementById('feedback'),
  solution: document.getElementById('solution'),
  resultScreen: document.getElementById('resultScreen'),
  resultEyebrow: document.getElementById('resultEyebrow'),
  resultTitle: document.getElementById('resultTitle'),
  resultScore: document.getElementById('resultScore'),
  resultDetail: document.getElementById('resultDetail'),
  resultTime: document.getElementById('resultTime'),
  newRoundButton: document.getElementById('newRoundButton')
};

const screens = {
  quiz: controls.quizScreen,
  result: controls.resultScreen
};
const languageButtons = {
  de: controls.langDeButton,
  en: controls.langEnButton,
  fr: controls.langFrButton
};

let currentLanguage = 'de';
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
let mathRenderQueue = Promise.resolve();
const mathRenderTokens = new WeakMap();

function getTextBundle() {
  return TEXT[currentLanguage] || TEXT.de;
}

function showScreen(name) {
  Object.entries(screens).forEach(function(entry) {
    const [screenName, element] = entry;
    element.classList.toggle('hidden', screenName !== name);
  });
}

function isSupportedLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language);
}

function readStoredLanguage() {
  try {
    const storedLanguage = window.sessionStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(storedLanguage) ? storedLanguage : null;
  } catch (error) {
    console.warn('Could not read the stored language:', error);
    return null;
  }
}

function persistLanguage() {
  try {
    window.sessionStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  } catch (error) {
    console.warn('Could not store the selected language:', error);
  }
}

function updateLanguageButtons() {
  SUPPORTED_LANGUAGES.forEach(function(language) {
    const active = language === currentLanguage;
    languageButtons[language].classList.toggle('is-active', active);
    languageButtons[language].setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function clearMath(elements) {
  const targets = Array.isArray(elements) ? elements : [elements];
  if (window.MathJax && typeof window.MathJax.typesetClear === 'function') {
    window.MathJax.typesetClear(targets);
  }
}

function typesetMath(elements) {
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    return window.MathJax.typesetPromise(elements);
  }
  if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
    return window.MathJax.startup.promise.then(function() {
      return typeof window.MathJax.typesetPromise === 'function'
        ? window.MathJax.typesetPromise(elements)
        : null;
    });
  }
  return Promise.resolve();
}

function bumpMathRenderToken(element) {
  const token = (mathRenderTokens.get(element) || 0) + 1;
  mathRenderTokens.set(element, token);
  return token;
}

function replaceMathContent(element, updateContent) {
  const token = bumpMathRenderToken(element);
  mathRenderQueue = mathRenderQueue
    .catch(function() { return null; })
    .then(function() {
      if (mathRenderTokens.get(element) !== token) {
        return null;
      }
      clearMath(element);
      updateContent();
      return typesetMath([element]);
    })
    .catch(function(error) {
      console.error('MathJax rendering failed:', error);
    });
  return mathRenderQueue;
}

function clearMathContent(element) {
  return replaceMathContent(element, function() {
    element.innerHTML = '';
  });
}

function clearMathContentNow(element) {
  bumpMathRenderToken(element);
  clearMath(element);
  element.innerHTML = '';
}

function renderMath(element, content) {
  return replaceMathContent(element, function() {
    element.innerHTML = content;
  });
}

function createSvgElement(name, attributes) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes || {}).forEach(function(entry) {
    element.setAttribute(entry[0], String(entry[1]));
  });
  return element;
}

function gridPoint(column, row) {
  return {
    x: DIAGRAM.gridLeft + column * DIAGRAM.gridCell,
    y: DIAGRAM.gridTop + row * DIAGRAM.gridCell
  };
}

function screenDirection(direction, cardinalLength) {
  const factor = cardinalLength && (direction.dx === 0 || direction.dy === 0) ? 2 : 1;
  return {
    x: direction.dx * DIAGRAM.gridCell * factor,
    y: -direction.dy * DIAGRAM.gridCell * factor
  };
}

function markerDefinition(id, color, size) {
  const marker = createSvgElement('marker', {
    id,
    markerWidth: size,
    markerHeight: size,
    refX: size - 1,
    refY: size / 2,
    orient: 'auto',
    markerUnits: 'userSpaceOnUse',
    viewBox: `0 0 ${size} ${size}`
  });
  marker.appendChild(createSvgElement('path', {
    d: `M 0 0 L ${size} ${size / 2} L 0 ${size} z`,
    fill: color
  }));
  return marker;
}

function addDiagramLabel(container, point, className, mathContent) {
  const label = document.createElement('span');
  label.className = `diagram-label ${className}`;
  label.style.left = `${point.x / DIAGRAM.width * 100}%`;
  label.style.top = `${point.y / DIAGRAM.height * 100}%`;
  label.innerHTML = mathContent;
  container.appendChild(label);
}

function pointBeyondArrow(origin, direction, extraDistance) {
  const length = Math.hypot(direction.x, direction.y);
  return {
    x: origin.x + direction.x + direction.x / length * extraDistance,
    y: origin.y + direction.y + direction.y / length * extraDistance
  };
}

function vectorLabelPoint(start, end) {
  const line = { x: end.x - start.x, y: end.y - start.y };
  const length = Math.hypot(line.x, line.y);
  let normal = { x: -line.y / length, y: line.x / length };
  if (normal.y > 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  return {
    x: midpoint.x + normal.x * 25,
    y: midpoint.y + normal.y * 25
  };
}

function magnitudeLabelPoint() {
  return {
    x: DIAGRAM.gridLeft + DIAGRAM.columnCount * DIAGRAM.gridCell - 10,
    y: DIAGRAM.gridTop + DIAGRAM.rowCount * DIAGRAM.gridCell - 8
  };
}

function appendGrid(svg) {
  for (let column = 0; column <= DIAGRAM.columnCount; column += 1) {
    const point = gridPoint(column, 0);
    svg.appendChild(createSvgElement('line', {
      x1: point.x,
      y1: DIAGRAM.gridTop,
      x2: point.x,
      y2: DIAGRAM.gridTop + DIAGRAM.rowCount * DIAGRAM.gridCell,
      stroke: column % 5 === 0 ? '#cbd6e2' : '#e2e8f0',
      'stroke-width': column % 5 === 0 ? 1.25 : 1,
      'vector-effect': 'non-scaling-stroke'
    }));
  }
  for (let row = 0; row <= DIAGRAM.rowCount; row += 1) {
    const point = gridPoint(0, row);
    svg.appendChild(createSvgElement('line', {
      x1: DIAGRAM.gridLeft,
      y1: point.y,
      x2: DIAGRAM.gridLeft + DIAGRAM.columnCount * DIAGRAM.gridCell,
      y2: point.y,
      stroke: row % 5 === 0 ? '#cbd6e2' : '#e2e8f0',
      'stroke-width': row % 5 === 0 ? 1.25 : 1,
      'vector-effect': 'non-scaling-stroke'
    }));
  }
}

function appendCoordinateAxes(svg, task, labelContainer) {
  const origin = gridPoint(DIAGRAM.axesOriginColumn, DIAGRAM.axesOriginRow);
  const axisEntries = [{ name: 'x', direction: task.coordinateSystem.xAxis }];
  if (task.dimension === 2) {
    axisEntries.push({ name: 'y', direction: task.coordinateSystem.yAxis });
  }
  axisEntries.forEach(function(axis) {
    const direction = screenDirection(axis.direction, true);
    const end = { x: origin.x + direction.x, y: origin.y + direction.y };
    svg.appendChild(createSvgElement('line', {
      x1: origin.x,
      y1: origin.y,
      x2: end.x,
      y2: end.y,
      stroke: AXIS_COLOR,
      'stroke-width': 3.2,
      'stroke-linecap': 'round',
      'marker-end': 'url(#axis-arrow)',
      'vector-effect': 'non-scaling-stroke'
    }));
    addDiagramLabel(
      labelContainer,
      pointBeyondArrow(origin, direction, 14),
      'diagram-label-axis',
      `\\(${axis.name}\\)`
    );
  });
}

function appendVector(svg, task, labelContainer) {
  const start = gridPoint(
    task.vector.points.start.column,
    task.vector.points.start.row
  );
  const end = gridPoint(
    task.vector.points.end.column,
    task.vector.points.end.row
  );
  svg.appendChild(createSvgElement('line', {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    stroke: task.vector.color,
    'stroke-width': 4,
    'stroke-linecap': 'round',
    'marker-end': 'url(#vector-arrow)',
    'vector-effect': 'non-scaling-stroke'
  }));

  addDiagramLabel(
    labelContainer,
    vectorLabelPoint(start, end),
    'diagram-label-vector',
    `\\(\\vec{${task.vector.name.latex}}\\)`
  );
  if (task.showMagnitude) {
    addDiagramLabel(
      labelContainer,
      magnitudeLabelPoint(),
      'diagram-label-magnitude',
      `\\(\\lvert\\vec{${task.vector.name.latex}}\\rvert=${task.magnitude.latex}\\)`
    );
  }
}

function renderDiagram(task) {
  if (!task) {
    clearMathContent(controls.coordinateDiagram);
    return;
  }
  const texts = getTextBundle();
  controls.diagramPanel.style.setProperty('--vector-color', task.vector.color);
  controls.coordinateDiagram.setAttribute('aria-label', texts.diagram.aria(task));
  replaceMathContent(controls.coordinateDiagram, function() {
    controls.coordinateDiagram.innerHTML = '';
    const svg = createSvgElement('svg', {
      class: 'diagram-svg',
      viewBox: `0 0 ${DIAGRAM.width} ${DIAGRAM.height}`,
      'aria-hidden': 'true',
      focusable: 'false',
      preserveAspectRatio: 'xMidYMid meet'
    });
    const definitions = createSvgElement('defs');
    definitions.appendChild(markerDefinition('vector-arrow', task.vector.color, 13));
    definitions.appendChild(markerDefinition('axis-arrow', AXIS_COLOR, 10));
    svg.appendChild(definitions);
    appendGrid(svg);
    appendCoordinateAxes(svg, task, controls.coordinateDiagram);
    appendVector(svg, task, controls.coordinateDiagram);
    controls.coordinateDiagram.prepend(svg);
  });
}

function formatElapsedTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getCurrentRoundElapsedMs() {
  return roundStarted && !roundFinished
    ? performance.now() - roundStartTimestamp
    : roundElapsedMs;
}

function updateTimeCounter() {
  controls.timeCounter.textContent = getTextBundle().quiz.timeCounter(
    formatElapsedTime(getCurrentRoundElapsedMs())
  );
}

function startRoundTimer() {
  roundStarted = true;
  roundFinished = false;
  roundStartTimestamp = performance.now();
  roundElapsedMs = 0;
  window.clearInterval(timerIntervalId);
  timerIntervalId = window.setInterval(updateTimeCounter, TIMER_UPDATE_INTERVAL_MS);
  updateTimeCounter();
}

function stopRoundTimer() {
  if (roundStarted) {
    roundElapsedMs = performance.now() - roundStartTimestamp;
  }
  roundStarted = false;
  window.clearInterval(timerIntervalId);
  timerIntervalId = null;
  updateTimeCounter();
}

function updateTaskCounter() {
  controls.taskCounter.textContent = taskNumber > 0
    ? getTextBundle().quiz.taskCounter(taskNumber, QUESTIONS_PER_ROUND)
    : '';
}

function updateScoreCounter() {
  controls.scoreCounter.textContent = getTextBundle().quiz.scoreCounter(
    correctAnswers,
    answeredQuestions
  );
}

function updateNextButton() {
  const texts = getTextBundle().quiz;
  const finalTask = taskNumber >= QUESTIONS_PER_ROUND;
  controls.nextButton.textContent = finalTask ? texts.result : texts.next;
  controls.nextButton.title = finalTask ? texts.resultTitle : texts.nextTitle;
}

function updateResultText() {
  const texts = getTextBundle().result;
  controls.resultScore.textContent = texts.score(correctAnswers, QUESTIONS_PER_ROUND);
  controls.resultDetail.textContent = texts.detail(correctAnswers, QUESTIONS_PER_ROUND);
  controls.resultTime.textContent = texts.time(formatElapsedTime(roundElapsedMs));
}

function updateFeedbackText() {
  if (!lastFeedbackKind) {
    return;
  }
  controls.feedback.textContent = getTextBundle().quiz[lastFeedbackKind];
}

function setDimensionUi(task) {
  const oneDimensional = task.dimension === 1;
  renderMath(
    controls.xCoordinatePlaceholder,
    `\\(${task.vector.name.latex}_{x}\\)`
  );
  renderMath(
    controls.yCoordinatePlaceholder,
    `\\(${task.vector.name.latex}_{y}\\)`
  );
  controls.coordinateInputFrame.classList.toggle('dimension-one', oneDimensional);
  controls.coordinateInputFrame.classList.toggle('dimension-two', !oneDimensional);
  controls.yCoordinateInputLabel.classList.toggle('hidden', oneDimensional);
  controls.impossibleButton.classList.toggle('hidden', !oneDimensional);
  controls.inputHint.classList.toggle('hidden', !task.isTilted);
}

function setImpossibleSelected(selected) {
  impossibleSelected = Boolean(selected) && Boolean(currentTask) && currentTask.dimension === 1;
  controls.impossibleButton.classList.toggle('is-selected', impossibleSelected);
  controls.impossibleButton.setAttribute('aria-pressed', impossibleSelected ? 'true' : 'false');
  const solved = currentTaskScored;
  controls.xCoordinateInput.disabled = solved || impossibleSelected;
  controls.yCoordinateInput.disabled = solved || impossibleSelected;
}

function getTaskQuestion(task) {
  return getTextBundle().quiz.question(task.vector.name.latex, task.dimension);
}

function getSolutionContent(task) {
  const texts = getTextBundle().quiz;
  if (!task.answer.possible) {
    return `<strong>${texts.solutionLead}</strong> ${texts.impossibleExplanation}`;
  }
  const formula = `\\vec{${task.vector.name.latex}}=${quizCore.coordinateVectorLatex(task)}`;
  let explanation;
  if (task.dimension === 1) {
    explanation = texts.possibleExplanation1d;
  } else if (task.systemKind === 'rotated') {
    explanation = texts.possibleExplanationRotated(task.parallelAxis);
  } else {
    explanation = texts.possibleExplanationStandard;
  }
  return [
    `<strong>${texts.solutionLead}</strong>`,
    `<div class="solution-formula">\\(${formula}\\)</div>`,
    `<div class="solution-explanation">${explanation}</div>`
  ].join('');
}

function refreshCurrentTaskLanguage() {
  if (!currentTask) {
    return;
  }
  renderDiagram(currentTask);
  if (!roundStarted) {
    clearMathContent(controls.taskQuestion);
    clearMathContent(controls.coordinateSymbol);
    return;
  }
  renderMath(controls.taskQuestion, getTaskQuestion(currentTask));
  renderMath(
    controls.coordinateSymbol,
    `\\(\\vec{${currentTask.vector.name.latex}}=\\)`
  );
  if (!controls.solution.classList.contains('hidden')) {
    renderMath(controls.solution, getSolutionContent(currentTask));
  }
}

function applyLanguage() {
  const texts = getTextBundle();
  document.documentElement.lang = currentLanguage;
  document.title = texts.pageTitle;
  controls.languageSwitcher.setAttribute('aria-label', texts.languageSelectorAria);
  controls.mainHeading.textContent = texts.heading;
  controls.diagramHeading.textContent = texts.diagram.heading;
  controls.diagramLegend.setAttribute('aria-label', texts.diagram.legendAria);
  controls.vectorLegend.textContent = texts.diagram.vectorLegend;
  controls.axesLegend.textContent = texts.diagram.axesLegend;
  controls.taskPanelHeading.textContent = texts.quiz.taskPanelAria;
  controls.roundStartText.textContent = texts.quiz.roundStartText;
  controls.beginRoundButton.textContent = texts.quiz.begin;
  controls.answerLegend.textContent = texts.quiz.answerLegend;
  controls.xCoordinateLabel.textContent = texts.quiz.xCoordinateAria;
  controls.yCoordinateLabel.textContent = texts.quiz.yCoordinateAria;
  controls.xCoordinateInput.setAttribute('aria-label', texts.quiz.xCoordinateAria);
  controls.yCoordinateInput.setAttribute('aria-label', texts.quiz.yCoordinateAria);
  controls.impossibleButton.textContent = texts.quiz.impossible;
  controls.inputHint.textContent = texts.quiz.inputHint;
  controls.checkButton.textContent = texts.quiz.check;
  controls.resultEyebrow.textContent = texts.result.eyebrow;
  controls.resultTitle.textContent = texts.result.title;
  controls.newRoundButton.textContent = texts.result.newRound;
  updateLanguageButtons();
  updateTaskCounter();
  updateScoreCounter();
  updateTimeCounter();
  updateNextButton();
  updateFeedbackText();
  refreshCurrentTaskLanguage();
  if (!controls.resultScreen.classList.contains('hidden')) {
    updateResultText();
  }
}

function setLanguage(language) {
  if (!isSupportedLanguage(language)) {
    return;
  }
  currentLanguage = language;
  persistLanguage();
  applyLanguage();
}

function scoreCurrentTask(correct) {
  if (currentTaskScored) {
    return;
  }
  currentTaskScored = true;
  answeredQuestions += 1;
  if (correct) {
    correctAnswers += 1;
  }
  updateScoreCounter();
}

function clearSolvedState() {
  currentTaskScored = false;
  lastFeedbackKind = null;
  controls.xCoordinateInput.value = '';
  controls.yCoordinateInput.value = '';
  controls.xCoordinateInput.disabled = false;
  controls.yCoordinateInput.disabled = false;
  controls.impossibleButton.disabled = false;
  controls.checkButton.disabled = false;
  controls.feedback.classList.add('hidden');
  controls.feedback.classList.remove('correct', 'incorrect');
  controls.feedback.textContent = '';
  controls.solution.classList.add('hidden');
  clearMathContent(controls.solution);
  setImpossibleSelected(false);
}

function showSolvedState(result) {
  scoreCurrentTask(result.correct);
  lastFeedbackKind = result.correct
    ? 'correct'
    : result.invalidInput
      ? 'invalid'
      : 'incorrect';
  controls.feedback.classList.remove('hidden', 'correct', 'incorrect');
  controls.feedback.classList.add(result.correct ? 'correct' : 'incorrect');
  updateFeedbackText();
  controls.solution.classList.remove('hidden');
  renderMath(controls.solution, getSolutionContent(currentTask));
  controls.xCoordinateInput.disabled = true;
  controls.yCoordinateInput.disabled = true;
  controls.impossibleButton.disabled = true;
  controls.checkButton.disabled = true;
  controls.nextButton.disabled = false;
  controls.nextButton.focus();
}

function hideQuestionUntilRoundStart() {
  controls.roundStartPanel.classList.remove('hidden');
  controls.questionArea.classList.add('hidden');
  controls.nextButton.disabled = true;
  clearMathContentNow(controls.taskQuestion);
  clearMathContentNow(controls.coordinateSymbol);
  window.setTimeout(function() {
    controls.beginRoundButton.focus();
  }, 0);
}

function showCurrentQuestion() {
  controls.roundStartPanel.classList.add('hidden');
  controls.questionArea.classList.remove('hidden');
  setDimensionUi(currentTask);
  renderMath(controls.taskQuestion, getTaskQuestion(currentTask));
  renderMath(
    controls.coordinateSymbol,
    `\\(\\vec{${currentTask.vector.name.latex}}=\\)`
  );
  controls.nextButton.disabled = false;
  window.setTimeout(function() {
    controls.xCoordinateInput.focus();
  }, 0);
}

function buildNewTask() {
  if (taskNumber >= QUESTIONS_PER_ROUND) {
    showRoundResult();
    return;
  }
  taskNumber += 1;
  currentTask = quizCore.generateTask();
  clearSolvedState();
  setDimensionUi(currentTask);
  updateTaskCounter();
  updateNextButton();
  renderDiagram(currentTask);
  if (roundStarted) {
    showCurrentQuestion();
  } else {
    hideQuestionUntilRoundStart();
  }
}

function submitAnswer(event) {
  event.preventDefault();
  if (!roundStarted || !currentTask || currentTaskScored || controls.checkButton.disabled) {
    return;
  }
  const rawCoordinates = currentTask.dimension === 1
    ? [controls.xCoordinateInput.value]
    : [controls.xCoordinateInput.value, controls.yCoordinateInput.value];
  const result = quizCore.checkAnswer(currentTask, rawCoordinates, impossibleSelected);
  showSolvedState(result);
}

function showRoundResult() {
  stopRoundTimer();
  roundFinished = true;
  currentTask = null;
  currentTaskScored = false;
  updateResultText();
  showScreen('result');
  window.setTimeout(function() {
    controls.newRoundButton.focus();
  }, 0);
}

function goToNextTask() {
  if (!roundStarted) {
    return;
  }
  if (currentTask && !currentTaskScored) {
    scoreCurrentTask(false);
  }
  if (taskNumber >= QUESTIONS_PER_ROUND) {
    showRoundResult();
    return;
  }
  buildNewTask();
}

function beginRound() {
  if (!currentTask || roundStarted || roundFinished) {
    return;
  }
  startRoundTimer();
  showCurrentQuestion();
}

function startNewRound() {
  stopRoundTimer();
  taskNumber = 0;
  correctAnswers = 0;
  answeredQuestions = 0;
  currentTask = null;
  currentTaskScored = false;
  roundStarted = false;
  roundFinished = false;
  roundStartTimestamp = 0;
  roundElapsedMs = 0;
  showScreen('quiz');
  updateScoreCounter();
  updateTimeCounter();
  buildNewTask();
}

controls.langDeButton.addEventListener('click', function() { setLanguage('de'); });
controls.langEnButton.addEventListener('click', function() { setLanguage('en'); });
controls.langFrButton.addEventListener('click', function() { setLanguage('fr'); });
controls.beginRoundButton.addEventListener('click', beginRound);
controls.nextButton.addEventListener('click', goToNextTask);
controls.answerForm.addEventListener('submit', submitAnswer);
controls.impossibleButton.addEventListener('click', function() {
  if (!controls.impossibleButton.disabled) {
    setImpossibleSelected(!impossibleSelected);
    if (!impossibleSelected) {
      controls.xCoordinateInput.focus();
    }
  }
});
controls.newRoundButton.addEventListener('click', startNewRound);

window.GGCoordinateSystemsApp = Object.freeze({
  version: APP_VERSION,
  getState: function() {
    return Object.freeze({
      currentLanguage,
      currentTask,
      currentTaskScored,
      taskNumber,
      correctAnswers,
      answeredQuestions,
      roundStarted,
      roundFinished,
      impossibleSelected
    });
  }
});

const storedLanguage = readStoredLanguage();
if (storedLanguage) {
  currentLanguage = storedLanguage;
}
persistLanguage();
applyLanguage();
startNewRound();
