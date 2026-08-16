import api from './client'

export function resellerGet(url) {
  return api.get(`/reseller${url}`).then(r => r.data)
}

export function resellerPost(url, data) {
  return api.post(`/reseller${url}`, data).then(r => r.data)
}

export function resellerPut(url, data) {
  return api.put(`/reseller${url}`, data).then(r => r.data)
}
