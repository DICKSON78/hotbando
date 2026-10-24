<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total Revenue</p>
            <p class="stat-value">{{ formatMoney(stats.total_revenue) }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-coins"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">My Locations</p>
            <p class="stat-value">{{ stats.total_locations || 0 }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-map-marker-alt"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Pending Payouts</p>
            <p class="stat-value">{{ formatMoney(stats.pending_payouts) }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #fbbf24"><i class="fas fa-clock"></i></div>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-chart-bar" style="color: #FF7A30"></i> Revenue Summary</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="re-table">
          <thead>
            <tr><th>Month</th><th>Revenue</th><th>Credit</th><th>Payout</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in stats.recent_reports || []" :key="r.id">
              <td class="font-medium text-white">{{ r.month }}</td>
              <td>{{ formatMoney(r.total_revenue) }}</td>
              <td>{{ formatMoney(r.total_credit) }}</td>
              <td>{{ formatMoney(r.payout_amount) }}</td>
            </tr>
            <tr v-if="!(stats.recent_reports || []).length">
              <td colspan="4" class="text-center text-white/30 py-10">No data yet</td>
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
