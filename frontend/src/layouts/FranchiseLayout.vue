<template>
  <DashboardLayout
    title="Franchise Portal"
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
  { path: '/franchise/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { path: '/franchise/locations', label: 'My Locations', icon: 'fas fa-map-marker-alt' },
  { path: '/franchise/revenue', label: 'Revenue', icon: 'fas fa-coins' },
]

const pageTitle = computed(() => {
  const map = {
    'franchise-dashboard': 'Dashboard',
    'franchise-locations': 'My Locations',
    'franchise-revenue': 'Revenue'
  }
  return map[route.name] || 'Franchise'
})

function logout() {
  auth.logout().then(() => window.location.href = '/login')
}

onMounted(async () => {
  if (!(await auth.checkSession())) window.location.href = '/login'
})
</script>
