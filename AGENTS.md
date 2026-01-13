# Repository Guidelines

## General guidelines
- Break work down into atomic steps.
- Follow TDD/BDD strictly (red-green-refactor). Write the minimal failing test, then minimal passing code, then refactor.
- Commit after each atomic step; keep commits small and sequential.

## Project Structure & Module Organization
- `index.html`: App shell and markup for the UI panels.
- `styles.css`: All styling, layout, and animation definitions.
- `app.js`: Mock data, state, and DOM rendering logic.
- `manifest.json`, `sw.js`: PWA configuration and service worker.

There are no build outputs or generated asset directories; everything is served directly from the repo root.

## Build, Test, and Development Commands
- Local dev server (example): `python3 -m http.server 8000` to serve the static files.
- Service worker note: if you change `sw.js`, hard-refresh or clear site data to see updates.

No formal build or test commands are defined for this project.

## Coding Style & Naming Conventions
- Indentation: 2 spaces in HTML/CSS/JS.
- CSS: BEM-like class naming (e.g., `.panel__header`, `.agenda__item`); keep new styles in `styles.css` near related components.
- JS: Use descriptive function names and small render helpers; DOM IDs map directly to key UI elements (e.g., `agendaList`, `createForm`).

## Testing Guidelines
- No automated tests are present.
- Manual testing: load `index.html` via a local server and verify layout, interactions, and service worker registration.

## Commit & Pull Request Guidelines
- No commit message convention is documented; keep messages short and imperative (e.g., "Fix agenda item layout").
- PRs should include:
  - Summary of UI or behavior changes.
  - Screenshots for layout changes (desktop and mobile if relevant).
  - Notes about any service worker or caching implications.

## Configuration & Security Notes
- This is a static, mock-data UI. Do not add real credentials or secrets to client-side files.
- If adding network calls, document the endpoint and expected response shape in `app.js`.
