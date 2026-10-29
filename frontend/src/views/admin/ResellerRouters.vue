<template>
  <div class="space-y-6">
    <div>
      <router-link :to="{ name: 'resellers' }" class="rr-back">← Back to Resellers</router-link>
      <h2 class="rr-title">Reseller Routers &amp; Sales</h2>
      <router-link :to="{ name: 'reseller-onboarding' }" class="rr-btn-s rr-c-blue" style="margin: 6px 0">Applications, equipment plans &amp; financing →</router-link>
      <p class="rr-sub">Create resellers, assign routers, and see sales per router. HQ keeps the percent set on each assignment; the reseller gets the rest.</p>
    </div>

    <div v-if="msg" class="rr-msg" :class="msg.type === 'error' ? 'rr-err' : 'rr-ok'">{{ msg.text }}</div>

    <div class="section-card">
      <div class="section-header"><h3 class="section-title">1. Create reseller</h3></div>
      <div class="section-body">
        <div class="rr-grid">
          <input v-model="form.name" class="rr-inp" placeholder="Full name" />
          <input v-model="form.phone" class="rr-inp" placeholder="Phone (07... or 255...)" />
          <input v-model="form.company_name" class="rr-inp" placeholder="Business name (optional)" />
          <input v-model="form.password" type="password" class="rr-inp" placeholder="Password (min 8)" />
          <button class="rr-btn" :disabled="busy" @click="createReseller">Create reseller</button>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header"><h3 class="section-title">2. Routers</h3></div>
      <div class="section-body rr-scroll">
        <table class="rr-tbl">
          <thead>
            <tr><th>Router</th><th>Status</th><th>Reseller</th><th>Name shown</th><th>HQ keeps</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="rt in routers" :key="rt.key">
              <td><b>{{ rt.key }}</b><div class="rr-mut">{{ rt.name || '' }}</div></td>
              <td>{{ rt.status || '-' }}</td>
              <td>{{ rt.assignment ? (rt.assignment.company_name || rt.assignment.reseller_name) : 'Unassigned (HQ)' }}</td>
              <td>{{ rt.assignment ? rt.assignment.display_name : '-' }}</td>
              <td>{{ rt.assignment ? Number(rt.assignment.commission_percent) + '%' : '100%' }}</td>
              <td class="rr-act">
                <button class="rr-btn-s rr-c-blue" @click="startAssign(rt)">{{ rt.assignment ? 'Transfer / edit' : 'Assign' }}</button>
                <button v-if="rt.assignment" class="rr-btn-s rr-c-red" @click="unassign(rt)">Unassign</button>
              </td>
            </tr>
            <tr v-if="!routers.length"><td colspan="6" class="rr-mut">No routers found</td></tr>
          </tbody>
        </table>

        <div v-if="assigning" class="rr-panel">
          <h4>Assign {{ assigning.router_id }}</h4>
          <div class="rr-grid">
            <select v-model.number="assigning.reseller_user_id" class="rr-inp">
              <option value="">Select reseller</option>
              <option v-for="r in resellers" :key="r.id" :value="r.id">{{ r.company_name || r.name }} ({{ r.phone_number }})</option>
            </select>
            <input v-model="assigning.display_name" class="rr-inp" placeholder="Router name (e.g. Mama Neema WiFi)" />
            <input v-model.number="assigning.commission_percent" type="number" min="0" max="100" step="0.5" class="rr-inp" placeholder="HQ keeps %" />
            <label class="rr-chk"><input type="checkbox" v-model="assigning.rename_router" /> Rename router everywhere</label>
            <div class="rr-act">
              <button class="rr-btn" :disabled="busy" @click="saveAssign">Save</button>
              <button class="rr-btn-s rr-c-slate" @click="assigning = null">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title">3. Sales per router</h3>
        <div class="rr-act">
          <input type="date" v-model="filters.from" class="rr-inp rr-sm" />
          <input type="date" v-model="filters.to" class="rr-inp rr-sm" />
          <button class="rr-btn-s rr-c-green" @click="load">Apply</button>
        </div>
      </div>
      <div class="section-body rr-scroll">
        <div class="rr-cards">
          <div class="rr-card"><span>Sales</span><b>{{ sales.totals.sales }}</b></div>
          <div class="rr-card"><span>Gross</span><b>{{ tsh(sales.totals.gross) }}</b></div>
          <div class="rr-card"><span>HQ share</span><b>{{ tsh(sales.totals.hq) }}</b></div>
          <div class="rr-card"><span>Resellers' share</span><b>{{ tsh(sales.totals.reseller) }}</b></div>
        </div>

        <h4 class="rr-h4">By router</h4>
        <table class="rr-tbl">
          <thead><tr><th>Router</th><th>Reseller</th><th>HQ %</th><th>Sales</th><th>Gross</th><th>HQ</th><th>Reseller</th></tr></thead>
          <tbody>
            <tr v-for="r in sales.byRouter" :key="r.router_id">
              <td><b>{{ r.display_name || r.router_name || r.router_id }}</b><div class="rr-mut">{{ r.router_id }}</div></td>
              <td>{{ r.reseller_name || 'HQ' }}</td>
              <td>{{ r.hq_percent }}%</td>
              <td>{{ r.sales }}</td>
              <td>{{ tsh(r.gross) }}</td>
              <td>{{ tsh(r.hq) }}</td>
              <td>{{ tsh(r.reseller) }}</td>
            </tr>
          </tbody>
        </table>

        <h4 class="rr-h4">By reseller</h4>
        <table class="rr-tbl">
          <thead><tr><th>Reseller</th><th>Sales</th><th>Gross</th><th>Earned</th><th>Balance (withdrawable)</th></tr></thead>
          <tbody>
            <tr v-for="r in sales.byReseller" :key="r.reseller_user_id">
              <td>{{ r.name }}</td><td>{{ r.sales }}</td><td>{{ tsh(r.gross) }}</td><td>{{ tsh(r.reseller) }}</td><td>{{ tsh(r.balance) }}</td>
            </tr>
            <tr v-if="!sales.byReseller.length"><td colspan="5" class="rr-mut">No reseller sales yet</td></tr>
          </tbody>
        </table>

        <h4 class="rr-h4">Latest sales</h4>
        <table class="rr-tbl">
          <thead><tr><th>When</th><th>Order</th><th>Router</th><th>Gross</th><th>HQ</th><th>Reseller</th></tr></thead>
          <tbody>
            <tr v-for="r in sales.recent" :key="r.order_reference">
              <td>{{ new Date(r.created_at).toLocaleString() }}</td><td>{{ r.order_reference }}</td><td>{{ r.router_id }}</td>
              <td>{{ tsh(r.gross_amount) }}</td><td>{{ tsh(r.hq_amount) }}</td><td>{{ tsh(r.reseller_amount) }}</td>
            </tr>
            <tr v-if="!sales.recent.length"><td colspan="6" class="rr-mut">No sales yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const routers = ref([])
const resellers = ref([])
const sales = ref({ totals: { sales: 0, gross: 0, hq: 0, reseller: 0 }, byRouter: [], byReseller: [], recent: [] })
const msg = ref(null)
const busy = ref(false)
const form = ref({ name: '', phone: '', company_name: '', password: '' })
const assigning = ref(null)
const filters = ref({ from: '', to: '' })

const tsh = (n) => 'TSh ' + Number(n || 0).toLocaleString()
const errText = (e) => e?.response?.data?.error || e?.data?.error || e?.message || 'Request failed'
function notify(text, type = 'ok') {
  msg.value = { text, type }
  setTimeout(() => { msg.value = null }, 6000)
}

async function load() {
  try {
    const qs = new URLSearchParams()
    if (filters.value.from) qs.set('from', filters.value.from)
    if (filters.value.to) qs.set('to', filters.value.to)
    const q = qs.toString() ? '?' + qs.toString() : ''
    const [r, o, s] = await Promise.all([
      adminGet('/resellers-v2/routers'),
      adminGet('/resellers-v2/overview'),
      adminGet('/resellers-v2/sales' + q)
    ])
    routers.value = r.routers || []
    resellers.value = o.resellers || []
    sales.value = s
  } catch (e) {
    notify(errText(e), 'error')
  }
}

async function createReseller() {
  busy.value = true
  try {
    await adminPost('/resellers-v2/resellers', { ...form.value })
    form.value = { name: '', phone: '', company_name: '', password: '' }
    notify('Reseller created')
    await load()
  } catch (e) {
    notify(errText(e), 'error')
  } finally {
    busy.value = false
  }
}

function startAssign(rt) {
  assigning.value = {
    router_id: rt.key,
    reseller_user_id: rt.assignment ? rt.assignment.reseller_user_id : '',
    display_name: rt.assignment ? rt.assignment.display_name : '',
    commission_percent: rt.assignment ? Number(rt.assignment.commission_percent) : 20,
    rename_router: true
  }
}

async function saveAssign() {
  const a = assigning.value
  if (!a.reseller_user_id) return notify('Select a reseller', 'error')
  if (!a.display_name || a.display_name.trim().length < 2) return notify('Enter the router name', 'error')
  busy.value = true
  try {
    const r = await adminPost('/resellers-v2/assign', { ...a })
    notify('Router assigned' + (r && r.renamed && r.previous_name ? '. Previous name: ' + r.previous_name : ''))
    assigning.value = null
    await load()
  } catch (e) {
    notify(errText(e), 'error')
  } finally {
    busy.value = false
  }
}

async function unassign(rt) {
  if (!window.confirm('Unassign ' + rt.key + '? Its future sales will go 100% to HQ.')) return
  try {
    await adminPost('/resellers-v2/unassign', { router_id: rt.key })
    notify('Router unassigned')
    await load()
  } catch (e) {
    notify(errText(e), 'error')
  }
}

onMounted(load)
</script>

<style scoped>
.rr-title { font-size: 1.25rem; font-weight: 700; color: #fff; }
.rr-sub { color: #6b7280; font-size: 0.85rem; margin-top: 4px; }
.rr-msg { padding: 12px; border-radius: 12px; font-size: 0.85rem; }
.rr-ok { background: #0f2a1c; color: #34d399; }
.rr-err { background: #2a1015; color: #f87171; }
.rr-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); align-items: center; }
.rr-inp { background: #0d0d14; border: 1px solid #1e1e2a; color: #fff; padding: 9px 12px; border-radius: 10px; width: 100%; font-size: 0.85rem; }
.rr-sm { width: 150px; }
.rr-btn { background: #FF7A30; color: #fff; border: 0; padding: 9px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.rr-btn:disabled { opacity: 0.5; cursor: default; }
.rr-btn-s { background: #1a1a24; color: #e5e7eb; border: 1px solid #2a2a38; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; transition: filter 0.15s, transform 0.15s; }
.rr-btn-s:hover:not(:disabled) { filter: brightness(1.3); transform: translateY(-1px); }
.rr-btn-s:disabled { opacity: 0.5; cursor: default; }
.rr-c-blue { background: rgba(59, 130, 246, 0.14); color: #60a5fa; border-color: rgba(59, 130, 246, 0.45); }
.rr-c-purple { background: rgba(139, 92, 246, 0.14); color: #a78bfa; border-color: rgba(139, 92, 246, 0.45); }
.rr-c-teal { background: rgba(20, 184, 166, 0.14); color: #2dd4bf; border-color: rgba(20, 184, 166, 0.45); }
.rr-c-green { background: rgba(16, 185, 129, 0.14); color: #34d399; border-color: rgba(16, 185, 129, 0.45); }
.rr-c-amber { background: rgba(245, 158, 11, 0.14); color: #fbbf24; border-color: rgba(245, 158, 11, 0.45); }
.rr-c-red { background: rgba(239, 68, 68, 0.14); color: #f87171; border-color: rgba(239, 68, 68, 0.45); }
.rr-c-slate { background: rgba(148, 163, 184, 0.12); color: #cbd5e1; border-color: rgba(148, 163, 184, 0.35); }
.rr-back { display: inline-block; margin-bottom: 8px; padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(255, 122, 48, 0.5); background: rgba(255, 122, 48, 0.12); color: #FF7A30; font-size: 0.82rem; font-weight: 600; text-decoration: none; }
.rr-back:hover { filter: brightness(1.25); }
.rr-btn-d { color: #f87171; }
.rr-act { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.rr-chk { color: #9ca3af; font-size: 0.8rem; display: flex; gap: 6px; align-items: center; }
.rr-scroll { overflow-x: auto; }
.rr-tbl { width: 100%; border-collapse: collapse; font-size: 0.85rem; color: #e5e7eb; margin-bottom: 16px; }
.rr-tbl th { text-align: left; color: #6b7280; font-weight: 500; padding: 8px; border-bottom: 1px solid #1e1e2a; white-space: nowrap; }
.rr-tbl td { padding: 8px; border-bottom: 1px solid #14141c; vertical-align: top; }
.rr-mut { color: #6b7280; font-size: 0.75rem; }
.rr-panel { background: #0d0d14; border: 1px solid #1e1e2a; border-radius: 12px; padding: 16px; margin-top: 8px; color: #e5e7eb; }
.rr-panel h4 { margin-bottom: 12px; font-weight: 600; }
.rr-h4 { color: #fff; font-weight: 600; margin: 8px 0; }
.rr-cards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-bottom: 16px; }
.rr-card { background: #0d0d14; border: 1px solid #1e1e2a; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.rr-card span { color: #6b7280; font-size: 0.75rem; }
.rr-card b { color: #FF7A30; font-size: 1.1rem; }
</style>
