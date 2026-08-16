<template>
  <div>
    <section class="pt-28 pb-10 relative overflow-hidden" style="background: linear-gradient(135deg, #FF7A30 0%, #ea6a24 100%);">
      <div class="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="hex-f" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
            <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
            <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#hex-f)"/>
        </svg>
      </div>
      <div class="max-w-[1440px] mx-auto px-6 relative z-10">
        <span class="text-xs font-semibold text-yellow-300 uppercase tracking-widest">Franchise Portal</span>
        <h1 class="text-3xl font-bold text-white mt-1">{{ pageTitle }}</h1>
        <p class="text-white/70 text-sm mt-1" v-if="$route.name === 'franchise-dashboard'">Overview of your locations and revenue.</p>
        <p class="text-white/70 text-sm mt-1" v-else-if="$route.name === 'franchise-locations'">Manage your assigned locations.</p>
        <p class="text-white/70 text-sm mt-1" v-else>Payout history and revenue reports.</p>
      </div>
    </section>
    <div class="bg-[#f5f5f7] min-h-[600px]">
      <div class="max-w-[1440px] mx-auto px-6 py-8">
        <div class="flex gap-8">
          <aside class="w-[220px] shrink-0 hidden lg:block">
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-3 pb-1.5 pt-4">Main</div>
              <router-link v-for="item in menu" :key="item.path" :to="item.path"
                class="side-link" :class="$route.path === item.path ? 'active' : ''">
                <i :class="item.icon"></i> {{ item.label }}
              </router-link>
              <div class="sep my-4"></div>
              <button @click="logout" class="side-link w-full text-left text-red-600 hover:bg-red-50">
                <i class="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </aside>
          <div class="flex-1 min-w-0">
            <router-view />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePartnerStore } from '../stores/partner'

const route = useRoute()
const router = useRouter()
const store = usePartnerStore()

const menu = [
  { path: '/franchise/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { path: '/franchise/locations', label: 'My Locations', icon: 'fas fa-map-marker-alt' },
  { path: '/franchise/revenue', label: 'Revenue', icon: 'fas fa-coins' },
]

const pageTitle = computed(() => {
  const map = { 'franchise-dashboard': 'Dashboard', 'franchise-locations': 'My Locations', 'franchise-revenue': 'Revenue' }
  return map[route.name] || 'Franchise'
})

function logout() { store.logout().then(() => window.location.href = '/') }
onMounted(async () => { if (!(await store.checkSession())) window.location.href = '/' })
</script>
