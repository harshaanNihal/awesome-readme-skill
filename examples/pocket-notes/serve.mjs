// Static file server for this folder. Node built-ins only, loopback only.
// Usage: node serve.mjs [--port 4599]   (or set PORT)
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }
const flag = process.argv.indexOf('--port')
const port = Number(flag > 0 ? process.argv[flag + 1] : process.env.PORT || 4599)
if (!Number.isInteger(port) || port < 1 || port > 65535) { console.error('Invalid port.'); process.exit(2) }

const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const file = path.resolve(root, '.' + (rel.endsWith('/') ? rel + 'index.html' : rel))
    const type = types[path.extname(file)] // only the app's own page, script and stylesheet are served
    if (!['GET', 'HEAD'].includes(req.method) || !type || !file.startsWith(root + path.sep)) throw new Error('not served')
    const body = await readFile(file) // read first, so a missing file still gets a clean 404
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }).end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found')
  }
})
server.on('error', (e) => { console.error(e.message); process.exit(1) })
server.listen(port, '127.0.0.1', () => console.log(`Pocket Notes: http://127.0.0.1:${port}/`))
