<template>
  <div class="space-y-5">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <p class="metric-label">Balance</p>
        <p class="metric-value">{{ formatMoney(wallet.balance) }}</p>
        <p class="text-xs text-gray-400 mt-2">Total deposited: {{ formatMoney(wallet.total_deposited) }}</p>
      </div>

      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <h3 class="section-title mb-4"><i class="fas fa-plus-circle section-icon text-brand-500"></i> Deposit Funds</h3>
        <form @submit.prevent="requestDeposit" class="space-y-3">
          <input v-model="amount" type="number" required class="input" placeholder="Amount">
          <button type="submit" :disabled="depositing" class="btn btn-primary">{{ depositing ? 'Submitting...' : 'Request Deposit' }}</button>
        </form>
        <p v-if="depositMsg" class="text-sm mt-2" :class="depositError ? 'text-red-500' : 'text-emerald-600'">{{ depositMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet, apiPost } from '../../api/client'

const wallet = ref({})
const amount = ref('')
const depositing = ref(false)
const depositMsg = ref('')
const depositError = ref(false)

function formatMoney(n) { return 'TSh ' + (Number(n || 0).toLocaleString()) }

onMounted(async () => {
  try { wallet.value = await apiGet('/wallet/balance') } catch (e) { console.error(e) }
})

async function requestDeposit() {
  depositing.value = true; depositMsg.value = ''; depositError.value = false
  try {
    const r = await apiPost('/wallet/deposit/request', { amount: amount.value })
    depositMsg.value = r.message || 'Request submitted'
    amount.value = ''
  } catch (e) {
    depositMsg.value = e.response?.data?.error || 'An error occurred'
    depositError.value = true
  } finally { depositing.value = false }
}
</script>
