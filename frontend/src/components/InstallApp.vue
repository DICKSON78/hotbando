<template>
  <div v-if="!isStandalone" class="mx-4 mt-3 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-4">
    <div class="flex items-center gap-3">
      <div class="tile-icon" style="background:rgba(255,122,48,0.1);color:#FF7A30"><i class="fa-solid fa-mobile-screen"></i></div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-white">Install HotBando App</p>
        <p class="text-xs text-white/50">Fungua kama app kila unapo-join WiFi</p>
      </div>
    </div>
    <button v-if="canInstall" @click="install" class="ig-btn ig-btn-primary w-full mt-3">
      <i class="fa-solid fa-download mr-2"></i>Install App
    </button>
    <div v-else class="text-xs text-white/50 mt-3 leading-relaxed">
      <p v-if="isIos">iPhone: gusa <b class="text-white">Share</b> → <b class="text-white">Add to Home Screen</b>.</p>
      <p v-else>Browser menu <b class="text-white">⋮</b> → <b class="text-white">Add to Home screen</b> / <b class="text-white">Install app</b>. Kisha fungua HotBando kama app.</p>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canInstall = ref(false)
const isStandalone = ref(false)
const isIos = ref(false)
let deferredPrompt = null

function onPrompt(e) {
  e.preventDefault()
  deferredPrompt = e
  canInstall.value = true
}

async function install() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  await deferredPrompt.userChoice.catch(() => {})
  deferredPrompt = null
  canInstall.value = false
}

onMounted(() => {
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  isIos.value = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  window.addEventListener('beforeinstallprompt', onPrompt)
})
onUnmounted(() => window.removeEventListener('beforeinstallprompt', onPrompt))
</script>
