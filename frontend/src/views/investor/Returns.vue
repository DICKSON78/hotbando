<template>
  <div class="space-y-5">
    <div class="bg-[#111118] rounded-2xl border border-[#1e1e2a] shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-[#1e1e2a]">
        <h3 class="section-title"><i class="fas fa-coins section-icon text-[#FF7A30]"></i> Returns History</h3>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead>
            <tr>
              <th>Investment ID</th>
              <th>Amount</th>
              <th>Period</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ret in returns" :key="ret.id">
              <td class="font-medium text-white">{{ ret.investment_id }}</td>
              <td>{{ formatMoney(ret.amount) }}</td>
              <td>{{ ret.period }}</td>
              <td>{{ new Date(ret.date).toLocaleDateString() }}</td>
            </tr>
            <tr v-if="!returns.length"><td colspan="4" class="text-center text-white/40 py-10">No returns yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet } from '../../api/client'

const returns = ref([])
function formatMoney(n) { return 'TSh ' + (Number(n || 0).toLocaleString()) }

onMounted(async () => {
  try { const r = await apiGet('/investor/returns'); returns.value = r.returns || r || [] }
  catch (e) { console.error(e) }
})
</script>
