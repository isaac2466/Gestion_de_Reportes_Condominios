import { imageUrl } from '../services/api'

export function normalizeReport(item) {
  const report = item?.reporte || item
  const images = item?.imagenes || []
  return {
    id: report.id,
    userId: report.id_habitante,
    title: report.titulo,
    description: report.descripcion,
    location: report.locacion || 'Sin ubicación especificada',
    category: report.categoria || 'Pendiente de clasificación',
    priority: report.prioridad || 'Medium',
    severity: report.severidad || 1,
    summary: report.resumen_ia || 'El análisis automático no estuvo disponible.',
    recommendation: report.recomendacion_ia || 'Un administrador revisará el reporte.',
    status: report.estado || 'Pendiente',
    createdAt: report.fecha_creacion,
    images: images.map(imageUrl),
  }
}

export const statusClass = (status) => ({ Pendiente: 'pending', 'En Progreso': 'progress', Resuelto: 'resolved', Rechazado: 'rejected' }[status] || 'pending')
export const priorityLabel = (priority) => ({ Low: 'Baja', Medium: 'Media', High: 'Alta', Critical: 'Crítica' }[priority] || priority)

export function formatDate(value) {
  if (!value) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
