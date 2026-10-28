<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Top Up Wallet</h2>
        <p class="text-sm" style="color: #6b7280">Add funds to your wallet via ClickPesa to generate vouchers</p>
      </div>
      <button @click="loadAll" class="btn btn-secondary btn-sm" :disabled="loading">
        <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Current Balance</p>
            <p class="stat-value" style="color: #34d399">TSH {{ currentBalance.toLocaleString() }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-wallet"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">Available for voucher generation</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total Topped Up</p>
            <p class="stat-value" style="color: #60a5fa">TSH {{ totalToppedUp.toLocaleString() }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-arrow-down"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">{{ topups.length }} top-ups</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Last Top Up</p>
            <p class="stat-value" style="color: #a78bfa; font-size: 1.25rem">{{ lastTopUp }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-clock"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">Most recent payment</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Top Up Form -->
      <div class="lg:col-span-1 section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-plus-circle" style="color: #FF7A30"></i> New Top Up</h3>
        </div>
        <div class="section-body">
          <div class="space-y-4">
            <div>
              <label class="input-label">Amount (TSH)</label>
              <div class="grid grid-cols-3 gap-2 mb-3">
                <button v-for="a in quickAmounts" :key="a" @click="amount = a" class="py-2 rounded-lg text-sm font-medium border transition-colors" :class="amount === a ? 'bg-[#FF7A30] text-white border-[#FF7A30]' : 'border-[#1e1e2a] text-white/60 hover:border-[#FF7A30]/30'">{{ Number(a).toLocaleString() }}</button>
              </div>
              <input v-model="amount" type="number" min="1000" step="500" placeholder="Enter amount..." class="input w-full">
            </div>

            <div>
              <label class="input-label">Phone Number</label>
              <input v-model="phone" type="tel" placeholder="0712345678" class="input w-full">
            </div>

            <div v-if="error" class="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{{ error }}</div>
            <div v-if="success" class="text-sm text-green-400 bg-green-500/10 rounded-lg p-3">{{ success }}</div>

            <button @click="submitTopup" :disabled="loadingPay || amount < 1000" class="btn btn-primary w-full justify-center py-2.5" :class="{ 'opacity-50 cursor-not-allowed': loadingPay || amount < 1000 }">
              <i v-if="loadingPay" class="fas fa-spinner fa-spin mr-2"></i>
              <i v-else class="fas fa-lock mr-2"></i>
              {{ loadingPay ? 'Inaelekeza malipo...' : 'Lipia' }}
            </button>
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="lg:col-span-2 section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-history" style="color: #FF7A30"></i> Top Up History</h3>
        </div>
        <div class="section-body">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="stat-card animate-pulse">
              <div class="flex items-center gap-4">
                <div class="flex-1 space-y-2">
                  <div class="h-4 w-32 rounded" style="background: #1e1e2a"></div>
                  <div class="h-3 w-20 rounded" style="background: #1e1e2a"></div>
                </div>
                <div class="h-6 w-16 rounded" style="background: #1e1e2a"></div>
              </div>
            </div>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in topups" :key="t.id">
                  <td class="font-medium text-white">#{{ t.id }}</td>
                  <td class="font-semibold" style="color: #34d399">TSH {{ Number(t.amount).toLocaleString() }}</td>
                  <td style="color: #d1d5db">{{ t.payment_reference || '—' }}</td>
                  <td style="color: #d1d5db">{{ t.description || '—' }}</td>
                  <td class="text-xs" style="color: #6b7280">{{ new Date(t.created_at).toLocaleString() }}</td>
                </tr>
                <tr v-if="!topups.length">
                  <td colspan="5" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-arrow-down text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No top-ups yet
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <ClickPesaCheckoutModal
      :show="showCheckout"
      title="Top up reseller wallet"
      :checkout-url="checkoutUrl"
      :order-tracking-id="checkoutTracking"
      :amount="checkoutAmount"
      :provider-fee="checkoutFee"
      :total-amount="checkoutTotal"
      success-message="Payment received. Your wallet is being topped up."
      @close="closeCheckout"
      @completed="onCheckoutCompleted"
      @failed="onCheckoutFailed"
    />

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slideIn" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { resellerGet } from '../../api/reseller'
import { apiPost, apiGet } from '../../api/client'
import ClickPesaCheckoutModal from '../../components/PesapalCheckoutModal.vue'

const route = useRoute()
const amount = ref(10000)
const phone = ref('')
const loading = ref(true)
const loadingPay = ref(false)
const error = ref('')
const success = ref('')
const currentBalance = ref(0)
const quickAmounts = [5000, 10000, 20000, 50000, 100000, 200000]
const showCheckout = ref(false)
const checkoutUrl = ref('')
const checkoutTracking = ref('')
const checkoutAmount = ref(0)
const checkoutFee = ref(0)
const checkoutTotal = ref(0)
const topups = ref([])
const toast = ref(null)

const totalToppedUp = computed(() => topups.value.reduce((s, t) => s + parseFloat(t.amount || 0), 0))
const lastTopUp = computed(() => topups.value.length ? new Date(topups.value[0].created_at).toLocaleDateString() : '—')

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

onMounted(async () => {
  await loadAll()
  await handlePaymentReturn()
})

async function loadAll() {
  loading.value = true
  try {
    const [earnings, tps] = await Promise.all([resellerGet('/earnings'), resellerGet('/topups')])
    currentBalance.value = earnings.wallet?.balance || 0
    topups.value = tps.data || []
    if (!Array.isArray(topups.value)) topups.value = []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
  try {
    const r = await apiGet('/me')
    if (r.user?.phone_number) phone.value = r.user.phone_number
  } catch {}
}

async function handlePaymentReturn() {
  const tracking = route.query.order_tracking_id
  if (!tracking) {
    if (route.query.payment === 'failed') error.value = 'Malipo hayajakamilika. Tafadhali jaribu tena.'
    return
  }
  try {
    const r = await apiGet(`/payments/status/${encodeURIComponent(tracking)}`)
    if (r.status === 'completed') {
      success.value = r.message || 'Malipo yamekamilika! Salio limeongezwa.'
      error.value = ''
      await loadAll()
      showToast(success.value)
    } else if (r.status === 'failed') {
      error.value = r.message || 'Malipo hayajakamilika. Tafadhali jaribu tena.'
    } else {
      success.value = r.message || 'Malipo bado hayajakamilika. Tafadhali subiri kidogo kisha fungua ukurasa huu tena.'
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Imeshindikana kuthibitisha malipo.'
  }
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
  loadingPay.value = true
  try {
    let r
    try {
      r = await apiPost('/clickpesa/pay', {
        purpose: 'reseller_topup',
        amount: amount.value,
        phoneNumber: localPhone,
      })
    } catch {
      r = await apiPost('/payments/wallet/topup', {
        amount: amount.value,
        phone_number: localPhone,
        return_path: '/reseller/topup',
      })
    }
    if (r.success && (r.redirect_url || r.checkout_url)) {
      checkoutUrl.value = r.redirect_url || r.checkout_url || ''
      checkoutTracking.value = r.order_tracking_id || r.orderReference || ''
      checkoutAmount.value = Number(amount.value || 0)
      checkoutFee.value = Number(r.providerFee || 0)
      checkoutTotal.value = Number(r.customerTotal || amount.value || 0)
      showCheckout.value = true
      loadingPay.value = false
      return
    } else if (r.success && r.orderReference) {
      checkoutUrl.value = ''
      checkoutTracking.value = r.orderReference
      checkoutAmount.value = Number(amount.value || 0)
      checkoutFee.value = Number(r.providerFee || 0)
      checkoutTotal.value = Number(r.customerTotal || amount.value || 0)
      showCheckout.value = true
      loadingPay.value = false
      return
    }
    error.value = r.error || 'Error'
    loadingPay.value = false
  } catch (e) { error.value = e.response?.data?.error || e.message || 'Network error'; loadingPay.value = false }
}

async function onCheckoutCompleted(payload) {
  success.value = payload?.message || 'Malipo yamekamilika! Salio limeongezwa.'
  error.value = ''
  showToast(success.value)
  await loadAll()
}

function onCheckoutFailed(payload) {
  error.value = payload?.message || 'Malipo hayajakamilika. Tafadhali jaribu tena.'
}

function closeCheckout() {
  showCheckout.value = false
  checkoutUrl.value = ''
  checkoutTracking.value = ''
  checkoutAmount.value = 0
  checkoutFee.value = 0
  checkoutTotal.value = 0
}
</script>
