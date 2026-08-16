import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/client'

export const usePartnerStore = defineStore('partner', () => {
  const user = ref(null)
  const loading = ref(true)

  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'super_admin')
  const isSponsor = computed(() => user.value?.role === 'sponsor')
  const isBank = computed(() => user.value?.role === 'bank_partner')
  const isFranchise = computed(() => user.value?.role === 'franchise_owner')
  const isReseller = computed(() => user.value?.role === 'reseller')
  const isCustomer = computed(() => user.value?.role === 'customer')
  const userName = computed(() => user.value?.name || user.value?.email || '')

  async function checkSession() {
    loading.value = true
    try {
      const r = await api.get('/me')
      user.value = r.data.user
      return true
    } catch {
      user.value = null
      return false
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    const r = await api.post('/login', { email, password })
    user.value = r.data.user
    return r
  }

  async function logout() {
    await api.get('/logout')
    user.value = null
  }

  return { user, loading, isAdmin, isSponsor, isBank, isFranchise, isReseller, isCustomer, userName, checkSession, login, logout }
})
