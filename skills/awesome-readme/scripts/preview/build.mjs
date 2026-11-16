// Wraps GitHub's rendered README HTML in a page that looks like github.com: github-markdown-css plus Mermaid.
// Usage: node build.mjs [--offline] <rendered.html> <readme-dir> <repo-root> <out.html>
// <rendered.html> is the answer of the Markdown API in "markdown" mode, which is what github.com uses for a README file
// (render.sh posts it). Paragraphs flow there; "gfm", the comment mode, would add a <br> at every newline.
// "markdown" mode returns headings in the markup GitHub serves: <div class="markdown-heading"><h2 class="heading-element">..</h2>
// <a class="anchor" id="user-content-<slug>">..</a></div>, with GitHub's own ids (shoot.mjs reads them), and Mermaid blocks as
// .highlight-source-mermaid. It leaves task lists and > [!NOTE] callouts as plain text, so they are rebuilt below.
// Still unlike github.com: relative links and images resolve against the local folder, not the repo; remote images and badges
// are placeholders; Mermaid comes from the CDN version pinned below, not GitHub's own renderer; callouts and task lists are
// rebuilt by regex; GitHub adds client-side extras (copy buttons, dir="auto", table wrappers, an icon in the heading permalink)
// that the API does not; the API moves the fallback <img> of a dark/light <picture> out of the <picture>; footnotes come back
// as a bare <section> without the "Footnotes" heading.
// --offline: the first argument is the README.md itself. It is rendered locally by offline.mjs (an approximation of GitHub's
// renderer, see there), and the stylesheet and Mermaid are read from README_TOOLS/node_modules instead of the CDNs.
// Relative images and links resolve against the README's folder (a base tag). A leading slash resolves against the repo root.
// Badge images are served from a proxy that this check does not contact, so they are swapped for local placeholders.
// The placeholder only shows layout. Verify the real badge URLs separately (they must return 200).
// Offline, every remote image gets a placeholder, because none can load.
import fs from 'node:fs'
import path from 'node:path'

const offline = process.argv.includes('--offline')
const [src, readmeDir, root, out] = process.argv.slice(2).filter((a) => a !== '--offline')
if (!out) { console.error('usage: node build.mjs [--offline] <rendered.html> <readme-dir> <repo-root> <out.html>'); process.exit(2) }
const off = offline ? await import('./offline.mjs') : null // exits 2 with the npm i line if a package is missing
let html = fs.readFileSync(src, 'utf8')
if (off) html = off.toHtml(html).replace(/<source\b[^>]*\bsrcset="https?:[^"]*"[^>]*>/gi, '')

html = html.replace(/(src|href)="\/(?!\/)([^"]*)"/g, (m, attr, p) => `${attr}="file://${root}/${p}"`)

// shields.io badge path: /badge/<label>-<message>-<color>, with "--" for a hyphen, "__" for an underscore, "_" for a space.
const clean = (s) => s.replace(/__/g, '\0').replace(/_/g, ' ').replace(/\0/g, '_').replace(/--/g, '-')
function badge(alt, canonical) {
  let label = alt
  let message = ''
  let color = '#2ea44f'
  const m = canonical && new URL(canonical).pathname.match(/^\/badge\/(.+)$/)
  if (m) {
    const parts = decodeURIComponent(m[1]).split(/(?<!-)-(?!-)/)
    if (/^[0-9a-f]{3,6}$/i.test(parts[parts.length - 1] ?? '')) color = '#' + parts.pop()
    ;[label, message = ''] = parts.length > 1 ? parts.map(clean) : ['', clean(parts[0] ?? alt)]
  }
  const lw = label ? Math.round(label.length * 6.3 + 12) : 0
  const mw = Math.round(message.length * 6.3 + 12) || 40
  const t = (x, w, s) => `<text x="${x + w / 2}" y="14" font-size="11" fill="#fff" text-anchor="middle" font-family="sans-serif">${s.replace(/[<&]/g, ' ')}</text>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + mw}" height="20"><rect width="${lw + mw}" height="20" rx="3" fill="#555"/><rect x="${lw}" width="${mw}" height="20" rx="3" fill="${color}"/>${label ? t(0, lw, label) : ''}${t(lw, mw, message || alt)}</svg>`
  return `<img alt="${alt}" data-badge="placeholder" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`
}
// The API's markdown mode returns task lists and callouts as plain text. Rebuild them in GitHub's markup (github-markdown-css
// styles it). The offline render already has task lists from marked and its callouts are the same plain blockquote.
// ponytail: the callout ends at the first </blockquote>, so a quote nested inside a callout breaks it.
const alerts = { // kind: [title, octicon name, 16px octicon path]
  note: ['Note', 'info', 'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z'],
  tip: ['Tip', 'light-bulb', 'M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z'],
  important: ['Important', 'report', 'M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z'],
  warning: ['Warning', 'alert', 'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z'],
  caution: ['Caution', 'stop', 'M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z'],
}
html = html
  .replace(/<li>(\s*<p>)?\[([ xX])\]\s/g, (m, p = '', c) => `<li class="task-list-item">${p}<input type="checkbox" disabled class="task-list-item-checkbox"${c === ' ' ? '' : ' checked'}> `)
  .replace(/<blockquote>\s*<p>\[!(note|tip|important|warning|caution)\]\s*([\s\S]*?)<\/blockquote>/gi, (m, k, body) => {
    const [title, icon, d] = alerts[k.toLowerCase()]
    return `<div class="markdown-alert markdown-alert-${k.toLowerCase()}"><p class="markdown-alert-title"><svg class="octicon octicon-${icon}" style="margin-right:8px" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="${d}"></path></svg>${title}</p><p>${body.replace(/^<\/p>\s*<p>/, '')}</div>`
  })

const remote = off ? /<img\b[^>]*src="https?:\/\/[^"]*"[^>]*>/gi : /<img\b[^>]*src="https:\/\/camo[^"]*"[^>]*>/g
html = html.replace(remote, (tag) => badge(tag.match(/alt="([^"]*)"/)?.[1] ?? '', tag.match(/data-canonical-src="([^"]*)"/)?.[1] ?? (off && tag.match(/src="([^"]*)"/)[1])))

const page = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>README preview</title>
<base href="file://${path.resolve(readmeDir)}/">
<style>
  html,body{margin:0}
  body{padding:24px 0}
  .box{box-sizing:border-box;width:896px;margin:0 auto;padding:32px;border:1px solid #d0d7de;border-radius:6px}
  .markdown-body{background:transparent}
  .dark body{background:#0d1117}.light body{background:#fff}
  .dark .box{border-color:#30363d}
  .mermaid-wrap{margin:0 0 16px}.mermaid-wrap pre.mermaid{display:block;width:100%;margin:0;padding:0;text-align:center}
  .mermaid-wrap svg{max-width:100%;height:auto}
</style>
<script>
  const theme = new URLSearchParams(location.search).get('theme') === 'light' ? 'light' : 'dark'
  document.documentElement.className = theme
  document.documentElement.setAttribute('data-color-mode', theme)
  const l = document.createElement('link'); l.rel = 'stylesheet'
  l.href = '${off ? off.cssBase : 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/github-markdown-'}' + theme + '${off ? '.css' : '.min.css'}'
  document.head.appendChild(l)
  window.__theme = theme
</script>
</head><body>
<div class="box"><article class="markdown-body" id="readme">
${html}
</article></div>
<!-- jsdelivr, not cdnjs: the cdnjs Mermaid build was blocked by the browser (ORB) in this local page. -->
<script src="${off ? off.mermaidSrc : 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js'}"></script>
<script>
  window.__mermaidErrors = []
  ;(async () => {
    for (const b of document.querySelectorAll('.highlight-source-mermaid')) {
      const wrap = document.createElement('div'); wrap.className = 'mermaid-wrap'
      const pre = document.createElement('pre'); pre.className = 'mermaid'; pre.textContent = b.querySelector('pre').textContent
      wrap.appendChild(pre); b.replaceWith(wrap)
    }
    if (typeof mermaid === 'undefined') { window.__mermaidErrors.push('mermaid script did not load'); window.__mermaidDone = true; return }
    mermaid.initialize({ startOnLoad: false, theme: window.__theme === 'dark' ? 'dark' : 'default', securityLevel: 'strict' })
    for (const el of document.querySelectorAll('pre.mermaid')) {
      try { await mermaid.run({ nodes: [el], suppressErrors: false }) } catch (e) { window.__mermaidErrors.push(String((e && e.message) || e)) }
    }
    window.__mermaidDone = true
  })()
</script>
</body></html>`
fs.writeFileSync(out, page)
console.log('wrote', out)
