import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE_URL, timeout: 30000 })

export const recipes = {
  list: (tag) => api.get('/recipes', { params: tag ? { tag } : {} }),
  get: (id, portions) => api.get(`/recipes/${id}`, { params: portions ? { portions } : {} }),
  create: (data) => api.post('/recipes', data),
  update: (id, data) => api.put(`/recipes/${id}`, data),
  delete: (id) => api.delete(`/recipes/${id}`),
  macros: (id, portions) => api.get(`/recipes/${id}/macros`, { params: { portions } }),
}

export const food = {
  search: (q) => api.get('/food/search', { params: { q } }),
  barcode: (code) => api.get(`/food/barcode/${code}`),
  saveOff: (item) => api.post('/food/save-off', item),
  createCustom: (item) => api.post('/food/custom', item),
}

export const imports = {
  url: (url) => api.post('/import/url', { url }),
  youtube: (url) => api.post('/import/youtube', { url }),
  tiktok: (url) => api.post('/import/tiktok', { url }),
  voice: (transcript) => api.post('/import/voice', { transcript }),
}

export const profiles = {
  list: () => api.get('/profiles'),
  create: (data) => api.post('/profiles', data),
  update: (id, data) => api.put(`/profiles/${id}`, data),
}

export default api
