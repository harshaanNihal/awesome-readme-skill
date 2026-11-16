// Wraps GitHub's rendered README HTML in a page that looks like github.com: github-markdown-css plus Mermaid.
// Usage: node build.mjs [--offline] <rendered.html> <readme-dir> <repo-root> <out.html>
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
