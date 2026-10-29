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
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Total Users</p>
              <p class="stat-value">{{ stats.total_users || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-users"></i></div>
          </div>
          <div class="mt-3 flex items-center gap-1 text-xs" style="color: #6b7280">
            <i class="fas fa-circle text-[6px] text-green-400"></i>
            {{ stats.active_users || 0 }} active now
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Routers</p>
              <p class="stat-value">{{ stats.online_routers || 0 }}/{{ stats.total_routers || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-wifi"></i></div>
          </div>
          <div class="mt-3 flex items-center gap-1 text-xs" style="color: #6b7280">
            <span class="inline-block w-2 h-2 rounded-full" :style="stats.online_routers > 0 ? 'background: #34d399' : 'background: #ef4444'"></span>
            {{ stats.online_routers > 0 ? 'Online' : 'All offline' }}
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Data Distributed</p>
              <p class="stat-value">{{ stats.dataDistributed || 0 }} <span class="text-sm font-normal" style="color: #6b7280">GB</span></p>
            </div>
            <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-database"></i></div>
          </div>
          <div class="mt-3 flex items-center gap-1 text-xs" style="color: #6b7280">
            {{ stats.totalViews || 0 }} ad views (30d)
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Completion Rate</p>
              <p class="stat-value">{{ stats.completionRate || 0 }}<span class="text-sm font-normal" style="color: #6b7280">%</span></p>
            </div>
            <div class="stat-icon" style="background: rgba(255,122,48,0.1); color: #FF7A30"><i class="fas fa-chart-line"></i></div>
          </div>
          <div class="mt-3 flex items-center gap-1 text-xs" style="color: #6b7280">
            {{ stats.activeAds || 0 }} active ads
          </div>
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Chart (takes 2 cols) -->
        <div class="lg:col-span-2 section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-chart-line" style="color: #FF7A30"></i> Views Trend (7 Days)</h3>
          </div>
          <div class="section-body">
            <div class="h-64">
              <canvas ref="chartRef" id="trendChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Pending Approvals (1 col) -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-hourglass-half" style="color: #FF7A30"></i> Pending Ads</h3>
            <span class="badge badge-yellow" v-if="stats.pendingApprovals?.length">{{ stats.pendingApprovals.length }}</span>
          </div>
          <div class="section-body space-y-3" style="max-height: 280px; overflow-y: auto">
            <div v-for="ad in (stats.pendingApprovals || [])" :key="ad.id" class="flex items-center gap-3 p-3 rounded-xl transition-colors" style="background: #0d0d14">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style="background: #1a1a24">
                <i class="fas fa-ad" style="color: #FF7A30"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white truncate">{{ ad.title }}</p>
                <p class="text-xs" style="color: #6b7280">{{ ad.sponsor_name }}</p>
              </div>
              <div class="flex gap-1">
                <button @click="approveAd(ad.id)" class="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(16,185,129,0.1); color: #34d399" title="Approve">
                  <i class="fas fa-check text-xs"></i>
                </button>
                <button @click="declineAd(ad.id)" class="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(239,68,68,0.1); color: #f87171" title="Decline">
                  <i class="fas fa-times text-xs"></i>
                </button>
              </div>
            </div>
            <p v-if="!stats.pendingApprovals?.length" class="text-center py-6 text-sm" style="color: #6b7280">
              <i class="fas fa-check-circle mb-2 block text-lg" style="color: #34d399"></i>
              All caught up!
            </p>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-clock" style="color: #FF7A30"></i> Recent Activity</h3>
        </div>
        <div class="section-body">
          <div class="space-y-3">
            <div v-for="(a, i) in (stats.recentActivity || [])" :key="i" class="flex items-center gap-3 p-3 rounded-xl transition-colors" style="background: #0d0d14">
              <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" :style="a.icon === 'eye' ? 'background: rgba(59,130,246,0.1); color: #60a5fa' : a.icon === 'money-bill-wave' ? 'background: rgba(16,185,129,0.1); color: #34d399' : 'background: rgba(255,122,48,0.1); color: #FF7A30'">
                <i :class="'fas fa-' + a.icon" class="text-sm"></i>
              </div>
              <div class="flex-1">
                <p class="text-sm" style="color: #d1d5db">{{ a.description }}</p>
              </div>
              <span class="text-xs whitespace-nowrap" style="color: #6b7280">{{ a.time }}</span>
            </div>
            <p v-if="!stats.recentActivity?.length" class="text-center py-4 text-sm" style="color: #6b7280">No recent activity</p>
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
import { adminGet, adminPost } from '../../api/client'

const stats = ref({})
const chartRef = ref(null)
const loading = ref(true)
const toast = ref(null)

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

onMounted(async () => {
  try {
    const data = await adminGet('/dashboard-stats')
    stats.value = data
    loading.value = false
    await nextTick()
    if (data.chartData?.labels?.length) renderChart(data.chartData)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

let trendChart = null
function renderChart(chartData, attempt = 0) {
  const ctx = chartRef.value || document.getElementById('trendChart')
  if (!ctx) {
    if (attempt < 10) setTimeout(() => renderChart(chartData, attempt + 1), 150)
    else console.warn('trendChart canvas not found')
    return
  }
  if (typeof Chart === 'undefined') {
    if (attempt < 20) setTimeout(() => renderChart(chartData, attempt + 1), 150)
    else console.warn('Chart.js not loaded')
    return
  }
  if (trendChart) { trendChart.destroy(); trendChart = null }
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Views',
        data: chartData.data,
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
        x: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: 'rgba(30,30,42,0.5)' }, border: { color: 'rgba(30,30,42,0.5)' } },
        y: { beginAtZero: true, ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: 'rgba(30,30,42,0.5)' }, border: { color: 'rgba(30,30,42,0.5)' } }
      },
      interaction: { intersect: false, mode: 'index' }
    }
  })
}

async function approveAd(id) {
  try {
    await adminPost(`/approve-ad/${id}`)
    stats.value.pendingApprovals = (stats.value.pendingApprovals || []).filter(a => a.id !== id)
    showToast('Ad approved!')
  } catch (e) {
    showToast('Failed to approve', 'error')
  }
}

async function declineAd(id) {
  try {
    await adminPost(`/decline-ad/${id}`)
    stats.value.pendingApprovals = (stats.value.pendingApprovals || []).filter(a => a.id !== id)
    showToast('Ad declined')
  } catch (e) {
    showToast('Failed to decline', 'error')
  }
}
</script>
