import { useEffect, useRef, useState } from 'react'

const initialForm = { title: '', description: '' }

function SendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
}

function ImageIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L8 19" /></svg>
}

function MicIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
}

export default function ReportForm({ user, onSubmit, busy }) {
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [messages, setMessages] = useState([])
  const recognition = useRef(null)
  const endOfConversation = useRef(null)

  useEffect(() => {
    endOfConversation.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  function dictate() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return setError('El dictado está disponible en Chrome y Edge.')
    if (listening) return recognition.current?.stop()

    const instance = new SpeechRecognition()
    instance.lang = 'es-MX'
    instance.onresult = (event) => setForm((current) => ({
      ...current,
      description: `${current.description} ${event.results[0][0].transcript}`.trim(),
    }))
    instance.onend = () => setListening(false)
    instance.onerror = () => setListening(false)
    recognition.current = instance
    instance.start()
    setListening(true)
  }

  return (
    <section className={`composer-panel ${messages.length ? 'has-messages' : ''}`}>
      <div className="chat-stage">
        {!messages.length && (
          <div className="chat-welcome">
            <span className="eyebrow">ASISTENTE DE REPORTES</span>
            <h1>¿Qué está ocurriendo?</h1>
            <p>Describe la situación con tus palabras. Tu reporte se enviará al equipo administrador.</p>
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
              <button type="button" className={`chat-tool icon-only ${listening ? 'active' : ''}`} onClick={dictate} aria-label="Dictar descripción"><MicIcon /></button>
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
