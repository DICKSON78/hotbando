<template>
  <div class="space-y-5">
    <div class="flex justify-end">
      <button @click="showModal = true" class="inline-flex items-center gap-2 bg-[#FF7A30] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#FF7A30]/90 transition shadow-sm">
        <i class="fas fa-plus"></i> New Investment
      </button>
    </div>

    <div class="bg-[#111118] rounded-2xl border border-[#1e1e2a] shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-[#1e1e2a]">
        <h3 class="section-title"><i class="fas fa-hand-holding-usd section-icon text-[#FF7A30]"></i> My Investments</h3>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Type</th>
              <th>Duration</th>
              <th>ROI%</th>
              <th>Status</th>
              <th>Invested</th>
              <th>Matures</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in investments" :key="inv.id">
              <td class="font-medium text-white">{{ formatMoney(inv.amount) }}</td>
              <td>{{ inv.type }}</td>
              <td>{{ inv.duration }} months</td>
              <td>{{ inv.roi }}%</td>
              <td><span class="badge" :class="statusClass(inv.status)">{{ inv.status }}</span></td>
              <td>{{ new Date(inv.invested_date).toLocaleDateString() }}</td>
              <td>{{ new Date(inv.matures_date).toLocaleDateString() }}</td>
            </tr>
            <tr v-if="!investments.length"><td colspan="7" class="text-center text-white/40 py-10">No investments yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-[#111118] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div class="px-6 py-4 border-b border-[#1e1e2a] flex items-center justify-between">
          <h3 class="font-bold text-white">New Investment</h3>
          <button @click="showModal = false" class="text-white/40 hover:text-white/60"><i class="fas fa-times"></i></button>
        </div>
        <form @submit.prevent="createInvestment" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/60 mb-1">Amount (TSh)</label>
            <input v-model="form.amount" type="number" min="1" required
              class="w-full rounded-xl border border-[#1e1e2a] bg-[#0a0a12] px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF7A30]/30 focus:border-[#FF7A30]" placeholder="e.g. 500000" />
          </div>
          <div>
            <label class="block text-sm font-medium text-white/60 mb-1">Type</label>
            <select v-model="form.type" required
              class="w-full rounded-xl border border-[#1e1e2a] bg-[#0a0a12] px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF7A30]/30 focus:border-[#FF7A30]">
              <option value="fixed">Fixed</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-white/60 mb-1">Duration</label>
            <select v-model="form.duration" required
              class="w-full rounded-xl border border-[#1e1e2a] bg-[#0a0a12] px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF7A30]/30 focus:border-[#FF7A30]">
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
            </select>
          </div>
          <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="showModal = false" class="flex-1 px-4 py-2.5 rounded-xl border border-[#1e1e2a] text-sm font-medium text-white/50 hover:bg-[#0a0a12] transition">Cancel</button>
            <button type="submit" :disabled="submitting" class="flex-1 px-4 py-2.5 rounded-xl bg-[#FF7A30] text-white text-sm font-semibold hover:bg-[#FF7A30]/90 transition disabled:opacity-50">
              {{ submitting ? 'Investing...' : 'Invest Now' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet, apiPost } from '../../api/client'

const investments = ref([])
const showModal = ref(false)
const submitting = ref(false)
const error = ref('')
const form = ref({ amount: '', type: 'fixed', duration: '3' })

function formatMoney(n) { return 'TSh ' + (Number(n || 0).toLocaleString()) }
function statusClass(s) {
  return s === 'active' ? 'badge-success' : s === 'matured' ? 'badge-warning' : s === 'pending' ? 'badge-info' : 'badge-danger'
}

onMounted(async () => {
  try { const r = await apiGet('/investor/investments'); investments.value = r.investments || r || [] }
  catch (e) { console.error(e) }
})

async function createInvestment() {
  submitting.value = true
  error.value = ''
  try {
    await apiPost('/investor/invest', { amount: Number(form.value.amount), type: form.value.type, duration: Number(form.value.duration) })
    showModal.value = false
    form.value = { amount: '', type: 'fixed', duration: '3' }
    const r = await apiGet('/investor/investments')
    investments.value = r.investments || r || []
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to create investment'
  } finally {
    submitting.value = false
  }
}
</script>
