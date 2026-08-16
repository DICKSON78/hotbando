<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <p class="metric-label">Today's Revenue</p>
        <p class="metric-value">{{ (sales.todaySales || 0) | number }} TZS</p>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <p class="metric-label">Users</p>
        <p class="metric-value">{{ sales.totalUsers || 0 }}</p>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <p class="metric-label">Active Now</p>
        <p class="metric-value">{{ sales.activeSubscriptions || 0 }}</p>
      </div>
    </div>

    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-brand-100">
        <h3 class="section-title"><i class="fas fa-ticket-alt section-icon text-brand-500"></i> Voucher Report</h3>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Code</th><th>Price</th><th>Status</th><th>User</th><th>Date</th></tr></thead>
          <tbody>
            <tr v-for="v in vouchers" :key="v.id">
              <td class="font-mono text-xs text-gray-800">{{ v.voucher_code }}</td>
              <td>{{ v.price }} TZS</td>
              <td><span class="badge" :class="v.is_used ? 'badge-success' : 'badge-warning'">{{ v.is_used ? 'Used' : 'Unused' }}</span></td>
              <td>{{ v.phone_number || '—' }}</td>
              <td class="text-gray-400 text-xs">{{ v.used_at ? new Date(v.used_at).toLocaleDateString() : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminGet } from '../../api/client'

const sales = ref({})
const vouchers = ref([])

onMounted(async () => {
  try { sales.value = await adminGet('/sales-summary'); const r = await adminGet('/voucher-report?limit=200'); vouchers.value = r.data || [] }
  catch (e) { console.error(e) }
})
</script>
