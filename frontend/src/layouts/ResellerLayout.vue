<template>
  <DashboardLayout
    title="Reseller Portal"
    :subtitle="pageTitle"
    :navItems="navItems"
    :user="auth.user"
    :onLogout="logout"
    :notifications="notifications"
    :unreadCount="unread"
  >
    <router-view />
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { apiGet } from '../api/client'
import DashboardLayout from '../components/DashboardLayout.vue'

const route = useRoute()
const auth = useAuthStore()

const notifications = ref([])
const unread = ref(0)

const navItems = [
  { path: '/reseller/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { path: '/reseller/vouchers', label: 'Vouchers', icon: 'fas fa-ticket-alt' },
  { path: '/reseller/withdraw', label: 'Withdraw', icon: 'fas fa-money-bill-wave' },
  { path: '/reseller/topup', label: 'Top Up', icon: 'fas fa-plus-circle' },
]

const pageTitle = computed(() => {
  const map = {
    'reseller-dashboard': 'Dashboard',
    'reseller-vouchers': 'Vouchers',
    'reseller-withdraw': 'Withdraw',
    'reseller-topup': 'Top Up',
  }
  return map[route.name] || 'Reseller'
})

let pollTimer
function startPolling() { pollTimer = setInterval(fetchNotifications, 15000) }
function stopPolling() { if (pollTimer) clearInterval(pollTimer) }

async function fetchNotifications() {
  try {
    const r = await apiGet('/reseller/notifications')
    notifications.value = r.data || []
    unread.value = r.unread || 0
  } catch {}
}

function logout() {
  auth.logout().then(() => window.location.href = '/')
}

onMounted(async () => {
  if (!(await auth.checkSession())) { window.location.href = '/login'; return }
  fetchNotifications()
  startPolling()
})
onUnmounted(() => stopPolling())
</script>
