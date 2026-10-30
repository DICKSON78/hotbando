<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style="background: #0a0a0f">
    <div class="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.07]">
        <defs>
          <pattern id="honeycomb-pr" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
            <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
            <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#honeycomb-pr)"/>
      </svg>
      <svg width="100%" height="100%" viewBox="0 0 400 400" class="absolute inset-0" preserveAspectRatio="none">
        <path d="M0 300 Q 50 280 100 320 T 200 300 T 300 340 T 400 310 L 400 400 L 0 400Z" fill="rgba(255,122,48,0.04)"/>
        <circle cx="50" cy="50" r="8" fill="rgba(255,122,48,0.06)"/>
        <circle cx="350" cy="80" r="12" fill="rgba(255,122,48,0.05)"/>
        <circle cx="180" cy="120" r="6" fill="rgba(255,122,48,0.07)"/>
        <circle cx="80" cy="240" r="10" fill="rgba(255,122,48,0.05)"/>
      </svg>
    </div>

    <div class="rounded-2xl shadow-2xl p-8 w-full max-w-md relative" style="background: #111118; border: 1px solid #1e1e2a">
      <div class="text-center mb-6">
        <img src="/logo.png" class="h-16 mx-auto mb-4" alt="HotBando">
        <h1 class="text-xl font-bold text-white mb-2">Omba kuwa Reseller</h1>
        <p class="text-white/50 text-sm">HQ atakagua ombi lako, kisha utapangiwa siku ya kufungiwa vifaa</p>
      </div>

      <!-- Step Indicator -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center flex-1">
          <div :class="step >= 1 ? 'bg-[#FF7A30] text-white' : 'bg-[#1e1e2a] text-white/40'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors">
            1
          </div>
          <div :class="step >= 2 ? 'bg-[#FF7A30]' : 'bg-[#1e1e2a]'" class="flex-1 h-0.5 mx-2 transition-colors"></div>
        </div>
        <div class="flex items-center flex-1">
          <div :class="step >= 2 ? 'bg-[#FF7A30] text-white' : 'bg-[#1e1e2a] text-white/40'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors">
            2
          </div>
          <div :class="step >= 3 ? 'bg-[#FF7A30]' : 'bg-[#1e1e2a]'" class="flex-1 h-0.5 mx-2 transition-colors"></div>
        </div>
        <div :class="step >= 3 ? 'bg-[#FF7A30] text-white' : 'bg-[#1e1e2a] text-white/40'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors">
          3
        </div>
      </div>
      <div class="flex justify-between text-xs text-white/50 mb-6 -mt-4">
        <span class="w-8 text-center">Wewe</span>
        <span class="w-8 text-center">Eneo</span>
        <span class="w-8 text-center">Usalama</span>
      </div>

      <form @submit.prevent="onNext" class="space-y-4">
        <input v-model="form.website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" />

        <div v-if="done" class="space-y-4 text-center">
          <p class="text-green-400 text-sm bg-green-500/10 p-3 rounded-lg">Ombi limepokelewa. HQ atakagua na kuwasiliana nawe.</p>
          <p class="text-sm text-white/60">Namba ya ombi lako:</p>
          <div class="text-2xl font-bold tracking-widest text-[#FF7A30] bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl py-3">{{ done.reference }}</div>
          <p class="text-xs text-white/40">Ihifadhi. Utaihitaji pamoja na namba yako ya simu kuangalia hali ya ombi.</p>
          <router-link to="/apply/status" class="block w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-[#FF7A30]/20">Angalia hali ya ombi</router-link>
        </div>

        <template v-else>
          <!-- Hatua 1: Wewe -->
          <div v-if="step === 1" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Jina kamili <span class="text-red-400">*</span></label>
              <input v-model="form.name" type="text" autocomplete="name" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Jina la biashara</label>
              <input v-model="form.business_name" type="text" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Namba ya simu <span class="text-red-400">*</span></label>
              <input v-model="form.phone" type="tel" placeholder="0712345678" autocomplete="tel" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Barua pepe <span class="text-red-400">*</span></label>
              <input v-model="form.email" type="email" autocomplete="email" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" />
            </div>
          </div>

          <!-- Hatua 2: Eneo na vifaa -->
          <div v-if="step === 2" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Mkoa <span class="text-red-400">*</span></label>
              <select v-model="form.region" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors">
                <option value="">Chagua mkoa</option>
                <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Wilaya <span class="text-red-400">*</span></label>
              <input v-model="form.district" type="text" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Kata</label>
              <input v-model="form.ward" type="text" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Mtaa / anwani</label>
              <input v-model="form.address" type="text" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Alama ya karibu (kituo, shule, soko)</label>
              <input v-model="form.landmark" type="text" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Aina ya biashara</label>
              <select v-model="form.business_type" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors">
                <option value="">Chagua</option>
                <option v-for="t in businessTypes" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Wateja unaotarajia kwa siku</label>
              <input v-model="form.expected_customers" type="number" min="0" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Jinsi ya kupata vifaa</label>
              <div class="space-y-2">
                <label class="block border rounded-xl p-3 cursor-pointer" :class="form.plan_id === null ? 'border-[#FF7A30] bg-[#FF7A30]/5' : 'border-[#1e1e2a] bg-[#0a0a0f]'">
                  <input type="radio" :value="null" v-model="form.plan_id" class="mr-2" />
                  <span class="text-sm font-semibold text-white">Sijaamua bado</span>
                </label>
                <label v-for="p in plans" :key="p.id" class="block border rounded-xl p-3 cursor-pointer" :class="form.plan_id === p.id ? 'border-[#FF7A30] bg-[#FF7A30]/5' : 'border-[#1e1e2a] bg-[#0a0a0f]'">
                  <input type="radio" :value="p.id" v-model="form.plan_id" class="mr-2" />
                  <span class="text-sm font-semibold text-white">{{ p.name }}</span>
                  <span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#1e1e2a] text-[#FF7A30]">{{ typeLabel(p.plan_type) }}</span>
                  <p v-if="p.equipment_list" class="text-xs text-white/50 mt-1">{{ p.equipment_list }}</p>
                  <p v-if="p.partner_name" class="text-xs text-white/50 mt-1">Partner: {{ p.partner_name }}</p>
                  <p v-if="p.plan_type !== 'hq_supplied'" class="text-xs text-white/50 mt-1">Bei: TSh {{ p.total_price.toLocaleString() }}<span v-if="p.deposit > 0"> (awali TSh {{ p.deposit.toLocaleString() }})</span></p>
                  <p v-if="p.plan_type === 'financed'" class="text-xs text-white/50 mt-1">Marejesho: {{ p.repayment_percent }}% ya sehemu yako ya kila vocha hadi deni la TSh {{ p.financed_amount.toLocaleString() }} liishe. Kisha vifaa ni vyako na unalipa {{ p.maintenance_percent }}% tu ya matengenezo ya mfumo.</p>
                  <p v-if="p.plan_type === 'outright'" class="text-xs text-white/50 mt-1">Unalipa partner mwenyewe. Kisha unalipa {{ p.maintenance_percent }}% ya matengenezo ya mfumo.</p>
                  <p v-if="p.plan_type === 'hq_supplied'" class="text-xs text-white/50 mt-1">HotBando anaweka vifaa na anapata asilimia ya kila vocha, kama HQ atakavyokubaliana nawe.</p>
                </label>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Maelezo ya ziada</label>
              <textarea v-model="form.notes" rows="3" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors"></textarea>
            </div>
          </div>

          <!-- Hatua 3: Usalama -->
          <div v-if="step === 3" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Nenosiri <span class="text-red-400">*</span></label>
              <div class="relative">
                <input v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 pr-10 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" />
                <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                </button>
              </div>
              <p class="text-xs text-white/40 mt-1">Herufi 8 au zaidi</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Rudia nenosiri <span class="text-red-400">*</span></label>
              <div class="relative">
                <input v-model="form.confirm" :type="showConfirmPassword ? 'text' : 'password'" autocomplete="new-password" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 pr-10 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" />
                <button type="button" @click="showConfirmPassword = !showConfirmPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  <i :class="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                </button>
              </div>
            </div>
          </div>

          <p v-if="error" class="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{{ error }}</p>

          <div class="flex gap-3">
            <button v-if="step > 1" type="button" @click="step--" class="flex-1 bg-[#1e1e2a] hover:bg-[#2a2a3a] text-white font-semibold py-2.5 rounded-xl transition-all">Rudi</button>
            <button type="submit" :disabled="loading" class="flex-1 bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-[#FF7A30]/20 disabled:opacity-50">
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <span v-if="step < 3">Endelea</span>
              <span v-else>{{ loading ? 'Inatuma...' : 'Tuma ombi' }}</span>
            </button>
          </div>
          <p class="text-center text-xs text-white/50">Una ombi tayari? <router-link to="/apply/status" class="text-[#FF7A30] hover:underline">Angalia hali</router-link></p>
        </template>
      </form>

      <p class="text-center text-sm text-white/50 mt-6">
        Already have an account? <router-link to="/login" class="text-[#FF7A30] hover:underline">Sign in</router-link>
      </p>
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
const loading = ref(false)
const error = ref('')
const done = ref(null)
const plans = ref([])
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const form = ref({
  name: '', business_name: '', phone: '', email: '', password: '', confirm: '', website: '',
  region: '', district: '', ward: '', address: '', landmark: '', business_type: '', expected_customers: '',
  plan_id: null, notes: ''
})

onMounted(async () => {
  try {
    const r = await api.get('/reseller-applications/plans')
    plans.value = (r.data && r.data.plans) || []
  } catch (e) { /* mipango ni hiari */ }
})

function onNext() {
  error.value = ''
  const f = form.value
  if (step.value === 1) {
    if (f.name.trim().length < 2) { error.value = 'Andika jina lako kamili'; return }
    if (!/^(\+?255|0)[67]\d{8}$/.test(f.phone.replace(/\s/g, ''))) { error.value = 'Namba ya simu si sahihi (mfano 0712345678)'; return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { error.value = 'Barua pepe si sahihi'; return }
    step.value = 2
  } else if (step.value === 2) {
    if (!f.region) { error.value = 'Chagua mkoa'; return }
    if (!f.district.trim()) { error.value = 'Andika wilaya'; return }
    step.value = 3
  } else {
    if (f.password.length < 8) { error.value = 'Nenosiri liwe na herufi 8 au zaidi'; return }
    if (f.password !== f.confirm) { error.value = 'Nenosiri hazifanani'; return }
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
