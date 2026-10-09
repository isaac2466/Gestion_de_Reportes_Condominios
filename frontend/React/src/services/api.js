const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options)
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) throw new Error(payload?.detail || 'No fue posible completar la solicitud.')
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
