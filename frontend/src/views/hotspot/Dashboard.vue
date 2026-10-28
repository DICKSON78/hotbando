<template>
  <div class="pb-4">
    <!-- Greeting -->
    <div class="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs text-white/50">Karibu</p>
        <h1 class="text-xl font-bold text-white truncate">{{ user?.name || 'User' }}</h1>
        <p class="text-sm text-white/50 truncate">{{ user?.phone_number || 'HotBando Member' }}</p>
      </div>
      <span class="flex items-center gap-1.5 text-xs font-medium text-white/60 bg-[#111118] border border-[#1e1e2a] rounded-full px-3 py-2 flex-shrink-0">
        <i class="fas fa-wifi text-[#FF7A30]"></i>{{ store.ssidshow || 'WiFi' }}
      </span>
    </div>

    <!-- Alert banner -->
    <div v-if="alertMsg" class="mx-4 mt-3 rounded-2xl p-4 flex items-start gap-3" :style="alertType === 'warn' ? 'background:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.3)' : alertType === 'danger' ? 'background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3)' : 'background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3)'">
      <i class="fas mt-0.5" :class="alertType === 'warn' ? 'fa-exclamation-triangle text-yellow-400' : alertType === 'danger' ? 'fa-times-circle text-red-400' : 'fa-info-circle text-blue-400'"></i>
      <div class="flex-1">
        <p class="text-sm font-semibold text-white">{{ alertMsg }}</p>
        <div class="flex gap-2 mt-2">
          <router-link to="/hotspot/subscribe" class="ig-btn ig-btn-primary text-xs py-1.5 px-3">Buy Voucher</router-link>
          <router-link to="/hotspot/ads" class="ig-btn ig-btn-outline text-xs py-1.5 px-3">Watch Ads</router-link>
          <button v-if="canEnableNotifications" class="ig-btn ig-btn-outline text-xs py-1.5 px-3" @click="enableNotifications">Enable alerts</button>
        </div>
      </div>
    </div>

    <!-- Balance card -->
    <div class="mx-4 balance-card rounded-2xl p-5 text-white">
      <div class="flex items-center justify-between">
        <p class="text-white/80 text-xs font-medium">Time Remaining</p>
        <i class="fas fa-wifi text-white/80"></i>
      </div>
      <p class="text-3xl font-bold mt-1">{{ remainingTime }}</p>
      <div class="flex items-center justify-between mt-4 pt-4 border-t border-white/20 text-sm">
        <div>
          <p class="text-white/70 text-xs">Free Data</p>
          <p class="font-bold">{{ freeMB }} MB</p>
        </div>
        <div class="text-right">
          <p class="text-white/70 text-xs">Ads Left</p>
          <p class="font-bold">{{ adsRemaining }}</p>
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="grid grid-cols-3 gap-3 px-4 py-4">
      <router-link to="/hotspot/subscribe" class="tile">
        <div class="tile-icon" style="background:rgba(255,122,48,0.1);color:#FF7A30"><i class="fa-solid fa-store"></i></div>
        <span>Buy Package</span>
      </router-link>
      <router-link to="/hotspot/ads" class="tile">
        <div class="tile-icon" style="background:rgba(139,92,246,0.1);color:#8b5cf6"><i class="fa-solid fa-circle-play"></i></div>
        <span>Watch Ads</span>
      </router-link>
      <button class="tile" @click="toggleConnection">
        <div class="tile-icon" :style="connected ? 'background:rgba(34,197,94,0.1);color:#22c55e' : 'background:rgba(156,163,175,0.1);color:#9ca3af'"><i class="fa-solid fa-wifi"></i></div>
        <span>{{ connected ? 'Connected' : 'Connect' }}</span>
      </button>
    </div>

    <!-- Connection status -->
    <div class="mx-4 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-4">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-3 h-3 rounded-full flex-shrink-0" :class="connected ? 'bg-green-500' : 'bg-red-500'"></span>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-white">{{ connected ? 'Connected' : 'Disconnected' }}</p>
            <p class="text-xs text-white/50 truncate">{{ store.ssidshow || 'HotBando WiFi' }}</p>
          </div>
        </div>
        <button class="ig-btn flex-shrink-0" :class="connected ? 'ig-btn-outline' : 'ig-btn-primary'" @click="toggleConnection">
          {{ connected ? 'Disconnect' : 'Connect' }}
        </button>
      </div>
      <p v-if="connMsg" class="text-xs mt-2" :class="connError ? 'text-red-400' : 'text-green-400'">{{ connMsg }}</p>
    </div>

    <!-- Watched today -->
    <div class="mx-4 mt-3 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-4 flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-white">Ads Watched Today</p>
        <p class="text-xs text-white/50">Tazama matangazo kupata data bure</p>
      </div>
      <p class="text-2xl font-bold text-purple-500">{{ adsWatchedToday }}</p>
    </div>

    <InstallApp />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { hotspotGet, hotspotPost } from '../../api/client'
import { useHotspotStore } from '../../stores/hotspot'
import InstallApp from '../../components/InstallApp.vue'

const router = useRouter()
const store = useHotspotStore()
const user = ref(null)
const remainingTime = ref('—')
const remainingSeconds = ref(0)
const freeMB = ref(0)
const adsRemaining = ref(0)
const adsWatchedToday = ref(0)
const connected = ref(false)
const routerReady = ref(false)
const connMsg = ref('')
const connError = ref(false)
const alertMsg = ref('')
const alertType = ref('info')
let lowBundleNotified = false
let connectedNotified = false
let outOfBundleNotified = false
let pollTimer = null
let countdownTimer = null
let autoConnectAttempted = false

function checkAlert() {
  const hasBundle = remainingSeconds.value > 0
  const hasFree = parseFloat(freeMB.value) > 0
  if (hasBundle && remainingSeconds.value <= 300) {
    alertMsg.value = 'Bundle yako inaisha hivi karibuni! Nunua vocha au tazama matangazo kupata free internet.'
    alertType.value = 'warn'
    if (!lowBundleNotified) {
      lowBundleNotified = true
      sendNotification('HotBando', 'Bundle yako inaisha hivi karibuni. Nunua vocha au tazama matangazo.')
    }
  } else if (!hasBundle && !hasFree) {
    alertMsg.value = 'Huna data. Nunua kifurushi au tazama matangazo kupata internet bure.'
    alertType.value = 'danger'
    lowBundleNotified = false
    connectedNotified = false
    if (!outOfBundleNotified) {
      outOfBundleNotified = true
      sendNotification('HotBando', alertMsg.value)
    }
  } else {
    alertMsg.value = hasBundle
      ? routerReady.value
        ? `Umeunganishwa kwenye HotBando. Una ${remainingTime.value} iliyobaki kwenye kifurushi chako.`
        : `Vocha yako bado inatumika. Tunathibitisha muunganisho wa router…`
      : `Kifurushi kimeisha. Bado una ${freeMB.value} MB za bure; tazama matangazo kupata data zaidi.`
    alertType.value = 'info'
    lowBundleNotified = false
    outOfBundleNotified = false
    if (routerReady.value && !connectedNotified) {
      connectedNotified = true
      if (hasBundle) sendNotification('HotBando', `Umeunganishwa. Muda uliobaki: ${remainingTime.value}.`)
    }
  }
}

const canEnableNotifications = ref(typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default')

async function enableNotifications() {
  try {
    const permission = await Notification.requestPermission()
    canEnableNotifications.value = permission === 'default'
    if (permission === 'granted') sendNotification('HotBando', alertMsg.value)
  } catch (e) { /* notifications may be unavailable in captive browsers */ }
}

function sendNotification(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo.png' })
    }
  } catch (e) { /* ignore */ }
}

async function loadData() {
  try {
    const r = await hotspotGet('/dashboard', { params: { t: Date.now() } })
    if (r.redirect) { router.push('/hotspot/login'); return }
    user.value = r.user || null
    remainingSeconds.value = Number(r.remainingSeconds) || 0
    remainingTime.value = r.remainingTime || '—'
    freeMB.value = r.freeMB ?? 0
    adsRemaining.value = r.adsRemaining || 0
    adsWatchedToday.value = r.adsWatchedToday || 0
    const currentMac = normalizeMac(store.mac)
    routerReady.value = !!currentMac && currentMac === normalizeMac(store.user?.mac_address) && String(store.routerID) === String(store.user?.last_router_id || '')
    connected.value = (!!r.isActive || Number(r.user?.free_bytes) > 0) && routerReady.value
    checkAlert()
  } catch (e) {
    if (e.response?.status === 401) router.push('/hotspot/login')
  }
}

async function loadUsage() {
  try {
    const r = await hotspotGet('/usage')
    freeMB.value = r.freeMB ?? freeMB.value
    remainingTime.value = r.remainingTime || remainingTime.value
    remainingSeconds.value = r.remainingSeconds || 0
    checkAlert()
  } catch (e) { /* ignore polling errors */ }
}

function normalizeMac(value) {
  return String(value || '').replace(/[^a-f\d]/gi, '').toLowerCase()
}

async function ensureRouterAccess() {
  if (autoConnectAttempted || !store.onWifi || !store.routerID || !store.user) return
  if (remainingSeconds.value <= 0 && Number(freeMB.value) <= 0) return
  const currentMac = normalizeMac(store.mac)
  const sameMac = !!currentMac && currentMac === normalizeMac(store.user.mac_address)
  const sameRouter = String(store.routerID) === String(store.user.last_router_id || '')
  if (sameMac && sameRouter) return

  autoConnectAttempted = true
  connMsg.value = 'Inaunganisha kifaa chako kwenye router hii…'
  try {
    const result = await hotspotPost('/connect')
    connError.value = !result.success
    connMsg.value = result.message || (result.success ? 'Umeunganishwa kwenye router hii.' : 'Imeshindikana kuunganisha kwenye router hii.')
    if (result.success) {
      store.mac = result.mac || store.mac
      store.routerID = result.routerID || store.routerID
      routerReady.value = true
      connected.value = true
      store.user = { ...store.user, mac_address: store.mac || store.user.mac_address, last_router_id: store.routerID }
      checkAlert()
      await loadData()
    }
  } catch (e) {
    connError.value = true
    connMsg.value = 'Imeshindikana kuunganisha kwenye router hii. Jaribu Connect tena.'
  }
}

onMounted(async () => {
  await loadData()
  // Do this in the background: render the account and bundle immediately,
  // then bind the current station to a newly joined registered router.
  ensureRouterAccess()
  countdownTimer = setInterval(() => {
    if (remainingSeconds.value > 0) remainingSeconds.value = Math.max(0, remainingSeconds.value - 1)
    const days = Math.floor(remainingSeconds.value / 86400)
    const hours = Math.floor((remainingSeconds.value % 86400) / 3600)
    const minutes = Math.floor((remainingSeconds.value % 3600) / 60)
    remainingTime.value = remainingSeconds.value <= 0 ? 'Hakuna muda uliobaki' : days ? `${days} siku ${hours} masaa` : hours ? `${hours} masaa ${minutes} dakika` : minutes ? `${minutes} dakika` : 'Chini ya dakika moja'
    checkAlert()
  }, 1000)
  pollTimer = setInterval(loadUsage, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (countdownTimer) clearInterval(countdownTimer)
})

async function toggleConnection() {
  connMsg.value = ''
  try {
    const endpoint = connected.value ? '/disconnect' : '/connect'
    const r = await hotspotPost(endpoint)
    connected.value = !!r.success
    routerReady.value = !!r.success
    if (r.success) {
      store.mac = r.mac || store.mac
      store.routerID = r.routerID || store.routerID
      if (store.user) store.user = { ...store.user, mac_address: store.mac || store.user.mac_address, last_router_id: store.routerID }
    }
    connMsg.value = r.message || ''
    connError.value = !r.success
    if (r.success) loadData()
  } catch (e) {
    connError.value = true
    connMsg.value = 'Imeshindikana. Tafadhali jaribu tena.'
  }
}
</script>
