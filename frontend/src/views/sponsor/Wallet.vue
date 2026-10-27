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
          <button type="submit" :disabled="depositing" class="btn btn-primary w-full justify-center">
            <i v-if="depositing" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-lock mr-2"></i>
            {{ depositing ? 'Inaelekeza PesaPal...' : 'Lipia kwa PesaPal' }}
          </button>
        </form>
        <p v-if="depositMsg" class="text-sm mt-2" :class="depositError ? 'text-red-500' : 'text-emerald-500'">{{ depositMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { apiGet, apiPost } from '../../api/client'

const route = useRoute()
const wallet = ref({})
const amount = ref('')
const phone = ref('')
const depositing = ref(false)
const depositMsg = ref('')
const depositError = ref(false)

function formatMoney(n) { return 'TSh ' + (Number(n || 0).toLocaleString()) }

onMounted(async () => {
  try { wallet.value = await apiGet('/wallet/balance') } catch (e) { console.error(e) }
  try {
    const r = await apiGet('/me')
    if (r.user?.phone_number) phone.value = r.user.phone_number
  } catch {}
  await handlePaymentReturn()
})

async function handlePaymentReturn() {
  const tracking = route.query.order_tracking_id
  if (!tracking) {
    if (route.query.payment === 'failed') { depositMsg.value = 'Malipo hayajakamilika. Tafadhali jaribu tena.'; depositError.value = true }
    return
  }
  try {
    const r = await apiGet(`/payments/status/${encodeURIComponent(tracking)}`)
    if (r.status === 'completed') {
      depositMsg.value = r.message || 'Malipo yamekamilika! Fedha zimeongezwa.'
      depositError.value = false
      amount.value = ''
      try { wallet.value = await apiGet('/wallet/balance') } catch {}
    } else if (r.status === 'failed') {
      depositMsg.value = r.message || 'Malipo hayajakamilika. Tafadhali jaribu tena.'
      depositError.value = true
    } else {
      depositMsg.value = r.message || 'Malipo bado hayajakamilika. Tafadhali subiri kidogo kisha fungua ukurasa huu tena.'
      depositError.value = false
    }
  } catch (e) {
    depositMsg.value = e.response?.data?.error || 'Imeshindikana kuthibitisha malipo.'
    depositError.value = true
  }
}

function toLocalPhone(p) {
  if (!p) return ''
  return p.startsWith('+255') ? '0' + p.slice(4) : p.replace(/\D/g, '')
}

async function deposit() {
  depositing.value = true; depositMsg.value = ''; depositError.value = false
  const localPhone = toLocalPhone(phone.value)
  if (!/^0[0-9]{9}$/.test(localPhone)) { depositMsg.value = 'Ingiza namba ya simu sahihi'; depositError.value = true; depositing.value = false; return }
  try {
    const r = await apiPost('/payments/wallet/topup', {
      amount: amount.value,
      phone_number: localPhone,
      return_path: '/sponsor/wallet',
    })
    if (r.success && r.redirect_url) {
      window.location.assign(r.redirect_url)
      return
    }
    depositMsg.value = r.error || 'Error'
    depositError.value = true
    depositing.value = false
  } catch (e) {
    depositMsg.value = e.response?.data?.error || 'An error occurred'
    depositError.value = true
    depositing.value = false
  }
}
</script>
