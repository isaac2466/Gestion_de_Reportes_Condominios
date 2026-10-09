import { useState } from 'react'
import { api } from '../services/api'

const emptyRegister = { Nombre: '', Email: '', Direccion: '', Password: '' }

export default function AuthView({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [login, setLogin] = useState({ Email: '', Password: '' })
  const [register, setRegister] = useState(emptyRegister)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'register') {
        await api.register(register)
        const result = await api.login({ Email: register.Email, Password: register.Password })
        onLogin(result.habitante)
      } else {
        const result = await api.login(login)
        onLogin(result.habitante)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <span className="eyebrow">COMUNIDAD CONECTADA</span>
        <h1>Reporta, consulta y da seguimiento.</h1>
        <p>Una conversación clara para convertir incidencias vecinales en acciones concretas.</p>
        <div className="auth-feature"><span>01</span><p>Describe el problema y adjunta evidencia.</p></div>
        <div className="auth-feature"><span>02</span><p>La IA clasifica la urgencia automáticamente.</p></div>
        <div className="auth-feature"><span>03</span><p>Consulta el avance desde tu historial.</p></div>
      </section>
      <section className="auth-card">
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Iniciar sesión</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Crear cuenta</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'register' && <>
            <label>Nombre completo<input required value={register.Nombre} onChange={(e) => setRegister({ ...register, Nombre: e.target.value })} /></label>
            <label>Dirección<input required value={register.Direccion} onChange={(e) => setRegister({ ...register, Direccion: e.target.value })} placeholder="Calle, número y colonia" /></label>
          </>}
          <label>Correo electrónico<input required type="email" value={mode === 'login' ? login.Email : register.Email} onChange={(e) => mode === 'login' ? setLogin({ ...login, Email: e.target.value }) : setRegister({ ...register, Email: e.target.value })} /></label>
          <label>Contraseña<input required minLength="6" type="password" value={mode === 'login' ? login.Password : register.Password} onChange={(e) => mode === 'login' ? setLogin({ ...login, Password: e.target.value }) : setRegister({ ...register, Password: e.target.value })} /></label>
          {error && <p className="error-banner">{error}</p>}
          <button className="primary-button full" disabled={busy}>{busy ? 'Conectando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
        </form>
      </section>
    </main>
  )
}
