<template>
  <div class="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-[380px] text-center">
      <img src="/logo.png" class="h-20 mx-auto mb-3" alt="HotBando">
      <h1 class="ig-wordmark text-4xl mb-1">HotBando</h1>
      <p class="text-white/50 mb-6">Free WiFi for Everyone</p>

      <!-- NOT on WiFi — show connection instruction -->
      <div v-if="store.initialized && !store.onWifi" class="space-y-4">
        <div class="bg-[#111118] border border-[#FF7A30]/30 rounded-2xl p-6 text-center">
          <div class="w-16 h-16 rounded-full bg-[#FF7A30]/10 flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-wifi text-2xl text-[#FF7A30]"></i>
          </div>
          <h2 class="text-lg font-bold text-white mb-2">Connect to HotBando WiFi</h2>
          <p class="text-sm text-white/60 mb-4">
            To access free internet, connect to a HotBando WiFi hotspot first.
          </p>
          <div class="bg-[#0a0a0f] rounded-xl p-4 text-left space-y-3">
            <div class="flex items-start gap-3">
              <span class="text-[#FF7A30] font-bold text-sm">1.</span>
              <p class="text-sm text-white/70">Open your WiFi settings and connect to <b class="text-white">HotBando WiFi</b></p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-[#FF7A30] font-bold text-sm">2.</span>
              <p class="text-sm text-white/70">Open your browser — you'll be redirected here automatically</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-[#FF7A30] font-bold text-sm">3.</span>
              <p class="text-sm text-white/70">Log in or register, then buy a package or watch ads for free data</p>
            </div>
          </div>
        </div>
        <p class="text-xs text-white/30">Access from outside the network is limited</p>
      </div>

      <!-- ON WiFi — show normal landing -->
      <div v-else-if="store.initialized">
        <p v-if="store.ssidshow" class="text-white/50 mb-8 text-sm">
          Connected to <b>{{ store.ssidshow }}</b>
        </p>
        <div v-if="store.isLoggedIn" class="space-y-3">
          <router-link to="/hotspot/dashboard" class="ig-btn ig-btn-primary w-full py-2.5">Continue to Dashboard</router-link>
        </div>
        <div v-else class="space-y-3">
          <router-link to="/hotspot/login" class="ig-btn ig-btn-primary w-full py-2.5">Log in</router-link>
          <div class="ig-card rounded-xl p-4 text-sm">
            <span class="text-white/50">Don't have an account?</span>
            <router-link to="/hotspot/signup" class="text-[#FF7A30] font-semibold"> Register</router-link>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-else class="text-center py-8">
        <i class="fas fa-spinner fa-spin text-2xl text-[#FF7A30]"></i>
        <p class="text-sm text-white/40 mt-3">Connecting...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useHotspotStore } from '../../stores/hotspot'

const store = useHotspotStore()
store.init()
</script>
