<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-4">
            <router-link to="/reseller/dashboard" class="flex items-center gap-2">
              <img src="/logo.png" class="h-8" alt="HotBando">
              <span class="font-bold text-gray-800 hidden sm:inline">Reseller Portal</span>
            </router-link>
          </div>
          <div class="flex items-center gap-2 sm:gap-4">
            <router-link to="/reseller/dashboard" class="nav-link" :class="{ active: $route.path === '/reseller/dashboard' }">
              <i class="fas fa-chart-pie"></i> <span class="hidden sm:inline">Dashboard</span>
            </router-link>
            <router-link to="/reseller/vouchers" class="nav-link" :class="{ active: $route.path === '/reseller/vouchers' }">
              <i class="fas fa-ticket-alt"></i> <span class="hidden sm:inline">Vouchers</span>
            </router-link>
            <router-link to="/reseller/withdraw" class="nav-link" :class="{ active: $route.path === '/reseller/withdraw' }">
              <i class="fas fa-money-bill-wave"></i> <span class="hidden sm:inline">Withdraw</span>
            </router-link>
            <router-link to="/reseller/topup" class="nav-link" :class="{ active: $route.path === '/reseller/topup' }">
              <i class="fas fa-plus-circle"></i> <span class="hidden sm:inline">Top Up</span>
            </router-link>
            <div class="relative">
              <button @click="showNots = !showNots" class="nav-link relative">
                <i class="fas fa-bell"></i>
                <span v-if="unread > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{{ unread > 9 ? '9+' : unread }}</span>
              </button>
              <div v-if="showNots" class="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border z-50" @click.self="showNots = false">
                <div class="p-3 border-b font-semibold text-sm text-gray-800">Notifications</div>
                <div class="max-h-80 overflow-y-auto">
                  <div v-for="n in notifications" :key="n.id" class="px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer" @click="markRead(n)" :class="{ 'bg-blue-50': !n.is_read }">
                    <div class="flex items-start gap-2">
                      <i class="fas fa-circle mt-1.5 text-[8px]" :class="n.notification_type === 'success' ? 'text-green-500' : n.notification_type === 'error' ? 'text-red-500' : 'text-blue-500'"></i>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-800 truncate">{{ n.title }}</p>
                        <p class="text-xs text-gray-500 line-clamp-2">{{ n.message }}</p>
                        <p class="text-[10px] text-gray-400 mt-1">{{ new Date(n.created_at).toLocaleDateString() }}</p>
                      </div>
                    </div>
                  </div>
                  <div v-if="notifications.length === 0" class="p-6 text-center text-sm text-gray-400">Hakuna notifications</div>
                </div>
              </div>
            </div>
            <button @click="logout" class="nav-link text-red-500 hover:text-red-700">
              <i class="fas fa-sign-out-alt"></i> <span class="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
    <main class="max-w-7xl mx-auto px-4 py-6">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/client'
import { resellerGet, resellerPut } from '../api/reseller'

const router = useRouter()
const showNots = ref(false)
const notifications = ref([])
const unread = ref(0)

onMounted(() => { fetchNotifications(); startPolling() })
onUnmounted(() => stopPolling())

let pollTimer
function startPolling() { pollTimer = setInterval(fetchNotifications, 15000) }
function stopPolling() { if (pollTimer) clearInterval(pollTimer) }

async function fetchNotifications() {
  try {
    const r = await resellerGet('/notifications')
    notifications.value = r.data || []
    unread.value = r.unread || 0
  } catch {}
}
async function markRead(n) {
  if (!n.is_read) {
    try { await resellerPut(`/notifications/${n.id}/read`); n.is_read = 1; unread.value = Math.max(0, unread.value - 1) } catch {}
  }
}

async function logout() {
  try { await api.get('/logout') } catch {}
  router.push('/login')
}
</script>

<style scoped>
.nav-link {
  @apply px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand-500 rounded-lg transition-colors;
}
.nav-link.active {
  @apply text-brand-500 bg-brand-50;
}
</style>