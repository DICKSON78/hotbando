<template>
  <div class="min-h-screen bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center p-4 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.07]">
        <defs><pattern id="honeycomb-s" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
          <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
          <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#honeycomb-s)"/>
      </svg>
      <svg width="100%" height="100%" viewBox="0 0 400 400" class="absolute inset-0" preserveAspectRatio="none">
        <path d="M0 300 Q 50 280 100 320 T 200 300 T 300 340 T 400 310 L 400 400 L 0 400Z" fill="rgba(255,255,255,0.04)"/>
        <path d="M0 350 Q 60 320 120 360 T 240 340 T 360 380 L 400 360 L 400 400 L 0 400Z" fill="rgba(255,255,255,0.03)"/>
        <circle cx="50" cy="50" r="8" fill="rgba(255,255,255,0.06)"/>
        <circle cx="350" cy="80" r="12" fill="rgba(255,255,255,0.05)"/>
        <circle cx="180" cy="120" r="6" fill="rgba(255,255,255,0.07)"/>
        <circle cx="320" cy="200" r="5" fill="rgba(255,255,255,0.04)"/>
        <circle cx="80" cy="240" r="10" fill="rgba(255,255,255,0.05)"/>
      </svg>
    </div>
    <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
      <img src="/logo.png" class="h-12 mx-auto mb-6" alt="HotBando">
      <h2 class="text-xl font-bold text-gray-800 mb-4 text-center">Register FREE</h2>
      <p class="text-sm text-gray-500 text-center mb-6">Get 10MB free when you register</p>
      <form @submit.prevent="handleSignup" class="space-y-3">
        <div><label class="input-label">Full Name</label><input v-model="name" required class="input"></div>
        <PhoneInput @change="v => phoneFull = v" />
        <div><label class="input-label">Password</label><input v-model="password" type="password" required class="input" minlength="4"></div>
        <div><label class="input-label">Confirm Password</label><input v-model="passwordConfirm" type="password" required class="input" minlength="4"></div>
        <p v-if="error" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{{ error }}</p>
        <button type="submit" :disabled="loading" class="btn btn-primary w-full justify-center py-2.5">{{ loading ? '...' : 'Register' }}</button>
      </form>
      <p class="text-center text-sm text-gray-500 mt-4">Already have an account? <router-link to="/hotspot/login" class="text-brand-500 hover:underline">Login</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { hotspotPost } from '../../api/client'
import { useHotspotStore } from '../../stores/hotspot'
import PhoneInput from '../../components/PhoneInput.vue'

const router = useRouter()
const store = useHotspotStore()
const name = ref('')
const phoneFull = ref('')
const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const loading = ref(false)

async function handleSignup() {
  loading.value = true; error.value = ''
  if (password.value !== passwordConfirm.value) { error.value = 'Passwords do not match.'; loading.value = false; return }
  const p = phoneFull.value
  const localPhone = p.startsWith('+255') ? '0' + p.slice(4) : p
  const form = new URLSearchParams()
  form.append('name', name.value); form.append('phone_number', localPhone); form.append('password', password.value); form.append('password_confirm', passwordConfirm.value)
  try { await hotspotPost('/register', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); await store.refreshUser(); router.push('/hotspot/dashboard') }
  catch (e) { error.value = e.response?.data?.error || 'Registration failed' }
  finally { loading.value = false }
}
</script>
