<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Customer Management</h2>
        <p class="text-sm" style="color: #6b7280">CRM — track lifecycle, spending, and engagement</p>
      </div>
      <div class="flex gap-2">
        <button @click="loadStats()" class="btn btn-secondary btn-sm"><i class="fas fa-sync-alt"></i> Refresh</button>
        <button @click="exportCSV()" class="btn btn-secondary btn-sm"><i class="fas fa-download"></i> Export</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Total Customers</p><p class="stat-value">{{ stats.total }}</p></div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-users"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Online Now</p><p class="stat-value" style="color: #34d399">{{ stats.onlineNow }}</p></div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-wifi"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Revenue (All)</p><p class="stat-value" style="color: #f59e0b">TSh {{ fmtNum(stats.totalRevenue) }}</p></div>
          <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b"><i class="fas fa-coins"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">ARPU</p><p class="stat-value" style="color: #a78bfa">TSh {{ fmtNum(stats.arpu) }}</p></div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-chart-line"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Churned</p><p class="stat-value" style="color: #f87171">{{ stats.churnedUsers }}</p></div>
          <div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #f87171"><i class="fas fa-user-slash"></i></div>
        </div>
      </div>
    </div>

    <!-- Growth mini-chart -->
    <div v-if="stats.growth && stats.growth.length" class="section-card p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-white"><i class="fas fa-chart-area mr-2" style="color: #FF7A30"></i>User Growth (14 days)</h3>
        <div class="flex gap-3 text-xs" style="color: #6b7280">
          <span>Today: <b class="text-white">{{ stats.todayNew }}</b></span>
          <span>This Week: <b class="text-white">{{ stats.weekNew }}</b></span>
          <span>This Month: <b class="text-white">{{ stats.monthNew }}</b></span>
        </div>
      </div>
      <div class="flex items-end gap-1" style="height: 60px">
        <div v-for="(g, i) in stats.growth" :key="i" class="flex-1 rounded-t transition-all" :title="g.day + ': ' + g.new_users + ' users'"
          :style="{ height: growthHeight(g.new_users) + '%', background: 'linear-gradient(to top, #FF7A30, #ea6a24)' }"></div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="section-card" style="padding: 4px">
      <div class="flex gap-1">
        <button v-for="t in ['list','segments']" :key="t" @click="activeTab = t"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :style="activeTab === t ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'background: transparent; color: #6b7280'">
          {{ t === 'list' ? 'All Customers' : 'Segments & Packages' }}
        </button>
      </div>
    </div>

    <!-- CUSTOMER LIST TAB -->
    <template v-if="activeTab === 'list'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-users" style="color: #FF7A30"></i> All Customers</h3>
          <div class="flex gap-2 flex-wrap">
            <div class="relative">
              <input v-model="search" @input="debouncedLoad" placeholder="Search name, phone..." class="form-input" style="max-width: 220px; padding-left: 32px">
              <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs" style="color: #6b7280"></i>
            </div>
            <select v-model="statusFilter" @change="loadCustomers()" class="form-input" style="max-width: 130px">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <div class="section-body">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr style="border-bottom: 1px solid var(--border)">
                <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Customer</th>
                <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Phone</th>
                <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Package</th>
                <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Expires</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Spent</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Payments</th>
                <th class="text-center py-3 px-4 text-xs font-medium" style="color: #6b7280">Status</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Actions</th>
              </tr></thead>
              <tbody>
                <tr v-for="c in customers" :key="c.id" style="border-bottom: 1px solid rgba(30,30,42,0.5)" class="hover:bg-white/[0.02]">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" :style="{ background: avatarColor(c.name) }">{{ initials(c.name) }}</div>
                      <div><p class="font-medium text-white text-sm">{{ c.name || 'Unknown' }}</p><p class="text-xs" style="color: #6b7280">ID: {{ c.id }}</p></div>
                    </div>
                  </td>
                  <td class="py-3 px-4 font-mono text-xs text-white">{{ c.phone_number || '—' }}</td>
                  <td class="py-3 px-4"><span class="text-xs px-2 py-0.5 rounded-full" :class="c.package ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-500'">{{ c.package || 'None' }}</span></td>
                  <td class="py-3 px-4 text-xs" :class="isExpired(c.expires_at) ? 'text-red-400' : 'text-white'">
                    {{ c.expires_at ? fmtDate(c.expires_at) : '—' }}
                    <span v-if="isExpired(c.expires_at)" class="ml-1 text-red-400">(expired)</span>
                  </td>
                  <td class="py-3 px-4 text-right text-xs font-medium text-white">TSh {{ fmtNum(c.moneyspent || c.total_payments || 0) }}</td>
                  <td class="py-3 px-4 text-right text-xs" style="color: #6b7280">{{ c.payment_count || 0 }}</td>
                  <td class="py-3 px-4 text-center">
                    <span class="text-xs px-2 py-0.5 rounded-full" :class="c.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'">
                      {{ c.is_active ? 'ACTIVE' : 'SUSPENDED' }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <button @click="viewCustomer(c)" class="p-1.5 rounded-lg transition-colors" style="color: #6b7280" title="View Details"><i class="fas fa-eye hover:text-blue-400 text-xs"></i></button>
                    <button @click="adjustCustomer(c)" class="p-1.5 rounded-lg transition-colors" style="color: #6b7280" title="Adjust Subscription"><i class="fas fa-sliders-h hover:text-[#FF7A30] text-xs"></i></button>
                  </td>
                </tr>
                <tr v-if="!customers.length">
                  <td colspan="8" class="text-center py-12" style="color: #6b7280"><i class="fas fa-users text-3xl mb-3 block" style="color: #1e1e2a"></i><p>No customers found</p></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="pagination.pages > 1" class="flex items-center justify-between mt-4 pt-4" style="border-top: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Showing {{ customers.length }} of {{ pagination.total }}</p>
            <div class="flex gap-1">
              <button @click="goPage(pagination.page - 1)" :disabled="pagination.page <= 1" class="btn btn-ghost btn-sm">Prev</button>
              <span class="text-xs px-3 py-1" style="color: #6b7280">Page {{ pagination.page }} / {{ pagination.pages }}</span>
              <button @click="goPage(pagination.page + 1)" :disabled="pagination.page >= pagination.pages" class="btn btn-ghost btn-sm">Next</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- SEGMENTS TAB -->
    <template v-if="activeTab === 'segments'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Package Distribution -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-chart-pie" style="color: #FF7A30"></i> Package Distribution</h3>
          </div>
          <div class="section-body space-y-3">
            <div v-for="pkg in stats.byPackage" :key="pkg.package_name" class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-white">{{ pkg.package_name || 'No Package' }}</span>
                <span class="text-xs" style="color: #6b7280">{{ pkg.count }} customers</span>
              </div>
              <div class="h-2 rounded-full" style="background: #1e1e2a">
                <div class="h-full rounded-full" :style="{ width: pkgWidth(pkg.count) + '%', background: 'linear-gradient(90deg, #FF7A30, #ea6a24)' }"></div>
              </div>
              <div class="flex justify-between mt-1.5 text-xs" style="color: #6b7280">
                <span>{{ pkgWidth(pkg.count).toFixed(1) }}% of total</span>
                <span>TSh {{ fmtNum(pkg.revenue) }} revenue</span>
              </div>
            </div>
            <div v-if="!stats.byPackage || !stats.byPackage.length" class="text-center py-8" style="color: #6b7280">
              <p class="text-sm">No package data yet</p>
            </div>
          </div>
        </div>

        <!-- Customer Lifecycle -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-heartbeat" style="color: #34d399"></i> Customer Lifecycle</h3>
          </div>
          <div class="section-body space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-xl text-center" style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.15)">
                <p class="text-2xl font-bold text-green-400">{{ stats.active }}</p>
                <p class="text-xs mt-1" style="color: #6b7280">Active Users</p>
              </div>
              <div class="p-3 rounded-xl text-center" style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15)">
                <p class="text-2xl font-bold text-red-400">{{ stats.suspended }}</p>
                <p class="text-xs mt-1" style="color: #6b7280">Suspended</p>
              </div>
              <div class="p-3 rounded-xl text-center" style="background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15)">
                <p class="text-2xl font-bold text-blue-400">{{ stats.onlineNow }}</p>
                <p class="text-xs mt-1" style="color: #6b7280">Online Now</p>
              </div>
              <div class="p-3 rounded-xl text-center" style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15)">
                <p class="text-2xl font-bold text-red-400">{{ stats.churnedUsers }}</p>
                <p class="text-xs mt-1" style="color: #6b7280">Churned (30d+)</p>
              </div>
            </div>
            <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
              <p class="text-xs font-medium text-white mb-2">Health Score</p>
              <div class="h-3 rounded-full overflow-hidden" style="background: #1e1e2a">
                <div class="h-full rounded-full transition-all" :style="{ width: healthScore + '%', background: healthColor }"></div>
              </div>
              <div class="flex justify-between mt-1.5">
                <span class="text-xs" style="color: #6b7280">{{ healthLabel }}</span>
                <span class="text-xs font-medium" :style="{ color: healthColor }">{{ healthScore }}%</span>
              </div>
            </div>
            <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
              <p class="text-xs font-medium text-white mb-1">ARPU (Avg Revenue Per User)</p>
              <p class="text-xl font-bold" style="color: #FF7A30">TSh {{ fmtNum(stats.arpu) }}</p>
              <p class="text-xs mt-1" style="color: #6b7280">Across all paying customers</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- CUSTOMER DETAIL MODAL -->
    <div v-if="detailCustomer" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px)">
      <div class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <button @click="detailCustomer = null" class="absolute top-4 right-4 text-sm" style="color: #6b7280"><i class="fas fa-times text-lg hover:text-white"></i></button>
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white" :style="{ background: avatarColor(detailCustomer.name) }">{{ initials(detailCustomer.name) }}</div>
          <div>
            <h3 class="text-lg font-bold text-white">{{ detailCustomer.name || 'Unknown' }}</h3>
            <p class="text-sm" style="color: #6b7280">{{ detailCustomer.phone_number }} &bull; {{ detailCustomer.email || 'No email' }}</p>
          </div>
          <span class="ml-auto text-xs px-2 py-0.5 rounded-full" :class="detailCustomer.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'">
            {{ detailCustomer.is_active ? 'ACTIVE' : 'SUSPENDED' }}
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Total Spent</p>
            <p class="text-sm font-bold text-white">TSh {{ fmtNum(detailCustomer.total_spent || detailCustomer.moneyspent || 0) }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Payments</p>
            <p class="text-sm font-bold text-white">{{ detailCustomer.payment_count || 0 }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Vouchers Used</p>
            <p class="text-sm font-bold text-white">{{ detailCustomer.vouchers_used || 0 }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Package</p>
            <p class="text-sm font-bold text-white">{{ detailCustomer.package || 'None' }}</p>
          </div>
        </div>

        <!-- Payment History -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-white mb-3"><i class="fas fa-credit-card mr-1" style="color: #FF7A30"></i> Payment History</h4>
          <div v-if="detailPayments.length" class="space-y-2">
            <div v-for="p in detailPayments" :key="p.id" class="flex items-center justify-between p-2.5 rounded-lg" style="background: #0a0a0f; border: 1px solid var(--border)">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full flex items-center justify-center" :style="{ background: p.status === 'SUCCESS' || p.status === 'SETTLED' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }">
                  <i class="fas text-xs" :class="p.status === 'SUCCESS' || p.status === 'SETTLED' ? 'fa-check text-green-400' : 'fa-times text-red-400'"></i>
                </div>
                <div>
                  <p class="text-xs font-medium text-white">TSh {{ fmtNum(p.amount) }}</p>
                  <p class="text-xs" style="color: #6b7280">{{ p.payment_method || 'Mobile' }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs" style="color: #6b7280">{{ fmtDate(p.created_at) }}</p>
                <span class="text-xs px-1.5 py-0.5 rounded-full" :class="p.status === 'SUCCESS' || p.status === 'SETTLED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'">{{ p.status }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-center py-4" style="color: #6b7280">No payments yet</p>
        </div>

        <!-- Voucher History -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-white mb-3"><i class="fas fa-ticket-alt mr-1" style="color: #a78bfa"></i> Voucher History</h4>
          <div v-if="detailVouchers.length" class="space-y-2">
            <div v-for="v in detailVouchers" :key="v.id" class="flex items-center justify-between p-2.5 rounded-lg" style="background: #0a0a0f; border: 1px solid var(--border)">
              <div>
                <p class="text-xs font-mono font-medium text-white">{{ v.voucher_code }}</p>
                <p class="text-xs" style="color: #6b7280">{{ v.package_name || 'Unknown' }} &bull; {{ v.duration_hours }}h</p>
              </div>
              <div class="text-right">
                <p class="text-xs" style="color: #6b7280">{{ fmtDate(v.used_at) }}</p>
                <span class="text-xs text-green-400">Used</span>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-center py-4" style="color: #6b7280">No vouchers redeemed</p>
        </div>

        <!-- Quick Actions -->
        <div class="flex gap-2 flex-wrap pt-4" style="border-top: 1px solid var(--border)">
          <button @click="adjustCustomer(detailCustomer)" class="btn btn-primary btn-sm"><i class="fas fa-sliders-h mr-1"></i> Adjust Subscription</button>
          <button v-if="detailCustomer.is_active" @click="quickSuspend()" class="btn btn-sm" style="background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2)"><i class="fas fa-ban mr-1"></i> Suspend</button>
          <button v-else @click="quickActivate()" class="btn btn-sm" style="background: rgba(16,185,129,0.1); color: #34d399; border: 1px solid rgba(16,185,129,0.2)"><i class="fas fa-check mr-1"></i> Activate</button>
        </div>
      </div>
    </div>

    <!-- ADJUST SUBSCRIPTION MODAL -->
    <div v-if="adjustTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px)">
      <div class="relative w-full max-w-md rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <button @click="adjustTarget = null" class="absolute top-4 right-4 text-sm" style="color: #6b7280"><i class="fas fa-times text-lg hover:text-white"></i></button>
        <h3 class="text-lg font-bold text-white mb-1">Adjust Subscription</h3>
        <p class="text-sm mb-4" style="color: #6b7280">{{ adjustTarget.name }} ({{ adjustTarget.phone_number }})</p>

        <div class="space-y-3">
          <div class="flex gap-2">
            <button v-for="a in adjustActions" :key="a.key" @click="adjustAction = a.key"
              class="flex-1 p-3 rounded-xl text-center text-sm font-medium transition-all"
              :style="adjustAction === a.key ? 'background: rgba(255,122,48,0.15); border: 1px solid rgba(255,122,48,0.3); color: #FF7A30' : 'background: #0a0a0f; border: 1px solid var(--border); color: #6b7280'">
              <i :class="a.icon" class="block mb-1"></i>{{ a.label }}
            </button>
          </div>
          <div v-if="adjustAction === 'extend'" class="space-y-2">
            <label class="input-label">Days to Add</label>
            <input v-model.number="adjustDays" type="number" class="form-input" placeholder="7" min="1">
          </div>
          <div v-if="adjustAction === 'grant_data'" class="space-y-2">
            <label class="input-label">Data (MB)</label>
            <input v-model.number="adjustDataMb" type="number" class="form-input" placeholder="100" min="1">
          </div>
          <button @click="doAdjust()" class="btn btn-primary w-full" :disabled="adjustLoading">
            <i v-if="adjustLoading" class="fas fa-spinner fa-spin mr-1"></i> Apply
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slideIn" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const activeTab = ref('list')
const loading = ref(false)
const search = ref('')
const statusFilter = ref('')
const customers = ref([])
const stats = ref({ total: 0, active: 0, suspended: 0, onlineNow: 0, totalRevenue: 0, arpu: 0, churnedUsers: 0, todayNew: 0, weekNew: 0, monthNew: 0, byPackage: [], growth: [] })
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 })

const detailCustomer = ref(null)
const detailPayments = ref([])
const detailVouchers = ref([])

const adjustTarget = ref(null)
const adjustAction = ref('extend')
const adjustDays = ref(7)
const adjustDataMb = ref(100)
const adjustLoading = ref(false)

const adjustActions = [
  { key: 'extend', label: 'Extend', icon: 'fas fa-calendar-plus' },
  { key: 'grant_data', label: 'Grant Data', icon: 'fas fa-database' },
  { key: 'activate', label: 'Activate', icon: 'fas fa-check-circle' },
  { key: 'suspend', label: 'Suspend', icon: 'fas fa-ban' }
]

const toast = ref({ show: false, message: '', type: 'success' })
function showToast(msg, type = 'success') { toast.value = { show: true, message: msg, type }; setTimeout(() => toast.value.show = false, 3000) }

let searchTimeout = null
function debouncedLoad() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => loadCustomers(), 300) }

function fmtNum(n) { return Number(n || 0).toLocaleString() }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
function isExpired(d) { return d && new Date(d) < new Date() }
function initials(name) { return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }
function avatarColor(name) { const colors = ['#FF7A30','#3b82f6','#a78bfa','#34d399','#f59e0b','#ef4444','#ec4899','#06b6d4']; let h = 0; for (const c of (name || '')) h = c.charCodeAt(0) + ((h << 5) - h); return colors[Math.abs(h) % colors.length] }
function growthHeight(n) { const max = Math.max(...(stats.value.growth || []).map(g => g.new_users), 1); return (n / max) * 100 }
const pkgWidth = (count) => stats.value.total > 0 ? (count / stats.value.total * 100) : 0
const healthScore = computed(() => {
  const s = stats.value; if (!s.total) return 0
  const activeRate = s.active / s.total * 100
  const churnRate = s.total > 0 ? (s.churnedUsers / s.total * 100) : 0
  return Math.round(Math.max(0, Math.min(100, activeRate - churnRate * 2 + (s.onlineNow / Math.max(s.total, 1) * 50))))
})
const healthColor = computed(() => healthScore.value > 70 ? '#34d399' : healthScore.value > 40 ? '#f59e0b' : '#f87171')
const healthLabel = computed(() => healthScore.value > 70 ? 'Healthy' : healthScore.value > 40 ? 'Needs Attention' : 'Critical')

async function loadStats() {
  try { const r = await adminGet('/business/customers/stats'); Object.assign(stats.value, r) } catch (e) { console.error(e) }
}

async function loadCustomers() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: pagination.value.page, limit: 20 })
    if (search.value) params.set('search', search.value)
    if (statusFilter.value) params.set('status', statusFilter.value)
    const r = await adminGet('/business/customers?' + params.toString())
    customers.value = r.customers || []
    pagination.value = r.pagination || { page: 1, limit: 20, total: 0, pages: 0 }
  } catch (e) { console.error(e) }
  loading.value = false
}

function goPage(p) { pagination.value.page = p; loadCustomers() }

async function viewCustomer(c) {
  try {
    const r = await adminGet('/business/customers/' + c.id)
    detailCustomer.value = r.customer
    detailPayments.value = r.payments || []
    detailVouchers.value = r.vouchers || []
  } catch (e) { showToast('Failed to load details', 'error') }
}

function adjustCustomer(c) { adjustTarget.value = c; adjustAction.value = 'extend'; adjustDays.value = 7; adjustDataMb.value = 100 }

async function doAdjust() {
  if (!adjustTarget.value) return
  adjustLoading.value = true
  try {
    const body = { action: adjustAction.value }
    if (adjustAction.value === 'extend') body.days = adjustDays.value
    if (adjustAction.value === 'grant_data') body.data_mb = adjustDataMb.value
    await adminPost('/business/customers/' + adjustTarget.value.id + '/adjust', body)
    showToast('Subscription updated')
    adjustTarget.value = null
    loadCustomers()
  } catch (e) { showToast('Failed: ' + (e.response?.data?.message || e.message), 'error') }
  adjustLoading.value = false
}

async function quickSuspend() {
  if (!detailCustomer.value) return
  try {
    await adminPost('/business/customers/' + detailCustomer.value.id + '/adjust', { action: 'suspend' })
    detailCustomer.value.is_active = 0
    showToast('Customer suspended')
    loadCustomers()
  } catch (e) { showToast('Failed', 'error') }
}

async function quickActivate() {
  if (!detailCustomer.value) return
  try {
    await adminPost('/business/customers/' + detailCustomer.value.id + '/adjust', { action: 'activate' })
    detailCustomer.value.is_active = 1
    showToast('Customer activated')
    loadCustomers()
  } catch (e) { showToast('Failed', 'error') }
}

function exportCSV() {
  const headers = ['ID', 'Name', 'Phone', 'Package', 'Spent', 'Status']
  const rows = customers.value.map(c => [c.id, c.name, c.phone_number, c.package, c.moneyspent, c.is_active ? 'Active' : 'Suspended'])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'customers.csv'; a.click()
}

onMounted(async () => { await Promise.all([loadStats(), loadCustomers()]) })
</script>
