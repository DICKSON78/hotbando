<template>
  <div class="max-w-lg mx-auto">
    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
      <h2 class="text-xl font-bold text-gray-800 mb-2">Top Up Wallet</h2>
      <p class="text-sm text-gray-500 mb-6">Add funds to your wallet via PesaPal</p>

      <div class="bg-gray-50 rounded-lg p-4 mb-6">
        <p class="metric-label">Current Balance</p>
        <p class="metric-value text-emerald-600">TSH {{ currentBalance.toLocaleString() }}</p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="input-label">Amount (TSH)</label>
          <div class="grid grid-cols-3 gap-2 mb-3">
            <button v-for="a in quickAmounts" :key="a" @click="amount = a" class="py-2 rounded-lg text-sm font-medium border transition-colors" :class="amount === a ? 'bg-brand-500 text-white border-brand-500' : 'hover:border-brand-300'">{{ Number(a).toLocaleString() }}</button>
          </div>
          <input v-model="amount" type="number" min="1000" step="500" placeholder="Enter amount..." class="input w-full">
        </div>

        <div v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">{{ error }}</div>
        <div v-if="success" class="text-sm text-green-600 bg-green-50 rounded-lg p-3">{{ success }}</div>

        <button @click="submitTopup" :disabled="loading || amount < 1000" class="btn btn-primary w-full justify-center py-2.5" :class="{ 'opacity-50 cursor-not-allowed': loading || amount < 1000 }">
          <i class="fas fa-credit-card mr-2"></i>{{ loading ? 'Processing...' : 'Pay with PesaPal' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { resellerGet, resellerPost } from '../../api/reseller'

const amount = ref(10000)
const loading = ref(false)
const error = ref('')
const success = ref('')
const currentBalance = ref(0)
const quickAmounts = [5000, 10000, 20000, 50000, 100000, 200000]

onMounted(loadBalance)

async function loadBalance() { try { const r = await resellerGet('/earnings'); currentBalance.value = r.wallet?.balance || 0 } catch {} }

async function submitTopup() {
  error.value = ''; success.value = ''
  if (amount.value < 1000) { error.value = 'Minimum amount is TSH 1,000'; return }
  loading.value = true
  try {
    const r = await resellerPost('/topup', { amount: amount.value })
    if (r.redirect_url) { window.location.href = r.redirect_url }
    else { error.value = r.error || 'Error' }
  } catch (e) { error.value = e.response?.data?.error || e.message || 'Network error' }
  finally { loading.value = false }
}
</script>
