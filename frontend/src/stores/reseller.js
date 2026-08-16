import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api, { apiGet } from '../api/client'

export const useResellerStore = defineStore('reseller', () => {
  const user = ref(null)
  const loading = ref(true)

  const isReseller = computed(() => user.value?.role === 'reseller')
  const userName = computed(() => user.value?.name || '')

  async function checkSession() {
    loading.value = true
    try {
      const r = await apiGet('/me')
      if (r.user && (r.user.role === 'reseller' || r.user.role === 'customer')) {
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

  return { user, loading, isReseller, userName, checkSession }
})
