<template>
  <div class="space-y-5">
    <div class="section-card rounded-2xl border border-[#1e1e2a] overflow-hidden">
      <div class="px-5 py-4 border-b border-[#1e1e2a]">
        <h3 class="section-title"><i class="fas fa-coins section-icon text-[#FF7A30]"></i> Payout History</h3>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="p in payouts" :key="p.id">
              <td class="font-medium text-white">{{ new Date(p.created_at).toLocaleDateString() }}</td>
              <td>{{ formatMoney(p.amount) }}</td>
              <td><span class="badge" :class="statusClass(p.status)">{{ p.status }}</span></td>
            </tr>
            <tr v-if="!payouts.length"><td colspan="3" class="text-center text-white/40 py-10">No payouts yet</td></tr>
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
