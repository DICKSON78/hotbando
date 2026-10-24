<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-[#111118] rounded-2xl border border-[#1e1e2a] p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="metric-label">Total Portfolio Value</p>
            <p class="metric-value">{{ formatMoney(portfolio.total_value) }}</p>
          </div>
          <div class="metric-icon bg-blue-500/10 text-blue-500"><i class="fas fa-chart-pie"></i></div>
        </div>
      </div>
      <div class="bg-[#111118] rounded-2xl border border-[#1e1e2a] p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="metric-label">Total Returns Earned</p>
            <p class="metric-value">{{ formatMoney(portfolio.total_returns) }}</p>
          </div>
          <div class="metric-icon bg-emerald-500/10 text-emerald-500"><i class="fas fa-coins"></i></div>
        </div>
      </div>
      <div class="bg-[#111118] rounded-2xl border border-[#1e1e2a] p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="metric-label">Average ROI</p>
            <p class="metric-value">{{ portfolio.avg_roi || 0 }}%</p>
          </div>
          <div class="metric-icon bg-[#FF7A30]/10 text-[#FF7A30]"><i class="fas fa-percentage"></i></div>
        </div>
      </div>
    </div>

    <div class="bg-[#111118] rounded-2xl border border-[#1e1e2a] shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-[#1e1e2a]">
        <h3 class="section-title"><i class="fas fa-layer-group section-icon text-[#FF7A30]"></i> Investment Breakdown by Type</h3>
      </div>
      <div class="p-5">
        <div class="space-y-4">
          <div v-for="item in portfolio.breakdown || []" :key="item.type" class="flex items-center gap-4">
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-white/80 capitalize">{{ item.type }}</span>
                <span class="text-sm text-white/50">{{ formatMoney(item.total) }}</span>
              </div>
              <div class="w-full bg-[#0d0d14] rounded-full h-2.5">
                <div class="h-2.5 rounded-full" :class="item.type === 'fixed' ? 'bg-[#FF7A30]' : 'bg-emerald-500'"
                  :style="{ width: barWidth(item.total) + '%' }"></div>
              </div>
            </div>
            <span class="text-xs text-white/40 w-12 text-right">{{ item.count }} inv.</span>
          </div>
          <p v-if="!(portfolio.breakdown || []).length" class="text-white/40 text-center py-4">No investments yet</p>
        </div>
      </div>
    </div>

    <div class="bg-[#111118] rounded-2xl border border-[#1e1e2a] shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-[#1e1e2a]">
        <h3 class="section-title"><i class="fas fa-list section-icon text-[#FF7A30]"></i> Portfolio Summary</h3>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-medium text-white">Total Invested</td>
              <td>{{ formatMoney(portfolio.total_invested) }}</td>
            </tr>
            <tr>
              <td class="font-medium text-white">Total Returns</td>
              <td>{{ formatMoney(portfolio.total_returns) }}</td>
            </tr>
            <tr>
              <td class="font-medium text-white">Active Investments</td>
              <td>{{ portfolio.active_count || 0 }}</td>
            </tr>
            <tr>
              <td class="font-medium text-white">Matured Investments</td>
              <td>{{ portfolio.matured_count || 0 }}</td>
            </tr>
            <tr>
              <td class="font-medium text-white">Average ROI</td>
              <td>{{ portfolio.avg_roi || 0 }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet } from '../../api/client'

const portfolio = ref({})
function formatMoney(n) { return 'TSh ' + (Number(n || 0).toLocaleString()) }

function barWidth(total) {
  const max = Math.max(...(portfolio.value.breakdown || []).map(b => b.total), 1)
  return Math.round((total / max) * 100)
}

onMounted(async () => {
  try { portfolio.value = await apiGet('/investor/portfolio') }
  catch (e) { console.error(e) }
})
</script>
