<template>
  <div class="space-y-6">
    <div>
      <h2 class="ob-title">Reseller Onboarding</h2>
      <p class="ob-sub">Applications, equipment partners and plans, financing. <router-link :to="{ name: 'reseller-routers' }" class="ob-link">Assign routers &amp; sales →</router-link></p>
    </div>
    <div v-if="msg" class="ob-msg" :class="msg.type === 'error' ? 'ob-err' : 'ob-ok'">{{ msg.text }}</div>

    <div class="ob-tabs">
      <button v-for="t in tabs" :key="t.k" class="ob-tab" :class="{ on: tab === t.k }" @click="setTab(t.k)">{{ t.l }}</button>
    </div>

    <!-- APPLICATIONS -->
    <div v-if="tab === 'apps'" class="section-card">
      <div class="section-body">
        <div class="ob-chips">
          <button v-for="s in statuses" :key="s" class="ob-chip" :class="{ on: filter === s }" @click="filter = s; loadApps()">
            {{ s || 'all' }} <span v-if="s">({{ counts[s] || 0 }})</span>
          </button>
        </div>
        <table class="ob-tbl">
          <thead><tr><th>Ref</th><th>Applicant</th><th>Area</th><th>Plan</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr v-for="a in apps" :key="a.id">
              <td>{{ a.application_ref }}<div class="ob-mut">{{ fmt(a.created_at) }}</div></td>
              <td><b>{{ a.business_name || a.name }}</b><div class="ob-mut">{{ a.name }} &middot; {{ a.phone }}</div></td>
              <td>{{ a.district }}, {{ a.region }}<div class="ob-mut">{{ a.landmark }}</div></td>
              <td>{{ a.plan_name || '-' }}</td>
              <td><span class="ob-badge">{{ a.status }}</span></td>
              <td><button class="ob-btn-s" @click="openApp(a)">Open</button></td>
            </tr>
            <tr v-if="!apps.length"><td colspan="6" class="ob-mut">No applications</td></tr>
          </tbody>
        </table>

        <div v-if="sel" class="ob-panel">
          <h4>{{ sel.business_name || sel.name }} <span class="ob-mut">({{ sel.application_ref }})</span></h4>
          <p class="ob-mut">{{ sel.name }} &middot; {{ sel.phone }} &middot; {{ sel.email }}</p>
          <p class="ob-mut">{{ [sel.address, sel.ward, sel.district, sel.region].filter(Boolean).join(', ') }} <span v-if="sel.landmark">&middot; near {{ sel.landmark }}</span></p>
          <p class="ob-mut">Business: {{ sel.business_type || '-' }} &middot; Expected customers/day: {{ sel.expected_customers ?? '-' }}</p>
          <p v-if="sel.notes" class="ob-mut">Applicant notes: {{ sel.notes }}</p>
          <p v-if="sel.admin_notes" class="ob-mut" style="white-space: pre-wrap">HQ notes: {{ sel.admin_notes }}</p>
          <p v-if="sel.rejection_reason" class="ob-mut">Rejected: {{ sel.rejection_reason }}</p>
          <p v-if="sel.install_date" class="ob-mut">Install: {{ sel.install_date }} {{ sel.install_time }} &middot; {{ sel.technician }}</p>

          <div v-if="['new', 'reviewing'].includes(sel.status)" class="ob-blk">
            <p class="ob-mut">Verify the phone number by calling the applicant before approving.</p>
            <input v-model="form.note" class="ob-inp" placeholder="Note (optional)" />
            <button class="ob-btn-s" :disabled="busy" @click="act('review', { notes: form.note })">Mark reviewing</button>
            <div class="ob-row">
              <select v-model="form.plan_id" class="ob-inp">
                <option value="">Keep applicant's plan ({{ sel.plan_name || 'none' }})</option>
                <option v-for="p in activePlans" :key="p.id" :value="p.id">{{ p.name }} ({{ p.plan_type }})</option>
              </select>
              <button class="ob-btn" :disabled="busy" @click="approve">Approve &amp; create account</button>
            </div>
            <div class="ob-row">
              <input v-model="form.reason" class="ob-inp" placeholder="Rejection reason (the applicant sees this)" />
              <button class="ob-btn-s ob-red" :disabled="busy" @click="act('reject', { reason: form.reason })">Reject</button>
            </div>
          </div>

          <div v-if="['approved', 'scheduled'].includes(sel.status)" class="ob-blk">
            <p class="ob-mut">Schedule the installation visit:</p>
            <div class="ob-row">
              <input v-model="form.date" type="date" class="ob-inp" />
              <input v-model="form.time" class="ob-inp" placeholder="Time (e.g. 10:00)" />
              <input v-model="form.tech" class="ob-inp" placeholder="Technician name" />
            </div>
            <input v-model="form.inote" class="ob-inp" placeholder="Install notes (optional)" />
            <button class="ob-btn" :disabled="busy" @click="schedule">Save schedule</button>
            <a v-if="wa" :href="wa" target="_blank" rel="noopener" class="ob-btn-s">Send WhatsApp to applicant</a>
            <button class="ob-btn-s" :disabled="busy" @click="act('installed', {})">Mark installed</button>
          </div>
          <p v-if="sel.status === 'installed'" class="ob-mut">Installed. Assign the router on the <router-link :to="{ name: 'reseller-routers' }" class="ob-link">Reseller Routers</router-link> page.</p>
          <button class="ob-btn-s" @click="sel = null">Close</button>
        </div>
      </div>
    </div>

    <!-- PLANS & PARTNERS -->
    <div v-if="tab === 'plans'">
      <div class="section-card">
        <div class="section-header"><h3 class="section-title">Equipment partners</h3></div>
        <div class="section-body">
          <div class="ob-row">
            <input v-model="pf.name" class="ob-inp" placeholder="Partner name" />
            <input v-model="pf.contact_person" class="ob-inp" placeholder="Contact person" />
            <input v-model="pf.phone" class="ob-inp" placeholder="Phone" />
            <button class="ob-btn" :disabled="busy" @click="createPartner">Add partner</button>
          </div>
          <p v-for="p in partners" :key="p.id" class="ob-mut">{{ p.name }} &middot; {{ p.contact_person || '-' }} &middot; {{ p.phone || '-' }}</p>
        </div>
      </div>
      <div class="section-card" style="margin-top: 16px">
        <div class="section-header"><h3 class="section-title">Equipment plans</h3></div>
        <div class="section-body">
          <div class="ob-row">
            <input v-model="plf.name" class="ob-inp" placeholder="Plan name" />
            <select v-model="plf.plan_type" class="ob-inp">
              <option value="hq_supplied">HQ supplies equipment</option>
              <option value="outright">Buy outright from partner</option>
              <option value="financed">Partner financed (repay from sales)</option>
            </select>
            <select v-if="plf.plan_type !== 'hq_supplied'" v-model="plf.partner_id" class="ob-inp">
              <option value="">Select partner</option>
              <option v-for="p in partners" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="ob-row" v-if="plf.plan_type !== 'hq_supplied'">
            <input v-model="plf.total_price" type="number" min="0" class="ob-inp" placeholder="Total price (TSh)" />
            <input v-model="plf.deposit" type="number" min="0" class="ob-inp" placeholder="Deposit (TSh)" />
            <input v-if="plf.plan_type === 'financed'" v-model="plf.repayment_percent" type="number" min="1" max="100" step="0.5" class="ob-inp" placeholder="Repayment % of reseller share" />
          </div>
          <div class="ob-row">
            <input v-model="plf.maintenance_percent" type="number" min="0" max="100" step="0.5" class="ob-inp" placeholder="Maintenance % HQ keeps after ownership (default 10)" />
            <input v-model="plf.equipment_list" class="ob-inp" placeholder="Equipment list (e.g. 1 router, 2 APs, cables)" />
            <button class="ob-btn" :disabled="busy" @click="createPlan">Add plan</button>
          </div>
          <table class="ob-tbl">
            <thead><tr><th>Plan</th><th>Type</th><th>Partner</th><th>Price</th><th>Financed</th><th>Repay %</th><th>Maint %</th><th></th></tr></thead>
            <tbody>
              <tr v-for="p in plans" :key="p.id" :style="{ opacity: p.is_active ? 1 : 0.5 }">
                <td>{{ p.name }}<div class="ob-mut">{{ p.equipment_list }}</div></td><td>{{ p.plan_type }}</td><td>{{ p.partner_name || 'HQ' }}</td>
                <td>{{ tsh(p.total_price) }}</td><td>{{ tsh(p.financed_amount) }}</td><td>{{ p.repayment_percent }}</td><td>{{ p.maintenance_percent }}</td>
                <td><button class="ob-btn-s" @click="togglePlan(p)">{{ p.is_active ? 'Disable' : 'Enable' }}</button></td>
              </tr>
              <tr v-if="!plans.length"><td colspan="8" class="ob-mut">No plans yet</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- FINANCING -->
    <div v-if="tab === 'fin'">
      <div class="section-card">
        <div class="section-header"><h3 class="section-title">Reseller financing</h3></div>
        <div class="section-body ob-scroll">
          <table class="ob-tbl">
            <thead><tr><th>Reseller</th><th>Partner / plan</th><th>Principal</th><th>Repaid</th><th>Balance</th><th>Repay %</th><th>Status</th><th>Last repayment</th><th></th></tr></thead>
            <tbody>
              <tr v-for="f in fins" :key="f.id">
                <td>{{ f.company_name || f.reseller_name }}</td><td>{{ f.partner_name }}<div class="ob-mut">{{ f.plan_name }}</div></td>
                <td>{{ tsh(f.principal) }}</td><td>{{ tsh(f.repaid) }}</td><td>{{ tsh(f.balance) }}</td><td>{{ f.repayment_percent }}%</td>
                <td><span class="ob-badge">{{ f.status }}</span></td><td>{{ f.last_repayment ? fmt(f.last_repayment) : '-' }}</td>
                <td><button v-if="f.status === 'pending'" class="ob-btn-s" @click="activateFin(f)">Activate</button></td>
              </tr>
              <tr v-if="!fins.length"><td colspan="9" class="ob-mut">No financing yet</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="section-card" style="margin-top: 16px">
        <div class="section-header"><h3 class="section-title">Owed to partners</h3></div>
        <div class="section-body ob-scroll">
          <table class="ob-tbl">
            <thead><tr><th>Partner</th><th>Collected</th><th>Paid out</th><th>Owed</th><th>Record payout</th></tr></thead>
            <tbody>
              <tr v-for="p in balances" :key="p.id">
                <td>{{ p.name }}</td><td>{{ tsh(p.collected) }}</td><td>{{ tsh(p.paid) }}</td><td><b>{{ tsh(p.owed) }}</b></td>
                <td>
                  <div class="ob-row">
                    <input v-model="pay[p.id]" type="number" min="0" class="ob-inp ob-sm" placeholder="Amount" />
                    <input v-model="payRef[p.id]" class="ob-inp ob-sm" placeholder="Reference" />
                    <button class="ob-btn-s" :disabled="busy || !p.owed" @click="payPartner(p)">Record</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="ob-mut">Pay the partner from ClickPesa (or bank), then record it here with the payment reference. Recording does not move money.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const tabs = [{ k: 'apps', l: 'Applications' }, { k: 'plans', l: 'Partners & plans' }, { k: 'fin', l: 'Financing' }]
const statuses = ['', 'new', 'reviewing', 'approved', 'scheduled', 'installed', 'rejected']
const tab = ref('apps')
const filter = ref('')
const apps = ref([])
const counts = ref({})
const sel = ref(null)
const wa = ref('')
const msg = ref(null)
const busy = ref(false)
const partners = ref([])
const plans = ref([])
const fins = ref([])
const balances = ref([])
const pay = ref({})
const payRef = ref({})
const form = ref({ note: '', reason: '', plan_id: '', date: '', time: '', tech: '', inote: '' })
const pf = ref({ name: '', contact_person: '', phone: '' })
const plf = ref({ name: '', plan_type: 'financed', partner_id: '', total_price: '', deposit: '', repayment_percent: '', maintenance_percent: '10', equipment_list: '' })

const activePlans = computed(() => plans.value.filter(p => p.is_active))
const tsh = (n) => 'TSh ' + Number(n || 0).toLocaleString()
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '')
const errText = (e) => (e && e.response && e.response.data && e.response.data.error) || (e && e.data && e.data.error) || (e && e.message) || 'Request failed'
function notify(text, type = 'ok') { msg.value = { text, type }; setTimeout(() => { msg.value = null }, 7000) }

async function loadApps() {
  try {
    const r = await adminGet('/resellers-v2/applications' + (filter.value ? '?status=' + filter.value : ''))
    apps.value = r.applications || []
    counts.value = r.counts || {}
    if (sel.value) sel.value = apps.value.find(a => a.id === sel.value.id) || null
  } catch (e) { notify(errText(e), 'error') }
}
async function loadPlans() {
  try {
    const [p, pl] = await Promise.all([adminGet('/resellers-v2/partners'), adminGet('/resellers-v2/plans')])
    partners.value = p.partners || []
    plans.value = pl.plans || []
  } catch (e) { notify(errText(e), 'error') }
}
async function loadFin() {
  try {
    const [f, b] = await Promise.all([adminGet('/resellers-v2/financings'), adminGet('/resellers-v2/partner-balances')])
    fins.value = f.financings || []
    balances.value = b.partners || []
  } catch (e) { notify(errText(e), 'error') }
}
function setTab(k) {
  tab.value = k
  if (k === 'apps') loadApps()
  else if (k === 'plans') loadPlans()
  else loadFin()
}
function openApp(a) {
  sel.value = a
  wa.value = ''
  form.value = { note: '', reason: '', plan_id: '', date: a.install_date || '', time: a.install_time || '', tech: a.technician || '', inote: a.install_notes || '' }
}
async function act(action, body) {
  busy.value = true
  try {
    await adminPost('/resellers-v2/applications/' + sel.value.id + '/' + action, body)
    notify('Done: ' + action)
    await loadApps()
  } catch (e) { notify(errText(e), 'error') } finally { busy.value = false }
}
async function approve() {
  if (!window.confirm('Approve and create a reseller account for ' + sel.value.name + '?')) return
  busy.value = true
  try {
    const r = await adminPost('/resellers-v2/applications/' + sel.value.id + '/approve', { plan_id: form.value.plan_id || null })
    notify('Account created. The applicant logs in with ' + (r.login_email || 'their email') + ' and the password they chose.' + (r.financing_id ? ' Financing is pending until installation is confirmed.' : ''))
    await loadApps()
  } catch (e) { notify(errText(e), 'error') } finally { busy.value = false }
}
async function schedule() {
  busy.value = true
  try {
    const r = await adminPost('/resellers-v2/applications/' + sel.value.id + '/schedule', {
      install_date: form.value.date, install_time: form.value.time, technician: form.value.tech, notes: form.value.inote
    })
    wa.value = r.whatsapp_link || ''
    notify('Schedule saved. Use the WhatsApp button to notify the applicant.')
    await loadApps()
  } catch (e) { notify(errText(e), 'error') } finally { busy.value = false }
}
async function createPartner() {
  busy.value = true
  try {
    await adminPost('/resellers-v2/partners', { ...pf.value })
    pf.value = { name: '', contact_person: '', phone: '' }
    notify('Partner added')
    await loadPlans()
  } catch (e) { notify(errText(e), 'error') } finally { busy.value = false }
}
async function createPlan() {
  busy.value = true
  try {
    await adminPost('/resellers-v2/plans', { ...plf.value })
    plf.value = { name: '', plan_type: 'financed', partner_id: '', total_price: '', deposit: '', repayment_percent: '', maintenance_percent: '10', equipment_list: '' }
    notify('Plan added')
    await loadPlans()
  } catch (e) { notify(errText(e), 'error') } finally { busy.value = false }
}
async function togglePlan(p) {
  try { await adminPost('/resellers-v2/plans/' + p.id + '/toggle', {}); await loadPlans() } catch (e) { notify(errText(e), 'error') }
}
async function activateFin(f) {
  try { await adminPost('/resellers-v2/financings/' + f.id + '/activate', {}); notify('Financing activated'); await loadFin() } catch (e) { notify(errText(e), 'error') }
}
async function payPartner(p) {
  const amount = Number(pay.value[p.id])
  if (!(amount > 0)) return notify('Enter the amount paid', 'error')
  if (!window.confirm('Record a payout of TSh ' + amount.toLocaleString() + ' to ' + p.name + '?')) return
  busy.value = true
  try {
    await adminPost('/resellers-v2/partner-payouts', { partner_id: p.id, amount, reference: payRef.value[p.id] || '' })
    pay.value[p.id] = ''; payRef.value[p.id] = ''
    notify('Payout recorded')
    await loadFin()
  } catch (e) { notify(errText(e), 'error') } finally { busy.value = false }
}

onMounted(() => { loadApps(); loadPlans() })
</script>

<style scoped>
.ob-title { font-size: 1.25rem; font-weight: 700; color: #fff; }
.ob-sub { color: #6b7280; font-size: 0.85rem; margin-top: 4px; }
.ob-link { color: #FF7A30; }
.ob-msg { padding: 12px; border-radius: 12px; font-size: 0.85rem; }
.ob-ok { background: #0f2a1c; color: #34d399; }
.ob-err { background: #2a1015; color: #f87171; }
.ob-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.ob-tab { background: #111118; border: 1px solid #1e1e2a; color: #9ca3af; padding: 8px 14px; border-radius: 10px; cursor: pointer; }
.ob-tab.on { background: #FF7A30; color: #fff; border-color: #FF7A30; }
.ob-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.ob-chip { background: #0d0d14; border: 1px solid #1e1e2a; color: #9ca3af; padding: 5px 12px; border-radius: 999px; font-size: 0.8rem; cursor: pointer; }
.ob-chip.on { border-color: #FF7A30; color: #FF7A30; }
.ob-tbl { width: 100%; border-collapse: collapse; font-size: 0.85rem; color: #e5e7eb; margin: 8px 0; }
.ob-tbl th { text-align: left; color: #6b7280; font-weight: 500; padding: 8px; border-bottom: 1px solid #1e1e2a; white-space: nowrap; }
.ob-tbl td { padding: 8px; border-bottom: 1px solid #14141c; vertical-align: top; }
.ob-scroll { overflow-x: auto; }
.ob-mut { color: #6b7280; font-size: 0.78rem; margin: 3px 0; }
.ob-badge { background: #1a1a24; color: #FF7A30; border-radius: 999px; padding: 2px 10px; font-size: 0.75rem; }
.ob-panel { background: #0d0d14; border: 1px solid #1e1e2a; border-radius: 12px; padding: 16px; margin-top: 12px; color: #e5e7eb; }
.ob-blk { margin: 12px 0; display: grid; gap: 8px; }
.ob-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin: 6px 0; }
.ob-inp { background: #0a0a0f; border: 1px solid #1e1e2a; color: #fff; padding: 8px 10px; border-radius: 10px; font-size: 0.85rem; flex: 1; min-width: 150px; }
.ob-sm { min-width: 90px; max-width: 140px; }
.ob-btn { background: #FF7A30; color: #fff; border: 0; padding: 8px 14px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.ob-btn-s { background: #1a1a24; color: #e5e7eb; border: 1px solid #2a2a38; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; cursor: pointer; text-decoration: none; display: inline-block; }
.ob-red { color: #f87171; }
.ob-btn:disabled, .ob-btn-s:disabled { opacity: 0.5; cursor: default; }
</style>
