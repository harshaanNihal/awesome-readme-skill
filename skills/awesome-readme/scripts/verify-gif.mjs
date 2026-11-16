// verify-gif.mjs: decodes a GIF and prints size, frame count, loop count and total play time. Optionally compares
// every frame to the PNGs that went in (set "framesDir" in the capture config to keep them).
// The "total play time" it prints is the figure to quote for a README: it adds up the delays stored in the file (hundredths of
// a second). capture.mjs prints its own figure from millisecond timers, which differs slightly. Neither tool checks the
// advice of 6 to 10 seconds and at most about 1200 px wide: compare the printed play time and size with it.
// Usage: README_TOOLS=<scratch folder with node_modules> node verify-gif.mjs docs/images/demo.gif [framesDir] [--frames <dir>]
// --frames <dir> writes every frame of the GIF as <dir>/NNN-<delay>ms.png, to open them with an image reader. The folder
// is created if missing and must be empty. It needs no framesDir in the capture config.
import fs from 'node:fs'
import path from 'node:path'
import { need } from './lib.mjs'

const omggif = need('omggif')
const { PNG } = need('pngjs')
const args = process.argv.slice(2)
const f = args.indexOf('--frames')
const outDir = f >= 0 ? args.splice(f, 2)[1] : null
const [file, framesDir] = args
if (!file || (f >= 0 && !outDir)) { console.error('usage: node verify-gif.mjs file.gif [framesDir] [--frames <dir>]'); process.exit(2) }
if (outDir && fs.existsSync(outDir) && fs.readdirSync(outDir).length) { console.error(`${outDir} is not empty: pick a new folder for --frames.`); process.exit(2) }
if (outDir) fs.mkdirSync(outDir, { recursive: true })
const bytes = fs.readFileSync(file)
const gif = new omggif.GifReader(bytes)
const { width, height } = gif
const canvas = new Uint8ClampedArray(width * height * 4)
const refs = framesDir ? fs.readdirSync(framesDir).sort() : []
let total = 0
console.log(`size ${(bytes.length / 1024).toFixed(0)} KB, ${width}x${height}, frames ${gif.numFrames()}, loops ${gif.loopCount()} (0 = forever)`)
for (let i = 0; i < gif.numFrames(); i++) {
  const info = gif.frameInfo(i)
  total += info.delay * 10
  gif.decodeAndBlitFrameRGBA(i, canvas)
  if (outDir) fs.writeFileSync(path.join(outDir, `${String(i).padStart(3, '0')}-${info.delay * 10}ms.png`), PNG.sync.write({ width, height, data: Buffer.from(canvas.buffer) }))
  if (refs[i] && (i % 9 === 0 || i === gif.numFrames() - 1)) {
    const ref = PNG.sync.read(fs.readFileSync(path.join(framesDir, refs[i]))).data
    let d = 0
    for (let p = 0; p < canvas.length; p += 4) d += Math.abs(canvas[p] - ref[p]) + Math.abs(canvas[p + 1] - ref[p + 1]) + Math.abs(canvas[p + 2] - ref[p + 2])
    console.log(`frame ${i}: delay ${info.delay * 10} ms, mean abs RGB diff ${(d / (width * height * 3)).toFixed(2)}`)
  }
}
console.log(`total play time ${total} ms`)
if (outDir) console.log(`wrote ${gif.numFrames()} frames to ${outDir}`)
if (bytes.length > 4 * 1024 * 1024) console.warn('WARNING: over 4 MB')
