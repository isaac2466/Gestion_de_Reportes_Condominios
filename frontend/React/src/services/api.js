const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getErrorMessage(payload) {
  const detail = payload?.detail

  if (typeof detail === 'string') return detail
  if (detail && !Array.isArray(detail) && typeof detail === 'object') {
    return detail.message || detail.reason || 'No fue posible completar la solicitud.'
  }
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg).filter(Boolean).join(' ') || 'Los datos enviados no son válidos.'
  }

  return payload?.message || 'No fue posible completar la solicitud.'
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options)
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) throw new Error(getErrorMessage(payload))
  return payload
}

export const imageUrl = (path) => {
  if (!path) return null
  return path.startsWith('http') ? path : `${API_URL}${path}`
}

export const api = {
  login: (credentials) => request('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) }),
  register: (user) => request('/api/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) }),
  listReports: () => request('/api/reportes'),
  createReport: (formData) => request('/api/reportes', { method: 'POST', body: formData }),
  updateReport: (id, changes) => request(`/api/reportes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) }),
}
