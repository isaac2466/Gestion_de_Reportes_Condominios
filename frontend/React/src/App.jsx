import { useCallback, useEffect, useState } from 'react'
import './App.css'
import AdminDashboard from './components/AdminDashboard'
import AuthView from './components/AuthView'
import ReportDetail from './components/ReportDetail'
import ReportForm from './components/ReportForm'
import ReportList from './components/ReportList'
import { api } from './services/api'
import { normalizeReport } from './utils/reports'

const storedUser = () => {
  try { return JSON.parse(localStorage.getItem('reporta-user')) } catch { return null }
}

export default function App() {
  const [user, setUser] = useState(storedUser)
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submittingReport, setSubmittingReport] = useState(false)
  const [message, setMessage] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [conversationKey, setConversationKey] = useState(0)
  const isAdmin = user?.Rol === 'admin'
  const visibleReports = isAdmin ? reports : reports.filter((report) => report.userId === user?.id_habitante)

  const loadReports = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await api.listReports()
      setReports(data.map(normalizeReport).sort((a, b) => b.id - a.id))
      setMessage('')
    } catch (error) {
      setMessage(error.message)
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
      .catch((error) => {
        if (active) setMessage(error.message)
      })
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

  function startNewReport() {
    setConversationKey((current) => current + 1)
    setSelected(null)
    setHistoryOpen(false)
    setReportModalOpen(false)
  }

  async function createReport(values) {
    setSubmittingReport(true)
    setMessage('')
    try {
      const body = new FormData()
      body.append('id_habitante', user.id_habitante)
      body.append('titulo', values.title.trim())
      body.append('descripcion', values.description.trim())
      body.append('locacion', values.location.trim())
      if (values.file) body.append('archivos', values.file)
      const result = await api.createReport(body)
      const report = normalizeReport({ reporte: result.reporte, imagenes: result.imagenes })
      setReports((current) => [report, ...current])
      setSelected(report)
      setMessage('Reporte enviado. Ya puedes consultar su clasificación y seguimiento.')
      return report
    } catch (error) {
      setMessage(error.message)
      return null
    } finally {
      setSubmittingReport(false)
    }
  }

  async function updateStatus(id, status) {
    setLoading(true)
    try {
      const result = await api.updateReport(id, { estado: status })
      const updated = normalizeReport(result.reporte)
      setReports((current) => current.map((report) => report.id === id ? { ...report, ...updated, images: report.images } : report))
      setSelected((current) => current?.id === id ? { ...current, ...updated, images: current.images } : current)
      setMessage('El estado se actualizó correctamente.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <AuthView onLogin={login} />
  return <div className="app-shell">
    <nav className="navbar"><div className="nav-brand"><span className="brand-dot" /><span className="brand-name">Reporta+</span></div><div className="nav-controls">{!isAdmin && <button className="history-menu-button" onClick={() => setHistoryOpen(true)} aria-label="Abrir mis reportes"><span /><span /><span /></button>}<span className="role-label">{user.Nombre} · {isAdmin ? 'Administrador' : 'Residente'}</span><span className="avatar">{user.Nombre.slice(0, 2).toUpperCase()}</span><button className="role-btn" onClick={logout}>Salir</button></div></nav>
    {message && <div className="global-message" role="status">{message}<button onClick={() => setMessage('')}>×</button></div>}
    {isAdmin ? <AdminDashboard reports={visibleReports} selected={selected} onSelect={setSelected} onStatusChange={updateStatus} updating={loading} /> : <main className="resident-layout"><ReportForm key={conversationKey} user={user} onSubmit={createReport} busy={submittingReport} /><button className={`history-backdrop ${historyOpen ? 'visible' : ''}`} onClick={() => setHistoryOpen(false)} aria-label="Cerrar historial" /><aside className={`history-panel ${historyOpen ? 'open' : ''}`}><header><div><span className="eyebrow">HISTORIAL</span><h2>Mis reportes</h2></div><div className="history-header-actions"><button className="refresh-button" onClick={loadReports} disabled={loading} aria-label="Actualizar reportes">↻</button><button className="history-close" onClick={() => setHistoryOpen(false)} aria-label="Cerrar historial">×</button></div></header><ReportList compact reports={visibleReports} selectedId={selected?.id} onSelect={openReport} emptyMessage="Cuando envíes tu primer reporte aparecerá aquí." /><button className="new-report-button" onClick={startNewReport}><span>＋</span>Nuevo reporte</button></aside>{reportModalOpen && selected && <div className="report-modal-backdrop" onClick={() => setReportModalOpen(false)}><section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title" onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">DETALLE DEL REPORTE</span><h2 id="report-modal-title">Seguimiento</h2></div><button onClick={() => setReportModalOpen(false)} aria-label="Cerrar detalle">×</button></header><div className="report-modal-content"><ReportDetail report={selected} /></div></section></div>}</main>}
  </div>
}
