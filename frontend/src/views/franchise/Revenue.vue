<template>
  <div class="space-y-5">
    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-brand-100">
        <h3 class="section-title"><i class="fas fa-coins section-icon text-brand-500"></i> Payout History</h3>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="p in payouts" :key="p.id">
              <td class="font-medium text-gray-800">{{ new Date(p.created_at).toLocaleDateString() }}</td>
              <td>{{ formatMoney(p.amount) }}</td>
              <td><span class="badge" :class="statusClass(p.status)">{{ p.status }}</span></td>
            </tr>
            <tr v-if="!payouts.length"><td colspan="3" class="text-center text-gray-400 py-10">No payouts yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet } from '../../api/client'

const payouts = ref([])
function formatMoney(n) { return 'TSh ' + (Number(n || 0).toLocaleString()) }
function statusClass(s) {
  return s === 'paid' ? 'badge-success' : s === 'pending' ? 'badge-warning' : 'badge-danger'
}

onMounted(async () => {
  try { const r = await apiGet('/revenue-share/payouts/history'); payouts.value = r.payouts || r || [] }
  catch (e) { console.error(e) }
})
</script>
