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
      <button v-if="isAndroid" @click="openInChrome" class="ig-btn ig-btn-outline w-full mb-2">
        <i class="fa-brands fa-chrome mr-2"></i>Fungua kwa Chrome u-Install
      </button>
      <p v-if="isIos">iPhone: gusa kitufe cha <b class="text-white">Share</b> (<i class="fa-solid fa-arrow-up-from-bracket"></i>) kisha chagua <b class="text-white">Add to Home Screen</b>.</p>
      <p v-else>Browser menu <b class="text-white">⋮</b> → <b class="text-white">Add to Home screen</b> / <b class="text-white">Install app</b>.</p>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canInstall = ref(false)
const isStandalone = ref(false)
const isIos = ref(false)
const isAndroid = ref(false)
let deferredPrompt = null

function onPrompt(e) {
  if (e) e.preventDefault()
  deferredPrompt = e || window.deferredPrompt
  canInstall.value = true
}

async function install() {
  const prompt = deferredPrompt || window.deferredPrompt
  if (prompt) {
    prompt.prompt()
    const choice = await prompt.userChoice.catch(() => {})
    if (choice && choice.outcome === 'accepted') {
      canInstall.value = false
    }
    deferredPrompt = null
    window.deferredPrompt = null
  } else if (isAndroid.value) {
    openInChrome()
  }
}

function openInChrome() {
  window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`
}

onMounted(() => {
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  isIos.value = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  isAndroid.value = /android/i.test(window.navigator.userAgent)

  if (window.deferredPrompt) {
    deferredPrompt = window.deferredPrompt
    canInstall.value = true
  }

  window.addEventListener('beforeinstallprompt', onPrompt)
  window.addEventListener('appinstallavailable', onPrompt)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onPrompt)
  window.removeEventListener('appinstallavailable', onPrompt)
})
</script>
