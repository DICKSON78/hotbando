<template>
  <div class="space-y-5">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="metric-label">Total Revenue</p>
            <p class="metric-value">{{ formatMoney(stats.total_revenue) }}</p>
          </div>
          <div class="metric-icon bg-emerald-100 text-emerald-600"><i class="fas fa-coins"></i></div>
        </div>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="metric-label">My Locations</p>
            <p class="metric-value">{{ stats.total_locations || 0 }}</p>
          </div>
          <div class="metric-icon bg-blue-100 text-blue-600"><i class="fas fa-map-marker-alt"></i></div>
        </div>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="metric-label">Pending Payouts</p>
            <p class="metric-value">{{ formatMoney(stats.pending_payouts) }}</p>
          </div>
          <div class="metric-icon bg-amber-100 text-amber-600"><i class="fas fa-clock"></i></div>
        </div>
      </div>
    </div>

    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-brand-100">
        <h3 class="section-title"><i class="fas fa-chart-bar section-icon text-brand-500"></i> Revenue Summary</h3>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Month</th><th>Revenue</th><th>Credit</th><th>Payout</th></tr></thead>
          <tbody>
            <tr v-for="r in stats.recent_reports || []" :key="r.id">
              <td class="font-medium text-gray-800">{{ r.month }}</td>
              <td>{{ formatMoney(r.total_revenue) }}</td>
              <td>{{ formatMoney(r.total_credit) }}</td>
              <td>{{ formatMoney(r.payout_amount) }}</td>
            </tr>
            <tr v-if="!(stats.recent_reports || []).length"><td colspan="4" class="text-center text-gray-400 py-10">No data yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet } from '../../api/client'

const stats = ref({})
function formatMoney(n) { return 'TSh ' + (Number(n || 0).toLocaleString()) }

onMounted(async () => {
  try {
    const r = await apiGet('/revenue-share/dashboard')
    const reports = (r.pending_payouts || []).map(p => ({
      id: p.id,
      month: new Date(p.period_start).toLocaleString('default', { month: 'short', year: 'numeric' }),
      total_revenue: p.total_revenue,
      total_credit: p.share_amount,
      payout_amount: p.status === 'paid' ? p.share_amount : 0
    }))
    stats.value = {
      total_revenue: r.stats?.total_revenue_generated,
      total_locations: r.stats?.total_locations || 0,
      pending_payouts: r.total_pending || r.stats?.pending_amount || 0,
      recent_reports: reports
    }
  } catch (e) { console.error(e) }
})
</script>
