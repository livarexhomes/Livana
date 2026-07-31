import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldFallbackToNextTier, isWafHtmlBody, assertJsonBody } from './ai.js'

test('falls back for auth, server, and timeout errors but not client-side request errors', () => {
  assert.equal(shouldFallbackToNextTier({ status: 401 }), true)
  assert.equal(shouldFallbackToNextTier({ status: 403 }), true)
  assert.equal(shouldFallbackToNextTier({ status: 500 }), true)
  assert.equal(shouldFallbackToNextTier({ message: 'Request timed out' }), true)
  assert.equal(shouldFallbackToNextTier({ status: 400 }), false)
  assert.equal(shouldFallbackToNextTier({ status: 404 }), false)
  assert.equal(shouldFallbackToNextTier({ status: 422 }), false)
})

test('detects HTML/WAF challenge bodies returned as fake JSON responses', () => {
  assert.equal(isWafHtmlBody('<!doctypehtml><meta name="aliyun_waf_aa"content="abc">'), true)
  assert.equal(isWafHtmlBody('<!DOCTYPE html>\n<html><head><title>Just a moment...</title></head></html>'), true)
  assert.equal(isWafHtmlBody('<html><body>challenge</body></html>'), true)
  assert.equal(isWafHtmlBody('{"content":[{"type":"text","text":"hi"}]}'), false)
  assert.equal(isWafHtmlBody(''), false)
  assert.equal(isWafHtmlBody(null), false)
})

test('assertJsonBody throws a fallback-able 502 error on HTML bodies and passes JSON through', () => {
  assert.throws(
    () => assertJsonBody('<!doctype html><html></html>', 'Anthropic'),
    (err) => err.status === 502 && err.message.includes('Anthropic')
  )
  assert.doesNotThrow(() => assertJsonBody('{"ok":true}', 'Anthropic'))
})
