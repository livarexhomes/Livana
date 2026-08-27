process.env.NODE_ENV = 'test'
process.env.CHAT_API_SECRET = 'test-secret'
process.env.CHAT_ALLOWED_ORIGINS = 'https://www.livarex.com.ng,http://localhost:5173'
process.env.CHAT_RATE_LIMIT = '3'
process.env.CHAT_RATE_WINDOW_MS = '60000'

import test from 'node:test'
import assert from 'node:assert/strict'

// ESM `import` is hoisted, so we must use dynamic import() here so that the
// process.env lines above actually take effect on the module load.
const { app, chatBuckets, chatAuth, chatRateLimit, chatCors } = await import('./index.js')

function makeReq({ method = 'POST', path = '/api/chat', headers = {}, body, ip = '127.0.0.1' } = {}) {
  const req = {
    method,
    ip,
    socket: { remoteAddress: ip },
    path,
    headers: { 'content-type': 'application/json', ...headers },
    body,
  }
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    sendStatus(code) { this.statusCode = code; return this },
  }
  return { req, res }
}

function runMiddleware(mw, req, res) {
  return new Promise((resolve) => {
    let nextCalled = false
    const next = (err) => { nextCalled = true; resolve({ nextCalled: true, err }) }
    try {
      const result = mw(req, res, next)
      if (result && typeof result.then === 'function') {
        result.then(() => resolve({ nextCalled, async: true })).catch((err) => resolve({ nextCalled, err }))
      } else if (!nextCalled) {
        resolve({ nextCalled: false, sync: true })
      }
    } catch (err) {
      resolve({ nextCalled, err })
    }
  })
}

test('chatAuth rejects requests without the secret', async () => {
  const { req, res } = makeReq({ headers: {} })
  const r = await runMiddleware(chatAuth, req, res)
  assert.equal(r.nextCalled, false)
  assert.equal(res.statusCode, 401)
})

test('chatAuth accepts requests with the correct secret', async () => {
  const { req, res } = makeReq({ headers: { 'x-chat-secret': 'test-secret' } })
  const r = await runMiddleware(chatAuth, req, res)
  assert.equal(r.nextCalled, true)
})

test('chatAuth rejects with the wrong-length secret (timing-safe equal length guard)', async () => {
  const { req, res } = makeReq({ headers: { 'x-chat-secret': 'short' } })
  const r = await runMiddleware(chatAuth, req, res)
  assert.equal(r.nextCalled, false)
  assert.equal(res.statusCode, 401)
})

test('chatCors allows whitelisted origins and rejects others', async () => {
  const { req: req1, res: res1 } = makeReq({ method: 'OPTIONS', headers: { origin: 'https://www.livarex.com.ng' } })
  await runMiddleware(chatCors, req1, res1)
  assert.equal(res1.headers['access-control-allow-origin'], 'https://www.livarex.com.ng')

  const { req: req2, res: res2 } = makeReq({ method: 'OPTIONS', headers: { origin: 'https://evil.example' } })
  await runMiddleware(chatCors, req2, res2)
  assert.equal(res2.headers['access-control-allow-origin'], undefined)
})

test('chatRateLimit blocks after the configured number of requests', async () => {
  chatBuckets.clear()
  for (let i = 0; i < 3; i++) {
    const { req, res } = makeReq({ ip: '10.0.0.1' })
    const r = await runMiddleware(chatRateLimit, req, res)
    assert.equal(r.nextCalled, true, `request ${i + 1} should pass`)
  }
  const { req, res } = makeReq({ ip: '10.0.0.1' })
  const r = await runMiddleware(chatRateLimit, req, res)
  assert.equal(r.nextCalled, false)
  assert.equal(res.statusCode, 429)
  assert.ok(res.headers['retry-after'])
})

test('chatRateLimit buckets are independent per IP', async () => {
  chatBuckets.clear()
  for (let i = 0; i < 3; i++) {
    const { req, res } = makeReq({ ip: '10.0.0.2' })
    await runMiddleware(chatRateLimit, req, res)
  }
  const { req, res } = makeReq({ ip: '10.0.0.3' })
  const r = await runMiddleware(chatRateLimit, req, res)
  assert.equal(r.nextCalled, true, 'different IP gets its own bucket')
})
