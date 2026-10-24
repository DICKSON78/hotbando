<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="stat-card">
        <p class="text-xs text-[#6b7280] mb-1">Balance</p>
        <p class="text-2xl font-bold text-white">TSh {{ (wallet.balance || 0).toLocaleString() }}</p>
      </div>
      <div class="stat-card">
        <p class="text-xs text-[#6b7280] mb-1">Total Commission</p>
        <p class="text-2xl font-bold text-white">TSh {{ (wallet.total_commission_earned || 0).toLocaleString() }}</p>
      </div>
      <div class="stat-card">
        <p class="text-xs text-[#6b7280] mb-1">Status</p>
        <p class="text-2xl font-bold" :class="wallet.is_active ? 'text-green-400' : 'text-red-400'">{{ wallet.is_active ? 'Active' : 'Inactive' }}</p>
      </div>
    </div>

    <div class="section-card overflow-hidden">
      <div class="px-5 py-4 border-b border-[#1e1e2a] flex items-center justify-between">
        <h3 class="text-white font-semibold"><i class="fas fa-history text-[#FF7A30] mr-2"></i>Transaction History</h3>
        <button @click="showDeposit = true" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Manual Deposit</button>
      </div>
      <div class="p-5">
        <table class="re-table">
          <thead><tr><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            <tr v-for="tx in paginatedTransactions" :key="tx.id">
              <td><span class="badge" :class="tx.transaction_type === 'deposit' ? 'badge-green' : 'badge-yellow'">{{ tx.transaction_type }}</span></td>
              <td class="font-medium text-white">TSh {{ tx.amount.toLocaleString() }}</td>
              <td><span class="badge" :class="tx.status === 'completed' ? 'badge-green' : tx.status === 'pending' ? 'badge-yellow' : 'badge-red'">{{ tx.status }}</span></td>
              <td class="text-[#6b7280] text-xs">{{ new Date(tx.created_at).toLocaleDateString() }}</td>
            </tr>
            <tr v-if="paginatedTransactions.length === 0">
              <td colspan="4" class="text-center text-[#6b7280] py-8">No transactions found.</td>
            </tr>
          </tbody>
        </table>
        <div v-if="totalTxPages > 1" class="flex items-center justify-between mt-4 pt-4 border-t border-[#1e1e2a]">
          <p class="text-xs text-[#6b7280]">Showing {{ (txPage - 1) * txPerPage + 1 }}-{{ Math.min(txPage * txPerPage, transactions.length) }} of {{ transactions.length }}</p>
          <div class="flex gap-1">
            <button @click="txPage--" :disabled="txPage <= 1" class="btn btn-secondary btn-sm text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"><i class="fas fa-chevron-left"></i></button>
            <span class="text-xs text-[#6b7280] px-2 py-1">{{ txPage }} / {{ totalTxPages }}</span>
            <button @click="txPage++" :disabled="txPage >= totalTxPages" class="btn btn-secondary btn-sm text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDeposit" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showDeposit = false">
      <div class="section-card w-full max-w-md">
        <h3 class="text-lg font-bold text-white mb-4">Manual Deposit</h3>
        <form @submit.prevent="submitDeposit" class="space-y-3">
          <div>
            <label class="block text-xs text-[#6b7280] mb-1">Amount (TSh)</label>
            <input v-model.number="depositAmount" type="number" required min="1" class="form-input w-full" placeholder="Enter amount">
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="showDeposit = false" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading"><i class="fas fa-spinner fa-spin mr-1"></i>Processing...</span>
              <span v-else>Deposit</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="toast.show" class="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all" :class="toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const wallet = ref({})
const transactions = ref([])
const showDeposit = ref(false)
const depositAmount = ref(0)
const loading = ref(false)
const txPage = ref(1)
const txPerPage = 10
const toast = ref({ show: false, message: '', type: 'success' })

const totalTxPages = computed(() => Math.max(1, Math.ceil(transactions.value.length / txPerPage)))
const paginatedTransactions = computed(() => {
  const start = (txPage.value - 1) * txPerPage
  return transactions.value.slice(start, start + txPerPage)
})

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

async function loadWallet() {
  try {
    const w = await adminGet('/wallet')
    wallet.value = w.wallet || w.data || {}
  } catch (e) { console.error(e) }
}

async function loadTransactions() {
  try {
    const t = await adminGet('/wallet/transactions')
    transactions.value = t.transactions || t.data || []
    txPage.value = 1
  } catch (e) { console.error(e) }
}

onMounted(async () => {
  await loadWallet()
  await loadTransactions()
})

async function submitDeposit() {
  if (!depositAmount.value || depositAmount.value <= 0) return
  loading.value = true
  try {
    await adminPost('/wallet/deposit', { amount: depositAmount.value, description: 'Admin self-deposit' })
    showDeposit.value = false
    depositAmount.value = 0
    showToast('Deposit completed successfully')
    await loadWallet()
    await loadTransactions()
  } catch (e) {
    console.error(e)
    showToast('Failed to process deposit', 'error')
  } finally {
    loading.value = false
  }
}
</script>
