import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import AdminDashboard from './components/AdminDashboard'
import AuthView from './components/AuthView'
import ReportDetail from './components/ReportDetail'
import ConversationWorkspace from './components/ConversationWorkspace'
import { api } from './services/api'
import { normalizeReport } from './utils/reports'

const storedUser = () => {
  try { return JSON.parse(localStorage.getItem('reporta-user')) } catch { return null }
}

export default function App() {
  const [user, setUser] = useState(storedUser)
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportError, setReportError] = useState('')
  const [updatingReport, setUpdatingReport] = useState(false)
  const updateLock = useRef(false)
  const [message, setMessage] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const isAdmin = user?.Rol === 'admin'
  const visibleReports = isAdmin ? reports : reports.filter((report) => report.userId === user?.id_habitante)
  const currentSelected = visibleReports.find((report) => report.id === selected?.id) || null

  const loadReports = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setReportError('')
    try {
      const data = await api.listReports()
      setReports(data.map(normalizeReport).sort((a, b) => b.id - a.id))
      setMessage('')
    } catch {
      setReportError('No pudimos cargar los reportes. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return undefined
    let active = true
    api.listReports()
      .then((data) => {
        if (active) setReports(data.map(normalizeReport).sort((a, b) => b.id - a.id))
      })
      .catch(() => {
        if (active) setReportError('No pudimos cargar los reportes. Inténtalo de nuevo.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    if (!reportModalOpen) return undefined
    const closeWithEscape = (event) => {
      if (event.key === 'Escape') setReportModalOpen(false)
    }
    window.addEventListener('keydown', closeWithEscape)
    return () => window.removeEventListener('keydown', closeWithEscape)
  }, [reportModalOpen])

  useEffect(() => {
    if (!message) return undefined
    const timeout = window.setTimeout(() => setMessage(''), 4500)
    return () => window.clearTimeout(timeout)
  }, [message])

  function login(nextUser) {
    setLoading(true)
    setReportError('')
    localStorage.setItem('reporta-user', JSON.stringify(nextUser))
    setUser(nextUser)
  }

  function logout() {
    localStorage.removeItem('reporta-user')
    setUser(null)
    setReports([])
    setSelected(null)
  }

  function openReport(report) {
    setSelected(report)
    setHistoryOpen(false)
    setReportModalOpen(true)
  }

  async function updateStatus(id, status) {
    if (updateLock.current) return
    updateLock.current = true
    setUpdatingReport(true)
    setReportError('')
    try {
      const result = await api.updateReport(id, { estado: status })
      const updated = normalizeReport(result.reporte)
      setReports((current) => current.map((report) => report.id === id ? { ...report, ...updated, images: report.images } : report))
      setSelected((current) => current?.id === id ? { ...current, ...updated, images: current.images } : current)
      setMessage('El estado se actualizó correctamente.')
    } catch {
      setReportError('No pudimos confirmar el cambio de estado. Actualiza la lista o vuelve a intentarlo.')
    } finally {
      updateLock.current = false
      setUpdatingReport(false)
    }
  }

  if (!user) return <AuthView onLogin={login} />
  return <div className="app-shell">
    <nav className="navbar"><div className="nav-brand"><span className="brand-dot" /><span className="brand-name">Reporta+</span></div><div className="nav-controls">{!isAdmin && <button className="history-menu-button" onClick={() => setHistoryOpen(true)} aria-label="Abrir historial"><span /><span /><span /></button>}<span className="role-label">{user.Nombre} · {isAdmin ? 'Administrador' : 'Residente'}</span><span className="avatar">{user.Nombre.slice(0, 2).toUpperCase()}</span><button className="role-btn" onClick={logout}>Salir</button></div></nav>
    {message && <div className="global-message" role="status">{message}<button onClick={() => setMessage('')}>×</button></div>}
    {isAdmin ? <AdminDashboard reports={visibleReports} selected={currentSelected} onSelect={setSelected} onStatusChange={updateStatus} updating={updatingReport} loading={loading} error={reportError} onRefresh={loadReports} /> : <main className="resident-layout">{reportError && <div className="report-load-error error-banner" role="alert">{reportError}<button className="secondary-button" disabled={loading} onClick={loadReports}>Reintentar</button></div>}<ConversationWorkspace key={user.id_habitante} user={user} reports={visibleReports} selectedId={selected?.id} onReport={openReport} onRefreshReports={loadReports} reportsLoading={loading} historyOpen={historyOpen} onCloseHistory={() => setHistoryOpen(false)} />{reportModalOpen && currentSelected && <div className="report-modal-backdrop" onClick={() => setReportModalOpen(false)}><section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title" onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">DETALLE DEL REPORTE</span><h2 id="report-modal-title">Seguimiento</h2></div><button onClick={() => setReportModalOpen(false)} aria-label="Cerrar detalle">×</button></header><div className="report-modal-content"><ReportDetail report={currentSelected} /></div></section></div>}</main>}
  </div>
}
