<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-lg mx-auto space-y-4">
      <router-link to="/hotspot/dashboard" class="text-brand-500 text-sm"><i class="fas fa-arrow-left mr-1"></i> Back</router-link>
      <h2 class="text-xl font-bold text-gray-800">Watch Ads</h2>
      <p v-if="adsRemaining !== null" class="text-sm text-gray-500">Watched today: {{ adsWatchedToday }} | Remaining: {{ adsRemaining }}</p>

      <div v-if="currentAd" class="bg-white rounded-xl p-4 shadow-sm text-center space-y-4">
        <h3 class="font-bold text-gray-800">{{ currentAd.title }}</h3>
        <p v-if="currentAd.description" class="text-sm text-gray-500">{{ currentAd.description }}</p>
        <div v-if="currentAd.video_url" class="bg-gray-900 rounded-lg overflow-hidden aspect-video">
          <video :src="currentAd.video_url" controls class="w-full h-full" @ended="completeAd" ref="videoRef"></video>
        </div>
        <img v-else-if="currentAd.image_url" :src="currentAd.image_url" class="w-full rounded-lg">
        <p class="text-sm text-brand-600 font-medium">Earn {{ (currentAd.reward_bytes / 1048576).toFixed(1) }} MB free!</p>
        <div class="flex gap-3 justify-center">
          <button @click="skipAd" class="btn btn-ghost">Skip</button>
          <button v-if="!currentAd.video_url" @click="completeAd" class="btn btn-primary">Done</button>
        </div>
      </div>

      <div v-else class="bg-white rounded-xl p-8 shadow-sm text-center">
        <i class="fas text-5xl mb-4" :class="messageError ? 'fa-info-circle text-gray-400' : 'fa-check-circle text-green-500'"></i>
        <p class="text-gray-600">{{ message || 'No ads available right now' }}</p>
        <p class="text-sm text-gray-400 mt-2">Come back later for more free data</p>
      </div>

      <p v-if="message && currentAd" class="text-sm text-center" :class="messageError ? 'text-red-500' : 'text-green-500'">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { hotspotGet, hotspotPost } from '../../api/client'

const currentAd = ref(null)
const videoRef = ref(null)
const adsWatchedToday = ref(0)
const adsRemaining = ref(0)
const message = ref('')
const messageError = ref(false)

onMounted(async () => { try { await fetchAd() } catch {} })

async function fetchAd() {
  try {
    const r = await hotspotGet('/get-ad')
    if (r.success) {
      currentAd.value = r.ad || null
      adsWatchedToday.value = r.adsWatchedToday || 0
      adsRemaining.value = r.adsRemaining || 0
      message.value = ''
    } else {
      currentAd.value = null
      message.value = r.message || 'No ads available right now'
      messageError.value = true
      adsWatchedToday.value = r.adsWatchedToday || 0
      adsRemaining.value = r.adsRemaining || 0
    }
  } catch {
    currentAd.value = null
    message.value = 'Imeshindikana kupata tangazo.'
    messageError.value = true
  }
}

async function completeAd() {
  if (!currentAd.value) return
  const watched = videoRef.value?.currentTime || 0
  try {
    const r = await hotspotPost('/complete-ad', { ad_id: currentAd.value.id, watched_duration: Math.round(watched) })
    if (r.success) {
      message.value = `Umepata ${r.addedMB || 0} MB!`
      messageError.value = false
      adsWatchedToday.value = r.adsWatchedToday || 0
      adsRemaining.value = r.adsRemaining || 0
      if (r.adsRemaining > 0) await fetchAd()
      else { currentAd.value = null; message.value = 'Umemaliza matangazo ya leo. Kesho tena!' }
    } else {
      currentAd.value = null
      message.value = r.message || 'Imeshindikana kukamilisha tangazo.'
      messageError.value = true
    }
  } catch (e) {
    message.value = e.response?.data?.error || 'Imeshindikana kukamilisha tangazo.'
    messageError.value = true
  }
}

function skipAd() { fetchAd() }
</script>
