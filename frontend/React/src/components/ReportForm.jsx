import { useEffect, useRef, useState } from 'react'

const initialForm = { title: '', description: '' }

function SendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
}

function ImageIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L8 19" /></svg>
}

export default function ReportForm({ user, onSubmit, busy }) {
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState([])
  const endOfConversation = useRef(null)

  useEffect(() => {
    endOfConversation.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  function chooseFile(nextFile) {
    if (preview) URL.revokeObjectURL(preview)
    setFile(nextFile)
    setPreview(nextFile ? URL.createObjectURL(nextFile) : null)
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.title.trim() || !form.description.trim()) {
      setError('Agrega un título y describe lo que está ocurriendo.')
      return
    }

    setError('')
    const report = await onSubmit({
      ...form,
      location: user.Direccion || '',
      file,
    })

    if (report) {
      setMessages((current) => [...current, {
        id: report.id,
        title: report.title,
        description: report.description,
        image: report.images[0] || null,
      }])
      setForm({ title: report.title, description: '' })
      chooseFile(null)
    }
  }

  return (
    <section className={`composer-panel ${messages.length ? 'has-messages' : ''}`}>
      <div className="chat-stage">
        {!messages.length && (
          <div className="chat-welcome">
            <span className="eyebrow">ASISTENTE DE REPORTES</span>
            <h1>¿Qué está ocurriendo?</h1>
          </div>
        )}

        {messages.length > 0 && (
          <div className="conversation" aria-live="polite">
            <div className="conversation-date">Conversación actual</div>
            {messages.map((message) => (
              <article className="user-message" key={message.id}>
                <div className="message-avatar">{user.Nombre.slice(0, 2).toUpperCase()}</div>
                <div className="message-content">
                  <span className="message-author">Tú</span>
                  <h2>{message.title}</h2>
                  <p>{message.description}</p>
                  {message.image && <img src={message.image} alt="Evidencia adjunta" />}
                  <small>Reporte #{String(message.id).padStart(3, '0')} enviado</small>
                </div>
              </article>
            ))}
            <div ref={endOfConversation} />
          </div>
        )}

        {busy && (
          <div className="assistant-thinking" role="status" aria-live="polite">
            <div className="thinking-avatar">R+</div>
            <div className="thinking-bubble">
              <span className="thinking-label">Analizando tu reporte</span>
              <span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>
            </div>
          </div>
        )}

        <form className="chat-composer" onSubmit={submit}>
          {!messages.length && <label className="chat-title-field">
            <span>Título del reporte</span>
            <input
              maxLength="150"
              required
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Ej. Luminaria apagada en el acceso"
            />
          </label>}

          <div className="message-input-wrap">
            <textarea
              required
              rows="3"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder={messages.length ? 'Agrega más información a la conversación…' : 'Describe el problema, desde cuándo ocurre y cualquier referencia útil…'}
              aria-label="Descripción del reporte"
            />

            {preview && (
              <div className="composer-preview">
                <img src={preview} alt="Evidencia seleccionada" />
                <button type="button" onClick={() => chooseFile(null)} aria-label="Quitar evidencia">×</button>
              </div>
            )}

            <div className="chat-actions">
              <label className="chat-tool" title="Adjuntar evidencia">
                <ImageIcon />
                <span>{file ? 'Evidencia lista' : 'Adjuntar'}</span>
                <input type="file" accept="image/*" onChange={(event) => chooseFile(event.target.files[0] || null)} />
              </label>
              <button className="chat-send" disabled={busy} aria-label="Enviar reporte"><SendIcon /></button>
            </div>
          </div>

          {error && <p className="error-banner">{error}</p>}
          <small className="composer-note">La clasificación del reporte se realiza después de enviarlo.</small>
        </form>
      </div>
    </section>
  )
}
