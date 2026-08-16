<template>
  <div v-if="!store.initialized" class="min-h-screen bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
    <div class="text-white text-center">
      <img src="/logo.png" class="h-16 mx-auto mb-4 opacity-90" alt="HotBando">
      <div class="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
    </div>
  </div>
  <router-view v-else />
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHotspotStore } from '../stores/hotspot'

const route = useRoute()
const router = useRouter()
const store = useHotspotStore()

const publicRoutes = ['hotspot-index', 'hotspot-login', 'hotspot-signup']
const authRoutes = ['hotspot-dashboard', 'hotspot-subscribe', 'hotspot-ads']

onMounted(async () => {
  await store.init(route.query)
  if (store.isLoggedIn && (route.name === 'hotspot-index' || route.name === 'hotspot-login' || route.name === 'hotspot-signup')) {
    router.replace('/hotspot/dashboard')
  } else if (!store.isLoggedIn && route.name && authRoutes.includes(route.name)) {
    router.replace('/hotspot/login')
  }
})
</script>
