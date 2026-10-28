<template>
  <div class="space-y-6">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="stat-card animate-pulse">
          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <div class="h-3 w-20 rounded" style="background: #1e1e2a"></div>
              <div class="h-7 w-16 rounded" style="background: #1e1e2a"></div>
            </div>
            <div class="w-14 h-14 rounded-xl" style="background: #1e1e2a"></div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <!-- Stats row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <router-link to="/reseller/topup" class="stat-card cursor-pointer">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Wallet Balance</p>
              <p class="stat-value" style="color: #34d399">TSH {{ balance.toLocaleString() }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-wallet"></i></div>
          </div>
          <div class="mt-3 flex items-center gap-1 text-xs" style="color: #6b7280">
            <i class="fas fa-circle text-[6px] text-green-400"></i>
            Total earned: TSH {{ totalEarned.toLocaleString() }}
          </div>
        </router-link>

        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Vouchers Generated</p>
              <p class="stat-value" style="color: #60a5fa">{{ vouchersGenerated }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-ticket-alt"></i></div>
          </div>
          <div class="mt-3 flex items-center gap-1 text-xs" style="color: #6b7280">
            {{ vouchersUnused }} unused · {{ vouchersExpired }} expired
          </div>
        </div>

        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Vouchers Redeemed</p>
              <p class="stat-value" style="color: #a78bfa">{{ vouchersRedeemed }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-check-circle"></i></div>
          </div>
          <div class="mt-3 flex items-center gap-1 text-xs" style="color: #6b7280">
            Revenue: TSH {{ revenue.toLocaleString() }}
          </div>
        </div>

        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Withdrawn</p>
              <p class="stat-value" style="color: #fbbf24">TSH {{ withdrawn.toLocaleString() }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(245,158,11,0.08); color: #fbbf24"><i class="fas fa-money-bill-wave"></i></div>
          </div>
          <div class="mt-3 flex items-center gap-1 text-xs" style="color: #6b7280">
            {{ withdrawalsCount }} withdrawals processed
          </div>
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Chart (takes 2 cols) -->
        <div class="lg:col-span-2 section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-chart-line" style="color: #FF7A30"></i> Sales Trend (7 Days)</h3>
          </div>
          <div class="section-body">
            <div class="h-64">
              <canvas ref="chartRef" id="resellerTrendChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Quick Actions (1 col) -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-bolt" style="color: #FF7A30"></i> Quick Actions</h3>
          </div>
          <div class="section-body space-y-3">
            <router-link to="/reseller/topup" class="flex items-center gap-3 p-3 rounded-xl transition-colors" style="background: rgba(255,122,48,0.08)">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(255,122,48,0.15); color: #FF7A30">
                <i class="fas fa-plus-circle"></i>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium" style="color: #FF7A30">Top Up Wallet</p>
                <p class="text-xs" style="color: #6b7280">Add funds to generate vouchers</p>
              </div>
            </router-link>
            <router-link to="/reseller/vouchers" class="flex items-center gap-3 p-3 rounded-xl transition-colors" style="background: rgba(59,130,246,0.08)">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(59,130,246,0.15); color: #60a5fa">
                <i class="fas fa-ticket-alt"></i>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium" style="color: #60a5fa">Generate Vouchers</p>
                <p class="text-xs" style="color: #6b7280">Create voucher batches to sell</p>
              </div>
            </router-link>
            <router-link to="/reseller/withdraw" class="flex items-center gap-3 p-3 rounded-xl transition-colors" style="background: rgba(245,158,11,0.08)">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(245,158,11,0.15); color: #fbbf24">
                <i class="fas fa-money-bill-wave"></i>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium" style="color: #fbbf24">Withdraw Earnings</p>
                <p class="text-xs" style="color: #6b7280">Cash out your profits</p>
              </div>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Recent Sales -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-clock" style="color: #FF7A30"></i> Recent Sales</h3>
        </div>
        <div class="section-body">
          <div class="space-y-3">
            <div v-for="(s, i) in (recentSales || [])" :key="i" class="flex items-center gap-3 p-3 rounded-xl transition-colors" style="background: #0d0d14">
              <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style="background: rgba(16,185,129,0.1); color: #34d399">
                <i class="fas fa-receipt text-sm"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white truncate">{{ s.voucher_code }}</p>
                <p class="text-xs" style="color: #6b7280">{{ s.package_name }} · {{ s.customer_name || 'Customer' }}</p>
              </div>
              <span class="text-sm font-semibold whitespace-nowrap" style="color: #34d399">TSH {{ parseFloat(s.price).toLocaleString() }}</span>
            </div>
            <p v-if="!recentSales?.length" class="text-center py-6 text-sm" style="color: #6b7280">
              <i class="fas fa-receipt mb-2 block text-lg" style="color: #FF7A30"></i>
              No sales yet. Generate vouchers to start selling!
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slideIn" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { resellerGet } from '../../api/reseller'

const balance = ref(0)
const totalEarned = ref(0)
const vouchersGenerated = ref(0)
const vouchersUnused = ref(0)
const vouchersExpired = ref(0)
const vouchersRedeemed = ref(0)
const revenue = ref(0)
const withdrawn = ref(0)
const withdrawalsCount = ref(0)
const recentSales = ref([])
const chartRef = ref(null)
const loading = ref(true)
const toast = ref(null)

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

onMounted(async () => {
  try {
    const [earnings, vouchers, withdrawals] = await Promise.all([
      resellerGet('/earnings'),
      resellerGet('/vouchers'),
      resellerGet('/withdrawals')
    ])
    balance.value = earnings.wallet?.balance || 0
    totalEarned.value = earnings.wallet?.total_earned || 0
    vouchersGenerated.value = earnings.summary?.total || 0
    vouchersRedeemed.value = earnings.summary?.redeemed || 0
    revenue.value = earnings.summary?.earnings || 0
    recentSales.value = earnings.recent_sales || []

    // voucher status breakdown
    const allV = vouchers.data || []
    vouchersUnused.value = allV.filter(v => !v.is_used && new Date(v.expires_at) > new Date()).length
    vouchersExpired.value = allV.filter(v => !v.is_used && new Date(v.expires_at) <= new Date()).length

    const wds = withdrawals.data || withdrawals || []
    withdrawn.value = (Array.isArray(wds) ? wds : []).reduce((s, w) => s + parseFloat(w.amount || 0), 0)
    withdrawalsCount.value = Array.isArray(wds) ? wds.length : 0

    await nextTick()
    renderChart(earnings.chartData)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function renderChart(chartData) {
  const ctx = document.getElementById('resellerTrendChart')
  if (!ctx) return
  const labels = chartData?.labels?.length ? chartData.labels : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const data = chartData?.data?.length ? chartData.data : [0,0,0,0,0,0,0]
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Sales',
        data,
        borderColor: '#FF7A30',
        backgroundColor: 'rgba(255, 122, 48, 0.08)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#FF7A30',
        pointBorderColor: '#FF7A30',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', font: { size: 11 } }, beginAtZero: true }
      }
    }
  })
}
</script>
