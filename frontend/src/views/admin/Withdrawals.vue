<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Withdrawals</h2>
        <p class="text-sm" style="color: #6b7280">Manage withdrawal requests</p>
      </div>
      <div class="flex gap-2">
        <button @click="loadWithdrawals(); loadStats()" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Pending</p>
            <p class="stat-value" style="color: #facc15">{{ stats.pending?.count || 0 }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(250,204,21,0.1); color: #facc15"><i class="fas fa-hourglass-half"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">TSh {{ Number(stats.pending?.total || 0).toLocaleString() }}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Completed</p>
            <p class="stat-value" style="color: #34d399">{{ stats.completed?.count || 0 }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-check-circle"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">TSh {{ Number(stats.completed?.total || 0).toLocaleString() }}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Today</p>
            <p class="stat-value" style="color: #60a5fa">{{ stats.today?.count || 0 }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-calendar-day"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">TSh {{ Number(stats.today?.total || 0).toLocaleString() }}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total</p>
            <p class="stat-value">{{ stats.total?.count || 0 }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-list"></i></div>
        </div>
        <div class="mt-3 text-xs" style="color: #6b7280">TSh {{ Number(stats.total?.total || 0).toLocaleString() }}</div>
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

    <!-- Table -->
    <div v-else class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-money-bill-wave" style="color: #FF7A30"></i> Withdrawal Requests</h3>
        <select v-model="statusFilter" @change="page = 1; loadWithdrawals()" class="form-input" style="max-width: 160px">
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>
      <div class="section-body">
        <div class="overflow-x-auto">
          <table class="re-table">
            <thead>
              <tr><th>User</th><th>Phone</th><th>Amount</th><th>Payment Phone</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              <tr v-for="w in withdrawals" :key="w.id">
                <td class="font-medium text-white">{{ w.user_name }}</td>
                <td style="color: #d1d5db">{{ w.phone_number }}</td>
                <td class="font-semibold text-white">TSh {{ Number(w.amount).toLocaleString() }}</td>
                <td style="color: #d1d5db">{{ w.payment_phone || '—' }}</td>
                <td>
                  <span class="badge" :class="w.status === 'pending' ? 'badge-yellow' : w.status === 'completed' ? 'badge-green' : 'badge-red'">
                    {{ w.status === 'pending' ? 'Pending' : w.status === 'completed' ? 'Completed' : 'Rejected' }}
                  </span>
                </td>
                <td class="text-xs" style="color: #6b7280">{{ new Date(w.created_at).toLocaleDateString() }}</td>
                <td>
                  <div v-if="w.status === 'pending'" class="flex gap-1">
                    <button @click="confirmApprove(w)" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(16,185,129,0.1); color: #34d399" title="Approve">
                      <i class="fas fa-check text-xs"></i>
                    </button>
                    <button @click="confirmReject(w)" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(239,68,68,0.1); color: #f87171" title="Reject">
                      <i class="fas fa-times text-xs"></i>
                    </button>
                  </div>
                  <span v-else class="text-xs" style="color: #6b7280">—</span>
                </td>
              </tr>
              <tr v-if="!withdrawals.length">
                <td colspan="7" class="text-center py-10" style="color: #6b7280">
                  <i class="fas fa-money-bill-wave text-3xl mb-3 block" style="color: #1e1e2a"></i>
                  No withdrawal requests
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.pages > 1" class="flex items-center justify-between px-4 py-3 border-t" style="border-color: #1e1e2a">
          <p class="text-xs" style="color: #6b7280">Page {{ page }} of {{ pagination.pages }} ({{ pagination.total }} total)</p>
          <div class="flex gap-1">
            <button @click="page = Math.max(1, page - 1); loadWithdrawals()" :disabled="page === 1" class="btn btn-ghost btn-xs">
              <i class="fas fa-chevron-left"></i>
            </button>
            <button v-for="p in visiblePages" :key="p" @click="page = p; loadWithdrawals()" class="btn btn-xs" :class="p === page ? 'btn-primary' : 'btn-ghost'">
              {{ p }}
            </button>
            <button @click="page = Math.min(pagination.pages, page + 1); loadWithdrawals()" :disabled="page === pagination.pages" class="btn btn-ghost btn-xs">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="confirmModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="confirmModal = null">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-sm rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="text-center">
          <div class="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" :style="confirmModal.action === 'approve' ? 'background: rgba(16,185,129,0.1)' : 'background: rgba(239,68,68,0.1)'">
            <i :class="confirmModal.action === 'approve' ? 'fas fa-check' : 'fas fa-times'" class="text-xl" :style="confirmModal.action === 'approve' ? 'color: #34d399' : 'color: #f87171'"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-2">{{ confirmModal.action === 'approve' ? 'Approve Withdrawal?' : 'Reject Withdrawal?' }}</h3>
          <p class="text-sm mb-6" style="color: #6b7280">
            {{ confirmModal.action === 'approve'
              ? `Approve TSh ${Number(confirmModal.w?.amount || 0).toLocaleString()} withdrawal for ${confirmModal.w?.user_name || 'this user'}?`
              : `Reject this withdrawal? Funds will be returned to the user's wallet.`
            }}
          </p>
          <div class="flex gap-3">
            <button @click="confirmModal = null" class="btn btn-secondary flex-1">Cancel</button>
            <button @click="executeConfirm" class="btn flex-1" :class="confirmModal.action === 'approve' ? 'btn-primary' : 'btn-danger'" :disabled="acting">
              {{ acting ? '...' : (confirmModal.action === 'approve' ? 'Approve' : 'Reject') }}
            </button>
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
import { adminGet, adminPost } from '../../api/client'

const withdrawals = ref([])
const stats = ref({})
const statusFilter = ref('pending')
const page = ref(1)
const pagination = ref({})
const loading = ref(true)
const toast = ref(null)
const confirmModal = ref(null)
const acting = ref(false)

const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(pagination.value.pages || 1, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

onMounted(() => { loadWithdrawals(); loadStats() })

async function loadWithdrawals() {
  loading.value = true
  try {
    const r = await adminGet(`/withdrawals?status=${statusFilter.value}&page=${page.value}&limit=20`)
    const rows = [r.data, r.withdrawals, r.rows, r.data?.withdrawals, r.data?.rows].find(Array.isArray)
    withdrawals.value = rows || []
    pagination.value = r.pagination || {}
    if (!withdrawals.value.length && Number(pagination.value.total || 0) > 0) {
      showToast(`Server inaonyesha maombi ${pagination.value.total}, lakini list haikuyapokea. Bonyeza Refresh.`, 'error')
    }
  } catch (e) {
    console.error(e)
    showToast('Failed to load withdrawals', 'error')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const r = await adminGet('/withdrawal-stats')
    stats.value = r
  } catch (e) {
    console.error(e)
  }
}

function confirmApprove(w) { confirmModal.value = { action: 'approve', w } }
function confirmReject(w) { confirmModal.value = { action: 'reject', w } }

async function executeConfirm() {
  if (!confirmModal.value) return
  acting.value = true
  const { action, w } = confirmModal.value
  try {
    await adminPost(`/withdrawals/${w.id}/${action === 'approve' ? 'approve' : 'reject'}`)
    await loadWithdrawals()
    await loadStats()
    showToast(action === 'approve' ? 'Withdrawal approved' : 'Withdrawal rejected')
  } catch (e) {
    console.error(e)
    showToast(`Failed to ${action} withdrawal`, 'error')
  } finally {
    acting.value = false
    confirmModal.value = null
  }
}
</script>
