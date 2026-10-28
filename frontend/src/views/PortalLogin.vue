<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style="background: #0a0a0f">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.07]">
        <defs><pattern id="honeycomb-p" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
          <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
          <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#honeycomb-p)"/>
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
        <h1 class="text-xl font-bold text-white mb-2">Login</h1>
        <p class="text-white/50 text-sm">Sign in to your portal</p>
      </div>

      <!-- Role badge preview -->
      <div v-if="detectedRole" class="mb-4 p-3 rounded-lg bg-[#FF7A30]/10 border border-[#FF7A30]/30 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-[#FF7A30]/20 text-[#FF7A30] flex items-center justify-center text-sm">
          <i :class="roleIcon"></i>
        </div>
        <div>
          <p class="text-[#FF7A30] text-xs font-semibold uppercase tracking-wide">{{ roleLabel }}</p>
          <p class="text-white/60 text-xs">Redirecting to {{ redirectPath }}...</p>
        </div>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-white/70 mb-1.5">Email</label>
          <input v-model="email" type="email" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="you@company.com">
        </div>
        <div>
          <label class="block text-sm font-medium text-white/70 mb-1.5">Password</label>
          <div class="relative">
            <input v-model="password" :type="showPassword ? 'text' : 'password'" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 pr-10 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="••••••••">
            <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
        </div>
        <p v-if="error" class="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{{ error }}</p>
        <button type="submit" :disabled="loading" class="w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-[#FF7A30]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-white/50 mb-2">Don't have an account?</p>
        <router-link to="/register" class="text-sm text-[#FF7A30] hover:underline font-medium">Register as Reseller / Franchiser / Partner</router-link>
      </div>
      <p class="text-center text-sm text-white/50 mt-4">
        WiFi user? <router-link to="/hotspot/login" class="text-[#FF7A30] hover:underline">Login with phone</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const detectedRole = ref(null)
const showPassword = ref(false)

const ROLE_META = {
  admin:          { label: 'Admin Portal',       icon: 'fas fa-shield-alt',  redirect: '/admin/dashboard' },
  super_admin:    { label: 'Super Admin Portal',  icon: 'fas fa-crown',       redirect: '/admin/dashboard' },
  sponsor:        { label: 'Sponsor Portal',      icon: 'fas fa-bullhorn',    redirect: '/sponsor/dashboard' },
  bank_partner:   { label: 'Bank Partner Portal', icon: 'fas fa-university',  redirect: '/bank/dashboard' },
  franchise_owner:{ label: 'Franchise Portal',    icon: 'fas fa-store',       redirect: '/franchise/dashboard' },
  reseller:       { label: 'Reseller Portal',     icon: 'fas fa-ticket-alt',  redirect: '/reseller/dashboard' },
  investor:       { label: 'Investor Portal',     icon: 'fas fa-chart-line',  redirect: '/investor/dashboard' }
}

const roleLabel = computed(() => ROLE_META[detectedRole.value]?.label || '')
const roleIcon = computed(() => ROLE_META[detectedRole.value]?.icon || 'fas fa-user')
const redirectPath = computed(() => ROLE_META[detectedRole.value]?.redirect || '/login')

// Preview role after successful login attempt
async function handleLogin() {
  loading.value = true; error.value = ''
  try {
    const r = await auth.login(email.value, password.value)
    detectedRole.value = r.user.role
    // Small delay so user sees the role badge
    await new Promise(resolve => setTimeout(resolve, 600))
    router.push(r.redirect)
  } catch (e) {
    error.value = e.response?.data?.error || 'Invalid email or password'
  } finally { loading.value = false }
}
</script>
