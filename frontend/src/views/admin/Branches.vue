<template>
  <div class="space-y-4">
    <!-- Tabs -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex gap-2">
        <button @click="tab = 'regions'" class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="tab === 'regions' ? 'bg-[#FF7A30] text-white' : 'text-[#9ca3af] hover:text-white'" style="background: var(--bg-card); border: 1px solid var(--border)">
          <i class="fas fa-globe mr-1"></i> Regions
        </button>
        <button @click="tab = 'districts'" class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="tab === 'districts' ? 'bg-[#FF7A30] text-white' : 'text-[#9ca3af] hover:text-white'" style="background: var(--bg-card); border: 1px solid var(--border)">
          <i class="fas fa-map-marked-alt mr-1"></i> Districts
        </button>
        <button @click="tab = 'branches'" class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="tab === 'branches' ? 'bg-[#FF7A30] text-white' : 'text-[#9ca3af] hover:text-white'" style="background: var(--bg-card); border: 1px solid var(--border)">
          <i class="fas fa-building mr-1"></i> Branches
        </button>
      </div>
      <div class="flex gap-2 items-center">
        <input v-model="search" class="form-input text-sm py-1.5" placeholder="Search..." style="width: 180px">
        <select v-model="statusFilter" class="form-input text-sm py-1.5" style="width: 130px">
          <option value="">All Status</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
        <button @click="openCreate" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Add {{ tabSingular }}</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="section-card p-8 text-center" style="color: #6b7280">
      <i class="fas fa-spinner fa-spin text-lg"></i>
    </div>

    <!-- Regions Tab -->
    <div v-else-if="tab === 'regions'">
      <div v-if="filteredRegions.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="r in paginatedRegions" :key="r.id" class="section-card p-5 hover:-translate-y-0.5 transition-all cursor-pointer" @click="openEdit(r)">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-white">{{ r.name }}</h3>
            <span class="badge" :class="r.is_active ? 'badge-green' : 'badge-gray'">{{ r.is_active ? 'Active' : 'Inactive' }}</span>
          </div>
          <div class="space-y-1 text-sm" style="color: #9ca3af">
            <p><i class="fas fa-code w-4 mr-1"></i> {{ r.code || '—' }}</p>
            <p v-if="r.description"><i class="fas fa-info-circle w-4 mr-1"></i> {{ r.description }}</p>
            <p><i class="fas fa-user-tie w-4 mr-1"></i> {{ r.manager_name || 'No manager' }}</p>
            <div class="flex gap-4 pt-1">
              <span><i class="fas fa-map-marker-alt w-4 mr-1"></i> {{ r.district_count || 0 }} districts</span>
              <span><i class="fas fa-building w-4 mr-1"></i> {{ r.branch_count || 0 }} branches</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="section-card p-8 text-center" style="color: #6b7280">
        <i class="fas fa-globe text-3xl mb-3 block" style="color: #1e1e2a"></i>
        No regions found.
      </div>
      <div v-if="totalPagesRegions > 1" class="flex items-center justify-between mt-4">
        <p class="text-xs" style="color: #6b7280">Showing {{ (currentPage - 1) * perPage + 1 }}-{{ Math.min(currentPage * perPage, filteredRegions.length) }} of {{ filteredRegions.length }}</p>
        <div class="flex gap-1">
          <button @click="currentPage--" :disabled="currentPage <= 1" class="btn btn-secondary btn-sm text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"><i class="fas fa-chevron-left"></i></button>
          <span class="text-xs px-2 py-1" style="color: #6b7280">{{ currentPage }} / {{ totalPagesRegions }}</span>
          <button @click="currentPage++" :disabled="currentPage >= totalPagesRegions" class="btn btn-secondary btn-sm text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"><i class="fas fa-chevron-right"></i></button>
        </div>
      </div>
    </div>

    <!-- Districts Tab -->
    <div v-else-if="tab === 'districts'">
      <div class="section-card overflow-hidden">
        <table class="re-table">
          <thead><tr><th>Name</th><th>Code</th><th>Region</th><th>Description</th><th>Branches</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="d in paginatedDistricts" :key="d.id" class="cursor-pointer" @click="openEdit(d)">
              <td class="font-medium text-white">{{ d.name }}</td>
              <td class="text-[#d1d5db]">{{ d.code || '—' }}</td>
              <td class="text-[#d1d5db]">{{ d.region_name || '—' }}</td>
              <td class="text-[#d1d5db] max-w-[200px] truncate">{{ d.description || '—' }}</td>
              <td class="text-[#d1d5db]">{{ d.branch_count || 0 }}</td>
              <td><span class="badge" :class="d.is_active ? 'badge-green' : 'badge-gray'">{{ d.is_active ? 'Active' : 'Inactive' }}</span></td>
            </tr>
            <tr v-if="!paginatedDistricts.length">
              <td colspan="6" class="text-center py-8" style="color: #6b7280">No districts found.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPagesDistricts > 1" class="flex items-center justify-between mt-4">
        <p class="text-xs" style="color: #6b7280">Showing {{ (currentPage - 1) * perPage + 1 }}-{{ Math.min(currentPage * perPage, filteredDistricts.length) }} of {{ filteredDistricts.length }}</p>
        <div class="flex gap-1">
          <button @click="currentPage--" :disabled="currentPage <= 1" class="btn btn-secondary btn-sm text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"><i class="fas fa-chevron-left"></i></button>
          <span class="text-xs px-2 py-1" style="color: #6b7280">{{ currentPage }} / {{ totalPagesDistricts }}</span>
          <button @click="currentPage++" :disabled="currentPage >= totalPagesDistricts" class="btn btn-secondary btn-sm text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"><i class="fas fa-chevron-right"></i></button>
        </div>
      </div>
    </div>

    <!-- Branches Tab -->
    <div v-else-if="tab === 'branches'">
      <div class="section-card overflow-hidden">
        <table class="re-table">
          <thead><tr><th>Name</th><th>Code</th><th>District</th><th>Region</th><th>City</th><th>Manager</th><th>Staff</th><th>Routers</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="b in paginatedBranches" :key="b.id" class="cursor-pointer" @click="openEdit(b)">
              <td class="font-medium text-white">{{ b.name }}</td>
              <td class="text-[#d1d5db]">{{ b.code || '—' }}</td>
              <td class="text-[#d1d5db]">{{ b.district_name || '—' }}</td>
              <td class="text-[#d1d5db]">{{ b.region_name || '—' }}</td>
              <td class="text-[#d1d5db]">{{ b.city || '—' }}</td>
              <td class="text-[#d1d5db]">{{ b.manager_name || '—' }}</td>
              <td class="text-[#d1d5db]">{{ b.staff_count ?? 0 }}</td>
              <td class="text-[#d1d5db]">{{ b.router_count ?? 0 }}</td>
              <td><span class="badge" :class="b.is_active ? 'badge-green' : 'badge-gray'">{{ b.is_active ? 'Active' : 'Inactive' }}</span></td>
            </tr>
            <tr v-if="!paginatedBranches.length">
              <td colspan="9" class="text-center py-8" style="color: #6b7280">No branches found.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPagesBranches > 1" class="flex items-center justify-between mt-4">
        <p class="text-xs" style="color: #6b7280">Showing {{ (branchPage - 1) * perPage + 1 }}-{{ Math.min(branchPage * perPage, branchesTotal) }} of {{ branchesTotal }}</p>
        <div class="flex gap-1">
          <button @click="branchPage--" :disabled="branchPage <= 1" class="btn btn-secondary btn-sm text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"><i class="fas fa-chevron-left"></i></button>
          <span class="text-xs px-2 py-1" style="color: #6b7280">{{ branchPage }} / {{ totalPagesBranches }}</span>
          <button @click="branchPage++" :disabled="branchPage >= totalPagesBranches" class="btn btn-secondary btn-sm text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"><i class="fas fa-chevron-right"></i></button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showModal = false">
      <div class="section-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-white mb-4">{{ editing ? 'Edit' : 'Add' }} {{ tabSingular }}</h3>
        <form @submit.prevent="save" class="space-y-3">
          <div>
            <label class="block text-xs mb-1" style="color: #6b7280">Name *</label>
            <input v-model="form.name" required class="form-input w-full">
          </div>
          <div>
            <label class="block text-xs mb-1" style="color: #6b7280">Code *</label>
            <input v-model="form.code" required class="form-input w-full">
          </div>

          <!-- Region form fields -->
          <template v-if="tab === 'regions'">
            <div>
              <label class="block text-xs mb-1" style="color: #6b7280">Description</label>
              <textarea v-model="form.description" rows="3" class="form-input w-full"></textarea>
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: #6b7280">Manager ID</label>
              <input v-model.number="form.manager_id" type="number" placeholder="User ID" class="form-input w-full">
            </div>
          </template>

          <!-- District form fields -->
          <template v-if="tab === 'districts'">
            <div>
              <label class="block text-xs mb-1" style="color: #6b7280">Region *</label>
              <select v-model="form.region_id" required class="form-input w-full">
                <option value="">— Select Region —</option>
                <option v-for="r in regions" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: #6b7280">Description</label>
              <textarea v-model="form.description" rows="3" class="form-input w-full"></textarea>
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: #6b7280">Manager ID</label>
              <input v-model.number="form.manager_id" type="number" placeholder="User ID" class="form-input w-full">
            </div>
          </template>

          <!-- Branch form fields -->
          <template v-if="tab === 'branches'">
            <div>
              <label class="block text-xs mb-1" style="color: #6b7280">District *</label>
              <select v-model="form.district_id" required class="form-input w-full">
                <option value="">— Select District —</option>
                <option v-for="d in districts" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: #6b7280">Address</label>
              <input v-model="form.address" class="form-input w-full">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs mb-1" style="color: #6b7280">City</label>
                <input v-model="form.city" class="form-input w-full">
              </div>
              <div>
                <label class="block text-xs mb-1" style="color: #6b7280">Phone</label>
                <input v-model="form.phone" class="form-input w-full">
              </div>
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: #6b7280">Email</label>
              <input v-model="form.email" type="email" class="form-input w-full">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs mb-1" style="color: #6b7280">Latitude</label>
                <input v-model.number="form.latitude" type="number" step="any" class="form-input w-full">
              </div>
              <div>
                <label class="block text-xs mb-1" style="color: #6b7280">Longitude</label>
                <input v-model.number="form.longitude" type="number" step="any" class="form-input w-full">
              </div>
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: #6b7280">Manager ID</label>
              <input v-model.number="form.manager_id" type="number" placeholder="User ID" class="form-input w-full">
            </div>
            <div v-if="editing">
              <label class="block text-xs mb-1" style="color: #6b7280">Status</label>
              <select v-model="form.is_active" class="form-input w-full">
                <option :value="1">Active</option>
                <option :value="0">Inactive</option>
              </select>
            </div>
          </template>

          <!-- Status toggle for region/district edit -->
          <div v-if="editing && tab !== 'branches'">
            <label class="block text-xs mb-1" style="color: #6b7280">Status</label>
            <select v-model="form.is_active" class="form-input w-full">
              <option :value="1">Active</option>
              <option :value="0">Inactive</option>
            </select>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="showModal = false" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <i v-if="saving" class="fas fa-spinner fa-spin mr-1"></i>
              {{ editing ? 'Save Changes' : 'Add ' + tabSingular }}
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
import { ref, computed, onMounted, watch } from 'vue'
import { adminGet, adminPost, adminPut } from '../../api/client'

const tab = ref('regions')
const regions = ref([])
const districts = ref([])
const branches = ref([])
const branchesTotal = ref(0)
const branchPage = ref(1)
const search = ref('')
const statusFilter = ref('')
const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const loading = ref(true)
const toast = ref(null)
const currentPage = ref(1)
const perPage = 15

const form = ref(makeEmptyForm())

const tabSingular = computed(() => ({ regions: 'Region', districts: 'District', branches: 'Branch' }[tab.value]))

function makeEmptyForm() {
  return {
    name: '',
    code: '',
    description: '',
    manager_id: null,
    region_id: '',
    district_id: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    latitude: null,
    longitude: null,
    is_active: 1
  }
}

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

const filteredRegions = computed(() => {
  let list = regions.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(r => r.name.toLowerCase().includes(q) || (r.code || '').toLowerCase().includes(q))
  }
  if (statusFilter.value !== '') list = list.filter(r => String(r.is_active) === statusFilter.value)
  return list
})

const filteredDistricts = computed(() => {
  let list = districts.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(d => d.name.toLowerCase().includes(q) || (d.code || '').toLowerCase().includes(q))
  }
  if (statusFilter.value !== '') list = list.filter(d => String(d.is_active) === statusFilter.value)
  return list
})

const filteredBranches = computed(() => {
  let list = branches.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(b => b.name.toLowerCase().includes(q) || (b.code || '').toLowerCase().includes(q))
  }
  if (statusFilter.value !== '') list = list.filter(b => String(b.is_active) === statusFilter.value)
  return list
})

const totalPagesRegions = computed(() => Math.max(1, Math.ceil(filteredRegions.value.length / perPage)))
const totalPagesDistricts = computed(() => Math.max(1, Math.ceil(filteredDistricts.value.length / perPage)))

const paginatedRegions = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredRegions.value.slice(start, start + perPage)
})

const paginatedDistricts = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredDistricts.value.slice(start, start + perPage)
})

const paginatedBranches = computed(() => {
  if (search.value || statusFilter.value !== '') {
    return filteredBranches.value
  }
  return branches.value
})

const totalPagesBranches = computed(() => {
  if (search.value || statusFilter.value !== '') {
    return Math.max(1, Math.ceil(filteredBranches.value.length / perPage))
  }
  return Math.max(1, Math.ceil(branchesTotal.value / perPage))
})

watch([tab, search, statusFilter], () => {
  currentPage.value = 1
  if (tab.value === 'branches') {
    branchPage.value = 1
    if (!search.value && statusFilter.value === '') loadBranches(1)
  }
})

watch(branchPage, (p) => {
  if (tab.value === 'branches' && !search.value && statusFilter.value === '') {
    loadBranches(p)
  }
})

onMounted(async () => {
  try {
    const [r, d] = await Promise.all([
      adminGet('/hq/regions'),
      adminGet('/hq/districts')
    ])
    regions.value = r.data || r.regions || []
    districts.value = d.data || d.districts || []
    await loadBranches(1)
  } catch (e) { console.error(e) }
  loading.value = false
})

async function loadBranches(page = 1) {
  try {
    const res = await adminGet(`/hq/branches?page=${page}&limit=${perPage}`)
    const payload = res.data || res
    branches.value = payload.branches || payload || []
    branchesTotal.value = payload.total || branches.value.length
  } catch (e) {
    console.error(e)
    branches.value = []
    branchesTotal.value = 0
  }
}

async function loadData() {
  const [r, d] = await Promise.all([
    adminGet('/hq/regions'),
    adminGet('/hq/districts')
  ])
  regions.value = r.data || r.regions || []
  districts.value = d.data || d.districts || []
  if (tab.value === 'branches') {
    await loadBranches(branchPage.value)
  }
}

function resetForm() {
  form.value = makeEmptyForm()
  editing.value = null
}

function openCreate() {
  resetForm()
  showModal.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = {
    name: item.name || '',
    code: item.code || '',
    description: item.description || '',
    manager_id: item.manager_id || null,
    region_id: item.region_id || '',
    district_id: item.district_id || '',
    address: item.address || '',
    city: item.city || '',
    phone: item.phone || '',
    email: item.email || '',
    latitude: item.latitude || null,
    longitude: item.longitude || null,
    is_active: item.is_active ?? 1
  }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = {}
    payload.name = form.value.name
    payload.code = form.value.code

    if (tab.value === 'regions') {
      payload.description = form.value.description
      if (form.value.manager_id) payload.manager_id = form.value.manager_id
      if (editing.value) payload.is_active = form.value.is_active
    } else if (tab.value === 'districts') {
      payload.region_id = form.value.region_id
      payload.description = form.value.description
      if (form.value.manager_id) payload.manager_id = form.value.manager_id
      if (editing.value) payload.is_active = form.value.is_active
    } else if (tab.value === 'branches') {
      payload.district_id = form.value.district_id
      payload.address = form.value.address
      payload.city = form.value.city
      payload.phone = form.value.phone
      payload.email = form.value.email
      if (form.value.latitude) payload.latitude = form.value.latitude
      if (form.value.longitude) payload.longitude = form.value.longitude
      if (form.value.manager_id) payload.manager_id = form.value.manager_id
      if (editing.value) payload.is_active = form.value.is_active
    }

    if (editing.value) {
      await adminPut(`/hq/${tab.value}/${editing.value.id}`, payload)
      showToast(`${tabSingular.value} updated`)
    } else {
      await adminPost(`/hq/${tab.value}`, payload)
      showToast(`${tabSingular.value} created`)
    }
    showModal.value = false
    await loadData()
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to save', 'error')
  } finally {
    saving.value = false
  }
}
</script>
