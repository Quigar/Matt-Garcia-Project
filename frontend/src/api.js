import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const prospects = {
  list: (params) => api.get('/prospects', { params }).then(r => r.data),
  get: (id) => api.get(`/prospects/${id}`).then(r => r.data),
  create: (data) => api.post('/prospects', data).then(r => r.data),
  update: (id, data) => api.patch(`/prospects/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/prospects/${id}`),
}

export const appointments = {
  list: (params) => api.get('/appointments', { params }).then(r => r.data),
  get: (id) => api.get(`/appointments/${id}`).then(r => r.data),
  create: (data) => api.post('/appointments', data).then(r => r.data),
  update: (id, data) => api.patch(`/appointments/${id}`, data).then(r => r.data),
  availableSlots: (employeeId, date) =>
    api.get('/appointments/available-slots', { params: { employee_id: employeeId, date } }).then(r => r.data),
  employees: {
    list: () => api.get('/appointments/employees').then(r => r.data),
    create: (data) => api.post('/appointments/employees', data).then(r => r.data),
  },
}

export const pipeline = {
  get: () => api.get('/pipeline').then(r => r.data),
  metrics: () => api.get('/pipeline/metrics').then(r => r.data),
  update: (id, data) => api.patch(`/pipeline/${id}`, data).then(r => r.data),
  recommendations: (id) => api.get(`/pipeline/${id}/recommendations`).then(r => r.data),
}

export const ai = {
  qualify: (data) => api.post('/ai/qualify', data).then(r => r.data),
  qualifySessions: (prospectId) => api.get(`/ai/qualify/sessions/${prospectId}`).then(r => r.data),
  outreach: (data) => api.post('/ai/outreach', data).then(r => r.data),
  outreachLogs: (prospectId) => api.get(`/ai/outreach/logs/${prospectId}`).then(r => r.data),
}
