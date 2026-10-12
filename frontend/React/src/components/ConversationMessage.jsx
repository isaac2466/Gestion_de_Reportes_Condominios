import { conversationFeatures } from '../services/api'
import { currentMessage } from '../utils/conversations'
import { priorityLabel } from '../utils/reports'

const draftLabels = { title: 'Título', description: 'Descripción', location: 'Ubicación', category: 'Categoría', priority: 'Prioridad', severity: 'Severidad', summary: 'Resumen', recommendation: 'Recomendación' }

function InlineForm({ message, active, busy, values, onChange, onSubmit, errors }) {
  const fields = message.metadata?.fields || []
  const supported = fields.every((field) => ['text', 'textarea', 'choice'].includes(field.type))
  return <form className="inline-report-form" onSubmit={(event) => {
    event.preventDefault()
    if (active && !busy && supported) onSubmit(Object.fromEntries(fields.map((field) => [field.key, values[field.key]?.trim() || ''])))
  }}>
    <fieldset disabled={!active || busy}>
      <legend className="sr-only">Información solicitada</legend>
      {fields.map((field) => {
        const id = `field-${message.id}-${field.key}`
        const props = {
          id, name: field.key, required: true, value: values[field.key] || '',
          placeholder: field.placeholder, maxLength: field.key === 'location' ? 255 : 4000,
          onChange: (event) => onChange({ ...values, [field.key]: event.target.value }),
          'aria-invalid': active && !!errors[field.key],
          'aria-describedby': active && errors[field.key] ? `${id}-error` : undefined,
        }
        return <label key={field.key} htmlFor={id}>{field.label}
          {field.type === 'textarea' ? <textarea {...props} rows="3" />
            : field.type === 'choice' ? <select {...props}><option value="">Selecciona una opción</option>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>
              : field.type === 'text' ? <input {...props} type="text" /> : <small>Este campo aún no está disponible. Responde en el chat.</small>}
          {active && errors[field.key] && <small id={`${id}-error`} className="field-error">{errors[field.key]}</small>}
        </label>
      })}
      {active && <button className="primary-button" disabled={!supported || !fields.length || busy}>Continuar</button>}
    </fieldset>
    {!active && <small>Formulario histórico · continúa en el mensaje más reciente.</small>}
    {message.metadata?.ai_extraction_available === false && <p className="fallback-note">El asistente automático no está disponible. Puedes completar el reporte manualmente.</p>}
  </form>
}

export default function ConversationMessage({ message, conversation, busy, values, onChange, onSubmit, errors, onEdit, onAction, onReport }) {
  const metadata = message.metadata || {}
  const active = currentMessage(conversation, message)
  const summaryActive = active && conversation.status === 'ready_for_confirmation'
  const draft = metadata.draft || (active ? conversation.draft : {}) || {}
  const reportId = metadata.report_id || conversation.report_id
  const reportStatus = metadata.report_status
  const user = message.role === 'user'
  return <article className={`${user ? 'user-message' : 'assistant-message'} message-${message.type}`}>
    <div className="message-avatar" aria-hidden="true">{user ? 'Tú' : 'R+'}</div>
    <div className="message-content">
      <span className="message-author">{user ? 'Tú' : 'Asistente'}{message.type === 'warning' && <span> · ⚠ Advertencia de seguridad</span>}{message.type === 'error' && <span> · Error</span>}</span>
      <p>{message.content}</p>
      {message.type === 'form' && <InlineForm message={message} active={active} busy={busy} values={values} onChange={onChange} onSubmit={onSubmit} errors={errors} />}
      {message.type === 'summary' && <>
        <dl className="conversation-summary">{Object.entries(draftLabels).filter(([key]) => draft[key] !== null && draft[key] !== undefined && draft[key] !== '').map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{key === 'location' && draft.context?.location_source === 'resident_address' ? <>Tu domicilio<br />{draft.location}</> : key === 'priority' ? priorityLabel(draft[key]) : key === 'severity' ? `${draft[key]}/5` : draft[key]}</dd></div>)}</dl>
        {metadata.analysis_available === false && <p className="fallback-note">La clasificación automática no está disponible. Tu borrador se conserva.</p>}
        <small>{summaryActive ? 'Borrador listo para revisar · aún no enviado' : 'Resumen histórico'} · Versión {metadata.draft_version}</small>
        <div className="summary-actions">{(conversation.status === 'submitted' ? [] : metadata.actions || []).filter((action) => ['edit', 'cancel', 'confirm'].includes(action.key)).map((action) => <button type="button" className={action.key === 'confirm' ? 'primary-button' : 'secondary-button'} key={action.key}
          disabled={!summaryActive || busy || (action.key === 'confirm' && !conversationFeatures.confirmation)}
          title={action.key === 'confirm' && !conversationFeatures.confirmation ? 'El envío aún no está habilitado' : undefined}
          onClick={() => action.key === 'edit' ? onEdit() : onAction(action.key)}>{action.key === 'confirm' && busy === 'confirm' ? 'Enviando…' : action.label}{action.key === 'confirm' && !conversationFeatures.confirmation ? ' · próximamente' : ''}</button>)}</div>
      </>}
      {message.type === 'confirmation' && <div className="confirmation-card">
        <strong>✓ Reporte enviado</strong>
        {(metadata.folio || reportId) && <span>Folio #{metadata.folio || reportId}</span>}
        {reportStatus && <span>Estado: {reportStatus}</span>}
        {reportId && <button type="button" className="secondary-button" onClick={() => onReport(reportId)}>Ver seguimiento</button>}
      </div>}
    </div>
  </article>
}
