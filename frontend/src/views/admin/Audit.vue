<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Audit Trail</h2>
        <p class="text-sm" style="color: #6b7280">Track all system activities and changes</p>
      </div>
      <div class="flex gap-2">
        <button @click="exportCSV()" class="btn btn-secondary btn-sm"><i class="fas fa-download"></i> Export CSV</button>
        <button @click="loadAll()" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total Actions</p>
            <p class="stat-value">{{ auditStats.total || 0 }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-database"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Actions Today</p>
            <p class="stat-value" style="color: #34d399">{{ auditStats.today || 0 }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-bolt"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Unique Users</p>
            <p class="stat-value" style="color: #FF7A30">{{ auditStats.unique_users || 0 }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(255,122,48,0.1); color: #FF7A30"><i class="fas fa-users"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Top Action</p>
            <p class="stat-value text-sm" style="color: #a78bfa">{{ topAction }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-chart-bar"></i></div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="section-card">
      <div class="flex flex-wrap items-center gap-3">
        <input v-model="filters.entity_type" @input="debounceSearch" class="form-input" placeholder="Entity type..." style="max-width: 160px">
        <select v-model="filters.action" @change="loadAudit()" class="form-input" style="max-width: 150px">
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="read">Read</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
        </select>
        <input v-model="filters.user_id" @input="debounceSearch" class="form-input" placeholder="User ID..." type="number" style="max-width: 120px">
        <input v-model="filters.date_from" @change="loadAudit()" type="date" class="form-input" style="max-width: 160px">
        <input v-model="filters.date_to" @change="loadAudit()" type="date" class="form-input" style="max-width: 160px">
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="stat-card animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-lg" style="background: #1e1e2a"></div>
          <div class="flex-1 space-y-2"><div class="h-4 w-48 rounded" style="background: #1e1e2a"></div><div class="h-3 w-28 rounded" style="background: #1e1e2a"></div></div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-history" style="color: #FF7A30"></i> Activity Log</h3>
        <span class="text-xs" style="color: #6b7280">{{ totalRecords }} records</span>
      </div>
      <div class="space-y-1">
        <div v-for="log in auditLogs" :key="log.id">
          <div @click="toggleExpand(log.id)" class="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:opacity-80" style="background: #0d0d14">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" :style="entityStyle(log.entity_type)">
              <i :class="entityIcon(log.entity_type)" class="text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm">
                <span class="font-medium text-white">{{ log.user_name || 'System' }}</span>
                <span style="color: #6b7280"> {{ actionVerb(log.action) }} </span>
                <span class="font-medium" style="color: #d1d5db">{{ log.entity_type || '—' }}</span>
                <span v-if="log.description" style="color: #6b7280"> — {{ truncate(log.description, 60) }}</span>
              </p>
              <div class="flex items-center gap-3 mt-1">
                <span class="text-xs" style="color: #6b7280">{{ formatDateTime(log.created_at) }}</span>
                <span v-if="log.ip_address" class="text-xs" style="color: #4b5563"><i class="fas fa-globe mr-0.5"></i>{{ log.ip_address }}</span>
                <span class="badge" :class="actionBadge(log.action)" style="font-size: 10px; padding: 2px 8px">{{ log.action }}</span>
              </div>
            </div>
            <i class="fas fa-chevron-down text-xs transition-transform" :style="expandedId === log.id ? 'transform: rotate(180deg); color: #FF7A30' : 'color: #6b7280'"></i>
          </div>

          <!-- Expanded diff view -->
          <div v-if="expandedId === log.id" class="ml-13 pl-14 pr-4 pb-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div class="p-3 rounded-xl" style="background: #0d0d14; border: 1px solid #1e1e2a">
                <p class="text-xs font-medium mb-2" style="color: #ef4444">Old Values</p>
                <div v-if="parseValues(log.old_values)" class="space-y-1">
                  <div v-for="(val, key) in parseValues(log.old_values)" :key="key" class="flex gap-2 text-xs">
                    <span style="color: #6b7280">{{ key }}:</span>
                    <span style="color: #d1d5db; word-break: break-all">{{ val }}</span>
                  </div>
                </div>
                <p v-else class="text-xs" style="color: #4b5563">—</p>
              </div>
              <div class="p-3 rounded-xl" style="background: #0d0d14; border: 1px solid #1e1e2a">
                <p class="text-xs font-medium mb-2" style="color: #34d399">New Values</p>
                <div v-if="parseValues(log.new_values)" class="space-y-1">
                  <div v-for="(val, key) in parseValues(log.new_values)" :key="key" class="flex gap-2 text-xs">
                    <span style="color: #6b7280">{{ key }}:</span>
                    <span style="color: #d1d5db; word-break: break-all">{{ val }}</span>
                  </div>
                </div>
                <p v-else class="text-xs" style="color: #4b5563">—</p>
              </div>
            </div>
            <div v-if="log.user_agent" class="mt-2 text-xs" style="color: #4b5563">
              <i class="fas fa-desktop mr-1"></i>{{ log.user_agent }}
            </div>
          </div>
        </div>
        <p v-if="!auditLogs.length" class="text-center py-10" style="color: #6b7280">
          <i class="fas fa-history text-3xl mb-3 block" style="color: #1e1e2a"></i>
          No audit records found
        </p>
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
import { adminGet } from '../../api/client'

const auditLogs = ref([])
const totalRecords = ref(0)
const auditStats = ref({})
const loading = ref(true)
const expandedId = ref(null)
const toast = ref(null)

const filters = ref({ entity_type: '', action: '', user_id: '', date_from: '', date_to: '' })

let searchTimeout = null

const topAction = computed(() => {
  const byAction = auditStats.value.by_action
  if (!byAction || !byAction.length) return '—'
  return byAction[0].action + ' (' + byAction[0].count + ')'
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s || '' }

function parseValues(val) {
  if (!val) return null
  try {
    const obj = typeof val === 'string' ? JSON.parse(val) : val
    if (typeof obj === 'object' && obj !== null && Object.keys(obj).length) return obj
    return null
  } catch { return null }
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function entityIcon(m) {
  const map = {
    user: 'fas fa-user', ticket: 'fas fa-headset', campaign: 'fas fa-bullhorn',
    branch: 'fas fa-map-marker-alt', product: 'fas fa-box', order: 'fas fa-shopping-cart',
    transaction: 'fas fa-dollar-sign', hr: 'fas fa-users', auth: 'fas fa-shield-alt'
  }
  return map[m] || 'fas fa-circle'
}

function entityStyle(m) {
  const map = {
    user: 'background: rgba(59,130,246,0.1); color: #60a5fa',
    ticket: 'background: rgba(255,122,48,0.1); color: #FF7A30',
    campaign: 'background: rgba(236,72,153,0.1); color: #f472b6',
    branch: 'background: rgba(20,184,166,0.1); color: #2dd4bf',
    product: 'background: rgba(139,92,246,0.1); color: #a78bfa',
    order: 'background: rgba(16,185,129,0.1); color: #34d399',
    transaction: 'background: rgba(250,204,21,0.1); color: #facc15',
    hr: 'background: rgba(59,130,246,0.1); color: #60a5fa',
    auth: 'background: rgba(250,204,21,0.1); color: #facc15'
  }
  return map[m] || 'background: rgba(107,114,128,0.1); color: #6b7280'
}

function actionVerb(a) {
  return { create: 'created', read: 'viewed', update: 'updated', delete: 'deleted', login: 'logged in', logout: 'logged out', approve: 'approved', reject: 'rejected' }[a] || a
}

function actionBadge(a) {
  return { create: 'badge-green', delete: 'badge-red', login: 'badge-blue', logout: 'badge-gray', approve: 'badge-green', reject: 'badge-red' }[a] || 'badge-yellow'
}

function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadAudit(), 300)
}

async function loadAudit() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.value.entity_type) params.set('module', filters.value.entity_type)
    if (filters.value.action) params.set('action', filters.value.action)
    if (filters.value.user_id) params.set('user_id', filters.value.user_id)
    if (filters.value.date_from) params.set('date_from', filters.value.date_from)
    if (filters.value.date_to) params.set('date_to', filters.value.date_to)
    const data = await adminGet('/hq/audit-trail?' + params.toString())
    auditLogs.value = data.records || []
    totalRecords.value = data.total || 0
  } catch (e) {
    console.error(e)
    showToast('Failed to load audit trail', 'error')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const data = await adminGet('/hq/audit-trail?stats=true')
    auditStats.value = data.stats || {}
  } catch (e) {
    console.error(e)
  }
}

function exportCSV() {
  if (!auditLogs.value.length) return showToast('No data to export', 'error')
  const headers = ['Timestamp', 'User', 'Entity Type', 'Action', 'Entity ID', 'Description', 'IP']
  const rows = auditLogs.value.map(l => [
    formatDateTime(l.created_at), l.user_name || '', l.entity_type || '', l.action || '',
    l.entity_id || '', (l.description || '').replace(/,/g, ';'), l.ip_address || ''
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'audit-trail.csv'; a.click()
  URL.revokeObjectURL(url)
  showToast('CSV exported')
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.allSettled([loadAudit(), loadStats()])
  } finally {
    loading.value = false
  }
}

onMounted(() => loadAll())
</script>
