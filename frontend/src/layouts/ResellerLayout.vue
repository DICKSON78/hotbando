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
  { path: '/reseller/settings', label: 'Settings', icon: 'fas fa-cog' },
]

const pageTitle = computed(() => {
  const map = {
    'reseller-dashboard': 'Dashboard',
    'reseller-vouchers': 'Vouchers',
    'reseller-withdraw': 'Withdraw',
    'reseller-topup': 'Top Up',
    'reseller-settings': 'Settings',
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
  auth.logout().then(() => window.location.href = '/login')
}

let deferredPrompt = null

onMounted(async () => {
  // Swap manifest for PWA installability of reseller app
  const link = document.querySelector('link[rel="manifest"]')
  if (link) link.href = '/reseller-manifest.json'
  document.title = 'HotBando Reseller'

  // Auto-prompt PWA install when available
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    // Auto prompt after a short delay
    setTimeout(() => {
      if (deferredPrompt) {
        deferredPrompt.prompt()
        deferredPrompt.userChoice.then((choice) => {
          if (choice.outcome === 'accepted') {
            console.log('Reseller PWA installed')
          }
          deferredPrompt = null
        }).catch(() => { deferredPrompt = null })
      }
    }, 1500)
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
  })

  if (!(await auth.checkSession())) { window.location.href = '/login'; return }
  fetchNotifications()
  startPolling()
})
onUnmounted(() => stopPolling())
</script>
