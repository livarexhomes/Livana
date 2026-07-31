import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldFallbackToNextTier } from './ai.js'

test('falls back for auth, server, and timeout errors but not client-side request errors', () => {
  assert.equal(shouldFallbackToNextTier({ status: 401 }), true)
  assert.equal(shouldFallbackToNextTier({ status: 403 }), true)
  assert.equal(shouldFallbackToNextTier({ status: 500 }), true)
  assert.equal(shouldFallbackToNextTier({ message: 'Request timed out' }), true)
  assert.equal(shouldFallbackToNextTier({ status: 400 }), false)
  assert.equal(shouldFallbackToNextTier({ status: 404 }), false)
  assert.equal(shouldFallbackToNextTier({ status: 422 }), false)
})
