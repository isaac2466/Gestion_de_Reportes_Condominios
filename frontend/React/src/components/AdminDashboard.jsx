import ReportDetail from './ReportDetail'
import ReportList from './ReportList'

export default function AdminDashboard({ reports, selected, onSelect, onStatusChange, updating }) {
  const count = (status) => reports.filter((report) => report.status === status).length
  return <main className="admin-layout">
    <div className="section-heading"><span className="eyebrow">PANEL DE CONTROL</span><h1>Gestión de reportes</h1><p>Prioriza incidencias y mantén informada a la comunidad.</p></div>
    <section className="metrics-grid"><div><span>Total</span><strong>{reports.length}</strong></div><div><span>Pendientes</span><strong>{count('Pendiente')}</strong></div><div><span>En progreso</span><strong>{count('En Progreso')}</strong></div><div><span>Resueltos</span><strong>{count('Resuelto')}</strong></div><div><span>Rechazados</span><strong>{count('Rechazado')}</strong></div></section>
    <div className="admin-columns"><section className="panel"><header><h2>Reportes de la comunidad</h2><span>{reports.length} registros</span></header><ReportList reports={reports} selectedId={selected?.id} onSelect={onSelect} /></section><section className="panel detail-panel"><ReportDetail report={selected} admin onStatusChange={onStatusChange} updating={updating} /></section></div>
  </main>
}
