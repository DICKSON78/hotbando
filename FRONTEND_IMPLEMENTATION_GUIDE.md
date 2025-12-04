# 🎨 Frontend Implementation Guide

**Mwongozo wa kukamilisha frontend pages zote**

Umeshaona backend imekamilika 100%. Sasa hii ni guide ya kutengeneza frontend pages zote kwa kutumia **EXACT DESIGN** yako.

---

## ✅ Kile Kimeshakamilika

1. ✅ **Admin Sidebar** - Updated with new menu items
2. ✅ **Color Scheme** - #FF7A30 (Orange primary)
3. ✅ **Layout Pattern** - Cards, tables, charts ready

---

## 🎯 Pages Zinazohitajika

### 1. **Campaigns Management Page** (`/admin/campaigns`)

**Path**: `views/admin/campaigns.ejs`

**Features**:
- List all campaigns (table)
- Filter by type (bank_form, ad_video, app_install)
- Create new campaign button
- Edit/Delete/Toggle active
- View stats per campaign

**Design Pattern** (Tumia hii structure):

```ejs
<%
  const campaignsContent = `
    <div class="container mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Kampeni Zote</h1>
          <p class="text-gray-600 text-sm mt-1">Simamia kampeni za benki na matangazo</p>
        </div>
        <button onclick="openCreateCampaignModal()" class="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition flex items-center">
          <i class="fas fa-plus mr-2"></i>
          Unda Kampeni Mpya
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="text-sm text-gray-600">Aina ya Kampeni</label>
            <select class="w-full mt-1 p-2 border border-gray-300 rounded-lg" onchange="filterCampaigns()">
              <option value="">Zote</option>
              <option value="bank_form">Fomu za Benki</option>
              <option value="ad_video">Matangazo (Video)</option>
              <option value="ad_image">Matangazo (Picha)</option>
              <option value="app_install">Usakinishaji wa App</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-gray-600">Hali</label>
            <select class="w-full mt-1 p-2 border border-gray-300 rounded-lg" onchange="filterCampaigns()">
              <option value="">Zote</option>
              <option value="1">Inafanya Kazi</option>
              <option value="0">Haifanyi Kazi</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-gray-600">Mmiliki</label>
            <select class="w-full mt-1 p-2 border border-gray-300 rounded-lg" onchange="filterCampaigns()">
              <option value="">Wote</option>
              <option value="bank">Benki</option>
              <option value="advertiser">Watangazaji</option>
            </select>
          </div>
          <div class="flex items-end">
            <button class="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              <i class="fas fa-filter mr-2"></i>
              Safisha Filter
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Jumla ya Kampeni</p>
              <h2 class="text-3xl font-bold text-gray-800 mt-1" id="total-campaigns">0</h2>
            </div>
            <div class="p-3 bg-blue-100 rounded-full">
              <i class="fas fa-bullhorn text-blue-600 text-2xl"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Zinazofanya Kazi</p>
              <h2 class="text-3xl font-bold text-green-600 mt-1" id="active-campaigns">0</h2>
            </div>
            <div class="p-3 bg-green-100 rounded-full">
              <i class="fas fa-check-circle text-green-600 text-2xl"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Wateja Wapya</p>
              <h2 class="text-3xl font-bold text-purple-600 mt-1" id="total-leads">0</h2>
            </div>
            <div class="p-3 bg-purple-100 rounded-full">
              <i class="fas fa-users text-purple-600 text-2xl"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Bajeti Iliyotumika</p>
              <h2 class="text-3xl font-bold text-orange-600 mt-1" id="total-spent">0</h2>
            </div>
            <div class="p-3 bg-orange-100 rounded-full">
              <i class="fas fa-money-bill-wave text-orange-600 text-2xl"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Campaigns Table -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">Orodha ya Kampeni</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jina la Kampeni</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aina</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mmiliki</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wateja</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bajeti</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hali</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vitendo</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200" id="campaigns-tbody">
              <!-- Data will be loaded via JavaScript -->
            </tbody>
          </table>
        </div>
        <div class="p-4 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-600">Inaonyesha <span id="showing-count">0</span> kati ya <span id="total-count">0</span></p>
            <div class="flex space-x-2" id="pagination">
              <!-- Pagination buttons -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Campaign Modal -->
    <div id="createCampaignModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold text-gray-800">Unda Kampeni Mpya</h3>
            <button onclick="closeCreateCampaignModal()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        <div class="p-6">
          <form id="createCampaignForm" onsubmit="submitCampaign(event)">
            <!-- Campaign Type Selection -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Aina ya Kampeni</label>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label class="campaign-type-option cursor-pointer">
                  <input type="radio" name="campaign_type" value="bank_form" class="hidden" onchange="showCampaignFields(this.value)">
                  <div class="border-2 border-gray-300 rounded-lg p-4 text-center hover:border-primary transition">
                    <i class="fas fa-file-alt text-3xl text-blue-600 mb-2"></i>
                    <p class="text-sm font-medium">Fomu ya Benki</p>
                  </div>
                </label>
                <label class="campaign-type-option cursor-pointer">
                  <input type="radio" name="campaign_type" value="ad_video" class="hidden" onchange="showCampaignFields(this.value)">
                  <div class="border-2 border-gray-300 rounded-lg p-4 text-center hover:border-primary transition">
                    <i class="fas fa-video text-3xl text-red-600 mb-2"></i>
                    <p class="text-sm font-medium">Video Ad</p>
                  </div>
                </label>
                <label class="campaign-type-option cursor-pointer">
                  <input type="radio" name="campaign_type" value="ad_image" class="hidden" onchange="showCampaignFields(this.value)">
                  <div class="border-2 border-gray-300 rounded-lg p-4 text-center hover:border-primary transition">
                    <i class="fas fa-image text-3xl text-green-600 mb-2"></i>
                    <p class="text-sm font-medium">Image Ad</p>
                  </div>
                </label>
                <label class="campaign-type-option cursor-pointer">
                  <input type="radio" name="campaign_type" value="app_install" class="hidden" onchange="showCampaignFields(this.value)">
                  <div class="border-2 border-gray-300 rounded-lg p-4 text-center hover:border-primary transition">
                    <i class="fas fa-mobile-alt text-3xl text-purple-600 mb-2"></i>
                    <p class="text-sm font-medium">App Install</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Dynamic Campaign Fields Container -->
            <div id="campaignFieldsContainer">
              <!-- Fields will be loaded dynamically based on campaign type -->
            </div>

            <div class="flex justify-end space-x-4 mt-6">
              <button type="button" onclick="closeCreateCampaignModal()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Ghairi
              </button>
              <button type="submit" class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                <i class="fas fa-save mr-2"></i>
                Hifadhi Kampeni
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <script>
      // Load campaigns from API
      async function loadCampaigns() {
        try {
          const response = await fetch('/api/campaigns/my-campaigns');
          const data = await response.json();

          if (data.success) {
            renderCampaigns(data.campaigns);
            updateStats(data.campaigns);
          }
        } catch (error) {
          console.error('Error loading campaigns:', error);
        }
      }

      function renderCampaigns(campaigns) {
        const tbody = document.getElementById('campaigns-tbody');

        if (campaigns.length === 0) {
          tbody.innerHTML = \`
            <tr>
              <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                <i class="fas fa-bullhorn text-4xl mb-3 text-gray-300"></i>
                <p>Hakuna kampeni zilizoundwa bado</p>
                <button onclick="openCreateCampaignModal()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
                  Unda Kampeni ya Kwanza
                </button>
              </td>
            </tr>
          \`;
          return;
        }

        tbody.innerHTML = campaigns.map(campaign => \`
          <tr class="hover:bg-gray-50 transition">
            <td class="px-6 py-4">
              <div class="font-medium text-gray-900">\${campaign.campaign_name}</div>
              <div class="text-sm text-gray-500">\${campaign.description || ''}</div>
            </td>
            <td class="px-6 py-4">
              <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                \${getCampaignTypeLabel(campaign.campaign_type)}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">\${campaign.company_name || campaign.owner_name}</td>
            <td class="px-6 py-4 text-sm text-gray-900">\${campaign.completions_count || 0}</td>
            <td class="px-6 py-4 text-sm text-gray-900">
              TZS \${formatMoney(campaign.spent_budget || 0)} / \${formatMoney(campaign.total_budget || 0)}
            </td>
            <td class="px-6 py-4">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" \${campaign.is_active ? 'checked' : ''} class="sr-only peer"
                       onchange="toggleCampaign(\${campaign.id}, this.checked)">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </td>
            <td class="px-6 py-4 text-sm">
              <div class="flex space-x-2">
                <button onclick="viewCampaign(\${campaign.id})" class="text-blue-600 hover:text-blue-800" title="Angalia">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="editCampaign(\${campaign.id})" class="text-green-600 hover:text-green-800" title="Hariri">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteCampaign(\${campaign.id})" class="text-red-600 hover:text-red-800" title="Futa">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        \`).join('');
      }

      function getCampaignTypeLabel(type) {
        const labels = {
          'bank_form': 'Fomu ya Benki',
          'ad_video': 'Video',
          'ad_image': 'Picha',
          'app_install': 'App Install'
        };
        return labels[type] || type;
      }

      function formatMoney(amount) {
        return Number(amount).toLocaleString();
      }

      function openCreateCampaignModal() {
        document.getElementById('createCampaignModal').classList.remove('hidden');
      }

      function closeCreateCampaignModal() {
        document.getElementById('createCampaignModal').classList.add('hidden');
      }

      async function toggleCampaign(id, isActive) {
        try {
          const response = await fetch(\`/api/campaigns/\${id}/toggle\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });

          const data = await response.json();
          if (data.success) {
            showNotification('Kampeni imebadilishwa', 'success');
            loadCampaigns();
          }
        } catch (error) {
          console.error('Error toggling campaign:', error);
          showNotification('Hitilafu imetokea', 'error');
        }
      }

      // Initialize on page load
      document.addEventListener('DOMContentLoaded', () => {
        loadCampaigns();
      });
    </script>
  `;
%>

<%- include('layout', {
    title: 'Kampeni',
    activePage: 'campaigns',
    body: campaignsContent
}) %>
```

---

### 2. **Wallet Management Page** (`/admin/wallet`)

**Unatakiwa kuongeza**:
- Balance display (card)
- Deposit button (M-Pesa modal)
- Withdraw button (request form)
- Transaction history table
- Low balance alert

**API Calls**:
```javascript
// Get wallet balance
fetch('/api/wallet/balance')

// Request deposit
fetch('/api/wallet/deposit/request', {
  method: 'POST',
  body: JSON.stringify({ amount, phone_number, payment_method })
})

// Get transactions
fetch('/api/wallet/transactions?page=1&per_page=50')
```

---

### 3. **Locations Management** (`/admin/locations`)

**Features**:
- List locations (table)
- Add location (modal)
- Assign franchise owner
- Assign routers
- View performance stats

---

### 4. **Revenue Share Dashboard** (`/admin/revenue-share`)

**Features**:
- Pending payouts table
- Calculate revenue button
- Approve payout (single & batch)
- Process payout (mark as paid)
- Payout history

---

### 5. **Leads Management** (`/admin/leads`)

**Features**:
- Filter by campaign
- Filter by status (new, contacted, qualified, converted)
- Export to CSV button
- Update lead status (dropdown)
- View lead details (modal)

**API**:
```javascript
// Get leads
fetch('/api/campaigns/:campaign_id/leads?page=1&status=new')

// Export
window.open('/api/campaigns/:campaign_id/leads/export')

// Update status
fetch('/api/campaigns/leads/:id/status', {
  method: 'PUT',
  body: JSON.stringify({ status, notes })
})
```

---

## 🎨 Design Patterns Za Reusable

### Stats Card Component
```html
<div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm text-gray-500">Label</p>
      <h2 class="text-3xl font-bold text-gray-800 mt-1">Value</h2>
      <p class="text-xs text-green-600 mt-1">Change</p>
    </div>
    <div class="p-3 bg-blue-100 rounded-full">
      <i class="fas fa-icon text-blue-600 text-2xl"></i>
    </div>
  </div>
</div>
```

### Table Component
```html
<div class="bg-white rounded-lg shadow-sm border border-gray-200">
  <div class="p-6 border-b border-gray-200">
    <h3 class="text-lg font-semibold text-gray-800">Title</h3>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Header</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <!-- Rows here -->
      </tbody>
    </table>
  </div>
</div>
```

### Button Styles
```html
<!-- Primary Button -->
<button class="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
  <i class="fas fa-icon mr-2"></i>
  Text
</button>

<!-- Secondary Button -->
<button class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
  Text
</button>

<!-- Danger Button -->
<button class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
  Text
</button>
```

### Modal Component
```html
<div id="modalId" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center">
  <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
    <div class="p-6 border-b border-gray-200">
      <div class="flex justify-between items-center">
        <h3 class="text-xl font-bold text-gray-800">Title</h3>
        <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
    </div>
    <div class="p-6">
      <!-- Content -->
    </div>
  </div>
</div>
```

---

## 🚀 Next Steps

1. Tengeneza page moja kwa moja using patterns hizi
2. Tumia **EXACT same colors** (#FF7A30)
3. Tumia **FontAwesome** icons
4. Tumia **Chart.js** for charts
5. Test API calls kwanza using Postman/curl

---

**Maswali? Refer to:**
- [README.md](README.md) - Complete API docs
- [QUICK_START.md](QUICK_START.md) - Setup guide
- Existing pages: `views/admin/dashboard.ejs` - Example patterns

**🎉 Kazi Nzuri! Backend is READY, Frontend unaeza kukamilisha kwa 2-3 days!**
