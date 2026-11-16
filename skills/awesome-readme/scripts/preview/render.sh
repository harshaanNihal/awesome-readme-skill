#!/usr/bin/env bash
# GitHub-accurate README preview: GitHub's own renderer (gh api markdown), github-markdown-css, Mermaid, and
# screenshots in dark and light.
# Usage: README_TOOLS=<scratch folder with puppeteer-core in node_modules> render.sh <README.md> <repo-root> <out-dir>
# Needs: gh (logged in), node, Chrome (CHROME env var if not in a common place).
# Network use is limited to `gh api markdown` and two CDNs (jsdelivr for Mermaid, cdnjs for the CSS). Nothing else.
# Output: <out-dir>/readme-preview.html and <out-dir>/shots/{dark,light}-*.png plus shots/report.json.
# Exit code 1 means the check found problems (Mermaid errors, broken images, dead anchors, overflow). Read shots/report.json.
set -euo pipefail
: "${README_TOOLS:?set README_TOOLS to the scratch folder that holds node_modules}"
export README_TOOLS
[ $# -eq 3 ] || { echo "usage: render.sh <README.md> <repo-root> <out-dir>" >&2; exit 2; }
here=$(cd "$(dirname "$0")" && pwd)
readme=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
root=$(cd "$2" && pwd)
mkdir -p "$3"
out=$(cd "$3" && pwd)

node -e 'const fs=require("fs");fs.writeFileSync(process.argv[2],JSON.stringify({text:fs.readFileSync(process.argv[1],"utf8"),mode:"gfm"}))' "$readme" "$out/body.json"
gh api markdown --input "$out/body.json" > "$out/rendered.html"
node "$here/build.mjs" "$out/rendered.html" "$(dirname "$readme")" "$root" "$out/readme-preview.html"
node "$here/shoot.mjs" "$out/readme-preview.html" "$out/shots"
