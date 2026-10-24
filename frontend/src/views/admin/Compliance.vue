<template>
  <div class="space-y-6" style="background: #0a0a0f; min-height: 100vh; padding: 24px">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Contracts & Licenses</h2>
        <p class="text-sm" style="color: #6b7280">Compliance management for contracts and licenses</p>
      </div>
      <div class="flex gap-2">
        <button @click="loadAll()" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Compliance Alerts -->
    <div v-if="alerts.length" class="section-card" style="border-color: rgba(250,204,21,0.3)">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-exclamation-triangle" style="color: #facc15"></i> Expiring Within 30 Days</h3>
        <span class="badge badge-yellow">{{ alerts.length }}</span>
      </div>
      <div class="space-y-2">
        <div v-for="a in alerts" :key="a.id" class="flex items-center justify-between p-3 rounded-xl" style="background: #0d0d14">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(250,204,21,0.1)">
              <i :class="a.type === 'contract' ? 'fas fa-file-contract' : 'fas fa-id-card'" style="color: #facc15"></i>
            </div>
            <div>
              <p class="text-sm font-medium text-white">{{ a.title }}</p>
              <p class="text-xs" style="color: #6b7280">Expires {{ formatDate(a.end_date || a.expiry_date) }} — {{ a.days_left }}d remaining</p>
            </div>
          </div>
          <button @click="a.type === 'contract' ? (tab = 'contracts', openContractDetail(a)) : (tab = 'licenses', openLicenseDetail(a))" class="btn btn-secondary btn-sm text-xs">View</button>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 p-1 rounded-xl" style="background: #111118; border: 1px solid #1e1e2a; width: fit-content">
      <button @click="tab = 'contracts'" class="px-4 py-2 rounded-lg text-sm font-medium transition-all" :style="tab === 'contracts' ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'color: #6b7280'">
        <i class="fas fa-file-contract mr-1"></i> Contracts ({{ contracts.length }})
      </button>
      <button @click="tab = 'licenses'" class="px-4 py-2 rounded-lg text-sm font-medium transition-all" :style="tab === 'licenses' ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'color: #6b7280'">
        <i class="fas fa-id-card mr-1"></i> Licenses ({{ licenses.length }})
      </button>
    </div>

    <!-- CONTRACTS TAB -->
    <template v-if="tab === 'contracts'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div><p class="stat-label">Active</p><p class="stat-value" style="color: #34d399">{{ contractStats.active || 0 }}</p></div>
            <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-check-circle"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div><p class="stat-label">Expiring Soon</p><p class="stat-value" style="color: #facc15">{{ contractStats.expiring_soon || 0 }}</p></div>
            <div class="stat-icon" style="background: rgba(250,204,21,0.1); color: #facc15"><i class="fas fa-hourglass-half"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div><p class="stat-label">Expired</p><p class="stat-value" style="color: #ef4444">{{ contractStats.expired || 0 }}</p></div>
            <div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #ef4444"><i class="fas fa-times-circle"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div><p class="stat-label">Total Value</p><p class="stat-value text-sm">TSh {{ (contractStats.total_value || 0).toLocaleString() }}</p></div>
            <div class="stat-icon" style="background: rgba(255,122,48,0.1); color: #FF7A30"><i class="fas fa-coins"></i></div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 items-center">
        <select v-model="contractFilter.status" @change="loadContracts()" class="form-input" style="width: auto; min-width: 150px">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
          <option value="renewed">Renewed</option>
        </select>
        <select v-model="contractFilter.type" @change="loadContracts()" class="form-input" style="width: auto; min-width: 150px">
          <option value="">All Types</option>
          <option value="vendor">Vendor</option>
          <option value="service">Service</option>
          <option value="employment">Employment</option>
          <option value="lease">Lease</option>
          <option value="partnership">Partnership</option>
          <option value="other">Other</option>
        </select>
        <select v-model="contractFilter.branch_id" @change="loadContracts()" class="form-input" style="width: auto; min-width: 150px">
          <option value="">All Branches</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <div class="flex-1"></div>
        <button @click="showContractForm = true; editingContract = null; resetContractForm()" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> New Contract</button>
      </div>

      <div class="section-card">
        <div class="overflow-x-auto">
          <table class="re-table">
            <thead>
              <tr><th>Contract #</th><th>Title</th><th>Type</th><th>Party</th><th>Branch</th><th>Value</th><th>Start</th><th>End Date</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              <tr v-for="c in contracts" :key="c.id">
                <td class="font-medium text-white">#{{ c.contract_number || c.id }}</td>
                <td style="color: #d1d5db">{{ truncate(c.title, 35) }}</td>
                <td><span class="badge badge-blue">{{ contractTypeLabel(c.contract_type) }}</span></td>
                <td style="color: #d1d5db">{{ c.party_name || '—' }}</td>
                <td style="color: #d1d5db">{{ c.branch_name || '—' }}</td>
                <td class="text-sm" style="color: #d1d5db">TSh {{ (c.value || 0).toLocaleString() }}</td>
                <td class="text-xs" style="color: #d1d5db">{{ formatDate(c.start_date) }}</td>
                <td class="text-xs" :style="dateStyle(c.end_date)">{{ formatDate(c.end_date) }}</td>
                <td><span class="badge" :class="contractStatusClass(c)">{{ contractStatusLabel(c) }}</span></td>
                <td>
                  <button @click="openContractDetail(c)" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: rgba(59,130,246,0.1); color: #60a5fa" title="View"><i class="fas fa-eye text-xs"></i></button>
                </td>
              </tr>
              <tr v-if="!contracts.length">
                <td colspan="10" class="text-center py-10" style="color: #6b7280">
                  <i class="fas fa-file-contract text-3xl mb-3 block" style="color: #1e1e2a"></i>No contracts found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- LICENSES TAB -->
    <template v-if="tab === 'licenses'">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div><p class="stat-label">Active</p><p class="stat-value" style="color: #34d399">{{ licenseStats.active || 0 }}</p></div>
            <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-check-circle"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div><p class="stat-label">Pending Renewal</p><p class="stat-value" style="color: #facc15">{{ licenseStats.pending_renewal || 0 }}</p></div>
            <div class="stat-icon" style="background: rgba(250,204,21,0.1); color: #facc15"><i class="fas fa-hourglass-half"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div><p class="stat-label">Expired</p><p class="stat-value" style="color: #ef4444">{{ licenseStats.expired || 0 }}</p></div>
            <div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #ef4444"><i class="fas fa-times-circle"></i></div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 items-center">
        <select v-model="licenseFilter.status" @change="loadLicenses()" class="form-input" style="width: auto; min-width: 150px">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending_renewal">Pending Renewal</option>
          <option value="suspended">Suspended</option>
          <option value="revoked">Revoked</option>
        </select>
        <select v-model="licenseFilter.branch_id" @change="loadLicenses()" class="form-input" style="width: auto; min-width: 150px">
          <option value="">All Branches</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <div class="flex-1"></div>
        <button @click="showLicenseForm = true; editingLicense = null; resetLicenseForm()" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> New License</button>
      </div>

      <div class="section-card">
        <div class="overflow-x-auto">
          <table class="re-table">
            <thead>
              <tr><th>License #</th><th>Title</th><th>Type</th><th>Issuing Authority</th><th>Branch</th><th>Expiry Date</th><th>Cost</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in licenses" :key="l.id">
                <td class="font-medium text-white">#{{ l.license_number || l.id }}</td>
                <td style="color: #d1d5db">{{ truncate(l.title, 35) }}</td>
                <td><span class="badge badge-blue">{{ licenseTypeLabel(l.license_type) }}</span></td>
                <td style="color: #d1d5db">{{ l.issuing_authority || '—' }}</td>
                <td style="color: #d1d5db">{{ l.branch_name || '—' }}</td>
                <td class="text-xs" :style="dateStyle(l.expiry_date)">{{ formatDate(l.expiry_date) }}</td>
                <td class="text-sm" style="color: #d1d5db">{{ l.currency || 'TSh' }} {{ (l.cost || 0).toLocaleString() }}</td>
                <td><span class="badge" :class="licenseStatusClass(l)">{{ licenseStatusLabel(l) }}</span></td>
                <td>
                  <button @click="openLicenseDetail(l)" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: rgba(59,130,246,0.1); color: #60a5fa" title="View"><i class="fas fa-eye text-xs"></i></button>
                </td>
              </tr>
              <tr v-if="!licenses.length">
                <td colspan="9" class="text-center py-10" style="color: #6b7280">
                  <i class="fas fa-id-card text-3xl mb-3 block" style="color: #1e1e2a"></i>No licenses found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Create/Edit Contract Modal -->
    <div v-if="showContractForm" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showContractForm = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white">{{ editingContract ? 'Edit Contract' : 'Create Contract' }}</h3>
          <button @click="showContractForm = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="form-label">Title *</label>
            <input v-model="contractForm.title" class="form-input" placeholder="Contract title">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Type *</label>
              <select v-model="contractForm.contract_type" class="form-input">
                <option value="vendor">Vendor</option>
                <option value="service">Service</option>
                <option value="employment">Employment</option>
                <option value="lease">Lease</option>
                <option value="partnership">Partnership</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label class="form-label">Branch</label>
              <select v-model="contractForm.branch_id" class="form-input">
                <option value="">All Branches</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="form-label">Party Name *</label>
            <input v-model="contractForm.party_name" class="form-input" placeholder="Company or person name">
          </div>
          <div>
            <label class="form-label">Party Contact</label>
            <input v-model="contractForm.party_contact" class="form-input" placeholder="Email, phone, etc.">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Start Date</label>
              <input v-model="contractForm.start_date" type="date" class="form-input">
            </div>
            <div>
              <label class="form-label">End Date</label>
              <input v-model="contractForm.end_date" type="date" class="form-input">
            </div>
          </div>
          <div>
            <label class="form-label">Value (TSh)</label>
            <input v-model.number="contractForm.value" type="number" class="form-input" placeholder="0">
          </div>
          <div>
            <label class="form-label">Terms</label>
            <textarea v-model="contractForm.terms" class="form-input" rows="3" placeholder="Contract terms and conditions..."></textarea>
          </div>
          <div>
            <label class="form-label">Document URL</label>
            <input v-model="contractForm.document_url" class="form-input" placeholder="Link to document (optional)">
          </div>
          <div v-if="editingContract">
            <label class="form-label">Status</label>
            <select v-model="contractForm.status" class="form-input">
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
              <option value="renewed">Renewed</option>
            </select>
          </div>
          <button @click="saveContract()" class="btn btn-primary w-full" :disabled="saving">
            <i class="fas fa-save"></i> {{ saving ? 'Saving...' : (editingContract ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Contract Detail Modal -->
    <div v-if="detailContract" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="detailContract = null">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white">#{{ detailContract.contract_number || detailContract.id }}</h3>
          <button @click="detailContract = null" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="space-y-3">
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Title</span><span class="text-sm text-white">{{ detailContract.title }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Type</span><span class="badge badge-blue">{{ contractTypeLabel(detailContract.contract_type) }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Party</span><span class="text-sm" style="color: #d1d5db">{{ detailContract.party_name || '—' }}</span></div>
          <div v-if="detailContract.party_contact" class="flex justify-between"><span class="text-xs" style="color: #6b7280">Contact</span><span class="text-sm" style="color: #d1d5db">{{ detailContract.party_contact }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Branch</span><span class="text-sm" style="color: #d1d5db">{{ detailContract.branch_name || 'All' }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Value</span><span class="text-sm text-white">TSh {{ (detailContract.value || 0).toLocaleString() }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Start Date</span><span class="text-sm" style="color: #d1d5db">{{ formatDate(detailContract.start_date) }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">End Date</span><span class="text-sm" :style="dateStyle(detailContract.end_date)">{{ formatDate(detailContract.end_date) }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Status</span><span class="badge" :class="contractStatusClass(detailContract)">{{ contractStatusLabel(detailContract) }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Created By</span><span class="text-sm" style="color: #d1d5db">{{ detailContract.created_by_name || '—' }}</span></div>
          <div v-if="detailContract.terms" class="pt-2 border-t" style="border-color: #1e1e2a">
            <p class="text-xs mb-1" style="color: #6b7280">Terms</p>
            <p class="text-sm" style="color: #d1d5db; white-space: pre-wrap">{{ detailContract.terms }}</p>
          </div>
          <div v-if="detailContract.document_url" class="pt-2 border-t" style="border-color: #1e1e2a">
            <p class="text-xs mb-1" style="color: #6b7280">Document</p>
            <a :href="detailContract.document_url" target="_blank" class="text-sm" style="color: #FF7A30">View Document <i class="fas fa-external-link-alt text-xs ml-1"></i></a>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="detailContract = null; editContract(detailContract)" class="btn btn-secondary flex-1"><i class="fas fa-pen mr-1"></i> Edit</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit License Modal -->
    <div v-if="showLicenseForm" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showLicenseForm = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white">{{ editingLicense ? 'Edit License' : 'Create License' }}</h3>
          <button @click="showLicenseForm = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="form-label">Title *</label>
            <input v-model="licenseForm.title" class="form-input" placeholder="License title">
          </div>
          <div>
            <label class="form-label">License Number *</label>
            <input v-model="licenseForm.license_number" class="form-input" placeholder="Unique license number">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Type *</label>
              <select v-model="licenseForm.license_type" class="form-input">
                <option value="business">Business</option>
                <option value="telecom">Telecom</option>
                <option value="health">Health</option>
                <option value="safety">Safety</option>
                <option value="tax">Tax</option>
                <option value="environmental">Environmental</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label class="form-label">Branch</label>
              <select v-model="licenseForm.branch_id" class="form-input">
                <option value="">All Branches</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="form-label">Issuing Authority *</label>
            <input v-model="licenseForm.issuing_authority" class="form-input" placeholder="e.g. TCRA, BRELA">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Issue Date</label>
              <input v-model="licenseForm.issue_date" type="date" class="form-input">
            </div>
            <div>
              <label class="form-label">Expiry Date</label>
              <input v-model="licenseForm.expiry_date" type="date" class="form-input">
            </div>
          </div>
          <div>
            <label class="form-label">Cost (TSh)</label>
            <input v-model.number="licenseForm.cost" type="number" class="form-input" placeholder="0">
          </div>
          <div>
            <label class="form-label">Notes</label>
            <textarea v-model="licenseForm.notes" class="form-input" rows="2" placeholder="Additional notes..."></textarea>
          </div>
          <div v-if="editingLicense">
            <label class="form-label">Status</label>
            <select v-model="licenseForm.status" class="form-input">
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending_renewal">Pending Renewal</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
          <button @click="saveLicense()" class="btn btn-primary w-full" :disabled="saving">
            <i class="fas fa-save"></i> {{ saving ? 'Saving...' : (editingLicense ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>
    </div>

    <!-- License Detail Modal -->
    <div v-if="detailLicense" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="detailLicense = null">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white">#{{ detailLicense.license_number || detailLicense.id }}</h3>
          <button @click="detailLicense = null" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="space-y-3">
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Title</span><span class="text-sm text-white">{{ detailLicense.title }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">License #</span><span class="text-sm text-white">{{ detailLicense.license_number }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Type</span><span class="badge badge-blue">{{ licenseTypeLabel(detailLicense.license_type) }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Authority</span><span class="text-sm" style="color: #d1d5db">{{ detailLicense.issuing_authority }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Branch</span><span class="text-sm" style="color: #d1d5db">{{ detailLicense.branch_name || 'All' }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Issue Date</span><span class="text-sm" style="color: #d1d5db">{{ formatDate(detailLicense.issue_date) }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Expiry Date</span><span class="text-sm" :style="dateStyle(detailLicense.expiry_date)">{{ formatDate(detailLicense.expiry_date) }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Cost</span><span class="text-sm" style="color: #d1d5db">{{ detailLicense.currency || 'TSh' }} {{ (detailLicense.cost || 0).toLocaleString() }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Status</span><span class="badge" :class="licenseStatusClass(detailLicense)">{{ licenseStatusLabel(detailLicense) }}</span></div>
          <div class="flex justify-between"><span class="text-xs" style="color: #6b7280">Renewal Reminder</span><span class="text-sm" style="color: #d1d5db">{{ detailLicense.renewal_reminder_days || 30 }} days before expiry</span></div>
          <div v-if="detailLicense.notes" class="pt-2 border-t" style="border-color: #1e1e2a">
            <p class="text-xs mb-1" style="color: #6b7280">Notes</p>
            <p class="text-sm" style="color: #d1d5db; white-space: pre-wrap">{{ detailLicense.notes }}</p>
          </div>
          <div v-if="detailLicense.document_url" class="pt-2 border-t" style="border-color: #1e1e2a">
            <p class="text-xs mb-1" style="color: #6b7280">Document</p>
            <a :href="detailLicense.document_url" target="_blank" class="text-sm" style="color: #FF7A30">View Document <i class="fas fa-external-link-alt text-xs ml-1"></i></a>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="detailLicense = null; editLicense(detailLicense)" class="btn btn-secondary flex-1"><i class="fas fa-pen mr-1"></i> Edit</button>
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
import { adminGet, adminPost, adminPut } from '../../api/client'

const tab = ref('contracts')
const contracts = ref([])
const licenses = ref([])
const branches = ref([])
const alerts = ref([])
const contractStats = ref({})
const licenseStats = ref({})
const loading = ref(true)
const saving = ref(false)
const toast = ref(null)

const showContractForm = ref(false)
const showLicenseForm = ref(false)
const editingContract = ref(null)
const editingLicense = ref(null)
const detailContract = ref(null)
const detailLicense = ref(null)

const contractFilter = ref({ status: '', type: '', branch_id: '' })
const licenseFilter = ref({ status: '', branch_id: '' })

const contractForm = ref({ title: '', contract_type: 'service', party_name: '', party_contact: '', branch_id: '', start_date: '', end_date: '', value: 0, terms: '', document_url: '' })
const licenseForm = ref({ title: '', license_number: '', license_type: 'business', branch_id: '', issuing_authority: '', issue_date: '', expiry_date: '', cost: 0, notes: '' })

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s || '—' }

function daysUntil(d) {
  if (!d) return Infinity
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}

function dateStyle(d) {
  const days = daysUntil(d)
  if (days < 0) return { color: '#ef4444' }
  if (days <= 30) return { color: '#facc15' }
  return { color: '#d1d5db' }
}

const contractTypeLabels = { vendor: 'Vendor', service: 'Service', employment: 'Employment', lease: 'Lease', partnership: 'Partnership', other: 'Other' }
function contractTypeLabel(t) { return contractTypeLabels[t] || t || '—' }

const licenseTypeLabels = { business: 'Business', telecom: 'Telecom', health: 'Health', safety: 'Safety', tax: 'Tax', environmental: 'Environmental', other: 'Other' }
function licenseTypeLabel(t) { return licenseTypeLabels[t] || t || '—' }

const statusClasses = {
  active: 'badge-green', expired: 'badge-red', terminated: 'badge-red', renewed: 'badge-blue',
  pending_renewal: 'badge-yellow', suspended: 'badge-red', revoked: 'badge-red'
}
const statusLabels = {
  active: 'Active', expired: 'Expired', terminated: 'Terminated', renewed: 'Renewed',
  pending_renewal: 'Pending Renewal', suspended: 'Suspended', revoked: 'Revoked'
}

function contractStatusClass(c) { return statusClasses[c.status] || 'badge-gray' }
function contractStatusLabel(c) { return statusLabels[c.status] || c.status || '—' }
function licenseStatusClass(l) { return statusClasses[l.status] || 'badge-gray' }
function licenseStatusLabel(l) { return statusLabels[l.status] || l.status || '—' }

function resetContractForm() {
  contractForm.value = { title: '', contract_type: 'service', party_name: '', party_contact: '', branch_id: '', start_date: '', end_date: '', value: 0, terms: '', document_url: '' }
}

function resetLicenseForm() {
  licenseForm.value = { title: '', license_number: '', license_type: 'business', branch_id: '', issuing_authority: '', issue_date: '', expiry_date: '', cost: 0, notes: '' }
}

function editContract(c) {
  editingContract.value = c
  contractForm.value = {
    title: c.title || '',
    contract_type: c.contract_type || 'service',
    party_name: c.party_name || '',
    party_contact: c.party_contact || '',
    branch_id: c.branch_id || '',
    start_date: c.start_date || '',
    end_date: c.end_date || '',
    value: c.value || 0,
    terms: c.terms || '',
    document_url: c.document_url || '',
    status: c.status || 'active'
  }
  showContractForm.value = true
}

function editLicense(l) {
  editingLicense.value = l
  licenseForm.value = {
    title: l.title || '',
    license_number: l.license_number || '',
    license_type: l.license_type || 'business',
    branch_id: l.branch_id || '',
    issuing_authority: l.issuing_authority || '',
    issue_date: l.issue_date || '',
    expiry_date: l.expiry_date || '',
    cost: l.cost || 0,
    notes: l.notes || '',
    status: l.status || 'active'
  }
  showLicenseForm.value = true
}

async function openContractDetail(c) {
  try {
    const data = await adminGet(`/hq/contracts/${c.id}`)
    detailContract.value = data.contract || data
  } catch {
    detailContract.value = c
  }
}

async function openLicenseDetail(l) {
  try {
    const data = await adminGet(`/hq/licenses/${l.id}`)
    detailLicense.value = data.license || data
  } catch {
    detailLicense.value = l
  }
}

async function saveContract() {
  if (!contractForm.value.title) return showToast('Title is required', 'error')
  saving.value = true
  try {
    if (editingContract.value) {
      await adminPut(`/hq/contracts/${editingContract.value.id}`, contractForm.value)
      showToast('Contract updated!')
    } else {
      await adminPost('/hq/contracts', contractForm.value)
      showToast('Contract created!')
    }
    showContractForm.value = false
    editingContract.value = null
    resetContractForm()
    await loadAll()
  } catch (e) {
    showToast('Failed to save contract', 'error')
  } finally {
    saving.value = false
  }
}

async function saveLicense() {
  if (!licenseForm.value.title) return showToast('Title is required', 'error')
  if (!licenseForm.value.license_number) return showToast('License number is required', 'error')
  if (!licenseForm.value.issuing_authority) return showToast('Issuing authority is required', 'error')
  saving.value = true
  try {
    if (editingLicense.value) {
      await adminPut(`/hq/licenses/${editingLicense.value.id}`, licenseForm.value)
      showToast('License updated!')
    } else {
      await adminPost('/hq/licenses', licenseForm.value)
      showToast('License created!')
    }
    showLicenseForm.value = false
    editingLicense.value = null
    resetLicenseForm()
    await loadAll()
  } catch (e) {
    showToast('Failed to save license', 'error')
  } finally {
    saving.value = false
  }
}

async function loadContracts() {
  try {
    const params = new URLSearchParams()
    if (contractFilter.value.status) params.set('status', contractFilter.value.status)
    if (contractFilter.value.type) params.set('type', contractFilter.value.type)
    if (contractFilter.value.branch_id) params.set('branch_id', contractFilter.value.branch_id)
    const qs = params.toString()
    const data = await adminGet(`/hq/contracts${qs ? '?' + qs : ''}`)
    contracts.value = data.contracts || data.data || data || []
  } catch (e) {
    console.error('Failed to load contracts', e)
  }
}

async function loadLicenses() {
  try {
    const params = new URLSearchParams()
    if (licenseFilter.value.status) params.set('status', licenseFilter.value.status)
    if (licenseFilter.value.branch_id) params.set('branch_id', licenseFilter.value.branch_id)
    const qs = params.toString()
    const data = await adminGet(`/hq/licenses${qs ? '?' + qs : ''}`)
    licenses.value = data.licenses || data.data || data || []
  } catch (e) {
    console.error('Failed to load licenses', e)
  }
}

async function loadAll() {
  loading.value = true
  try {
    const [cData, lData, bData, compData] = await Promise.allSettled([
      loadContracts(),
      loadLicenses(),
      adminGet('/hq/branches'),
      adminGet('/hq/compliance-dashboard')
    ])
    if (bData.status === 'fulfilled') branches.value = bData.value.branches || bData.value.data || bData.value || []
    if (compData.status === 'fulfilled') {
      const cmp = compData.value
      alerts.value = []
      if (cmp.expiring_contracts) {
        alerts.value.push(...cmp.expiring_contracts.map(c => ({ ...c, type: 'contract', days_left: daysUntil(c.end_date) })))
      }
      if (cmp.expiring_licenses) {
        alerts.value.push(...cmp.expiring_licenses.map(l => ({ ...l, type: 'license', days_left: daysUntil(l.expiry_date) })))
      }
      alerts.value.sort((a, b) => a.days_left - b.days_left)

      contractStats.value = {
        active: cmp.active_contracts || 0,
        expiring_soon: (cmp.expiring_contracts || []).length,
        expired: (cmp.expired_contracts || []).length,
        total_value: cmp.total_contract_value || 0
      }
      licenseStats.value = {
        active: cmp.active_licenses || 0,
        pending_renewal: (cmp.expiring_licenses || []).length,
        expired: (cmp.expired_licenses || []).length
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadAll())
</script>
