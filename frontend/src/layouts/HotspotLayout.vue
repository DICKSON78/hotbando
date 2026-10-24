<template>
  <div v-if="!store.initialized" class="min-h-screen bg-[#fafafa] flex items-center justify-center">
    <div class="text-center">
      <img src="/logo.png" class="h-14 mx-auto mb-4" alt="HotBando">
      <div class="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto"></div>
    </div>
  </div>

  <div v-else-if="isPublic" class="min-h-screen bg-[#fafafa]">
    <router-view />
  </div>

  <div v-else class="min-h-screen bg-[#fafafa]">
    <div class="ig-app">
      <main class="ig-main">
        <router-view />
      </main>

      <nav class="ig-nav">
        <router-link to="/hotspot/dashboard" class="ig-nav-item" :class="{ active: route.name === 'hotspot-dashboard' }">
          <i class="fa-solid fa-house"></i><span>Home</span>
        </router-link>
        <router-link to="/hotspot/subscribe" class="ig-nav-item" :class="{ active: route.name === 'hotspot-subscribe' }">
          <i class="fa-solid fa-store"></i><span>Package</span>
        </router-link>
        <router-link to="/hotspot/ads" class="ig-nav-item" :class="{ active: route.name === 'hotspot-ads' }">
          <i class="fa-solid fa-circle-play"></i><span>Ads</span>
        </router-link>
        <button class="ig-nav-item" @click="logout">
          <i class="fa-solid fa-power-off"></i><span>Logout</span>
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHotspotStore } from '../stores/hotspot'

const route = useRoute()
const router = useRouter()
const store = useHotspotStore()

const publicRoutes = ['hotspot-index', 'hotspot-login', 'hotspot-signup']
const authRoutes = ['hotspot-dashboard', 'hotspot-subscribe', 'hotspot-ads']
const isPublic = computed(() => publicRoutes.includes(route.name))

// Force a fresh load when the browser restores this page from bfcache
// (e.g. pressing Back after logout), so the session is revalidated.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload()
})

onMounted(async () => {
  await store.init(route.query)
  if (store.isLoggedIn && publicRoutes.includes(route.name)) {
    router.replace('/hotspot/dashboard')
  } else if (!store.isLoggedIn && route.name && authRoutes.includes(route.name)) {
    router.replace('/hotspot/login')
  }
})

async function logout() {
  await store.logout()
  router.replace('/hotspot')
}
</script>
