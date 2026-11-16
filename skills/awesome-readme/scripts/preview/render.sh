#!/usr/bin/env bash
# GitHub-accurate README preview: GitHub's own renderer (gh api markdown, mode "markdown"), github-markdown-css, Mermaid, and
# screenshots in dark and light.
# Usage: README_TOOLS=<scratch folder with puppeteer-core in node_modules> render.sh [--offline] <README.md> <repo-root> <out-dir>
#   <repo-root> is the top folder of the repository. It only matters for a link or image that starts with "/", which GitHub
#   resolves against the repository root. A relative path resolves against the README's own folder whatever you pass here
#   (tested with a README in a sub-folder). So pass the repository's top folder for every README, also one in a sub-folder.
#   <out-dir>: use a new folder for each run. A second run into the same folder overwrites the first and can leave some of
#   its screenshots behind.
# Needs: gh (logged in), node, Chrome (CHROME env var if not in a common place). --offline needs no gh.
# Network use in a default-mode run: `gh api markdown` sends the README text to GitHub's Markdown API. Chrome downloads the
#   stylesheet from cdnjs.cloudflare.com and Mermaid from cdn.jsdelivr.net. Those two requests carry no README text, and the
#   page may load nothing else: any other request is blocked and fails the run. Chrome's background networking and component
#   updates are switched off, but Chrome can still make a few startup requests of its own (see shoot.mjs). They are the same
#   with no README open, and only --offline stops them. Not part of the run: the helper packages come from the npm registry
#   when you install them, and stage 6 of the skill pushes to the project's remote. --offline lets nothing leave the machine.
# Output: <out-dir>/readme-preview.html and <out-dir>/shots/{dark,light}-*.png plus shots/report.json.
# Exit code 1 means the check found problems (Mermaid errors, broken images, dead anchors, overflow). Read shots/report.json.
#
# Render mode: the README is posted with "mode": "markdown", the mode github.com uses for a README.md file. "gfm" is the mode for
#   comments: it turns every newline inside a paragraph into <br>, so a hard-wrapped README previewed with line breaks that
#   GitHub does not show (a hard-wrapped README gave 82 <br> in "gfm" and 0 in GitHub's own HTML). No "context" field: it
#   changes nothing in "markdown" mode. Compared with GitHub's own HTML for three public READMEs, "markdown" mode gave the
#   same line flow and the same heading ids. It returns task lists and > [!NOTE] callouts as plain text, so build.mjs rebuilds
#   those two. What still differs from github.com is listed at the top of build.mjs.
#
# --offline: for a README that must not leave the machine. No `gh`, no CDN, no network at all: Chrome gets every request that
#   is not a local file or data: URL aborted, and any such request fails the run with the list. The Markdown is rendered with
#   `marked`, the stylesheet comes from github-markdown-css and Mermaid from the mermaid package, all read from
#   $README_TOOLS/node_modules. If one is missing the script prints the `npm i ...` line to run in $README_TOOLS.
#   Remote images (badges, hosted screenshots) cannot load, so they become local placeholders and are NOT checked. The default
#   mode swaps them for placeholders too, and both modes print how many. Everything else is still checked.
#   --offline is an APPROXIMATION of GitHub's renderer. Paragraphs flow as in "markdown" mode. It can differ from github.com in:
#   syntax highlighting (none), emoji shortcodes, @mentions and #issue links, footnotes, math, relative-link rewriting, heading
#   ids and permalinks, autolink and HTML-nesting edge cases, and the HTML sanitizer (it removes <script>, <style>, <iframe>,
#   <object>, <embed> and <form> elements that have a closing tag, with what is inside them, the <link>, <meta> and <base> tags,
#   and style="..." and on*= attributes, and nothing more; an opening tag with no closing tag is left alone). The default mode
#   stays the accurate one: run it before you deliver when you can.
set -euo pipefail
: "${README_TOOLS:?set README_TOOLS to the scratch folder that holds node_modules}"
export README_TOOLS
usage() { echo "usage: render.sh [--offline] <README.md> <repo-root> <out-dir>   (--offline: no gh, no network; an approximation of GitHub; <repo-root>: top folder of the repository, used only for links that start with /)" >&2; exit 2; }
offline=""
args=()
for a in "$@"; do
  case $a in
    --offline) offline=1 ;;
    --*) echo "unknown option: $a" >&2; usage ;;
    *) args+=("$a") ;;
  esac
done
[ ${#args[@]} -eq 3 ] || usage
here=$(cd "$(dirname "$0")" && pwd)
readme=$(cd "$(dirname "${args[0]}")" && pwd)/$(basename "${args[0]}")
root=$(cd "${args[1]}" && pwd)
mkdir -p "${args[2]}"
out=$(cd "${args[2]}" && pwd)

src=$readme
if [ -z "$offline" ]; then
  node -e 'const fs=require("fs");fs.writeFileSync(process.argv[2],JSON.stringify({text:fs.readFileSync(process.argv[1],"utf8"),mode:"markdown"}))' "$readme" "$out/body.json"
  gh api markdown --input "$out/body.json" > "$out/rendered.html"
  src=$out/rendered.html
fi
node "$here/build.mjs" ${offline:+--offline} "$src" "$(dirname "$readme")" "$root" "$out/readme-preview.html"
node "$here/shoot.mjs" ${offline:+--offline} "$out/readme-preview.html" "$out/shots"
