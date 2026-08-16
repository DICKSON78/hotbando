<template>
  <div class="min-h-screen bg-gradient-to-br from-brand-500 to-brand-700 p-4">
    <div class="max-w-lg mx-auto space-y-4">
      <div class="bg-white/10 backdrop-blur rounded-2xl p-6 text-white">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-sm opacity-80">Welcome</p>
            <h2 class="text-xl font-bold">{{ user?.name || 'User' }}</h2>
          </div>
          <button @click="logout" class="text-white/70 hover:text-white"><i class="fas fa-sign-out-alt text-xl"></i></button>
        </div>
        <div class="flex items-center gap-2 text-xs opacity-80">
          <i class="fas fa-wifi"></i>
          <span>{{ store.ssidshow || 'HotBando WiFi' }}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="bg-white rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-brand-500">{{ remainingTime }}</p>
          <p class="text-xs text-gray-500">Time Remaining</p>
        </div>
        <div class="bg-white rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-green-500">{{ freeMB }} MB</p>
          <p class="text-xs text-gray-500">Free Data</p>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-medium text-gray-700">Watch Ads to Earn Data</p>
          <router-link to="/hotspot/ads" class="text-xs text-brand-500 font-medium">View</router-link>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-2xl font-bold text-purple-500">{{ adsRemaining }}</p>
            <p class="text-xs text-gray-500">Ads remaining today</p>
          </div>
          <p class="text-xs text-gray-400">Watched: {{ adsWatchedToday }}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <router-link to="/hotspot/subscribe" class="bg-white rounded-xl p-4 text-center hover:shadow-lg transition-shadow">
          <i class="fas fa-shopping-cart text-2xl text-brand-500 mb-2"></i>
          <p class="text-sm font-medium text-gray-700">Buy Package</p>
        </router-link>
        <router-link to="/hotspot/ads" class="bg-white rounded-xl p-4 text-center hover:shadow-lg transition-shadow">
          <i class="fas fa-play-circle text-2xl text-purple-500 mb-2"></i>
          <p class="text-sm font-medium text-gray-700">Watch Ads</p>
        </router-link>
      </div>

      <div class="bg-white rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full" :class="connected ? 'bg-green-500' : 'bg-red-500'"></div>
            <span class="text-sm text-gray-700">{{ connected ? 'Connected' : 'Disconnected' }}</span>
          </div>
          <button @click="toggleConnection" class="text-sm" :class="connected ? 'text-red-500' : 'text-brand-500'">
            {{ connected ? 'Disconnect' : 'Connect' }}
          </button>
        </div>
        <p v-if="connMsg" class="text-xs mt-2" :class="connError ? 'text-red-500' : 'text-green-500'">{{ connMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { hotspotGet, hotspotPost } from '../../api/client'
import { useHotspotStore } from '../../stores/hotspot'

const router = useRouter()
const store = useHotspotStore()
const user = ref(null)
const remainingTime = ref('—')
const freeMB = ref(0)
const adsRemaining = ref(0)
const adsWatchedToday = ref(0)
const connected = ref(false)
const connMsg = ref('')
const connError = ref(false)
let pollTimer = null

async function loadData() {
  try {
    const r = await hotspotGet('/dashboard', { params: { t: Date.now() } })
    if (r.redirect) { router.push('/hotspot/login'); return }
    user.value = r.user || null
    remainingTime.value = r.remainingTime || '—'
    freeMB.value = r.freeMB || 0
    adsRemaining.value = r.adsRemaining || 0
    adsWatchedToday.value = r.adsWatchedToday || 0
  } catch (e) {
    if (e.response?.status === 401) router.push('/hotspot/login')
  }
}

async function loadUsage() {
  try {
    const r = await hotspotGet('/usage')
    freeMB.value = r.freeMB || freeMB.value
    remainingTime.value = r.remainingTime || remainingTime.value
  } catch (e) { /* ignore polling errors */ }
}

onMounted(async () => {
  await loadData()
  pollTimer = setInterval(loadUsage, 30000)
})

onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

async function toggleConnection() {
  connMsg.value = ''
  try {
    const endpoint = connected.value ? '/disconnect' : '/connect'
    const r = await hotspotPost(endpoint)
    connected.value = !!r.success
    connMsg.value = r.message || ''
    connError.value = !r.success
    if (r.success) loadData()
  } catch (e) {
    connError.value = true
    connMsg.value = 'Imeshindikana. Tafadhali jaribu tena.'
  }
}

async function logout() {
  await store.logout()
  router.push('/hotspot')
}
</script>
