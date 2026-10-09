import { formatDate, priorityLabel, statusClass } from '../utils/reports'

export default function ReportDetail({ report, admin = false, onStatusChange, updating }) {
  if (!report) return <div className="detail-empty"><span>↗</span><h3>Selecciona un reporte</h3><p>Aquí aparecerán su evidencia, clasificación y seguimiento.</p></div>
  return <article className="report-detail">
    <header><div><span className="folio">REPORTE #{String(report.id).padStart(3, '0')}</span><h2>{report.title}</h2><p>{formatDate(report.createdAt)}</p></div><span className={`status-badge ${statusClass(report.status)}`}>{report.status}</span></header>
    {report.images.length > 0 && <div className="evidence-grid">{report.images.map((image, index) => <img key={image} src={image} alt={`Evidencia ${index + 1}`} />)}</div>}
    <dl className="report-data"><div><dt>Descripción</dt><dd>{report.description}</dd></div><div><dt>Ubicación</dt><dd>{report.location}</dd></div></dl>
    <section className="analysis-card"><div className="analysis-title"><span>✦</span><h3>Análisis inteligente</h3></div><div className="analysis-metrics"><div><span>Categoría</span><strong>{report.category}</strong></div><div><span>Prioridad</span><strong>{priorityLabel(report.priority)}</strong></div><div><span>Severidad</span><strong>{report.severity}/5</strong></div></div><p>{report.summary}</p><div className="recommendation"><strong>Acción recomendada</strong><p>{report.recommendation}</p></div></section>
    {admin && <section className="status-controls"><h3>Actualizar seguimiento</h3><div>{['Pendiente', 'En Progreso', 'Resuelto', 'Rechazado'].map((status) => <button disabled={updating || report.status === status} key={status} onClick={() => onStatusChange(report.id, status)}>{status}</button>)}</div></section>}
  </article>
}
