// Offline Markdown to HTML for `render.sh --offline`, used by build.mjs. Importing this file checks that the packages are
// installed in $README_TOOLS/node_modules and, if not, prints the `npm i ...` line to run there and exits 2.
// It is an APPROXIMATION of GitHub's renderer: `marked` plus a few regexes that reshape its output like GitHub's HTML.
// It can differ from github.com in: syntax highlighting (none), emoji shortcodes, @mentions and #issue links, footnotes,
// math, callout icons, relative-link rewriting, heading id prefixes (shoot.mjs computes the ids GitHub would give),
// autolink and HTML-nesting edge cases, and the sanitizer (only <script>, <style>, iframe-like tags, style="..." and on*=
// attributes are dropped). The default mode (gh api markdown) is the accurate one.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const tools = path.resolve(process.env.README_TOOLS || process.cwd())
const nm = path.join(tools, 'node_modules')
// [file that proves the package is installed, install spec]. CSS and Mermaid match the versions the default mode loads from the CDNs.
const pkgs = [
  ['marked/package.json', 'marked@18.2.0'],
  ['github-markdown-css/github-markdown-dark.css', 'github-markdown-css@5.8.1'],
  ['mermaid/dist/mermaid.min.js', 'mermaid@11.4.1'],
]
const missing = pkgs.filter(([f]) => !fs.existsSync(path.join(nm, f))).map(([, spec]) => spec)
if (missing.length) {
  console.error(`--offline needs packages that are missing from ${nm}.\nInstall them once: cd "${tools}" && npm i ${missing.join(' ')}`)
  process.exit(2)
}
const { marked } = await import(pathToFileURL(createRequire(path.join(tools, 'noop.js')).resolve('marked')))

export const cssBase = `file://${nm}/github-markdown-css/github-markdown-` // + theme + '.css'
export const mermaidSrc = `file://${nm}/mermaid/dist/mermaid.min.js`

const kind = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' }

export function toHtml(text) {
  return marked.parse(text, { gfm: true })
    // Code blocks wrapped the way GitHub does, so build.mjs finds Mermaid blocks by .highlight-source-mermaid.
    .replace(/<pre><code(?: class="language-([^\s"]+)")?>([\s\S]*?)<\/code><\/pre>/g, (m, lang, code) => `<div class="highlight${lang ? ' highlight-source-' + lang : ''}"><pre>${code}</pre></div>`)
    // Callouts. ponytail: ends at the first </blockquote>, so a quote nested inside a callout breaks it.
    .replace(/<blockquote>\s*<p>\[!(note|tip|important|warning|caution)\]\s*([\s\S]*?)<\/blockquote>/gi, (m, k, body) => `<div class="markdown-alert markdown-alert-${k.toLowerCase()}" dir="auto"><p class="markdown-alert-title">${kind[k.toLowerCase()]}</p><p>${body.replace(/^<\/p>\s*<p>/, '')}</div>`)
    // Task lists, with the classes github-markdown-css styles.
    .replace(/<li><input ([^>]*type="checkbox"[^>]*)>/g, '<li class="task-list-item"><input class="task-list-item-checkbox" $1>')
    .replace(/<ul>(\s*<li class="task-list-item">)/g, '<ul class="contains-task-list">$1')
    // What GitHub's sanitizer removes. Code and prose are already escaped by marked, so only real HTML matches.
    .replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(link|meta|base)\b[^>]*>/gi, '')
    .replace(/<[a-z][^<>]*>/gi, (tag) => tag.replace(/\s(?:style|on\w+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ''))
    // GitHub adds this sizing to an image that has both width and height, so it keeps its ratio when the column is narrower.
    .replace(/<img\b(?=[^>]*\swidth=)[^>]*\sheight="?(\d+)[^>]*>/gi, (tag, h) => tag.replace(/\/?>$/, ` style="max-width: 100%; height: auto; max-height: ${h}px;">`))
}
