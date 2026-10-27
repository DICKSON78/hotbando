<template>
  <div class="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.07]">
        <defs><pattern id="honeycomb" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
          <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
          <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#honeycomb)"/>
      </svg>
    </div>

    <!-- NOT on WiFi — captive portal instruction -->
    <div v-if="store.initialized && !store.onWifi" class="bg-[#111118] rounded-2xl shadow-2xl p-8 w-full max-w-md relative text-center">
      <img src="/logo.png" class="h-16 mx-auto mb-4" alt="HotBando">
      <div class="w-16 h-16 rounded-full bg-[#FF7A30]/10 flex items-center justify-center mx-auto mb-4">
        <i class="fas fa-wifi text-2xl text-[#FF7A30]"></i>
      </div>
      <h2 class="text-lg font-bold text-white mb-2">Connect to HotBando WiFi</h2>
      <p class="text-sm text-white/60 mb-6">
        To register and get free internet, you must be connected to a HotBando WiFi network.
      </p>
      <div class="bg-[#0a0a0f] rounded-xl p-4 text-left space-y-3">
        <div class="flex items-start gap-3">
          <span class="text-[#FF7A30] font-bold text-sm">1.</span>
          <p class="text-sm text-white/70">Go to WiFi settings and connect to <b class="text-white">HotBando WiFi</b></p>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-[#FF7A30] font-bold text-sm">2.</span>
          <p class="text-sm text-white/70">Open your browser — you'll be redirected here automatically</p>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-[#FF7A30] font-bold text-sm">3.</span>
          <p class="text-sm text-white/70">Register and buy a package to get internet access</p>
        </div>
      </div>
      <router-link to="/hotspot" class="ig-btn ig-btn-primary w-full py-2.5 mt-6 inline-block">Back</router-link>
    </div>

    <!-- ON WiFi — show signup form -->
    <div v-else class="bg-[#111118] rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
      <img src="/logo.png" class="h-12 mx-auto mb-6" alt="HotBando">
      <h2 class="text-xl font-bold text-white mb-4 text-center">Register</h2>
      <form @submit.prevent="handleRegister" class="space-y-3">
        <div><label class="input-label">Full Name</label><input v-model="name" type="text" required class="input" placeholder="John Doe"></div>
        <PhoneInput @change="v => phoneFull = v" />
        <div><label class="input-label">Email (optional)</label><input v-model="email" type="email" class="input" placeholder="you@email.com"></div>
        <div><label class="input-label">Password</label><input v-model="password" type="password" required minlength="6" class="input" placeholder="Min 6 characters"></div>
        <div><label class="input-label">Confirm Password</label><input v-model="passwordConfirm" type="password" required minlength="6" class="input" placeholder="Re-enter password"></div>
        <div><label class="input-label">Referral Code</label><input v-model="referralCode" type="text" class="input" placeholder="Optional"></div>
        <p v-if="error" class="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{{ error }}</p>
        <button type="submit" :disabled="loading" class="btn btn-primary w-full justify-center py-2.5">{{ loading ? '...' : 'Register' }}</button>
      </form>
      <p class="text-center text-sm text-white/50 mt-4">Already have account? <router-link to="/hotspot/login" class="text-[#FF7A30] hover:underline">Login</router-link></p>
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
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const referralCode = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  if (password.value !== passwordConfirm.value) {
    error.value = 'Passwords do not match'
    return
  }
  loading.value = true; error.value = ''
  const p = phoneFull.value
  const localPhone = p.startsWith('+255') ? '0' + p.slice(4) : p
  try {
    await hotspotPost('/register', {
      name: name.value,
      phone_number: localPhone,
      email: email.value,
      password: password.value,
      password_confirm: passwordConfirm.value,
      referral_code: referralCode.value,
      router_id: store.routerID || '',
      mac: store.mac || ''
    })
    await store.refreshUser()
    router.replace('/hotspot/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || 'Registration failed'
  } finally { loading.value = false }
}
</script>
