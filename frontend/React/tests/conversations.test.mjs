import test from 'node:test'
import assert from 'node:assert/strict'
import { currentMessage, mergeTurn, validationFields, visibleConversations } from '../src/utils/conversations.js'

test('cancelled conversations disappear at the deadline; other states remain visible', () => {
  const items = [{ conversation_id: 1, status: 'cancelled' }, { conversation_id: 2, status: 'collecting' }, { conversation_id: 3, status: 'submitted' }]
  assert.equal(visibleConversations(items, { 1: 30000 }, 29999).length, 3)
  assert.deepEqual(visibleConversations(items, { 1: 30000 }, 30000).map((item) => item.conversation_id), [2, 3])
  assert.equal(visibleConversations(items, {}, 0).length, 2)
})

test('only the current version can act; a later turn consumes forms', () => {
  const form = { id: 1, role: 'assistant', type: 'form', metadata: { draft_version: 2 } }
  const conversation = { status: 'needs_information', draft: { version: 2 }, messages: [form] }
  assert.equal(currentMessage(conversation, form), true)
  assert.equal(currentMessage({ ...conversation, status: 'cancelled' }, form), false)
  assert.equal(currentMessage({ ...conversation, draft: { version: 3 } }, form), false)
  assert.equal(currentMessage({ ...conversation, messages: [form, { id: 2, role: 'user' }] }, form), false)
})

test('replayed turns keep one copy of each message and preserve warning before summary', () => {
  const turn = { status: 'ready_for_confirmation', draft: { version: 3 }, user_message: { id: 2, role: 'user' }, assistant_messages: [{ id: 3, type: 'warning' }, { id: 4, type: 'summary' }] }
  const first = mergeTurn({ messages: [{ id: 1, type: 'text' }] }, turn)
  const replay = mergeTurn(first, turn)
  assert.deepEqual(replay.messages.map((message) => message.id), [1, 2, 3, 4])
  assert.equal(replay.draft.version, 3)
  assert.equal(replay.status, 'ready_for_confirmation')
  assert.equal(replay.report_id, undefined)
})

test('validation maps to fields without exposing backend diagnostic text', () => {
  const fields = validationFields({ details: [{ loc: ['body', 'form_data', 'location'], msg: 'internal diagnostic' }] })
  assert.ok(fields.location)
  assert.ok(!fields.location.includes('internal'))
})
