import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiGet, apiPost } from '../api/client'

// All portal roles (not customer — that uses hotspot store)
const PORTAL_ROLES = ['admin', 'super_admin', 'sponsor', 'bank_partner', 'franchise_owner', 'reseller', 'investor']

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)

  // Role checks
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => ['admin', 'super_admin'].includes(user.value?.role))
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const isSponsor = computed(() => user.value?.role === 'sponsor')
  const isBank = computed(() => user.value?.role === 'bank_partner')
  const isFranchise = computed(() => user.value?.role === 'franchise_owner')
  const isReseller = computed(() => user.value?.role === 'reseller')
  const isInvestor = computed(() => user.value?.role === 'investor')
  const isPartner = computed(() => ['sponsor', 'bank_partner', 'franchise_owner', 'reseller', 'investor'].includes(user.value?.role))
  const userName = computed(() => user.value?.name || user.value?.email || '')
  const userRole = computed(() => user.value?.role || '')

  // Portal redirect map
  const PORTAL_REDIRECTS = {
    admin: '/admin/dashboard',
    super_admin: '/admin/dashboard',
    sponsor: '/sponsor/dashboard',
    bank_partner: '/bank/dashboard',
    franchise_owner: '/franchise/dashboard',
    reseller: '/reseller/dashboard',
    investor: '/investor/dashboard'
  }

  /**
   * Check if the current session is valid. Returns true if logged in.
   * Works for ALL portal roles.
   */
  async function checkSession() {
    loading.value = true
    try {
      const r = await apiGet('/me')
      if (r.user && PORTAL_ROLES.includes(r.user.role)) {
        user.value = r.user
        return true
      }
      user.value = null
      return false
    } catch {
      user.value = null
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Login with email + password. Server sets session and returns user + redirect.
   */
  async function login(email, password) {
    const r = await apiPost('/login', { email, password })
    user.value = r.user
    return r
  }

  /**
   * Logout — destroy session.
   */
  async function logout() {
    try { await apiPost('/logout', {}) } catch { /* ignore */ }
    user.value = null
  }

  /**
   * Check if user has a specific role.
   */
  function hasRole(...roles) {
    return roles.includes(user.value?.role)
  }

  /**
   * Get the correct dashboard URL for the current user.
   */
  function dashboardUrl() {
    return PORTAL_REDIRECTS[user.value?.role] || '/login'
  }

  return {
    user, loading,
    isLoggedIn, isAdmin, isSuperAdmin, isSponsor, isBank, isFranchise, isReseller, isInvestor, isPartner,
    userName, userRole,
    checkSession, login, logout, hasRole, dashboardUrl
  }
})
