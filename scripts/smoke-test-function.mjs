// Local smoke test for the assembled Vercel function.
// Simulates the Node.js launcher (shouldAddHelpers) calling the catch-all.
import { pathToFileURL } from 'node:url'

const funcDir = new URL(
  '../.vercel/output/functions/api/index.func/',
  import.meta.url
).pathname

const { default: handler } = await import(
  pathToFileURL(`${funcDir}index.js`).href + '?t=' + Date.now()
)

function makeReq({ url = '/api/chat', method = 'POST', body = {} }) {
  const req = { url, method, headers: { host: 'localhost' }, body }
  req.query = {}
  const qIndex = url.indexOf('?')
  if (qIndex !== -1) {
    for (const [k, v] of new URLSearchParams(url.slice(qIndex + 1))) {
      req.query[k] = v
    }
  }
  return req
}

function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this },
    setHeader(k, v) { this.headers[k] = v },
    json(payload) { this.body = payload },
    end(payload) { if (payload) this.body = payload },
  }
  return res
}

const tests = [
  { name: 'POST /api/chat -> chat handler (fallback reply)', url: '/api/chat?path=chat', method: 'POST' },
  { name: 'GET /api/chat -> 405', url: '/api/chat?path=chat', method: 'GET' },
  { name: 'unknown route -> 404', url: '/api/nope?path=nope', method: 'POST' },
  { name: 'send-otp route resolves', url: '/api/send-otp?path=send-otp', method: 'POST' },
]

let failed = 0
for (const t of tests) {
  const req = makeReq({ url: t.url, method: t.method })
  const res = makeRes()
  try {
    await handler(req, res)
    const ok =
      (t.name.includes('chat') && t.method === 'POST' && res.statusCode === 200 && res.body?.reply) ||
      (t.method === 'GET' && res.statusCode === 405) ||
      (t.name.includes('unknown') && res.statusCode === 404) ||
      (t.name.includes('send-otp') && (res.statusCode === 200 || res.statusCode === 400))
    console.log(`${ok ? '✓' : '✗'} ${t.name} -> ${res.statusCode} ${JSON.stringify(res.body).slice(0, 80)}`)
    if (!ok) failed++
  } catch (err) {
    console.log(`✗ ${t.name} -> THREW: ${err.message}`)
    failed++
  }
}
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
