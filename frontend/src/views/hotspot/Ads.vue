<template>
  <div class="pb-4">
    <!-- Header -->
    <div class="px-4 pt-4 pb-3 flex items-center justify-between">
      <button class="ig-back" @click="selectedAd ? backToList() : router.push('/hotspot/dashboard')" aria-label="Back"><i class="fa-solid fa-chevron-left"></i></button>
      <div class="text-center flex-1">
        <p class="text-xs text-white/50">Reels</p>
        <h1 class="text-xl font-bold text-white">Watch Ads</h1>
      </div>
      <span class="w-8"></span>
    </div>

    <!-- Video player view -->
    <div v-if="selectedAd">
      <div class="mx-4 rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
        <video v-if="selectedAd.video_url" :src="selectedAd.video_url" controls autoplay class="w-full h-full" @ended="completeAd" ref="videoRef"></video>
        <img v-else-if="selectedAd.image_url" :src="selectedAd.image_url" class="w-full h-full object-cover">
      </div>

      <div class="mx-4 mt-3 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-4">
        <p class="text-base font-bold text-white">{{ selectedAd.title }}</p>

        <div class="flex items-center gap-3 mt-3">
          <div class="tile-icon" style="background:rgba(255,122,48,0.1);color:#FF7A30"><i class="fa-solid fa-bullhorn"></i></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white">HotBando Ads</p>
            <div class="flex items-center gap-1.5">
              <span class="bg-[#FF7A30]/10 text-[#FF7A30] text-[10px] font-semibold px-1.5 py-0.5 rounded">SPONSORED</span>
              <span class="text-xs text-white/50">Earn {{ rewardMB }} MB free</span>
            </div>
          </div>
          <span class="bg-[#FF7A30]/10 text-[#FF7A30] text-xs font-bold px-2.5 py-1.5 rounded-full flex-shrink-0"><i class="fa-solid fa-database"></i> +{{ rewardMB }} MB</span>
        </div>

        <div class="mt-3 pt-3 border-t border-[#1e1e2a]">
          <p class="text-sm text-white/60">{{ selectedAd.description }}</p>
          <p class="text-xs text-white/50 mt-2">Reward: {{ rewardMB }} MB free data · Duration: {{ selectedAd.duration }}s · {{ selectedAd.views_count || 0 }} views · {{ adsRemaining }} left</p>
        </div>
      </div>

      <!-- Recommended videos -->
      <p class="px-4 pt-5 pb-2 text-sm font-semibold text-white">Recommended</p>
      <div class="px-4 space-y-3">
        <div v-for="ad in recommendedAds" :key="ad.id" class="bg-[#111118] border border-[#1e1e2a] rounded-2xl p-3 flex gap-3" @click="playAd(ad)">
          <div class="relative w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#0d0d14]">
            <img v-if="ad.image_url" :src="ad.image_url" class="w-full h-full object-cover" loading="lazy">
            <video v-else-if="ad.video_url" :src="ad.video_url" class="w-full h-full object-cover" preload="metadata" muted playsinline></video>
            <div v-else class="w-full h-full flex items-center justify-center"><i class="fa-solid fa-play text-white/40"></i></div>
            <span class="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">{{ ad.duration }}s</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white">{{ ad.title }}</p>
            <span class="bg-[#FF7A30]/10 text-[#FF7A30] text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block mt-1">SPONSORED</span>
            <p class="text-xs text-white/50 mt-1">Earn {{ adMB(ad) }} MB free</p>
          </div>
        </div>
      </div>
    </div>

    <!-- List view -->
    <div v-else>
      <div class="mx-4 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-white">Ads Watched Today</p>
          <p class="text-xs text-white/50">Tazama matangazo kupata data bure</p>
        </div>
        <p class="text-2xl font-bold text-purple-500">{{ adsWatchedToday }}</p>
      </div>

      <!-- Daily limit reached: waiting timer -->
      <div v-if="adsRemaining <= 0" class="mx-4 mt-3 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-6 text-center">
        <i class="fa-solid fa-hourglass-half text-[#FF7A30] text-3xl"></i>
        <p class="text-base font-bold text-white mt-3">Umemaliza matangazo ya leo</p>
        <p class="text-xs text-white/50 mt-1">Unaweza kuendelea kutazama baada ya</p>
        <p class="text-3xl font-bold text-[#FF7A30] mt-3 tabular-nums">{{ timerText }}</p>
      </div>

      <div v-else-if="adsList.length === 0" class="mx-4 mt-3 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-8 text-center">
        <i class="fas text-5xl mb-4" :class="messageError ? 'fa-circle-info text-white/40' : 'fa-circle-check text-green-500'"></i>
        <p class="text-sm font-semibold text-white">{{ message || 'No ads available right now' }}</p>
        <p class="text-xs text-white/40 mt-1">Come back later for more free data</p>
      </div>

      <p class="px-4 pt-5 pb-2 text-sm font-semibold text-white">Today's Ads</p>
      <div class="px-4 space-y-3">
        <div v-for="ad in adsList" :key="ad.id" class="bg-[#111118] border border-[#1e1e2a] rounded-2xl p-3 flex gap-3" :class="{ 'opacity-50 pointer-events-none': adsRemaining <= 0 }" @click="playAd(ad)">
          <div class="relative w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#0d0d14]">
            <img v-if="ad.image_url" :src="ad.image_url" class="w-full h-full object-cover" loading="lazy">
            <video v-else-if="ad.video_url" :src="ad.video_url" class="w-full h-full object-cover" preload="metadata" muted playsinline></video>
            <div v-else class="w-full h-full flex items-center justify-center"><i class="fa-solid fa-play text-white/40"></i></div>
            <span class="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">{{ ad.duration }}s</span>
            <span v-if="adsRemaining <= 0" class="absolute inset-0 bg-black/60 flex items-center justify-center"><i class="fa-solid fa-lock text-white/40 text-lg"></i></span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white truncate">{{ ad.title }}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="bg-[#FF7A30]/10 text-[#FF7A30] text-[10px] font-semibold px-1.5 py-0.5 rounded">SPONSORED</span>
              <span class="text-xs text-white/50">Earn {{ adMB(ad) }} MB free</span>
            </div>
            <p class="text-xs text-white/50 mt-1 truncate">{{ ad.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <p v-if="message && selectedAd" class="text-sm mt-3 mx-4 p-3 rounded-xl" :class="messageError ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { hotspotGet, hotspotPost } from '../../api/client'

const router = useRouter()
const adsList = ref([])
const selectedAd = ref(null)
const videoRef = ref(null)
const adsWatchedToday = ref(0)
const adsRemaining = ref(0)
const message = ref('')
const messageError = ref(false)
const resetIn = ref(0)
const timerText = ref('')
let imageTimer = null
let tickTimer = null

const rewardMB = computed(() => selectedAd.value ? (selectedAd.value.reward_bytes / 1048576).toFixed(1) : 0)

const recommendedAds = computed(() =>
  adsList.value.filter(ad => !selectedAd.value || ad.id !== selectedAd.value.id)
)

function adMB(ad) {
  return (ad.reward_bytes / 1048576).toFixed(1)
}

onMounted(async () => { try { await fetchList() } catch {} })
onUnmounted(() => {
  if (imageTimer) clearTimeout(imageTimer)
  if (tickTimer) clearInterval(tickTimer)
})

function startCountdown(seconds) {
  if (tickTimer) clearInterval(tickTimer)
  resetIn.value = Math.max(0, Math.floor(seconds || 0))
  updateTimerText()
  tickTimer = setInterval(() => {
    resetIn.value = Math.max(0, resetIn.value - 1)
    updateTimerText()
    if (resetIn.value <= 0) {
      clearInterval(tickTimer)
      tickTimer = null
      fetchList()
    }
  }, 1000)
}

function updateTimerText() {
  const s = resetIn.value
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  timerText.value = `${h}:${m}:${sec}`
}

watch(selectedAd, (ad) => {
  if (imageTimer) clearTimeout(imageTimer)
  imageTimer = null
  if (ad && !ad.video_url && ad.image_url) {
    imageTimer = setTimeout(completeAd, (ad.duration || 5) * 1000)
  }
})

async function fetchList() {
  try {
    const r = await hotspotGet('/ads-list')
    if (r.success) {
      adsList.value = r.ads || []
      adsWatchedToday.value = r.adsWatchedToday || 0
      adsRemaining.value = r.adsRemaining || 0
      if (adsRemaining.value <= 0) startCountdown(r.resetIn || 0)
      else if (tickTimer) { clearInterval(tickTimer); tickTimer = null }
      message.value = ''
      messageError.value = false
    } else {
      adsList.value = []
      message.value = r.message || 'No ads available right now'
      messageError.value = true
    }
  } catch {
    adsList.value = []
    message.value = 'Imeshindikana kupata matangazo.'
    messageError.value = true
  }
}

function playAd(ad) {
  if (adsRemaining.value <= 0) return
  selectedAd.value = ad
  message.value = ''
  messageError.value = false
}

function backToList() {
  if (imageTimer) clearTimeout(imageTimer)
  imageTimer = null
  selectedAd.value = null
}

async function completeAd() {
  if (!selectedAd.value) return
  const watched = videoRef.value?.currentTime || 0
  const adId = selectedAd.value.id
  try {
    const r = await hotspotPost('/complete-ad', { ad_id: adId, watched_duration: Math.round(watched) })
    if (r.success) {
      message.value = `Umepata ${r.addedMB || 0} MB!`
      messageError.value = false
      adsWatchedToday.value = r.adsWatchedToday || 0
      adsRemaining.value = r.adsRemaining || 0
      await fetchList()
      if (imageTimer) clearTimeout(imageTimer)
      setTimeout(backToList, 1200)
    } else {
      message.value = r.message || 'Imeshindikana kukamilisha tangazo.'
      messageError.value = true
      setTimeout(backToList, 1200)
    }
  } catch (e) {
    message.value = e.response?.data?.error || 'Imeshindikana kukamilisha tangazo.'
    messageError.value = true
    setTimeout(backToList, 1200)
  }
}
</script>
