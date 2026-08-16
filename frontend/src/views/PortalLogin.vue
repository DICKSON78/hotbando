<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 p-4 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.07]">
        <defs><pattern id="honeycomb-p" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
          <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
          <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#honeycomb-p)"/>
      </svg>
    </div>
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
      <div class="text-center mb-6">
        <img src="/logo.png" class="h-16 mx-auto mb-3" alt="HotBando">
        <h1 class="text-2xl font-bold text-gray-800">HotBando</h1>
        <p class="text-gray-500 mt-1 text-sm">Sign in to your account</p>
      </div>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="input-label">Email</label>
          <input v-model="email" type="email" required class="input" placeholder="you@company.com">
        </div>
        <div>
          <label class="input-label">Password</label>
          <input v-model="password" type="password" required class="input" placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;">
        </div>
        <p v-if="error" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{{ error }}</p>
        <button type="submit" :disabled="loading" class="btn btn-primary w-full justify-center py-2.5">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
      <p class="text-center text-xs text-gray-500 mt-4">
        WiFi user? <router-link to="/hotspot/login" class="text-brand-500 hover:underline">Login with voucher</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePartnerStore } from '../stores/partner'
import { apiPost } from '../api/client'

const router = useRouter()
const store = usePartnerStore()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  loading.value = true; error.value = ''
  try {
    const r = await apiPost('/login', { email: email.value, password: password.value })
    store.user = r.user
    router.push(r.redirect)
  } catch (e) {
    error.value = e.response?.data?.error || 'Invalid email or password'
  } finally { loading.value = false }
}
</script>
