import axios from 'axios'

// CSRF token is bound to the Express session. Fetch it once, cache it, and
// refresh it after login/register/logout (those endpoints regenerate the session).
let csrfToken = ''
let csrfPromise = null

async function fetchCsrfToken(force = false) {
  if (force) csrfToken = ''
  if (csrfToken) return csrfToken
  if (!csrfPromise) {
    csrfPromise = axios.get('/api/csrf', { timeout: 10000 })
      .then(r => {
        csrfToken = r.data?.csrfToken || ''
        return csrfToken
      })
      .catch(() => '')
      .finally(() => { csrfPromise = null })
  }
  return csrfPromise
}

function isMutation(config) {
  return ['post', 'put', 'patch', 'delete'].includes(String(config.method || '').toLowerCase())
}

function isAuthEndpoint(url = '') {
  return /\/(?:login|register|logout)(?:\?.*)?$/.test(url)
}

function installInterceptors(instance) {
  instance.interceptors.request.use(async (config) => {
    if (isMutation(config)) {
      const token = await fetchCsrfToken()
      if (token) {
        config.headers = config.headers || {}
        config.headers['X-CSRF-TOKEN'] = token
      }
    }
    return config
  })

  instance.interceptors.response.use(
    (r) => {
      // Session is regenerated on auth changes, so the old token is invalid.
      if (isAuthEndpoint(r.config?.url)) csrfToken = ''
      return r
    },
    async (err) => {
      const status = err.response?.status
      const config = err.config || {}

      // Retry once with a fresh token if the server rejected the CSRF token.
      if (status === 403 && !config.__csrfRetried) {
        const data = err.response?.data || {}
        const msg = String(data.error || data.message || '').toLowerCase()
        if (msg.includes('csrf') || msg.includes('token')) {
          config.__csrfRetried = true
          const token = await fetchCsrfToken(true)
          if (token) {
            config.headers = config.headers || {}
            config.headers['X-CSRF-TOKEN'] = token
            return instance.request(config)
          }
        }
      }

      const p = window.location.pathname
      if (status === 401 && !p.startsWith('/login') && !p.startsWith('/hotspot')) {
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
  )
}

// For API routes that use the /api prefix (campaigns, wallet, etc.)
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
})

installInterceptors(api)

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
  return api.post(`/hotspot${url}`, data, config).then(r => r.data)
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
