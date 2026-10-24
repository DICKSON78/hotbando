<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Reseller Management</h2>
        <p class="text-sm" style="color: #6b7280">Tiers, commissions, performance tracking</p>
      </div>
      <button @click="loadAll()" class="btn btn-secondary btn-sm"><i class="fas fa-sync-alt"></i> Refresh</button>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Total Resellers</p><p class="stat-value">{{ summary.total || 0 }}</p></div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-store"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Active</p><p class="stat-value" style="color: #34d399">{{ summary.active || 0 }}</p></div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-check-circle"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Total Balance</p><p class="stat-value" style="color: #f59e0b">TSh {{ fmtNum(summary.total_balance) }}</p></div>
          <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b"><i class="fas fa-wallet"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Total Earned</p><p class="stat-value" style="color: #a78bfa">TSh {{ fmtNum(summary.total_earned) }}</p></div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-coins"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Avg Commission</p><p class="stat-value" style="color: #FF7A30">{{ summary.avg_commission || 10 }}%</p></div>
          <div class="stat-icon" style="background: rgba(255,122,48,0.1); color: #FF7A30"><i class="fas fa-percent"></i></div>
        </div>
      </div>
    </div>

    <!-- Tier Legend -->
    <div class="section-card p-4">
      <div class="flex flex-wrap gap-3">
        <div v-for="t in tiers" :key="t.key" class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" :style="{ background: t.bg, color: t.color, border: '1px solid ' + t.border }">
          <i :class="t.icon"></i> {{ t.label }} — {{ t.desc }}
        </div>
      </div>
    </div>

    <!-- RESELLER LIST -->
    <template v-if="!selectedReseller">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-store" style="color: #FF7A30"></i> All Resellers</h3>
          <div class="flex gap-2 flex-wrap">
            <input v-model="search" @input="debouncedLoad" placeholder="Search..." class="form-input" style="max-width: 200px">
            <select v-model="tierFilter" @change="loadResellers()" class="form-input" style="max-width: 130px">
              <option value="">All Tiers</option>
              <option v-for="t in tiers" :key="t.key" :value="t.key">{{ t.label }}</option>
            </select>
          </div>
        </div>
        <div class="section-body">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr style="border-bottom: 1px solid var(--border)">
                <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Reseller</th>
                <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Tier</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Balance</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Total Earned</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Vouchers</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Redeemed</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Revenue</th>
                <th class="text-center py-3 px-4 text-xs font-medium" style="color: #6b7280">Status</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Actions</th>
              </tr></thead>
              <tbody>
                <tr v-for="r in resellers" :key="r.id" @click="viewReseller(r)" style="border-bottom: 1px solid rgba(30,30,42,0.5)" class="hover:bg-white/[0.02] cursor-pointer">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" :style="{ background: tierColor(r.tier) }">{{ initials(r.name) }}</div>
                      <div><p class="font-medium text-white text-sm">{{ r.name }}</p><p class="text-xs" style="color: #6b7280">{{ r.phone_number }}</p></div>
                    </div>
                  </td>
                  <td class="py-3 px-4"><span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="tierBadgeClass(r.tier)">{{ (r.tier || 'bronze').toUpperCase() }}</span></td>
                  <td class="py-3 px-4 text-right text-xs font-medium text-white">TSh {{ fmtNum(r.balance) }}</td>
                  <td class="py-3 px-4 text-right text-xs text-white">TSh {{ fmtNum(r.total_earned) }}</td>
                  <td class="py-3 px-4 text-right text-xs" style="color: #6b7280">{{ r.total_vouchers_sold || 0 }}</td>
                  <td class="py-3 px-4 text-right text-xs" style="color: #6b7280">{{ r.redeemed_count || 0 }}</td>
                  <td class="py-3 px-4 text-right text-xs font-medium" style="color: #34d399">TSh {{ fmtNum(r.revenue_generated) }}</td>
                  <td class="py-3 px-4 text-center"><span class="text-xs px-2 py-0.5 rounded-full" :class="r.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'">{{ r.is_active ? 'ACTIVE' : 'OFF' }}</span></td>
                  <td class="py-3 px-4 text-right"><i class="fas fa-chevron-right text-xs" style="color: #6b7280"></i></td>
                </tr>
                <tr v-if="!resellers.length"><td colspan="9" class="text-center py-12" style="color: #6b7280"><p>No resellers found</p></td></tr>
              </tbody>
            </table>
          </div>
          <div v-if="pagination.pages > 1" class="flex items-center justify-between mt-4 pt-4" style="border-top: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Showing {{ resellers.length }} of {{ pagination.total }}</p>
            <div class="flex gap-1">
              <button @click="goPage(pagination.page - 1)" :disabled="pagination.page <= 1" class="btn btn-ghost btn-sm">Prev</button>
              <span class="text-xs px-3 py-1" style="color: #6b7280">{{ pagination.page }}/{{ pagination.pages }}</span>
              <button @click="goPage(pagination.page + 1)" :disabled="pagination.page >= pagination.pages" class="btn btn-ghost btn-sm">Next</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- RESELLER DETAIL VIEW -->
    <template v-if="selectedReseller">
      <div class="flex items-center gap-3 mb-4">
        <button @click="selectedReseller = null" class="btn btn-ghost btn-sm"><i class="fas fa-arrow-left mr-1"></i> Back</button>
        <h3 class="text-lg font-bold text-white">{{ selectedReseller.name }}</h3>
        <span class="text-xs px-2 py-0.5 rounded-full" :class="tierBadgeClass(selectedReseller.tier)">{{ (selectedReseller.tier || 'bronze').toUpperCase() }}</span>
      </div>

      <!-- Detail Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="stat-card">
          <p class="stat-label">Wallet Balance</p>
          <p class="stat-value" style="color: #f59e0b">TSh {{ fmtNum(selectedReseller.balance) }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Total Earned</p>
          <p class="stat-value" style="color: #34d399">TSh {{ fmtNum(selectedReseller.total_earned) }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Commission Rate</p>
          <p class="stat-value" style="color: #FF7A30">{{ selectedReseller.commission_rate || 10 }}%</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Vouchers Sold</p>
          <p class="stat-value">{{ selectedReseller.total_vouchers_sold || 0 }}</p>
        </div>
      </div>

      <!-- Wallet Controls -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div class="section-card">
          <div class="section-header"><h3 class="section-title"><i class="fas fa-plus-circle" style="color: #34d399"></i> Deposit</h3></div>
          <div class="section-body space-y-3">
            <input v-model.number="depositAmount" type="number" class="form-input" placeholder="Amount (TSh)" min="100">
            <input v-model="depositNote" class="form-input" placeholder="Note (optional)">
            <button @click="doDeposit()" class="btn btn-primary w-full" :disabled="depositAmount < 100 || loadingAction">
              <i v-if="loadingAction" class="fas fa-spinner fa-spin mr-1"></i> Deposit TSh {{ fmtNum(depositAmount) }}
            </button>
          </div>
        </div>
        <div class="section-card">
          <div class="section-header"><h3 class="section-title"><i class="fas fa-minus-circle" style="color: #f87171"></i> Deduct</h3></div>
          <div class="section-body space-y-3">
            <input v-model.number="deductAmount" type="number" class="form-input" placeholder="Amount (TSh)" min="100">
            <input v-model="deductNote" class="form-input" placeholder="Reason (required)">
            <button @click="doDeduct()" class="btn btn-sm w-full" :disabled="deductAmount < 100 || !deductNote || loadingAction" style="background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2)">
              <i v-if="loadingAction" class="fas fa-spinner fa-spin mr-1"></i> Deduct TSh {{ fmtNum(deductAmount) }}
            </button>
          </div>
        </div>
      </div>

      <!-- Tier Management -->
      <div class="section-card mb-6">
        <div class="section-header"><h3 class="section-title"><i class="fas fa-medal" style="color: #a78bfa"></i> Tier Management</h3></div>
        <div class="section-body">
          <div class="flex gap-2 flex-wrap">
            <button v-for="t in tiers" :key="t.key" @click="updateTier(t.key)"
              class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              :style="selectedReseller.tier === t.key ? `background: ${t.bg}; color: ${t.color}; border: 1px solid ${t.border}` : 'background: #0a0a0f; border: 1px solid var(--border); color: #6b7280'">
              <i :class="t.icon" class="mr-1"></i> {{ t.label }}
            </button>
          </div>
          <div class="mt-3 flex items-center gap-3">
            <label class="text-xs" style="color: #6b7280">Commission Rate:</label>
            <input v-model.number="commissionRate" type="number" min="1" max="50" class="form-input" style="width: 80px">
            <span class="text-xs" style="color: #6b7280">%</span>
            <button @click="updateCommission()" class="btn btn-primary btn-sm">Save</button>
          </div>
        </div>
      </div>

      <!-- Sales Performance Chart -->
      <div v-if="performance.length" class="section-card mb-6">
        <div class="section-header"><h3 class="section-title"><i class="fas fa-chart-bar" style="color: #FF7A30"></i> Sales Performance (30 days)</h3></div>
        <div class="section-body">
          <div class="flex items-end gap-1" style="height: 100px">
            <div v-for="(p, i) in performance" :key="i" class="flex-1 rounded-t" :title="p.day + ': ' + p.sales + ' sales, TSh ' + fmtNum(p.revenue)"
              :style="{ height: perfHeight(p.sales) + '%', background: 'linear-gradient(to top, #34d399, #10b981)' }"></div>
          </div>
          <div class="flex justify-between mt-2 text-xs" style="color: #6b7280">
            <span>{{ performance.length }} days with sales</span>
            <span>Total: {{ performance.reduce((a,b) => a + b.sales, 0) }} sales / TSh {{ fmtNum(performance.reduce((a,b) => a + b.revenue, 0)) }}</span>
          </div>
        </div>
      </div>

      <!-- Batches & Transactions -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="section-card">
          <div class="section-header"><h3 class="section-title"><i class="fas fa-boxes" style="color: #60a5fa"></i> Voucher Batches</h3></div>
          <div class="section-body">
            <div v-for="b in detailBatches" :key="b.id" class="flex items-center justify-between p-2.5 rounded-lg mb-2" style="background: #0a0a0f; border: 1px solid var(--border)">
              <div>
                <p class="text-xs font-medium text-white">{{ b.batch_name || 'Batch #' + b.id }}</p>
                <p class="text-xs" style="color: #6b7280">{{ fmtDate(b.created_at) }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-white">{{ b.redeemed || 0 }}/{{ b.total_vouchers || 0 }} redeemed</p>
                <div class="h-1.5 rounded-full mt-1" style="background: #1e1e2a; width: 80px">
                  <div class="h-full rounded-full" :style="{ width: batchPct(b) + '%', background: '#34d399' }"></div>
                </div>
              </div>
            </div>
            <p v-if="!detailBatches.length" class="text-xs text-center py-4" style="color: #6b7280">No batches yet</p>
          </div>
        </div>
        <div class="section-card">
          <div class="section-header"><h3 class="section-title"><i class="fas fa-exchange-alt" style="color: #a78bfa"></i> Transaction History</h3></div>
          <div class="section-body max-h-80 overflow-y-auto">
            <div v-for="t in detailTransactions" :key="t.id" class="flex items-center justify-between p-2.5 rounded-lg mb-2" style="background: #0a0a0f; border: 1px solid var(--border)">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full flex items-center justify-center" :style="{ background: t.transaction_type === 'deposit' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }">
                  <i class="fas text-xs" :class="t.transaction_type === 'deposit' ? 'fa-arrow-down text-green-400' : 'fa-arrow-up text-red-400'"></i>
                </div>
                <div>
                  <p class="text-xs font-medium text-white">{{ t.description || t.transaction_type }}</p>
                  <p class="text-xs" style="color: #6b7280">{{ fmtDate(t.created_at) }}</p>
                </div>
              </div>
              <span class="text-xs font-medium" :class="t.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'">
                {{ t.transaction_type === 'deposit' ? '+' : '-' }}TSh {{ fmtNum(t.amount) }}
              </span>
            </div>
            <p v-if="!detailTransactions.length" class="text-xs text-center py-4" style="color: #6b7280">No transactions</p>
          </div>
        </div>
      </div>
    </template>

    <div v-if="toast.show" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const loading = ref(false)
const loadingAction = ref(false)
const search = ref('')
const tierFilter = ref('')
const resellers = ref([])
const summary = ref({})
const selectedReseller = ref(null)
const detailBatches = ref([])
const detailTransactions = ref([])
const performance = ref([])
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 })

const depositAmount = ref(0)
const depositNote = ref('')
const deductAmount = ref(0)
const deductNote = ref('')
const commissionRate = ref(10)

const toast = ref({ show: false, message: '', type: 'success' })
function showToast(msg, type = 'success') { toast.value = { show: true, message: msg, type }; setTimeout(() => toast.value.show = false, 3000) }

const tiers = [
  { key: 'bronze', label: 'Bronze', desc: '10% commission', icon: 'fas fa-medal', bg: 'rgba(180,130,80,0.15)', color: '#cd7f32', border: 'rgba(180,130,80,0.3)' },
  { key: 'silver', label: 'Silver', desc: '12% commission', icon: 'fas fa-medal', bg: 'rgba(192,192,192,0.15)', color: '#c0c0c0', border: 'rgba(192,192,192,0.3)' },
  { key: 'gold', label: 'Gold', desc: '15% commission', icon: 'fas fa-medal', bg: 'rgba(255,215,0,0.15)', color: '#ffd700', border: 'rgba(255,215,0,0.3)' },
  { key: 'platinum', label: 'Platinum', desc: '20% commission', icon: 'fas fa-crown', bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: 'rgba(139,92,246,0.3)' }
]

function tierColor(tier) { return tiers.find(t => t.key === tier)?.color || '#cd7f32' }
function tierBadgeClass(tier) {
  const m = { bronze: 'bg-orange-500/10 text-orange-400', silver: 'bg-gray-400/10 text-gray-300', gold: 'bg-yellow-500/10 text-yellow-400', platinum: 'bg-purple-500/10 text-purple-400' }
  return m[tier] || m.bronze
}

function fmtNum(n) { return Number(n || 0).toLocaleString() }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
function initials(name) { return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }
function batchPct(b) { return b.total_vouchers > 0 ? (b.redeemed / b.total_vouchers * 100) : 0 }
function perfHeight(n) { const max = Math.max(...performance.value.map(p => p.sales), 1); return (n / max) * 100 }

let searchTimeout = null
function debouncedLoad() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => loadResellers(), 300) }

async function loadResellers() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: pagination.value.page, limit: 20 })
    if (search.value) params.set('search', search.value)
    if (tierFilter.value) params.set('tier', tierFilter.value)
    const r = await adminGet('/business/resellers?' + params.toString())
    resellers.value = r.resellers || []
    summary.value = r.summary || {}
    pagination.value = r.pagination || { page: 1, limit: 20, total: 0, pages: 0 }
  } catch (e) { console.error(e) }
  loading.value = false
}

function goPage(p) { pagination.value.page = p; loadResellers() }

async function viewReseller(r) {
  try {
    const detail = await adminGet('/business/resellers/' + r.id)
    selectedReseller.value = detail.reseller
    detailBatches.value = detail.batches || []
    detailTransactions.value = detail.transactions || []
    performance.value = detail.performance || []
    commissionRate.value = detail.reseller.commission_rate || 10
  } catch (e) { showToast('Failed to load details', 'error') }
}

async function doDeposit() {
  if (!selectedReseller.value || depositAmount.value < 100) return
  loadingAction.value = true
  try {
    const r = await adminPost('/resellers/' + selectedReseller.value.id + '/deposit', { amount: depositAmount.value, description: depositNote.value || 'Admin deposit' })
    selectedReseller.value.balance = r.balance
    depositAmount.value = 0; depositNote.value = ''
    showToast('Deposit successful')
    viewReseller(selectedReseller.value)
  } catch (e) { showToast('Failed: ' + (e.response?.data?.error || e.message), 'error') }
  loadingAction.value = false
}

async function doDeduct() {
  if (!selectedReseller.value || deductAmount.value < 100 || !deductNote.value) return
  loadingAction.value = true
  try {
    const r = await adminPost('/resellers/' + selectedReseller.value.id + '/deduct', { amount: deductAmount.value, description: deductNote.value })
    selectedReseller.value.balance = r.balance
    deductAmount.value = 0; deductNote.value = ''
    showToast('Deduction successful')
    viewReseller(selectedReseller.value)
  } catch (e) { showToast('Failed: ' + (e.response?.data?.error || e.message), 'error') }
  loadingAction.value = false
}

async function updateTier(tier) {
  try {
    await adminPost('/business/resellers/' + selectedReseller.value.id + '/tier', { tier })
    selectedReseller.value.tier = tier
    showToast('Tier updated to ' + tier.toUpperCase())
  } catch (e) { showToast('Failed', 'error') }
}

async function updateCommission() {
  try {
    await adminPost('/business/resellers/' + selectedReseller.value.id + '/tier', { commission_rate: commissionRate.value })
    selectedReseller.value.commission_rate = commissionRate.value
    showToast('Commission updated')
  } catch (e) { showToast('Failed', 'error') }
}

async function loadAll() { await loadResellers() }
onMounted(loadAll)
</script>
