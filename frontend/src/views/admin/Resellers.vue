<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex gap-2">
        <input v-model="search" @input="loadResellers" placeholder="Search by phone/name..." class="input w-64">
      </div>
    </div>

    <div v-if="selectedReseller" class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <button @click="selectedReseller = null" class="text-sm text-brand-600 hover:underline mb-2 inline-block"><i class="fas fa-arrow-left mr-1"></i> Back</button>
          <h3 class="text-lg font-bold text-gray-800">{{ selectedReseller.name }}</h3>
          <p class="text-sm text-gray-500">{{ selectedReseller.phone_number }}</p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold text-green-600">TSH {{ Number(selectedWallet?.balance || 0).toLocaleString() }}</p>
          <p class="text-xs text-gray-400 mb-2">Wallet Balance</p>
          <div class="flex gap-1 justify-end">
            <button @click="showDeposit = true" class="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"><i class="fas fa-plus mr-0.5"></i>Deposit</button>
            <button @click="showDeduct = true" class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"><i class="fas fa-minus mr-0.5"></i>Deduct</button>
          </div>
        </div>
      </div>

      <div v-if="showDeposit" class="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-green-800">Deposit funds to wallet</span>
          <button @click="showDeposit = false" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        </div>
        <div class="flex gap-2">
          <input v-model="adjustAmount" type="number" min="100" placeholder="Amount..." class="input flex-1 text-sm">
          <input v-model="adjustNote" type="text" placeholder="Reason (optional)" class="input flex-1 text-sm">
          <button @click="adjustWallet('deposit')" :disabled="adjusting" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">{{ adjusting ? '...' : 'Deposit' }}</button>
        </div>
        <p v-if="adjustError" class="text-xs text-red-600 mt-1">{{ adjustError }}</p>
      </div>

      <div v-if="showDeduct" class="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-red-800">Deduct funds from wallet</span>
          <button @click="showDeduct = false" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        </div>
        <div class="flex gap-2">
          <input v-model="adjustAmount" type="number" min="100" placeholder="Amount..." class="input flex-1 text-sm">
          <input v-model="adjustNote" type="text" placeholder="Reason (optional)" class="input flex-1 text-sm">
          <button @click="adjustWallet('deduct')" :disabled="adjusting" class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">{{ adjusting ? '...' : 'Deduct' }}</button>
        </div>
        <p v-if="adjustError" class="text-xs text-red-600 mt-1">{{ adjustError }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-blue-50 rounded-lg p-3"><p class="text-xs text-blue-600 font-medium">Total Vouchers</p><p class="text-lg font-bold text-blue-800">{{ selectedStats?.totalVouchers || 0 }}</p></div>
        <div class="bg-green-50 rounded-lg p-3"><p class="text-xs text-green-600 font-medium">Redeemed</p><p class="text-lg font-bold text-green-800">{{ selectedStats?.redeemedVouchers || 0 }}</p></div>
        <div class="bg-amber-50 rounded-lg p-3"><p class="text-xs text-amber-600 font-medium">Batches</p><p class="text-lg font-bold text-amber-800">{{ selectedBatches?.length || 0 }}</p></div>
      </div>

      <h4 class="section-title mb-3">Voucher Batches</h4>
      <table class="tbl-shadcn mb-6">
        <thead><tr><th>Batch Name</th><th>Count</th><th>Value</th><th>Redeemed</th><th>Date</th></tr></thead>
        <tbody>
          <tr v-for="b in selectedBatches" :key="b.id">
            <td class="font-medium text-gray-800">{{ b.batch_name }}</td>
            <td>{{ b.total_vouchers }}</td>
            <td>TSH {{ Number(b.total_value).toLocaleString() }}</td>
            <td>{{ b.redeemed || 0 }}</td>
            <td class="text-gray-400 text-xs">{{ new Date(b.created_at).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>

      <h4 class="section-title mb-3">Transaction History</h4>
      <table class="tbl-shadcn">
        <thead><tr><th>Type</th><th>Amount</th><th>Status</th><th>Description</th><th>Date</th></tr></thead>
        <tbody>
          <tr v-for="t in selectedTransactions" :key="t.id">
            <td><span class="badge text-xs" :class="t.transaction_type === 'deposit' ? 'badge-success' : t.transaction_type === 'withdrawal' ? 'badge-warning' : 'badge-info'">{{ t.transaction_type }}</span></td>
            <td class="font-medium text-gray-800">TSH {{ Number(t.amount).toLocaleString() }}</td>
            <td><span class="badge text-xs" :class="t.status === 'completed' ? 'badge-success' : t.status === 'pending' ? 'badge-warning' : 'badge-danger'">{{ t.status }}</span></td>
            <td class="text-xs text-gray-500 max-w-xs truncate">{{ t.description || '—' }}</td>
            <td class="text-xs text-gray-500">{{ new Date(t.created_at).toLocaleDateString() }}</td>
          </tr>
          <tr v-if="!selectedTransactions?.length"><td colspan="5" class="text-center text-gray-400 py-4">No transactions</td></tr>
        </tbody>
      </table>
    </div>

    <div v-else class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Name</th><th>Phone</th><th>Wallet</th><th>Vouchers</th><th>Redeemed</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>
            <tr v-for="r in resellers" :key="r.id">
              <td class="font-medium text-gray-800">{{ r.name }}</td>
              <td>{{ r.phone_number }}</td>
              <td class="font-semibold text-gray-800">TSH {{ Number(r.wallet_balance).toLocaleString() }}</td>
              <td>{{ r.total_vouchers }}</td>
              <td>{{ r.redeemed_vouchers }}</td>
              <td><span class="badge" :class="r.is_active ? 'badge-success' : 'badge-danger'">{{ r.is_active ? 'Active' : 'Inactive' }}</span></td>
              <td class="text-xs text-gray-500">{{ new Date(r.created_at).toLocaleDateString() }}</td>
              <td><button @click="viewReseller(r.id)" class="text-brand-600 hover:underline text-xs"><i class="fas fa-eye mr-1"></i> View</button></td>
            </tr>
            <tr v-if="resellers.length === 0"><td colspan="8" class="text-center text-gray-400 py-8">No resellers</td></tr>
          </tbody>
        </table>
        <div v-if="pagination.pages > 1" class="flex items-center justify-between pt-4">
          <p class="text-sm text-gray-500">Total: {{ pagination.total }}</p>
          <div class="flex gap-2">
            <button @click="page = Math.max(1, page - 1); loadResellers()" :disabled="page === 1" class="btn btn-outline btn-xs">Previous</button>
            <span class="px-3 py-1 text-sm text-gray-600">{{ page }} / {{ pagination.pages }}</span>
            <button @click="page = Math.min(pagination.pages, page + 1); loadResellers()" :disabled="page === pagination.pages" class="btn btn-outline btn-xs">Next</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const resellers = ref([])
const search = ref('')
const page = ref(1)
const pagination = ref({})
const selectedReseller = ref(null)
const selectedWallet = ref(null)
const selectedBatches = ref([])
const selectedTransactions = ref([])
const selectedStats = ref({})
const showDeposit = ref(false)
const showDeduct = ref(false)
const adjustAmount = ref(0)
const adjustNote = ref('')
const adjusting = ref(false)
const adjustError = ref('')

onMounted(loadResellers)

async function loadResellers() {
  try { const r = await adminGet(`/resellers?search=${search.value}&page=${page.value}&limit=20`); resellers.value = r.data || []; pagination.value = r.pagination || {} }
  catch (e) { console.error(e) }
}
async function viewReseller(id) {
  try {
    const r = await adminGet(`/resellers/${id}`)
    selectedReseller.value = r.user; selectedWallet.value = r.wallet; selectedBatches.value = r.batches || []; selectedTransactions.value = r.transactions || []
    selectedStats.value = { totalVouchers: (r.batches || []).reduce((s, b) => s + Number(b.total_vouchers), 0), redeemedVouchers: (r.batches || []).reduce((s, b) => s + Number(b.redeemed || 0), 0) }
  } catch (e) { console.error(e) }
}
async function adjustWallet(action) {
  adjustError.value = ''
  if (!adjustAmount.value || adjustAmount.value < 100) { adjustError.value = 'Minimum amount is TSH 100'; return }
  adjusting.value = true
  try {
    const r = await adminPost(`/resellers/${selectedReseller.value.id}/${action}`, { amount: adjustAmount.value, description: adjustNote.value || `${action === 'deposit' ? 'Admin deposit' : 'Admin deduction'}` })
    if (r.success) { adjustAmount.value = 0; adjustNote.value = ''; showDeposit.value = false; showDeduct.value = false; await viewReseller(selectedReseller.value.id) }
    else { adjustError.value = r.message || 'Error' }
  } catch (e) { adjustError.value = e.response?.data?.error || e.message || 'Error' }
  finally { adjusting.value = false }
}
</script>
