// Force the in-memory fallback path for everything in this file. ESM
// `import` is hoisted, so we set env before the dynamic import.
process.env.VITE_SUPABASE_URL = ''
process.env.SUPABASE_SERVICE_ROLE_KEY = ''

import test from 'node:test'
import assert from 'node:assert/strict'

const { scheduleFollowUp, isFollowUpScheduled, upsertLead, markFollowUpSent } = await import('./leads.js')

const phone = 'test-' + Math.random().toString(36).slice(2)

test('fresh lead has no follow-up scheduled', async () => {
  await upsertLead(phone, 'Ada', 'Hello there')
  assert.equal(await isFollowUpScheduled(phone), false)
})

test('scheduleFollowUp sets a due time but not a sent time', async () => {
  await scheduleFollowUp(phone, 24)
  // No follow-up sent yet — but a due time was set, so isFollowUpScheduled
  // (which checks follow_up_sent_at) is still false.
  assert.equal(await isFollowUpScheduled(phone), false)
})

test('markFollowUpSent flips the scheduled flag to true', async () => {
  await markFollowUpSent(phone)
  assert.equal(await isFollowUpScheduled(phone), true)
})

test('scheduleFollowUp is a no-op semantics-wise once a follow-up has been sent', async () => {
  // The webhook layer only calls scheduleFollowUp when isFollowUpScheduled
  // is false, so re-scheduling doesn't matter there. But if it is called
  // anyway, it must not throw.
  await scheduleFollowUp(phone, 24)
  assert.equal(await isFollowUpScheduled(phone), true)
})
