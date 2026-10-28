import { defineStore } from 'pinia'
import { hotspotGet } from '../api/client'

export const useHotspotStore = defineStore('hotspot', {
  state: () => ({
    initialized: false,
    mac: '',
    routerID: '',
    ssidshow: '',
    location: '',
    onWifi: false,
    user: null,
    initPromise: null,
    initParamsKey: ''
  }),
  getters: {
    isLoggedIn: (state) => !!state.user
  },
  actions: {
    async init(params = {}) {
      const explicitRouterID = params.routerID || params.routerid || params.router_id || ''
      const paramsKey = String(explicitRouterID)
      if (this.initialized && (!explicitRouterID || this.initParamsKey === paramsKey)) return
      if (this.initPromise && this.initParamsKey === paramsKey) return this.initPromise
      this.initParamsKey = paramsKey
      this.initPromise = this.loadSession(params)
      try { await this.initPromise } finally { this.initPromise = null }
    },
    async loadSession(params) {
      try {
        const r = await hotspotGet('/session', { params })
        this.mac = r.mac || ''
        this.routerID = r.routerID || ''
        this.ssidshow = r.ssidshow || ''
        this.location = r.location || ''
        this.onWifi = !!r.onWifi
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
      this.initialized = false
      this.initParamsKey = ''
      this.mac = ''
      this.routerID = ''
      this.ssidshow = ''
      this.location = ''
      this.onWifi = false
    }
  }
})
