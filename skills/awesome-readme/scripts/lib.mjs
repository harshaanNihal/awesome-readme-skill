// Shared helpers for the awesome-readme scripts.
// The helper packages (puppeteer-core, gifenc, pngjs, omggif) live in a scratch folder, never in the repo being documented.
// Point README_TOOLS at that folder (the one that holds node_modules). It defaults to the current directory.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

export function need(pkg) {
  const dir = path.resolve(process.env.README_TOOLS || process.cwd())
  try {
    return createRequire(path.join(dir, 'noop.js'))(pkg)
  } catch {
    console.error(`Cannot load "${pkg}" from ${dir}/node_modules.\nInstall once in a scratch folder: npm i puppeteer-core gifenc pngjs omggif\nThen run with README_TOOLS=<that folder>.`)
    process.exit(2)
  }
}

export function chromePath() {
  const found = [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].find((p) => p && fs.existsSync(p))
  if (!found) {
    console.error('Chrome not found. Set CHROME to the browser executable.')
    process.exit(2)
  }
  return found
}
