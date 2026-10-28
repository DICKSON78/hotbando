<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Voucher Management</h2>
        <p class="text-sm" style="color: #6b7280">Generate, track and manage your voucher batches</p>
      </div>
      <div class="flex gap-2">
        <button @click="loadAll" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total Vouchers</p>
            <p class="stat-value" style="color: #60a5fa">{{ stats.total }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-ticket-alt"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">{{ stats.batches }} batches</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Unused</p>
            <p class="stat-value" style="color: #34d399">{{ stats.unused }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-check-circle"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">Ready to sell</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Redeemed</p>
            <p class="stat-value" style="color: #a78bfa">{{ stats.redeemed }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-receipt"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">TSH {{ stats.revenue.toLocaleString() }} revenue</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Expired</p>
            <p class="stat-value" style="color: #f87171">{{ stats.expired }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #f87171"><i class="fas fa-times-circle"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">No longer valid</div>
      </div>
    </div>

    <!-- Generate New Vouchers -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-plus-circle" style="color: #FF7A30"></i> Generate New Vouchers</h3>
      </div>
      <div class="section-body">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div v-for="pkg in packages" :key="pkg.id" class="flex items-center justify-between py-3 px-4 rounded-xl" style="background: #0d0d14; border: 1px solid #1e1e2a">
            <div>
              <p class="font-medium text-white">{{ pkg.name }}</p>
              <p class="text-sm" style="color: #6b7280">TSH {{ parseFloat(pkg.price).toLocaleString() }}</p>
            </div>
            <input type="number" min="0" max="10000" v-model.number="quantities[pkg.name]"
              class="w-24 px-3 py-2 border border-[#1e1e2a] bg-[#0a0a0f] rounded-lg text-center text-white focus:border-[#FF7A30] focus:outline-none" placeholder="0">
          </div>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3" style="border-top: 1px solid #1e1e2a">
          <p class="text-sm" style="color: #6b7280">Platform fee: <strong class="text-white">20%</strong> · Cost deducted from wallet balance</p>
          <button @click="generate" :disabled="generating" class="btn btn-primary">
            <i v-if="generating" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-bolt mr-2"></i>
            {{ generating ? 'Generating...' : 'Generate Vouchers' }}
          </button>
        </div>
        <p v-if="genError" class="text-red-400 text-sm mt-3 bg-red-500/10 p-3 rounded-lg">{{ genError }}</p>
        <p v-if="genSuccess" class="text-green-400 text-sm mt-3 bg-green-500/10 p-3 rounded-lg">{{ genSuccess }}</p>
      </div>
    </div>

    <!-- Loading -->
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

    <!-- Vouchers Table -->
    <div v-else class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-list" style="color: #FF7A30"></i> Your Vouchers</h3>
        <div class="flex gap-2">
          <select v-model="statusFilter" @change="loadVouchers" class="form-input" style="max-width: 160px">
            <option value="">All</option>
            <option value="unused">Unused</option>
            <option value="used">Redeemed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>
      <div class="section-body">
        <div class="overflow-x-auto">
          <table class="re-table">
            <thead>
              <tr>
                <th>Voucher Code</th>
                <th>Package</th>
                <th>Price</th>
                <th>Status</th>
                <th>Used By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in vouchers" :key="v.id">
                <td class="font-medium text-white font-mono">{{ v.voucher_code }}</td>
                <td style="color: #d1d5db">{{ v.package_name }}</td>
                <td class="font-semibold text-white">TSH {{ Number(v.price).toLocaleString() }}</td>
                <td>
                  <span class="badge" :class="v.is_used ? 'badge-green' : (new Date(v.expires_at) > new Date() ? 'badge-yellow' : 'badge-red')">
                    {{ v.is_used ? 'Redeemed' : (new Date(v.expires_at) > new Date() ? 'Unused' : 'Expired') }}
                  </span>
                </td>
                <td style="color: #d1d5db">{{ v.used_by_name || '—' }}</td>
                <td class="text-xs" style="color: #6b7280">{{ new Date(v.created_at).toLocaleDateString() }}</td>
                <td>
                  <div class="flex gap-1">
                    <button @click="copyCode(v.voucher_code)" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(59,130,246,0.1); color: #60a5fa" title="Copy code">
                      <i class="fas fa-copy text-xs"></i>
                    </button>
                    <button v-if="!v.is_used && new Date(v.expires_at) > new Date()" @click="deleteVoucher(v.id)" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(239,68,68,0.1); color: #f87171" title="Delete">
                      <i class="fas fa-trash text-xs"></i>
                    </button>
                    <span v-else class="text-xs" style="color: #6b7280">—</span>
                  </div>
                </td>
              </tr>
              <tr v-if="!vouchers.length">
                <td colspan="7" class="text-center py-10" style="color: #6b7280">
                  <i class="fas fa-ticket-alt text-3xl mb-3 block" style="color: #1e1e2a"></i>
                  No vouchers found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="pagination.pages > 1" class="flex items-center justify-between mt-4 pt-3" style="border-top: 1px solid #1e1e2a">
          <span class="text-xs" style="color: #6b7280">Page {{ pagination.page }} of {{ pagination.pages }} ({{ pagination.total }} total)</span>
          <div class="flex gap-2">
            <button @click="changePage(pagination.page - 1)" :disabled="pagination.page <= 1" class="btn btn-secondary btn-sm" :class="{ 'opacity-50 cursor-not-allowed': pagination.page <= 1 }">Prev</button>
            <button @click="changePage(pagination.page + 1)" :disabled="pagination.page >= pagination.pages" class="btn btn-secondary btn-sm" :class="{ 'opacity-50 cursor-not-allowed': pagination.page >= pagination.pages }">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Batches -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-layer-group" style="color: #FF7A30"></i> Your Batches</h3>
      </div>
      <div class="section-body">
        <div class="overflow-x-auto">
          <table class="re-table">
            <thead><tr><th>Batch</th><th class="text-right">Vouchers</th><th class="text-right">Total Value</th><th class="text-right">Date</th></tr></thead>
            <tbody>
              <tr v-for="b in batches" :key="b.id">
                <td class="font-medium text-white">{{ b.batch_name }}</td>
                <td class="text-right" style="color: #d1d5db">{{ b.total_vouchers }}</td>
                <td class="text-right font-semibold text-white">TSH {{ Number(b.total_value).toLocaleString() }}</td>
                <td class="text-right text-xs" style="color: #6b7280">{{ b.formatted_date }}</td>
              </tr>
              <tr v-if="!batches?.length"><td colspan="4" class="text-center py-8" style="color: #6b7280">No batches yet</td></tr>
            </tbody>
          </table>
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
import { ref, onMounted } from 'vue'
import { resellerGet, resellerPost, resellerDelete } from '../../api/reseller'

const vouchers = ref([])
const batches = ref([])
const packages = ref([])
const quantities = ref({})
const generating = ref(false)
const genError = ref('')
const genSuccess = ref('')
const loading = ref(true)
const statusFilter = ref('')
const pagination = ref({ page: 1, limit: 50, total: 0, pages: 1 })
const toast = ref(null)

const stats = ref({ total: 0, unused: 0, redeemed: 0, expired: 0, revenue: 0, batches: 0 })

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadVouchers(), loadPackages()])
  } finally {
    loading.value = false
  }
}

async function loadPackages() {
  try {
    const resp = await import('../../api/client').then(m => m.default.get('/packages'))
    packages.value = resp.data || []
  } catch {
    packages.value = [
      { id: 1, name: 'MASAA 6', price: '500.00' },
      { id: 2, name: 'MASAA 24', price: '1000.00' },
      { id: 3, name: 'WIKI 1', price: '6000.00' },
      { id: 4, name: 'MWEZI 1', price: '20000.00' }
    ]
  }
  packages.value.forEach(p => { quantities.value[p.name] = 0 })
}

async function loadVouchers() {
  try {
    const r = await resellerGet(`/vouchers?status=${statusFilter.value}&page=${pagination.value.page}&limit=${pagination.value.limit}`)
    vouchers.value = r.data || []
    batches.value = r.batches || []
    pagination.value = r.pagination || pagination.value
    computeStats(vouchers.value)
  } catch (e) {
    console.error(e)
  }
}

function computeStats(list) {
  const now = new Date()
  stats.value.total = pagination.value.total || list.length
  stats.value.unused = list.filter(v => !v.is_used && new Date(v.expires_at) > now).length
  stats.value.redeemed = list.filter(v => v.is_used).length
  stats.value.expired = list.filter(v => !v.is_used && new Date(v.expires_at) <= now).length
  stats.value.revenue = list.filter(v => v.is_used).reduce((s, v) => s + parseFloat(v.price || 0), 0)
  stats.value.batches = batches.value.length
}

async function generate() {
  genError.value = ''; genSuccess.value = ''
  const pkgs = {}; let hasAny = false
  for (const [name, qty] of Object.entries(quantities.value)) { if (qty > 0) { pkgs[name] = qty; hasAny = true } }
  if (!hasAny) { genError.value = 'Select at least one package'; return }
  generating.value = true
  try {
    const r = await resellerPost('/vouchers/generate', { packages: pkgs })
    genSuccess.value = r.message; quantities.value = {}; packages.value.forEach(p => { quantities.value[p.name] = 0 })
    await loadVouchers()
    showToast(genSuccess.value)
  } catch (e) { genError.value = e.response?.data?.message || 'Failed to generate' }
  finally { generating.value = false }
}

async function deleteVoucher(id) {
  if (!confirm('Futa voucher hii?')) return
  try {
    await resellerDelete(`/vouchers/${id}`)
    showToast('Voucher imefutwa')
    await loadVouchers()
  } catch (e) {
    showToast(e.response?.data?.message || 'Failed to delete', 'error')
  }
}

function copyCode(code) {
  navigator.clipboard?.writeText(code)
  showToast('Code copied: ' + code)
}

function changePage(p) {
  if (p < 1 || p > pagination.value.pages) return
  pagination.value.page = p
  loadVouchers()
}
</script>