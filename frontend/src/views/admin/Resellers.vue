<template>
  <div class="space-y-6">
    <div class="rs-head">
      <div>
        <h2 class="rs-title">Resellers</h2>
        <p class="rs-sub">Everyone who registered or was added by HQ. Assign each a router according to the equipment plan they chose.</p>
      </div>
      <div class="rs-row">
        <router-link :to="{ name: 'reseller-onboarding' }" class="rs-btn-s rs-c-blue">Applications &amp; plans</router-link>
        <router-link :to="{ name: 'reseller-routers' }" class="rs-btn-s rs-c-purple">Routers &amp; sales</router-link>
        <button class="rs-btn-s rs-c-teal" @click="load">Refresh</button>
      </div>
    </div>

    <div v-if="msg" class="rs-msg" :class="msg.type === 'error' ? 'rs-err' : 'rs-ok'">{{ msg.text }}</div>

    <div class="rs-cards">
      <div class="rs-card"><span>Resellers</span><b>{{ counts.all }}</b></div>
      <div class="rs-card"><span>Active</span><b>{{ counts.active }}</b></div>
      <div class="rs-card"><span>Need a router</span><b>{{ counts.needs }}</b></div>
      <div class="rs-card"><span>Owed to resellers</span><b>{{ tsh(totals.balance) }}</b></div>
      <div class="rs-card"><span>Resellers earned</span><b>{{ tsh(totals.earned) }}</b></div>
      <div class="rs-card"><span>Equipment loans left</span><b>{{ tsh(totals.loan) }}</b></div>
    </div>

    <div class="section-card">
      <div class="section-body">
        <div class="rs-row rs-between">
          <div class="rs-row">
            <button v-for="f in filters" :key="f.k" class="rs-chip" :class="{ on: filter === f.k }" @click="filter = f.k">{{ f.l }} ({{ counts[f.k] }})</button>
          </div>
          <input v-model="q" class="rs-inp rs-search" placeholder="Search name, phone, business..." />
        </div>

        <div class="rs-scroll">
          <table class="rs-tbl">
            <thead>
              <tr><th>Reseller</th><th>Equipment plan</th><th>Area</th><th>Status</th><th>Router</th><th>Balance</th><th>Loan left</th><th>Earned</th><th>Actions</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in filtered" :key="r.id">
                <td><b>{{ r.company_name || r.name }}</b><div class="rs-mut">{{ r.name }} &middot; {{ r.phone }}</div></td>
                <td>
                  <template v-if="r.plan"><b>{{ r.plan.name }}</b><div class="rs-mut">{{ planLabel(r.plan.plan_type) }}</div></template>
                  <span v-else class="rs-mut">Not chosen</span>
                </td>
                <td><template v-if="r.application">{{ r.application.district }}, {{ r.application.region }}<div class="rs-mut">{{ r.application.landmark }}</div></template><span v-else class="rs-mut">-</span></td>
                <td>
                  <span class="rs-badge" :class="r.status === 'active' ? 'rs-b-ok' : 'rs-b-bad'">{{ r.status }}</span>
                  <div v-if="r.application" class="rs-mut">{{ stageLabel(r.application) }}</div>
                </td>
                <td>
                  <div v-for="x in r.routers" :key="x.router_id"><b>{{ x.display_name }}</b><div class="rs-mut">{{ x.router_id }} &middot; HQ {{ x.commission_percent }}%</div></div>
                  <span v-if="!r.routers.length" class="rs-warn">Not assigned</span>
                </td>
                <td>{{ tsh(r.balance) }}</td>
                <td>{{ r.financing ? tsh(r.financing.balance) : '-' }}</td>
                <td>{{ tsh(r.sales.earned) }}<div class="rs-mut">{{ r.sales.count }} sales</div></td>
                <td>
                  <div class="rs-row">
                    <button class="rs-btn-s rs-c-blue" @click="openShow(r)">Show</button>
                    <button class="rs-btn-s rs-c-amber" @click="openEdit(r)">Edit</button>
                    <button v-if="r.status === 'active'" class="rs-btn" @click="openAssign(r)">Assign router</button>
                    <button class="rs-btn-s rs-c-red" @click="remove(r)">Delete</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filtered.length"><td colspan="9" class="rs-mut">{{ loading ? 'Loading...' : 'No resellers found' }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- SHOW -->
    <div v-if="showR" class="rs-ov" @click.self="showR = null">
      <div class="rs-mod">
        <button class="rs-x" @click="showR = null">&times;</button>
        <h3 class="rs-h3">{{ showR.base.company_name || showR.base.name }}</h3>
        <p class="rs-mut">{{ showR.base.name }} &middot; {{ showR.base.phone }} &middot; {{ showR.base.email }}</p>
        <p v-if="showR.loading" class="rs-mut">Loading...</p>
        <template v-else-if="showR.d">
          <div class="rs-box">
            <b>Account</b>
            <p class="rs-mut">Balance TSh {{ showR.d.reseller.balance.toLocaleString() }} &middot; Earned TSh {{ showR.d.reseller.total_earned.toLocaleString() }} &middot; Status {{ showR.d.reseller.reseller_status || '-' }}</p>
          </div>
          <div v-if="showR.d.application" class="rs-box">
            <b>Application {{ showR.d.application.application_ref }}</b> <span class="rs-badge">{{ showR.d.application.status }}</span>
            <p class="rs-mut">{{ [showR.d.application.address, showR.d.application.ward, showR.d.application.district, showR.d.application.region].filter(Boolean).join(', ') }} <span v-if="showR.d.application.landmark">&middot; near {{ showR.d.application.landmark }}</span></p>
            <p class="rs-mut">Business: {{ showR.d.application.business_type || '-' }} &middot; Expected customers/day: {{ showR.d.application.expected_customers ?? '-' }}</p>
            <p class="rs-mut">Plan: {{ showR.d.application.plan_name || 'not chosen' }} <span v-if="showR.d.application.plan_type">({{ planLabel(showR.d.application.plan_type) }})</span></p>
            <p v-if="showR.d.application.install_date" class="rs-mut">Install: {{ showR.d.application.install_date }} {{ showR.d.application.install_time }} &middot; {{ showR.d.application.technician }}</p>
          </div>
          <div class="rs-box">
            <b>Routers</b>
            <p v-for="x in showR.d.routers" :key="x.router_id" class="rs-mut">
              {{ x.display_name }} ({{ x.router_id }}) &middot; HQ keeps {{ x.commission_percent }}%
              <button class="rs-btn-s rs-c-red" @click="unassign(x)">Unassign</button>
            </p>
            <p v-if="!showR.d.routers.length" class="rs-mut">No router assigned yet</p>
          </div>
          <div v-if="showR.d.financings.length" class="rs-box">
            <b>Equipment financing</b>
            <p v-for="f in showR.d.financings" :key="f.id" class="rs-mut">
              {{ f.partner_name || 'Partner' }}: TSh {{ f.principal.toLocaleString() }}, left TSh {{ f.balance.toLocaleString() }} ({{ f.repayment_percent }}% of reseller share) &middot; {{ f.status }}
            </p>
            <table v-if="showR.d.repayments.length" class="rs-tbl">
              <thead><tr><th>Date</th><th>Repaid</th><th>Left</th></tr></thead>
              <tbody><tr v-for="x in showR.d.repayments" :key="x.order_reference"><td>{{ fmt(x.created_at) }}</td><td>{{ tsh(x.amount) }}</td><td>{{ tsh(x.balance_after) }}</td></tr></tbody>
            </table>
          </div>
          <div class="rs-box">
            <b>Latest sales</b>
            <table v-if="showR.d.sales.length" class="rs-tbl">
              <thead><tr><th>Date</th><th>Router</th><th>Gross</th><th>HQ</th><th>Loan</th><th>Reseller</th></tr></thead>
              <tbody><tr v-for="s in showR.d.sales" :key="s.order_reference"><td>{{ fmt(s.created_at) }}</td><td>{{ s.router_id }}</td><td>{{ tsh(s.gross_amount) }}</td><td>{{ tsh(s.hq_amount) }}</td><td>{{ tsh(s.repayment_amount) }}</td><td>{{ tsh(s.reseller_amount) }}</td></tr></tbody>
            </table>
            <p v-else class="rs-mut">No sales yet</p>
          </div>
          <div v-if="showR.d.withdrawals.length" class="rs-box">
            <b>Withdrawals</b>
            <p v-for="w in showR.d.withdrawals" :key="w.id" class="rs-mut">{{ fmt(w.requested_at) }} &middot; {{ tsh(w.amount) }} &middot; {{ w.status }}</p>
          </div>
        </template>
      </div>
    </div>

    <!-- EDIT -->
    <div v-if="editR" class="rs-ov" @click.self="editR = null">
      <div class="rs-mod rs-small">
        <button class="rs-x" @click="editR = null">&times;</button>
        <h3 class="rs-h3">Edit reseller</h3>
        <label class="rs-l">Name<input v-model="editR.name" class="rs-inp" /></label>
        <label class="rs-l">Business name<input v-model="editR.company_name" class="rs-inp" /></label>
        <label class="rs-l">Phone<input v-model="editR.phone" class="rs-inp" /></label>
        <label class="rs-l">Email<input v-model="editR.email" class="rs-inp" /></label>
        <label class="rs-l">Account status
          <select v-model="editR.status" class="rs-inp"><option value="active">Active</option><option value="suspended">Suspended</option></select>
        </label>
        <label class="rs-l">New password (leave empty to keep)<input v-model="editR.password" type="password" class="rs-inp" autocomplete="new-password" /></label>
        <div class="rs-row">
          <button class="rs-btn" :disabled="busy" @click="saveEdit">Save</button>
          <button class="rs-btn-s rs-c-slate" @click="editR = null">Cancel</button>
        </div>
      </div>
    </div>

    <!-- ASSIGN -->
    <div v-if="assignR" class="rs-ov" @click.self="assignR = null">
      <div class="rs-mod rs-small">
        <button class="rs-x" @click="assignR = null">&times;</button>
        <h3 class="rs-h3">Assign router to {{ assignR.r.company_name || assignR.r.name }}</h3>
        <div class="rs-box">
          <b>Plan chosen: {{ assignR.r.plan ? assignR.r.plan.name : 'none' }}</b>
          <p v-if="assignR.r.plan" class="rs-mut">{{ planLabel(assignR.r.plan.plan_type) }}</p>
          <p v-if="assignR.r.plan && assignR.r.plan.plan_type === 'financed'" class="rs-mut">
            Loan TSh {{ assignR.r.plan.financed_amount.toLocaleString() }}. {{ assignR.r.plan.repayment_percent }}% of the reseller share goes to repayment from each sale until it is paid, then HQ keeps {{ assignR.r.plan.maintenance_percent }}% only. Assigning links the loan to this router and starts repayments.
          </p>
          <p v-if="assignR.r.plan && assignR.r.plan.plan_type === 'outright'" class="rs-mut">Bought equipment from the partner. HQ keeps the maintenance percent only.</p>
          <p v-if="assignR.r.plan && assignR.r.plan.plan_type === 'hq_supplied'" class="rs-mut">HQ supplies the equipment and keeps the percent below from every voucher.</p>
        </div>
        <label class="rs-l">Router (not yet assigned)
          <select v-model="assignR.router_id" class="rs-inp">
            <option value="">Select router</option>
            <option v-for="rt in freeRouters" :key="rt.key" :value="rt.key">{{ rt.key }} {{ rt.name ? '(' + rt.name + ')' : '' }} {{ rt.status ? '- ' + rt.status : '' }}</option>
          </select>
        </label>
        <p v-if="!freeRouters.length" class="rs-warn">No unassigned routers available.</p>
        <label class="rs-l">Router name shown<input v-model="assignR.display_name" class="rs-inp" /></label>
        <label class="rs-l">HQ keeps (% of each voucher)<input v-model.number="assignR.commission_percent" type="number" min="0" max="100" step="0.5" class="rs-inp" /></label>
        <label class="rs-chk"><input type="checkbox" v-model="assignR.rename_router" /> Rename the router everywhere</label>
        <div class="rs-row">
          <button class="rs-btn" :disabled="busy" @click="saveAssign">Assign</button>
          <button class="rs-btn-s rs-c-slate" @click="assignR = null">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const list = ref([])
const routers = ref([])
const filter = ref('all')
const q = ref('')
const msg = ref(null)
const busy = ref(false)
const loading = ref(true)
const showR = ref(null)
const editR = ref(null)
const assignR = ref(null)

const filters = [{ k: 'all', l: 'All' }, { k: 'needs', l: 'Needs router' }, { k: 'active', l: 'Active' }, { k: 'suspended', l: 'Suspended' }]
const tsh = (n) => 'TSh ' + Number(n || 0).toLocaleString()
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '')
const planLabel = (t) => ({ hq_supplied: 'HQ supplies equipment', outright: 'Buys equipment outright', financed: 'Partner loan' }[t] || t)
const stageLabel = (a) => {
  if (a.status === 'scheduled') return 'Install ' + (a.install_date || '') + ' ' + (a.install_time || '')
  return ({ approved: 'Approved, awaiting schedule', installed: 'Installed', new: 'New', reviewing: 'Reviewing', rejected: 'Rejected' }[a.status] || a.status)
}
const errText = (e) => (e && e.response && e.response.data && e.response.data.error) || (e && e.data && e.data.error) || (e && e.message) || 'Request failed'
function notify(text, type = 'ok') { msg.value = { text, type }; setTimeout(() => { msg.value = null }, 8000) }

const needsRouter = (r) => r.status === 'active' && !r.routers.length
const counts = computed(() => ({
  all: list.value.length,
  needs: list.value.filter(needsRouter).length,
  active: list.value.filter(r => r.status === 'active').length,
  suspended: list.value.filter(r => r.status === 'suspended').length
}))
const totals = computed(() => ({
  balance: list.value.reduce((s, r) => s + r.balance, 0),
  earned: list.value.reduce((s, r) => s + r.sales.earned, 0),
  loan: list.value.reduce((s, r) => s + (r.financing ? r.financing.balance : 0), 0)
}))
const filtered = computed(() => {
  const t = q.value.trim().toLowerCase()
  return list.value.filter(r => {
    if (filter.value === 'needs' && !needsRouter(r)) return false
    if (filter.value === 'active' && r.status !== 'active') return false
    if (filter.value === 'suspended' && r.status !== 'suspended') return false
    if (!t) return true
    return [r.name, r.company_name, r.phone, r.email].some(v => String(v || '').toLowerCase().includes(t))
  })
})
const freeRouters = computed(() => routers.value.filter(rt => !rt.assignment))

async function load() {
  loading.value = true
  try {
    const [m, r] = await Promise.all([adminGet('/resellers-v2/managed'), adminGet('/resellers-v2/routers')])
    list.value = m.resellers || []
    routers.value = r.routers || []
  } catch (e) { notify(errText(e), 'error') } finally { loading.value = false }
}

async function openShow(r) {
  showR.value = { base: r, loading: true, d: null }
  try {
    const d = await adminGet('/resellers-v2/managed/' + r.id)
    showR.value = { base: r, loading: false, d }
  } catch (e) { showR.value = null; notify(errText(e), 'error') }
}

function openEdit(r) {
  editR.value = { id: r.id, name: r.name, company_name: r.company_name || '', phone: r.phone, email: r.email || '', status: r.status, password: '' }
}
async function saveEdit() {
  const e = editR.value
  const body = { name: e.name, company_name: e.company_name, phone: e.phone, email: e.email, status: e.status }
  if (e.password) body.password = e.password
  busy.value = true
  try {
    await adminPost('/resellers-v2/resellers/' + e.id + '/update', body)
    editR.value = null
    notify('Reseller updated')
    await load()
  } catch (err) { notify(errText(err), 'error') } finally { busy.value = false }
}

function openAssign(r) {
  const plan = r.plan
  assignR.value = {
    r, router_id: '', display_name: r.company_name || r.name,
    commission_percent: plan && plan.plan_type === 'outright' ? plan.maintenance_percent : 20,
    rename_router: true
  }
}
async function saveAssign() {
  const a = assignR.value
  if (!a.router_id) return notify('Pick a router', 'error')
  if (!a.display_name || a.display_name.trim().length < 2) return notify('Enter the router name', 'error')
  busy.value = true
  try {
    await adminPost('/resellers-v2/assign', {
      router_id: a.router_id, reseller_user_id: a.r.id, display_name: a.display_name,
      commission_percent: a.commission_percent, rename_router: a.rename_router
    })
    assignR.value = null
    notify('Router assigned')
    await load()
  } catch (e) { notify(errText(e), 'error') } finally { busy.value = false }
}

async function unassign(x) {
  if (!window.confirm('Unassign ' + x.router_id + '? Its future sales go 100% to HQ.')) return
  try {
    await adminPost('/resellers-v2/unassign', { router_id: x.router_id })
    showR.value = null
    notify('Router unassigned')
    await load()
  } catch (e) { notify(errText(e), 'error') }
}

async function remove(r) {
  if (!window.confirm('Delete "' + (r.company_name || r.name) + '"? This only works if they have no routers, sales, loans, withdrawals or balance. Otherwise suspend them.')) return
  try {
    await adminPost('/resellers-v2/resellers/' + r.id + '/delete', {})
    notify('Reseller deleted')
    await load()
  } catch (e) { notify(errText(e), 'error') }
}

onMounted(load)
</script>

<style scoped>
.rs-head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: flex-start; }
.rs-title { font-size: 1.25rem; font-weight: 700; color: #fff; }
.rs-sub { color: #6b7280; font-size: 0.85rem; margin-top: 4px; max-width: 640px; }
.rs-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.rs-between { justify-content: space-between; margin-bottom: 12px; }
.rs-msg { padding: 12px; border-radius: 12px; font-size: 0.85rem; }
.rs-ok { background: #0f2a1c; color: #34d399; }
.rs-err { background: #2a1015; color: #f87171; }
.rs-cards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
.rs-card { background: #111118; border: 1px solid #1e1e2a; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
.rs-card span { color: #6b7280; font-size: 0.75rem; }
.rs-card b { color: #FF7A30; font-size: 1.1rem; }
.rs-chip { background: #0d0d14; border: 1px solid #1e1e2a; color: #9ca3af; padding: 5px 12px; border-radius: 999px; font-size: 0.8rem; cursor: pointer; }
.rs-chip.on { border-color: #FF7A30; color: #FF7A30; }
.rs-inp { background: #0a0a0f; border: 1px solid #1e1e2a; color: #fff; padding: 8px 10px; border-radius: 10px; font-size: 0.85rem; width: 100%; }
.rs-search { max-width: 280px; }
.rs-scroll { overflow-x: auto; }
.rs-tbl { width: 100%; border-collapse: collapse; font-size: 0.84rem; color: #e5e7eb; margin: 8px 0; }
.rs-tbl th { text-align: left; color: #6b7280; font-weight: 500; padding: 8px; border-bottom: 1px solid #1e1e2a; white-space: nowrap; }
.rs-tbl td { padding: 8px; border-bottom: 1px solid #14141c; vertical-align: top; }
.rs-mut { color: #6b7280; font-size: 0.78rem; margin: 3px 0; }
.rs-warn { color: #f59e0b; font-size: 0.8rem; }
.rs-badge { background: #1a1a24; color: #FF7A30; border-radius: 999px; padding: 2px 10px; font-size: 0.75rem; }
.rs-b-ok { background: #0f2a1c; color: #34d399; }
.rs-b-bad { background: #2a1015; color: #f87171; }
.rs-btn { background: #FF7A30; color: #fff; border: 0; padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 0.8rem; cursor: pointer; }
.rs-btn-s { background: #1a1a24; color: #e5e7eb; border: 1px solid #2a2a38; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; transition: filter 0.15s, transform 0.15s; }
.rs-btn-s:hover:not(:disabled) { filter: brightness(1.3); transform: translateY(-1px); }
.rs-btn-s:disabled { opacity: 0.5; cursor: default; }
.rs-c-blue { background: rgba(59, 130, 246, 0.14); color: #60a5fa; border-color: rgba(59, 130, 246, 0.45); }
.rs-c-purple { background: rgba(139, 92, 246, 0.14); color: #a78bfa; border-color: rgba(139, 92, 246, 0.45); }
.rs-c-teal { background: rgba(20, 184, 166, 0.14); color: #2dd4bf; border-color: rgba(20, 184, 166, 0.45); }
.rs-c-green { background: rgba(16, 185, 129, 0.14); color: #34d399; border-color: rgba(16, 185, 129, 0.45); }
.rs-c-amber { background: rgba(245, 158, 11, 0.14); color: #fbbf24; border-color: rgba(245, 158, 11, 0.45); }
.rs-c-red { background: rgba(239, 68, 68, 0.14); color: #f87171; border-color: rgba(239, 68, 68, 0.45); }
.rs-c-slate { background: rgba(148, 163, 184, 0.12); color: #cbd5e1; border-color: rgba(148, 163, 184, 0.35); }
.rs-back { display: inline-block; margin-bottom: 8px; padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(255, 122, 48, 0.5); background: rgba(255, 122, 48, 0.12); color: #FF7A30; font-size: 0.82rem; font-weight: 600; text-decoration: none; }
.rs-back:hover { filter: brightness(1.25); }
.rs-red { color: #f87171; }
.rs-btn:disabled { opacity: 0.5; cursor: default; }
.rs-ov { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; }
.rs-mod { position: relative; background: #111118; border: 1px solid #1e1e2a; border-radius: 16px; padding: 20px; width: 100%; max-width: 760px; max-height: 90vh; overflow-y: auto; color: #e5e7eb; }
.rs-small { max-width: 480px; display: grid; gap: 10px; }
.rs-x { position: absolute; top: 10px; right: 14px; color: #6b7280; font-size: 1.4rem; background: none; border: 0; cursor: pointer; }
.rs-h3 { font-size: 1.1rem; font-weight: 700; color: #fff; }
.rs-box { background: #0d0d14; border: 1px solid #1e1e2a; border-radius: 12px; padding: 12px; margin-top: 10px; }
.rs-l { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; color: #9ca3af; }
.rs-chk { font-size: 0.8rem; color: #9ca3af; display: flex; gap: 6px; align-items: center; }
</style>
