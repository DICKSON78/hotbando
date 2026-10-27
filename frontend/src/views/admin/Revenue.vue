<template>
  <div class="space-y-6">
    <!-- Legacy ClickPesa Balance Banner -->
    <div v-if="clickpesaBalance" class="section-card" style="border: 1px solid #FF7A30/30">
      <div class="section-body flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="stat-icon" style="background: rgba(255,122,48,0.1); color: #FF7A30"><i class="fas fa-wallet"></i></div>
          <div>
            <p class="text-sm" style="color: #9ca3af">Legacy ClickPesa Balance</p>
            <p class="text-lg font-bold text-white">TSh {{ formatNum(clickpesaBalance.available_balance || clickpesaBalance.balance || 0) }}</p>
          </div>
        </div>
        <button @click="fetchClickPesaBalance" class="btn btn-secondary btn-sm" :disabled="loadingBalance">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingBalance }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Date Range Filter -->
    <div class="section-card">
      <div class="section-body">
        <div class="flex flex-col sm:flex-row gap-3 items-end">
          <div class="flex-1">
            <label class="form-label">From</label>
            <input v-model="dateFrom" type="date" class="form-input">
          </div>
          <div class="flex-1">
            <label class="form-label">To</label>
            <input v-model="dateTo" type="date" class="form-input">
          </div>
          <button @click="fetchRevenue" class="btn btn-primary btn-sm" :disabled="loading">
            <i class="fas fa-search"></i> Filter
          </button>
          <button @click="resetFilter" class="btn btn-secondary btn-sm">
            <i class="fas fa-undo"></i> Reset
          </button>
          <button @click="exportCSV" class="btn btn-secondary btn-sm" :disabled="!revenue.length">
            <i class="fas fa-download"></i> Export
          </button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Total Revenue</p><p class="stat-value">TSh {{ formatNum(totalRevenue) }}</p></div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-coins"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Today Revenue</p><p class="stat-value">TSh {{ formatNum(todayRevenue) }}</p></div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-calendar-day"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Total Payments</p><p class="stat-value">{{ totalOrders }}</p></div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-receipt"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Vouchers Sold</p><p class="stat-value">{{ vouchersSold }}</p></div>
          <div class="stat-icon" style="background: rgba(255,122,48,0.1); color: #FF7A30"><i class="fas fa-ticket-alt"></i></div>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-chart-bar" style="color: #FF7A30"></i> Revenue Trend (Last 7 Days)</h3>
      </div>
      <div class="section-body">
        <div class="h-64">
          <canvas ref="chartRef"></canvas>
        </div>
      </div>
    </div>

    <!-- Payment Transaction History -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-exchange-alt" style="color: #FF7A30"></i> Payment Transactions</h3>
        <span class="badge badge-green">{{ revenue.length }} payments</span>
      </div>
      <div v-if="loading" class="section-body space-y-3">
        <div v-for="i in 5" :key="i" class="h-10 rounded-lg animate-pulse" style="background: #1e1e2a"></div>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="re-table">
          <thead>
            <tr><th>Date</th><th>Order Ref</th><th>User</th><th>Phone</th><th>Purpose</th><th>Amount</th><th>Channel</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in revenue" :key="t.id">
              <td class="text-sm" style="color: #d1d5db">{{ formatDate(t.created_at) }}</td>
              <td><span class="text-xs font-mono" style="color: #FF7A30">{{ t.order_reference || '—' }}</span></td>
              <td class="text-sm text-white">{{ t.user_name || '—' }}</td>
              <td class="text-sm" style="color: #d1d5db">{{ t.phone || '—' }}</td>
              <td><span class="badge badge-blue">{{ formatPurpose(t.purpose) }}</span></td>
              <td class="text-sm font-medium text-white">TSh {{ (t.amount || 0).toLocaleString() }}</td>
              <td><span class="badge badge-gray">{{ t.channel || '—' }}</span></td>
              <td>
                <span class="badge" :class="t.status === 'SUCCESS' || t.status === 'SETTLED' ? 'badge-green' : t.status === 'PENDING' ? 'badge-yellow' : 'badge-red'">
                  {{ t.status || '—' }}
                </span>
              </td>
            </tr>
            <tr v-if="!revenue.length">
              <td colspan="8" class="text-center py-10" style="color: #6b7280">
                <i class="fas fa-receipt text-3xl mb-3 block" style="color: #1e1e2a"></i>
                Hakuna malipo yaliyopatikana
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { adminGet } from '../../api/client'

const chartRef = ref(null)
const loading = ref(true)
const loadingBalance = ref(false)
const revenue = ref([])
const totalRevenue = ref(0)
const todayRevenue = ref(0)
const totalOrders = ref(0)
const vouchersSold = ref(0)
const dateFrom = ref('')
const dateTo = ref('')
const clickpesaBalance = ref(null)

function formatNum(n) {
  return Number(n || 0).toLocaleString()
}

function formatPurpose(p) {
  const map = {
    'package_purchase': 'Package',
    'gift_purchase': 'Gift Voucher',
    'wallet_topup': 'Wallet TopUp',
    'reseller_topup': 'Reseller',
    'sponsor_deposit': 'Sponsor',
    'payment': 'Payment'
  }
  return map[p] || p || '—'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function resetFilter() {
  dateFrom.value = ''
  dateTo.value = ''
  fetchRevenue()
}

async function fetchClickPesaBalance() {
  loadingBalance.value = true
  try {
    clickpesaBalance.value = await adminGet('/clickpesa-balance')
  } catch (e) {
    console.error('ClickPesa balance error:', e)
  } finally {
    loadingBalance.value = false
  }
}

async function fetchRevenue() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (dateFrom.value) params.set('from', dateFrom.value)
    if (dateTo.value) params.set('to', dateTo.value)
    const qs = params.toString() ? `?${params}` : ''

    const data = await adminGet(`/revenue${qs}`)
    revenue.value = data.transactions || []
    totalRevenue.value = data.totalRevenue || 0
    todayRevenue.value = data.todayRevenue || 0
    totalOrders.value = data.totalOrders || 0
    vouchersSold.value = data.vouchersSold || 0

    if (data.chartData?.labels?.length) {
      await nextTick()
      renderChart(data.chartData)
    }
  } catch (e) {
    console.error('Revenue fetch error:', e)
  } finally {
    loading.value = false
  }
}

function renderChart(chartData) {
  if (!chartRef.value) return
  new Chart(chartRef.value, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Revenue (TSh)',
        data: chartData.data,
        backgroundColor: 'rgba(255, 122, 48, 0.6)',
        borderColor: '#FF7A30',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(30,30,42,0.5)' }, border: { color: 'rgba(30,30,42,0.5)' } },
        y: { beginAtZero: true, ticks: { color: '#6b7280' }, grid: { color: 'rgba(30,30,42,0.5)' }, border: { color: 'rgba(30,30,42,0.5)' } }
      }
    }
  })
}

function exportCSV() {
  if (!revenue.value.length) return
  const headers = ['Date', 'Order Ref', 'User', 'Phone', 'Purpose', 'Amount', 'Channel', 'Status']
  const rows = revenue.value.map(t => [formatDate(t.created_at), t.order_reference || '', t.user_name || '', t.phone || '', t.purpose || '', t.amount || 0, t.channel || '', t.status || ''])
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  fetchRevenue()
  fetchClickPesaBalance()
})
</script>
