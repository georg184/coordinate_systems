# coordinate_systems

Interactive static quiz for expressing points and vectors in one- and two-dimensional orthogonal coordinate systems. The app is available in German, English, and French and uses inline SVG for the drawing plus MathJax for mathematical notation.

## Live Version

The public version is intended to be available through GitHub Pages:

<https://georg184.github.io/coordinate_systems/>

## Start Page And Quiz Modes

The app opens on a mode-selection page modelled after `trigonometric_functions`:

- **Vectors**: one randomly named and colored vector is shown. The origin is deliberately not marked because vector coordinates do not depend on the absolute position of the coordinate system.
- **Points**: one randomly named and colored point is shown. The origin \(O\) is marked because point coordinates depend on absolute position.
- **Vectors and points**: one point and one vector share the same grid and must both be expressed in the displayed coordinate system. A question scores one point only when both responses are correct.

The quiz and result screens both provide a route back to the start page. Selecting the same mode resumes an unfinished round; selecting a different mode starts a fresh round in that mode.

## Drawing And Mathematical Contract

Every question shows a square unit grid and a short red one- or two-dimensional orthogonal coordinate system.

### Vector-only mode

- The vector representative starts and ends at grid intersections.
- The vector tail has no point marker.
- The red axes are oriented and labelled \(x\), and \(y\) in two dimensions.
- No origin is shown. The fixed on-screen position of the axes is intentionally irrelevant to the vector answer.
- The vector color is selected from a non-red palette.
- Rotated coordinate systems remain available under the original vector probability contract.

For tilted systems, the exact vector magnitude is displayed in a reserved area at the bottom right of the grid rather than beside the vector. Square roots can be entered as `sqrt(5)`, `2sqrt(5)`, `√5`, or simple LaTeX such as `\sqrt{5}`. The parser supports only numbers, decimal separators, arithmetic operators, parentheses, and square roots; it never evaluates JavaScript.

### Point and mixed modes

- The coordinate-system origin is selected at a grid intersection and marked with a transparent MathJax \(O\) label.
- Red axes are horizontal or vertical only; tilted systems are never generated.
- The oriented axes are labelled \(x\), and \(y\) in two dimensions.
- Both axes in a two-dimensional system use the same randomly selected display length.
- In one dimension, \(O\) is the midpoint of the sole red axis, is marked by a solid red point without an outline, and its label lies on the perpendicular line through that point.
- In two dimensions, the axes' intersection has the same red origin point and the \(O\) label is placed close beside it.
- A point is represented by an actual colored point marker at a grid intersection and a MathJax name label.
- A point in one dimension is representable exactly when it lies on the sole axis.
- In mixed mode the point is kept off the vector shaft for visual clarity. The vector answer remains independent of the marked origin.

## Generation Contract

The probabilities are implemented in `js/quiz-core.js` and statistically verified with seeded samples totalling 300,000 tasks.

All modes use one-dimensional systems with probability `50%` and two-dimensional systems with probability `50%`.

### Vector-only probabilities

- Within one-dimensional tasks, `70%` of axes are horizontal or vertical and `30%` use a tilted grid slope.
- Horizontal and vertical positive directions—right, left, up, and down—are equally likely within the cardinal group.
- `30%` of one-dimensional vectors are deliberately not representable because the vector is not parallel to the sole axis. This is approximately `15%` of all vector-only questions.
- Within two-dimensional tasks, `30%` use a rotated orthogonal system. The vector is parallel to exactly one red axis in those cases.
- The remaining `70%` use horizontal and vertical axes. Both possible directions of each axis are independently equiprobable.
- Tilted directions use the grid-readable slopes `±1`, `±2`, and `±1/2`, including both orientations.

### Point and mixed probabilities

- Every one-dimensional axis is horizontal or vertical, with all four orientations equally likely.
- Every two-dimensional system uses a horizontal \(x\)-direction and vertical \(y\)-direction; both signs are independently equiprobable.
- `30%` of one-dimensional points are deliberately placed outside the sole axis and are therefore not representable.
- In mixed one-dimensional questions, point and vector representability are selected independently, each with a `30%` non-representable share.
- Two-dimensional points and vectors are always representable.

Every task selects one axis-length factor uniformly from `1.0` through `1.6`. The former length is therefore the minimum, the expected mean is `1.3`, and both axes of a two-dimensional system share the same factor. This visual variation does not change the coordinate unit. All two-dimensional axis pairs are perpendicular and use the same coordinate scale.

## Quiz Flow And Answers

Every mode follows the established `trigonometric_functions` round model:

- fixed rounds of 10 questions
- first diagram visible before the round begins
- timer starts only after the user presses `Start`
- unanswered questions can be skipped and score 0 points
- each question is scored at most once
- result screen with points and elapsed time
- a full page reload starts fresh on the start page

One-dimensional objects show one coordinate field and an object-specific `Cannot be represented` option. Two-dimensional objects show an ordered coordinate pair as two vertically arranged fields. Mixed questions show separate point and vector response groups.

All inputs are enclosed in round parentheses. Transparent MathJax overlays inside the fields render the matching component notation—for example \(P_x\), \(P_y\), \(v_x\), and \(v_y\)—and disappear as soon as a value is entered. The parenthesis glyphs use a calibrated vertical offset so their visible shapes align with the fields.

Vector names are selected from `a`, `b`, `c`, `u`, `v`, and `w`. The coordinate-axis symbols `x`, `y`, and `z` are reserved and never used as vector names. Point names are selected from `A`, `B`, `C`, `P`, `Q`, and `R`; `O` is reserved for the origin.

Question prompts use justified text with a conventional left-aligned final line and language-aware automatic hyphenation inherited from the active document language.

## Project Structure

- `index.html`: start page, quiz/result markup, German fallback text, MathJax bootstrap, and versioned local assets
- `css/styles.css`: responsive mode cards, quiz interface, and transparent MathJax overlays
- `js/mathjax-config.js`: pinned CommonHTML MathJax configuration
- `js/quiz-core.js`: DOM-independent mode generation, point incidence, exact radical formatting, safe coordinate parser, and single/mixed answer checking
- `js/app.js`: localization, SVG rendering, MathJax queue, mode selection, quiz state, timer, and result flow
- `scripts/verify-javascript-syntax.js`: recursive local JavaScript syntax check
- `scripts/verify-task-generation.js`: three-mode geometry, incidence, and seeded probability regressions
- `scripts/verify-answer-checker.js`: parser plus single-object and mixed scoring regressions
- `scripts/verify-task-flow.js`: mode selection/resume, mixed answer, skip, timer, and ten-question regressions
- `scripts/verify-static-contract.js`: localization, start-page, MathJax, cache, workflow, and static integration checks
- `.github/workflows/deploy-pages.yml`: validation and GitHub Pages deployment

The workspace angle-layout helper is intentionally not vendored: this app draws arrows and coordinate axes but no angle arcs, right-angle markers, or calibrated angle labels.

## Language Maintenance

The app supports German (`de`), English (`en`), and French (`fr`). Unless a request explicitly limits a change to one language, every user-visible text change must update all three variants plus the German static HTML fallback in the same commit. This includes start-page cards, titles, descriptions, buttons, placeholders, ARIA labels, feedback, solutions, result text, and diagram descriptions.

The selected language is stored in `sessionStorage` and remains consistent across the start, quiz, and result screens.

## MathJax And Drawing Rules

Mathematical questions, vector symbols, point names, coordinate formulas, axis names, origins, and magnitudes use pinned MathJax `3.2.2` with TeX input and CommonHTML output. Diagram labels are transparent HTML overlays; they must not receive opaque backgrounds or text-shadow halos.

The grid, vector shaft, vector arrowhead, point marker, and red coordinate axes are renderer-native inline SVG. The SVG uses one fixed view box, while overlay coordinates are stored as percentages of that same box so responsive scaling cannot separate labels from the drawing.

## Cache And Version Safety

Current application version: `20260819.4`.

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

- the three localized start-page choices and same-mode resume behavior
- German, English, and French question, feedback, solution, and result text
- the pre-start state, timer, answer, skip, next-question, and ten-question result flow
- vector-only one-dimensional cardinal/tilted and two-dimensional standard/rotated systems
- point-only and mixed one-/two-dimensional cardinal systems
- a red origin marker in both dimensions, orthogonal 1D and close 2D \(O\)-label placement, and labelled axes when a point is present
- uniformly varied axis lengths from `1.0` through `1.6`, with matching lengths in two dimensions
- one-dimensional point incidence and independent mixed non-representability controls
- point marker and vector tail remaining visually distinct
- dynamic MathJax component labels for both object types
- desktop, tablet, and phone widths without horizontal overflow

## GitHub Pages

The repository uses the `main` branch and the GitHub Actions workflow in `.github/workflows/deploy-pages.yml`. Every push validates the application contracts before uploading the static files and deploying them to GitHub Pages.
