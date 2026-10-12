import { useCallback, useEffect, useRef, useState } from 'react'
import { api, conversationError, conversationFeatures } from '../services/api'
import { CANCELLED_VISIBLE_MS, isClosed, mergeTurn, validationFields, visibleConversations } from '../utils/conversations'

function readDeadlines(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} }
}

export default function useConversations(residentId) {
  const cancellationKey = `reporta-cancelled-${residentId}`
  const [deadlines, setDeadlines] = useState(() => readDeadlines(cancellationKey))
  const [now, setNow] = useState(Date.now)
  const [conversation, setConversation] = useState(null)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState(null)
  const [historyError, setHistoryError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const lock = useRef(false)
  const sequence = useRef(0)
  const pending = useRef(new Map())
  const storageKey = `reporta-conversation-${residentId}`

  useEffect(() => {
    const remaining = Object.values(deadlines).filter((deadline) => deadline > now)
    if (!remaining.length) return
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, Math.min(...remaining) - Date.now()))
    return () => window.clearTimeout(timer)
  }, [deadlines, now])

  const remember = useCallback((id) => {
    try { localStorage.setItem(storageKey, String(id)) } catch { /* Storage may be unavailable. */ }
  }, [storageKey])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      setList(await api.listConversations(residentId))
      setHistoryError('')
    } catch {
      setHistoryError('No pudimos actualizar las conversaciones. Inténtalo de nuevo.')
    } finally { setRefreshing(false) }
  }, [residentId])

  useEffect(() => {
    let active = true
    async function restore() {
      try {
        const items = await api.listConversations(residentId)
        if (!active) return
        setList(items)
        let saved
        try { saved = Number(localStorage.getItem(storageKey)) } catch { /* Use latest. */ }
        const visible = visibleConversations(items, readDeadlines(cancellationKey), Date.now())
        const selected = visible.find((item) => item.conversation_id === saved)
          || visible.find((item) => !isClosed(item)) || visible[0]
        if (selected) {
          const result = await api.getConversation(selected.conversation_id)
          if (active) {
            setConversation({ ...result, messages: [...result.messages].sort((a, b) => a.id - b.id) })
            remember(result.conversation_id)
          }
        }
      } catch (failure) {
        if (active) {
          setError({ message: conversationError(failure), fields: {} })
          if (failure.status === 404) void refresh()
        }
      } finally { if (active) setLoading(false) }
    }
    restore()
    return () => { active = false; sequence.current += 1 }
  }, [residentId, storageKey, cancellationKey, remember, refresh])

  async function select(id) {
    if (lock.current) return
    const token = ++sequence.current
    setLoading(true)
    setConversation(null)
    setError(null)
    try {
      const result = await api.getConversation(id)
      if (token !== sequence.current) return
      setConversation({ ...result, messages: [...result.messages].sort((a, b) => a.id - b.id) })
      remember(id)
    } catch (failure) {
      if (token === sequence.current) {
        setError({ message: conversationError(failure), fields: {}, reloadId: failure.status === 404 ? null : id })
        if (failure.status === 404) void refresh()
      }
    } finally { if (token === sequence.current) setLoading(false) }
  }

  async function create() {
    if (lock.current || loading) return false
    lock.current = true
    setBusy('creating')
    setError(null)
    try {
      const result = await api.createConversation(residentId)
      setConversation({ conversation_id: result.conversation_id, resident_id: residentId, status: result.status, draft: null, report_id: null, messages: [result.assistant_message] })
      remember(result.conversation_id)
      void refresh()
      return true
    } catch (failure) {
      setError({ message: conversationError(failure), fields: {} })
      return false
    } finally { lock.current = false; setBusy('') }
  }

  async function reconcile(failure, id) {
    const nextError = { message: conversationError(failure), fields: validationFields(failure) }
    if ([404, 409].includes(failure.status)) {
      if (failure.status === 404) setConversation(null)
      else {
        try { setConversation(await api.getConversation(id)) }
        catch { nextError.reloadId = id; nextError.mustReload = true }
      }
      void refresh()
    }
    setError(nextError)
  }

  async function send(content, formData) {
    if (lock.current || loading || !conversation || isClosed(conversation) || error?.mustReload) return false
    const id = conversation.conversation_id
    const values = { content, ...(formData ? { form_data: formData } : {}) }
    // Keep each uncertain operation, including after editing or switching chats.
    const fingerprint = `${id}:${JSON.stringify(values)}`
    const payload = pending.current.get(fingerprint) || { ...values, client_message_id: crypto.randomUUID() }
    pending.current.set(fingerprint, payload)
    lock.current = true
    setBusy('sending')
    setError(null)
    try {
      const turn = await api.sendConversationMessage(id, payload)
      setConversation((current) => mergeTurn(current, turn))
      pending.current.delete(fingerprint)
      void refresh()
      return true
    } catch (failure) {
      if (failure.status && failure.status < 500) pending.current.delete(fingerprint)
      await reconcile(failure, id)
      return false
    } finally { lock.current = false; setBusy('') }
  }

  async function action(kind) {
    if (lock.current || loading || !conversation || isClosed(conversation) || error?.mustReload) return
    if (kind === 'confirm' && !conversationFeatures.confirmation) return
    lock.current = true
    setBusy(kind)
    setError(null)
    try {
      if (kind === 'cancel') {
        const result = await api.cancelConversation(conversation.conversation_id)
        const cancelledAt = Date.now()
        const nextDeadlines = { ...Object.fromEntries(Object.entries(deadlines).filter(([, deadline]) => deadline > cancelledAt)), [conversation.conversation_id]: cancelledAt + CANCELLED_VISIBLE_MS }
        setDeadlines(nextDeadlines)
        setNow(cancelledAt)
        try { localStorage.setItem(cancellationKey, JSON.stringify(nextDeadlines)) } catch { /* Keep the timer in memory. */ }
        setConversation((current) => ({ ...current, status: result.status }))
        setList((items) => items.map((item) => item.conversation_id === conversation.conversation_id ? { ...item, status: result.status } : item))
      } else {
        await api.confirmConversation(conversation.conversation_id, conversation.draft.version)
        setConversation(await api.getConversation(conversation.conversation_id))
      }
      void refresh()
    } catch (failure) { await reconcile(failure, conversation.conversation_id) }
    finally { lock.current = false; setBusy('') }
  }

  return { conversation, list: visibleConversations(list, deadlines, now), loading, busy, error, historyError, refreshing, refresh, select, create, send, action }
}
