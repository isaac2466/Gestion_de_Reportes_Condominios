import { useState } from 'react'
import { api } from '../services/api'

const emptyRegister = {
  Nombre: '',
  Email: '',
  Password: '',
  Calle: '',
  NumeroExterior: '',
  NumeroInterior: '',
  Colonia: '',
  CodigoPostal: '',
}

const clean = (value) => value.trim().replace(/\s+/g, ' ')

function buildAddress(data) {
  const interior = clean(data.NumeroInterior)
  return [
    `${clean(data.Calle)} ${clean(data.NumeroExterior)}`,
    interior ? `Int. ${interior}` : null,
    `Col. ${clean(data.Colonia)}`,
    `C.P. ${data.CodigoPostal.trim()}`,
  ].filter(Boolean).join(', ')
}

function validateRegistration(data) {
  if (clean(data.Nombre).length < 3) return 'Ingresa tu nombre completo.'
  if (clean(data.Calle).length < 3) return 'Ingresa una calle válida.'
  if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ./ -]{1,12}$/.test(clean(data.NumeroExterior))) return 'Ingresa un número exterior válido.'
  if (data.NumeroInterior && !/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ./ -]{1,12}$/.test(clean(data.NumeroInterior))) return 'Ingresa un número interior válido.'
  if (clean(data.Colonia).length < 3) return 'Ingresa una colonia válida.'
  if (!/^\d{5}$/.test(data.CodigoPostal.trim())) return 'El código postal debe tener 5 dígitos.'
  return null
}

function EyeIcon({ hidden }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="2.5" />
    {hidden && <path d="m4 4 16 16" />}
  </svg>
}

export default function AuthView({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [login, setLogin] = useState({ Email: '', Password: '' })
  const [register, setRegister] = useState(emptyRegister)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (mode === 'register') {
      const validationError = validateRegistration(register)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setBusy(true)
    try {
      if (mode === 'register') {
        const registrationPayload = {
          Nombre: clean(register.Nombre),
          Email: register.Email.trim().toLowerCase(),
          Password: register.Password,
          Direccion: buildAddress(register),
        }
        await api.register(registrationPayload)
        const result = await api.login({ Email: registrationPayload.Email, Password: registrationPayload.Password })
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
            <label>Nombre completo<input required minLength="3" maxLength="100" autoComplete="name" value={register.Nombre} onChange={(e) => setRegister({ ...register, Nombre: e.target.value })} /></label>
            <fieldset className="address-fields">
              <legend>Dirección</legend>
              <label>Calle<input required minLength="3" maxLength="120" autoComplete="address-line1" value={register.Calle} onChange={(e) => setRegister({ ...register, Calle: e.target.value })} placeholder="Ej. Avenida Juárez" /></label>
              <div className="address-numbers">
                <label>Número exterior<input required maxLength="12" autoComplete="address-line2" value={register.NumeroExterior} onChange={(e) => setRegister({ ...register, NumeroExterior: e.target.value })} placeholder="123" /></label>
                <label>Número interior <small>Opcional</small><input maxLength="12" value={register.NumeroInterior} onChange={(e) => setRegister({ ...register, NumeroInterior: e.target.value })} placeholder="4B" /></label>
              </div>
              <label>Colonia<input required minLength="3" maxLength="100" autoComplete="address-level3" value={register.Colonia} onChange={(e) => setRegister({ ...register, Colonia: e.target.value })} placeholder="Ej. Centro" /></label>
              <label>Código postal<input required inputMode="numeric" pattern="[0-9]{5}" maxLength="5" autoComplete="postal-code" value={register.CodigoPostal} onChange={(e) => setRegister({ ...register, CodigoPostal: e.target.value.replace(/\D/g, '').slice(0, 5) })} placeholder="64000" title="Ingresa los 5 dígitos del código postal" /></label>
            </fieldset>
          </>}
          <label>Correo electrónico<input required type="email" value={mode === 'login' ? login.Email : register.Email} onChange={(e) => mode === 'login' ? setLogin({ ...login, Email: e.target.value }) : setRegister({ ...register, Email: e.target.value })} /></label>
          <label>Contraseña<span className="auth-password-field"><input required minLength="6" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={mode === 'login' ? login.Password : register.Password} onChange={(e) => mode === 'login' ? setLogin({ ...login, Password: e.target.value }) : setRegister({ ...register, Password: e.target.value })} /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}><EyeIcon hidden={showPassword} /></button></span></label>
          {error && <p className="error-banner">{error}</p>}
          <button className="primary-button full" disabled={busy}>{busy ? 'Conectando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
        </form>
      </section>
    </main>
  )
}
