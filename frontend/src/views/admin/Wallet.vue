<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <p class="metric-label">Balance</p>
        <p class="metric-value">{{ (wallet.balance || 0) | number }} TZS</p>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <p class="metric-label">Total Commission</p>
        <p class="metric-value">{{ (wallet.total_commission_earned || 0) | number }} TZS</p>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <p class="metric-label">Status</p>
        <p class="metric-value text-lg" :class="wallet.is_active ? 'text-emerald-600' : 'text-red-600'">{{ wallet.is_active ? 'Active' : 'Inactive' }}</p>
      </div>
    </div>

    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-brand-100 flex items-center justify-between">
        <h3 class="section-title"><i class="fas fa-history section-icon text-brand-500"></i> Transaction History</h3>
        <button @click="showDeposit = true" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Add Commission</button>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            <tr v-for="tx in transactions" :key="tx.id">
              <td><span class="badge" :class="tx.transaction_type === 'deposit' ? 'badge-success' : 'badge-warning'">{{ tx.transaction_type }}</span></td>
              <td class="font-medium">{{ (tx.amount | number) }} TZS</td>
              <td><span class="badge" :class="tx.status === 'completed' ? 'badge-success' : tx.status === 'pending' ? 'badge-warning' : 'badge-danger'">{{ tx.status }}</span></td>
              <td class="text-gray-400 text-xs">{{ new Date(tx.created_at).toLocaleDateString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showDeposit" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showDeposit = false">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 class="text-lg font-bold text-gray-800 mb-4">Add Commission</h3>
        <form @submit.prevent="submitDeposit" class="space-y-3">
          <div><label class="input-label">Amount (TZS)</label><input v-model.number="depositAmount" type="number" required class="input"></div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="showDeposit = false" class="btn btn-ghost">Cancel</button>
            <button type="submit" class="btn btn-primary">Deposit</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api/client'

const wallet = ref({})
const transactions = ref([])
const showDeposit = ref(false)
const depositAmount = ref(0)

onMounted(async () => {
  try { const w = await api.get('/wallet/'); wallet.value = w.data.data || w.data || {}; const t = await api.get('/wallet/transactions'); transactions.value = t.data.data || t.data || [] }
  catch (e) { console.error(e) }
})

async function submitDeposit() {
  try { await api.post('/wallet/admin/deposit', { amount: depositAmount.value }); showDeposit.value = false; const w = await api.get('/wallet/'); wallet.value = w.data.data || w.data || {}; const t = await api.get('/wallet/transactions'); transactions.value = t.data.data || t.data || [] }
  catch (e) { console.error(e) }
}
</script>
