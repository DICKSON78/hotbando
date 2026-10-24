<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total Invested</p>
            <p class="stat-value">{{ formatMoney(stats.total_invested) }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-wallet"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total Returns</p>
            <p class="stat-value">{{ formatMoney(stats.total_returns) }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-chart-line"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">ROI</p>
            <p class="stat-value">{{ stats.roi || 0 }}%</p>
          </div>
          <div class="stat-icon" style="background: rgba(255,122,48,0.1); color: #FF7A30"><i class="fas fa-percentage"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Active Investments</p>
            <p class="stat-value">{{ stats.active_investments || 0 }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-briefcase"></i></div>
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <router-link to="/investor/investments" class="btn btn-primary">
        <i class="fas fa-plus"></i> New Investment
      </router-link>
    </div>

    <div v-if="chartLabels.length" class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-chart-line" style="color: #FF7A30"></i> Monthly Returns</h3>
      </div>
      <div class="section-body">
        <div class="h-64">
          <canvas ref="chartRef" id="returnsChart"></canvas>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-clock" style="color: #FF7A30"></i> Recent Transactions</h3>
      </div>
      <div class="section-body">
        <div class="space-y-3">
          <div v-for="tx in recentTransactions" :key="tx.id" class="flex items-center justify-between text-sm pb-3 last:border-0" style="border-bottom: 1px solid rgba(30,30,42,0.5)">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                :style="tx.type === 'return' ? 'background: rgba(16,185,129,0.1); color: #34d399' : 'background: rgba(59,130,246,0.1); color: #60a5fa'">
                <i :class="tx.type === 'return' ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"></i>
              </div>
              <div>
                <p class="text-white/80 font-medium">{{ tx.description }}</p>
                <p class="text-white/30 text-xs">{{ new Date(tx.date).toLocaleDateString() }}</p>
              </div>
            </div>
            <span class="font-semibold" :class="tx.type === 'return' ? 'text-green-400' : 'text-blue-400'">
              {{ tx.type === 'return' ? '+' : '-' }}{{ formatMoney(tx.amount) }}
            </span>
          </div>
          <p v-if="!recentTransactions.length" class="text-white/30 text-center py-4">No recent transactions</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { apiGet } from '../../api/client'

const stats = ref({})
const chartRef = ref(null)
const chartLabels = ref([])
const chartData = ref([])
const recentTransactions = ref([])

function formatMoney(n) { return 'TSh ' + (Number(n || 0).toLocaleString()) }

onMounted(async () => {
  try {
    const r = await apiGet('/investor/dashboard')
    stats.value = {
      total_invested: r.total_invested,
      total_returns: r.total_returns,
      roi: r.roi,
      active_investments: r.active_investments
    }
    recentTransactions.value = r.recent_transactions || []
    if (r.monthly_returns) {
      chartLabels.value = r.monthly_returns.map(m => m.month)
      chartData.value = r.monthly_returns.map(m => m.returns)
      await nextTick()
      renderChart()
    }
  } catch (e) { console.error(e) }
})

function renderChart() {
  const ctx = document.getElementById('returnsChart')
  if (!ctx) return
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels.value,
      datasets: [{
        label: 'Returns',
        data: chartData.value,
        borderColor: '#FF7A30',
        backgroundColor: 'rgba(255, 122, 48, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(30,30,42,0.5)' } },
        y: { beginAtZero: true, ticks: { color: '#6b7280' }, grid: { color: 'rgba(30,30,42,0.5)' } }
      }
    }
  })
}
</script>
