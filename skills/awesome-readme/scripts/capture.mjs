// capture.mjs: README screenshots and a demo GIF from a running demo instance, using the installed Chrome.
// No ffmpeg: frames are PNG screenshots, encoded to GIF with gifenc.
//
// SETUP (once, in a scratch folder, never inside the repo you are documenting):
//   mkdir -p /tmp/readme-tools && cd /tmp/readme-tools && npm init -y && npm i puppeteer-core gifenc pngjs omggif
//   export README_TOOLS=/tmp/readme-tools   # the folder that holds node_modules (see lib.mjs)
//   export CHROME="/path/to/chrome"         # optional: common install paths are searched
// Needs Node 22.2 or later (zlib.crc32). Run it from the repo root so relative paths in the config resolve there.
//
// USAGE
//   node capture.mjs --config capture.json [name ...]
//   node capture.mjs --base-url http://127.0.0.1:8080/ --out docs/images     # no config: one screenshot, hero.png
// "name" picks a shot by file name without extension, or "gif". No names runs everything in the config.
// FLAGS (override the config): --config FILE  --base-url URL  --out DIR  --width N  --height N  --scale N
//   --server "cmd arg ..."   command that starts the demo instance (it is stopped after every shot)
//   --allow-remote           allow a base URL that is not loopback. Do not use this on a real service.
//
// CONFIG (JSON, see capture.example.json)
//   baseUrl, outDir, viewport {width,height,scale}, waitUntil (default networkidle0), timeout (ms, default 30000),
//   maxPngKB (default 600; bigger PNGs are re-encoded as 256-colour PNGs), allowOrigins [extra origins to allow],
//   server {command, args, cwd}: started fresh for each shot and polled at baseUrl until it answers, so
//     every shot starts from the same clean state.
//   shots [{ name, path, viewport, steps, element (CSS selector to screenshot), fullPage }]
//   gif   { name, path, viewport, steps, maxKB (default 4096), framesDir (keep the frames that went in, for checking) }
// STEPS (run in order; in the gif they run while frames are recorded)
//   {"goto":"/path"} {"click":"css"} {"type":"css","text":"...","delay":90} {"press":"Enter"} {"wait":ms}
//   {"waitFor":"css"} {"waitForText":"regex","selector":"css"} {"scroll":"css or empty","to":"bottom|top|<px>"}
//   {"eval":"js expression run in the page"} {"viewport":{...}} {"media":"print"} {"follow":"css"|false}
//   "follow" keeps the newest content of that scrollable element in view while frames are recorded.
//
// Safety: only the base URL's origin (plus allowOrigins) is reachable. Every other request the page makes is aborted
// and counted. A non-loopback base URL is refused unless --allow-remote is given.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromePath, need } from './lib.mjs'

const pp = need('puppeteer-core')
const puppeteer = pp.launch ? pp : pp.default
const { GIFEncoder, quantize, applyPalette } = need('gifenc')
const { PNG } = need('pngjs')

// ---- arguments and config
const argv = process.argv.slice(2)
const flags = {}
const names = []
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) names.push(argv[i])
  else if (argv[i] === '--allow-remote') flags.allowRemote = true
  else flags[argv[i].slice(2)] = argv[++i]
}
const cfg = flags.config ? JSON.parse(fs.readFileSync(flags.config, 'utf8')) : {}
if (flags['base-url']) cfg.baseUrl = flags['base-url']
if (flags.out) cfg.outDir = flags.out
cfg.viewport = { width: 1440, height: 900, scale: 2, ...cfg.viewport }
for (const k of ['width', 'height', 'scale']) if (flags[k]) cfg.viewport[k] = Number(flags[k])
if (flags.server) { const [command, ...args] = flags.server.split(/\s+/); cfg.server = { command, args } }
if (!cfg.baseUrl) { console.error('A base URL is required: --base-url or "baseUrl" in the config.'); process.exit(2) }
if (!cfg.shots && !cfg.gif) cfg.shots = [{ name: 'hero.png' }]

const base = new URL(cfg.baseUrl)
const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
if (!loopback && !flags.allowRemote) {
  console.error(`Refusing ${base.origin}: captures must come from a local demo instance, never a real service.`)
  process.exit(2)
}
const OUT = path.resolve(cfg.outDir || 'docs/images')
const TIMEOUT = cfg.timeout ?? 30000
const allowed = new Set([base.origin, ...(cfg.allowOrigins ?? [])])
const blocked = []
fs.mkdirSync(OUT, { recursive: true })

// ---- demo instance and browser session
async function startServer() {
  if (!cfg.server) return async () => {}
  const { command, args = [], cwd = '.' } = cfg.server
  const child = spawn(command, args, { cwd: path.resolve(cwd), stdio: ['ignore', 'ignore', 'inherit'] })
  let exited = null
  child.on('exit', (c) => (exited = c))
  for (let i = 0; i < 100; i++) {
    if (exited !== null) throw new Error(`demo server exited with code ${exited}`)
    try { await fetch(base.href); break } catch { await sleep(200) }
    if (i === 99) { child.kill(); throw new Error(`demo server did not answer at ${base.href}`) }
  }
  return () => new Promise((res) => { if (exited !== null) return res(); child.once('exit', res); child.kill('SIGTERM') })
}

async function session(item, fn) {
  const stop = await startServer()
  const browser = await puppeteer.launch({
    executablePath: chromePath(), headless: true,
    args: ['--disable-background-networking', '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb'],
  })
  try {
    const page = await browser.newPage()
    const v = { ...cfg.viewport, ...item.viewport }
    await page.setViewport({ width: v.width, height: v.height, deviceScaleFactor: v.scale })
    page.setDefaultTimeout(TIMEOUT)
    await page.setRequestInterception(true)
    page.on('request', (r) => {
      const u = r.url()
      if (/^(data|about|blob):/.test(u) || allowed.has(new URL(u).origin)) r.continue()
      else { blocked.push(u); r.abort() }
    })
    page.on('pageerror', (e) => console.error('pageerror:', e.message))
    await page.goto(new URL(item.path ?? '/', base).href, { waitUntil: cfg.waitUntil ?? 'networkidle0' })
    await fn(page)
  } finally {
    await browser.close()
    await stop()
  }
}

// ---- steps
async function run(page, steps = [], ctx = {}) {
  for (const s of steps) {
    if ('goto' in s) await page.goto(new URL(s.goto, base).href, { waitUntil: cfg.waitUntil ?? 'networkidle0' })
    else if ('click' in s) await page.click(s.click)
    else if ('type' in s) { await page.click(s.type); await page.type(s.type, s.text, { delay: s.delay ?? 0 }) }
    else if ('press' in s) await page.keyboard.press(s.press)
    else if ('wait' in s) await sleep(s.wait)
    else if ('waitFor' in s) await page.waitForSelector(s.waitFor)
    else if ('waitForText' in s) await page.waitForFunction((sel, re) => new RegExp(re).test(document.querySelector(sel || 'body')?.textContent ?? ''), {}, s.selector, s.waitForText)
    else if ('scroll' in s) await page.evaluate((sel, to) => { const e = sel ? document.querySelector(sel) : document.scrollingElement; e.scrollTop = to === 'bottom' ? e.scrollHeight : to === 'top' ? 0 : Number(to) }, s.scroll, s.to ?? 'bottom')
    else if ('eval' in s) await page.evaluate(s.eval)
    else if ('viewport' in s) { const v = { ...cfg.viewport, ...s.viewport }; await page.setViewport({ width: v.width, height: v.height, deviceScaleFactor: v.scale }) }
    else if ('media' in s) await page.emulateMediaType(s.media)
    else if ('follow' in s) ctx.follow = s.follow || null
    else throw new Error(`unknown step ${JSON.stringify(s)}`)
  }
}

// ---- screenshots
// Re-encodes a PNG as 8-bit indexed colour (one 256-colour palette). Flat UI colour plus text looks the same and shrinks a lot.
function toIndexed(file) {
  const { width, height, data } = PNG.sync.read(fs.readFileSync(file))
  const palette = quantize(data, 256, { format: 'rgb565' })
  const index = applyPalette(data, palette, 'rgb565')
  const raw = Buffer.alloc((width + 1) * height)
  for (let y = 0; y < height; y++) Buffer.from(index.buffer, index.byteOffset + y * width, width).copy(raw, y * (width + 1) + 1)
  const chunk = (type, body) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(body.length); head.write(type, 4, 'latin1')
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), body])))
    return Buffer.concat([head, body, crc])
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 3
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', Buffer.from(palette.flatMap((c) => c.slice(0, 3)))), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]))
}

async function takeShot(shot) {
  const name = path.extname(shot.name) ? shot.name : shot.name + '.png'
  await session(shot, async (page) => {
    await run(page, shot.steps)
    await page.mouse.move(0, 0) // no stray hover state
    const file = path.join(OUT, name)
    const target = shot.element ? await page.$(shot.element) : page
    if (!target) throw new Error(`element ${shot.element} not found for ${name}`)
    await target.screenshot({ path: file, type: 'png', ...(shot.element ? {} : { fullPage: !!shot.fullPage }) })
    if (fs.statSync(file).size > (cfg.maxPngKB ?? 600) * 1024) toIndexed(file)
    console.log('wrote', name, Math.round(fs.statSync(file).size / 1024), 'KB')
  })
}

// ---- GIF
async function recordGif(g) {
  await session({ viewport: { scale: 1, ...g.viewport }, path: g.path }, async (page) => {
    const frames = []
    const ctx = { follow: null }
    let on = true
    const loop = (async () => {
      while (on) {
        if (ctx.follow) await page.evaluate((sel) => { const t = document.querySelector(sel); if (t) t.scrollTop = t.scrollHeight }, ctx.follow).catch(() => {})
        const t = Date.now()
        frames.push({ t, png: await page.screenshot({ type: 'png' }) })
      }
    })()
    try { await run(page, g.steps, ctx) } finally { on = false; await loop }
    encodeGif(frames, path.join(OUT, g.name ?? 'demo.gif'), g)
  })
}

// Merges identical frames, builds one global palette, and writes every later frame as a diff against the one before.
function encodeGif(frames, file, g) {
  const imgs = frames.map((f) => PNG.sync.read(f.png))
  const { width, height } = imgs[0]
  const keep = []
  imgs.forEach((img, i) => {
    const delay = (frames[i + 1]?.t ?? frames[i].t + 100) - frames[i].t
    const last = keep[keep.length - 1]
    if (last && Buffer.compare(last.img.data, img.data) === 0) last.delay += delay
    else keep.push({ img, delay })
  })
  console.log(`frames ${frames.length} -> ${keep.length} distinct`)
  if (g.framesDir) {
    fs.rmSync(g.framesDir, { recursive: true, force: true })
    fs.mkdirSync(g.framesDir, { recursive: true })
    keep.forEach((k, i) => fs.writeFileSync(path.join(g.framesDir, `${String(i).padStart(3, '0')}-${k.delay}ms.png`), PNG.sync.write(k.img)))
  }
  // One palette from a sample of pixels across all kept frames. The last slot is the "unchanged" colour.
  const sample = Buffer.concat(keep.map((k, i) => {
    const px = []
    for (let p = (i % 7) * 4; p < k.img.data.length; p += 4 * 7) px.push(k.img.data[p], k.img.data[p + 1], k.img.data[p + 2], 255)
    return Buffer.from(px)
  }))
  const palette = quantize(sample, 255)
  palette.push([0, 0, 0])
  const T = 255
  const gif = GIFEncoder()
  let prev = null
  keep.forEach((k, i) => {
    const index = applyPalette(k.img.data, palette)
    const out = prev ? index.map((v, p) => (v === prev[p] ? T : v)) : index
    prev = index
    gif.writeFrame(out, width, height, { palette, delay: Math.max(k.delay, 40), transparent: !!i, transparentIndex: T, dispose: 1, repeat: 0 })
  })
  gif.finish()
  fs.writeFileSync(file, gif.bytes())
  const kb = Math.round(gif.bytes().length / 1024)
  console.log('wrote', path.basename(file), `${kb} KB`, `${width}x${height}`, 'plays', keep.reduce((a, k) => a + Math.max(k.delay, 40), 0), 'ms')
  if (kb > (g.maxKB ?? 4096)) console.warn(`WARNING: GIF is ${kb} KB, over the ${g.maxKB ?? 4096} KB limit. Shorten the steps, narrow the viewport, or change less of the screen.`)
}

// ---- main
const all = [...(cfg.shots ?? []).map((s) => ({ kind: 'shot', key: s.name.replace(/\.[^.]+$/, ''), s })), ...(cfg.gif ? [{ kind: 'gif', key: 'gif', s: cfg.gif }] : [])]
const todo = names.length ? all.filter((t) => names.includes(t.key)) : all
const missing = names.filter((n) => !all.some((t) => t.key === n))
if (missing.length) throw new Error(`unknown name(s): ${missing.join(', ')}. Known: ${all.map((t) => t.key).join(', ')}`)
for (const t of todo) await (t.kind === 'gif' ? recordGif(t.s) : takeShot(t.s))
console.log(blocked.length ? `WARNING: ${blocked.length} request(s) to other origins were blocked:\n  ${[...new Set(blocked)].join('\n  ')}` : 'blocked non-local requests: 0')
