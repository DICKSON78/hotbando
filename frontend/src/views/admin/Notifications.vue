<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Notifications</h2>
        <p class="text-sm" style="color: #6b7280">{{ unreadCount }} unread</p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="unreadCount > 0"
          @click="markAllRead"
          class="btn btn-secondary btn-sm"
          :disabled="markingAll"
        >
          <i class="fas fa-check-double mr-1"></i> Mark All Read
        </button>
        <button @click="loadNotifications" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Filter -->
    <div class="section-card">
      <div class="section-body">
        <div class="flex gap-2">
          <button
            v-for="f in filters"
            :key="f.value"
            @click="activeFilter = f.value"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            :style="activeFilter === f.value
              ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff'
              : 'background: #0d0d14; color: #6b7280; border: 1px solid #1e1e2a'"
          >
            {{ f.label }}
            <span
              v-if="f.value === 'unread' && unreadCount > 0"
              class="ml-1.5 px-1.5 py-0.5 text-xs rounded-full"
              style="background: rgba(239,68,68,0.2); color: #f87171"
            >{{ unreadCount }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="stat-card animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl" style="background: #1e1e2a"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 w-48 rounded" style="background: #1e1e2a"></div>
            <div class="h-3 w-24 rounded" style="background: #1e1e2a"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notification List -->
    <div v-else class="section-card">
      <div class="section-body space-y-2" style="max-height: 600px; overflow-y: auto">
        <div
          v-for="n in filteredNotifications"
          :key="n.id"
          @click="markAsRead(n)"
          class="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all"
          :style="n.is_read ? 'background: #0d0d14; opacity: 0.7' : 'background: #0d0d14; border: 1px solid #1e1e2a'"
        >
          <!-- Icon -->
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            :style="iconStyle(n.type)"
          >
            <i :class="iconClass(n.type)" class="text-sm"></i>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="text-sm" :style="n.is_read ? 'color: #6b7280' : 'color: #d1d5db'">
              {{ n.message || n.text || n.title || 'Notification' }}
            </p>
            <p class="text-xs mt-1" style="color: #6b7280">
              {{ n.time || (n.created_at ? timeAgo(n.created_at) : '—') }}
            </p>
          </div>

          <!-- Unread dot -->
          <div v-if="!n.is_read" class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style="background: #FF7A30"></div>
        </div>

        <!-- Empty State -->
        <div v-if="!filteredNotifications.length && !loading" class="text-center py-12">
          <div class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style="background: #0d0d14">
            <i class="fas fa-bell-slash text-2xl" style="color: #1e1e2a"></i>
          </div>
          <p class="text-sm font-medium" style="color: #6b7280">No notifications</p>
          <p class="text-xs mt-1" style="color: #6b7280">
            {{ activeFilter === 'unread' ? 'All caught up!' : 'Nothing here yet' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slideIn" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminGet, adminPut } from '../../api/client'

const notifications = ref([])
const loading = ref(true)
const activeFilter = ref('all')
const markingAll = ref(false)
const toast = ref(null)

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' }
]

const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

const filteredNotifications = computed(() => {
  if (activeFilter.value === 'unread') return notifications.value.filter(n => !n.is_read)
  return notifications.value
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

function iconClass(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('user') || t.includes('signup') || t.includes('register')) return 'fas fa-user'
  if (t.includes('ad') || t.includes('campaign') || t.includes('sponsor')) return 'fas fa-ad'
  if (t.includes('money') || t.includes('payment') || t.includes('wallet') || t.includes('payout') || t.includes('withdrawal')) return 'fas fa-money-bill-wave'
  if (t.includes('router') || t.includes('location')) return 'fas fa-wifi'
  return 'fas fa-bell'
}

function iconStyle(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('user') || t.includes('signup') || t.includes('register')) return 'background: rgba(59,130,246,0.1); color: #60a5fa'
  if (t.includes('ad') || t.includes('campaign') || t.includes('sponsor')) return 'background: rgba(255,122,48,0.1); color: #FF7A30'
  if (t.includes('money') || t.includes('payment') || t.includes('wallet') || t.includes('payout') || t.includes('withdrawal')) return 'background: rgba(16,185,129,0.1); color: #34d399'
  if (t.includes('router') || t.includes('location')) return 'background: rgba(139,92,246,0.1); color: #a78bfa'
  return 'background: rgba(234,179,8,0.1); color: #facc15'
}

function timeAgo(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

async function loadNotifications() {
  loading.value = true
  try {
    const data = await adminGet('/notifications')
    notifications.value = data.notifications || data.data || data || []
  } catch (e) {
    console.error(e)
    showToast('Failed to load notifications', 'error')
  } finally {
    loading.value = false
  }
}

async function markAsRead(n) {
  if (n.is_read) return
  try {
    await adminPut(`/notification-read/${n.id}`)
    n.is_read = true
  } catch (e) {
    console.error(e)
  }
}

async function markAllRead() {
  markingAll.value = true
  try {
    const unread = notifications.value.filter(n => !n.is_read)
    await Promise.all(unread.map(n => adminPut(`/notification-read/${n.id}`)))
    notifications.value.forEach(n => { n.is_read = true })
    showToast('All notifications marked as read')
  } catch (e) {
    showToast('Failed to mark all as read', 'error')
  } finally {
    markingAll.value = false
  }
}

onMounted(loadNotifications)
</script>
