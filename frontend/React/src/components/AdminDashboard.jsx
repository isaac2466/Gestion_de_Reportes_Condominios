import { useMemo, useState } from 'react'
import ReportDetail from './ReportDetail'
import ReportList from './ReportList'

const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 }

function reportTime(report) {
  const time = new Date(report.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

export default function AdminDashboard({ reports, selected, onSelect, onStatusChange, updating }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('priority')
  const count = (status) => reports.filter((report) => report.status === status).length

  const categories = useMemo(() => [...new Set(reports.map((report) => report.category))].sort((a, b) => a.localeCompare(b, 'es')), [reports])

  const visibleReports = useMemo(() => {
    const filtered = reports.filter((report) => (
      (statusFilter === 'all' || report.status === statusFilter)
      && (priorityFilter === 'all' || report.priority === priorityFilter)
      && (categoryFilter === 'all' || report.category === categoryFilter)
    ))

    return [...filtered].sort((first, second) => {
      if (sortBy === 'oldest') return reportTime(first) - reportTime(second) || first.id - second.id
      if (sortBy === 'newest') return reportTime(second) - reportTime(first) || second.id - first.id

      const priorityDifference = (priorityRank[first.priority] ?? 4) - (priorityRank[second.priority] ?? 4)
      return priorityDifference || reportTime(first) - reportTime(second) || first.id - second.id
    })
  }, [reports, statusFilter, priorityFilter, categoryFilter, sortBy])

  const hasFilters = statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'priority'

  function clearFilters() {
    setStatusFilter('all')
    setPriorityFilter('all')
    setCategoryFilter('all')
    setSortBy('priority')
  }

  return <main className="admin-layout">
    <div className="section-heading"><span className="eyebrow">PANEL DE CONTROL</span><h1>Gestión de reportes</h1><p>Prioriza incidencias y mantén informada a la comunidad.</p></div>
    <section className="metrics-grid"><div><span>Total</span><strong>{reports.length}</strong></div><div><span>Pendientes</span><strong>{count('Pendiente')}</strong></div><div><span>En progreso</span><strong>{count('En Progreso')}</strong></div><div><span>Resueltos</span><strong>{count('Resuelto')}</strong></div><div><span>Rechazados</span><strong>{count('Rechazado')}</strong></div></section>
    <section className="admin-filters" aria-label="Filtros de reportes">
      <label>Estado<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos</option><option value="Pendiente">Pendientes</option><option value="En Progreso">En progreso</option><option value="Resuelto">Resueltos</option><option value="Rechazado">Rechazados</option></select></label>
      <label>Prioridad<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="all">Todas</option><option value="Critical">Crítica</option><option value="High">Alta</option><option value="Medium">Media</option><option value="Low">Baja</option></select></label>
      <label>Categoría<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Todas</option>{categories.map((category) => <option value={category} key={category}>{category}</option>)}</select></label>
      <label>Ordenar por<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="priority">Urgencia</option><option value="oldest">Más antiguos</option><option value="newest">Más recientes</option></select></label>
      <button type="button" className="clear-filters" onClick={clearFilters} disabled={!hasFilters}>Limpiar</button>
    </section>
    <div className="admin-columns"><section className="panel"><header><h2>Reportes de la comunidad</h2><span>{visibleReports.length} de {reports.length}</span></header><ReportList showPriority reports={visibleReports} selectedId={selected?.id} onSelect={onSelect} emptyMessage="No hay reportes que coincidan con los filtros." /></section><section className="panel detail-panel"><ReportDetail report={selected} admin onStatusChange={onStatusChange} updating={updating} /></section></div>
  </main>
}
