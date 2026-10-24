<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style="background: #0a0a0f">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.03]">
        <defs><pattern id="honeycomb-p" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
          <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="#FF7A30" stroke-width="1.5"/>
          <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="#FF7A30" stroke-width="1"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#honeycomb-p)"/>
      </svg>
    </div>
    <div class="rounded-2xl shadow-xl p-8 w-full max-w-md relative" style="background: #111118; border: 1px solid #1e1e2a">
      <div class="text-center mb-6">
        <img src="/logo.png" class="h-16 mx-auto mb-3" alt="HotBando">
        <h1 class="text-2xl font-bold text-white">HotBando</h1>
        <p class="text-white/50 mt-1 text-sm">Sign in to your portal</p>
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
          <input v-model="password" type="password" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;">
        </div>
        <p v-if="error" class="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{{ error }}</p>
        <button type="submit" :disabled="loading" class="w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-[#FF7A30]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="mt-6 pt-4 border-t border-[#1e1e2a] text-center">
        <p class="text-xs text-white/40 mb-3">Available Portals</p>
        <div class="flex flex-wrap justify-center gap-2">
          <span class="text-[10px] px-2 py-1 rounded bg-white/5 text-white/40 border border-[#1e1e2a]">Admin</span>
          <span class="text-[10px] px-2 py-1 rounded bg-white/5 text-white/40 border border-[#1e1e2a]">Sponsor</span>
          <span class="text-[10px] px-2 py-1 rounded bg-white/5 text-white/40 border border-[#1e1e2a]">Reseller</span>
          <span class="text-[10px] px-2 py-1 rounded bg-white/5 text-white/40 border border-[#1e1e2a]">Investor</span>
          <span class="text-[10px] px-2 py-1 rounded bg-white/5 text-white/40 border border-[#1e1e2a]">Franchise</span>
          <span class="text-[10px] px-2 py-1 rounded bg-white/5 text-white/40 border border-[#1e1e2a]">Bank</span>
        </div>
      </div>
      <p class="text-center text-xs text-white/40 mt-4">
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
