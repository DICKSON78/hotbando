<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 px-4 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.07]">
        <defs><pattern id="honeycomb-r" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
          <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
          <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#honeycomb-r)"/>
      </svg>
      <svg width="100%" height="100%" viewBox="0 0 400 400" class="absolute inset-0" preserveAspectRatio="none">
        <path d="M0 300 Q 50 280 100 320 T 200 300 T 300 340 T 400 310 L 400 400 L 0 400Z" fill="rgba(255,255,255,0.04)"/>
        <circle cx="50" cy="50" r="8" fill="rgba(255,255,255,0.06)"/>
        <circle cx="350" cy="80" r="12" fill="rgba(255,255,255,0.05)"/>
        <circle cx="180" cy="120" r="6" fill="rgba(255,255,255,0.07)"/>
        <circle cx="80" cy="240" r="10" fill="rgba(255,255,255,0.05)"/>
      </svg>
    </div>
    <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 relative">
      <div class="text-center mb-6">
        <img src="/logo.png" class="h-12 mx-auto mb-3" alt="HotBando">
        <h1 class="text-2xl font-bold text-gray-800">Reseller Registration</h1>
        <p class="text-sm text-gray-500 mt-1">Join HotBando as a reseller</p>
      </div>

      <form @submit.prevent="register" class="space-y-4">
        <div>
          <label class="input-label">Full Name</label>
          <input v-model="form.name" type="text" required placeholder="Your name" class="input w-full">
        </div>
        <PhoneInput @change="v => { const p = v; form.phone_number = p.startsWith('+255') ? '0' + p.slice(4) : p }" />
        <div>
          <label class="input-label">Password</label>
          <input v-model="form.password" type="password" required minlength="6" placeholder="At least 6 characters" class="input w-full">
        </div>
        <div>
          <label class="input-label">Confirm Password</label>
          <input v-model="passwordConfirm" type="password" required minlength="6" placeholder="Re-enter password" class="input w-full">
        </div>

        <div v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">{{ error }}</div>
        <div v-if="success" class="text-sm text-green-600 bg-green-50 rounded-lg p-3">{{ success }}</div>

        <button type="submit" :disabled="loading" class="btn btn-primary w-full justify-center py-2.5" :class="{ 'opacity-50 cursor-not-allowed': loading }">
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
      </form>

      <p class="text-center text-sm text-gray-500 mt-6">
        Already have an account? <router-link to="/reseller/dashboard" class="text-brand-600 hover:underline">Login</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api/client'
import PhoneInput from '../../components/PhoneInput.vue'

const router = useRouter()
const form = ref({ name: '', phone_number: '', password: '' })
const passwordConfirm = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function register() {
  error.value = ''; success.value = ''
  if (form.value.password !== passwordConfirm.value) { error.value = 'Passwords do not match.'; return }
  loading.value = true
  try {
    const r = await api.post('/reseller/register', form.value).then(r => r.data)
    if (r.success) { success.value = 'Account created! You can now login.'; setTimeout(() => router.push('/reseller/dashboard'), 2000) }
    else { error.value = r.message }
  } catch (e) { error.value = e.response?.data?.message || e.message || 'Network error' }
  finally { loading.value = false }
}
</script>
