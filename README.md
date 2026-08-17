# coordinate_systems

Interactive static quiz for expressing grid vectors in one- and two-dimensional orthogonal coordinate systems. The app is available in German, English, and French and uses inline SVG for the drawing plus MathJax for mathematical notation.

## Live Version

The public version is intended to be available through GitHub Pages:

<https://georg184.github.io/coordinate_systems/>

## Learning Task

Every question shows:

- a square unit grid
- a randomly named vector whose initial and terminal points lie on grid intersections
- a short red one- or two-dimensional coordinate system near the left edge of the grid
- oriented red axes labelled with MathJax-rendered `x` and, in two dimensions, `y`

The position of the red axes is irrelevant for vector coordinates. Their directions define the orthonormal basis in which the blue vector must be expressed. The red origin is deliberately not labelled.

For tilted coordinate systems, the exact vector magnitude is displayed next to the vector and in the question panel. Square roots can be entered as `sqrt(5)`, `2sqrt(5)`, `√5`, or simple LaTeX such as `\sqrt{5}`. The local parser supports only numbers, decimal separators, arithmetic operators, parentheses, and square roots; it never evaluates JavaScript.

## Generation Contract

The probabilities are implemented in `js/quiz-core.js` and statistically verified with a seeded sample of 100,000 tasks.

- `50%` of all tasks use a one-dimensional coordinate system.
- Within one-dimensional tasks, `70%` of axes are horizontal or vertical and `30%` use a tilted grid slope.
- Horizontal and vertical positive directions—right, left, up, and down—are equally likely within the cardinal one-dimensional group.
- `30%` of one-dimensional tasks are deliberately not representable because the vector is not parallel to the sole axis. Since half of all tasks are one-dimensional, this produces `15%` non-representable tasks overall.
- `50%` of all tasks use a two-dimensional orthogonal coordinate system.
- Within two-dimensional tasks, `30%` use a rotated orthogonal system. The vector is parallel to exactly one red axis in those cases.
- The remaining `70%` use horizontal and vertical axes. Both possible directions of each axis are independently equiprobable.
- Tilted directions use the grid-readable slopes `±1`, `±2`, and `±1/2`, including both orientations.

The axis arrows use one or two grid steps and remain below two CSS centimetres at the app's maximum layout width. All two-dimensional axis pairs are perpendicular and have equal scale.

## Quiz Flow

The app follows the established `trigonometric_functions` round model:

- fixed rounds of 10 questions
- first diagram visible before the round begins
- timer starts only after the user presses `Start`
- unanswered questions can be skipped and score 0 points
- each question is scored at most once
- result screen with points and elapsed time
- returning to the home screen preserves the current in-memory round
- a full page reload starts fresh

One-dimensional questions show one coordinate field and a `Cannot be represented` option. Two-dimensional questions show the ordered coordinate pair as two vertically arranged fields.

## Project Structure

- `index.html`: static HTML, German fallback text, MathJax bootstrap, and versioned local assets
- `css/styles.css`: responsive interface and transparent MathJax diagram-label overlays
- `js/mathjax-config.js`: pinned CommonHTML MathJax configuration
- `js/quiz-core.js`: DOM-independent generation, exact radical formatting, safe coordinate parser, and answer checking
- `js/app.js`: localization, SVG rendering, MathJax queue, quiz state, timer, and result flow
- `scripts/verify-javascript-syntax.js`: recursive local JavaScript syntax check
- `scripts/verify-task-generation.js`: geometry invariants and seeded probability regressions
- `scripts/verify-answer-checker.js`: safe expression-parser and scoring regressions
- `scripts/verify-task-flow.js`: ten-question round, skip, resume, timer, and scoring regressions
- `scripts/verify-static-contract.js`: localization, MathJax, asset-cache, workflow, and static integration checks
- `.github/workflows/deploy-pages.yml`: validation and GitHub Pages deployment

The workspace angle-layout helper is intentionally not vendored: this app draws arrows and orthogonal basis indicators but no angle arcs, right-angle markers, or calibrated angle labels.

## Language Maintenance

The app supports German (`de`), English (`en`), and French (`fr`). Unless a request explicitly limits a change to one language, every user-visible text change must update all three variants plus the German static HTML fallback in the same commit. This includes titles, descriptions, buttons, placeholders, ARIA labels, feedback, solutions, result text, and diagram descriptions.

The selected language is stored in `sessionStorage` and remains consistent across the intro, quiz, result screen, and in-memory navigation.

## MathJax And Drawing Rules

Mathematical questions, vector symbols, coordinate formulas, axis names, vector names, and magnitudes use pinned MathJax `3.2.2` with TeX input and CommonHTML output. Diagram labels are transparent HTML overlays; they must not receive opaque backgrounds or text-shadow halos.

The grid, vector, endpoints, arrowheads, and red coordinate axes are renderer-native inline SVG. The SVG uses one fixed view box, while overlay coordinates are stored as percentages of that same box so responsive scaling cannot separate labels from the drawing.

## Cache And Version Safety

Current application version: `20260817.1`.

The version must remain identical in:

- `window.GG_APP_VERSION` in `index.html`
- every local CSS/JS query token in `index.html`
- `APP_VERSION` in `js/app.js`
- `VERSION` in `js/quiz-core.js`
- the visible version badge

Bump all locations whenever local HTML, CSS, JavaScript, or MathJax configuration changes. The app stops with a localized update message if its HTML, app, and quiz-core versions differ. Do not add a service worker.

## Verification

Run all non-browser checks from the project root:

```bash
node scripts/verify-javascript-syntax.js
node scripts/verify-task-generation.js
node scripts/verify-answer-checker.js
node scripts/verify-task-flow.js
node scripts/verify-static-contract.js
```

Browser verification should cover:

- German, English, and French intro, question, feedback, solution, and result text
- the pre-start state, timer, answer, skip, next-question, home/resume, and ten-question result flow
- one-dimensional cardinal and tilted systems in both orientations
- non-representable one-dimensional cases
- standard and rotated two-dimensional systems
- exact magnitude and square-root input
- visible vector endpoints on grid intersections
- red axes remaining short, oriented, orthogonal in 2D, and correctly labelled
- transparent MathJax overlays without stale or duplicate labels after rapid task/language changes
- desktop, tablet, and phone widths without horizontal overflow

## GitHub Pages

The repository uses the `main` branch and the GitHub Actions workflow in `.github/workflows/deploy-pages.yml`. Every push validates the application contracts before uploading the static files and deploying them to GitHub Pages.
