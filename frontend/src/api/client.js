import axios from 'axios'

// For API routes that use the /api prefix (campaigns, wallet, etc.)
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
})

api.interceptors.response.use(
  r => r,
  err => {
    const p = window.location.pathname
    if (err.response?.status === 401 && !p.startsWith('/login') && !p.startsWith('/hotspot')) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Direct Express routes (no /api prefix — hotspot and admin form actions)
const direct = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
})

export function adminGet(url) {
  return api.get(`/admin${url}`).then(r => r.data)
}

export function adminPost(url, data) {
  return api.post(`/admin${url}`, data).then(r => r.data)
}

export function adminPut(url, data) {
  return api.put(`/admin${url}`, data).then(r => r.data)
}

export function adminDelete(url) {
  return api.delete(`/admin${url}`).then(r => r.data)
}

export function hotspotGet(url, config) {
  return api.get(`/hotspot${url}`, config).then(r => r.data)
}

export function hotspotPost(url, data, config) {
  return direct.post(`/hotspot${url}`, data, config).then(r => r.data)
}

// For admin login (form POST to /admin/login, not /api/admin/login)
export function adminFormPost(url, data, config) {
  return direct.post(url, data, config).then(r => r.data)
}

export function apiGet(url) {
  return api.get(url).then(r => r.data)
}

export function apiPost(url, data) {
  return api.post(url, data).then(r => r.data)
}

export function apiPut(url, data) {
  return api.put(url, data).then(r => r.data)
}

export default api
