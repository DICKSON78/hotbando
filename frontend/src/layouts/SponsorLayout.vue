<template>
  <DashboardLayout
    title="Sponsor Portal"
    :subtitle="pageTitle"
    :navItems="navItems"
    :user="auth.user"
    :onLogout="logout"
  >
    <router-view />
  </DashboardLayout>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout.vue'

const route = useRoute()
const auth = useAuthStore()

const navItems = [
  { path: '/sponsor/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { path: '/sponsor/campaigns', label: 'Campaigns', icon: 'fas fa-ad' },
  { path: '/sponsor/wallet', label: 'Wallet', icon: 'fas fa-wallet' },
]

const pageTitle = computed(() => {
  const map = {
    'sponsor-dashboard': 'Dashboard',
    'sponsor-campaigns': 'Campaigns',
    'sponsor-campaigns-create': 'New Campaign',
    'sponsor-wallet': 'Wallet'
  }
  return map[route.name] || 'Sponsor'
})

function logout() {
  auth.logout().then(() => window.location.href = '/login')
}

onMounted(async () => {
  if (!(await auth.checkSession())) window.location.href = '/login'
})
</script>
