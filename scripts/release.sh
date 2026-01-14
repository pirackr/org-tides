#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
DIST_ASSETS_DIR="$DIST_DIR/assets"

mkdir -p "$DIST_DIR" "$DIST_ASSETS_DIR"

# Bundle + minify JS into a single module
npx --yes esbuild "$ROOT_DIR/src/app.js" \
  --bundle \
  --minify \
  --format=esm \
  --target=es2020 \
  --outfile="$DIST_DIR/app.min.js"

# Minify CSS
npx --yes lightningcss-cli \
  --minify \
  --bundle \
  --output-file "$DIST_DIR/styles.min.css" \
  "$ROOT_DIR/styles.css"

# Write prod manifest
cat > "$DIST_DIR/manifest.json" <<'JSON'
{
  "name": "Org Tides",
  "short_name": "OrgTides",
  "start_url": ".",
  "scope": ".",
  "display": "standalone",
  "background_color": "#fafaf9",
  "theme_color": "#fafaf9",
  "icons": [
    {
      "src": "assets/icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    },
    {
      "src": "assets/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
JSON
cat > "$DIST_DIR/config.js" <<'JS'
window.ORG_TIDES_CONFIG = {
  apiBaseUrl: "https://todo.pirackr.xyz/api",
};
JS
cp -R "$ROOT_DIR/assets/icons" "$DIST_ASSETS_DIR/icons"



# Write prod HTML
cat > "$DIST_DIR/index.html" <<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Org Tides</title>
    <meta name="theme-color" content="#fafaf9" />
    <link rel="icon" href="assets/icons/icon.svg" type="image/svg+xml" />
    <link rel="manifest" href="manifest.json" />
    <link rel="stylesheet" href="styles.min.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div class="grain"></div>
    <nav class="top-nav">
      <div class="top-nav__search">
        <div class="search search--nav">
          <svg class="search__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M10.5 3a7.5 7.5 0 0 1 5.96 12.1l3.22 3.22-1.42 1.42-3.22-3.22A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"
              fill="currentColor"
            />
          </svg>
          <input
            id="searchInput"
            class="search__input"
            type="search"
            placeholder="Search"
            aria-label="Search tasks and headings"
          />
        </div>
      </div>
      <div class="top-nav__actions">
        <button class="icon-button" type="button" aria-label="More" title="More">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="6" r="2.2" fill="currentColor" />
            <circle cx="12" cy="12" r="2.2" fill="currentColor" />
            <circle cx="12" cy="18" r="2.2" fill="currentColor" />
          </svg>
        </button>
      </div>
    </nav>
    <header class="app-header">
      <div class="app-header__row">
        <div class="app-header__titleblock"></div>
      </div>
    </header>

    <main class="content">
      <ul class="agenda" id="agendaList"></ul>
    </main>

    <nav class="bottom-nav" aria-label="Primary">
      <button class="bottom-nav__item is-active" type="button" data-view="inbox">
        <svg class="bottom-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M3 4h18v12h-5l-2 3h-4l-2-3H3V4zm2 2v8h4.2l2 3h1.6l2-3H19V6H5z"
            fill="currentColor"
          />
        </svg>
        <span>Inbox</span>
      </button>
      <button class="bottom-nav__item" type="button" data-view="today">
        <svg class="bottom-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 3v2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2V3h-2v2H9V3H7zm12 6H5v9h14V9z"
            fill="currentColor"
          />
        </svg>
        <span>Today</span>
      </button>
      <button class="bottom-nav__item" type="button" data-view="browse">
        <svg class="bottom-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
            fill="currentColor"
          />
        </svg>
        <span>Browse</span>
      </button>
    </nav>

    <button class="fab" type="button" aria-label="Add new task" title="Add new task">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" />
      </svg>
    </button>

    <div class="modal hidden" id="taskModal" role="dialog" aria-modal="true" aria-label="New task">
      <div class="modal__backdrop" data-close-modal="true"></div>
      <div class="modal__panel">
        <form id="taskForm" class="modal__form">
          <label class="modal__titlefield">
            <span class="sr-only">Task</span>
              <input
                id="taskTitle"
                name="title"
                type="text"
                autocomplete="off"
                required
                placeholder="Jot down some tasks..."
                aria-label="Task"
              />
            </label>
          <div class="modal__footer">
            <div class="status-picker" id="statusPicker">
              <span class="sr-only" id="statusLabel">Status</span>
              <button
                class="status-picker__button"
                type="button"
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-labelledby="statusLabel"
                data-picker="status"
              >
                <span class="status-chip" data-state="TODO" aria-hidden="true"></span>
                <span class="status-picker__value">TODO</span>
              </button>
              <input type="hidden" id="taskStatus" name="status" value="TODO" />
            </div>
            <div class="date-picker" id="datePicker">
              <span class="sr-only" id="dateLabel">Date</span>
              <button
                class="date-picker__button"
                type="button"
                aria-labelledby="dateLabel"
              >
                <span class="modal__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M7 3v2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2V3h-2v2H9V3H7zm12 6H5v9h14V9z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span class="date-picker__value" id="taskDateValue">Date</span>
              </button>
              <input id="taskDate" name="date" type="date" aria-label="Date" class="date-picker__input" />
            </div>
            <div class="save-picker" id="savePicker">
              <span class="sr-only" id="saveLabel">Save to</span>
              <button
                class="save-picker__button"
                type="button"
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-labelledby="saveLabel"
                data-picker="save"
              >
                <span class="modal__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 4h16v4H4V4zm0 6h16v10H4V10zm4 3h8v2H8v-2z" fill="currentColor" />
                  </svg>
                </span>
                <span class="save-picker__value">Inbox</span>
              </button>
              <input type="hidden" id="taskTarget" name="target" value="inbox.org|Inbox" />
            </div>
            <button class="primary modal__submit" type="submit" aria-label="Add task" title="Add task">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 6l6 6-1.4 1.4L13 9.8V18h-2V9.8l-3.6 3.6L6 12l6-6z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="picker-sheet hidden" id="pickerSheet" role="dialog" aria-modal="true" aria-label="Picker">
      <div class="picker-sheet__backdrop" data-close-picker="true"></div>
      <div class="picker-sheet__panel">
        <div class="picker-sheet__header">
          <input
            id="pickerSearch"
            class="picker-sheet__search"
            type="search"
            placeholder="Search"
            aria-label="Search choices"
          />
        </div>
        <div class="picker-sheet__list" id="pickerList" role="listbox"></div>
      </div>
    </div>

    <script src="config.js"></script>
    <script type="module" src="app.min.js"></script>
    <script>
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js", { scope: "./" });
      }
    </script>
  </body>
</html>
HTML

cat > "$DIST_DIR/sw.js" <<'JS'
const CACHE_NAME = "org-tides-prod-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.min.css",
  "./app.min.js",
  "./config.js",
  "./manifest.json",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
JS

echo "Done: $DIST_DIR/index.html, app.min.js, styles.min.css, sw.js"
