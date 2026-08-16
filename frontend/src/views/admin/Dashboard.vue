<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div> <p class="metric-label">Routers Online</p> <p class="metric-value">{{ stats.online_routers }}/{{ stats.total_routers }}</p> </div>
          <div class="metric-icon bg-emerald-100 text-emerald-600"><i class="fas fa-wifi"></i></div>
        </div>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div> <p class="metric-label">Active Users</p> <p class="metric-value">{{ stats.active_users }}</p> </div>
          <div class="metric-icon bg-blue-100 text-blue-600"><i class="fas fa-users"></i></div>
        </div>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div> <p class="metric-label">Active Ads</p> <p class="metric-value">{{ stats.activeAds }}</p> </div>
          <div class="metric-icon bg-brand-100 text-brand-600"><i class="fas fa-ad"></i></div>
        </div>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div> <p class="metric-label">Completion Rate</p> <p class="metric-value">{{ stats.completionRate }}%</p> </div>
          <div class="metric-icon bg-purple-100 text-purple-600"><i class="fas fa-chart-line"></i></div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-brand-100">
          <h3 class="section-title"><i class="fas fa-clock section-icon text-brand-500"></i> Recent Activity</h3>
        </div>
        <div class="p-5">
          <div class="space-y-3">
            <div v-for="a in stats.recentActivity" :key="a.time" class="flex items-start gap-3 text-sm pb-3 border-b border-gray-100 last:border-0">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs" :class="a.icon === 'user-plus' ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'">
                <i :class="'fas fa-' + a.icon"></i>
              </div>
              <div> <p class="text-gray-700">{{ a.description }}</p> <p class="text-gray-400 text-xs">{{ a.time }}</p> </div>
            </div>
            <p v-if="!stats.recentActivity?.length" class="text-gray-400 text-center py-4">No recent activity</p>
          </div>
        </div>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-brand-100">
          <h3 class="section-title"><i class="fas fa-hourglass-half section-icon text-brand-500"></i> Pending Approvals</h3>
        </div>
        <div class="p-5">
          <div class="space-y-3">
            <div v-for="ad in stats.pendingApprovals" :key="ad.id" class="flex items-start gap-3 text-sm pb-3 border-b border-gray-100 last:border-0">
              <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden"> <img v-if="ad.video_url" :src="ad.video_url" class="w-full h-full object-cover" alt=""> <i v-else class="fas fa-video text-gray-400"></i> </div>
              <div class="flex-1"> <p class="text-gray-700 font-medium">{{ ad.title }}</p> <p class="text-gray-400 text-xs">{{ ad.sponsor_name }}</p> </div>
            </div>
            <p v-if="!stats.pendingApprovals?.length" class="text-gray-400 text-center py-4">No pending approvals</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="chartLabels.length" class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-brand-100">
        <h3 class="section-title"><i class="fas fa-chart-line section-icon text-brand-500"></i> Views Trend</h3>
      </div>
      <div class="p-5">
        <div class="h-64">
          <canvas ref="chartRef" id="trendChart"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { adminGet } from '../../api/client'

const stats = ref({})
const chartRef = ref(null)
const chartLabels = ref([])
const chartData = ref([])

onMounted(async () => {
  try {
    stats.value = await adminGet('/dashboard-stats')
    if (stats.value.chartData) {
      chartLabels.value = stats.value.chartData.labels || []
      chartData.value = stats.value.chartData.data || []
      await nextTick()
      renderChart()
    }
  } catch (e) { console.error(e) }
})

function renderChart() {
  const ctx = document.getElementById('trendChart')
  if (!ctx) return
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels.value,
      datasets: [{
        label: 'Views',
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
      scales: { y: { beginAtZero: true } }
    }
  })
}
</script>
