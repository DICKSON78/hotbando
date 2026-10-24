<template>
  <div class="max-w-lg mx-auto">
    <div class="bg-[#111118] rounded-2xl border border-[#1e1e2a] p-5 shadow-sm">
      <h2 class="text-xl font-bold text-white mb-2">Top Up Wallet</h2>
      <p class="text-sm text-white/50 mb-6">Ongeza fedha kwenye wallet yako kwa Mobile Money</p>

      <div class="bg-[#0a0a12] rounded-lg p-4 mb-6">
        <p class="metric-label">Current Balance</p>
        <p class="metric-value text-emerald-500">TSH {{ currentBalance.toLocaleString() }}</p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="input-label">Amount (TSH)</label>
          <div class="grid grid-cols-3 gap-2 mb-3">
            <button v-for="a in quickAmounts" :key="a" @click="amount = a" class="py-2 rounded-lg text-sm font-medium border transition-colors" :class="amount === a ? 'bg-[#FF7A30] text-white border-[#FF7A30]' : 'border-[#1e1e2a] text-white/60 hover:border-[#FF7A30]/30'">{{ Number(a).toLocaleString() }}</button>
          </div>
          <input v-model="amount" type="number" min="1000" step="500" placeholder="Enter amount..." class="input w-full">
        </div>

        <div>
          <label class="input-label">Namba ya Simu</label>
          <input v-model="phone" type="tel" placeholder="0712345678" class="input w-full">
        </div>

        <div v-if="error" class="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{{ error }}</div>
        <div v-if="success" class="text-sm text-green-400 bg-green-500/10 rounded-lg p-3">{{ success }}</div>

        <button @click="submitTopup" :disabled="loading || amount < 1000 || polling" class="btn btn-primary w-full justify-center py-2.5" :class="{ 'opacity-50 cursor-not-allowed': loading || amount < 1000 || polling }">
          <i v-if="polling" class="fas fa-spinner fa-spin mr-2"></i>
          <i v-else-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
          <i v-else class="fas fa-mobile-alt mr-2"></i>
          {{ polling ? 'Inasubiri malipo... (Angalia simu)' : loading ? 'Inatuma push...' : 'Lipia kwa Mobile Money' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { resellerGet } from '../../api/reseller'
import { apiPost, apiGet } from '../../api/client'

const amount = ref(10000)
const phone = ref('')
const loading = ref(false)
const polling = ref(false)
const error = ref('')
const success = ref('')
const currentBalance = ref(0)
const quickAmounts = [5000, 10000, 20000, 50000, 100000, 200000]
let pollTimer = null

onMounted(loadBalance)
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

async function loadBalance() {
  try { const r = await resellerGet('/earnings'); currentBalance.value = r.wallet?.balance || 0 } catch {}
  try {
    const r = await apiGet('/me')
    if (r.user?.phone_number) phone.value = r.user.phone_number
  } catch {}
}

function toLocalPhone(p) {
  if (!p) return ''
  return p.startsWith('+255') ? '0' + p.slice(4) : p.replace(/\D/g, '')
}

async function submitTopup() {
  error.value = ''; success.value = ''
  const localPhone = toLocalPhone(phone.value)
  if (!/^0[0-9]{9}$/.test(localPhone)) { error.value = 'Ingiza namba ya simu sahihi'; return }
  if (amount.value < 1000) { error.value = 'Minimum amount is TSH 1,000'; return }
  loading.value = true
  try {
    const r = await apiPost('/clickpesa/pay', {
      amount: amount.value,
      phoneNumber: localPhone,
      purpose: 'reseller_topup',
    })
    if (r.success && r.orderReference) {
      loading.value = false
      polling.value = true
      success.value = 'Tafadhali angalia simu yako na weka PIN kukamilisha malipo'
      startPolling(r.orderReference)
    } else {
      error.value = r.error || 'Error'
      loading.value = false
    }
  } catch (e) { error.value = e.response?.data?.error || e.message || 'Network error'; loading.value = false }
}

function startPolling(orderRef) {
  if (pollTimer) clearInterval(pollTimer)
  let attempts = 0
  pollTimer = setInterval(async () => {
    attempts++
    if (attempts > 60) { clearInterval(pollTimer); polling.value = false; error.value = 'Muda umekwisha. Jaribu tena.'; success.value = ''; return }
    try {
      const r = await apiGet(`/clickpesa/confirm/${orderRef}`)
      if (r.success && r.status === 'completed') {
        clearInterval(pollTimer)
        polling.value = false
        success.value = r.message || 'Malipo yamekamilika! Salio limeongezwa.'
        error.value = ''
        loadBalance()
      }
    } catch (_) {}
  }, 5000)
}
</script>
