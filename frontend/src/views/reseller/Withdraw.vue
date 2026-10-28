<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Withdraw Funds</h2>
        <p class="text-sm" style="color: #6b7280">Request withdrawals and track your payout history</p>
      </div>
      <button @click="loadAll" class="btn btn-secondary btn-sm" :disabled="loading">
        <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Available Balance</p>
            <p class="stat-value" style="color: #34d399">TSH {{ balance.toLocaleString() }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-wallet"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">Total earned: TSH {{ totalEarned.toLocaleString() }}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total Withdrawn</p>
            <p class="stat-value" style="color: #fbbf24">TSH {{ totalWithdrawn.toLocaleString() }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(245,158,11,0.08); color: #fbbf24"><i class="fas fa-money-bill-wave"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">{{ withdrawals.length }} withdrawals</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Processed</p>
            <p class="stat-value" style="color: #60a5fa">{{ processedCount }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-check-circle"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">Completed payouts</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Pending</p>
            <p class="stat-value" style="color: #facc15">{{ pendingCount }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(250,204,21,0.1); color: #facc15"><i class="fas fa-hourglass-half"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">Awaiting processing</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Withdraw Form -->
      <div class="lg:col-span-1 section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-plus-circle" style="color: #FF7A30"></i> New Withdrawal</h3>
        </div>
        <div class="section-body">
          <form @submit.prevent="submitWithdraw" class="space-y-4">
            <div>
              <label class="input-label">Amount (TSH)</label>
              <input v-model.number="amount" type="number" min="5000" required class="input w-full" :max="balance" placeholder="10000">
              <p class="text-xs mt-1" style="color: #6b7280">Minimum: TSH 5,000</p>
            </div>
            <div>
              <label class="input-label">Phone Number (M-Pesa)</label>
              <input v-model="phone" type="tel" required class="input w-full" placeholder="0755123456">
            </div>
            <div>
              <label class="input-label">Payment Method</label>
              <select v-model="method" class="input w-full">
                <option value="mpesa">M-Pesa</option>
                <option value="tigopesa">Tigo Pesa</option>
                <option value="airtel">Airtel Money</option>
              </select>
            </div>
            <p v-if="error" class="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{{ error }}</p>
            <p v-if="success" class="text-green-400 text-sm bg-green-500/10 p-3 rounded-lg">{{ success }}</p>
            <button type="submit" :disabled="submitting" class="btn btn-primary w-full justify-center py-2.5">
              <i v-if="submitting" class="fas fa-spinner fa-spin mr-2"></i>
              <i v-else class="fas fa-paper-plane mr-2"></i>
              {{ submitting ? 'Processing...' : 'Submit Withdrawal' }}
            </button>
          </form>
        </div>
      </div>

      <!-- History -->
      <div class="lg:col-span-2 section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-history" style="color: #FF7A30"></i> Withdrawal History</h3>
          <select v-model="statusFilter" @change="loadWithdrawals" class="form-input" style="max-width: 160px">
            <option value="all">All</option>
            <option value="processed">Processed</option>
            <option value="pending">Pending</option>
          </select>
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
                  <th>Method</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in filteredWithdrawals" :key="w.id">
                  <td class="font-medium text-white">#{{ w.id }}</td>
                  <td class="font-semibold text-white">TSH {{ Number(w.amount).toLocaleString() }}</td>
                  <td style="color: #d1d5db">{{ w.payment_method || '—' }}</td>
                  <td style="color: #d1d5db">{{ w.payment_phone || '—' }}</td>
                  <td>
                    <span class="badge" :class="w.status === 'processed' ? 'badge-green' : w.status === 'pending' ? 'badge-yellow' : 'badge-red'">
                      {{ w.status === 'processed' ? 'Processed' : w.status === 'pending' ? 'Pending' : w.status }}
                    </span>
                  </td>
                  <td class="text-xs" style="color: #6b7280">{{ new Date(w.created_at).toLocaleDateString() }}</td>
                  <td>
                    <button v-if="w.status === 'pending'" @click="cancelWithdrawal(w.id)" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(239,68,68,0.1); color: #f87171" title="Cancel">
                      <i class="fas fa-times text-xs"></i>
                    </button>
                    <span v-else class="text-xs" style="color: #6b7280">—</span>
                  </td>
                </tr>
                <tr v-if="!filteredWithdrawals.length">
                  <td colspan="7" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-money-bill-wave text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No withdrawals yet
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slideIn" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { resellerGet, resellerPost, resellerDelete } from '../../api/reseller'

const balance = ref(0)
const totalEarned = ref(0)
const amount = ref(10000)
const phone = ref('')
const method = ref('mpesa')
const error = ref('')
const success = ref('')
const submitting = ref(false)
const loading = ref(true)
const statusFilter = ref('all')
const withdrawals = ref([])
const toast = ref(null)

const totalWithdrawn = computed(() => withdrawals.value.reduce((s, w) => s + parseFloat(w.amount || 0), 0))
const processedCount = computed(() => withdrawals.value.filter(w => w.status === 'processed').length)
const pendingCount = computed(() => withdrawals.value.filter(w => w.status === 'pending').length)
const filteredWithdrawals = computed(() => {
  if (statusFilter.value === 'all') return withdrawals.value
  return withdrawals.value.filter(w => w.status === statusFilter.value)
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    const [earnings, wds] = await Promise.all([resellerGet('/earnings'), resellerGet('/withdrawals')])
    balance.value = earnings.wallet?.balance || 0
    totalEarned.value = earnings.wallet?.total_earned || 0
    withdrawals.value = wds.data || wds || []
    if (!Array.isArray(withdrawals.value)) withdrawals.value = []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadWithdrawals() {
  try {
    const wds = await resellerGet('/withdrawals')
    withdrawals.value = wds.data || wds || []
    if (!Array.isArray(withdrawals.value)) withdrawals.value = []
  } catch {}
}

async function submitWithdraw() {
  error.value = ''; success.value = ''
  if (amount.value < 5000) { error.value = 'Minimum amount is TSH 5,000'; return }
  if (amount.value > balance.value) { error.value = 'Insufficient balance'; return }
  if (!phone.value.match(/^0[0-9]{9}$/)) { error.value = 'Invalid phone number'; return }
  submitting.value = true
  try {
    const r = await resellerPost('/withdraw', { amount: amount.value, payment_method: method.value, payment_phone: phone.value })
    success.value = r.message || 'Withdrawal processed'; amount.value = 10000; phone.value = ''
    await loadAll()
    showToast(success.value)
  } catch (e) { error.value = e.response?.data?.message || 'Failed to submit withdrawal' }
  finally { submitting.value = false }
}

async function cancelWithdrawal(id) {
  if (!confirm('Cancel this withdrawal and refund balance?')) return
  try {
    await resellerDelete(`/withdrawals/${id}`)
    showToast('Withdrawal cancelled, balance refunded')
    await loadAll()
  } catch (e) {
    showToast(e.response?.data?.message || 'Failed to cancel', 'error')
  }
}
</script>