<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Reports & Analytics</h2>
        <p class="text-sm" style="color: #6b7280">Revenue, customer insights, and business intelligence</p>
      </div>
      <div class="flex gap-2">
        <select v-model="period" @change="loadOverview()" class="form-input" style="max-width: 140px">
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
        <button @click="loadOverview()" class="btn btn-secondary btn-sm"><i class="fas fa-sync-alt"></i></button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <div class="stat-card">
        <p class="stat-label">Revenue</p>
        <p class="stat-value" style="color: #34d399">TSh {{ fmtNum(overview.revenue?.total) }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Transactions</p>
        <p class="stat-value">{{ fmtNum(overview.revenue?.data?.reduce?.((a,b) => a + b.transactions, 0)) }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Active Users</p>
        <p class="stat-value" style="color: #60a5fa">{{ overview.users?.activeCount || 0 }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Top Package</p>
        <p class="stat-value text-sm" style="color: #FF7A30">{{ overview.topPackages?.[0]?.name || '—' }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Routers Online</p>
        <p class="stat-value" style="color: #a78bfa">{{ routersOnline }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Top Reseller</p>
        <p class="stat-value text-sm" style="color: #f59e0b">{{ overview.resellerPerf?.[0]?.name || '—' }}</p>
      </div>
    </div>

    <!-- Revenue Chart -->
    <div class="section-card p-4">
      <h3 class="text-sm font-medium text-white mb-4"><i class="fas fa-chart-line mr-2" style="color: #34d399"></i> Revenue Trend</h3>
      <div v-if="overview.revenue?.data?.length" class="relative" style="height: 200px">
        <div class="absolute inset-0 flex items-end gap-px">
          <div v-for="(d, i) in overview.revenue.data" :key="i" class="flex-1 rounded-t-sm transition-all cursor-pointer group"
            :style="{ height: revHeight(d.revenue) + '%', background: 'linear-gradient(to top, #34d399, #10b981)' }"
            :title="d.day + ': TSh ' + fmtNum(d.revenue)">
            <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap" style="background: #1e1e2a; color: #fff; border: 1px solid #2a2a3a">
              TSh {{ fmtNum(d.revenue) }}
            </div>
          </div>
        </div>
        <div class="absolute bottom-0 left-0 right-0 h-px" style="background: #1e1e2a"></div>
      </div>
      <div v-else class="text-center py-12" style="color: #6b7280">No revenue data for this period</div>
    </div>

    <!-- Tabs for detailed views -->
    <div class="section-card" style="padding: 4px">
      <div class="flex gap-1">
        <button v-for="t in ['top','vouchers','resellers','routers']" :key="t" @click="activeTab = t"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :style="activeTab === t ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'background: transparent; color: #6b7280'">
          {{ { top: 'Top Packages', vouchers: 'Voucher Sales', resellers: 'Resellers', routers: 'Router Health' }[t] }}
        </button>
      </div>
    </div>

    <!-- TOP PACKAGES -->
    <template v-if="activeTab === 'top'">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="(p, i) in overview.topPackages" :key="i" class="section-card p-5">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" :style="{ background: rankBg(i), color: rankColor(i) }">#{{ i + 1 }}</div>
            <div><p class="font-medium text-white">{{ p.name }}</p><p class="text-xs" style="color: #6b7280">{{ p.sales }} sales</p></div>
          </div>
          <div class="flex justify-between text-sm">
            <span style="color: #6b7280">Revenue</span>
            <span class="font-medium text-white">TSh {{ fmtNum(p.revenue) }}</span>
          </div>
        </div>
        <div v-if="!overview.topPackages?.length" class="col-span-3 text-center py-12" style="color: #6b7280">No package data</div>
      </div>
    </template>

    <!-- VOUCHER SALES -->
    <template v-if="activeTab === 'vouchers'">
      <div class="section-card p-4">
        <h3 class="text-sm font-medium text-white mb-4"><i class="fas fa-ticket-alt mr-2" style="color: #a78bfa"></i> Daily Voucher Sales</h3>
        <div v-if="overview.vouchers?.length" class="relative" style="height: 150px">
          <div class="absolute inset-0 flex items-end gap-px">
            <div v-for="(d, i) in overview.vouchers" :key="i" class="flex-1 rounded-t-sm"
              :style="{ height: voucherHeight(d.count) + '%', background: 'linear-gradient(to top, #a78bfa, #8b5cf6)' }"
              :title="d.day + ': ' + d.count + ' vouchers, TSh ' + fmtNum(d.revenue)"></div>
          </div>
        </div>
        <div v-if="overview.vouchers?.length" class="mt-4 grid grid-cols-3 gap-4">
          <div class="text-center"><p class="text-xl font-bold text-white">{{ overview.vouchers.reduce((a,b) => a + b.count, 0) }}</p><p class="text-xs" style="color: #6b7280">Total Sold</p></div>
          <div class="text-center"><p class="text-xl font-bold text-white" style="color: #34d399">TSh {{ fmtNum(overview.vouchers.reduce((a,b) => a + b.revenue, 0)) }}</p><p class="text-xs" style="color: #6b7280">Total Revenue</p></div>
          <div class="text-center"><p class="text-xl font-bold text-white" style="color: #FF7A30">{{ overview.vouchers.length }}</p><p class="text-xs" style="color: #6b7280">Active Days</p></div>
        </div>
        <p v-else class="text-center py-12" style="color: #6b7280">No voucher sales data</p>
      </div>
    </template>

    <!-- RESELLERS -->
    <template v-if="activeTab === 'resellers'">
      <div class="section-card">
        <div class="section-header"><h3 class="section-title"><i class="fas fa-store" style="color: #f59e0b"></i> Top Resellers</h3></div>
        <div class="section-body">
          <div v-for="(r, i) in overview.resellerPerf" :key="i" class="flex items-center justify-between p-3 rounded-xl mb-2" style="background: #0a0a0f; border: 1px solid var(--border)">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" :style="{ background: rankBg(i), color: rankColor(i) }">{{ i + 1 }}</div>
              <div><p class="text-sm font-medium text-white">{{ r.name }}</p><p class="text-xs" style="color: #6b7280">{{ r.sold }} vouchers sold</p></div>
            </div>
            <span class="text-sm font-medium" style="color: #34d399">TSh {{ fmtNum(r.earned) }}</span>
          </div>
          <p v-if="!overview.resellerPerf?.length" class="text-center py-8" style="color: #6b7280">No reseller data</p>
        </div>
      </div>
    </template>

    <!-- ROUTER HEALTH -->
    <template v-if="activeTab === 'routers'">
      <div class="section-card">
        <div class="section-header"><h3 class="section-title"><i class="fas fa-server" style="color: #60a5fa"></i> Router Status</h3></div>
        <div class="section-body">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div v-for="s in overview.routerStats" :key="s.status" class="p-4 rounded-xl text-center" :style="{ background: routerBg(s.status) }">
              <p class="text-3xl font-bold" :style="{ color: routerColor(s.status) }">{{ s.count }}</p>
              <p class="text-sm mt-1" style="color: #6b7280">{{ (s.status || 'unknown').toUpperCase() }}</p>
            </div>
          </div>
          <div v-if="!overview.routerStats?.length" class="text-center py-8" style="color: #6b7280">No router data</div>
        </div>
      </div>
    </template>

    <div v-if="toast.show" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminGet } from '../../api/client'

const activeTab = ref('top')
const period = ref('30d')
const overview = ref({ revenue: {}, users: {}, vouchers: [], topPackages: [], routerStats: [], resellerPerf: [] })

const toast = ref({ show: false, message: '', type: 'success' })
function showToast(msg, type = 'success') { toast.value = { show: true, message: msg, type }; setTimeout(() => toast.value.show = false, 3000) }

function fmtNum(n) { return Number(n || 0).toLocaleString() }

const routersOnline = computed(() => {
  const rs = overview.value.routerStats || []
  const online = rs.find(s => s.status === 'online')
  return online ? online.count : 0
})

function revHeight(val) {
  const data = overview.value.revenue?.data || []
  const max = Math.max(...data.map(d => d.revenue), 1)
  return (val / max) * 100
}
function voucherHeight(val) {
  const data = overview.value.vouchers || []
  const max = Math.max(...data.map(d => d.count), 1)
  return (val / max) * 100
}
function rankBg(i) { return ['rgba(255,215,0,0.15)', 'rgba(192,192,192,0.15)', 'rgba(180,130,80,0.15)', 'rgba(107,114,128,0.1)', 'rgba(107,114,128,0.1)'][i] || 'rgba(107,114,128,0.1)' }
function rankColor(i) { return ['#ffd700', '#c0c0c0', '#cd7f32', '#6b7280', '#6b7280'][i] || '#6b7280' }
function routerBg(s) { return { online: 'rgba(16,185,129,0.08)', offline: 'rgba(239,68,68,0.08)', maintenance: 'rgba(245,158,11,0.08)' }[s] || 'rgba(107,114,128,0.08)' }
function routerColor(s) { return { online: '#34d399', offline: '#f87171', maintenance: '#f59e0b' }[s] || '#6b7280' }

async function loadOverview() {
  try {
    const r = await adminGet('/business/reports/overview?period=' + period.value)
    overview.value = r
  } catch (e) { console.error(e) }
}

onMounted(loadOverview)
</script>
