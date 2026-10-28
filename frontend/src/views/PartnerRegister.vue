<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style="background: #0a0a0f">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.03]">
        <defs><pattern id="honeycomb-pr" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
          <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="#FF7A30" stroke-width="1.5"/>
          <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="#FF7A30" stroke-width="1"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#honeycomb-pr)"/>
      </svg>
    </div>
    <div class="rounded-2xl shadow-xl p-8 w-full max-w-md relative" style="background: #111118; border: 1px solid #1e1e2a">
      <div class="text-center mb-6">
        <img src="/logo.png" class="h-16 mx-auto mb-3" alt="HotBando">
        <h1 class="text-2xl font-bold text-white">Partner Registration</h1>
        <p class="text-white/50 mt-1 text-sm">Register as Reseller, Franchiser, or Partner</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-white/70 mb-1.5">Full Name / Business Name</label>
          <input v-model="form.name" type="text" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="Enter name">
        </div>
        <div>
          <label class="block text-sm font-medium text-white/70 mb-1.5">Email</label>
          <input v-model="form.email" type="email" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="you@company.com">
        </div>
        <div>
          <label class="block text-sm font-medium text-white/70 mb-1.5">Phone Number</label>
          <input v-model="form.phone" type="tel" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="07XXXXXXXX">
        </div>
        <div>
          <label class="block text-sm font-medium text-white/70 mb-1.5">Register As</label>
          <select v-model="form.type" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors">
            <option value="reseller">Reseller</option>
            <option value="franchiser">Franchiser</option>
            <option value="partner">Partner (Bank/Sponsor)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-white/70 mb-1.5">Password</label>
          <div class="relative">
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 pr-10 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="••••••••">
            <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-white/70 mb-1.5">Confirm Password</label>
          <div class="relative">
            <input v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 pr-10 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="••••••••">
            <button type="button" @click="showConfirmPassword = !showConfirmPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              <i :class="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
        </div>
        <p v-if="error" class="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{{ error }}</p>
        <p v-if="success" class="text-green-400 text-sm bg-green-500/10 p-3 rounded-lg">{{ success }}</p>
        <button type="submit" :disabled="loading" class="w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-[#FF7A30]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
      </form>

      <p class="text-center text-sm text-white/50 mt-6">
        Already have an account? <router-link to="/login" class="text-[#FF7A30] hover:underline">Sign in</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
})

const router = useRouter()
const form = ref({
  name: '',
  email: '',
  phone: '',
  type: 'reseller',
  password: '',
  confirmPassword: ''
})
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

const handleRegister = async () => {
  error.value = ''
  success.value = ''
  
  if (form.value.password !== form.value.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }
  if (form.value.password.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }
  
  loading.value = true
  try {
    if (form.value.type === 'reseller') {
      await api.post('/reseller/register', {
        name: form.value.name,
        email: form.value.email,
        phone: form.value.phone,
        password: form.value.password
      })
    } else {
      await api.post('/partners/register', {
        name: form.value.name,
        email: form.value.email,
        phone: form.value.phone,
        type: form.value.type,
        password: form.value.password
      })
    }
    success.value = 'Registration successful! You can now login.'
    setTimeout(() => router.push('/login'), 2000)
  } catch (e) {
    error.value = e.response?.data?.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>
