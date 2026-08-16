<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <p class="metric-label">Pending</p>
        <p class="metric-value text-amber-600">{{ stats.pending || 0 }}</p>
        <p class="text-xs text-gray-400">TSH {{ (stats.pending_amount || 0) | number }}</p>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <p class="metric-label">Completed</p>
        <p class="metric-value text-emerald-600">{{ stats.completed || 0 }}</p>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <p class="metric-label">Rejected</p>
        <p class="metric-value text-red-600">{{ stats.failed || 0 }}</p>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <p class="metric-label">Total</p>
        <p class="metric-value">{{ stats.total || 0 }}</p>
      </div>
    </div>

    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-brand-100 flex items-center justify-between">
        <h3 class="section-title"><i class="fas fa-money-bill-wave section-icon text-brand-500"></i> Withdrawal Requests</h3>
        <select v-model="statusFilter" @change="loadWithdrawals" class="input w-40">
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>User</th><th>Phone</th><th>Amount</th><th>Payment Phone</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            <tr v-for="w in withdrawals" :key="w.id">
              <td class="font-medium text-gray-800">{{ w.user_name }}</td>
              <td>{{ w.user_phone }}</td>
              <td class="font-semibold text-gray-800">TSH {{ Number(w.amount).toLocaleString() }}</td>
              <td>{{ w.payment_phone || '—' }}</td>
              <td><span class="badge" :class="w.status === 'pending' ? 'badge-warning' : w.status === 'completed' ? 'badge-success' : 'badge-danger'">{{ w.status === 'pending' ? 'Pending' : w.status === 'completed' ? 'Completed' : 'Rejected' }}</span></td>
              <td class="text-xs text-gray-500">{{ new Date(w.created_at).toLocaleDateString() }}</td>
              <td>
                <div v-if="w.status === 'pending'" class="flex gap-2">
                  <button @click="approve(w.id)" class="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"><i class="fas fa-check mr-1"></i> Approve</button>
                  <button @click="reject(w.id)" class="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"><i class="fas fa-times mr-1"></i> Reject</button>
                </div>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
            </tr>
            <tr v-if="withdrawals.length === 0"><td colspan="7" class="text-center text-gray-400 py-8">No withdrawal requests</td></tr>
          </tbody>
        </table>
        <div v-if="pagination.pages > 1" class="flex items-center justify-between pt-4">
          <p class="text-sm text-gray-500">Total: {{ pagination.total }}</p>
          <div class="flex gap-2">
            <button @click="page = Math.max(1, page - 1); loadWithdrawals()" :disabled="page === 1" class="btn btn-outline btn-xs">Previous</button>
            <span class="px-3 py-1 text-sm text-gray-600">{{ page }} / {{ pagination.pages }}</span>
            <button @click="page = Math.min(pagination.pages, page + 1); loadWithdrawals()" :disabled="page === pagination.pages" class="btn btn-outline btn-xs">Next</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const withdrawals = ref([])
const stats = ref({})
const statusFilter = ref('pending')
const page = ref(1)
const pagination = ref({})

onMounted(() => { loadWithdrawals(); loadStats() })

async function loadWithdrawals() { try { const r = await adminGet(`/withdrawals?status=${statusFilter.value}&page=${page.value}&limit=20`); withdrawals.value = r.data || []; pagination.value = r.pagination || {} } catch (e) { console.error(e) } }
async function loadStats() { try { stats.value = await adminGet('/withdrawal-stats') } catch (e) { console.error(e) } }
async function approve(id) { if (!confirm('Are you sure you want to approve this withdrawal?')) return; try { await adminPost(`/withdrawals/${id}/approve`); await loadWithdrawals(); await loadStats() } catch (e) { console.error(e) } }
async function reject(id) { if (!confirm('Are you sure you want to reject this withdrawal? Funds will be returned to wallet.')) return; try { await adminPost(`/withdrawals/${id}/reject`); await loadWithdrawals(); await loadStats() } catch (e) { console.error(e) } }
</script>
