<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style="background: #0a0a0f">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.07]">
        <defs>
          <pattern id="honeycomb-pr" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
            <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
            <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#honeycomb-pr)"/>
      </svg>
      <svg width="100%" height="100%" viewBox="0 0 400 400" class="absolute inset-0" preserveAspectRatio="none">
        <path d="M0 300 Q 50 280 100 320 T 200 300 T 300 340 T 400 310 L 400 400 L 0 400Z" fill="rgba(255,122,48,0.04)"/>
        <circle cx="50" cy="50" r="8" fill="rgba(255,122,48,0.06)"/>
        <circle cx="350" cy="80" r="12" fill="rgba(255,122,48,0.05)"/>
        <circle cx="180" cy="120" r="6" fill="rgba(255,122,48,0.07)"/>
        <circle cx="80" cy="240" r="10" fill="rgba(255,122,48,0.05)"/>
      </svg>
    </div>

    <div class="rounded-2xl shadow-2xl p-8 w-full max-w-md relative" style="background: #111118; border: 1px solid #1e1e2a">
      <div class="text-center mb-6">
        <img src="/logo.png" class="h-16 mx-auto mb-4" alt="HotBando">
        <h1 class="text-xl font-bold text-white mb-2">Partner Registration</h1>
        <p class="text-white/50 text-sm">Register as Reseller, Franchiser, or Partner</p>
      </div>

      <!-- Step Indicator -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center flex-1">
          <div :class="step >= 1 ? 'bg-[#FF7A30] text-white' : 'bg-[#1e1e2a] text-white/40'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors">
            1
          </div>
          <div :class="step >= 2 ? 'bg-[#FF7A30]' : 'bg-[#1e1e2a]'" class="flex-1 h-0.5 mx-2 transition-colors"></div>
        </div>
        <div class="flex items-center flex-1">
          <div :class="step >= 2 ? 'bg-[#FF7A30] text-white' : 'bg-[#1e1e2a] text-white/40'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors">
            2
          </div>
          <div :class="step >= 3 ? 'bg-[#FF7A30]' : 'bg-[#1e1e2a]'" class="flex-1 h-0.5 mx-2 transition-colors"></div>
        </div>
        <div :class="step >= 3 ? 'bg-[#FF7A30] text-white' : 'bg-[#1e1e2a] text-white/40'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors">
          3
        </div>
      </div>
      <div class="flex justify-between text-xs text-white/50 mb-6 -mt-4">
        <span class="w-8 text-center">Type</span>
        <span class="w-8 text-center">Details</span>
        <span class="w-8 text-center">Security</span>
      </div>

      <form @submit.prevent="handleNext" class="space-y-4">
        <!-- Step 1: Registration Type -->
        <div v-if="step === 1" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/70 mb-1.5">Register As <span class="text-red-400">*</span></label>
            <select v-model="form.type" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors">
              <option value="reseller">Reseller</option>
              <option value="franchiser">Franchiser</option>
              <option value="partner">Partner (Bank/Sponsor)</option>
            </select>
          </div>
          <p class="text-xs text-white/40">Select the type of partner account you want to register for.</p>
        </div>

        <!-- Step 2: Personal/Business Details -->
        <div v-if="step === 2" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/70 mb-1.5">Full Name / Business Name <span class="text-red-400">*</span></label>
            <input v-model="form.name" type="text" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="Enter full name or business name">
          </div>
          <div>
            <label class="block text-sm font-medium text-white/70 mb-1.5">Email Address <span class="text-red-400">*</span></label>
            <input v-model="form.email" type="email" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="you@company.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-white/70 mb-1.5">Phone Number <span class="text-red-400">*</span></label>
            <input v-model="form.phone" type="tel" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="07XXXXXXXX or +255...">
          </div>
          <div v-if="form.type === 'reseller'">
            <label class="block text-sm font-medium text-white/70 mb-1.5">Assigned Location (Mikrotik) <span class="text-red-400">*</span></label>
            <select v-model="form.location_id" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors">
              <option :value="null" disabled>Select your location</option>
              <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }} — {{ loc.city }}</option>
            </select>
            <p class="text-xs text-white/40 mt-1">The hotspot location you will manage and sell vouchers for.</p>
          </div>
        </div>

        <!-- Step 3: Password -->
        <div v-if="step === 3" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/70 mb-1.5">Password <span class="text-red-400">*</span></label>
            <div class="relative">
              <input v-model="form.password" :type="showPassword ? 'text' : 'password'" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 pr-10 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="Enter password">
              <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
            <p class="text-xs text-white/40 mt-1">Minimum 6 characters</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-white/70 mb-1.5">Confirm Password <span class="text-red-400">*</span></label>
            <div class="relative">
              <input v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 pr-10 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="Confirm password">
              <button type="button" @click="showConfirmPassword = !showConfirmPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                <i :class="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </div>
        </div>

        <p v-if="error" class="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{{ error }}</p>
        <p v-if="success" class="text-green-400 text-sm bg-green-500/10 p-3 rounded-lg">{{ success }}</p>

        <div class="flex gap-3">
          <button v-if="step > 1" type="button" @click="step--" class="flex-1 bg-[#1e1e2a] hover:bg-[#2a2a3a] text-white font-semibold py-2.5 rounded-xl transition-all">
            Back
          </button>
          <button type="submit" :disabled="loading" class="flex-1 bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-[#FF7A30]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <span v-if="step < 3">Next</span>
            <span v-else>{{ loading ? 'Registering...' : 'Register' }}</span>
          </button>
        </div>
      </form>

      <p class="text-center text-sm text-white/50 mt-6">
        Already have an account? <router-link to="/login" class="text-[#FF7A30] hover:underline">Sign in</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
})

const router = useRouter()
const step = ref(1)
const form = ref({
  name: '',
  email: '',
  phone: '',
  type: 'reseller',
  location_id: null,
  password: '',
  confirmPassword: ''
})
const locations = ref([])

onMounted(async () => {
  try {
    const r = await api.get('/public/locations')
    locations.value = r.data?.locations || r.locations || []
  } catch {}
})
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

const handleNext = () => {
  error.value = ''
  success.value = ''

  if (step.value === 1) {
    if (!form.value.type) {
      error.value = 'Please select registration type'
      return
    }
    if (form.value.type === 'reseller') {
      router.push('/apply/reseller')
      return
    }
    step.value = 2
    return
  }

  if (step.value === 2) {
    if (!form.value.name.trim()) {
      error.value = 'Full Name / Business Name is required'
      return
    }
    if (!form.value.email.trim()) {
      error.value = 'Email is required'
      return
    }
    if (!form.value.phone.trim()) {
      error.value = 'Phone Number is required'
      return
    }
    if (form.value.type === 'reseller' && !form.value.location_id) {
      error.value = 'Please select your assigned location'
      return
    }
    step.value = 3
    return
  }

  if (step.value === 3) {
    handleRegister()
  }
}

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
        password: form.value.password,
        location_id: form.value.location_id
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
