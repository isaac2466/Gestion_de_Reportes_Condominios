import { useEffect, useRef, useState } from 'react'
import useConversations from '../hooks/useConversations'
import { conversationStatus, isClosed } from '../utils/conversations'
import { formatDate } from '../utils/reports'
import ConversationMessage from './ConversationMessage'
import ReportList from './ReportList'

const placeholders = {
  collecting: 'Describe el problema o agrega información…',
  needs_information: 'Responde o completa los datos solicitados…',
  ready_for_confirmation: '¿Quieres corregir algo? Escríbelo aquí…',
  submitted: 'Este reporte ya fue enviado.',
  cancelled: 'Esta conversación fue cancelada.',
}

export default function ConversationWorkspace({ user, reports, selectedId, onReport, onRefreshReports, reportsLoading, historyOpen, onCloseHistory }) {
  const chat = useConversations(user.id_habitante)
  const { conversation, busy, loading, error } = chat
  const [historyView, setHistoryView] = useState('conversations')
  const [texts, setTexts] = useState({})
  const [forms, setForms] = useState({})
  const [editing, setEditing] = useState(null)
  const composer = useRef(null)
  const scroller = useRef(null)
  const end = useRef(null)
  const nearBottom = useRef(true)
  const forceScroll = useRef(false)
  const id = conversation?.conversation_id
  const text = texts[id] || ''
  const disabled = !!busy || loading || !conversation || isClosed(conversation) || error?.mustReload

  useEffect(() => {
    if (forceScroll.current || nearBottom.current) {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      end.current?.scrollIntoView({ behavior, block: 'end' })
      if (!busy && !loading) forceScroll.current = false
    }
  }, [id, conversation?.messages.length, busy, loading])

  useEffect(() => {
    if (!historyOpen) return
    const close = (event) => { if (event.key === 'Escape') onCloseHistory() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [historyOpen, onCloseHistory])

  async function create() {
    if (await chat.create()) {
      setEditing(null)
      setHistoryView('conversations')
      forceScroll.current = true
      nearBottom.current = true
      onCloseHistory()
    }
  }

  async function send(content, data) {
    forceScroll.current = true
    const success = await chat.send(content, data)
    if (success) {
      if (!data) setTexts((current) => ({ ...current, [id]: '' }))
      setEditing(null)
    }
  }

  function edit() {
    setEditing(id)
    composer.current?.focus()
  }

  function select(nextId) {
    forceScroll.current = true
    nearBottom.current = true
    void chat.select(nextId)
    onCloseHistory()
  }

  function openReport(reportId) {
    const report = reports.find((item) => item.id === reportId)
    if (report) onReport(report)
    else { setHistoryView('reports'); void onRefreshReports() }
  }

  return <>
    <section className="composer-panel conversation-panel has-messages">
      <div className="chat-stage">
        <header className="conversation-heading"><div><span className="eyebrow">ASISTENTE DE REPORTES</span><h1>{conversation?.draft?.title || '¿Qué está ocurriendo?'}</h1></div>
          {conversation && <span className="conversation-state">{conversationStatus[conversation.status] || conversation.status}</span>}
          {conversation && !isClosed(conversation) && <button className="secondary-button" disabled={disabled} onClick={() => chat.action('cancel')}>Cancelar</button>}
        </header>
        <div className="conversation-scroll" ref={scroller} onScroll={() => {
          const node = scroller.current
          nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100
        }}>
          {loading ? <p className="conversation-loading" role="status">Cargando conversación…</p> : !conversation ? <div className="chat-welcome"><h2>Cuéntanos qué ocurre en tu comunidad.</h2><p>Inicia una conversación para preparar tu reporte.</p><button className="primary-button" disabled={!!busy} onClick={create}>{busy === 'creating' ? 'Creando…' : 'Nuevo reporte'}</button></div> : <div className="conversation" role="log" aria-label="Mensajes de la conversación" aria-live="polite" aria-busy={!!busy}>
            {conversation.messages.map((message, index) => {
              const key = `${id}:${message.id}`
              const answer = conversation.messages.slice(index + 1).find((item) => item.role === 'user')?.metadata?.form_data
              return <ConversationMessage key={key} message={message} conversation={conversation} busy={disabled} values={forms[key] || answer || {}}
                onChange={(values) => setForms((current) => ({ ...current, [key]: values }))} onSubmit={(values) => send('Completé los datos solicitados.', values)}
                errors={error?.fields || {}} onEdit={edit} onAction={chat.action} onReport={openReport} />
            })}
          </div>}
          {busy === 'sending' && <div className="assistant-thinking" role="status"><div className="thinking-avatar">R+</div><div className="thinking-bubble"><span className="thinking-label">Analizando información…</span><span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span></div></div>}
          <div ref={end} />
        </div>
        {error && <div className="error-banner" role="alert">{error.message}{error.reloadId && <button className="secondary-button" disabled={!!busy || loading} onClick={() => select(error.reloadId)}>Recargar conversación</button>}</div>}
        {conversation && isClosed(conversation) && <div className="closed-conversation" role="status"><span>{placeholders[conversation.status]}</span><button className="secondary-button" disabled={!!busy} onClick={create}>Nuevo reporte</button>{conversation.status === 'submitted' && conversation.report_id && <button className="secondary-button" onClick={() => openReport(conversation.report_id)}>Ver seguimiento</button>}</div>}
        <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); if (!disabled && text.trim()) void send(text.trim()) }}>
          <div className="message-input-wrap"><textarea ref={composer} rows="3" maxLength="4000" disabled={disabled} value={text}
            onChange={(event) => setTexts((current) => ({ ...current, [id]: event.target.value }))}
            placeholder={editing === id && !isClosed(conversation) ? 'Escribe qué información quieres corregir…' : placeholders[conversation?.status] || 'Inicia una conversación para escribir…'}
            aria-label="Mensaje para el asistente" aria-invalid={!!error?.fields?.content} />
            <div className="chat-actions"><button type="button" className="chat-tool" disabled title="Los adjuntos estarán disponibles próximamente" aria-label="Adjuntar evidencia (próximamente)"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L8 19" /></svg><span>Adjuntar · próximamente</span></button><button className="chat-send" disabled={disabled || !text.trim()} aria-label="Enviar mensaje"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg></button></div>
          </div>
          {error?.fields?.content && <p className="field-error">{error.fields.content}</p>}
          <small className="composer-note">{conversation?.status === 'submitted' ? 'Consulta el avance de tu reporte en el historial.' : conversation?.status === 'cancelled' ? 'Esta conversación se conserva en tu historial.' : 'La conversación prepara un borrador. El reporte aún no se ha enviado.'}</small>
        </form>
      </div>
    </section>
    <button className={`history-backdrop ${historyOpen ? 'visible' : ''}`} onClick={onCloseHistory} aria-label="Cerrar historial" tabIndex={historyOpen ? 0 : -1} />
    <aside className={`history-panel ${historyOpen ? 'open' : ''}`} aria-label="Historial">
      <header><div><span className="eyebrow">HISTORIAL</span><h2>Mi actividad</h2></div><div className="history-header-actions"><button className="refresh-button" disabled={chat.refreshing || reportsLoading || !!busy} onClick={() => historyView === 'conversations' ? chat.refresh() : onRefreshReports()} aria-label="Actualizar historial">↻</button><button className="history-close" onClick={onCloseHistory} aria-label="Cerrar historial">×</button></div></header>
      <div className="history-tabs" aria-label="Tipo de historial">{[['conversations', 'Conversaciones'], ['reports', 'Reportes']].map(([value, label]) => <button key={value} aria-pressed={historyView === value} className={historyView === value ? 'active' : ''} onClick={() => setHistoryView(value)}>{label}</button>)}</div>
      {historyView === 'conversations' ? <>
        {chat.historyError && <p className="error-banner" role="alert">{chat.historyError}</p>}
        <div className="report-list" aria-busy={chat.refreshing}>{chat.list.map((item) => <button key={item.conversation_id} disabled={!!busy || loading} className={`conversation-row ${id === item.conversation_id ? 'selected' : ''}`} aria-current={id === item.conversation_id ? 'true' : undefined} onClick={() => select(item.conversation_id)}><strong>{item.title || 'Nuevo reporte'}</strong><span className="conversation-preview">{item.last_message || 'Sin mensajes'}</span><span className="conversation-state">{conversationStatus[item.status] || item.status}</span><time>{formatDate(item.updated_at)}</time></button>)}{!chat.list.length && <p className="empty-state">{loading || chat.refreshing ? 'Cargando historial…' : 'Tus conversaciones aparecerán aquí.'}</p>}</div>
      </> : <ReportList compact reports={reports} selectedId={selectedId} onSelect={onReport} emptyMessage="Cuando envíes tu primer reporte aparecerá aquí." />}
      <button className="new-report-button" disabled={!!busy || loading} onClick={create}><span>＋</span>{busy === 'creating' ? 'Creando conversación…' : 'Nuevo reporte'}</button>
    </aside>
  </>
}
