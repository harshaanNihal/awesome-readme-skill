// verify-gif.mjs: decodes a GIF and prints size, frame count, loop count and total play time. Optionally compares
// every frame to the PNGs that went in (set "framesDir" in the capture config to keep them).
// Usage: README_TOOLS=<scratch folder with node_modules> node verify-gif.mjs docs/images/demo.gif [framesDir]
import fs from 'node:fs'
import path from 'node:path'
import { need } from './lib.mjs'

const omggif = need('omggif')
const { PNG } = need('pngjs')
const [file, framesDir] = process.argv.slice(2)
if (!file) { console.error('usage: node verify-gif.mjs file.gif [framesDir]'); process.exit(2) }
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
  if (refs[i] && (i % 9 === 0 || i === gif.numFrames() - 1)) {
    const ref = PNG.sync.read(fs.readFileSync(path.join(framesDir, refs[i]))).data
    let d = 0
    for (let p = 0; p < canvas.length; p += 4) d += Math.abs(canvas[p] - ref[p]) + Math.abs(canvas[p + 1] - ref[p + 1]) + Math.abs(canvas[p + 2] - ref[p + 2])
    console.log(`frame ${i}: delay ${info.delay * 10} ms, mean abs RGB diff ${(d / (width * height * 3)).toFixed(2)}`)
  }
}
console.log(`total play time ${total} ms`)
if (bytes.length > 4 * 1024 * 1024) console.warn('WARNING: over 4 MB')
