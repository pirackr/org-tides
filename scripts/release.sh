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
cp "$ROOT_DIR/manifest.json" "$DIST_DIR/manifest.json"
cat > "$DIST_DIR/config.js" <<'JS'
window.ORG_TIDES_CONFIG = {
  apiBaseUrl: "https://todo.pirackr.xyz/api",
};
JS
cp -R "$ROOT_DIR/assets/icons" "$DIST_ASSETS_DIR/icons"

# Write prod HTML
node "$ROOT_DIR/scripts/build-release-html.js" "$ROOT_DIR/index.html" "$DIST_DIR/index.html"

cp "$ROOT_DIR/sw.js" "$DIST_DIR/sw.js"

echo "Done: $DIST_DIR/index.html, app.min.js, styles.min.css, sw.js"
