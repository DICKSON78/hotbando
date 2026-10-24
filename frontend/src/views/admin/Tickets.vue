<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Support Tickets</h2>
        <p class="text-sm" style="color: #6b7280">Manage customer support tickets and SLA tracking</p>
      </div>
      <div class="flex gap-2">
        <button @click="loadAll()" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
        <button @click="showCreate = true" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> New Ticket</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total Tickets</p>
            <p class="stat-value" style="color: #60a5fa">{{ statsTotal }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-folder-open"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">In Progress</p>
            <p class="stat-value" style="color: #FF7A30">{{ statsInProgress }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(255,122,48,0.1); color: #FF7A30"><i class="fas fa-spinner"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">SLA Breached</p>
            <p class="stat-value" style="color: #ef4444">{{ statsSlaBreaches }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #ef4444"><i class="fas fa-exclamation-triangle"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Open Tickets</p>
            <p class="stat-value" style="color: #34d399">{{ statsOpen }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-inbox"></i></div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="section-card">
      <div class="flex flex-wrap items-center gap-3">
        <select v-model="filters.status" @change="loadTickets()" class="form-input" style="max-width: 150px">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_customer">Waiting Customer</option>
          <option value="waiting_internal">Waiting Internal</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select v-model="filters.priority" @change="loadTickets()" class="form-input" style="max-width: 150px">
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select v-model="filters.category_id" @change="loadTickets()" class="form-input" style="max-width: 160px">
          <option value="">All Categories</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="filters.branch_id" @change="loadTickets()" class="form-input" style="max-width: 160px">
          <option value="">All Branches</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <input v-model="filters.search" @input="debounceSearch" class="form-input" placeholder="Search tickets..." style="max-width: 220px">
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="stat-card animate-pulse">
        <div class="flex items-center gap-4">
          <div class="flex-1 space-y-2"><div class="h-4 w-40 rounded" style="background: #1e1e2a"></div><div class="h-3 w-24 rounded" style="background: #1e1e2a"></div></div>
          <div class="h-6 w-16 rounded" style="background: #1e1e2a"></div>
        </div>
      </div>
    </div>

    <!-- Ticket table -->
    <div v-else class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-headset" style="color: #FF7A30"></i> Tickets ({{ totalTickets }})</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="re-table">
          <thead>
            <tr><th>Ticket #</th><th>Subject</th><th>Customer</th><th>Branch</th><th>Category</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>SLA</th><th>Created</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in tickets" :key="t.id" @click="openDetail(t)" class="cursor-pointer hover:opacity-80 transition-opacity">
              <td class="font-medium text-white">#{{ t.ticket_number }}</td>
              <td style="color: #d1d5db">{{ truncate(t.subject, 40) }}</td>
              <td style="color: #d1d5db">{{ t.customer_name || '—' }}</td>
              <td style="color: #d1d5db">{{ t.branch_name || '—' }}</td>
              <td style="color: #d1d5db">{{ t.category_name || '—' }}</td>
              <td><span class="badge" :class="priorityClass(t.priority)">{{ t.priority }}</span></td>
              <td><span class="badge" :class="statusClass(t.status)">{{ formatStatus(t.status) }}</span></td>
              <td style="color: #d1d5db">{{ t.assignee_name || '—' }}</td>
              <td>
                <span v-if="t.sla_deadline" class="text-xs font-medium" :style="slaStyle(t)">{{ slaLabel(t) }}</span>
                <span v-else style="color: #6b7280">—</span>
              </td>
              <td class="text-xs" style="color: #6b7280">{{ formatDate(t.created_at) }}</td>
            </tr>
            <tr v-if="!tickets.length">
              <td colspan="10" class="text-center py-10" style="color: #6b7280">
                <i class="fas fa-headset text-3xl mb-3 block" style="color: #1e1e2a"></i>
                No tickets found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ticket Detail Modal -->
    <div v-if="detailTicket" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="detailTicket = null">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-bold text-white">#{{ detailTicket.ticket_number }} — {{ detailTicket.subject }}</h3>
            <p class="text-xs mt-1" style="color: #6b7280">Created {{ formatDate(detailTicket.created_at) }}</p>
          </div>
          <button @click="detailTicket = null" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>

        <!-- Ticket Info -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div>
            <p class="text-xs" style="color: #6b7280">Status</p>
            <select v-model="detailTicket.status" @change="updateTicket()" class="form-input text-sm mt-1">
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_customer">Waiting Customer</option>
              <option value="waiting_internal">Waiting Internal</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <p class="text-xs" style="color: #6b7280">Priority</p>
            <select v-model="detailTicket.priority" @change="updateTicket()" class="form-input text-sm mt-1">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <p class="text-xs" style="color: #6b7280">Category</p>
            <select v-model="detailTicket.category_id" @change="updateTicket()" class="form-input text-sm mt-1">
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <p class="text-xs" style="color: #6b7280">Branch</p>
            <p class="text-sm text-white mt-1">{{ detailTicket.branch_name || '—' }}</p>
          </div>
        </div>

        <!-- Assign & Customer -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p class="text-xs mb-1" style="color: #6b7280">Assign To</p>
            <select v-model="detailTicket.assigned_to" @change="updateTicket()" class="form-input">
              <option :value="null">Unassigned</option>
              <option v-for="s in staff" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div>
            <p class="text-xs mb-1" style="color: #6b7280">Customer</p>
            <p class="text-sm text-white">{{ detailTicket.customer_name || '—' }} <span class="text-xs" style="color: #6b7280">(ID: {{ detailTicket.submitted_by }})</span></p>
          </div>
        </div>

        <!-- Description -->
        <div class="section-card mb-6">
          <p class="text-xs font-medium text-white mb-2">Description</p>
          <p class="text-sm" style="color: #d1d5db; white-space: pre-wrap">{{ detailTicket.description || 'No description' }}</p>
        </div>

        <!-- Conversation Thread -->
        <div class="mb-4">
          <p class="text-sm font-bold text-white mb-3"><i class="fas fa-comments mr-1" style="color: #FF7A30"></i> Conversation</p>
          <div class="space-y-3" style="max-height: 300px; overflow-y: auto">
            <div v-for="r in (detailTicket.replies || [])" :key="r.id" class="p-3 rounded-xl" :style="r.is_internal ? 'background: rgba(255,122,48,0.08); border-left: 3px solid #FF7A30' : 'background: #0d0d14; border-left: 3px solid #1e1e2a'">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-medium" :style="r.is_internal ? 'color: #FF7A30' : 'color: #60a5fa'">{{ r.author_name || (r.is_internal ? 'Staff' : 'Customer') }}</span>
                <span v-if="r.is_internal" class="text-xs px-1.5 py-0.5 rounded" style="background: rgba(255,122,48,0.15); color: #FF7A30">Internal</span>
                <span class="text-xs" style="color: #6b7280">{{ formatDate(r.created_at) }}</span>
              </div>
              <p class="text-sm" style="color: #d1d5db; white-space: pre-wrap">{{ r.message }}</p>
            </div>
            <p v-if="!(detailTicket.replies || []).length" class="text-center py-4 text-sm" style="color: #6b7280">No replies yet</p>
          </div>
        </div>

        <!-- Add Reply -->
        <div class="flex gap-3">
          <textarea v-model="replyText" class="form-input flex-1" rows="2" placeholder="Type a reply..."></textarea>
          <button @click="sendReply()" class="btn btn-primary self-end" :disabled="!replyText.trim() || savingReply">
            <i class="fas fa-paper-plane"></i> {{ savingReply ? '...' : 'Send' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Ticket Modal -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showCreate = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-lg rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white">Create Ticket</h3>
          <button @click="showCreate = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="form-label">Subject</label>
            <input v-model="createForm.subject" class="form-input" placeholder="Ticket subject">
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea v-model="createForm.description" class="form-input" rows="3" placeholder="Describe the issue..."></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Category</label>
              <select v-model="createForm.category_id" class="form-input">
                <option value="">Select category</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Priority</label>
              <select v-model="createForm.priority" class="form-input">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Branch</label>
              <select v-model="createForm.branch_id" class="form-input">
                <option value="">Select branch</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Assign To</label>
              <select v-model="createForm.assigned_to" class="form-input">
                <option value="">Unassigned</option>
                <option v-for="s in staff" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
          </div>
          <button @click="createTicket()" class="btn btn-primary w-full" :disabled="saving">
            <i class="fas fa-save"></i> {{ saving ? 'Creating...' : 'Create Ticket' }}
          </button>
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
import { adminGet, adminPost, adminPut } from '../../api/client'

const tickets = ref([])
const ticketStats = ref({})
const branches = ref([])
const staff = ref([])
const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const savingReply = ref(false)
const showCreate = ref(false)
const detailTicket = ref(null)
const replyText = ref('')
const toast = ref(null)

const filters = ref({ status: '', priority: '', branch_id: '', category_id: '', search: '' })
const createForm = ref({ subject: '', description: '', category_id: '', priority: 'normal', branch_id: '', assigned_to: '' })

let searchTimeout = null

const statsTotal = computed(() => ticketStats.value.total || 0)
const statsSlaBreaches = computed(() => ticketStats.value.sla_breaches || 0)
const statsInProgress = computed(() => {
  const found = (ticketStats.value.by_status || []).find(s => s.status === 'in_progress')
  return found ? found.count : 0
})
const statsOpen = computed(() => {
  const found = (ticketStats.value.by_status || []).find(s => s.status === 'open')
  return found ? found.count : 0
})
const totalTickets = computed(() => ticketStats.value.total || tickets.value.length)

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s || '—' }

function priorityClass(p) {
  return { urgent: 'badge-red', high: 'badge-red', normal: 'badge-yellow', low: 'badge-gray' }[p] || 'badge-gray'
}

function statusClass(s) {
  return { open: 'badge-blue', in_progress: 'badge-yellow', waiting_customer: 'badge-yellow', waiting_internal: 'badge-yellow', resolved: 'badge-green', closed: 'badge-gray' }[s] || 'badge-gray'
}

function formatStatus(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function slaStyle(t) {
  if (!t.sla_deadline) return {}
  const remaining = new Date(t.sla_deadline) - new Date()
  if (remaining < 0) return { color: '#ef4444' }
  if (remaining < 2 * 3600000) return { color: '#facc15' }
  return { color: '#34d399' }
}

function slaLabel(t) {
  if (!t.sla_deadline) return '—'
  const remaining = new Date(t.sla_deadline) - new Date()
  if (remaining < 0) return 'Breached'
  const hrs = Math.floor(remaining / 3600000)
  const mins = Math.floor((remaining % 3600000) / 60000)
  return `${hrs}h ${mins}m`
}

function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadTickets(), 300)
}

async function loadTickets() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.value.status) params.set('status', filters.value.status)
    if (filters.value.priority) params.set('priority', filters.value.priority)
    if (filters.value.branch_id) params.set('branch_id', filters.value.branch_id)
    if (filters.value.category_id) params.set('category_id', filters.value.category_id)
    const data = await adminGet('/hq/tickets?' + params.toString())
    tickets.value = data.tickets || data || []
  } catch (e) {
    console.error(e)
    showToast('Failed to load tickets', 'error')
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  loading.value = true
  try {
    const [tData, sData, bData, cData, stData] = await Promise.allSettled([
      adminGet('/hq/tickets'),
      adminGet('/hq/ticket-stats'),
      adminGet('/hq/branches'),
      adminGet('/hq/ticket-categories'),
      adminGet('/hq/staff')
    ])
    if (tData.status === 'fulfilled') tickets.value = tData.value.tickets || tData.value || []
    if (sData.status === 'fulfilled') ticketStats.value = sData.value || {}
    if (bData.status === 'fulfilled') branches.value = bData.value.branches || bData.value || []
    if (cData.status === 'fulfilled') categories.value = cData.value.categories || cData.value || []
    if (stData.status === 'fulfilled') staff.value = stData.value.staff || stData.value || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function openDetail(t) {
  try {
    const data = await adminGet(`/hq/tickets/${t.id}`)
    detailTicket.value = data.ticket || data
  } catch (e) {
    detailTicket.value = { ...t, replies: [] }
  }
  replyText.value = ''
}

async function updateTicket() {
  if (!detailTicket.value) return
  try {
    await adminPut(`/hq/tickets/${detailTicket.value.id}`, {
      status: detailTicket.value.status,
      assigned_to: detailTicket.value.assigned_to,
      priority: detailTicket.value.priority,
      category_id: detailTicket.value.category_id
    })
    showToast('Ticket updated')
  } catch (e) {
    showToast('Failed to update ticket', 'error')
  }
}

async function sendReply() {
  if (!detailTicket.value || !replyText.value.trim()) return
  savingReply.value = true
  try {
    const data = await adminPost(`/hq/tickets/${detailTicket.value.id}/replies`, { message: replyText.value.trim() })
    const replies = detailTicket.value.replies || []
    replies.push(data.reply || { id: Date.now(), message: replyText.value.trim(), is_internal: true, author_name: 'Staff', created_at: new Date().toISOString() })
    detailTicket.value.replies = replies
    replyText.value = ''
    showToast('Reply sent')
  } catch (e) {
    showToast('Failed to send reply', 'error')
  } finally {
    savingReply.value = false
  }
}

async function createTicket() {
  if (!createForm.value.subject) return showToast('Subject is required', 'error')
  if (!createForm.value.description) return showToast('Description is required', 'error')
  if (!createForm.value.category_id) return showToast('Category is required', 'error')
  saving.value = true
  try {
    await adminPost('/hq/tickets', {
      subject: createForm.value.subject,
      description: createForm.value.description,
      submitted_by: 1,
      category_id: createForm.value.category_id,
      priority: createForm.value.priority || 'normal',
      branch_id: createForm.value.branch_id || null,
      assigned_to: createForm.value.assigned_to || null
    })
    showToast('Ticket created!')
    showCreate.value = false
    createForm.value = { subject: '', description: '', category_id: '', priority: 'normal', branch_id: '', assigned_to: '' }
    await loadAll()
  } catch (e) {
    showToast('Failed to create ticket', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(() => loadAll())
</script>
