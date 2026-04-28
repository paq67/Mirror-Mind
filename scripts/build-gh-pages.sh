#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# build-gh-pages.sh  —  Build MirrorMind frontend for GitHub Pages
#
# Usage:
#   ./scripts/build-gh-pages.sh <API_URL> [BASE_PATH]
#
# Arguments:
#   API_URL    Required. Full URL of your deployed backend, e.g.
#              https://mirrormind.yourusername.replit.app
#              (do NOT include a trailing slash)
#   BASE_PATH  Optional. The path your GitHub Pages repo is served under.
#              Use "/"  for a user/org pages site  (username.github.io)
#              Use "/repo-name/"  for a project pages site  (default: "/")
#
# Examples:
#   ./scripts/build-gh-pages.sh https://mirrormind.replit.app
#   ./scripts/build-gh-pages.sh https://mirrormind.replit.app /mirrormind/
#
# Output:
#   gh-pages-dist/   ← upload the contents of this folder to GitHub Pages
# ---------------------------------------------------------------------------
set -euo pipefail

API_URL="${1:-}"
BASE_PATH="${2:-/}"

if [[ -z "$API_URL" ]]; then
  echo ""
  echo "ERROR: API_URL is required."
  echo ""
  echo "Usage: ./scripts/build-gh-pages.sh <API_URL> [BASE_PATH]"
  echo "Example: ./scripts/build-gh-pages.sh https://mirrormind.replit.app"
  echo ""
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$WORKSPACE_ROOT/gh-pages-dist"

echo ""
echo "Building MirrorMind for GitHub Pages"
echo "  API URL   : $API_URL"
echo "  Base path : $BASE_PATH"
echo "  Output    : $OUT_DIR"
echo ""

VITE_API_URL="$API_URL" \
VITE_BASE_PATH="$BASE_PATH" \
  pnpm --filter @workspace/mirrormind run build:ghpages

rm -rf "$OUT_DIR"
cp -r "$WORKSPACE_ROOT/artifacts/mirrormind/dist/ghpages" "$OUT_DIR"

cp "$OUT_DIR/index.html" "$OUT_DIR/404.html"

touch "$OUT_DIR/.nojekyll"

echo ""
echo "Done!  Static files are in: gh-pages-dist/"
echo ""
echo "Next steps:"
echo "  1. Download the gh-pages-dist/ folder (or push it to your repo's gh-pages branch)"
echo "  2. In your GitHub repo → Settings → Pages, set the source to that branch / folder"
echo "  3. Your site will be live at:  https://<username>.github.io${BASE_PATH}"
echo ""
