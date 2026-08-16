<template>
  <div>
    <section class="pt-28 pb-10 relative overflow-hidden" style="background: linear-gradient(135deg, #FF7A30 0%, #ea6a24 100%);">
      <div class="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="hex-b" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
            <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
            <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#hex-b)"/>
        </svg>
      </div>
      <div class="max-w-[1440px] mx-auto px-6 relative z-10">
        <span class="text-xs font-semibold text-yellow-300 uppercase tracking-widest">Bank Partner Portal</span>
        <h1 class="text-3xl font-bold text-white mt-1">{{ pageTitle }}</h1>
        <p class="text-white/70 text-sm mt-1" v-if="$route.name === 'bank-dashboard'">Overview of your campaigns and leads.</p>
        <p class="text-white/70 text-sm mt-1" v-else-if="$route.name === 'bank-campaigns'">Manage your lead generation campaigns.</p>
        <p class="text-white/70 text-sm mt-1" v-else-if="$route.name === 'bank-campaigns-create'">Create a new campaign.</p>
        <p class="text-white/70 text-sm mt-1" v-else>View and manage your leads.</p>
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
  { path: '/bank/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { path: '/bank/campaigns', label: 'Campaigns', icon: 'fas fa-ad' },
  { path: '/bank/leads', label: 'Leads', icon: 'fas fa-users' },
]

const pageTitle = computed(() => {
  const map = { 'bank-dashboard': 'Dashboard', 'bank-campaigns': 'Campaigns', 'bank-campaigns-create': 'New Campaign', 'bank-leads': 'Leads' }
  return map[route.name] || 'Bank Partner'
})

function logout() { store.logout().then(() => window.location.href = '/') }
onMounted(async () => { if (!(await store.checkSession())) window.location.href = '/' })
</script>
