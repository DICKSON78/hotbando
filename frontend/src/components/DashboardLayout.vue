<template>
  <div class="flex h-screen overflow-hidden" style="background: #0a0a0f">
    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-black/60 lg:hidden"
      @click="sidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside
      class="fixed top-0 left-0 z-50 h-full w-[272px] flex flex-col transition-transform duration-300 lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      style="background: linear-gradient(180deg, #111118 0%, #0d0d14 100%)"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-bold" style="background: linear-gradient(135deg, #FF7A30, #ea6a24)">
          <i class="fas fa-wifi text-sm"></i>
        </div>
        <div>
          <p class="text-white font-bold text-sm tracking-wide">HOTBANDO</p>
          <p class="text-orange-300/60 text-[11px]">{{ title }}</p>
        </div>
        <button @click="sidebarOpen = false" class="ml-auto lg:hidden text-white/50 hover:text-white">
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <template v-for="group in navGroups" :key="group.label">
          <p class="text-[11px] font-bold uppercase tracking-wider text-orange-400/70 px-3 pt-4 pb-2">{{ group.label }}</p>
          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
            :class="isActive(item.path)
              ? 'text-white'
              : 'text-white/50 hover:text-white hover:bg-white/5'"
            :style="isActive(item.path) ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); box-shadow: 0 2px 12px rgba(255,122,48,0.3)' : ''"
            @click="sidebarOpen = false"
          >
            <i :class="item.icon" class="w-5 text-center text-sm"></i>
            <span>{{ item.label }}</span>
          </router-link>
        </template>
      </nav>

      <!-- User bottom -->
      <div class="border-t border-white/5 p-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style="background: linear-gradient(135deg, #FF7A30, #ea6a24)">
            {{ userInitials }}
          </div>
          <div class="min-w-0">
            <p class="text-white text-sm font-medium truncate">{{ user?.name || 'User' }}</p>
            <p class="text-orange-300/50 text-[11px] truncate">{{ user?.role || '' }}</p>
          </div>
        </div>
        <button
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-white/5 text-sm transition-colors"
        >
          <i class="fas fa-sign-out-alt"></i>
          <span>Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0 lg:ml-[272px]">
      <!-- Top header -->
      <header class="h-14 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 sticky top-0 z-30" style="background: #111118; border-bottom: 1px solid #1e1e2a">
        <!-- Left: hamburger + date/time -->
        <div class="flex items-center gap-3">
          <button @click="sidebarOpen = true" class="lg:hidden text-white/60 hover:text-white">
            <i class="fas fa-bars text-lg"></i>
          </button>
          <div class="hidden sm:flex items-center gap-2 text-sm text-white/50">
            <i class="far fa-calendar-alt text-orange-400"></i>
            <span>{{ currentDate }}</span>
            <span class="text-white/20">|</span>
            <i class="far fa-clock text-orange-400"></i>
            <span>{{ currentTime }}</span>
          </div>
        </div>

        <!-- Right: notifications + user -->
        <div class="flex items-center gap-3">
          <!-- Notification bell -->
          <div class="relative">
            <button
              @click="showNotifications = !showNotifications"
              class="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              :class="showNotifications ? 'bg-orange-500/10 text-orange-400' : 'text-white/50 hover:text-white hover:bg-white/5'"
            >
              <i class="fas fa-bell text-sm"></i>
              <span v-if="unreadCount > 0" class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
            </button>
            <!-- Notification dropdown -->
            <div v-if="showNotifications" class="absolute right-0 mt-2 w-80 rounded-xl shadow-2xl z-50" style="background: #16161f; border: 1px solid #1e1e2a" @click.self="showNotifications = false">
              <div class="p-3 border-b font-semibold text-sm text-white" style="border-color: #1e1e2a">Notifications</div>
              <div class="max-h-80 overflow-y-auto">
                <div v-for="n in notifications" :key="n.id" class="px-3 py-2.5 border-b cursor-pointer transition-colors" :style="{ borderColor: '#1e1e2a', background: !n.is_read ? 'rgba(255,122,48,0.05)' : 'transparent' }" @mouseover="$event.currentTarget.style.background='rgba(255,255,255,0.03)'" @mouseleave="$event.currentTarget.style.background=!n.is_read ? 'rgba(255,122,48,0.05)' : 'transparent'">
                  <div class="flex items-start gap-2">
                    <i class="fas fa-circle mt-1.5 text-[8px]" :class="n.notification_type === 'success' ? 'text-green-500' : n.notification_type === 'error' ? 'text-red-500' : 'text-blue-500'"></i>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-white truncate">{{ n.title }}</p>
                      <p class="text-xs text-white/40 line-clamp-2">{{ n.message }}</p>
                    </div>
                  </div>
                </div>
                <div v-if="!notifications || !notifications.length" class="p-6 text-center text-sm text-white/30">No notifications</div>
              </div>
            </div>
          </div>

          <!-- User dropdown -->
          <div class="relative">
            <button
              @click="showUserMenu = !showUserMenu"
              class="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background: linear-gradient(135deg, #FF7A30, #ea6a24)">
                {{ userInitials }}
              </div>
              <span class="hidden sm:block text-sm font-medium text-white/70">{{ user?.name || 'User' }}</span>
              <i class="fas fa-chevron-down text-[10px] text-white/30"></i>
            </button>
            <div v-if="showUserMenu" class="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl z-50 py-1" style="background: #16161f; border: 1px solid #1e1e2a">
              <div class="px-4 py-3 border-b" style="border-color: #1e1e2a">
                <p class="text-sm font-semibold text-white">{{ user?.name || 'User' }}</p>
                <p class="text-xs text-white/40">{{ user?.email || '' }}</p>
              </div>
              <button @click="handleLogout" class="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors">
                <i class="fas fa-sign-out-alt"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto">
        <div class="px-4 lg:px-6 py-6 animate-pageEnter">
          <!-- Page header -->
          <div v-if="subtitle" class="mb-6">
            <h1 class="text-xl font-bold text-white">{{ subtitle }}</h1>
          </div>
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  title: { type: String, default: 'Panel' },
  subtitle: { type: String, default: '' },
  navItems: { type: Array, default: () => [] },
  user: { type: Object, default: () => ({}) },
  onLogout: { type: Function, default: () => {} },
  notifications: { type: Array, default: () => [] },
  unreadCount: { type: Number, default: 0 }
})

const route = useRoute()
const sidebarOpen = ref(false)
const showNotifications = ref(false)
const showUserMenu = ref(false)
const currentDate = ref('')
const currentTime = ref('')

const userInitials = computed(() => {
  const name = props.user?.name || props.user?.email || 'U'
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
})

const navGroups = computed(() => {
  const groups = []
  let current = { label: '', items: [] }
  for (const item of props.navItems) {
    if (item.divider) {
      if (current.items.length) groups.push(current)
      current = { label: item.divider, items: [] }
    } else {
      current.items.push(item)
    }
  }
  if (current.items.length) groups.push(current)
  return groups
})

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

function handleLogout() {
  showUserMenu.value = false
  props.onLogout()
}

let timer
function updateClock() {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  currentTime.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

onMounted(() => {
  updateClock()
  timer = setInterval(updateClock, 30000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

watch(route, () => {
  showNotifications.value = false
  showUserMenu.value = false
})
</script>
