export const conversationStatus = {
  collecting: 'En proceso',
  needs_information: 'Falta información',
  ready_for_confirmation: 'Listo para revisar',
  submitted: 'Enviado',
  cancelled: 'Cancelado',
}

export const isClosed = (conversation) => ['submitted', 'cancelled'].includes(conversation?.status)

export const CANCELLED_VISIBLE_MS = 30_000

export function visibleConversations(items, deadlines, now) {
  return items.filter((item) => item.status !== 'cancelled' || deadlines[item.conversation_id] > now)
}

export function currentMessage(conversation, message) {
  if (!conversation?.draft || isClosed(conversation)) return false
  if (message.metadata?.draft_version !== conversation.draft.version) return false
  // A later user turn consumes a form even when the draft version did not change.
  const index = conversation.messages.findIndex((item) => item.id === message.id)
  return index >= 0 && !conversation.messages.slice(index + 1).some((item) => item.role === 'user' || item.type === message.type)
}

export function mergeTurn(conversation, turn) {
  const messages = new Map(conversation.messages.map((message) => [message.id, message]))
  for (const message of [turn.user_message, ...turn.assistant_messages]) messages.set(message.id, message)
  return { ...conversation, status: turn.status, draft: turn.draft, messages: [...messages.values()].sort((a, b) => a.id - b.id) }
}

export function validationFields(error) {
  if (!Array.isArray(error.details)) return {}
  return Object.fromEntries(error.details.map((item) => [item.loc?.at(-1), 'Revisa este valor: puede estar vacío o superar la longitud permitida.']))
}
