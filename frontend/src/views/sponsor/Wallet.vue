<template>
  <div class="space-y-5">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div class="section-card rounded-2xl border border-[#1e1e2a] p-5 shadow-sm">
        <p class="metric-label">Balance</p>
        <p class="metric-value">{{ formatMoney(wallet.balance) }}</p>
        <p class="text-xs text-white/40 mt-2">Total deposited: {{ formatMoney(wallet.total_deposited) }}</p>
      </div>

      <div class="section-card rounded-2xl border border-[#1e1e2a] p-5 shadow-sm">
        <h3 class="section-title mb-4"><i class="fas fa-plus-circle section-icon text-[#FF7A30]"></i> Deposit Funds</h3>
        <form @submit.prevent="deposit" class="space-y-3">
          <input v-model="amount" type="number" required min="1000" class="input" placeholder="Amount (TSH)">
          <div>
            <label class="input-label">Namba ya Simu</label>
            <input v-model="phone" type="tel" required class="input" placeholder="0712345678">
          </div>
          <button type="submit" :disabled="depositing || polling" class="btn btn-primary w-full justify-center">
            <i v-if="polling" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else-if="depositing" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-mobile-alt mr-2"></i>
            {{ polling ? 'Inasubiri malipo...' : depositing ? 'Inatuma push...' : 'Lipia kwa Mobile Money' }}
          </button>
        </form>
        <p v-if="depositMsg" class="text-sm mt-2" :class="depositError ? 'text-red-500' : 'text-emerald-500'">{{ depositMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { apiGet, apiPost } from '../../api/client'

const wallet = ref({})
const amount = ref('')
const phone = ref('')
const depositing = ref(false)
const polling = ref(false)
const depositMsg = ref('')
const depositError = ref(false)
let pollTimer = null

function formatMoney(n) { return 'TSh ' + (Number(n || 0).toLocaleString()) }

onMounted(async () => {
  try { wallet.value = await apiGet('/wallet/balance') } catch (e) { console.error(e) }
  try {
    const r = await apiGet('/me')
    if (r.user?.phone_number) phone.value = r.user.phone_number
  } catch {}
})

onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

function toLocalPhone(p) {
  if (!p) return ''
  return p.startsWith('+255') ? '0' + p.slice(4) : p.replace(/\D/g, '')
}

async function deposit() {
  depositing.value = true; depositMsg.value = ''; depositError.value = false
  const localPhone = toLocalPhone(phone.value)
  if (!/^0[0-9]{9}$/.test(localPhone)) { depositMsg.value = 'Ingiza namba ya simu sahihi'; depositError.value = true; depositing.value = false; return }
  try {
    const r = await apiPost('/clickpesa/pay', {
      amount: amount.value,
      phoneNumber: localPhone,
      purpose: 'sponsor_deposit',
    })
    if (r.success && r.orderReference) {
      depositing.value = false
      polling.value = true
      depositMsg.value = 'Tafadhali angalia simu yako na weka PIN kukamilisha malipo'
      depositError.value = false
      startPolling(r.orderReference)
    } else {
      depositMsg.value = r.error || 'Error'
      depositError.value = true
      depositing.value = false
    }
  } catch (e) {
    depositMsg.value = e.response?.data?.error || 'An error occurred'
    depositError.value = true
    depositing.value = false
  }
}

function startPolling(orderRef) {
  if (pollTimer) clearInterval(pollTimer)
  let attempts = 0
  pollTimer = setInterval(async () => {
    attempts++
    if (attempts > 60) { clearInterval(pollTimer); polling.value = false; depositMsg.value = 'Muda umekwisha. Jaribu tena.'; depositError.value = true; return }
    try {
      const r = await apiGet(`/clickpesa/confirm/${orderRef}`)
      if (r.success && r.status === 'completed') {
        clearInterval(pollTimer)
        polling.value = false
        depositMsg.value = r.message || 'Malipo yamekamilika! Fedha zimeongezwa.'
        depositError.value = false
        amount.value = ''
        try { wallet.value = await apiGet('/wallet/balance') } catch {}
      }
    } catch (_) {}
  }, 5000)
}
</script>
