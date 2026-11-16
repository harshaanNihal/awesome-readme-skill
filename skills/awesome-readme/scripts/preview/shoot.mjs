// Opens the preview page in dark and light, checks it, and saves screenshots.
// Usage: README_TOOLS=<scratch folder> node shoot.mjs [--offline] <readme-preview.html> <out-dir>
// Network, both modes: Chrome starts with --disable-background-networking and --disable-component-update. They do not stop
//   everything: Chrome 157 still made four startup requests of its own, to Google hosts (a clock check, an account list and
//   two others), the same with no README open. The page interception below cannot see them, and they carry nothing from the
//   README.
//   Default mode: the page may load only from cdnjs.cloudflare.com (the stylesheet) and cdn.jsdelivr.net (Mermaid). Those two
//   requests carry no README text. Every other request the page makes is aborted, recorded and fails the run.
//   --offline: Chrome gets no network at all. Only file:, data: and about: requests run. Any other request is aborted, recorded
//   and fails the run with the full list (the CDN allowance is off). The render is an approximation of GitHub's (see
//   offline.mjs); the default mode is the accurate one.
// Saves per theme (dark and light) in <out-dir>: <theme>-first.png (the first screen), <theme>-slice-NN.png (the whole page
// in 900 px slices), <theme>-mermaid-N.png (each diagram) and <theme>-details-N.png (each <details> opened), plus report.json.
// Open every PNG. A GIF shows as one arbitrary still frame here: judge a GIF when it is made (stage 2).
// Checks (printed, and written to report.json): Mermaid parse errors and diagrams with no size (no screenshot), broken images,
// tall images (rendered more than 900 px high at the width shown) outside <details>, links to #anchors that match no heading,
// code blocks and tables wider than the column, horizontal page scroll. A code block that is too wide is reported with the number of characters that fit and, for
// each line that does not, its line number in the block, its length and its first 60 characters.
// Prints how many remote images (badges, hosted pictures) were swapped for local placeholders: those are NOT checked.
// Exit code 1 when any check fails. Look at the screenshots too: the checks cannot see ugly.
import fs from 'node:fs'
import path from 'node:path'
import { chromePath, need } from '../lib.mjs'

const pp = need('puppeteer-core')
const puppeteer = pp.launch ? pp : pp.default
const offline = process.argv.includes('--offline')
const [html, outDir] = process.argv.slice(2).filter((a) => a !== '--offline')
if (!outDir) { console.error('usage: node shoot.mjs [--offline] <readme-preview.html> <out-dir>'); process.exit(2) }
fs.mkdirSync(outDir, { recursive: true })
const cdn = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//
// Both modes switch off Chrome's own background requests. puppeteer-core 25.17.0 adds --disable-background-networking itself;
// it is passed here too so the run does not depend on the puppeteer version. --disable-component-update stops the component
// downloads that the first flag left running in Chrome 157. The host rule below stays offline-only: the default mode has to
// reach two CDN hosts.
// Offline also makes every host name fail to resolve, so Chrome's own startup requests cannot leave either (Chrome 157 still
// starts them, and they fail at name resolution), as a second wall behind the interception.
const args = ['--allow-file-access-from-files', '--disable-background-networking', '--disable-component-update', ...(offline ? ['--host-resolver-rules=MAP * ~NOTFOUND'] : [])]
const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true, args })
const report = {}
const problems = []
// Every per-element screenshot goes through here. An element with no size (a diagram that failed to render, a hidden <details>)
// makes puppeteer throw ("Node has 0 height"), which would lose report.json. Record it as a problem instead and go on. A problem
// already listed by the checks (the same "diagram N did not render") is not listed twice.
async function shot(el, file, problem) {
  try { await el.screenshot({ path: file }) } catch (e) {
    if (!problems.includes(problem)) problems.push(problem)
    console.error(`${problem}: ${e.message}`)
  }
}

for (const theme of ['dark', 'light']) {
  const r = (report[theme] = { console: [], blocked: [], pageErrors: [], requests: {} })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const u = req.url()
    const scheme = u.split(':')[0]
    const key = /^https?$/.test(scheme) ? new URL(u).origin : scheme // request log: count per origin (http, https) or per scheme
    r.requests[key] = (r.requests[key] ?? 0) + 1
    if (/^(file|data|about):/.test(u) || (!offline && cdn.test(u))) req.continue()
    else { r.blocked.push(u); req.abort() }
  })
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) r.console.push(m.type() + ': ' + m.text()) })
  page.on('pageerror', (e) => r.pageErrors.push(String(e)))
  await page.goto('file://' + path.resolve(html) + '?theme=' + theme, { waitUntil: 'load' })
  await page.waitForFunction('window.__mermaidDone === true', { timeout: 30000 }).catch(() => problems.push(`${theme}: mermaid never finished`))
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), { timeout: 15000 }).catch(() => {})
  await new Promise((s) => setTimeout(s, 800))

  r.mermaidErrors = await page.evaluate(() => window.__mermaidErrors)
  r.mermaid = await page.evaluate(() => [...document.querySelectorAll('pre.mermaid')].map((p) => ({
    hasSvg: !!p.querySelector('svg'),
    syntaxError: /Syntax error/i.test(p.textContent) || !!p.querySelector('.error-icon, .error-text'),
    width: p.querySelector('svg') && Math.round(p.querySelector('svg').getBoundingClientRect().width),
  })))
  r.images = await page.evaluate(() => [...document.querySelectorAll('article img')].map((i) => ({
    src: (i.getAttribute('src') || '').slice(0, 60),
    natural: i.naturalWidth + 'x' + i.naturalHeight,
    shown: Math.round(i.getBoundingClientRect().width) + 'x' + Math.round(i.getBoundingClientRect().height),
    ok: i.complete && i.naturalWidth > 0,
    tallOutsideDetails: i.getBoundingClientRect().height > 900 && !i.closest('details'),
  })))
  // Link targets. The API's markdown mode returns GitHub's own ids (headings as user-content-<slug> with repeats -1, -2, and
  // explicit <a name> / id= with the same prefix), and a #slug link reaches them, so strip the prefix. The offline render has
  // no ids on its headings, so compute them: lower case, drop punctuation, spaces to hyphens, repeats get -1, -2.
  r.anchors = await page.evaluate(() => {
    const seen = {}
    const ids = new Set([...document.querySelectorAll('article [id], article a[name]')].flatMap((e) => { const i = e.id || e.getAttribute('name') || ''; return [i, i.replace(/^user-content-/, '')] }))
    for (const h of document.querySelectorAll('article h1, article h2, article h3, article h4, article h5, article h6')) {
      if (h.nextElementSibling?.classList.contains('anchor')) continue // GitHub's id for this heading is in the set already
      const base = h.textContent.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '').replace(/\s/g, '-')
      ids.add(seen[base] ? `${base}-${seen[base]}` : base)
      seen[base] = (seen[base] ?? 0) + 1
    }
    return [...document.querySelectorAll('article a[href^="#"]')].map((a) => a.getAttribute('href').slice(1)).filter((id) => id && !ids.has(decodeURIComponent(id).toLowerCase()) && !ids.has(id))
  })
  r.placeholders = await page.evaluate(() => document.querySelectorAll('img[data-badge]').length)
  r.overflow = await page.evaluate(() => ({
    pre: [...document.querySelectorAll('pre:not(.mermaid)')].filter((p) => p.scrollWidth > p.clientWidth).map((p) => {
      // How many characters fit: measure 100 characters in the block's own font, then divide the width inside the padding.
      const probe = document.createElement('span')
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre'
      probe.textContent = '0'.repeat(100)
      ;(p.querySelector('code') ?? p).appendChild(probe)
      const charW = probe.getBoundingClientRect().width / 100
      probe.remove()
      const s = getComputedStyle(p)
      const cols = Math.floor((p.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)) / charW)
      const all = p.textContent.replace(/\n$/, '').split('\n').map((t, i) => ({ n: i + 1, len: t.length, text: t.slice(0, 60) }))
      const wide = all.filter((l) => l.len > cols)
      return { scrollW: p.scrollWidth, clientW: p.clientWidth, cols, lines: wide.length ? wide : [all.reduce((a, b) => (b.len > a.len ? b : a))] }
    }),
    tables: [...document.querySelectorAll('table')].filter((t) => t.scrollWidth > t.clientWidth).map((t) => ({ scrollW: t.scrollWidth, clientW: t.clientWidth, head: t.querySelector('th')?.textContent })),
    pageScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))

  if (r.mermaidErrors.length) problems.push(`${theme}: mermaid errors: ${r.mermaidErrors.join(' | ')}`)
  r.mermaid.forEach((m, i) => (m.syntaxError || !m.hasSvg) && problems.push(`${theme}: diagram ${i + 1} did not render`))
  r.images.filter((i) => !i.ok).forEach((i) => problems.push(`${theme}: image failed to load: ${i.src}`))
  r.images.filter((i) => i.tallOutsideDetails).forEach((i) => problems.push(`${theme}: tall image outside <details>: ${i.src}`))
  r.anchors.forEach((a) => problems.push(`${theme}: link to #${a} matches no heading`))
  r.overflow.pre.forEach((p) => problems.push(`${theme}: code block wider than the column (${p.cols} characters fit on a line). Shorten these lines, or split a shell line with a trailing backslash:\n    ` + p.lines.map((l) => `line ${l.n} of the block has ${l.len} characters: ${l.text}`).join('\n    ')))
  r.overflow.tables.forEach((t) => problems.push(`${theme}: table wider than the column: ${t.head}`))
  if (r.overflow.pageScroll) problems.push(`${theme}: page scrolls sideways`)
  if (r.blocked.length) problems.push(offline ? `${theme}: network request(s) attempted, all aborted: ${[...new Set(r.blocked)].join(' ')}` : `${theme}: blocked ${r.blocked.length} request(s), first: ${r.blocked[0]}`)

  const H = await page.evaluate(() => document.documentElement.scrollHeight)
  r.height = H
  await page.screenshot({ path: `${outDir}/${theme}-first.png`, clip: { x: 0, y: 0, width: 1280, height: 900 } })
  let n = 0
  for (let y = 0; y < H; y += 900) {
    n++
    await page.screenshot({ path: `${outDir}/${theme}-slice-${String(n).padStart(2, '0')}.png`, clip: { x: 0, y, width: 1280, height: Math.min(900, H - y) }, captureBeyondViewport: true })
  }
  r.slices = n
  const ms = await page.$$('.mermaid-wrap')
  for (let i = 0; i < ms.length; i++) await shot(ms[i], `${outDir}/${theme}-mermaid-${i + 1}.png`, `${theme}: diagram ${i + 1} did not render`)
  const ds = await page.$$('details')
  for (let i = 0; i < ds.length; i++) {
    await ds[i].evaluate((d) => { d.open = true })
    await new Promise((s) => setTimeout(s, 200))
    await shot(ds[i], `${outDir}/${theme}-details-${i + 1}.png`, `${theme}: <details> ${i + 1} has no size, no screenshot`)
  }
  r.details = ds.length
  await page.close()
}
await browser.close()
report.problems = problems
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1))
const d = report.dark
console.log(`dark: ${d.slices} slices, ${d.mermaid.length} diagram(s), ${d.images.length} image(s), ${d.details} <details>; light: ${report.light.slices} slices`)
const blockedAll = d.blocked.length + report.light.blocked.length
console.log(`${offline ? 'offline' : 'default'}: ${d.placeholders} remote image(s) (badges, hosted pictures) replaced by local placeholders and NOT checked; requests by ${offline ? 'scheme' : 'origin'}: ${JSON.stringify(d.requests)}; ${blockedAll} request(s) blocked`)
if (offline) console.log('offline render is an approximation of GitHub. Run without --offline for the accurate check when you can.')
console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'No problems found by the automated checks. Now look at the screenshots.')
console.log('screenshots and report.json in', outDir)
process.exit(problems.length ? 1 : 0)
