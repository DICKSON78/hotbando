<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Revenue Sharing</h2>
        <p class="text-sm" style="color: #6b7280">Manage payouts and sharing rules</p>
      </div>
      <div class="flex gap-2">
        <button @click="triggerCalculation" class="btn btn-secondary btn-sm" :disabled="calculating">
          <i class="fas fa-calculator" :class="{ 'animate-spin': calculating }"></i> Recalculate
        </button>
        <button @click="loadAll" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total Pending</p>
            <p class="stat-value">{{ pendingPayouts.length }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(234,179,8,0.1); color: #facc15"><i class="fas fa-hourglass-half"></i></div>
        </div>
        <div class="mt-3 flex items-center gap-1 text-xs" style="color: #6b7280">
          TSh {{ pendingTotal.toLocaleString() }}
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Paid This Month</p>
            <p class="stat-value">TSh {{ paidThisMonth.toLocaleString() }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-check-circle"></i></div>
        </div>
        <div class="mt-3 flex items-center gap-1 text-xs" style="color: #6b7280">
          {{ paidCount }} payouts processed
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Active Rules</p>
            <p class="stat-value">{{ rules.length }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-file-invoice"></i></div>
        </div>
        <div class="mt-3 flex items-center gap-1 text-xs" style="color: #6b7280">
          Revenue share configurations
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 p-1 rounded-xl" style="background: #111118; border: 1px solid #1e1e2a">
      <button
        @click="activeTab = 'payouts'"
        class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
        :style="activeTab === 'payouts' ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'color: #6b7280'"
      >
        <i class="fas fa-money-bill-wave mr-2"></i> Payouts
      </button>
      <button
        @click="activeTab = 'rules'"
        class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
        :style="activeTab === 'rules' ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'color: #6b7280'"
      >
        <i class="fas fa-file-invoice mr-2"></i> Rules
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="stat-card animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl" style="background: #1e1e2a"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 w-40 rounded" style="background: #1e1e2a"></div>
            <div class="h-3 w-24 rounded" style="background: #1e1e2a"></div>
          </div>
          <div class="h-6 w-20 rounded" style="background: #1e1e2a"></div>
        </div>
      </div>
    </div>

    <!-- Payouts Tab -->
    <template v-else-if="activeTab === 'payouts'">
      <div class="section-card">
        <div class="section-header">
          <div class="flex items-center gap-3">
            <h3 class="section-title"><i class="fas fa-hourglass-half" style="color: #FF7A30"></i> Pending Payouts</h3>
            <span class="badge badge-yellow" v-if="selectedPayouts.length">{{ selectedPayouts.length }} selected</span>
          </div>
          <button
            v-if="selectedPayouts.length > 0"
            @click="batchApprove"
            class="btn btn-primary btn-sm"
            :disabled="batchProcessing"
          >
            <i class="fas fa-check-double mr-1"></i> Batch Approve ({{ selectedPayouts.length }})
          </button>
        </div>
        <div class="section-body">
          <div class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr>
                  <th style="width: 40px">
                    <input
                      type="checkbox"
                      :checked="allSelected"
                      @change="toggleAll"
                      class="w-4 h-4 rounded accent-orange-500"
                    />
                  </th>
                  <th>Franchise</th>
                  <th>Amount</th>
                  <th>Period</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in pendingPayouts" :key="p.share_id || p.id">
                  <td>
                    <input
                      type="checkbox"
                      :checked="selectedPayouts.includes(p.share_id || p.id)"
                      @change="toggleSelect(p)"
                      class="w-4 h-4 rounded accent-orange-500"
                    />
                  </td>
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(255,122,48,0.1)">
                        <i class="fas fa-store text-xs" style="color: #FF7A30"></i>
                      </div>
                      <div>
                        <p class="font-medium text-white text-sm">{{ p.franchise_name || p.partner_name || '—' }}</p>
                        <p class="text-xs" style="color: #6b7280">ID: {{ p.franchise_id || p.partner_id || '—' }}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p class="text-sm font-medium" style="color: #d1d5db">TSh {{ (p.amount || 0).toLocaleString() }}</p>
                  </td>
                  <td>
                    <span class="badge badge-blue">{{ p.period || p.period_start || '—' }}</span>
                  </td>
                  <td class="text-xs" style="color: #6b7280">
                    {{ p.created_at ? formatDate(p.created_at) : '—' }}
                  </td>
                  <td>
                    <div class="flex items-center gap-1">
                      <button
                        @click="processPayout(p)"
                        class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                        style="background: rgba(16,185,129,0.1); color: #34d399"
                        title="Approve"
                      >
                        <i class="fas fa-check text-xs"></i>
                      </button>
                      <button
                        @click="rejectPayout(p)"
                        class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                        style="background: rgba(239,68,68,0.1); color: #f87171"
                        title="Reject"
                      >
                        <i class="fas fa-times text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!pendingPayouts.length">
                  <td colspan="6" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-check-circle text-3xl mb-3 block" style="color: #34d399"></i>
                    No pending payouts
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Rules Tab -->
    <template v-else-if="activeTab === 'rules'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-file-invoice" style="color: #FF7A30"></i> Revenue Share Rules</h3>
          <button @click="openRuleModal()" class="btn btn-primary btn-sm">
            <i class="fas fa-plus mr-1"></i> Add Rule
          </button>
        </div>
        <div class="section-body">
          <div class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Percentage</th>
                  <th>Applies To</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rules" :key="r.rule_id || r.id">
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(139,92,246,0.1)">
                        <i class="fas fa-percentage text-xs" style="color: #a78bfa"></i>
                      </div>
                      <p class="font-medium text-white text-sm">{{ r.name || r.rule_name || '—' }}</p>
                    </div>
                  </td>
                  <td>
                    <p class="text-sm font-medium" style="color: #d1d5db">{{ r.percentage || 0 }}%</p>
                  </td>
                  <td>
                    <span class="badge badge-blue">{{ r.applies_to || r.target || '—' }}</span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="r.is_active !== false ? 'badge-green' : 'badge-gray'"
                    >
                      {{ r.is_active !== false ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="flex items-center gap-1">
                      <button
                        @click="openRuleModal(r)"
                        class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                        style="background: rgba(59,130,246,0.1); color: #60a5fa"
                        title="Edit"
                      >
                        <i class="fas fa-pen text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!rules.length">
                  <td colspan="5" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-file-invoice text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No rules configured
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Rule Modal -->
    <div v-if="showRuleModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showRuleModal = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-md rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white">{{ editingRule ? 'Edit Rule' : 'New Rule' }}</h3>
          <button @click="showRuleModal = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit.prevent="saveRule" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: #d1d5db">Rule Name</label>
            <input v-model="ruleForm.name" type="text" required class="form-input" placeholder="e.g. Franchise Share">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: #d1d5db">Percentage (%)</label>
            <input v-model.number="ruleForm.percentage" type="number" min="0" max="100" step="0.1" required class="form-input" placeholder="e.g. 30">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: #d1d5db">Applies To</label>
            <select v-model="ruleForm.applies_to" class="form-input">
              <option value="franchise">Franchise</option>
              <option value="sponsor">Sponsor</option>
              <option value="reseller">Reseller</option>
              <option value="platform">Platform</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: #d1d5db">Status</label>
            <select v-model="ruleForm.is_active" class="form-input">
              <option :value="true">Active</option>
              <option :value="false">Inactive</option>
            </select>
          </div>

          <div class="flex gap-3 pt-2">
            <button type="button" @click="showRuleModal = false" class="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" class="btn btn-primary flex-1" :disabled="savingRule">
              {{ savingRule ? 'Saving...' : (editingRule ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
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
import { apiGet, apiPost, apiPut } from '../../api/client'

const activeTab = ref('payouts')
const loading = ref(true)
const calculating = ref(false)
const toast = ref(null)

const pendingPayouts = ref([])
const selectedPayouts = ref([])
const batchProcessing = ref(false)
const paidThisMonth = ref(0)
const paidCount = ref(0)

const rules = ref([])
const showRuleModal = ref(false)
const editingRule = ref(null)
const savingRule = ref(false)
const ruleForm = ref({ name: '', percentage: 0, applies_to: 'franchise', is_active: true })

const pendingTotal = computed(() => pendingPayouts.value.reduce((s, p) => s + (p.amount || 0), 0))
const allSelected = computed(() => pendingPayouts.value.length > 0 && selectedPayouts.value.length === pendingPayouts.value.length)

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toggleSelect(p) {
  const id = p.share_id || p.id
  const idx = selectedPayouts.value.indexOf(id)
  if (idx >= 0) selectedPayouts.value.splice(idx, 1)
  else selectedPayouts.value.push(id)
}

function toggleAll() {
  if (allSelected.value) {
    selectedPayouts.value = []
  } else {
    selectedPayouts.value = pendingPayouts.value.map(p => p.share_id || p.id)
  }
}

async function loadPendingPayouts() {
  try {
    const data = await apiGet('/revenue-share/admin/payouts/pending')
    pendingPayouts.value = data.payouts || data.data || data || []
  } catch (e) {
    console.error(e)
    showToast('Failed to load pending payouts', 'error')
  }
}

async function loadRules() {
  try {
    const data = await apiGet('/revenue-share/admin/rules')
    rules.value = data.rules || data.data || data || []
  } catch (e) {
    console.error(e)
    showToast('Failed to load rules', 'error')
  }
}

async function loadPaidStats() {
  try {
    const data = await apiGet('/revenue-share/admin/payouts/paid-this-month')
    paidThisMonth.value = data.total_amount || data.total || 0
    paidCount.value = data.count || data.total_count || 0
  } catch (e) {
    paidThisMonth.value = 0
    paidCount.value = 0
  }
}

async function loadAll() {
  loading.value = true
  selectedPayouts.value = []
  await Promise.all([loadPendingPayouts(), loadRules(), loadPaidStats()])
  loading.value = false
}

async function processPayout(p) {
  const id = p.share_id || p.id
  try {
    await apiPost(`/revenue-share/admin/payouts/${id}/process`)
    pendingPayouts.value = pendingPayouts.value.filter(x => (x.share_id || x.id) !== id)
    selectedPayouts.value = selectedPayouts.value.filter(x => x !== id)
    showToast('Payout processed successfully')
    loadPaidStats()
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to process payout', 'error')
  }
}

async function rejectPayout(p) {
  const id = p.share_id || p.id
  try {
    await apiPost(`/revenue-share/admin/payouts/${id}/process`, { action: 'reject' })
    pendingPayouts.value = pendingPayouts.value.filter(x => (x.share_id || x.id) !== id)
    selectedPayouts.value = selectedPayouts.value.filter(x => x !== id)
    showToast('Payout rejected')
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to reject payout', 'error')
  }
}

async function batchApprove() {
  if (!selectedPayouts.value.length) return
  batchProcessing.value = true
  try {
    await apiPost('/revenue-share/admin/payouts/batch-approve', { payout_ids: selectedPayouts.value })
    const ids = new Set(selectedPayouts.value)
    pendingPayouts.value = pendingPayouts.value.filter(x => !ids.has(x.share_id || x.id))
    showToast(`${selectedPayouts.value.length} payouts approved`)
    selectedPayouts.value = []
    loadPaidStats()
  } catch (e) {
    showToast(e.response?.data?.error || 'Batch approve failed', 'error')
  } finally {
    batchProcessing.value = false
  }
}

async function triggerCalculation() {
  calculating.value = true
  try {
    await apiPost('/revenue-share/admin/calculate')
    showToast('Recalculation triggered')
    await loadAll()
  } catch (e) {
    showToast(e.response?.data?.error || 'Recalculation failed', 'error')
  } finally {
    calculating.value = false
  }
}

function openRuleModal(rule = null) {
  editingRule.value = rule
  if (rule) {
    ruleForm.value = {
      name: rule.name || rule.rule_name || '',
      percentage: rule.percentage || 0,
      applies_to: rule.applies_to || rule.target || 'franchise',
      is_active: rule.is_active !== false
    }
  } else {
    ruleForm.value = { name: '', percentage: 0, applies_to: 'franchise', is_active: true }
  }
  showRuleModal.value = true
}

async function saveRule() {
  savingRule.value = true
  try {
    const payload = { ...ruleForm.value }
    if (editingRule.value) {
      const id = editingRule.value.rule_id || editingRule.value.id
      await apiPut(`/revenue-share/admin/rules/${id}`, payload)
      showToast('Rule updated')
    } else {
      await apiPost('/revenue-share/admin/rules', payload)
      showToast('Rule created')
    }
    showRuleModal.value = false
    await loadRules()
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to save rule', 'error')
  } finally {
    savingRule.value = false
  }
}

onMounted(loadAll)
</script>
