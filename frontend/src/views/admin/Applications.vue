<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Partner Applications</h2>
        <p class="text-sm" style="color: #6b7280">Onboarding pipeline — from application to provisioned partner</p>
      </div>
      <button @click="loadAll()" class="btn btn-secondary btn-sm"><i class="fas fa-sync-alt"></i> Refresh</button>
    </div>

    <!-- Pipeline Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div v-for="s in pipelineStages" :key="s.key" class="stat-card cursor-pointer transition-all hover:-translate-y-0.5"
        :style="statusFilter === s.key ? 'border: 1px solid ' + s.color + '; background: ' + s.bg : ''"
        @click="statusFilter = statusFilter === s.key ? '' : s.key; loadAll()">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">{{ s.label }}</p>
            <p class="stat-value" :style="{ color: s.color }">{{ appStats[s.key] || 0 }}</p>
          </div>
          <div class="stat-icon" :style="{ background: s.bg, color: s.color }"><i :class="s.icon"></i></div>
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="section-card p-4">
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs font-medium" style="color: #6b7280">Pipeline:</span>
        <button v-for="s in pipelineStages" :key="s.key" @click="statusFilter = statusFilter === s.key ? '' : s.key; loadAll()"
          class="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          :style="statusFilter === s.key ? 'background: ' + s.bg + '; color: ' + s.color + '; border: 1px solid ' + s.border : 'background: #0a0a0f; border: 1px solid var(--border); color: #6b7280'">
          {{ s.label }} ({{ appStats[s.key] || 0 }})
        </button>
        <select v-model="typeFilter" @change="loadAll()" class="form-input" style="max-width: 140px">
          <option value="">All Types</option>
          <option value="franchise">Franchise</option>
          <option value="sponsor">Sponsor</option>
          <option value="bank">Bank</option>
          <option value="investor">Investor</option>
          <option value="reseller">Reseller</option>
        </select>
      </div>
    </div>

    <!-- Application List -->
    <div class="section-card">
      <div class="section-body">
        <div v-for="app in applications" :key="app.id" class="p-4 rounded-xl mb-3 transition-all hover:-translate-y-0.5 cursor-pointer"
          style="background: #0a0a0f; border: 1px solid var(--border)" @click="viewApp = app">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                :style="{ background: stageColor(app.status).bg, color: stageColor(app.status).color }">
                <i :class="stageIcon(app.status)"></i>
              </div>
              <div>
                <p class="font-medium text-white text-sm">{{ app.business_name || app.contact_person || 'Unknown' }}</p>
                <p class="text-xs" style="color: #6b7280">{{ app.contact_person }} &bull; {{ app.phone }} &bull; {{ app.email }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="roleBadge(app.business_type)">{{ app.business_type || 'Partner' }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full" :class="statusBadge(app.status)">{{ (app.status || 'pending').replace('_',' ').toUpperCase() }}</span>
              <span class="text-xs" style="color: #6b7280">{{ fmtDate(app.created_at) }}</span>
              <i class="fas fa-chevron-right text-xs" style="color: #6b7280"></i>
            </div>
          </div>
        </div>
        <div v-if="!applications.length" class="text-center py-12" style="color: #6b7280">
          <i class="fas fa-inbox text-3xl mb-3 block" style="color: #1e1e2a"></i>
          <p>No applications found</p>
        </div>
      </div>
    </div>

    <!-- DETAIL MODAL -->
    <div v-if="viewApp" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px)">
      <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <button @click="viewApp = null" class="absolute top-4 right-4" style="color: #6b7280"><i class="fas fa-times text-lg hover:text-white"></i></button>

        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center"
            :style="{ background: stageColor(viewApp.status).bg, color: stageColor(viewApp.status).color }">
            <i :class="stageIcon(viewApp.status)" class="text-lg"></i>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">{{ viewApp.business_name || viewApp.contact_person }}</h3>
            <p class="text-sm" style="color: #6b7280">{{ viewApp.business_type || 'Partner' }} &bull; {{ viewApp.status }}</p>
          </div>
        </div>

        <!-- Info Grid -->
        <div class="grid grid-cols-2 gap-3 mb-6">
          <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Contact Person</p>
            <p class="text-sm font-medium text-white mt-1">{{ viewApp.contact_person || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Phone</p>
            <p class="text-sm font-medium text-white mt-1">{{ viewApp.phone || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Email</p>
            <p class="text-sm font-medium text-white mt-1">{{ viewApp.email || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Location</p>
            <p class="text-sm font-medium text-white mt-1">{{ viewApp.location || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Package Type</p>
            <p class="text-sm font-medium text-white mt-1">{{ viewApp.package_type || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Applied</p>
            <p class="text-sm font-medium text-white mt-1">{{ fmtDate(viewApp.created_at) }}</p>
          </div>
        </div>

        <!-- Message -->
        <div v-if="viewApp.message" class="mb-6 p-4 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
          <p class="text-xs font-medium mb-2" style="color: #6b7280">Applicant Message</p>
          <p class="text-sm text-white">{{ viewApp.message }}</p>
        </div>

        <!-- Notes -->
        <div v-if="viewApp.notes" class="mb-6 p-4 rounded-xl" style="background: rgba(255,122,48,0.05); border: 1px solid rgba(255,122,48,0.15)">
          <p class="text-xs font-medium mb-2" style="color: #FF7A30">Admin Notes</p>
          <p class="text-sm text-white whitespace-pre-wrap">{{ viewApp.notes }}</p>
        </div>

        <!-- Pipeline Actions -->
        <div class="mb-6">
          <p class="text-xs font-medium mb-3" style="color: #6b7280">Move to Stage:</p>
          <div class="flex flex-wrap gap-2">
            <button v-for="s in pipelineStages" :key="s.key" @click="moveStage(s.key)"
              class="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              :style="viewApp.status === s.key ? 'background: ' + s.bg + '; color: ' + s.color + '; border: 1px solid ' + s.border : 'background: #0a0a0f; border: 1px solid var(--border); color: #6b7280'">
              <i :class="s.icon" class="mr-1"></i>{{ s.label }}
            </button>
          </div>
        </div>

        <!-- Notes Input -->
        <div class="mb-6">
          <label class="input-label">Add Note</label>
          <textarea v-model="adminNote" class="form-input" rows="2" placeholder="Add a note about this application..."></textarea>
          <button @click="saveNote()" class="btn btn-secondary btn-sm mt-2" :disabled="!adminNote"><i class="fas fa-save mr-1"></i> Save Note</button>
        </div>

        <!-- Provision Account -->
        <div v-if="viewApp.status === 'approved'" class="p-4 rounded-xl" style="background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2)">
          <p class="text-sm font-medium text-white mb-2"><i class="fas fa-rocket mr-1" style="color: #34d399"></i> Ready to Provision</p>
          <p class="text-xs mb-3" style="color: #6b7280">This application is approved. Create an account for this partner.</p>
          <button @click="provisionAccount()" class="btn btn-primary btn-sm" :disabled="provisioning">
            <i v-if="provisioning" class="fas fa-spinner fa-spin mr-1"></i>
            <i v-else class="fas fa-user-plus mr-1"></i> Provision Account
          </button>
          <div v-if="provisionResult" class="mt-3 p-3 rounded-xl text-sm" style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2)">
            <p class="text-green-400 font-medium">{{ provisionResult.message }}</p>
            <p class="text-xs text-white mt-1" v-if="provisionResult.account">
              Email: {{ provisionResult.account.email }} &bull; Temp Password: <code class="text-yellow-400">{{ provisionResult.account.tempPassword }}</code> &bull; Role: {{ provisionResult.account.role }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toast.show" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium"
      :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminGet, adminPost, adminPut } from '../../api/client'

const statusFilter = ref('')
const typeFilter = ref('')
const applications = ref([])
const appStats = ref({})
const viewApp = ref(null)
const adminNote = ref('')
const provisioning = ref(false)
const provisionResult = ref(null)

const toast = ref({ show: false, message: '', type: 'success' })
function showToast(msg, type = 'success') { toast.value = { show: true, message: msg, type }; setTimeout(() => toast.value.show = false, 3000) }

const pipelineStages = [
  { key: 'pending', label: 'New', icon: 'fas fa-inbox', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  { key: 'contacted', label: 'Contacted', icon: 'fas fa-phone', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  { key: 'documents_review', label: 'Docs Review', icon: 'fas fa-file-alt', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
  { key: 'approved', label: 'Approved', icon: 'fas fa-check-circle', color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  { key: 'rejected', label: 'Rejected', icon: 'fas fa-times-circle', color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  { key: 'provisioned', label: 'Provisioned', icon: 'fas fa-rocket', color: '#FF7A30', bg: 'rgba(255,122,48,0.1)', border: 'rgba(255,122,48,0.3)' }
]

function stageColor(status) { return pipelineStages.find(s => s.key === status) || pipelineStages[0] }
function stageIcon(status) { return stageColor(status).icon }
function statusBadge(s) {
  const m = { pending: 'bg-yellow-500/10 text-yellow-400', contacted: 'bg-blue-500/10 text-blue-400', documents_review: 'bg-purple-500/10 text-purple-400', approved: 'bg-green-500/10 text-green-400', rejected: 'bg-red-500/10 text-red-400', provisioned: 'bg-orange-500/10 text-orange-400' }
  return m[s] || m.pending
}
function roleBadge(type) {
  const m = { franchise: 'bg-blue-500/10 text-blue-400', sponsor: 'bg-purple-500/10 text-purple-400', bank: 'bg-green-500/10 text-green-400', investor: 'bg-yellow-500/10 text-yellow-400', reseller: 'bg-orange-500/10 text-orange-400' }
  return m[type] || 'bg-gray-500/10 text-gray-400'
}

function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }

async function loadAll() {
  try {
    const params = new URLSearchParams()
    if (statusFilter.value) params.set('status', statusFilter.value)
    if (typeFilter.value) params.set('business_type', typeFilter.value)
    const r = await adminGet('/business/applications?' + params.toString())
    applications.value = r.applications || []
    appStats.value = r.stats || {}
  } catch (e) { console.error(e) }
}

async function moveStage(newStatus) {
  if (!viewApp.value) return
  try {
    await adminPut('/business/applications/' + viewApp.value.id + '/stage', { status: newStatus, notes: adminNote.value || null })
    viewApp.value.status = newStatus
    adminNote.value = ''
    showToast('Application moved to ' + newStatus.replace('_', ' '))
    loadAll()
  } catch (e) { showToast('Failed', 'error') }
}

async function saveNote() {
  if (!viewApp.value || !adminNote.value) return
  try {
    await adminPut('/business/applications/' + viewApp.value.id + '/stage', { status: viewApp.value.status, notes: adminNote.value })
    showToast('Note saved')
    adminNote.value = ''
  } catch (e) { showToast('Failed', 'error') }
}

async function provisionAccount() {
  if (!viewApp.value) return
  provisioning.value = true
  provisionResult.value = null
  try {
    const r = await adminPost('/business/applications/' + viewApp.value.id + '/provision')
    provisionResult.value = r
    showToast('Account provisioned!')
    loadAll()
  } catch (e) { showToast('Provision failed: ' + (e.response?.data?.message || e.message), 'error') }
  provisioning.value = false
}

onMounted(loadAll)
</script>
