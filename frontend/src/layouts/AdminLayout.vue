<template>
  <div>
    <section class="pt-28 pb-10 relative overflow-hidden" style="background: linear-gradient(135deg, #FF7A30 0%, #ea6a24 100%);">
      <div class="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="hex-a" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
            <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
            <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#hex-a)"/>
        </svg>
      </div>
      <div class="max-w-[1440px] mx-auto px-6 relative z-10">
        <span class="text-xs font-semibold text-yellow-300 uppercase tracking-widest">Admin Panel</span>
        <h1 class="text-3xl font-bold text-white mt-1">{{ pageTitle }}</h1>
        <p class="text-white/70 text-sm mt-1" v-if="$route.name === 'dashboard'">System overview and key metrics.</p>
        <p class="text-white/70 text-sm mt-1" v-else-if="$route.name === 'locations'">Manage your hotspot locations.</p>
        <p class="text-white/70 text-sm mt-1" v-else-if="$route.name === 'routers'">Manage MikroTik routers.</p>
        <p class="text-white/70 text-sm mt-1" v-else-if="$route.name === 'users'">View and manage customers.</p>
        <p class="text-white/70 text-sm mt-1" v-else-if="$route.name === 'resellers'">Manage reseller accounts and wallets.</p>
        <p class="text-white/70 text-sm mt-1" v-else-if="$route.name === 'campaigns'">Manage ads and vouchers.</p>
        <p class="text-white/70 text-sm mt-1" v-else-if="$route.name === 'revenue'">Revenue reports and voucher data.</p>
        <p class="text-white/70 text-sm mt-1" v-else-if="$route.name === 'wallet'">Admin wallet and transaction history.</p>
        <p class="text-white/70 text-sm mt-1" v-else-if="$route.name === 'withdrawals'">Approve or reject withdrawal requests.</p>
        <p class="text-white/70 text-sm mt-1" v-else>System settings and integrations.</p>
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
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const menu = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { path: '/admin/locations', label: 'Locations', icon: 'fas fa-map-marker-alt' },
  { path: '/admin/routers', label: 'Routers', icon: 'fas fa-wifi' },
  { path: '/admin/users', label: 'Users', icon: 'fas fa-users' },
  { path: '/admin/resellers', label: 'Resellers', icon: 'fas fa-store' },
  { path: '/admin/withdrawals', label: 'Withdrawals', icon: 'fas fa-hand-holding-usd' },
  { path: '/admin/campaigns', label: 'Campaigns', icon: 'fas fa-ad' },
  { path: '/admin/revenue', label: 'Revenue', icon: 'fas fa-coins' },
  { path: '/admin/wallet', label: 'Wallet', icon: 'fas fa-wallet' },
  { path: '/admin/settings', label: 'Settings', icon: 'fas fa-cog' },
]

const pageTitle = computed(() => {
  const map = { 'dashboard': 'Dashboard', 'locations': 'Locations', 'routers': 'Routers', 'users': 'Users', 'resellers': 'Resellers', 'withdrawals': 'Withdrawals', 'campaigns': 'Campaigns', 'revenue': 'Revenue', 'wallet': 'Wallet', 'settings': 'Settings' }
  return map[route.name] || 'Admin'
})

function logout() { auth.logout().then(() => window.location.href = '/') }
onMounted(async () => {
  if (!(await auth.checkSession())) window.location.href = '/'
})
</script>
