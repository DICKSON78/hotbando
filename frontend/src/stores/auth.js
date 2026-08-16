import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api, { apiGet, apiPost } from '../api/client'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)

  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'super_admin')
  const userName = computed(() => user.value?.name || user.value?.email || '')

  async function checkSession() {
    try {
      const r = await apiGet('/me')
      if (r.user && (r.user.role === 'admin' || r.user.role === 'super_admin')) {
        user.value = r.user
        return true
      }
      user.value = null
      return false
    } catch {
      user.value = null
      return false
    }
  }

  async function login(email, password) {
    const r = await apiPost('/login', { email, password })
    user.value = r.user
    return r
  }

  async function logout() {
    await api.get('/logout')
    user.value = null
  }

  return { user, isAdmin, userName, checkSession, login, logout }
})
