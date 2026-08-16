<template>
  <div class="relative min-h-screen bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center p-4 overflow-hidden">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.07]">
        <defs><pattern id="honeycomb-h" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
          <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
          <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#honeycomb-h)"/>
      </svg>
      <svg width="100%" height="100%" viewBox="0 0 400 400" class="absolute inset-0" preserveAspectRatio="none">
        <path d="M0 300Q 50 280 100 320T200 300T300 340T400 310L400 400L0 400Z" fill="rgba(255,255,255,0.04)"/>
        <path d="M0 350Q 60 320 120 360T240 340T360 380L400 360L400 400L0 400Z" fill="rgba(255,255,255,0.03)"/>
        <circle cx="50" cy="50" r="8" fill="rgba(255,255,255,0.06)"/>
        <circle cx="350" cy="80" r="12" fill="rgba(255,255,255,0.05)"/>
        <circle cx="180" cy="120" r="6" fill="rgba(255,255,255,0.07)"/>
        <circle cx="80" cy="240" r="10" fill="rgba(255,255,255,0.05)"/>
      </svg>
    </div>
    <div class="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
      <img src="/logo.png" class="h-16 mx-auto mb-4" alt="HotBando">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">HotBando</h1>
      <p class="text-gray-500 mb-6">Free WiFi for Everyone</p>
      <p class="text-gray-600 mb-6">Connected to <strong>{{ store.ssidshow || ssid || 'WiFi' }}</strong></p>
      <div v-if="store.isLoggedIn" class="flex flex-col gap-3">
        <router-link to="/hotspot/dashboard" class="btn btn-primary text-center justify-center py-3">Continue to Dashboard</router-link>
      </div>
      <div v-else class="flex flex-col gap-3">
        <router-link to="/hotspot/login" class="btn btn-primary text-center justify-center py-3">Login</router-link>
        <router-link to="/hotspot/signup" class="btn btn-outline text-center justify-center py-3">Register</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHotspotStore } from '../../stores/hotspot'

const route = useRoute()
const store = useHotspotStore()
const ssid = ref(route.query.ssid || route.query.ssidshow || '')
</script>
