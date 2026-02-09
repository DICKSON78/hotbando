# 📊 Tables & Tabs Design Standard

**Source:** Analytics Page (`/admin/analytics`)
**Applies To:** ALL Admin Pages

---

## 🗂️ TABS DESIGN

### Tab Navigation Structure

```html
<!-- Tab Buttons Container -->
<div class="analytics-tabs">
  <button class="analytics-tab active" onclick="switchTab('overview')">
    <i class="fas fa-chart-pie mr-2"></i>Muhtasari
  </button>
  <button class="analytics-tab" onclick="switchTab('ads')">
    <i class="fas fa-ad mr-2"></i>Matangazo
  </button>
  <button class="analytics-tab" onclick="switchTab('revenue')">
    <i class="fas fa-money-bill-wave mr-2"></i>Mapato
  </button>
  <button class="analytics-tab" onclick="switchTab('users')">
    <i class="fas fa-users mr-2"></i>Watumiaji
  </button>
  <button class="analytics-tab" onclick="switchTab('locations')">
    <i class="fas fa-map-marker-alt mr-2"></i>Maeneo
  </button>
</div>

<!-- Tab Panels -->
<div id="panel-overview" class="tab-panel active">
  <!-- Content here -->
</div>
<div id="panel-ads" class="tab-panel">
  <!-- Content here -->
</div>
```

### Tab CSS

```css
.analytics-tabs {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 10px;
  margin-bottom: 20px;
  overflow-x: auto;
}

.analytics-tab {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.analytics-tab.active {
  background: white;
  color: #1f2937;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.analytics-tab:hover:not(.active) {
  color: #1f2937;
}

.tab-panel {
  display: none;
}

.tab-panel.active {
  display: block;
}
```

### Tab JavaScript

```javascript
function switchTab(tabName) {
  // Hide all panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  // Remove active class from all tabs
  document.querySelectorAll('.analytics-tab').forEach(tab => {
    tab.classList.remove('active');
  });

  // Show selected panel
  document.getElementById('panel-' + tabName).classList.add('active');

  // Mark tab as active
  event.currentTarget.classList.add('active');
}
```

---

## 📋 TABLES DESIGN

### Complete Table Structure

```html
<!-- Table Container with Header -->
<div class="chart-container">
  <!-- Header with Title and Actions -->
  <div class="chart-header">
    <div>
      <h3 class="chart-title">Ufanisi wa Matangazo Yote</h3>
      <p class="chart-subtitle">Detailed breakdown ya kila tangazo</p>
    </div>
    <div class="flex gap-2">
      <!-- Filters/Actions -->
      <select id="filter" class="px-3 py-2 border border-gray-200 rounded-lg text-sm" onchange="filterData()">
        <option value="all">Yote</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
      <button onclick="exportData()" class="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
        <i class="fas fa-download mr-1"></i>Export
      </button>
    </div>
  </div>

  <!-- Table with Scroll -->
  <div class="table-container">
    <table class="data-table">
      <thead>
        <tr>
          <th>Column 1</th>
          <th>Column 2</th>
          <th>Column 3</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="table-body">
        <tr>
          <td>Data 1</td>
          <td>Data 2</td>
          <td>Data 3</td>
          <td>
            <button class="text-blue-600 hover:text-blue-800">
              <i class="fas fa-edit"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Pagination (Optional) -->
  <div class="pagination-container">
    <div class="pagination-info">
      Showing <span id="showing">10</span> of <span id="total">100</span>
    </div>
    <div class="pagination-buttons">
      <button class="pagination-btn" onclick="prevPage()">
        <i class="fas fa-chevron-left"></i>
      </button>
      <button class="pagination-btn active">1</button>
      <button class="pagination-btn">2</button>
      <button class="pagination-btn">3</button>
      <button class="pagination-btn" onclick="nextPage()">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  </div>
</div>
```

### Table CSS

```css
/* Chart Container (wraps the whole table section) */
.chart-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Chart Header (title + actions) */
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.chart-subtitle {
  font-size: 12px;
  color: #6b7280;
}

/* Table Container (horizontal scroll wrapper) */
.table-container {
  overflow-x: auto;
  border-radius: 8px;
}

/* Data Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

/* Table Headers */
.data-table th {
  background: #f9fafb;
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e5e7eb;
}

/* Table Data Cells */
.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
}

/* Table Row Hover */
.data-table tr:hover {
  background: #f9fafb;
}

/* Pagination */
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-info {
  font-size: 14px;
  color: #6b7280;
}

.pagination-buttons {
  display: flex;
  gap: 8px;
}

.pagination-btn {
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  border-color: #FF7A30;
  color: #FF7A30;
}

.pagination-btn.active {
  background: #FF7A30;
  color: white;
  border-color: #FF7A30;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 🎨 TABLE BADGES & STATUS

### Badge Structure

```html
<!-- Success Badge -->
<span class="badge badge-success">
  <i class="fas fa-check-circle mr-1"></i>Active
</span>

<!-- Warning Badge -->
<span class="badge badge-warning">
  <i class="fas fa-clock mr-1"></i>Pending
</span>

<!-- Danger Badge -->
<span class="badge badge-danger">
  <i class="fas fa-times-circle mr-1"></i>Failed
</span>

<!-- Info Badge -->
<span class="badge badge-info">
  <i class="fas fa-info-circle mr-1"></i>Processing
</span>

<!-- Primary Badge -->
<span class="badge badge-primary">
  <i class="fas fa-star mr-1"></i>Featured
</span>
```

### Badge CSS

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success {
  background: #dcfce7;
  color: #16a34a;
}

.badge-warning {
  background: #fef3c7;
  color: #d97706;
}

.badge-danger {
  background: #fee2e2;
  color: #dc2626;
}

.badge-info {
  background: #dbeafe;
  color: #2563eb;
}

.badge-primary {
  background: #fff7ed;
  color: #ea580c;
}
```

---

## 📱 RESPONSIVE TABLES

### Horizontal Scroll for Mobile

```css
/* Mobile: Allow horizontal scroll */
@media (max-width: 768px) {
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .data-table {
    min-width: 600px; /* Minimum table width */
  }

  /* Stack pagination on mobile */
  .pagination-container {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

---

## 🔍 TABLE WITH SEARCH & FILTERS

### Complete Example

```html
<div class="chart-container">
  <!-- Header with Search -->
  <div class="chart-header">
    <div>
      <h3 class="chart-title">Watumiaji Wote</h3>
      <p class="chart-subtitle">Orodha ya watumiaji wote wa mfumo</p>
    </div>
    <div class="flex gap-2">
      <!-- Search Input -->
      <div class="relative">
        <input type="text"
               id="search-input"
               placeholder="Tafuta..."
               class="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
               onkeyup="searchTable()">
        <i class="fas fa-search absolute left-2 top-3 text-gray-400 text-sm"></i>
      </div>

      <!-- Status Filter -->
      <select id="status-filter"
              class="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              onchange="filterTable()">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

      <!-- Export Button -->
      <button onclick="exportTable()"
              class="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
        <i class="fas fa-download mr-1"></i>Export
      </button>
    </div>
  </div>

  <!-- Table -->
  <div class="table-container">
    <table class="data-table">
      <thead>
        <tr>
          <th>Jina</th>
          <th>Email</th>
          <th>Status</th>
          <th>Tarehe</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="users-table">
        <!-- Data loaded via JavaScript -->
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div class="pagination-container">
    <div class="pagination-info">
      Showing <span id="showing">1-10</span> of <span id="total">100</span>
    </div>
    <div class="pagination-buttons" id="pagination-buttons">
      <!-- Buttons generated via JavaScript -->
    </div>
  </div>
</div>
```

---

## 🎯 ACTION BUTTONS IN TABLES

### Button Styles

```html
<!-- View Button -->
<button class="text-blue-600 hover:text-blue-800 p-2" title="View">
  <i class="fas fa-eye"></i>
</button>

<!-- Edit Button -->
<button class="text-green-600 hover:text-green-800 p-2" title="Edit">
  <i class="fas fa-edit"></i>
</button>

<!-- Delete Button -->
<button class="text-red-600 hover:text-red-800 p-2" title="Delete">
  <i class="fas fa-trash"></i>
</button>

<!-- More Options -->
<button class="text-gray-600 hover:text-gray-800 p-2" title="More">
  <i class="fas fa-ellipsis-v"></i>
</button>
```

### Action Button Group

```html
<td class="text-right">
  <div class="flex justify-end gap-2">
    <button class="text-blue-600 hover:text-blue-800 p-2" onclick="view(id)">
      <i class="fas fa-eye"></i>
    </button>
    <button class="text-green-600 hover:text-green-800 p-2" onclick="edit(id)">
      <i class="fas fa-edit"></i>
    </button>
    <button class="text-red-600 hover:text-red-800 p-2" onclick="deleteItem(id)">
      <i class="fas fa-trash"></i>
    </button>
  </div>
</td>
```

---

## 📊 EMPTY STATE

### When Table Has No Data

```html
<tbody id="table-body">
  <tr>
    <td colspan="5" class="text-center py-12">
      <div class="flex flex-col items-center">
        <i class="fas fa-inbox text-gray-300 text-5xl mb-4"></i>
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Hakuna Data</h3>
        <p class="text-gray-500 text-sm mb-4">
          Bado hakuna data iliyorekodiwa hapa
        </p>
        <button onclick="addNew()"
                class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
          <i class="fas fa-plus mr-2"></i>Ongeza Mpya
        </button>
      </div>
    </td>
  </tr>
</tbody>
```

---

## ⏳ LOADING STATE

### While Loading Data

```html
<tbody id="table-body">
  <tr>
    <td colspan="5" class="text-center py-12">
      <div class="flex flex-col items-center">
        <i class="fas fa-spinner fa-spin text-orange-600 text-4xl mb-3"></i>
        <p class="text-gray-600">Inapakia data...</p>
      </div>
    </td>
  </tr>
</tbody>
```

---

## ✅ COMPLETE EXAMPLE - Users Table

```html
<!-- Tab Navigation -->
<div class="analytics-tabs">
  <button class="analytics-tab active" onclick="switchTab('all')">
    <i class="fas fa-users mr-2"></i>Watumiaji Wote
  </button>
  <button class="analytics-tab" onclick="switchTab('online')">
    <i class="fas fa-wifi mr-2"></i>Online
  </button>
  <button class="analytics-tab" onclick="switchTab('offline')">
    <i class="fas fa-user-slash mr-2"></i>Offline
  </button>
</div>

<!-- All Users Tab -->
<div id="panel-all" class="tab-panel active">
  <div class="chart-container">
    <div class="chart-header">
      <div>
        <h3 class="chart-title">Orodha ya Watumiaji Wote</h3>
        <p class="chart-subtitle">Jumla: <span id="total-users">0</span> watumiaji</p>
      </div>
      <div class="flex gap-2">
        <input type="text"
               placeholder="Tafuta mtumiaji..."
               class="px-3 py-2 border border-gray-200 rounded-lg text-sm">
        <button class="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
          <i class="fas fa-download mr-1"></i>Export
        </button>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Jina</th>
            <th>Simu</th>
            <th>Status</th>
            <th>Data</th>
            <th>Eneo</th>
            <th>Tarehe</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="users-tbody">
          <tr>
            <td>John Doe</td>
            <td>+255 123 456 789</td>
            <td>
              <span class="badge badge-success">
                <i class="fas fa-check-circle mr-1"></i>Active
              </span>
            </td>
            <td>500 MB</td>
            <td>Dar es Salaam</td>
            <td>2026-02-08</td>
            <td>
              <div class="flex gap-2">
                <button class="text-blue-600 hover:text-blue-800 p-2">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="text-red-600 hover:text-red-800 p-2">
                  <i class="fas fa-ban"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination-container">
      <div class="pagination-info">
        Showing 1-10 of 100
      </div>
      <div class="pagination-buttons">
        <button class="pagination-btn" disabled>
          <i class="fas fa-chevron-left"></i>
        </button>
        <button class="pagination-btn active">1</button>
        <button class="pagination-btn">2</button>
        <button class="pagination-btn">3</button>
        <button class="pagination-btn">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</div>
```

---

## 🎯 APPLY TO ALL PAGES

Use this exact structure for tables in:
- ✅ Dashboard
- ✅ Analytics (template)
- ✅ Vouchers
- ✅ Campaigns
- ✅ Users
- ✅ Locations
- ⏳ Routers
- ⏳ Reports
- ⏳ Leads
- ⏳ Other pages

---

**Reference:** `/views/admin/analytics.ejs` (lines 306-355 for tabs, 128-154 for tables)

---

*Created: 2026-02-08*
*Standard: Analytics Page*
*All pages MUST use this design!*
