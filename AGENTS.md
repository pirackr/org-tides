# Repository Guidelines

## General guidelines
- Break work down into atomic steps.
- Follow TDD/BDD strictly (red-green-refactor). Write the minimal failing test, then minimal passing code, then refactor.
- Commit after each atomic step; keep commits small and sequential.
- Use Conventional Commits for commit messages (e.g., `feat: add config loader`).

## Project Structure & Module Organization
- `index.html`: App shell and markup for the UI panels.
- `styles.css`: All styling, layout, and animation definitions.
- `src/app.js`: App bootstrapping and DOM wiring.
- `src/data.js`: GraphQL queries, data transforms, and API helpers.
- `config.js`: Runtime config (API base URL).
- `manifest.json`, `sw.js`: PWA configuration and service worker (prod assets cached).
- `scripts/release.sh`: Builds minified assets into `dist/`.

Build output is generated into `dist/` by `scripts/release.sh` and served in production.

## Build, Test, and Development Commands
- Local dev server (example): `python3 -m http.server 8000` to serve the static files.
- Release build: `./scripts/release.sh`.
- Tests: `npm test`.
- Service worker note: if you change `sw.js`, hard-refresh or clear site data to see updates.

## Coding Style & Naming Conventions
- Indentation: 2 spaces in HTML/CSS/JS.
- CSS: BEM-like class naming (e.g., `.panel__header`, `.agenda__item`); keep new styles in `styles.css` near related components.
- JS: Use descriptive function names and small render helpers; DOM IDs map directly to key UI elements (e.g., `agendaList`, `createForm`).

## Testing Guidelines
- Automated tests live in `tests/` and run via `npm test`.
- Manual testing: load `index.html` via a local server and verify layout, interactions, and service worker registration.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat: add config loader`, `fix: update Docker build`).
- PRs should include:
  - Summary of UI or behavior changes.
  - Screenshots for layout changes (desktop and mobile if relevant).
  - Notes about any service worker or caching implications.

## Configuration & Security Notes
- This is a static, mock-data UI. Do not add real credentials or secrets to client-side files.
- Runtime API configuration lives in `config.js` (and `dist/config.js` for releases).
- If adding network calls, document the endpoint and expected response shape in `src/data.js`.
