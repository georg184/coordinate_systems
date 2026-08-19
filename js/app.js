'use strict';

const APP_VERSION = '20260819.4';
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

const QUIZ_MODES = quizCore.QUIZ_MODES;
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
  vectorAxesOriginColumn: 3,
  vectorAxesOriginRow: 7
});

const TEXT = {
  de: {
    pageTitle: 'Koordinatisieren von Punkten und Vektoren',
    heading: 'Koordinatisieren von Punkten und Vektoren',
    languageSelectorAria: 'Sprachauswahl',
    intro: {
      accessTitle: 'Wähle den Aufgabentyp',
      choiceListAria: 'Aufgabentyp auswählen',
      vectorsTitle: 'Vektoren',
      vectorsDescription: 'Koordinatisiere Vektoren unabhängig von der Lage des roten Koordinatensystems.',
      pointsTitle: 'Punkte',
      pointsDescription: 'Koordinatisiere Punkte bezüglich des eingezeichneten Ursprungs.',
      mixedTitle: 'Vektoren und Punkte',
      mixedDescription: 'Koordinatisiere einen Punkt und einen Vektor gemeinsam im selben Raster.'
    },
    diagram: {
      heading: function(mode) {
        if (mode === QUIZ_MODES.points) return 'Punkt und Koordinatensystem';
        if (mode === QUIZ_MODES.mixed) return 'Punkt, Vektor und Koordinatensystem';
        return 'Vektor und Koordinatensystem';
      },
      legendAria: 'Legende',
      vectorLegend: 'Vektor',
      pointLegend: 'Punkt',
      axesLegend: 'Koordinatenachsen',
      aria: function(task) {
        const dimension = task.dimension === 1 ? 'eindimensionalen' : 'zweidimensionalen';
        if (task.mode === QUIZ_MODES.points) {
          return `Gitter mit dem Punkt ${task.point.name.text}, dem Ursprung O und einem roten ${dimension} Koordinatensystem.`;
        }
        if (task.mode === QUIZ_MODES.mixed) {
          return `Gitter mit dem Punkt ${task.point.name.text}, dem Vektor ${task.vector.name.text}, dem Ursprung O und einem roten ${dimension} Koordinatensystem.`;
        }
        return `Gitter mit dem Vektor ${task.vector.name.text} und einem roten ${dimension} Koordinatensystem ohne markierten Ursprung.`;
      }
    },
    quiz: {
      back: 'Zur Startseite',
      backTitle: 'Zur Startseite wechseln.',
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
      vectorQuestion: function(vectorLatex, dimension) {
        const adjective = dimension === 1 ? 'ein&shy;dimensionalen' : 'zwei&shy;dimensionalen';
        return `Bestimme die Koordinaten&shy;darstellung von \\(\\vec{${vectorLatex}}\\) bezüglich des roten ${adjective} Koordinaten&shy;systems.`;
      },
      pointQuestion: function(pointLatex, dimension) {
        const adjective = dimension === 1 ? 'ein&shy;dimensionalen' : 'zwei&shy;dimensionalen';
        return `Bestimme die Koordinaten&shy;darstellung des Punktes \\(${pointLatex}\\) bezüglich des roten ${adjective} Koordinaten&shy;systems.`;
      },
      mixedQuestion: function(pointLatex, vectorLatex, dimension) {
        const adjective = dimension === 1 ? 'ein&shy;dimensionalen' : 'zwei&shy;dimensionalen';
        return `Bestimme die Koordinaten&shy;darstellungen des Punktes \\(${pointLatex}\\) und des Vektors \\(\\vec{${vectorLatex}}\\) bezüglich des roten ${adjective} Koordinaten&shy;systems.`;
      },
      answerLegendSingle: 'Koordinatendarstellung',
      answerLegendMixed: 'Koordinatendarstellungen',
      coordinateAria: function(objectKind, objectName, axisName) {
        const objectText = objectKind === 'point' ? 'des Punktes' : 'des Vektors';
        return `${axisName}-Koordinate ${objectText} ${objectName}`;
      },
      vectorImpossible: 'Vektor nicht koordinatisierbar',
      pointImpossible: 'Punkt nicht koordinatisierbar',
      inputHint: 'Wurzeln kannst du zum Beispiel als sqrt(5), 2sqrt(5) oder √5 eingeben.',
      check: 'Prüfen',
      correct: 'Richtig.',
      incorrect: 'Falsch.',
      invalid: 'Mindestens eine Eingabe konnte nicht gelesen werden.',
      vectorPossible1d: 'Der Vektor ist parallel zur einzigen roten Achse. Das Vorzeichen folgt ihrer Pfeilrichtung.',
      vectorPossibleStandard: 'Die Verschiebung wird in den beiden roten Pfeilrichtungen abgelesen.',
      vectorPossibleRotated: function(axisName) {
        return `Der Vektor ist parallel zur roten \\(${axisName}\\)-Achse; seine andere Koordinate ist \\(0\\).`;
      },
      vectorImpossibleExplanation: 'Der Vektor ist nicht parallel zur einzigen roten Achse. In diesem eindimensionalen Koordinatensystem besitzt er deshalb keine Koordinatendarstellung.',
      pointPossible1d: 'Der Punkt liegt auf der roten Achse. Seine Koordinate ist der orientierte Abstand vom Ursprung \\(O\\) in Gittereinheiten.',
      pointPossible2d: 'Vom Ursprung \\(O\\) aus werden die Verschiebungen in den beiden roten Pfeilrichtungen gezählt.',
      pointImpossibleExplanation: 'Der Punkt liegt nicht auf der einzigen roten Achse. In diesem eindimensionalen Koordinatensystem besitzt er deshalb keine Koordinatendarstellung.',
      solutionLead: 'Lösung:'
    },
    result: {
      eyebrow: 'Auswertung',
      title: 'Runde abgeschlossen',
      score: function(correct, total) { return `${correct}/${total} Punkte`; },
      detail: function(correct, total) { return `Du hast ${correct} von ${total} Aufgaben richtig beantwortet.`; },
      time: function(time) { return `Zeit: ${time}`; },
      newRound: 'Neues Quiz starten',
      home: 'Zur Startseite'
    }
  },
  en: {
    pageTitle: 'Coordinates of Points and Vectors',
    heading: 'Coordinates of Points and Vectors',
    languageSelectorAria: 'Language selector',
    intro: {
      accessTitle: 'Choose the question type',
      choiceListAria: 'Choose a question type',
      vectorsTitle: 'Vectors',
      vectorsDescription: 'Express vectors independently of the position of the red coordinate system.',
      pointsTitle: 'Points',
      pointsDescription: 'Give point coordinates relative to the marked origin.',
      mixedTitle: 'Vectors and Points',
      mixedDescription: 'Express one point and one vector together on the same grid.'
    },
    diagram: {
      heading: function(mode) {
        if (mode === QUIZ_MODES.points) return 'Point and Coordinate System';
        if (mode === QUIZ_MODES.mixed) return 'Point, Vector, and Coordinate System';
        return 'Vector and Coordinate System';
      },
      legendAria: 'Legend',
      vectorLegend: 'Vector',
      pointLegend: 'Point',
      axesLegend: 'Coordinate axes',
      aria: function(task) {
        if (task.mode === QUIZ_MODES.points) {
          return `Grid with point ${task.point.name.text}, origin O, and a red ${task.dimension}D coordinate system.`;
        }
        if (task.mode === QUIZ_MODES.mixed) {
          return `Grid with point ${task.point.name.text}, vector ${task.vector.name.text}, origin O, and a red ${task.dimension}D coordinate system.`;
        }
        return `Grid with vector ${task.vector.name.text} and a red ${task.dimension}D coordinate system without a marked origin.`;
      }
    },
    quiz: {
      back: 'Home',
      backTitle: 'Return to the home screen.',
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
      vectorQuestion: function(vectorLatex, dimension) {
        return `Give the coor&shy;dinate represen&shy;tation of \\(\\vec{${vectorLatex}}\\) with respect to the red ${dimension}D coor&shy;dinate system.`;
      },
      pointQuestion: function(pointLatex, dimension) {
        return `Give the coor&shy;dinate represen&shy;tation of point \\(${pointLatex}\\) with respect to the red ${dimension}D coor&shy;dinate system.`;
      },
      mixedQuestion: function(pointLatex, vectorLatex, dimension) {
        return `Give the coor&shy;dinate represen&shy;tations of point \\(${pointLatex}\\) and vector \\(\\vec{${vectorLatex}}\\) with respect to the red ${dimension}D coor&shy;dinate system.`;
      },
      answerLegendSingle: 'Coordinate representation',
      answerLegendMixed: 'Coordinate representations',
      coordinateAria: function(objectKind, objectName, axisName) {
        return `${axisName}-coordinate of ${objectKind} ${objectName}`;
      },
      vectorImpossible: 'Vector cannot be represented',
      pointImpossible: 'Point cannot be represented',
      inputHint: 'You can enter roots as sqrt(5), 2sqrt(5), or √5, for example.',
      check: 'Check',
      correct: 'Correct.',
      incorrect: 'Wrong.',
      invalid: 'At least one input could not be read.',
      vectorPossible1d: 'The vector is parallel to the only red axis. Its sign follows the arrow direction.',
      vectorPossibleStandard: 'Read the displacement in the two red arrow directions.',
      vectorPossibleRotated: function(axisName) {
        return `The vector is parallel to the red \\(${axisName}\\)-axis; its other coordinate is \\(0\\).`;
      },
      vectorImpossibleExplanation: 'The vector is not parallel to the only red axis. It therefore has no coordinate representation in this one-dimensional coordinate system.',
      pointPossible1d: 'The point lies on the red axis. Its coordinate is the oriented distance from origin \\(O\\) in grid units.',
      pointPossible2d: 'Count the displacements from origin \\(O\\) in the two red arrow directions.',
      pointImpossibleExplanation: 'The point does not lie on the only red axis. It therefore has no coordinate representation in this one-dimensional coordinate system.',
      solutionLead: 'Solution:'
    },
    result: {
      eyebrow: 'Result',
      title: 'Round Complete',
      score: function(correct, total) { return `${correct}/${total} points`; },
      detail: function(correct, total) { return `You answered ${correct} of ${total} questions correctly.`; },
      time: function(time) { return `Time: ${time}`; },
      newRound: 'Start New Quiz',
      home: 'Home'
    }
  },
  fr: {
    pageTitle: 'Coordonnées de points et de vecteurs',
    heading: 'Coordonnées de points et de vecteurs',
    languageSelectorAria: 'Sélecteur de langue',
    intro: {
      accessTitle: 'Choisis le type de questions',
      choiceListAria: 'Choisir un type de questions',
      vectorsTitle: 'Vecteurs',
      vectorsDescription: 'Exprime les vecteurs indépendamment de la position du repère rouge.',
      pointsTitle: 'Points',
      pointsDescription: 'Donne les coordonnées des points par rapport à l’origine indiquée.',
      mixedTitle: 'Vecteurs et points',
      mixedDescription: 'Exprime un point et un vecteur ensemble sur le même quadrillage.'
    },
    diagram: {
      heading: function(mode) {
        if (mode === QUIZ_MODES.points) return 'Point et repère';
        if (mode === QUIZ_MODES.mixed) return 'Point, vecteur et repère';
        return 'Vecteur et repère';
      },
      legendAria: 'Légende',
      vectorLegend: 'Vecteur',
      pointLegend: 'Point',
      axesLegend: 'Axes du repère',
      aria: function(task) {
        const dimensions = `${task.dimension} dimension${task.dimension === 1 ? '' : 's'}`;
        if (task.mode === QUIZ_MODES.points) {
          return `Quadrillage avec le point ${task.point.name.text}, l’origine O et un repère rouge à ${dimensions}.`;
        }
        if (task.mode === QUIZ_MODES.mixed) {
          return `Quadrillage avec le point ${task.point.name.text}, le vecteur ${task.vector.name.text}, l’origine O et un repère rouge à ${dimensions}.`;
        }
        return `Quadrillage avec le vecteur ${task.vector.name.text} et un repère rouge à ${dimensions}, sans origine indiquée.`;
      }
    },
    quiz: {
      back: 'Accueil',
      backTitle: 'Revenir à l’écran d’accueil.',
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
      vectorQuestion: function(vectorLatex, dimension) {
        return `Donne la repré&shy;sentation en coor&shy;données de \\(\\vec{${vectorLatex}}\\) dans le repère rouge à ${dimension} dimen&shy;sion${dimension === 1 ? '' : 's'}.`;
      },
      pointQuestion: function(pointLatex, dimension) {
        return `Donne la repré&shy;sentation en coor&shy;données du point \\(${pointLatex}\\) dans le repère rouge à ${dimension} dimen&shy;sion${dimension === 1 ? '' : 's'}.`;
      },
      mixedQuestion: function(pointLatex, vectorLatex, dimension) {
        return `Donne les repré&shy;sentations en coor&shy;données du point \\(${pointLatex}\\) et du vecteur \\(\\vec{${vectorLatex}}\\) dans le repère rouge à ${dimension} dimen&shy;sion${dimension === 1 ? '' : 's'}.`;
      },
      answerLegendSingle: 'Représentation en coordonnées',
      answerLegendMixed: 'Représentations en coordonnées',
      coordinateAria: function(objectKind, objectName, axisName) {
        const objectText = objectKind === 'point' ? 'du point' : 'du vecteur';
        return `Coordonnée ${axisName} ${objectText} ${objectName}`;
      },
      vectorImpossible: 'Vecteur impossible à coordonner',
      pointImpossible: 'Point impossible à coordonner',
      inputHint: 'Tu peux par exemple saisir les racines sous la forme sqrt(5), 2sqrt(5) ou √5.',
      check: 'Vérifier',
      correct: 'Correct.',
      incorrect: 'Faux.',
      invalid: 'Au moins une saisie n’a pas pu être interprétée.',
      vectorPossible1d: 'Le vecteur est parallèle à l’unique axe rouge. Son signe dépend du sens de la flèche.',
      vectorPossibleStandard: 'Le déplacement se lit dans les deux directions rouges indiquées par les flèches.',
      vectorPossibleRotated: function(axisName) {
        return `Le vecteur est parallèle à l’axe rouge \\(${axisName}\\) ; son autre coordonnée vaut \\(0\\).`;
      },
      vectorImpossibleExplanation: 'Le vecteur n’est pas parallèle à l’unique axe rouge. Il ne possède donc pas de représentation dans ce repère à une dimension.',
      pointPossible1d: 'Le point se trouve sur l’axe rouge. Sa coordonnée est la distance orientée depuis l’origine \\(O\\), en unités du quadrillage.',
      pointPossible2d: 'Depuis l’origine \\(O\\), compte les déplacements dans les deux directions rouges indiquées par les flèches.',
      pointImpossibleExplanation: 'Le point ne se trouve pas sur l’unique axe rouge. Il ne possède donc pas de représentation dans ce repère à une dimension.',
      solutionLead: 'Solution :'
    },
    result: {
      eyebrow: 'Résultat',
      title: 'Manche terminée',
      score: function(correct, total) { return `${correct}/${total} points`; },
      detail: function(correct, total) { return `Tu as répondu correctement à ${correct} question${correct === 1 ? '' : 's'} sur ${total}.`; },
      time: function(time) { return `Temps : ${time}`; },
      newRound: 'Commencer un nouveau quiz',
      home: 'Accueil'
    }
  }
};

const controls = {
  languageSwitcher: document.querySelector('.language-switcher'),
  langDeButton: document.getElementById('langDeButton'),
  langEnButton: document.getElementById('langEnButton'),
  langFrButton: document.getElementById('langFrButton'),
  mainHeading: document.getElementById('mainHeading'),
  introScreen: document.getElementById('introScreen'),
  introAccessTitle: document.getElementById('introAccessTitle'),
  introChoiceList: document.getElementById('introChoiceList'),
  startVectorsButton: document.getElementById('startVectorsButton'),
  startVectorsTitle: document.getElementById('startVectorsTitle'),
  startVectorsDescription: document.getElementById('startVectorsDescription'),
  startPointsButton: document.getElementById('startPointsButton'),
  startPointsTitle: document.getElementById('startPointsTitle'),
  startPointsDescription: document.getElementById('startPointsDescription'),
  startMixedButton: document.getElementById('startMixedButton'),
  startMixedTitle: document.getElementById('startMixedTitle'),
  startMixedDescription: document.getElementById('startMixedDescription'),
  quizScreen: document.getElementById('quizScreen'),
  backButton: document.getElementById('backButton'),
  nextButton: document.getElementById('nextButton'),
  diagramPanel: document.getElementById('diagramPanel'),
  diagramHeading: document.getElementById('diagramHeading'),
  diagramLegend: document.querySelector('.diagram-legend'),
  vectorLegendItem: document.getElementById('vectorLegendItem'),
  vectorLegend: document.getElementById('vectorLegend'),
  pointLegendItem: document.getElementById('pointLegendItem'),
  pointLegend: document.getElementById('pointLegend'),
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
  vectorAnswerGroup: document.getElementById('vectorAnswerGroup'),
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
  pointAnswerGroup: document.getElementById('pointAnswerGroup'),
  pointCoordinateSymbol: document.getElementById('pointCoordinateSymbol'),
  pointCoordinateInputFrame: document.getElementById('pointCoordinateInputFrame'),
  pointXCoordinateInput: document.getElementById('pointXCoordinateInput'),
  pointYCoordinateInput: document.getElementById('pointYCoordinateInput'),
  pointXCoordinatePlaceholder: document.getElementById('pointXCoordinatePlaceholder'),
  pointYCoordinatePlaceholder: document.getElementById('pointYCoordinatePlaceholder'),
  pointYCoordinateInputLabel: document.getElementById('pointYCoordinateInputLabel'),
  pointXCoordinateLabel: document.getElementById('pointXCoordinateLabel'),
  pointYCoordinateLabel: document.getElementById('pointYCoordinateLabel'),
  pointImpossibleButton: document.getElementById('pointImpossibleButton'),
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
  newRoundButton: document.getElementById('newRoundButton'),
  resultHomeButton: document.getElementById('resultHomeButton')
};

const answerControls = {
  vector: {
    group: controls.vectorAnswerGroup,
    symbol: controls.coordinateSymbol,
    frame: controls.coordinateInputFrame,
    xInput: controls.xCoordinateInput,
    yInput: controls.yCoordinateInput,
    xPlaceholder: controls.xCoordinatePlaceholder,
    yPlaceholder: controls.yCoordinatePlaceholder,
    xLabel: controls.xCoordinateLabel,
    yLabel: controls.yCoordinateLabel,
    yInputLabel: controls.yCoordinateInputLabel,
    impossibleButton: controls.impossibleButton
  },
  point: {
    group: controls.pointAnswerGroup,
    symbol: controls.pointCoordinateSymbol,
    frame: controls.pointCoordinateInputFrame,
    xInput: controls.pointXCoordinateInput,
    yInput: controls.pointYCoordinateInput,
    xPlaceholder: controls.pointXCoordinatePlaceholder,
    yPlaceholder: controls.pointYCoordinatePlaceholder,
    xLabel: controls.pointXCoordinateLabel,
    yLabel: controls.pointYCoordinateLabel,
    yInputLabel: controls.pointYCoordinateInputLabel,
    impossibleButton: controls.pointImpossibleButton
  }
};

const screens = {
  intro: controls.introScreen,
  quiz: controls.quizScreen,
  result: controls.resultScreen
};
const languageButtons = {
  de: controls.langDeButton,
  en: controls.langEnButton,
  fr: controls.langFrButton
};

let currentLanguage = 'de';
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

function screenDirection(direction, cardinalLength, lengthScale = 1) {
  const factor = cardinalLength && (direction.dx === 0 || direction.dy === 0) ? 2 : 1;
  return {
    x: direction.dx * DIAGRAM.gridCell * factor * lengthScale,
    y: -direction.dy * DIAGRAM.gridCell * factor * lengthScale
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

function pointLabelPoint(point) {
  return {
    x: point.x + 18,
    y: point.y <= DIAGRAM.gridTop + 38 ? point.y + 20 : point.y - 19
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

function coordinateSystemOrigin(task) {
  const origin = task.coordinateSystem.origin || {
    column: DIAGRAM.vectorAxesOriginColumn,
    row: DIAGRAM.vectorAxesOriginRow
  };
  return gridPoint(origin.column, origin.row);
}

function originLabelPoint(task, origin) {
  if (task.dimension === 2) {
    return { x: origin.x - 10, y: origin.y + 12 };
  }
  const axisDirection = screenDirection(task.coordinateSystem.xAxis, false);
  const axisLength = Math.hypot(axisDirection.x, axisDirection.y);
  let perpendicular = {
    x: -axisDirection.y / axisLength,
    y: axisDirection.x / axisLength
  };
  if (
    (Math.abs(perpendicular.y) >= Math.abs(perpendicular.x) && perpendicular.y < 0)
    || (Math.abs(perpendicular.x) > Math.abs(perpendicular.y) && perpendicular.x > 0)
  ) {
    perpendicular = { x: -perpendicular.x, y: -perpendicular.y };
  }
  return {
    x: origin.x + perpendicular.x * 18,
    y: origin.y + perpendicular.y * 18
  };
}

function appendCoordinateAxes(svg, task, labelContainer) {
  const origin = coordinateSystemOrigin(task);
  const axisEntries = [{ name: 'x', direction: task.coordinateSystem.xAxis }];
  if (task.dimension === 2) {
    axisEntries.push({ name: 'y', direction: task.coordinateSystem.yAxis });
  }
  axisEntries.forEach(function(axis) {
    const direction = screenDirection(axis.direction, true, task.axisLengthScale);
    const start = task.showOrigin
      ? { x: origin.x - direction.x / 2, y: origin.y - direction.y / 2 }
      : origin;
    const end = task.showOrigin
      ? { x: origin.x + direction.x / 2, y: origin.y + direction.y / 2 }
      : { x: origin.x + direction.x, y: origin.y + direction.y };
    svg.appendChild(createSvgElement('line', {
      class: 'coordinate-axis',
      'data-axis': axis.name,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      stroke: AXIS_COLOR,
      'stroke-width': 3.2,
      'stroke-linecap': 'round',
      'marker-end': 'url(#axis-arrow)',
      'vector-effect': 'non-scaling-stroke'
    }));
    if (task.showAxisLabels) {
      const labelDirection = task.showOrigin
        ? { x: direction.x / 2, y: direction.y / 2 }
        : direction;
      addDiagramLabel(
        labelContainer,
        pointBeyondArrow(origin, labelDirection, 14),
        'diagram-label-axis',
        `\\(${axis.name}\\)`
      );
    }
  });
  if (task.showOrigin) {
    svg.appendChild(createSvgElement('circle', {
      class: 'origin-marker',
      cx: origin.x,
      cy: origin.y,
      r: 5,
      fill: AXIS_COLOR
    }));
    addDiagramLabel(
      labelContainer,
      originLabelPoint(task, origin),
      'diagram-label-origin',
      '\\(O\\)'
    );
  }
}

function appendVector(svg, task, labelContainer) {
  if (!task.vector) {
    return;
  }
  const vector = task.vector;
  const start = gridPoint(vector.points.start.column, vector.points.start.row);
  const end = gridPoint(vector.points.end.column, vector.points.end.row);
  svg.appendChild(createSvgElement('line', {
    class: 'vector-shaft',
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    stroke: vector.color,
    'stroke-width': 4,
    'stroke-linecap': 'round',
    'marker-end': 'url(#vector-arrow)',
    'vector-effect': 'non-scaling-stroke'
  }));
  addDiagramLabel(
    labelContainer,
    vectorLabelPoint(start, end),
    'diagram-label-vector',
    `\\(\\vec{${vector.name.latex}}\\)`
  );
  if (vector.showMagnitude) {
    addDiagramLabel(
      labelContainer,
      magnitudeLabelPoint(),
      'diagram-label-magnitude',
      `\\(\\lvert\\vec{${vector.name.latex}}\\rvert=${vector.magnitude.latex}\\)`
    );
  }
}

function appendPoint(svg, task, labelContainer) {
  if (!task.point) {
    return;
  }
  const point = gridPoint(task.point.position.column, task.point.position.row);
  svg.appendChild(createSvgElement('circle', {
    class: 'point-marker',
    cx: point.x,
    cy: point.y,
    r: 6,
    fill: task.point.color,
    stroke: '#ffffff',
    'stroke-width': 2,
    'vector-effect': 'non-scaling-stroke'
  }));
  addDiagramLabel(
    labelContainer,
    pointLabelPoint(point),
    'diagram-label-point',
    `\\(${task.point.name.latex}\\)`
  );
}

function renderDiagram(task) {
  if (!task) {
    clearMathContent(controls.coordinateDiagram);
    return;
  }
  const texts = getTextBundle();
  if (task.vector) {
    controls.diagramPanel.style.setProperty('--vector-color', task.vector.color);
  }
  if (task.point) {
    controls.diagramPanel.style.setProperty('--point-color', task.point.color);
  }
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
    if (task.vector) {
      definitions.appendChild(markerDefinition('vector-arrow', task.vector.color, 13));
    }
    definitions.appendChild(markerDefinition('axis-arrow', AXIS_COLOR, 10));
    svg.appendChild(definitions);
    appendGrid(svg);
    appendCoordinateAxes(svg, task, controls.coordinateDiagram);
    appendVector(svg, task, controls.coordinateDiagram);
    appendPoint(svg, task, controls.coordinateDiagram);
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

function taskObjectKinds(task) {
  return ['point', 'vector'].filter(function(objectKind) {
    return Boolean(task && task[objectKind]);
  });
}

function renderAnswerObject(task, objectKind) {
  const object = task[objectKind];
  const group = answerControls[objectKind];
  if (!object) {
    group.group.classList.add('hidden');
    return;
  }
  const oneDimensional = task.dimension === 1;
  const symbolLatex = objectKind === 'vector'
    ? `\\vec{${object.name.latex}}`
    : object.name.latex;
  group.group.classList.remove('hidden');
  group.frame.classList.toggle('dimension-one', oneDimensional);
  group.frame.classList.toggle('dimension-two', !oneDimensional);
  group.yInputLabel.classList.toggle('hidden', oneDimensional);
  group.impossibleButton.classList.toggle('hidden', !oneDimensional);
  renderMath(group.symbol, `\\(${symbolLatex}=\\)`);
  renderMath(group.xPlaceholder, `\\(${object.name.latex}_{x}\\)`);
  renderMath(group.yPlaceholder, `\\(${object.name.latex}_{y}\\)`);
  const texts = getTextBundle().quiz;
  const xAria = texts.coordinateAria(objectKind, object.name.text, 'x');
  const yAria = texts.coordinateAria(objectKind, object.name.text, 'y');
  group.xLabel.textContent = xAria;
  group.yLabel.textContent = yAria;
  group.xInput.setAttribute('aria-label', xAria);
  group.yInput.setAttribute('aria-label', yAria);
}

function updateTaskModeUi(task) {
  const mode = task ? task.mode : activeQuizMode;
  const texts = getTextBundle();
  controls.diagramHeading.textContent = texts.diagram.heading(mode);
  const hasVector = task ? Boolean(task.vector) : mode !== QUIZ_MODES.points;
  const hasPoint = task ? Boolean(task.point) : mode !== QUIZ_MODES.vectors;
  controls.vectorLegendItem.classList.toggle('hidden', !hasVector);
  controls.pointLegendItem.classList.toggle('hidden', !hasPoint);
  controls.answerLegend.textContent = mode === QUIZ_MODES.mixed
    ? texts.quiz.answerLegendMixed
    : texts.quiz.answerLegendSingle;
}

function configureAnswerUi(task) {
  updateTaskModeUi(task);
  renderAnswerObject(task, 'point');
  renderAnswerObject(task, 'vector');
  controls.inputHint.classList.toggle(
    'hidden',
    !task.vector || !task.vector.showMagnitude
  );
}

function setImpossibleSelected(objectKind, selected) {
  const object = currentTask && currentTask[objectKind];
  const group = answerControls[objectKind];
  impossibleSelections[objectKind] = Boolean(selected)
    && Boolean(object)
    && currentTask.dimension === 1;
  group.impossibleButton.classList.toggle(
    'is-selected',
    impossibleSelections[objectKind]
  );
  group.impossibleButton.setAttribute(
    'aria-pressed',
    impossibleSelections[objectKind] ? 'true' : 'false'
  );
  const disabled = currentTaskScored || impossibleSelections[objectKind];
  group.xInput.disabled = disabled;
  group.yInput.disabled = disabled;
}

function getTaskQuestion(task) {
  const texts = getTextBundle().quiz;
  if (task.mode === QUIZ_MODES.points) {
    return texts.pointQuestion(task.point.name.latex, task.dimension);
  }
  if (task.mode === QUIZ_MODES.mixed) {
    return texts.mixedQuestion(
      task.point.name.latex,
      task.vector.name.latex,
      task.dimension
    );
  }
  return texts.vectorQuestion(task.vector.name.latex, task.dimension);
}

function getObjectSolutionContent(task, objectKind) {
  const texts = getTextBundle().quiz;
  const object = task[objectKind];
  const symbol = objectKind === 'vector'
    ? `\\vec{${object.name.latex}}`
    : object.name.latex;
  if (!object.answer.possible) {
    const explanation = objectKind === 'vector'
      ? texts.vectorImpossibleExplanation
      : texts.pointImpossibleExplanation;
    return [
      '<div class="solution-object">',
      `<div class="solution-formula">\\(${symbol}\\):</div>`,
      `<div class="solution-explanation">${explanation}</div>`,
      '</div>'
    ].join('');
  }
  const formula = `${symbol}=${quizCore.coordinateObjectLatex(task, objectKind)}`;
  let explanation;
  if (objectKind === 'point') {
    explanation = task.dimension === 1
      ? texts.pointPossible1d
      : texts.pointPossible2d;
  } else if (task.dimension === 1) {
    explanation = texts.vectorPossible1d;
  } else if (task.systemKind === 'rotated') {
    explanation = texts.vectorPossibleRotated(task.parallelAxis);
  } else {
    explanation = texts.vectorPossibleStandard;
  }
  return [
    '<div class="solution-object">',
    `<div class="solution-formula">\\(${formula}\\)</div>`,
    `<div class="solution-explanation">${explanation}</div>`,
    '</div>'
  ].join('');
}

function getSolutionContent(task) {
  return [
    `<strong>${getTextBundle().quiz.solutionLead}</strong>`,
    ...taskObjectKinds(task).map(function(objectKind) {
      return getObjectSolutionContent(task, objectKind);
    })
  ].join('');
}

function refreshCurrentTaskLanguage() {
  updateTaskModeUi(currentTask);
  if (!currentTask) {
    return;
  }
  renderDiagram(currentTask);
  configureAnswerUi(currentTask);
  if (!roundStarted) {
    clearMathContent(controls.taskQuestion);
    return;
  }
  renderMath(controls.taskQuestion, getTaskQuestion(currentTask));
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
  controls.introAccessTitle.textContent = texts.intro.accessTitle;
  controls.introChoiceList.setAttribute('aria-label', texts.intro.choiceListAria);
  controls.startVectorsTitle.textContent = texts.intro.vectorsTitle;
  controls.startVectorsDescription.textContent = texts.intro.vectorsDescription;
  controls.startPointsTitle.textContent = texts.intro.pointsTitle;
  controls.startPointsDescription.textContent = texts.intro.pointsDescription;
  controls.startMixedTitle.textContent = texts.intro.mixedTitle;
  controls.startMixedDescription.textContent = texts.intro.mixedDescription;
  controls.backButton.textContent = texts.quiz.back;
  controls.backButton.title = texts.quiz.backTitle;
  controls.diagramLegend.setAttribute('aria-label', texts.diagram.legendAria);
  controls.vectorLegend.textContent = texts.diagram.vectorLegend;
  controls.pointLegend.textContent = texts.diagram.pointLegend;
  controls.axesLegend.textContent = texts.diagram.axesLegend;
  controls.taskPanelHeading.textContent = texts.quiz.taskPanelAria;
  controls.roundStartText.textContent = texts.quiz.roundStartText;
  controls.beginRoundButton.textContent = texts.quiz.begin;
  controls.impossibleButton.textContent = texts.quiz.vectorImpossible;
  controls.pointImpossibleButton.textContent = texts.quiz.pointImpossible;
  controls.inputHint.textContent = texts.quiz.inputHint;
  controls.checkButton.textContent = texts.quiz.check;
  controls.resultEyebrow.textContent = texts.result.eyebrow;
  controls.resultTitle.textContent = texts.result.title;
  controls.newRoundButton.textContent = texts.result.newRound;
  controls.resultHomeButton.textContent = texts.result.home;
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
  impossibleSelections = { vector: false, point: false };
  for (const objectKind of ['point', 'vector']) {
    const group = answerControls[objectKind];
    group.xInput.value = '';
    group.yInput.value = '';
    group.xInput.disabled = false;
    group.yInput.disabled = false;
    group.impossibleButton.disabled = false;
    group.impossibleButton.classList.remove('is-selected');
    group.impossibleButton.setAttribute('aria-pressed', 'false');
  }
  controls.checkButton.disabled = false;
  controls.feedback.classList.add('hidden');
  controls.feedback.classList.remove('correct', 'incorrect');
  controls.feedback.textContent = '';
  controls.solution.classList.add('hidden');
  clearMathContent(controls.solution);
}

function setAllAnswerControlsDisabled(disabled) {
  for (const objectKind of taskObjectKinds(currentTask)) {
    const group = answerControls[objectKind];
    group.xInput.disabled = disabled || impossibleSelections[objectKind];
    group.yInput.disabled = disabled || impossibleSelections[objectKind];
    group.impossibleButton.disabled = disabled;
  }
  controls.checkButton.disabled = disabled;
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
  setAllAnswerControlsDisabled(true);
  controls.nextButton.disabled = false;
  controls.nextButton.focus();
}

function hideQuestionUntilRoundStart() {
  controls.roundStartPanel.classList.remove('hidden');
  controls.questionArea.classList.add('hidden');
  controls.nextButton.disabled = true;
  clearMathContentNow(controls.taskQuestion);
  for (const objectKind of ['point', 'vector']) {
    clearMathContentNow(answerControls[objectKind].symbol);
  }
  window.setTimeout(function() {
    controls.beginRoundButton.focus();
  }, 0);
}

function firstAnswerInput(task) {
  const firstKind = task.point ? 'point' : 'vector';
  return answerControls[firstKind].xInput;
}

function showCurrentQuestion() {
  controls.roundStartPanel.classList.add('hidden');
  controls.questionArea.classList.remove('hidden');
  configureAnswerUi(currentTask);
  renderMath(controls.taskQuestion, getTaskQuestion(currentTask));
  controls.nextButton.disabled = false;
  window.setTimeout(function() {
    firstAnswerInput(currentTask).focus();
  }, 0);
}

function buildNewTask() {
  if (!activeQuizMode) {
    showScreen('intro');
    return;
  }
  if (taskNumber >= QUESTIONS_PER_ROUND) {
    showRoundResult();
    return;
  }
  taskNumber += 1;
  currentTask = quizCore.generateTask(activeQuizMode);
  clearSolvedState();
  configureAnswerUi(currentTask);
  updateTaskCounter();
  updateNextButton();
  renderDiagram(currentTask);
  if (roundStarted) {
    showCurrentQuestion();
  } else {
    hideQuestionUntilRoundStart();
  }
}

function rawCoordinatesFor(objectKind) {
  const group = answerControls[objectKind];
  return currentTask.dimension === 1
    ? [group.xInput.value]
    : [group.xInput.value, group.yInput.value];
}

function submitAnswer(event) {
  event.preventDefault();
  if (!roundStarted || !currentTask || currentTaskScored || controls.checkButton.disabled) {
    return;
  }
  const submissions = {};
  for (const objectKind of taskObjectKinds(currentTask)) {
    submissions[objectKind] = {
      coordinates: rawCoordinatesFor(objectKind),
      impossibleSelected: impossibleSelections[objectKind]
    };
  }
  showSolvedState(quizCore.checkTaskAnswer(currentTask, submissions));
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
  if (!activeQuizMode) {
    showScreen('intro');
    return;
  }
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

function startQuiz(mode) {
  const resumeCurrentRound = activeQuizMode === mode && currentTask && !roundFinished;
  activeQuizMode = mode;
  showScreen('quiz');
  if (resumeCurrentRound) {
    updateTaskModeUi(currentTask);
    renderDiagram(currentTask);
    if (roundStarted) {
      showCurrentQuestion();
    }
    return;
  }
  startNewRound();
}

function toggleImpossibleSelection(objectKind) {
  const group = answerControls[objectKind];
  if (group.impossibleButton.disabled) {
    return;
  }
  setImpossibleSelected(objectKind, !impossibleSelections[objectKind]);
  if (!impossibleSelections[objectKind]) {
    group.xInput.focus();
  }
}

controls.langDeButton.addEventListener('click', function() { setLanguage('de'); });
controls.langEnButton.addEventListener('click', function() { setLanguage('en'); });
controls.langFrButton.addEventListener('click', function() { setLanguage('fr'); });
controls.startVectorsButton.addEventListener('click', function() {
  startQuiz(QUIZ_MODES.vectors);
});
controls.startPointsButton.addEventListener('click', function() {
  startQuiz(QUIZ_MODES.points);
});
controls.startMixedButton.addEventListener('click', function() {
  startQuiz(QUIZ_MODES.mixed);
});
controls.beginRoundButton.addEventListener('click', beginRound);
controls.nextButton.addEventListener('click', goToNextTask);
controls.answerForm.addEventListener('submit', submitAnswer);
controls.impossibleButton.addEventListener('click', function() {
  toggleImpossibleSelection('vector');
});
controls.pointImpossibleButton.addEventListener('click', function() {
  toggleImpossibleSelection('point');
});
controls.newRoundButton.addEventListener('click', startNewRound);
controls.backButton.addEventListener('click', function() { showScreen('intro'); });
controls.resultHomeButton.addEventListener('click', function() { showScreen('intro'); });

window.GGCoordinateSystemsApp = Object.freeze({
  version: APP_VERSION,
  startQuiz,
  getState: function() {
    return Object.freeze({
      currentLanguage,
      activeQuizMode,
      currentTask,
      currentTaskScored,
      taskNumber,
      correctAnswers,
      answeredQuestions,
      roundStarted,
      roundFinished,
      impossibleSelections: Object.freeze(Object.assign({}, impossibleSelections))
    });
  }
});

const storedLanguage = readStoredLanguage();
if (storedLanguage) {
  currentLanguage = storedLanguage;
}
persistLanguage();
applyLanguage();
showScreen('intro');
