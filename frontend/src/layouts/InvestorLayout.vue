<template>
  <DashboardLayout
    title="Investor Portal"
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
  { path: '/investor/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { path: '/investor/investments', label: 'Investments', icon: 'fas fa-hand-holding-usd' },
  { path: '/investor/returns', label: 'Returns', icon: 'fas fa-coins' },
  { path: '/investor/portfolio', label: 'Portfolio', icon: 'fas fa-briefcase' },
]

const pageTitle = computed(() => {
  const map = {
    'investor-dashboard': 'Dashboard',
    'investor-investments': 'Investments',
    'investor-returns': 'Returns',
    'investor-portfolio': 'Portfolio'
  }
  return map[route.name] || 'Investor'
})

function logout() {
  auth.logout().then(() => window.location.href = '/login')
}

onMounted(async () => {
  if (!(await auth.checkSession())) window.location.href = '/login'
})
</script>
