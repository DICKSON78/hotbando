<template>
  <div class="space-y-6">
    <template v-if="loading">
      <div>
        <div class="mb-6">
          <div class="h-7 w-64 rounded" style="background: #1e1e2a"></div>
          <div class="h-4 w-48 rounded mt-2" style="background: #1e1e2a"></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div v-for="i in 6" :key="i" class="stat-card animate-pulse">
            <div class="flex items-center justify-between">
              <div class="space-y-2">
                <div class="h-3 w-20 rounded" style="background: #1e1e2a"></div>
                <div class="h-7 w-16 rounded" style="background: #1e1e2a"></div>
              </div>
              <div class="w-12 h-12 rounded-xl" style="background: #1e1e2a"></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div>
        <h1 class="text-2xl font-bold text-white">National Overview</h1>
        <p class="text-sm mt-1" style="color: #6b7280">{{ today }}</p>
      </div>

      <!-- Top Stats Row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Total Revenue</p>
              <p class="stat-value text-lg">TSh {{ formatNum(financial.total_revenue) }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399">
              <i class="fas fa-coins"></i>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Net Profit</p>
              <p class="stat-value text-lg">TSh {{ formatNum(financial.net_profit) }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa">
              <i class="fas fa-chart-line"></i>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Active Branches</p>
              <p class="stat-value text-lg">{{ branches.total || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(255,122,48,0.1); color: #FF7A30">
              <i class="fas fa-building"></i>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Total Staff</p>
              <p class="stat-value text-lg">{{ staffData.total || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa">
              <i class="fas fa-users"></i>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Open Tickets</p>
              <p class="stat-value text-lg">{{ openTickets }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(250,204,21,0.1); color: #facc15">
              <i class="fas fa-ticket-alt"></i>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">SLA Breaches</p>
              <p class="stat-value text-lg">{{ slaBreachCount }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #f87171">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Branch Performance Table + Compliance Alerts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Branch Performance (2/3) -->
        <div class="lg:col-span-2 section-card">
          <div class="section-header">
            <h3 class="section-title">
              <i class="fas fa-building" style="color: #FF7A30"></i> Branch Performance
            </h3>
            <span class="badge badge-gray">{{ branches.branches?.length || 0 }} total</span>
          </div>
          <div class="section-body" style="padding: 0">
            <template v-if="branches.branches?.length">
              <div class="overflow-x-auto">
                <table class="re-table">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Staff</th>
                      <th>Routers</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="b in branches.branches" :key="b.id || b.name">
                      <td class="font-medium text-white">{{ b.name }}</td>
                      <td>{{ b.staff_count ?? 0 }}</td>
                      <td>{{ b.router_count ?? 0 }}</td>
                      <td>
                        <span class="badge" :class="b.is_active ? 'badge-green' : 'badge-red'">
                          {{ b.is_active ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <div v-else class="text-center py-10">
              <i class="fas fa-building text-3xl mb-3 block" style="color: #1e1e2a"></i>
              <p class="text-sm" style="color: #6b7280">Hakuna data</p>
            </div>
          </div>
        </div>

        <!-- Compliance Alerts (1/3) -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title">
              <i class="fas fa-shield-alt" style="color: #FF7A30"></i> Compliance Alerts
            </h3>
          </div>
          <div class="section-body space-y-3">
            <template v-if="hasComplianceData">
              <div class="flex items-center justify-between p-3 rounded-xl" style="background: #0d0d14">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: rgba(250,204,21,0.1)">
                    <i class="fas fa-file-contract text-sm" style="color: #facc15"></i>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-white">Expiring Contracts</p>
                    <p class="text-xs" style="color: #6b7280">Within 30 days</p>
                  </div>
                </div>
                <span class="badge badge-yellow">{{ compliance.expiring_contracts ?? 0 }}</span>
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl" style="background: #0d0d14">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: rgba(239,68,68,0.1)">
                    <i class="fas fa-file-contract text-sm" style="color: #f87171"></i>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-white">Expired Contracts</p>
                    <p class="text-xs" style="color: #6b7280">Need renewal</p>
                  </div>
                </div>
                <span class="badge badge-red">{{ compliance.expired_contracts ?? 0 }}</span>
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl" style="background: #0d0d14">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: rgba(250,204,21,0.1)">
                    <i class="fas fa-id-card text-sm" style="color: #facc15"></i>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-white">Expiring Licenses</p>
                    <p class="text-xs" style="color: #6b7280">Within 30 days</p>
                  </div>
                </div>
                <span class="badge badge-yellow">{{ compliance.expiring_licenses ?? 0 }}</span>
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl" style="background: #0d0d14">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: rgba(239,68,68,0.1)">
                    <i class="fas fa-id-card text-sm" style="color: #f87171"></i>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-white">Expired Licenses</p>
                    <p class="text-xs" style="color: #6b7280">Need renewal</p>
                  </div>
                </div>
                <span class="badge badge-red">{{ compliance.expired_licenses ?? 0 }}</span>
              </div>
            </template>
            <div v-else class="text-center py-10">
              <i class="fas fa-check-circle text-3xl mb-3 block" style="color: rgba(16,185,129,0.3)"></i>
              <p class="text-sm" style="color: #6b7280">All clear — Hakuna alerts</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Ticket Breakdown + Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Ticket Breakdown (1/3) -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title">
              <i class="fas fa-ticket-alt" style="color: #FF7A30"></i> Ticket Breakdown
            </h3>
            <span class="badge badge-gray">{{ ticketStats.total ?? 0 }} total</span>
          </div>
          <div class="section-body space-y-3">
            <template v-if="ticketStats.total">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider mb-3" style="color: #6b7280">By Status</p>
                <div class="space-y-2">
                  <div v-for="(count, status) in ticketStats.by_status" :key="status"
                    class="flex items-center justify-between p-2.5 rounded-lg" style="background: #0d0d14">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full" :style="statusColor(status)"></span>
                      <span class="text-sm capitalize" style="color: #d1d5db">{{ status }}</span>
                    </div>
                    <span class="text-sm font-semibold text-white">{{ count }}</span>
                  </div>
                </div>
              </div>

              <div class="sep"></div>

              <div>
                <p class="text-xs font-semibold uppercase tracking-wider mb-3" style="color: #6b7280">By Priority</p>
                <div class="space-y-2">
                  <div v-for="(count, priority) in ticketStats.by_priority" :key="priority"
                    class="flex items-center justify-between p-2.5 rounded-lg" style="background: #0d0d14">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full" :style="priorityColor(priority)"></span>
                      <span class="text-sm capitalize" style="color: #d1d5db">{{ priority }}</span>
                    </div>
                    <span class="text-sm font-semibold text-white">{{ count }}</span>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="text-center py-10">
              <i class="fas fa-ticket-alt text-3xl mb-3 block" style="color: #1e1e2a"></i>
              <p class="text-sm" style="color: #6b7280">Hakuna tickets</p>
            </div>
          </div>
        </div>

        <!-- Recent Activity (2/3) -->
        <div class="lg:col-span-2 section-card">
          <div class="section-header">
            <h3 class="section-title">
              <i class="fas fa-clock" style="color: #FF7A30"></i> Recent Activity
            </h3>
            <template v-if="auditStats.stats">
              <span class="text-xs" style="color: #6b7280">
                {{ auditStats.stats.today ?? 0 }} today
              </span>
            </template>
          </div>
          <div class="section-body">
            <template v-if="auditStats.stats?.by_action && Object.keys(auditStats.stats.by_action).length">
              <div class="space-y-2">
                <div v-for="(count, action) in auditStats.stats.by_action" :key="action"
                  class="flex items-center justify-between p-3 rounded-xl transition-colors" style="background: #0d0d14">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      :style="auditIconStyle(action)">
                      <i :class="auditIcon(action)" class="text-sm"></i>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-white capitalize">{{ formatAction(action) }}</p>
                      <p class="text-xs" style="color: #6b7280">{{ count }} event{{ count !== 1 ? 's' : '' }}</p>
                    </div>
                  </div>
                  <span class="text-xs" style="color: #6b7280">
                    {{ count }}
                  </span>
                </div>
              </div>
            </template>
            <div v-else class="text-center py-10">
              <i class="fas fa-history text-3xl mb-3 block" style="color: #1e1e2a"></i>
              <p class="text-sm" style="color: #6b7280">Hakuna activity yet</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slideIn"
      :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminGet } from '../../api/client'

const loading = ref(true)
const toast = ref(null)

const financial = ref({})
const ticketStats = ref({})
const branches = ref({})
const staffData = ref({})
const compliance = ref({})
const auditStats = ref({})

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

const openTickets = computed(() => {
  const s = ticketStats.value.by_status || {}
  return (s.open || 0) + (s.pending || 0) + (s.in_progress || 0)
})

const slaBreachCount = computed(() => {
  return ticketStats.value.sla_breaches ?? compliance.value.sla_breaches ?? 0
})

const hasComplianceData = computed(() => {
  const c = compliance.value
  return (c.expiring_contracts ?? 0) + (c.expired_contracts ?? 0) + (c.expiring_licenses ?? 0) + (c.expired_licenses ?? 0) > 0
})

function formatNum(v) {
  return (v ?? 0).toLocaleString()
}

function formatAction(action) {
  return String(action).replace(/_/g, ' ')
}

function statusColor(status) {
  const map = {
    open: 'background: #facc15',
    pending: 'background: #60a5fa',
    in_progress: 'background: #a78bfa',
    resolved: 'background: #4ade80',
    closed: 'background: #6b7280'
  }
  return map[status] || 'background: #6b7280'
}

function priorityColor(priority) {
  const map = {
    critical: 'background: #f87171',
    high: 'background: #facc15',
    medium: 'background: #60a5fa',
    low: 'background: #4ade80'
  }
  return map[priority] || 'background: #6b7280'
}

function auditIcon(action) {
  const map = {
    create: 'fas fa-plus',
    update: 'fas fa-pen',
    delete: 'fas fa-trash',
    login: 'fas fa-sign-in-alt',
    view: 'fas fa-eye',
    export: 'fas fa-download',
    approve: 'fas fa-check',
    reject: 'fas fa-times'
  }
  return map[action] || 'fas fa-circle'
}

function auditIconStyle(action) {
  const map = {
    create: 'background: rgba(16,185,129,0.1); color: #34d399',
    update: 'background: rgba(59,130,246,0.1); color: #60a5fa',
    delete: 'background: rgba(239,68,68,0.1); color: #f87171',
    login: 'background: rgba(139,92,246,0.1); color: #a78bfa',
    view: 'background: rgba(59,130,246,0.1); color: #60a5fa',
    export: 'background: rgba(255,122,48,0.1); color: #FF7A30',
    approve: 'background: rgba(16,185,129,0.1); color: #34d399',
    reject: 'background: rgba(239,68,68,0.1); color: #f87171'
  }
  return map[action] || 'background: rgba(255,122,48,0.1); color: #FF7A30'
}

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

onMounted(async () => {
  try {
    const [finData, ticketData, branchData, staffRes, complianceData, auditData] = await Promise.all([
      adminGet('/hq/financial-dashboard'),
      adminGet('/hq/ticket-stats'),
      adminGet('/hq/branches'),
      adminGet('/hq/staff'),
      adminGet('/hq/compliance-dashboard'),
      adminGet('/hq/audit-trail?stats=true')
    ])
    financial.value = finData || {}
    ticketStats.value = ticketData || {}
    branches.value = branchData || {}
    staffData.value = staffRes || {}
    compliance.value = complianceData || {}
    auditStats.value = auditData || {}
  } catch (e) {
    console.error('Dashboard load error:', e)
    showToast('Failed to load dashboard data', 'error')
  } finally {
    loading.value = false
  }
})
</script>
