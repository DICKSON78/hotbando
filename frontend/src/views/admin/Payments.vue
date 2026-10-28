<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">All Payments</h2>
        <p class="text-sm" style="color: #6b7280">
          Every payment and business process across the platform — gateways, wallets, withdrawals, partner shares and invoices.
        </p>
      </div>
      <div class="flex gap-2">
        <button @click="fetchPayments" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i> Refresh
        </button>
        <button @click="exportCSV" class="btn btn-primary btn-sm" :disabled="!payments.length">
          <i class="fas fa-download"></i> Export
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="section-card">
      <div class="section-body">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label class="form-label">From</label>
            <input v-model="filters.from" type="date" class="form-input">
          </div>
          <div>
            <label class="form-label">To</label>
            <input v-model="filters.to" type="date" class="form-input">
          </div>
          <div>
            <label class="form-label">Source</label>
            <select v-model="filters.source" class="form-input">
              <option value="all">All sources</option>
              <option value="pesapal">PesaPal</option>
              <option value="clickpesa">ClickPesa</option>
              <option value="mobile_money">Mobile money</option>
              <option value="wallet">Wallet ledger</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="revenue_share">Revenue shares</option>
              <option value="invoice">Invoices</option>
            </select>
          </div>
          <div>
            <label class="form-label">Status</label>
            <select v-model="filters.status" class="form-input">
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed / cancelled</option>
            </select>
          </div>
          <div>
            <label class="form-label">Role</label>
            <select v-model="filters.role" class="form-input">
              <option value="all">All roles</option>
              <option value="customer">Customers</option>
              <option value="reseller">Resellers</option>
              <option value="sponsor">Sponsors</option>
              <option value="bank_partner">Bank partners</option>
              <option value="franchise_owner">Franchise owners</option>
              <option value="admin">Admins</option>
              <option value="super_admin">Super admins</option>
            </select>
          </div>
          <div>
            <label class="form-label">Search</label>
            <input
              v-model="filters.q"
              type="search"
              class="form-input"
              placeholder="Name, phone, reference..."
              @keyup.enter="applyFilters"
            >
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button @click="resetFilters" class="btn btn-secondary btn-sm">
            <i class="fas fa-undo"></i> Reset
          </button>
          <button @click="applyFilters" class="btn btn-primary btn-sm" :disabled="loading">
            <i class="fas fa-search"></i> Apply filters
          </button>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Settled Inflow</p>
            <p class="stat-value" style="color: #34d399">TSh {{ formatNum(summary.inflow) }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-arrow-down"></i></div>
        </div>
        <p class="mt-3 text-xs" style="color: #6b7280">Money received by HQ</p>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Settled Outflow</p>
            <p class="stat-value" style="color: #f87171">TSh {{ formatNum(summary.outflow) }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #f87171"><i class="fas fa-arrow-up"></i></div>
        </div>
        <p class="mt-3 text-xs" style="color: #6b7280">Withdrawals, shares and refunds</p>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Net Position</p>
            <p class="stat-value" :style="{ color: summary.net >= 0 ? '#60a5fa' : '#f87171' }">TSh {{ formatNum(summary.net) }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-scale-balanced"></i></div>
        </div>
        <p class="mt-3 text-xs" style="color: #6b7280">{{ summary.total_count }} ledger entries</p>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Pending</p>
            <p class="stat-value" style="color: #facc15">TSh {{ formatNum(summary.pending_amount) }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(250,204,21,0.1); color: #facc15"><i class="fas fa-hourglass-half"></i></div>
        </div>
        <p class="mt-3 text-xs" style="color: #6b7280">{{ summary.pending_count }} awaiting action · {{ summary.failed_count }} failed</p>
      </div>
    </div>

    <!-- Source breakdown -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-layer-group" style="color: #FF7A30"></i> By Source</h3>
      </div>
      <div class="section-body">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div v-for="src in bySource" :key="src.key" class="rounded-xl p-3" style="background: #0a0a12; border: 1px solid #1e1e2a">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide" style="color: #9ca3af">{{ sourceLabel(src.key) }}</span>
              <span class="text-xs" style="color: #6b7280">{{ src.count }}</span>
            </div>
            <p class="text-sm font-bold text-white mt-2">TSh {{ formatNum(src.inflow + src.outflow) }}</p>
            <div class="flex gap-3 mt-1 text-[11px]">
              <span style="color: #34d399">In {{ formatNum(src.inflow) }}</span>
              <span style="color: #f87171">Out {{ formatNum(src.outflow) }}</span>
            </div>
            <p v-if="src.pending" class="text-[11px] mt-1" style="color: #facc15">{{ src.pending }} pending</p>
          </div>
          <p v-if="!bySource.length" class="text-sm col-span-full text-center py-4" style="color: #6b7280">No activity for these filters</p>
        </div>
      </div>
    </div>

    <!-- Ledger -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-receipt" style="color: #FF7A30"></i> Unified Ledger</h3>
        <span class="badge badge-green">{{ pagination.total }} entries</span>
      </div>
      <div v-if="loading" class="section-body space-y-3">
        <div v-for="i in 6" :key="i" class="h-10 rounded-lg animate-pulse" style="background: #1e1e2a"></div>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="re-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Source</th>
              <th>Business / User</th>
              <th>Reference</th>
              <th>Purpose</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in payments" :key="row.id">
              <td class="text-sm whitespace-nowrap" style="color: #d1d5db">{{ formatDate(row.created_at) }}</td>
              <td>
                <span class="badge" :style="sourceStyle(row.source)">{{ sourceLabel(row.source) }}</span>
              </td>
              <td>
                <p class="text-sm text-white">{{ row.business_name || row.user_name || '—' }}</p>
                <p class="text-[11px]" style="color: #6b7280">
                  {{ roleLabel(row.user_role) }}<span v-if="row.phone"> · {{ row.phone }}</span>
                </p>
              </td>
              <td><span class="text-xs font-mono" style="color: #FF7A30">{{ row.reference || '—' }}</span></td>
              <td class="text-sm" style="color: #d1d5db">{{ row.purpose || '—' }}</td>
              <td class="text-sm font-semibold whitespace-nowrap" :style="{ color: row.direction === 'inflow' ? '#34d399' : '#f87171' }">
                {{ row.direction === 'inflow' ? '+' : '−' }} TSh {{ formatNum(row.amount) }}
              </td>
              <td>
                <span class="badge" :class="statusClass(row.status)">{{ row.raw_status || row.status }}</span>
              </td>
            </tr>
            <tr v-if="!payments.length">
              <td colspan="7" class="text-center py-10" style="color: #6b7280">
                <i class="fas fa-receipt text-3xl mb-3 block" style="color: #1e1e2a"></i>
                No payments match these filters
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="pagination.pages > 1" class="section-body flex items-center justify-between" style="border-top: 1px solid #1e1e2a">
        <p class="text-xs" style="color: #6b7280">
          Page {{ pagination.page }} of {{ pagination.pages }}
        </p>
        <div class="flex gap-2">
          <button @click="changePage(pagination.page - 1)" class="btn btn-secondary btn-sm" :disabled="pagination.page <= 1 || loading">
            <i class="fas fa-chevron-left"></i> Prev
          </button>
          <button @click="changePage(pagination.page + 1)" class="btn btn-secondary btn-sm" :disabled="pagination.page >= pagination.pages || loading">
            Next <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Provider callback audit, separate from ledger totals to avoid double counting -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-shield-alt" style="color: #60a5fa"></i> ClickPesa Webhook Audit</h3>
        <span class="badge badge-green">{{ webhookEvents.length }} latest events</span>
      </div>
      <div v-if="webhookEvents.length" class="overflow-x-auto">
        <table class="re-table">
          <thead><tr><th>Received</th><th>Event</th><th>Order / Provider ref</th><th>Reported amount</th><th>Processing</th><th>Details</th></tr></thead>
          <tbody>
            <tr v-for="event in webhookEvents" :key="event.id">
              <td class="text-sm whitespace-nowrap" style="color:#d1d5db">{{ formatDate(event.received_at) }}</td>
              <td class="text-sm text-white">{{ event.event_type }}</td>
              <td class="text-xs font-mono" style="color:#FF7A30">{{ event.order_reference || event.provider_ref || '—' }}</td>
              <td class="text-sm text-white">{{ event.reported_amount ? `TSh ${formatNum(event.reported_amount)}` : '—' }}</td>
              <td><span class="badge" :class="event.status === 'processed' ? 'badge-green' : event.status === 'failed' ? 'badge-red' : 'badge-yellow'">{{ event.status }}</span></td>
              <td class="text-xs" style="color:#f87171">{{ event.error_message || (event.processed_at ? `Processed ${formatDate(event.processed_at)}` : 'Awaiting processing') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="section-body text-sm" style="color:#6b7280">No ClickPesa webhook events received yet.</p>
    </div>

    <!-- Business accounts -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-building" style="color: #FF7A30"></i> Business Accounts</h3>
        <span class="badge badge-blue">{{ accounts.length }} accounts</span>
      </div>
      <div class="overflow-x-auto">
        <table class="re-table">
          <thead>
            <tr>
              <th>Business / Account</th>
              <th>Role</th>
              <th>Wallet</th>
              <th>Inflow</th>
              <th>Outflow</th>
              <th>Pending</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account in accounts" :key="account.id">
              <td>
                <p class="text-sm text-white">{{ account.company_name || account.name }}</p>
                <p class="text-[11px]" style="color: #6b7280">{{ account.phone_number || account.email || '—' }}</p>
              </td>
              <td>
                <span class="badge badge-gray">{{ roleLabel(account.role) }}</span>
                <span v-if="account.role === 'reseller'" class="badge badge-blue ml-1">{{ account.tier || 'bronze' }}</span>
              </td>
              <td class="text-sm whitespace-nowrap" style="color: #d1d5db">
                <template v-if="account.reseller_balance !== null">TSh {{ formatNum(account.reseller_balance) }}</template>
                <template v-else>TSh {{ formatNum(account.wallet_balance) }}</template>
              </td>
              <td class="text-sm whitespace-nowrap" style="color: #34d399">TSh {{ formatNum(account.ledger.inflow) }}</td>
              <td class="text-sm whitespace-nowrap" style="color: #f87171">TSh {{ formatNum(account.ledger.outflow) }}</td>
              <td class="text-sm" style="color: #facc15">{{ account.ledger.pending }}</td>
              <td class="text-sm whitespace-nowrap" style="color: #d1d5db">{{ account.ledger.last_activity ? formatDate(account.ledger.last_activity) : '—' }}</td>
            </tr>
            <tr v-if="!accounts.length">
              <td colspan="7" class="text-center py-10" style="color: #6b7280">No business accounts found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminGet } from '../../api/client'

const loading = ref(true)
const payments = ref([])
const webhookEvents = ref([])
const bySource = ref([])
const accounts = ref([])
const summary = ref({ inflow: 0, outflow: 0, net: 0, pending_amount: 0, pending_count: 0, failed_count: 0, total_count: 0 })
const pagination = ref({ page: 1, limit: 50, total: 0, pages: 1 })

const filters = ref({
  from: '',
  to: '',
  source: 'all',
  status: 'all',
  role: 'all',
  q: ''
})

const SOURCE_LABELS = {
  pesapal: 'PesaPal',
  clickpesa: 'ClickPesa',
  mobile_money: 'Mobile money',
  wallet: 'Wallet',
  withdrawal: 'Withdrawal',
  revenue_share: 'Revenue share',
  invoice: 'Invoice'
}

const ROLE_LABELS = {
  customer: 'Customer',
  reseller: 'Reseller',
  sponsor: 'Sponsor',
  bank_partner: 'Bank partner',
  franchise_owner: 'Franchise owner',
  admin: 'Admin',
  super_admin: 'Super admin',
  landlord: 'Landlord',
  broker: 'Broker',
  telecom: 'Telecom',
  referrer: 'Referrer'
}

const SOURCE_STYLES = {
  pesapal: 'background: rgba(255,122,48,0.12); color: #FF7A30',
  clickpesa: 'background: rgba(59,130,246,0.12); color: #60a5fa',
  mobile_money: 'background: rgba(139,92,246,0.12); color: #a78bfa',
  wallet: 'background: rgba(20,184,166,0.12); color: #2dd4bf',
  withdrawal: 'background: rgba(239,68,68,0.12); color: #f87171',
  revenue_share: 'background: rgba(250,204,21,0.12); color: #facc15',
  invoice: 'background: rgba(16,185,129,0.12); color: #34d399'
}

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function sourceLabel(key) {
  return SOURCE_LABELS[key] || key || '—'
}

function sourceStyle(key) {
  return SOURCE_STYLES[key] || 'background: rgba(107,114,128,0.12); color: #9ca3af'
}

function roleLabel(key) {
  return ROLE_LABELS[key] || (key ? String(key).replace(/_/g, ' ') : '—')
}

function statusClass(status) {
  if (status === 'completed') return 'badge-green'
  if (status === 'pending') return 'badge-yellow'
  return 'badge-red'
}

async function fetchPayments() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    Object.entries(filters.value).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    params.set('page', pagination.value.page)
    params.set('limit', pagination.value.limit)

    const data = await adminGet(`/payments?${params.toString()}`)
    try {
      const audit = await adminGet('/payments/webhook-events?limit=50')
      webhookEvents.value = audit.events || []
    } catch (auditError) {
      console.error('ClickPesa webhook audit fetch error:', auditError)
    }
    payments.value = data.payments || []
    bySource.value = data.bySource || []
    accounts.value = data.accounts || []
    summary.value = data.summary || summary.value
    pagination.value = data.pagination || pagination.value
  } catch (e) {
    console.error('Payments fetch error:', e)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.value.page = 1
  fetchPayments()
}

function resetFilters() {
  filters.value = { from: '', to: '', source: 'all', status: 'all', role: 'all', q: '' }
  pagination.value.page = 1
  fetchPayments()
}

function changePage(page) {
  if (page < 1 || page > pagination.value.pages) return
  pagination.value.page = page
  fetchPayments()
}

function exportCSV() {
  if (!payments.value.length) return
  const headers = ['Date', 'Source', 'Business/User', 'Role', 'Reference', 'Purpose', 'Direction', 'Amount', 'Status', 'Phone']
  const rows = payments.value.map((row) => [
    formatDate(row.created_at),
    sourceLabel(row.source),
    row.business_name || row.user_name || '',
    roleLabel(row.user_role),
    row.reference || '',
    row.purpose || '',
    row.direction,
    row.amount || 0,
    row.raw_status || row.status,
    row.phone || ''
  ])
  const csv = [headers, ...rows]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `all-payments-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(fetchPayments)
</script>
