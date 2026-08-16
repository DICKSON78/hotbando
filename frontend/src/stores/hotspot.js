import { defineStore } from 'pinia'
import { hotspotGet } from '../api/client'

export const useHotspotStore = defineStore('hotspot', {
  state: () => ({
    initialized: false,
    mac: '',
    routerID: '',
    ssidshow: '',
    location: '',
    user: null
  }),
  getters: {
    isLoggedIn: (state) => !!state.user
  },
  actions: {
    async init(params = {}) {
      try {
        const r = await hotspotGet('/session', { params })
        this.mac = r.mac || ''
        this.routerID = r.routerID || ''
        this.ssidshow = r.ssidshow || ''
        this.location = r.location || ''
        this.user = r.user || null
      } catch (e) {
        console.error('Session init failed', e)
      } finally {
        this.initialized = true
      }
    },
    async refreshUser() {
      try {
        const r = await hotspotGet('/dashboard')
        if (r.user) this.user = r.user
        return r
      } catch (e) {
        if (e.response?.status === 401) this.user = null
        return null
      }
    },
    async logout() {
      try { await hotspotGet('/logout') } catch (e) { /* ignore */ }
      this.user = null
      this.mac = ''
      this.routerID = ''
      this.ssidshow = ''
      this.location = ''
    }
  }
})
