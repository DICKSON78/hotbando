<template>
  <div class="ra-wrap">
    <div class="ra-card">
      <h1 class="ra-h1">Omba kuwa Reseller wa HotBando</h1>
      <p class="ra-p">Jaza fomu hii. HQ atakagua ombi lako, kisha utapangiwa siku ya kufungiwa vifaa.</p>

      <div v-if="done" class="ra-ok">
        <h2 class="ra-h2">Ombi limepokelewa</h2>
        <p class="ra-p">Namba ya ombi lako:</p>
        <div class="ra-ref">{{ done.reference }}</div>
        <p class="ra-p">Ihifadhi. Utaihitaji pamoja na namba yako ya simu kuangalia hali ya ombi.</p>
        <router-link to="/apply/status" class="ra-btn">Angalia hali ya ombi</router-link>
      </div>

      <form v-else @submit.prevent="onNext">
        <input v-model="form.website" tabindex="-1" autocomplete="off" aria-hidden="true" class="ra-hp" />
        <p class="ra-steps">Hatua {{ step }} ya 3: {{ ['Wewe', 'Eneo na biashara', 'Vifaa'][step - 1] }}</p>

        <div v-if="step === 1" class="ra-grid">
          <label class="ra-l">Jina kamili *<input v-model="form.name" class="ra-i" autocomplete="name" /></label>
          <label class="ra-l">Jina la biashara<input v-model="form.business_name" class="ra-i" /></label>
          <label class="ra-l">Namba ya simu *<input v-model="form.phone" class="ra-i" type="tel" placeholder="0712345678" autocomplete="tel" /></label>
          <label class="ra-l">Barua pepe *<input v-model="form.email" class="ra-i" type="email" autocomplete="email" /></label>
          <label class="ra-l">Nenosiri (herufi 8+) *
            <input v-model="form.password" class="ra-i" :type="show ? 'text' : 'password'" autocomplete="new-password" />
          </label>
          <label class="ra-l">Rudia nenosiri *<input v-model="form.confirm" class="ra-i" :type="show ? 'text' : 'password'" autocomplete="new-password" /></label>
          <label class="ra-chk"><input type="checkbox" v-model="show" /> Onyesha nenosiri</label>
        </div>

        <div v-if="step === 2" class="ra-grid">
          <label class="ra-l">Mkoa *
            <select v-model="form.region" class="ra-i">
              <option value="">Chagua mkoa</option>
              <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
            </select>
          </label>
          <label class="ra-l">Wilaya *<input v-model="form.district" class="ra-i" /></label>
          <label class="ra-l">Kata<input v-model="form.ward" class="ra-i" /></label>
          <label class="ra-l">Mtaa / anwani<input v-model="form.address" class="ra-i" /></label>
          <label class="ra-l">Alama ya karibu (kituo, shule, soko)<input v-model="form.landmark" class="ra-i" /></label>
          <label class="ra-l">Aina ya biashara
            <select v-model="form.business_type" class="ra-i">
              <option value="">Chagua</option>
              <option v-for="t in businessTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
          <label class="ra-l">Wateja unaotarajia kwa siku<input v-model="form.expected_customers" class="ra-i" type="number" min="0" /></label>
        </div>

        <div v-if="step === 3">
          <p class="ra-p">Chagua jinsi ungependa kupata vifaa. Unaweza pia kuchagua baadaye na HQ.</p>
          <label class="ra-plan" :class="{ sel: form.plan_id === null }">
            <input type="radio" :value="null" v-model="form.plan_id" /> <b>Sijaamua bado</b>
          </label>
          <label v-for="p in plans" :key="p.id" class="ra-plan" :class="{ sel: form.plan_id === p.id }">
            <input type="radio" :value="p.id" v-model="form.plan_id" />
            <b> {{ p.name }}</b> <span class="ra-tag">{{ typeLabel(p.plan_type) }}</span>
            <div v-if="p.equipment_list" class="ra-m">{{ p.equipment_list }}</div>
            <div v-if="p.partner_name" class="ra-m">Partner: {{ p.partner_name }}</div>
            <div v-if="p.plan_type !== 'hq_supplied'" class="ra-m">Bei: TSh {{ p.total_price.toLocaleString() }}<span v-if="p.deposit > 0"> (awali TSh {{ p.deposit.toLocaleString() }})</span></div>
            <div v-if="p.plan_type === 'financed'" class="ra-m">
              Marejesho: {{ p.repayment_percent }}% ya sehemu yako ya kila vocha inayouzwa hadi deni la TSh {{ p.financed_amount.toLocaleString() }} liishe.
              Baada ya hapo vifaa ni vyako na unalipa {{ p.maintenance_percent }}% tu ya matengenezo ya mfumo.
            </div>
            <div v-if="p.plan_type === 'outright'" class="ra-m">Unalipa partner mwenyewe. Kisha unalipa {{ p.maintenance_percent }}% ya matengenezo ya mfumo.</div>
            <div v-if="p.plan_type === 'hq_supplied'" class="ra-m">HotBando anaweka vifaa na anapata asilimia ya kila vocha itakayokubaliwa na HQ.</div>
          </label>
          <label class="ra-l">Maelezo ya ziada<textarea v-model="form.notes" class="ra-i" rows="3"></textarea></label>
        </div>

        <p v-if="error" class="ra-err">{{ error }}</p>
        <div class="ra-row">
          <button v-if="step > 1" type="button" class="ra-btn2" @click="step--">Rudi</button>
          <button type="submit" class="ra-btn" :disabled="loading">{{ step < 3 ? 'Endelea' : (loading ? 'Inatuma...' : 'Tuma ombi') }}</button>
        </div>
      </form>
      <p class="ra-p ra-c">Una ombi tayari? <router-link to="/apply/status" class="ra-a">Angalia hali</router-link> &middot; <router-link to="/login" class="ra-a">Ingia</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: true })
const regions = ['Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza', 'Njombe', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga', 'Kaskazini Unguja', 'Kusini Unguja', 'Mjini Magharibi', 'Kaskazini Pemba', 'Kusini Pemba']
const businessTypes = ['Duka', 'Saluni / Kinyozi', 'Mgahawa / Baa', 'Ofisi', 'Kituo cha biashara', 'Nyumba ya kupangisha', 'Nyingine']
const typeLabel = (t) => ({ hq_supplied: 'HotBando anaweka vifaa', outright: 'Unanunua mwenyewe', financed: 'Mkopo wa vifaa' }[t] || t)

const step = ref(1)
const show = ref(false)
const loading = ref(false)
const error = ref('')
const done = ref(null)
const plans = ref([])
const form = ref({
  name: '', business_name: '', phone: '', email: '', password: '', confirm: '', website: '',
  region: '', district: '', ward: '', address: '', landmark: '', business_type: '', expected_customers: '',
  plan_id: null, notes: ''
})

onMounted(async () => {
  try { const r = await api.get('/reseller-applications/plans'); plans.value = (r.data && r.data.plans) || [] } catch (e) { /* plans are optional */ }
})

function onNext() {
  error.value = ''
  const f = form.value
  if (step.value === 1) {
    if (f.name.trim().length < 2) return (error.value = 'Andika jina lako kamili')
    if (!/^(\+?255|0)[67]\d{8}$/.test(f.phone.replace(/\s/g, ''))) return (error.value = 'Namba ya simu si sahihi (mfano 0712345678)')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return (error.value = 'Barua pepe si sahihi')
    if (f.password.length < 8) return (error.value = 'Nenosiri liwe na herufi 8 au zaidi')
    if (f.password !== f.confirm) return (error.value = 'Nenosiri hazifanani')
    step.value = 2
  } else if (step.value === 2) {
    if (!f.region) return (error.value = 'Chagua mkoa')
    if (!f.district.trim()) return (error.value = 'Andika wilaya')
    step.value = 3
  } else {
    submit()
  }
}

async function submit() {
  loading.value = true
  error.value = ''
  const f = form.value
  try {
    const r = await api.post('/reseller-applications', {
      name: f.name, business_name: f.business_name, phone: f.phone, email: f.email, password: f.password, website: f.website,
      region: f.region, district: f.district, ward: f.ward, address: f.address, landmark: f.landmark,
      business_type: f.business_type, expected_customers: f.expected_customers, plan_id: f.plan_id, notes: f.notes
    })
    done.value = r.data
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.error) || 'Imeshindikana kutuma ombi. Jaribu tena.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.ra-wrap { min-height: 100vh; background: #0a0a0f; display: flex; align-items: flex-start; justify-content: center; padding: 24px 12px; }
.ra-card { width: 100%; max-width: 640px; background: #111118; border: 1px solid #1e1e2a; border-radius: 18px; padding: 24px; color: #e5e7eb; position: relative; }
.ra-h1 { font-size: 1.4rem; font-weight: 700; color: #fff; margin-bottom: 4px; }
.ra-h2 { font-size: 1.15rem; font-weight: 700; color: #34d399; margin-bottom: 8px; }
.ra-p { color: #9ca3af; font-size: 0.88rem; margin: 6px 0 12px; }
.ra-c { text-align: center; margin-top: 16px; }
.ra-a { color: #FF7A30; }
.ra-steps { color: #FF7A30; font-size: 0.8rem; font-weight: 600; margin-bottom: 12px; }
.ra-grid { display: grid; gap: 12px; }
.ra-l { display: flex; flex-direction: column; gap: 4px; font-size: 0.82rem; color: #9ca3af; }
.ra-i { background: #0a0a0f; border: 1px solid #1e1e2a; color: #fff; border-radius: 10px; padding: 10px 12px; font-size: 0.9rem; width: 100%; }
.ra-i:focus { outline: none; border-color: #FF7A30; }
.ra-chk { font-size: 0.8rem; color: #9ca3af; display: flex; gap: 6px; align-items: center; }
.ra-hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
.ra-plan { display: block; border: 1px solid #1e1e2a; border-radius: 12px; padding: 12px; margin-bottom: 10px; cursor: pointer; background: #0a0a0f; }
.ra-plan.sel { border-color: #FF7A30; background: rgba(255, 122, 48, 0.06); }
.ra-tag { font-size: 0.7rem; background: #1a1a24; color: #FF7A30; border-radius: 999px; padding: 2px 8px; margin-left: 6px; }
.ra-m { font-size: 0.8rem; color: #9ca3af; margin-top: 4px; }
.ra-err { color: #f87171; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 10px; font-size: 0.85rem; margin: 10px 0; }
.ra-row { display: flex; gap: 10px; margin-top: 14px; }
.ra-btn { flex: 1; text-align: center; background: #FF7A30; color: #fff; border: 0; border-radius: 12px; padding: 11px 16px; font-weight: 600; cursor: pointer; display: inline-block; }
.ra-btn:disabled { opacity: 0.6; cursor: default; }
.ra-btn2 { background: #1e1e2a; color: #fff; border: 0; border-radius: 12px; padding: 11px 16px; cursor: pointer; }
.ra-ok { text-align: center; }
.ra-ref { font-size: 1.6rem; font-weight: 800; letter-spacing: 2px; color: #FF7A30; background: #0a0a0f; border-radius: 12px; padding: 12px; margin: 8px 0; }
</style>
