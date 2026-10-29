<template>
  <div class="ap-wrap">
    <h2 class="ap-h">Ombi langu na vifaa</h2>
    <p v-if="loading" class="ap-m">Inapakia...</p>
    <p v-else-if="error" class="ap-err">{{ error }}</p>
    <template v-else>
      <div v-if="!data.application" class="ap-box ap-m">Hakuna ombi lililounganishwa na akaunti hii.</div>
      <div v-else class="ap-box">
        <p class="ap-m">Namba ya ombi: <b>{{ data.application.application_ref }}</b></p>
        <p class="ap-status">{{ labels[data.application.status] || data.application.status }}</p>
        <p class="ap-m">Eneo: {{ [data.application.address, data.application.ward, data.application.district, data.application.region].filter(Boolean).join(', ') }}</p>
        <div v-if="data.application.install_date" class="ap-sched">
          <b>Ratiba ya ufungaji</b>
          <p>Tarehe: {{ data.application.install_date }} saa {{ data.application.install_time }}</p>
          <p>Fundi: {{ data.application.technician }}</p>
          <p v-if="data.application.install_notes">{{ data.application.install_notes }}</p>
        </div>
        <p v-else-if="['approved'].includes(data.application.status)" class="ap-m">Ombi limeidhinishwa. HQ atakupangia siku ya ufungaji hivi karibuni.</p>
        <p v-if="data.application.plan_name" class="ap-m">Mpango wa vifaa: <b>{{ data.application.plan_name }}</b></p>
        <p v-if="data.application.equipment_list" class="ap-m">{{ data.application.equipment_list }}</p>
      </div>

      <div v-if="data.financing" class="ap-box">
        <h3 class="ap-h3">Marejesho ya vifaa</h3>
        <p class="ap-m">Partner: {{ data.financing.partner_name || '-' }} &middot; Hali: <b>{{ data.financing.status }}</b></p>
        <div class="ap-bar"><div class="ap-fill" :style="{ width: progress + '%' }"></div></div>
        <p class="ap-m">Umelipa TSh {{ data.financing.repaid.toLocaleString() }} kati ya TSh {{ data.financing.principal.toLocaleString() }}. Deni lililobaki: <b>TSh {{ data.financing.balance.toLocaleString() }}</b></p>
        <p v-if="data.financing.status !== 'completed'" class="ap-m">Kila vocha inayouzwa, {{ data.financing.repayment_percent }}% ya sehemu yako inakatwa kulipa deni. Deni likiisha, vifaa ni vyako na unalipa {{ data.financing.maintenance_percent }}% tu ya matengenezo ya mfumo.</p>
        <p v-else class="ap-m">Deni limeisha. Vifaa ni vyako. Unalipa {{ data.financing.maintenance_percent }}% ya matengenezo ya mfumo.</p>
        <table v-if="data.repayments.length" class="ap-t">
          <thead><tr><th>Tarehe</th><th>Marejesho</th><th>Deni baada</th></tr></thead>
          <tbody><tr v-for="r in data.repayments" :key="r.order_reference"><td>{{ new Date(r.created_at).toLocaleDateString() }}</td><td>TSh {{ r.amount.toLocaleString() }}</td><td>TSh {{ r.balance_after.toLocaleString() }}</td></tr></tbody>
        </table>
      </div>

      <div v-if="data.routers.length" class="ap-box">
        <h3 class="ap-h3">Router zangu</h3>
        <p v-for="r in data.routers" :key="r.router_id" class="ap-m">{{ r.display_name }} ({{ r.router_id }}) &middot; HQ anabaki na {{ r.commission_percent }}%</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: true })
const labels = { new: 'Limepokelewa', reviewing: 'Linakaguliwa', approved: 'Limeidhinishwa', scheduled: 'Ufungaji umepangwa', installed: 'Vifaa vimefungwa', rejected: 'Halijakubaliwa' }
const loading = ref(true)
const error = ref('')
const data = ref({ application: null, financing: null, routers: [], repayments: [] })
const progress = computed(() => {
  const f = data.value.financing
  return f && f.principal > 0 ? Math.min(100, Math.round((f.repaid / f.principal) * 100)) : 0
})
onMounted(async () => {
  try {
    const r = await api.get('/reseller-portal/my-application')
    data.value = r.data
  } catch (e) {
    error.value = e.response && e.response.status === 401 ? 'Ingia kwanza ili kuona ombi lako.' : 'Imeshindikana kupakia taarifa.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.ap-wrap { max-width: 720px; margin: 0 auto; padding: 16px; color: #e5e7eb; }
.ap-h { font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 12px; }
.ap-h3 { font-weight: 600; color: #fff; margin-bottom: 8px; }
.ap-box { background: #111118; border: 1px solid #1e1e2a; border-radius: 14px; padding: 16px; margin-bottom: 14px; }
.ap-m { color: #9ca3af; font-size: 0.88rem; margin: 6px 0; }
.ap-err { color: #f87171; }
.ap-status { display: inline-block; background: #1a1a24; color: #FF7A30; border-radius: 999px; padding: 4px 12px; font-weight: 600; font-size: 0.85rem; margin: 6px 0; }
.ap-sched { background: #0a0a0f; border: 1px solid #1e1e2a; border-radius: 10px; padding: 12px; margin: 10px 0; font-size: 0.88rem; }
.ap-bar { height: 10px; background: #1e1e2a; border-radius: 999px; overflow: hidden; margin: 10px 0; }
.ap-fill { height: 100%; background: #FF7A30; }
.ap-t { width: 100%; font-size: 0.82rem; border-collapse: collapse; margin-top: 8px; }
.ap-t th { text-align: left; color: #6b7280; padding: 6px; border-bottom: 1px solid #1e1e2a; }
.ap-t td { padding: 6px; border-bottom: 1px solid #14141c; }
</style>
