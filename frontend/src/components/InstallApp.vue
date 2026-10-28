<template>
  <div v-if="!isStandalone" class="mx-4 mt-3 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-4">
    <div class="flex items-center gap-3">
      <div class="tile-icon" style="background:rgba(255,122,48,0.1);color:#FF7A30"><i class="fa-solid fa-mobile-screen"></i></div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-white">Install HotBando App</p>
        <p class="text-xs text-white/50">Fungua kama app kila unapo-join WiFi</p>
      </div>
    </div>
    <button v-if="canInstall" @click="install" :disabled="installing" class="ig-btn ig-btn-primary w-full mt-3 disabled:opacity-60">
      <i class="fa-solid fa-download mr-2"></i>{{ installing ? 'Inasakinisha...' : 'Install App' }}
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
const installing = ref(false)
const isStandalone = ref(false)
const isIos = ref(false)
const isAndroid = ref(false)
let deferredPrompt = null

function usePrompt(prompt) {
  if (!prompt || typeof prompt.prompt !== 'function') return false
  deferredPrompt = prompt
  canInstall.value = true
  return true
}

function onPrompt(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault()
  const prompt = e && typeof e.prompt === 'function' ? e : window.deferredPrompt
  usePrompt(prompt)
  // Auto-prompt shortly after capture
  setTimeout(() => {
    if (canInstall.value && deferredPrompt && !isStandalone.value) install()
  }, 2000)
}

async function install() {
  const prompt = deferredPrompt || window.deferredPrompt
  if (!prompt || typeof prompt.prompt !== 'function') {
    canInstall.value = false
    if (isAndroid.value) openInChrome()
    return
  }

  installing.value = true
  try {
    await prompt.prompt()
    const choice = await Promise.race([
      prompt.userChoice.catch(() => null),
      new Promise((resolve) => setTimeout(() => resolve(null), 20000))
    ])
    if (choice && choice.outcome === 'accepted') {
      canInstall.value = false
    }
  } catch {
    canInstall.value = false
    if (isAndroid.value) openInChrome()
  } finally {
    installing.value = false
    deferredPrompt = null
    window.deferredPrompt = null
  }
}

function onInstalled() {
  isStandalone.value = true
  canInstall.value = false
  deferredPrompt = null
  window.deferredPrompt = null
}

function openInChrome() {
  const scheme = window.location.protocol === 'http:' ? 'http' : 'https'
  const target = `${window.location.protocol}//${window.location.host}${window.location.pathname}${window.location.search}`
  const path = `${window.location.host}${window.location.pathname}${window.location.search}`
  window.location.href = `intent://${path}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(target)};end`
}

onMounted(() => {
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  isIos.value = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  isAndroid.value = /android/i.test(window.navigator.userAgent)

  // Prompt may have been captured in index.html before Vue mounted.
  if (window.isSecureContext) usePrompt(window.deferredPrompt)

  window.addEventListener('beforeinstallprompt', onPrompt)
  window.addEventListener('appinstallavailable', onPrompt)
  window.addEventListener('appinstalled', onInstalled)

  // Auto-prompt install when available (helps non-technical users)
  const tryAuto = () => {
    if (canInstall.value && !isStandalone.value) {
      setTimeout(() => {
        if (canInstall.value && deferredPrompt) install()
      }, 2000)
    }
  }
  // trigger after a short delay in case prompt was already captured
  setTimeout(tryAuto, 2500)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onPrompt)
  window.removeEventListener('appinstallavailable', onPrompt)
  window.removeEventListener('appinstalled', onInstalled)
})
</script>
