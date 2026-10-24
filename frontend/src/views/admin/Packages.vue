<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Packages & Vouchers</h2>
        <p class="text-sm" style="color: #6b7280">Manage internet packages, generate and track vouchers</p>
      </div>
      <div class="flex gap-2">
        <button @click="refreshAll()" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Packages</p>
            <p class="stat-value">{{ packages.length }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-box"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Available Vouchers</p>
            <p class="stat-value" style="color: #34d399">{{ statsData.available || 0 }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-ticket"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Redeemed Today</p>
            <p class="stat-value" style="color: #f59e0b">{{ statsData.todayUsed || 0 }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b"><i class="fas fa-check-double"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total Revenue</p>
            <p class="stat-value text-sm" style="color: #FF7A30; line-height: 1.6">TSh {{ formatMoney(statsData.totalRevenue || 0) }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(255,122,48,0.1); color: #FF7A30"><i class="fas fa-coins"></i></div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="section-card" style="padding: 4px">
      <div class="flex gap-1">
        <button v-for="t in tabs" :key="t.key" @click="activeTab = t.key; onTabChange()"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :style="activeTab === t.key ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'background: transparent; color: #6b7280'">
          <i :class="t.icon" class="mr-1.5"></i>{{ t.label }}
        </button>
      </div>
    </div>

    <!-- ===================== PACKAGES TAB ===================== -->
    <template v-if="activeTab === 'packages'">
      <div class="flex justify-end mb-2">
        <button @click="openPackageForm(null)" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Add Package</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="pkg in packages" :key="pkg.id" class="relative rounded-2xl overflow-hidden transition-all hover:-translate-y-1" style="background: #111118; border: 1px solid var(--border)">
          <div class="h-2" :class="pkg.is_active ? '' : 'opacity-30'" :style="{ background: pkgColor(pkg.id) }"></div>
          <div class="p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs px-2.5 py-1 rounded-full font-medium" :style="{ background: pkgColor(pkg.id) + '18', color: pkgColor(pkg.id) }">{{ formatDuration(pkg.duration_hours) }}</span>
              <div class="flex items-center gap-1.5">
                <button @click="togglePackage(pkg)" class="w-6 h-6 rounded-full flex items-center justify-center transition-all" :title="pkg.is_active ? 'Deactivate' : 'Activate'" :style="pkg.is_active ? 'background: rgba(16,185,129,0.15); color: #34d399' : 'background: rgba(107,114,128,0.15); color: #6b7280'">
                  <i class="fas" :class="pkg.is_active ? 'fa-toggle-on' : 'fa-toggle-off'" style="font-size: 14px"></i>
                </button>
                <button @click="openPackageForm(pkg)" class="w-6 h-6 rounded-full flex items-center justify-center" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-pen text-xs"></i></button>
              </div>
            </div>
            <h3 class="text-lg font-bold text-white mb-0.5">{{ pkg.name }}</h3>
            <p class="text-2xl font-bold mb-3" style="color: #FF7A30">TSh {{ formatMoney(pkg.price) }}</p>
            <p class="text-xs mb-4" style="color: #6b7280">{{ pkg.description || 'No description' }}</p>
            <div class="space-y-2 mb-4">
              <div class="flex items-center justify-between text-xs"><span style="color: #6b7280"><i class="fas fa-clock w-4 mr-1"></i>Duration</span><span class="text-white font-medium">{{ formatDuration(pkg.duration_hours) }}</span></div>
              <div class="flex items-center justify-between text-xs"><span style="color: #6b7280"><i class="fas fa-database w-4 mr-1"></i>Data Cap</span><span class="text-white font-medium">{{ formatDataCap(pkg.data_limit_mb) }}</span></div>
              <div class="flex items-center justify-between text-xs"><span style="color: #6b7280"><i class="fas fa-tachometer-alt w-4 mr-1"></i>Speed</span><span class="text-white font-medium">{{ pkg.speed_limit_mbps ? pkg.speed_limit_mbps + ' Mbps' : 'Unlimited' }}</span></div>
            </div>
            <div class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
              <div class="flex items-center justify-between text-xs"><span style="color: #6b7280">Vouchers</span><span class="text-white font-medium">{{ pkg.total_vouchers || pkgVoucherCount(pkg.id) }}</span></div>
              <div class="flex items-center justify-between text-xs mt-1"><span style="color: #6b7280">Redeemed</span><span class="font-medium" style="color: #34d399">{{ pkg.redeemed || pkgRedeemedCount(pkg.id) }}</span></div>
              <div v-if="pkg.revenue" class="flex items-center justify-between text-xs mt-1"><span style="color: #6b7280">Revenue</span><span class="font-medium" style="color: #f59e0b">TSh {{ Number(pkg.revenue).toLocaleString() }}</span></div>
              <div class="flex gap-3 mt-2 text-xs" style="color: #6b7280">
                <span v-if="pkg.week_sales">7d: <b class="text-white">{{ pkg.week_sales }}</b></span>
                <span v-if="pkg.month_sales">30d: <b class="text-white">{{ pkg.month_sales }}</b></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!packages.length && !loading" class="text-center py-16" style="color: #6b7280"><i class="fas fa-box text-4xl mb-3 block" style="color: #1e1e2a"></i><p>No packages configured</p></div>
    </template>

    <!-- ===================== GENERATE TAB ===================== -->
    <template v-if="activeTab === 'generate'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="section-card">
          <div class="section-header"><h3 class="section-title"><i class="fas fa-plus-circle" style="color: #FF7A30"></i> Generate Vouchers</h3></div>
          <div class="section-body space-y-4">
            <div><label class="input-label">Issued To (Reseller / Distributor)</label><input v-model="genForm.issuedTo" class="form-input" placeholder="Enter name of reseller or distributor"></div>
            <div>
              <label class="input-label">Select Packages &amp; Quantities</label>
              <div class="space-y-2">
                <div v-for="pkg in activePackages" :key="pkg.id" class="flex items-center gap-3 p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full" :style="{ background: pkgColor(pkg.id) }"></div><span class="text-sm font-medium text-white">{{ pkg.name }}</span><span class="text-xs" style="color: #6b7280">TSh {{ formatMoney(pkg.price) }}</span></div>
                    <p class="text-xs mt-0.5" style="color: #4b5563">{{ formatDuration(pkg.duration_hours) }}</p>
                  </div>
                  <input v-model.number="genForm.vouchers[pkg.id]" type="number" min="0" max="5000" class="form-input text-center" style="width: 80px" placeholder="0">
                  <div class="text-right" style="width: 80px"><p class="text-xs text-white font-medium">TSh {{ formatMoney((genForm.vouchers[pkg.id] || 0) * pkg.price) }}</p></div>
                </div>
              </div>
            </div>
            <div class="p-4 rounded-xl" style="background: rgba(255,122,48,0.05); border: 1px solid rgba(255,122,48,0.15)">
              <div class="flex items-center justify-between text-sm mb-1"><span style="color: #9ca3af">Total Vouchers</span><span class="font-bold text-white">{{ totalGenCount }}</span></div>
              <div class="flex items-center justify-between text-sm"><span style="color: #9ca3af">Total Value</span><span class="font-bold" style="color: #FF7A30">TSh {{ formatMoney(totalGenValue) }}</span></div>
            </div>
            <button @click="generateVouchers()" :disabled="!canGenerate || generating" class="btn btn-primary w-full"><i class="fas mr-1" :class="generating ? 'fa-spinner fa-spin' : 'fa-cog'"></i>{{ generating ? 'Generating...' : 'Generate Vouchers' }}</button>
          </div>
        </div>
        <div class="section-card">
          <div class="section-header"><h3 class="section-title"><i class="fas fa-layer-group" style="color: #60a5fa"></i> Recent Batches</h3></div>
          <div class="section-body">
            <div v-if="batches.length" class="space-y-3">
              <div v-for="b in batches" :key="b.id" class="p-4 rounded-xl cursor-pointer hover:border-[#2a2a3a]" style="background: #0a0a0f; border: 1px solid var(--border)" @click="viewBatch(b)">
                <div class="flex items-center justify-between mb-2"><span class="font-medium text-white text-sm">{{ b.batch_name }}</span><span class="text-xs" style="color: #6b7280">{{ formatDate(b.created_at) }}</span></div>
                <div class="flex items-center justify-between text-xs"><span style="color: #6b7280">Issued to: <span class="text-white">{{ b.issued_to || 'N/A' }}</span></span><span style="color: #6b7280">by <span class="text-white">{{ b.created_by_name || 'Admin' }}</span></span></div>
                <div class="flex items-center gap-4 mt-2">
                  <span class="text-xs"><span class="text-white font-medium">{{ b.voucher_count || b.total_vouchers }}</span> <span style="color: #6b7280">vouchers</span></span>
                  <span class="text-xs"><span class="font-medium" style="color: #34d399">{{ b.redeemed_count || 0 }}</span> <span style="color: #6b7280">redeemed</span></span>
                  <span class="text-xs"><span class="font-medium" style="color: #FF7A30">TSh {{ formatMoney(b.total_value) }}</span></span>
                </div>
                <div class="mt-2 h-1.5 rounded-full" style="background: #1e1e2a"><div class="h-full rounded-full" style="background: #34d399" :style="{ width: batchRedeemPercent(b) + '%' }"></div></div>
              </div>
            </div>
            <div v-else class="text-center py-8" style="color: #6b7280"><i class="fas fa-layer-group text-3xl mb-3 block" style="color: #1e1e2a"></i><p>No batches generated yet</p></div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== INVENTORY TAB ===================== -->
    <template v-if="activeTab === 'inventory'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-ticket" style="color: #FF7A30"></i> Voucher Inventory</h3>
          <div class="flex gap-2 flex-wrap">
            <div class="relative"><input v-model="invSearch" @input="debouncedLoadInventory" placeholder="Search code or package..." class="form-input" style="max-width: 220px; padding-left: 32px"><i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs" style="color: #6b7280"></i></div>
            <select v-model="invStatus" @change="loadInventory()" class="form-input" style="max-width: 130px"><option value="">All Status</option><option value="available">Available</option><option value="used">Redeemed</option></select>
            <select v-model="invPackageId" @change="loadInventory()" class="form-input" style="max-width: 140px"><option value="">All Packages</option><option v-for="p in packages" :key="p.id" :value="p.id">{{ p.name }}</option></select>
          </div>
        </div>
        <div class="section-body">
          <div v-if="inventory.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr style="border-bottom: 1px solid var(--border)"><th class="text-left py-3 px-3 text-xs font-medium" style="color: #6b7280">Code</th><th class="text-left py-3 px-3 text-xs font-medium" style="color: #6b7280">Package</th><th class="text-left py-3 px-3 text-xs font-medium" style="color: #6b7280">Price</th><th class="text-left py-3 px-3 text-xs font-medium" style="color: #6b7280">Batch</th><th class="text-left py-3 px-3 text-xs font-medium" style="color: #6b7280">Status</th><th class="text-left py-3 px-3 text-xs font-medium" style="color: #6b7280">Used By</th><th class="text-left py-3 px-3 text-xs font-medium" style="color: #6b7280">Date</th></tr></thead>
              <tbody>
                <tr v-for="v in inventory" :key="v.id" style="border-bottom: 1px solid rgba(30,30,42,0.5)" class="hover:bg-white/[0.02]">
                  <td class="py-2.5 px-3 font-mono text-xs font-bold tracking-wider" style="color: #FF7A30">{{ v.voucher_code }}</td>
                  <td class="py-2.5 px-3 text-white">{{ v.package_name || '—' }}</td>
                  <td class="py-2.5 px-3" style="color: #9ca3af">TSh {{ formatMoney(v.price) }}</td>
                  <td class="py-2.5 px-3 text-xs" style="color: #6b7280">{{ v.batch_name || '—' }}</td>
                  <td class="py-2.5 px-3"><span class="text-xs px-2 py-0.5 rounded-full" :class="v.is_used ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'">{{ v.is_used ? 'Redeemed' : 'Available' }}</span></td>
                  <td class="py-2.5 px-3 text-xs" style="color: #6b7280">{{ v.used_by_name || '—' }}</td>
                  <td class="py-2.5 px-3 text-xs" style="color: #6b7280">{{ v.created_at ? new Date(v.created_at).toLocaleDateString() : '—' }}</td>
                </tr>
              </tbody>
            </table>
            <div class="flex items-center justify-between mt-4 pt-4" style="border-top: 1px solid var(--border)">
              <p class="text-xs" style="color: #6b7280">Showing {{ inventory.length }} of {{ invTotal }} vouchers</p>
              <div class="flex gap-1">
                <button @click="invPage > 1 && (invPage--, loadInventory())" :disabled="invPage <= 1" class="btn btn-secondary btn-sm text-xs px-3 py-1 disabled:opacity-40"><i class="fas fa-chevron-left"></i></button>
                <span class="text-xs px-3 py-1" style="color: #6b7280">{{ invPage }} / {{ Math.max(1, Math.ceil(invTotal / 50)) }}</span>
                <button @click="invPage < Math.ceil(invTotal / 50) && (invPage++, loadInventory())" :disabled="invPage >= Math.ceil(invTotal / 50)" class="btn btn-secondary btn-sm text-xs px-3 py-1 disabled:opacity-40"><i class="fas fa-chevron-right"></i></button>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12" style="color: #6b7280"><i class="fas fa-ticket text-3xl mb-3 block" style="color: #1e1e2a"></i><p>{{ loading ? 'Loading vouchers...' : 'No vouchers found' }}</p></div>
        </div>
      </div>
    </template>

    <!-- ===================== BREAKDOWN TAB ===================== -->
    <template v-if="activeTab === 'breakdown'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="bp in statsData.byPackage || []" :key="bp.id" class="section-card p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" :style="{ background: pkgColor(bp.id) + '18' }"><i class="fas fa-wifi" :style="{ color: pkgColor(bp.id) }"></i></div>
            <div><h4 class="font-bold text-white">{{ bp.name }}</h4><p class="text-xs" style="color: #6b7280">TSh {{ formatMoney(bp.price) }} &middot; {{ formatDuration(bp.duration_hours) }}</p></div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-2 rounded-lg" style="background: #0a0a0f"><p class="text-lg font-bold text-white">{{ bp.total || 0 }}</p><p class="text-xs" style="color: #6b7280">Total</p></div>
            <div class="p-2 rounded-lg" style="background: #0a0a0f"><p class="text-lg font-bold" style="color: #34d399">{{ bp.available || 0 }}</p><p class="text-xs" style="color: #6b7280">Available</p></div>
            <div class="p-2 rounded-lg" style="background: #0a0a0f"><p class="text-lg font-bold" style="color: #60a5fa">{{ bp.used || 0 }}</p><p class="text-xs" style="color: #6b7280">Used</p></div>
          </div>
          <div class="mt-3">
            <div class="flex items-center justify-between text-xs mb-1"><span style="color: #6b7280">Redemption Rate</span><span class="text-white font-medium">{{ bp.total ? Math.round((bp.used / bp.total) * 100) : 0 }}%</span></div>
            <div class="h-2 rounded-full" style="background: #1e1e2a"><div class="h-full rounded-full" :style="{ width: (bp.total ? (bp.used / bp.total) * 100 : 0) + '%', background: pkgColor(bp.id) }"></div></div>
          </div>
          <div class="mt-3 pt-3 flex items-center justify-between" style="border-top: 1px solid var(--border)"><span class="text-xs" style="color: #6b7280">Revenue</span><span class="text-sm font-bold" style="color: #FF7A30">TSh {{ formatMoney((bp.used || 0) * bp.price) }}</span></div>
        </div>
      </div>
      <div v-if="!(statsData.byPackage || []).length" class="text-center py-16" style="color: #6b7280"><i class="fas fa-chart-pie text-3xl mb-3 block" style="color: #1e1e2a"></i><p>No data yet</p></div>
    </template>

    <!-- ===================== BATCH DETAIL MODAL ===================== -->
    <div v-if="batchDetail" class="fixed inset-0 flex items-center justify-center z-50 p-4" style="background: rgba(0,0,0,0.7)" @click.self="batchDetail = null">
      <div class="section-card w-full max-w-3xl max-h-[85vh] overflow-y-auto">
        <div class="p-5 flex items-center justify-between" style="border-bottom: 1px solid var(--border)">
          <div><h3 class="text-lg font-bold text-white">{{ batchDetail.batch_name }}</h3><p class="text-xs" style="color: #6b7280">Issued to: {{ batchDetail.issued_to || 'N/A' }}</p></div>
          <button @click="batchDetail = null" class="p-2 rounded-lg" style="color: #6b7280"><i class="fas fa-times text-lg hover:text-white"></i></button>
        </div>
        <div class="p-5">
          <div v-if="batchVouchers.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr style="border-bottom: 1px solid var(--border)"><th class="text-left py-2 px-3 text-xs font-medium" style="color: #6b7280">Code</th><th class="text-left py-2 px-3 text-xs font-medium" style="color: #6b7280">Package</th><th class="text-left py-2 px-3 text-xs font-medium" style="color: #6b7280">Price</th><th class="text-left py-2 px-3 text-xs font-medium" style="color: #6b7280">Status</th><th class="text-left py-2 px-3 text-xs font-medium" style="color: #6b7280">Used By</th></tr></thead>
              <tbody>
                <tr v-for="v in batchVouchers" :key="v.id || v.voucher_code" style="border-bottom: 1px solid rgba(30,30,42,0.5)" class="hover:bg-white/[0.02]">
                  <td class="py-2 px-3 font-mono text-xs font-bold tracking-wider" style="color: #FF7A30">{{ v.voucher_code }}</td>
                  <td class="py-2 px-3 text-white text-xs">{{ v.package_name || '—' }}</td>
                  <td class="py-2 px-3 text-xs" style="color: #9ca3af">TSh {{ formatMoney(v.price) }}</td>
                  <td class="py-2 px-3"><span class="text-xs px-2 py-0.5 rounded-full" :class="v.is_used ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'">{{ v.is_used ? 'Redeemed' : 'Available' }}</span></td>
                  <td class="py-2 px-3 text-xs" style="color: #6b7280">{{ v.used_by_name || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-center py-8" style="color: #6b7280"><p>Loading vouchers...</p></div>
        </div>
      </div>
    </div>

    <!-- ===================== PACKAGE FORM MODAL ===================== -->
    <div v-if="showPkgForm" class="fixed inset-0 flex items-center justify-center z-50 p-4" style="background: rgba(0,0,0,0.6)" @click.self="showPkgForm = false">
      <div class="section-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-5 flex items-center justify-between" style="border-bottom: 1px solid var(--border)">
          <h3 class="text-lg font-bold text-white">{{ editingPkg ? 'Edit Package' : 'Add New Package' }}</h3>
          <button @click="showPkgForm = false" class="p-2 rounded-lg" style="color: #6b7280"><i class="fas fa-times text-lg hover:text-white"></i></button>
        </div>
        <div class="p-5">
          <form @submit.prevent="savePackage()" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="input-label">Name *</label><input v-model="pkgForm.name" required class="form-input" placeholder="e.g. MASAA 6"></div>
              <div><label class="input-label">Price (TZS) *</label><input v-model.number="pkgForm.price" type="number" required class="form-input" placeholder="500"></div>
            </div>
            <div><label class="input-label">Description</label><input v-model="pkgForm.description" class="form-input" placeholder="6 hours of internet access"></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="input-label">Duration *</label><div class="flex gap-2"><input v-model.number="durationVal" type="number" required class="form-input flex-1" placeholder="6"><select v-model="durationUnit" class="form-input" style="width: 90px"><option value="hours">Hours</option><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option></select></div></div>
              <div><label class="input-label">Data Cap (MB, 0=Unlimited)</label><input v-model.number="pkgForm.data_limit_mb" type="number" class="form-input" placeholder="0"></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="input-label">Speed Limit (Mbps, 0=Unlimited)</label><input v-model.number="pkgForm.speed_limit_mbps" type="number" class="form-input" placeholder="0"></div>
              <div><label class="input-label">Sort Order</label><input v-model.number="pkgForm.sort_order" type="number" class="form-input" placeholder="0"></div>
            </div>
            <div class="flex items-center gap-2"><input type="checkbox" v-model="pkgForm.is_active" class="accent-[#FF7A30]" id="pkgActive"><label for="pkgActive" class="text-sm" style="color: #9ca3af">Active (available for purchase)</label></div>
            <div class="flex justify-end gap-3 pt-3" style="border-top: 1px solid var(--border)">
              <button type="button" @click="showPkgForm = false" class="btn btn-ghost">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="saving"><i v-if="saving" class="fas fa-spinner fa-spin mr-1"></i>{{ editingPkg ? 'Save Changes' : 'Add Package' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slideIn" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminGet, adminPost, adminPut, adminDelete } from '../../api/client'

const activeTab = ref('packages')
const tabs = [
  { key: 'packages', label: 'Packages', icon: 'fas fa-box' },
  { key: 'generate', label: 'Generate', icon: 'fas fa-cog' },
  { key: 'inventory', label: 'Inventory', icon: 'fas fa-ticket' },
  { key: 'breakdown', label: 'Breakdown', icon: 'fas fa-chart-bar' }
]

const loading = ref(false)
const packages = ref([])
const pkgSummary = ref({})
const batches = ref([])
const statsData = ref({})
const inventory = ref([])
const invTotal = ref(0)
const invPage = ref(1)
const invSearch = ref('')
const invStatus = ref('')
const invPackageId = ref('')
const batchDetail = ref(null)
const batchVouchers = ref([])
const showPkgForm = ref(false)
const editingPkg = ref(null)
const saving = ref(false)
const generating = ref(false)
const toast = ref(null)

const genForm = ref({ issuedTo: '', vouchers: {} })
const pkgForm = ref({ name: '', description: '', price: 0, data_limit_mb: 0, speed_limit_mbps: 0, is_active: true, sort_order: 0 })
const durationVal = ref(6)
const durationUnit = ref('hours')

const pkgColors = ['#FF7A30', '#60a5fa', '#34d399', '#a78bfa', '#f59e0b', '#f87171', '#ec4899', '#06b6d4']
function pkgColor(id) { return pkgColors[((id || 0) - 1) % pkgColors.length] || pkgColors[0] }

const activePackages = computed(() => packages.value.filter(p => p.is_active))

const totalGenCount = computed(() => Object.values(genForm.value.vouchers).reduce((s, v) => s + (parseInt(v) || 0), 0))
const totalGenValue = computed(() => {
  return activePackages.value.reduce((s, p) => s + (parseInt(genForm.value.vouchers[p.id]) || 0) * p.price, 0)
})
const canGenerate = computed(() => totalGenCount.value > 0 && genForm.value.issuedTo.trim())

function pkgVoucherCount(pkgId) {
  const bp = (statsData.value.byPackage || []).find(b => b.id === pkgId)
  return bp ? bp.total || 0 : 0
}
function pkgRedeemedCount(pkgId) {
  const bp = (statsData.value.byPackage || []).find(b => b.id === pkgId)
  return bp ? bp.used || 0 : 0
}
function batchRedeemPercent(b) {
  const total = b.voucher_count || b.total_vouchers || 0
  if (!total) return 0
  return Math.round(((b.redeemed_count || 0) / total) * 100)
}

function formatMoney(n) { return Number(n || 0).toLocaleString() }
function formatDuration(h) {
  if (!h) return '—'
  if (h < 24) return h + 'h'
  if (h === 168) return '1 week'
  if (h === 720) return '1 month'
  const d = h / 24
  return d === Math.floor(d) ? d + 'd' : h + 'h'
}
function formatDataCap(mb) {
  if (!mb || mb === 0) return 'Unlimited'
  return mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb + ' MB'
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

let debounceTimer = null
function debouncedLoadInventory() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadInventory(), 300)
}

function onTabChange() {
  if (activeTab.value === 'inventory') loadInventory()
  if (activeTab.value === 'breakdown') loadStats()
}

async function refreshAll() {
  loading.value = true
  await Promise.all([loadPackages(), loadBatches(), loadStats()])
  loading.value = false
}

async function loadPackages() {
  try { const d = await adminGet('/business/packages'); packages.value = d.packages || d.data || []; pkgSummary.value = d.summary || {} }
  catch (e) { try { const d = await adminGet('/packages/all'); packages.value = d.data || d.packages || [] } catch (e2) { console.error(e2) } }
}

async function loadBatches() {
  try { const d = await adminGet('/batches'); batches.value = d.data || [] }
  catch (e) { console.error(e) }
}

async function loadStats() {
  try { statsData.value = await adminGet('/vouchers/stats-full') }
  catch (e) { console.error(e) }
}

async function loadInventory() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: invPage.value, limit: 50 })
    if (invStatus.value) params.set('status', invStatus.value)
    if (invPackageId.value) params.set('package_id', invPackageId.value)
    if (invSearch.value) params.set('search', invSearch.value)
    const d = await adminGet('/vouchers/list?' + params.toString())
    inventory.value = d.data || []
    invTotal.value = d.total || 0
  } catch (e) { console.error(e) }
  loading.value = false
}

async function generateVouchers() {
  generating.value = true
  try {
    const vouchers = {}
    for (const [pkgId, count] of Object.entries(genForm.value.vouchers)) {
      if (parseInt(count) > 0) vouchers[pkgId] = parseInt(count)
    }
    await adminPost('/generate-voucher', { issuedto: genForm.value.issuedTo, vouchers })
    showToast('Vouchers generated successfully!')
    genForm.value = { issuedTo: '', vouchers: {} }
    await Promise.all([loadBatches(), loadStats()])
  } catch (e) {
    showToast(e.response?.data?.message || 'Failed to generate vouchers', 'error')
  }
  generating.value = false
}

async function viewBatch(b) {
  batchDetail.value = b
  batchVouchers.value = []
  try { const d = await adminGet('/vouchers/batch/' + b.id); batchVouchers.value = d.data || [] }
  catch (e) { console.error(e) }
}

function openPackageForm(pkg) {
  if (pkg) {
    editingPkg.value = pkg
    pkgForm.value = { name: pkg.name, description: pkg.description || '', price: pkg.price, data_limit_mb: pkg.data_limit_mb || 0, speed_limit_mbps: pkg.speed_limit_mbps || 0, is_active: !!pkg.is_active, sort_order: pkg.sort_order || 0 }
    const h = pkg.duration_hours || 6
    if (h % 720 === 0 && h >= 720) { durationVal.value = h / 720; durationUnit.value = 'months' }
    else if (h % 168 === 0 && h >= 168) { durationVal.value = h / 168; durationUnit.value = 'weeks' }
    else if (h >= 24 && h % 24 === 0) { durationVal.value = h / 24; durationUnit.value = 'days' }
    else { durationVal.value = h; durationUnit.value = 'hours' }
  } else {
    editingPkg.value = null
    pkgForm.value = { name: '', description: '', price: 0, data_limit_mb: 0, speed_limit_mbps: 0, is_active: true, sort_order: 0 }
    durationVal.value = 6; durationUnit.value = 'hours'
  }
  showPkgForm.value = true
}

async function savePackage() {
  saving.value = true
  const mult = { hours: 1, days: 24, weeks: 168, months: 720 }
  const payload = { ...pkgForm.value, duration_hours: (durationVal.value || 1) * (mult[durationUnit.value] || 1) }
  try {
    if (editingPkg.value) { await adminPut('/packages/' + editingPkg.value.id, payload); showToast('Package updated') }
    else { await adminPost('/packages', payload); showToast('Package created') }
    showPkgForm.value = false
    await loadPackages()
  } catch (e) { showToast(e.response?.data?.error || 'Failed to save package', 'error') }
  saving.value = false
}

async function togglePackage(pkg) {
  try {
    await adminPut('/packages/' + pkg.id, { ...pkg, is_active: pkg.is_active ? 0 : 1 })
    pkg.is_active = pkg.is_active ? 0 : 1
    showToast('Package ' + (pkg.is_active ? 'activated' : 'deactivated'))
  } catch (e) { showToast('Failed to toggle package', 'error') }
}

onMounted(refreshAll)
</script>
