import { formatDate, priorityLabel, statusClass } from '../utils/reports'

export default function ReportList({ reports, selectedId, onSelect, emptyMessage = 'Aún no hay reportes.', compact = false, showPriority = false }) {
  if (!reports.length) return <div className="empty-state">{emptyMessage}</div>
  return <div className="report-list">{reports.map((report) => (
    <button key={report.id} className={`report-row ${selectedId === report.id ? 'selected' : ''}`} onClick={() => onSelect(report)}>
      {report.images[0] && <img src={report.images[0]} alt="" />}
      <span className="report-row-main"><span className="report-row-title">{report.title}</span><span className="report-row-meta">{!compact && `${report.location} · `}{formatDate(report.createdAt)}</span></span>
      <span className="report-badges"><span className={`status-badge ${statusClass(report.status)}`}>{report.status}</span>{showPriority && <span className={`priority-badge priority-${report.priority.toLowerCase()}`}>{priorityLabel(report.priority)}</span>}</span>
      <span className="folio">#{String(report.id).padStart(3, '0')}</span>
    </button>
  ))}</div>
}
