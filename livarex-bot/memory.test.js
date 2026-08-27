import test from 'node:test'
import assert from 'node:assert/strict'
import { saveMessage, getConversationHistory, clearHistory } from './memory.js'

test('saveMessage caps content at MAX_MESSAGE_LENGTH (in-memory)', async () => {
  await clearHistory('test-cap')
  const huge = 'x'.repeat(10_000)
  await saveMessage('test-cap', 'user', huge)
  const history = await getConversationHistory('test-cap')
  assert.equal(history.length, 1)
  assert.equal(history[0].content.length, 4096)
  await clearHistory('test-cap')
})

test('saveMessage coerces non-string content safely', async () => {
  await clearHistory('test-coerce')
  await saveMessage('test-coerce', 'user', null)
  const history = await getConversationHistory('test-coerce')
  assert.equal(history[0].content, '')
  await clearHistory('test-coerce')
})

test('history is bounded to the last MAX_HISTORY messages', async () => {
  await clearHistory('test-bounded')
  for (let i = 0; i < 25; i++) {
    await saveMessage('test-bounded', 'user', `m${i}`)
  }
  const history = await getConversationHistory('test-bounded')
  assert.equal(history.length, 20)
  assert.equal(history[0].content, 'm5')
  assert.equal(history[19].content, 'm24')
  await clearHistory('test-bounded')
})
