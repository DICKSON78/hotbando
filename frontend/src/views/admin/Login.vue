<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 p-4 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.07]">
        <defs><pattern id="honeycomb-a" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
          <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
          <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#honeycomb-a)"/>
      </svg>
      <svg width="100%" height="100%" viewBox="0 0 400 400" class="absolute inset-0" preserveAspectRatio="none">
        <path d="M0 300 Q 50 280 100 320 T 200 300 T 300 340 T 400 310 L 400 400 L 0 400Z" fill="rgba(255,255,255,0.04)"/>
        <circle cx="50" cy="50" r="8" fill="rgba(255,255,255,0.06)"/>
        <circle cx="350" cy="80" r="12" fill="rgba(255,255,255,0.05)"/>
        <circle cx="180" cy="120" r="6" fill="rgba(255,255,255,0.07)"/>
        <circle cx="80" cy="240" r="10" fill="rgba(255,255,255,0.05)"/>
      </svg>
    </div>
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
      <div class="text-center mb-8">
        <img src="/logo.png" class="h-16 mx-auto mb-4" alt="HotBando">
        <h1 class="text-2xl font-bold text-gray-800">HotBando Admin</h1>
        <p class="text-gray-500 mt-1">Sign in to continue</p>
      </div>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="input-label">Email</label>
          <input v-model="email" type="email" required class="input" placeholder="admin@hotbando.com">
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
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  loading.value = true; error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/admin/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || 'Login failed'
  } finally { loading.value = false }
}
</script>
