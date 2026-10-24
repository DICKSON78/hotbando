<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Asset & Inventory Management</h2>
        <p class="text-sm" style="color: #6b7280">Track assets, warranties, and purchase orders</p>
      </div>
      <div class="flex gap-2">
        <button @click="refreshAll()" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="section-card" style="padding: 4px">
      <div class="flex gap-1">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key; onTabChange()"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :style="activeTab === tab.key ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'background: transparent; color: #6b7280'">
          <i :class="tab.icon" class="mr-1.5"></i>{{ tab.label }}
        </button>
      </div>
    </div>

    <!-- ===================== ASSETS TAB ===================== -->
    <template v-if="activeTab === 'assets'">
      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Total Assets</p>
              <p class="stat-value">{{ assetStats.total || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-boxes-stacked"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Total Value</p>
              <p class="stat-value" style="color: #34d399">TSh {{ (assetStats.total_value || 0).toLocaleString() }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-sack-dollar"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Under Warranty</p>
              <p class="stat-value" style="color: #60a5fa">{{ assetStats.under_warranty || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-shield-halved"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Disposed</p>
              <p class="stat-value" style="color: #f87171">{{ assetStats.disposed || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #f87171"><i class="fas fa-triangle-exclamation"></i></div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-boxes-stacked" style="color: #FF7A30"></i> Asset Inventory</h3>
          <div class="flex gap-2 flex-wrap">
            <input v-model="assetSearch" @input="debouncedLoadAssets" placeholder="Search assets..." class="form-input" style="max-width: 180px">
            <select v-model="assetCategoryFilter" @change="loadAssets()" class="form-input" style="max-width: 150px">
              <option value="">All Categories</option>
              <option v-for="c in assetCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <select v-model="assetBranchFilter" @change="loadAssets()" class="form-input" style="max-width: 150px">
              <option value="">All Branches</option>
              <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
            <button @click="showAddAssetModal = true" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Add Asset</button>
          </div>
        </div>
        <div class="section-body">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-12 rounded-lg animate-pulse" style="background: #1e1e2a"></div>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr><th>Asset Tag</th><th>Name</th><th>Category</th><th>Branch</th><th>Purchase Cost</th><th>Warranty</th><th>Condition</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="a in assetList" :key="a.id">
                  <td class="font-mono text-xs font-medium" style="color: #6b7280">{{ a.asset_tag || '—' }}</td>
                  <td class="font-medium text-white text-sm">{{ a.name }}</td>
                  <td><span class="badge badge-blue">{{ a.category_name || '—' }}</span></td>
                  <td class="text-sm" style="color: #d1d5db">{{ a.branch_name || '—' }}</td>
                  <td class="text-sm font-medium text-white">TSh {{ Number(a.purchase_cost || 0).toLocaleString() }}</td>
                  <td>
                    <span class="text-xs" :style="warrantyStyle(a.warranty_expiry)">
                      <i v-if="a.warranty_status === 'expired'" class="fas fa-exclamation-circle mr-1"></i>
                      <i v-else-if="a.warranty_status === 'expiring'" class="fas fa-clock mr-1"></i>
                      {{ formatDate(a.warranty_expiry) }}
                    </span>
                  </td>
                  <td>
                    <span class="badge" :class="conditionBadge(a.condition_status)">
                      {{ a.condition_status || '—' }}
                    </span>
                  </td>
                  <td>
                    <span class="badge" :class="statusBadge(a.status)">
                      {{ formatStatus(a.status) }}
                    </span>
                  </td>
                  <td @click.stop>
                    <button @click="openEditAsset(a)" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(59,130,246,0.1); color: #60a5fa" title="Edit">
                      <i class="fas fa-pen text-xs"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="!assetList.length">
                  <td colspan="9" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-boxes-stacked text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No assets found
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== CATEGORIES TAB ===================== -->
    <template v-if="activeTab === 'categories'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-tags" style="color: #FF7A30"></i> Asset Categories</h3>
          <button @click="showAddCategoryModal = true" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Add Category</button>
        </div>
        <div class="section-body">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="h-12 rounded-lg animate-pulse" style="background: #1e1e2a"></div>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr><th>Name</th><th>Description</th><th>Assets</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="c in assetCategories" :key="c.id">
                  <td class="font-medium text-white text-sm">{{ c.name }}</td>
                  <td class="text-sm" style="color: #d1d5db">{{ c.description || '—' }}</td>
                  <td><span class="badge badge-blue">{{ c.asset_count || 0 }}</span></td>
                  <td class="text-xs" style="color: #6b7280">{{ formatDate(c.created_at) }}</td>
                  <td @click.stop>
                    <button @click="editCategory(c)" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(59,130,246,0.1); color: #60a5fa" title="Edit">
                      <i class="fas fa-pen text-xs"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="!assetCategories.length">
                  <td colspan="5" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-tags text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No categories yet
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Add Category Modal -->
      <div v-if="showAddCategoryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showAddCategoryModal = false">
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="relative w-full max-w-md rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-white"><i class="fas fa-tag mr-2" style="color: #FF7A30"></i>Add Category</h3>
            <button @click="showAddCategoryModal = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="form-label">Category Name *</label>
              <input v-model="categoryForm.name" type="text" class="form-input" placeholder="e.g. Electronics">
            </div>
            <div>
              <label class="form-label">Description</label>
              <textarea v-model="categoryForm.description" class="form-input" rows="2" placeholder="Optional description..."></textarea>
            </div>
          </div>
          <div class="flex gap-3 mt-6">
            <button @click="showAddCategoryModal = false" class="btn btn-secondary flex-1">Cancel</button>
            <button @click="createCategory" class="btn btn-primary flex-1" :disabled="submitting">{{ submitting ? '...' : 'Add Category' }}</button>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== PURCHASE ORDERS TAB ===================== -->
    <template v-if="activeTab === 'pos'">
      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Draft Orders</p>
              <p class="stat-value" style="color: #facc15">{{ poStats.draft || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(250,204,21,0.1); color: #facc15"><i class="fas fa-hourglass-half"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Grand Total</p>
              <p class="stat-value">TSh {{ (poStats.total_value || 0).toLocaleString() }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-file-invoice-dollar"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Awaiting Delivery</p>
              <p class="stat-value" style="color: #a78bfa">{{ poStats.awaiting || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-truck"></i></div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-file-invoice" style="color: #FF7A30"></i> Purchase Orders</h3>
          <div class="flex gap-2">
            <select v-model="poStatusFilter" @change="loadPOs()" class="form-input" style="max-width: 140px">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="ordered">Ordered</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button @click="openCreatePO" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Create PO</button>
          </div>
        </div>
        <div class="section-body">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-12 rounded-lg animate-pulse" style="background: #1e1e2a"></div>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr><th>Order #</th><th>Supplier</th><th>Grand Total</th><th>Branch</th><th>Status</th><th>Requested By</th><th>Created</th><th>Actions</th></tr>
              </thead>
              <tbody>
                <tr v-for="po in purchaseOrders" :key="po.id">
                  <td class="font-mono text-xs font-medium" style="color: #6b7280">{{ po.order_number || '—' }}</td>
                  <td class="font-medium text-white text-sm">{{ po.supplier_name || '—' }}</td>
                  <td class="text-sm font-semibold text-white">TSh {{ Number(po.grand_total || po.total_amount || 0).toLocaleString() }}</td>
                  <td class="text-sm" style="color: #d1d5db">{{ po.branch_name || '—' }}</td>
                  <td>
                    <span class="badge" :class="poStatusBadge(po.status)">
                      {{ formatPOStatus(po.status) }}
                    </span>
                  </td>
                  <td class="text-sm" style="color: #d1d5db">{{ po.requested_by_name || '—' }}</td>
                  <td class="text-xs" style="color: #6b7280">{{ formatDate(po.created_at) }}</td>
                  <td>
                    <select v-if="['draft','submitted','approved','ordered'].includes(po.status)" @change="updatePOStatus(po.id, $event.target.value); $event.target.value = ''" class="form-input text-xs" style="max-width: 120px; padding: 4px 8px">
                      <option value="">Update...</option>
                      <option v-if="po.status === 'draft'" value="submitted">Submit</option>
                      <option v-if="po.status === 'submitted'" value="approved">Approve</option>
                      <option v-if="po.status === 'approved'" value="ordered">Mark Ordered</option>
                      <option v-if="po.status === 'ordered'" value="received">Mark Received</option>
                      <option value="cancelled">Cancel</option>
                    </select>
                    <span v-else class="text-xs" style="color: #6b7280">—</span>
                  </td>
                </tr>
                <tr v-if="!purchaseOrders.length">
                  <td colspan="8" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-file-invoice text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No purchase orders
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== ADD ASSET MODAL ===================== -->
    <div v-if="showAddAssetModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showAddAssetModal = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white"><i class="fas fa-plus-circle mr-2" style="color: #FF7A30"></i>Add Asset</h3>
          <button @click="showAddAssetModal = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Asset Tag *</label>
            <input v-model="assetForm.asset_tag" type="text" class="form-input" placeholder="e.g. HB-EL-001">
          </div>
          <div>
            <label class="form-label">Asset Name *</label>
            <input v-model="assetForm.name" type="text" class="form-input" placeholder="e.g. Office Laptop">
          </div>
          <div>
            <label class="form-label">Category *</label>
            <select v-model="assetForm.category_id" class="form-input">
              <option value="">Select category</option>
              <option v-for="c in assetCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">Branch *</label>
            <select v-model="assetForm.branch_id" class="form-input">
              <option value="">Select branch</option>
              <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">Purchase Cost (TSh) *</label>
            <input v-model.number="assetForm.purchase_cost" type="number" class="form-input" placeholder="0">
          </div>
          <div>
            <label class="form-label">Serial Number</label>
            <input v-model="assetForm.serial_number" type="text" class="form-input" placeholder="SN...">
          </div>
          <div>
            <label class="form-label">Purchase Date</label>
            <input v-model="assetForm.purchase_date" type="date" class="form-input">
          </div>
          <div>
            <label class="form-label">Warranty Expiry</label>
            <input v-model="assetForm.warranty_expiry" type="date" class="form-input">
          </div>
          <div class="sm:col-span-2">
            <label class="form-label">Notes</label>
            <textarea v-model="assetForm.notes" class="form-input" rows="2" placeholder="Additional details..."></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="showAddAssetModal = false" class="btn btn-secondary flex-1">Cancel</button>
          <button @click="createAsset" class="btn btn-primary flex-1" :disabled="submitting">{{ submitting ? '...' : 'Add Asset' }}</button>
        </div>
      </div>
    </div>

    <!-- ===================== EDIT ASSET MODAL ===================== -->
    <div v-if="showEditAssetModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showEditAssetModal = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white"><i class="fas fa-pen-to-square mr-2" style="color: #FF7A30"></i>Edit Asset</h3>
          <button @click="showEditAssetModal = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Asset Tag</label>
            <input v-model="editAssetForm.asset_tag" type="text" class="form-input">
          </div>
          <div>
            <label class="form-label">Asset Name</label>
            <input v-model="editAssetForm.name" type="text" class="form-input">
          </div>
          <div>
            <label class="form-label">Category</label>
            <select v-model="editAssetForm.category_id" class="form-input">
              <option value="">Select category</option>
              <option v-for="c in assetCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">Branch</label>
            <select v-model="editAssetForm.branch_id" class="form-input">
              <option value="">Select branch</option>
              <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">Purchase Cost (TSh)</label>
            <input v-model.number="editAssetForm.purchase_cost" type="number" class="form-input">
          </div>
          <div>
            <label class="form-label">Serial Number</label>
            <input v-model="editAssetForm.serial_number" type="text" class="form-input">
          </div>
          <div>
            <label class="form-label">Warranty Expiry</label>
            <input v-model="editAssetForm.warranty_expiry" type="date" class="form-input">
          </div>
          <div>
            <label class="form-label">Status</label>
            <select v-model="editAssetForm.status" class="form-input">
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
              <option value="disposed">Disposed</option>
            </select>
          </div>
          <div>
            <label class="form-label">Condition</label>
            <select v-model="editAssetForm.condition_status" class="form-input">
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="disposed">Disposed</option>
            </select>
          </div>
          <div>
            <label class="form-label">Notes</label>
            <textarea v-model="editAssetForm.notes" class="form-input" rows="2"></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="showEditAssetModal = false" class="btn btn-secondary flex-1">Cancel</button>
          <button @click="updateAsset" class="btn btn-primary flex-1" :disabled="submitting">{{ submitting ? '...' : 'Save Changes' }}</button>
        </div>
      </div>
    </div>

    <!-- ===================== CREATE PO MODAL ===================== -->
    <div v-if="showCreatePOModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showCreatePOModal = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white"><i class="fas fa-file-circle-plus mr-2" style="color: #FF7A30"></i>Create Purchase Order</h3>
          <button @click="showCreatePOModal = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Supplier Name *</label>
              <input v-model="poForm.supplier_name" type="text" class="form-input" placeholder="Supplier name">
            </div>
            <div>
              <label class="form-label">Branch *</label>
              <select v-model="poForm.branch_id" class="form-input">
                <option value="">Select branch</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
          </div>

          <!-- Line Items -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="form-label" style="margin: 0">Line Items *</label>
              <button @click="addLineItem" class="btn btn-secondary btn-sm" type="button"><i class="fas fa-plus mr-1"></i> Add Item</button>
            </div>
            <div class="space-y-2">
              <div v-for="(item, idx) in poForm.items" :key="idx" class="flex gap-2 items-end p-3 rounded-xl" style="background: #0d0d14">
                <div class="flex-1">
                  <label v-if="idx === 0" class="form-label text-xs">Item Name</label>
                  <input v-model="item.item_name" type="text" class="form-input" placeholder="Item name">
                </div>
                <div style="width: 80px">
                  <label v-if="idx === 0" class="form-label text-xs">Qty</label>
                  <input v-model.number="item.quantity" type="number" min="1" class="form-input">
                </div>
                <div style="width: 130px">
                  <label v-if="idx === 0" class="form-label text-xs">Unit Price</label>
                  <input v-model.number="item.unit_price" type="number" class="form-input" placeholder="0">
                </div>
                <div style="width: 130px">
                  <label v-if="idx === 0" class="form-label text-xs">Total</label>
                  <p class="form-input text-sm font-medium text-white" style="background: #0a0a12; border: 1px solid #1e1e2a">
                    TSh {{ ((item.quantity || 0) * (item.unit_price || 0)).toLocaleString() }}
                  </p>
                </div>
                <button v-if="poForm.items.length > 1" @click="removeLineItem(idx)" class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors" style="background: rgba(239,68,68,0.1); color: #f87171" type="button">
                  <i class="fas fa-trash text-xs"></i>
                </button>
                <div v-else style="width: 32px"></div>
              </div>
            </div>
            <div class="text-right mt-2">
              <span class="text-sm font-semibold text-white">Total: TSh {{ poTotal.toLocaleString() }}</span>
            </div>
          </div>

          <div>
            <label class="form-label">Notes</label>
            <textarea v-model="poForm.notes" class="form-input" rows="2" placeholder="Additional notes..."></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="showCreatePOModal = false" class="btn btn-secondary flex-1">Cancel</button>
          <button @click="createPO" class="btn btn-primary flex-1" :disabled="submitting">{{ submitting ? '...' : 'Create PO' }}</button>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { adminGet, adminPost, adminPut } from '../../api/client'

const tabs = [
  { key: 'assets', label: 'Assets', icon: 'fas fa-boxes-stacked' },
  { key: 'categories', label: 'Categories', icon: 'fas fa-tags' },
  { key: 'pos', label: 'Purchase Orders', icon: 'fas fa-file-invoice' }
]

const activeTab = ref('assets')
const loading = ref(true)
const submitting = ref(false)
const toast = ref(null)
const branches = ref([])
const assetCategories = ref([])

const assetList = ref([])
const assetStats = ref({})
const assetSearch = ref('')
const assetCategoryFilter = ref('')
const assetBranchFilter = ref('')

const purchaseOrders = ref([])
const poStats = ref({})
const poStatusFilter = ref('')

const showAddAssetModal = ref(false)
const showEditAssetModal = ref(false)
const showCreatePOModal = ref(false)
const showAddCategoryModal = ref(false)

const assetForm = reactive({
  name: '', asset_tag: '', category_id: '', branch_id: '', purchase_cost: 0,
  purchase_date: '', warranty_expiry: '', serial_number: '', notes: ''
})
const editAssetForm = reactive({
  id: null, name: '', asset_tag: '', category_id: '', branch_id: '', purchase_cost: 0,
  condition_status: 'good', warranty_expiry: '', serial_number: '', status: 'active', notes: ''
})
const poForm = reactive({
  supplier_name: '', branch_id: '',
  items: [{ item_name: '', quantity: 1, unit_price: 0 }],
  notes: ''
})
const categoryForm = reactive({ name: '', description: '' })

let searchTimer = null

const poTotal = computed(() => poForm.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0))

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function debouncedLoadAssets() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadAssets(), 300)
}

function warrantyStyle(d) {
  if (!d) return 'color: #6b7280'
  if (new Date(d) < new Date()) return 'color: #f87171'
  const diff = new Date(d) - new Date()
  if (diff < 30 * 24 * 60 * 60 * 1000) return 'color: #facc15'
  return 'color: #34d399'
}

function conditionBadge(c) {
  const map = { new: 'badge-green', good: 'badge-blue', fair: 'badge-yellow', poor: 'badge-red', disposed: 'badge-gray' }
  return map[c] || 'badge-gray'
}

function statusBadge(s) {
  const map = { active: 'badge-green', maintenance: 'badge-yellow', retired: 'badge-gray', disposed: 'badge-red' }
  return map[s] || 'badge-gray'
}

function formatStatus(s) {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function poStatusBadge(s) {
  const map = { draft: 'badge-gray', submitted: 'badge-yellow', approved: 'badge-blue', ordered: 'badge-blue', received: 'badge-green', cancelled: 'badge-red' }
  return map[s] || 'badge-gray'
}

function formatPOStatus(s) {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function addLineItem() {
  poForm.items.push({ item_name: '', quantity: 1, unit_price: 0 })
}

function removeLineItem(idx) {
  poForm.items.splice(idx, 1)
}

function openEditAsset(a) {
  Object.assign(editAssetForm, {
    id: a.id, name: a.name, asset_tag: a.asset_tag, category_id: a.category_id,
    branch_id: a.branch_id, purchase_cost: a.purchase_cost, condition_status: a.condition_status,
    warranty_expiry: a.warranty_expiry, serial_number: a.serial_number, status: a.status, notes: a.notes || ''
  })
  showEditAssetModal.value = true
}

function openCreatePO() {
  Object.assign(poForm, {
    supplier_name: '', branch_id: '',
    items: [{ item_name: '', quantity: 1, unit_price: 0 }], notes: ''
  })
  showCreatePOModal.value = true
}

function editCategory(c) {
  Object.assign(categoryForm, { id: c.id, name: c.name, description: c.description || '' })
  showAddCategoryModal.value = true
}

onMounted(async () => {
  await loadBranches()
  refreshAll()
})

function onTabChange() {
  if (activeTab.value === 'assets') loadAssets()
  if (activeTab.value === 'categories') loadAssetCategories()
  if (activeTab.value === 'pos') loadPOs()
}

async function loadBranches() {
  try {
    const r = await adminGet('/hq/branches')
    branches.value = r.data?.branches || r.branches || r || []
  } catch (e) { console.error(e) }
}

async function loadAssetCategories() {
  try {
    const r = await adminGet('/hq/asset-categories')
    assetCategories.value = Array.isArray(r.data) ? r.data : r.categories || r.data || r || []
  } catch (e) { console.error(e) }
}

async function refreshAll() {
  loading.value = true
  await loadAssetCategories()
  await onTabChange()
  loading.value = false
}

async function loadAssets() {
  try {
    const params = new URLSearchParams()
    if (assetSearch.value) params.set('search', assetSearch.value)
    if (assetCategoryFilter.value) params.set('category_id', assetCategoryFilter.value)
    if (assetBranchFilter.value) params.set('branch_id', assetBranchFilter.value)
    const qs = params.toString() ? `?${params}` : ''
    const r = await adminGet(`/hq/assets${qs}`)
    const assets = r.data?.assets || r.assets || (Array.isArray(r.data) ? r.data : [])
    assetList.value = assets
    assetStats.value = r.stats || {
      total: r.data?.total || r.total || (Array.isArray(assets) ? assets.length : 0),
      total_value: Array.isArray(assets) ? assets.reduce((s, a) => s + Number(a.purchase_cost || 0), 0) : 0,
      under_warranty: Array.isArray(assets) ? assets.filter(a => a.warranty_status === 'active').length : 0,
      disposed: Array.isArray(assets) ? assets.filter(a => a.status === 'disposed').length : 0
    }
  } catch (e) {
    console.error(e)
    showToast('Failed to load assets', 'error')
  }
}

async function loadPOs() {
  try {
    const params = new URLSearchParams()
    if (poStatusFilter.value) params.set('status', poStatusFilter.value)
    const qs = params.toString() ? `?${params}` : ''
    const r = await adminGet(`/hq/purchase-orders${qs}`)
    const pos = r.data?.purchase_orders || r.purchase_orders || (Array.isArray(r.data) ? r.data : [])
    purchaseOrders.value = pos
    poStats.value = r.stats || {
      draft: Array.isArray(pos) ? pos.filter(p => p.status === 'draft').length : 0,
      total_value: Array.isArray(pos) ? pos.reduce((s, p) => s + Number(p.grand_total || p.total_amount || 0), 0) : 0,
      awaiting: Array.isArray(pos) ? pos.filter(p => ['approved', 'ordered', 'submitted'].includes(p.status)).length : 0
    }
  } catch (e) {
    console.error(e)
    showToast('Failed to load purchase orders', 'error')
  }
}

async function createAsset() {
  if (!assetForm.asset_tag || !assetForm.name || !assetForm.category_id || !assetForm.branch_id) {
    showToast('Please fill all required fields', 'error'); return
  }
  submitting.value = true
  try {
    await adminPost('/hq/assets', { ...assetForm })
    showAddAssetModal.value = false
    Object.assign(assetForm, {
      name: '', asset_tag: '', category_id: '', branch_id: '', purchase_cost: 0,
      purchase_date: '', warranty_expiry: '', serial_number: '', notes: ''
    })
    await loadAssets()
    showToast('Asset added')
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to add asset', 'error')
  } finally { submitting.value = false }
}

async function updateAsset() {
  if (!editAssetForm.id) return
  submitting.value = true
  try {
    await adminPut(`/hq/assets/${editAssetForm.id}`, { ...editAssetForm })
    showEditAssetModal.value = false
    await loadAssets()
    showToast('Asset updated')
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to update asset', 'error')
  } finally { submitting.value = false }
}

async function createPO() {
  if (!poForm.supplier_name || !poForm.branch_id || !poForm.items.length) {
    showToast('Please fill all required fields', 'error'); return
  }
  const validItems = poForm.items.filter(i => i.item_name)
  if (!validItems.length) {
    showToast('Add at least one line item', 'error'); return
  }
  submitting.value = true
  try {
    await adminPost('/hq/purchase-orders', { ...poForm, items: validItems })
    showCreatePOModal.value = false
    await loadPOs()
    showToast('Purchase order created')
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to create PO', 'error')
  } finally { submitting.value = false }
}

async function updatePOStatus(id, status) {
  if (!status) return
  try {
    await adminPut(`/hq/purchase-orders/${id}/status`, { status })
    await loadPOs()
    showToast('PO status updated')
  } catch (e) {
    showToast('Failed to update PO status', 'error')
  }
}

async function createCategory() {
  if (!categoryForm.name) {
    showToast('Category name is required', 'error'); return
  }
  submitting.value = true
  try {
    await adminPost('/hq/asset-categories', { name: categoryForm.name, description: categoryForm.description })
    showAddCategoryModal.value = false
    Object.assign(categoryForm, { name: '', description: '' })
    await loadAssetCategories()
    showToast('Category added')
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to add category', 'error')
  } finally { submitting.value = false }
}
</script>
