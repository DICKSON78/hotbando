<template>
  <DashboardLayout
    title="Bank Partner Portal"
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
  { path: '/bank/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { path: '/bank/campaigns', label: 'Campaigns', icon: 'fas fa-ad' },
  { path: '/bank/leads', label: 'Leads', icon: 'fas fa-users' },
]

const pageTitle = computed(() => {
  const map = {
    'bank-dashboard': 'Dashboard',
    'bank-campaigns': 'Campaigns',
    'bank-campaigns-create': 'New Campaign',
    'bank-leads': 'Leads'
  }
  return map[route.name] || 'Bank Partner'
})

function logout() {
  auth.logout().then(() => window.location.href = '/')
}

onMounted(async () => {
  if (!(await auth.checkSession())) window.location.href = '/login'
})
</script>
