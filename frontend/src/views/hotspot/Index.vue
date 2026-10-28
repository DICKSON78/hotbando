<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style="background: #0a0a0f">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.07]">
        <defs>
          <pattern id="honeycomb-spot" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
            <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
            <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#honeycomb-spot)"/>
      </svg>
      <svg width="100%" height="100%" viewBox="0 0 400 400" class="absolute inset-0" preserveAspectRatio="none">
        <path d="M0 300 Q 50 280 100 320 T 200 300 T 300 340 T 400 310 L 400 400 L 0 400Z" fill="rgba(255,122,48,0.04)"/>
        <circle cx="50" cy="50" r="8" fill="rgba(255,122,48,0.06)"/>
        <circle cx="350" cy="80" r="12" fill="rgba(255,122,48,0.05)"/>
        <circle cx="180" cy="120" r="6" fill="rgba(255,122,48,0.07)"/>
        <circle cx="80" cy="240" r="10" fill="rgba(255,122,48,0.05)"/>
      </svg>
    </div>
    <div class="w-full max-w-[380px] text-center relative z-10">
      <img src="/logo.png" class="h-20 mx-auto mb-3" alt="HotBando">
      <h1 class="ig-wordmark text-4xl mb-1">HotBando</h1>
      <p class="text-white/50 mb-6">Free WiFi for Everyone</p>

      <!-- NOT on WiFi — show connection instruction -->
      <div v-if="store.initialized && !store.onWifi" class="space-y-4">
        <div class="rounded-2xl shadow-2xl p-6 text-center" style="background: #111118; border: 1px solid #1e1e2a">
          <div class="w-16 h-16 rounded-full bg-[#FF7A30]/10 flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-wifi text-2xl text-[#FF7A30]"></i>
          </div>
          <h2 class="text-lg font-bold text-white mb-2">Connect to HotBando WiFi</h2>
          <p class="text-sm text-white/60 mb-4">
            To access free internet, connect to a HotBando WiFi hotspot first.
          </p>
          <div class="bg-[#0a0a0f] rounded-xl p-4 text-left space-y-3 border border-[#1e1e2a]">
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
          <router-link to="/hotspot/dashboard" class="w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-[#FF7A30]/20 flex items-center justify-center">Continue to Dashboard</router-link>
        </div>
        <div v-else class="space-y-3">
          <router-link to="/hotspot/login" class="w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-[#FF7A30]/20 flex items-center justify-center">Log in</router-link>
          <div class="rounded-xl p-4 text-sm" style="background: #111118; border: 1px solid #1e1e2a">
            <span class="text-white/50">Don't have an account?</span>
            <router-link to="/hotspot/signup" class="text-[#FF7A30] font-semibold hover:underline"> Register</router-link>
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
// HotspotLayout initializes the session (including the captive-portal query).
</script>
