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
  if (!response.ok) {
    const error = new Error(getErrorMessage(payload))
    error.status = response.status
    error.details = payload?.detail
    throw error
  }
  return payload
}

export const imageUrl = (path) => {
  if (!path) return null
  return path.startsWith('http') ? path : `${API_URL}${path}`
}

export const api = {
  createConversation: (residentId) => request('/api/conversations', jsonPost({ id_habitante: residentId })),
  listConversations: (residentId) => request(`/api/conversations?id_habitante=${encodeURIComponent(residentId)}`),
  getConversation: (id) => request(`/api/conversations/${id}`),
  sendConversationMessage: (id, payload) => request(`/api/conversations/${id}/messages`, jsonPost(payload)),
  cancelConversation: (id) => request(`/api/conversations/${id}/cancel`, { method: 'POST' }),
  confirmConversation: (id, version) => request(`/api/conversations/${id}/confirm`, jsonPost({ draft_version: version })),
  login: (credentials) => request('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) }),
  register: (user) => request('/api/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) }),
  listReports: () => request('/api/reportes'),
  createReport: (formData) => request('/api/reportes', { method: 'POST', body: formData }),
  updateReport: (id, changes) => request(`/api/reportes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) }),
}

function jsonPost(body) {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

// Activate only once the corresponding backend contracts are implemented.
export const conversationFeatures = { confirmation: false, attachments: false }

export function conversationError(error) {
  if (error.status === 404) return 'No encontramos esta conversación. Actualiza el historial o inicia una nueva.'
  if (error.status === 409) return 'La conversación cambió o ya no acepta esta operación. Revisa la versión actual antes de continuar.'
  if (error.status === 422) return 'Revisa los campos indicados y vuelve a intentarlo.'
  if (error.status === 400) return error.message
  return 'No pudimos completar la solicitud. Conservamos tus datos; inténtalo de nuevo.'
}
