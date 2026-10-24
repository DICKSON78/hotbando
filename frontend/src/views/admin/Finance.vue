<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Financial Management</h2>
        <p class="text-sm" style="color: #6b7280">Expenses, budgets, and profit & loss</p>
      </div>
      <div class="flex gap-2">
        <button @click="refreshAll()" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <div class="section-card" style="padding: 4px">
      <div class="flex gap-1">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key; onTabChange()"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :style="activeTab === tab.key ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'background: transparent; color: #6b7280'">
          <i :class="tab.icon" class="mr-1.5"></i>{{ tab.label }}
        </button>
      </div>
    </div>

    <!-- ===================== OVERVIEW TAB ===================== -->
    <template v-if="activeTab === 'overview'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Total Revenue</p>
              <p class="stat-value" style="color: #34d399">TSh {{ (overview.total_revenue || 0).toLocaleString() }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-arrow-trend-up"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Total Expenses</p>
              <p class="stat-value" style="color: #f87171">TSh {{ (overview.total_expenses || 0).toLocaleString() }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #f87171"><i class="fas fa-arrow-trend-down"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Net Profit</p>
              <p class="stat-value" :style="{ color: (overview.net_profit || 0) >= 0 ? '#34d399' : '#f87171' }">
                TSh {{ Math.abs(overview.net_profit || 0).toLocaleString() }}
              </p>
            </div>
            <div class="stat-icon" :style="(overview.net_profit || 0) >= 0 ? 'background: rgba(16,185,129,0.1); color: #34d399' : 'background: rgba(239,68,68,0.1); color: #f87171'">
              <i class="fas" :class="(overview.net_profit || 0) >= 0 ? 'fa-sack-dollar' : 'fa-triangle-exclamation'"></i>
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Budget Utilization</p>
              <p class="stat-value" style="color: #60a5fa">{{ overview.budget_utilization || 0 }}%</p>
            </div>
            <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-chart-pie"></i></div>
          </div>
          <div class="mt-3">
            <div class="w-full h-2 rounded-full" style="background: #1e1e2a">
              <div class="h-full rounded-full transition-all" :style="{ width: Math.min(overview.budget_utilization || 0, 100) + '%', background: (overview.budget_utilization || 0) > 90 ? '#f87171' : '#60a5fa' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-wallet" style="color: #FF7A30"></i> Budget Summary</h3>
          </div>
          <div class="section-body">
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 rounded-xl" style="background: #0d0d14">
                <span class="text-sm" style="color: #9ca3af">Budget Allocated</span>
                <span class="text-sm font-semibold text-white">TSh {{ (overview.budget_allocated || 0).toLocaleString() }}</span>
              </div>
              <div class="flex items-center justify-between p-4 rounded-xl" style="background: #0d0d14">
                <span class="text-sm" style="color: #9ca3af">Budget Used</span>
                <span class="text-sm font-semibold" style="color: #f87171">TSh {{ (overview.budget_used || 0).toLocaleString() }}</span>
              </div>
              <div class="flex items-center justify-between p-4 rounded-xl" style="background: #0d0d14">
                <span class="text-sm" style="color: #9ca3af">Remaining</span>
                <span class="text-sm font-semibold" :style="{ color: ((overview.budget_allocated || 0) - (overview.budget_used || 0)) >= 0 ? '#34d399' : '#f87171' }">
                  TSh {{ Math.abs((overview.budget_allocated || 0) - (overview.budget_used || 0)).toLocaleString() }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-scale-balanced" style="color: #FF7A30"></i> Profitability</h3>
          </div>
          <div class="section-body">
            <div class="text-center py-6">
              <div class="mb-4">
                <span class="text-4xl font-bold" :style="{ color: (overview.net_profit || 0) >= 0 ? '#34d399' : '#f87171' }">
                  {{ (overview.net_profit || 0) >= 0 ? '+' : '-' }}TSh {{ Math.abs(overview.net_profit || 0).toLocaleString() }}
                </span>
              </div>
              <p class="text-sm" style="color: #6b7280">Net Profit Margin</p>
              <p class="text-lg font-semibold text-white">
                {{ (overview.total_revenue || 0) > 0 ? ((overview.net_profit || 0) / (overview.total_revenue || 1) * 100).toFixed(1) : '0.0' }}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== EXPENSES TAB ===================== -->
    <template v-if="activeTab === 'expenses'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-money-bill-wave" style="color: #FF7A30"></i> Expenses</h3>
          <div class="flex gap-2 flex-wrap">
            <input v-model="expDateFrom" type="date" class="form-input" style="max-width: 155px">
            <input v-model="expDateTo" type="date" class="form-input" style="max-width: 155px">
            <select v-model="expCategoryFilter" @change="loadExpenses()" class="form-input" style="max-width: 150px">
              <option value="">All Categories</option>
              <option v-for="c in expenseCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <select v-model="expBranchFilter" @change="loadExpenses()" class="form-input" style="max-width: 150px">
              <option value="">All Branches</option>
              <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
            <button @click="loadExpenses()" class="btn btn-primary btn-sm"><i class="fas fa-search"></i></button>
            <button @click="showCreateExpenseModal = true" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Add Expense</button>
          </div>
        </div>
        <div class="section-body">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-12 rounded-lg animate-pulse" style="background: #1e1e2a"></div>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr><th>Title</th><th>Category</th><th>Amount</th><th>Branch</th><th>Date</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                <tr v-for="e in expenses" :key="e.id">
                  <td class="font-medium text-white text-sm">{{ e.title }}</td>
                  <td><span class="badge badge-blue">{{ e.category_name || '—' }}</span></td>
                  <td class="text-sm font-semibold text-white">TSh {{ (e.amount || 0).toLocaleString() }}</td>
                  <td class="text-sm" style="color: #d1d5db">{{ e.branch_name || '—' }}</td>
                  <td class="text-xs" style="color: #6b7280">{{ formatDate(e.expense_date || e.created_at) }}</td>
                  <td>
                    <span class="badge" :class="e.status === 'approved' ? 'badge-green' : e.status === 'rejected' ? 'badge-red' : 'badge-yellow'">
                      {{ e.status || 'pending' }}
                    </span>
                  </td>
                  <td>
                    <button v-if="e.status === 'pending'" @click="approveExpense(e.id)" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(16,185,129,0.1); color: #34d399" title="Approve">
                      <i class="fas fa-check text-xs"></i>
                    </button>
                    <button v-if="e.status === 'pending'" @click="rejectExpense(e.id)" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors ml-1" style="background: rgba(239,68,68,0.1); color: #f87171" title="Reject">
                      <i class="fas fa-times text-xs"></i>
                    </button>
                    <span v-if="e.status !== 'pending'" class="text-xs" style="color: #6b7280">—</span>
                  </td>
                </tr>
                <tr v-if="!expenses.length">
                  <td colspan="7" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-money-bill-wave text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No expenses found
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== BUDGETS TAB ===================== -->
    <template v-if="activeTab === 'budgets'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-coins" style="color: #FF7A30"></i> Budgets</h3>
          <div class="flex gap-2">
            <select v-model="budgetStatusFilter" @change="loadBudgets()" class="form-input" style="max-width: 140px">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="exhausted">Exhausted</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button @click="showCreateBudgetModal = true" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Create Budget</button>
          </div>
        </div>
        <div class="section-body">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-12 rounded-lg animate-pulse" style="background: #1e1e2a"></div>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr><th>Name</th><th>Category</th><th>Branch</th><th>Type</th><th>Period</th><th>Budget</th><th>Spent</th><th>Remaining</th><th>Utilization</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr v-for="b in budgets" :key="b.id">
                  <td class="font-medium text-white text-sm">{{ b.name }}</td>
                  <td class="text-sm" style="color: #d1d5db">{{ b.category_name || '—' }}</td>
                  <td class="text-sm" style="color: #d1d5db">{{ b.branch_name || 'All' }}</td>
                  <td class="text-xs" style="color: #9ca3af">{{ b.budget_type || '—' }}</td>
                  <td class="text-xs" style="color: #6b7280">
                    {{ formatDateShort(b.period_start) }}<template v-if="b.period_end"> — {{ formatDateShort(b.period_end) }}</template>
                  </td>
                  <td class="text-sm font-medium text-white">TSh {{ (b.amount || 0).toLocaleString() }}</td>
                  <td class="text-sm" style="color: #d1d5db">TSh {{ (b.spent || 0).toLocaleString() }}</td>
                  <td class="text-sm" :style="{ color: remainingBudget(b) >= 0 ? '#34d399' : '#f87171' }">
                    TSh {{ Math.abs(remainingBudget(b)).toLocaleString() }}
                  </td>
                  <td style="min-width: 140px">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 h-2 rounded-full" style="background: #1e1e2a">
                        <div class="h-full rounded-full" :style="{ width: Math.min(utilizationPercent(b), 100) + '%', background: utilizationPercent(b) > 90 ? '#f87171' : utilizationPercent(b) > 70 ? '#facc15' : '#34d399' }"></div>
                      </div>
                      <span class="text-xs font-medium" style="color: #6b7280">{{ utilizationPercent(b) }}%</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge" :class="b.status === 'active' ? 'badge-green' : b.status === 'exhausted' ? 'badge-red' : 'badge-gray'">
                      {{ b.status || 'active' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!budgets.length">
                  <td colspan="10" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-coins text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No budgets configured
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== P&L TAB ===================== -->
    <template v-if="activeTab === 'pnl'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-scale-balanced" style="color: #FF7A30"></i> Profit & Loss Statement</h3>
          <div class="flex gap-2">
            <select v-model="pnlYear" @change="loadPnL()" class="form-input" style="max-width: 120px">
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
        </div>
        <div class="section-body">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 6" :key="i" class="h-12 rounded-lg animate-pulse" style="background: #1e1e2a"></div>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Profit/Loss</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr v-for="m in pnlMonths" :key="m.month">
                  <td class="font-medium text-white text-sm">{{ monthName(m.month) }}</td>
                  <td class="text-sm" style="color: #34d399">TSh {{ (m.revenue || 0).toLocaleString() }}</td>
                  <td class="text-sm" style="color: #f87171">TSh {{ (m.expenses || 0).toLocaleString() }}</td>
                  <td class="text-sm font-semibold" :style="{ color: (m.profit || 0) >= 0 ? '#34d399' : '#f87171' }">
                    {{ (m.profit || 0) >= 0 ? '+' : '-' }}TSh {{ Math.abs(m.profit || 0).toLocaleString() }}
                  </td>
                  <td>
                    <span class="badge" :class="(m.profit || 0) >= 0 ? 'badge-green' : 'badge-red'">
                      {{ (m.profit || 0) >= 0 ? 'Profit' : 'Loss' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!pnlMonths.length">
                  <td colspan="5" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-scale-balanced text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No P&L data for {{ pnlYear }}
                  </td>
                </tr>
                <tr v-if="pnlMonths.length" style="border-top: 2px solid #1e1e2a">
                  <td class="font-bold text-white">TOTAL</td>
                  <td class="font-bold" style="color: #34d399">TSh {{ totalPnL.revenue.toLocaleString() }}</td>
                  <td class="font-bold" style="color: #f87171">TSh {{ totalPnL.expenses.toLocaleString() }}</td>
                  <td class="font-bold" :style="{ color: totalPnL.profit >= 0 ? '#34d399' : '#f87171' }">
                    {{ totalPnL.profit >= 0 ? '+' : '-' }}TSh {{ Math.abs(totalPnL.profit).toLocaleString() }}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== CREATE EXPENSE MODAL ===================== -->
    <div v-if="showCreateExpenseModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showCreateExpenseModal = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white"><i class="fas fa-plus-circle mr-2" style="color: #FF7A30"></i>Create Expense</h3>
          <button @click="showCreateExpenseModal = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="form-label">Title *</label>
            <input v-model="expenseForm.title" type="text" class="form-input" placeholder="Expense description">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Category *</label>
              <select v-model="expenseForm.category_id" class="form-input">
                <option value="">Select category</option>
                <option v-for="c in expenseCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Amount (TSh) *</label>
              <input v-model.number="expenseForm.amount" type="number" class="form-input" placeholder="0">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Branch</label>
              <select v-model="expenseForm.branch_id" class="form-input">
                <option value="">All branches</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Expense Date *</label>
              <input v-model="expenseForm.expense_date" type="date" class="form-input">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Payment Method</label>
              <select v-model="expenseForm.payment_method" class="form-input">
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label class="form-label">Receipt URL</label>
              <input v-model="expenseForm.receipt_url" type="url" class="form-input" placeholder="https://...">
            </div>
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea v-model="expenseForm.description" class="form-input" rows="2" placeholder="Description..."></textarea>
          </div>
          <div>
            <label class="form-label">Notes</label>
            <textarea v-model="expenseForm.notes" class="form-input" rows="2" placeholder="Additional notes..."></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="showCreateExpenseModal = false" class="btn btn-secondary flex-1">Cancel</button>
          <button @click="createExpense" class="btn btn-primary flex-1" :disabled="submitting">{{ submitting ? '...' : 'Create' }}</button>
        </div>
      </div>
    </div>

    <!-- ===================== CREATE BUDGET MODAL ===================== -->
    <div v-if="showCreateBudgetModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showCreateBudgetModal = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white"><i class="fas fa-coins mr-2" style="color: #FF7A30"></i>Create Budget</h3>
          <button @click="showCreateBudgetModal = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="form-label">Name *</label>
            <input v-model="budgetForm.name" type="text" class="form-input" placeholder="Budget name">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Category *</label>
              <select v-model="budgetForm.category_id" class="form-input">
                <option value="">Select category</option>
                <option v-for="c in expenseCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Budget Type *</label>
              <select v-model="budgetForm.budget_type" class="form-input">
                <option value="operational">Operational</option>
                <option value="capital">Capital</option>
                <option value="marketing">Marketing</option>
                <option value="personnel">Personnel</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Branch</label>
              <select v-model="budgetForm.branch_id" class="form-input">
                <option value="">All branches</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Amount (TSh) *</label>
              <input v-model.number="budgetForm.amount" type="number" class="form-input" placeholder="0">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Period Start *</label>
              <input v-model="budgetForm.period_start" type="date" class="form-input">
            </div>
            <div>
              <label class="form-label">Period End</label>
              <input v-model="budgetForm.period_end" type="date" class="form-input">
            </div>
          </div>
          <div>
            <label class="form-label">Notes</label>
            <textarea v-model="budgetForm.notes" class="form-input" rows="2" placeholder="Additional notes..."></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="showCreateBudgetModal = false" class="btn btn-secondary flex-1">Cancel</button>
          <button @click="createBudget" class="btn btn-primary flex-1" :disabled="submitting">{{ submitting ? '...' : 'Create' }}</button>
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
  { key: 'overview', label: 'Overview', icon: 'fas fa-chart-line' },
  { key: 'expenses', label: 'Expenses', icon: 'fas fa-money-bill-wave' },
  { key: 'budgets', label: 'Budgets', icon: 'fas fa-coins' },
  { key: 'pnl', label: 'P&L', icon: 'fas fa-scale-balanced' }
]

const activeTab = ref('overview')
const loading = ref(true)
const submitting = ref(false)
const toast = ref(null)
const branches = ref([])

const overview = ref({})
const expenses = ref([])
const budgets = ref([])
const pnlMonths = ref([])
const expenseCategories = ref([])

const expDateFrom = ref('')
const expDateTo = ref('')
const expCategoryFilter = ref('')
const expBranchFilter = ref('')
const budgetStatusFilter = ref('')

const currentYear = new Date().getFullYear()
const pnlYear = ref(currentYear)
const yearOptions = computed(() => [currentYear, currentYear - 1, currentYear - 2])

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const showCreateExpenseModal = ref(false)
const showCreateBudgetModal = ref(false)

const expenseForm = reactive({
  title: '', category_id: '', amount: 0, branch_id: '', expense_date: new Date().toISOString().slice(0, 10),
  payment_method: 'cash', receipt_url: '', description: '', notes: ''
})
const budgetForm = reactive({
  name: '', category_id: '', branch_id: '', budget_type: 'operational', amount: 0,
  period_start: '', period_end: '', notes: ''
})

const totalPnL = computed(() => {
  const rev = pnlMonths.value.reduce((s, m) => s + (m.revenue || 0), 0)
  const exp = pnlMonths.value.reduce((s, m) => s + (m.expenses || 0), 0)
  return { revenue: rev, expenses: exp, profit: rev - exp }
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateShort(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function monthName(m) {
  return monthNames[(m || 1) - 1] || `Month ${m}`
}

function remainingBudget(b) {
  return (b.amount || 0) - (b.spent || 0)
}

function utilizationPercent(b) {
  if (!b.amount) return 0
  return Math.round(((b.spent || 0) / b.amount) * 100)
}

onMounted(async () => {
  await loadBranches()
  await loadCategories()
  refreshAll()
})

function onTabChange() {
  if (activeTab.value === 'overview') loadOverview()
  if (activeTab.value === 'expenses') loadExpenses()
  if (activeTab.value === 'budgets') loadBudgets()
  if (activeTab.value === 'pnl') loadPnL()
}

async function loadBranches() {
  try {
    const r = await adminGet('/hq/branches')
    branches.value = r.data || r.branches || r || []
  } catch (e) { console.error(e) }
}

async function loadCategories() {
  try {
    const r = await adminGet('/hq/expense-categories')
    expenseCategories.value = r.data || r.categories || r || []
  } catch (e) { console.error(e) }
}

async function refreshAll() {
  loading.value = true
  await onTabChange()
  loading.value = false
}

async function loadOverview() {
  try {
    const r = await adminGet('/hq/financial-dashboard')
    overview.value = r.data || r || {}
  } catch (e) { console.error(e) }
}

async function loadExpenses() {
  try {
    const params = new URLSearchParams()
    if (expDateFrom.value) params.set('date_from', expDateFrom.value)
    if (expDateTo.value) params.set('date_to', expDateTo.value)
    if (expCategoryFilter.value) params.set('category_id', expCategoryFilter.value)
    if (expBranchFilter.value) params.set('branch_id', expBranchFilter.value)
    const qs = params.toString() ? `?${params}` : ''
    const r = await adminGet(`/hq/expenses${qs}`)
    expenses.value = r.data || r.expenses || r || []
  } catch (e) {
    console.error(e)
    showToast('Failed to load expenses', 'error')
  }
}

async function loadBudgets() {
  try {
    const params = new URLSearchParams()
    if (budgetStatusFilter.value) params.set('status', budgetStatusFilter.value)
    const qs = params.toString() ? `?${params}` : ''
    const r = await adminGet(`/hq/budgets${qs}`)
    budgets.value = r.data || r.budgets || r || []
  } catch (e) {
    console.error(e)
    showToast('Failed to load budgets', 'error')
  }
}

async function loadPnL() {
  try {
    const r = await adminGet(`/hq/profit-loss?year=${pnlYear.value}`)
    const data = r.data || r || {}
    pnlMonths.value = data.months || []
  } catch (e) {
    console.error(e)
    showToast('Failed to load P&L data', 'error')
  }
}

async function createExpense() {
  if (!expenseForm.title || !expenseForm.category_id || !expenseForm.amount || !expenseForm.expense_date) {
    showToast('Please fill all required fields', 'error'); return
  }
  submitting.value = true
  try {
    await adminPost('/hq/expenses', {
      title: expenseForm.title,
      description: expenseForm.description,
      amount: expenseForm.amount,
      category_id: expenseForm.category_id,
      branch_id: expenseForm.branch_id || undefined,
      expense_date: expenseForm.expense_date,
      payment_method: expenseForm.payment_method,
      receipt_url: expenseForm.receipt_url || undefined,
      notes: expenseForm.notes
    })
    showCreateExpenseModal.value = false
    Object.assign(expenseForm, {
      title: '', category_id: '', amount: 0, branch_id: '', expense_date: new Date().toISOString().slice(0, 10),
      payment_method: 'cash', receipt_url: '', description: '', notes: ''
    })
    await loadExpenses()
    showToast('Expense created')
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to create expense', 'error')
  } finally { submitting.value = false }
}

async function approveExpense(id) {
  try {
    await adminPut(`/hq/expenses/${id}/approve`, { status: 'approved' })
    await loadExpenses()
    showToast('Expense approved')
  } catch (e) {
    showToast('Failed to approve expense', 'error')
  }
}

async function rejectExpense(id) {
  try {
    await adminPut(`/hq/expenses/${id}/approve`, { status: 'rejected' })
    await loadExpenses()
    showToast('Expense rejected')
  } catch (e) {
    showToast('Failed to reject expense', 'error')
  }
}

async function createBudget() {
  if (!budgetForm.name || !budgetForm.category_id || !budgetForm.amount || !budgetForm.period_start) {
    showToast('Please fill all required fields', 'error'); return
  }
  submitting.value = true
  try {
    await adminPost('/hq/budgets', {
      name: budgetForm.name,
      category_id: budgetForm.category_id,
      branch_id: budgetForm.branch_id || undefined,
      budget_type: budgetForm.budget_type,
      amount: budgetForm.amount,
      period_start: budgetForm.period_start,
      period_end: budgetForm.period_end || undefined,
      notes: budgetForm.notes
    })
    showCreateBudgetModal.value = false
    Object.assign(budgetForm, {
      name: '', category_id: '', branch_id: '', budget_type: 'operational', amount: 0,
      period_start: '', period_end: '', notes: ''
    })
    await loadBudgets()
    showToast('Budget created')
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to create budget', 'error')
  } finally { submitting.value = false }
}
</script>
