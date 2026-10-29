<template>
  <div class="st-wrap">
    <div class="st-card">
      <h1 class="st-h1">Hali ya ombi lako</h1>
      <form @submit.prevent="check" class="st-form">
        <input v-model="reference" class="st-i" placeholder="Namba ya ombi (mfano RA1A2B3C4D)" autocapitalize="characters" />
        <input v-model="phone" class="st-i" type="tel" placeholder="Namba ya simu uliyotumia" />
        <button class="st-btn" :disabled="loading">{{ loading ? 'Inatafuta...' : 'Angalia' }}</button>
      </form>
      <p v-if="error" class="st-err">{{ error }}</p>

      <div v-if="info" class="st-res">
        <p class="st-name">{{ info.name }} <span class="st-ref">{{ info.reference }}</span></p>
        <p class="st-status" :class="'s-' + info.status">{{ info.status_label }}</p>
        <p v-if="info.status === 'rejected' && info.rejection_reason" class="st-m">Sababu: {{ info.rejection_reason }}</p>
        <p class="st-m">Eneo: {{ info.district }}, {{ info.region }}</p>
        <p v-if="info.plan_name" class="st-m">Mpango wa vifaa: {{ info.plan_name }}</p>
        <div v-if="info.schedule" class="st-box">
          <b>Ratiba ya ufungaji</b>
          <p>Tarehe: {{ info.schedule.date }} saa {{ info.schedule.time }}</p>
          <p>Fundi: {{ info.schedule.technician }}</p>
          <p v-if="info.schedule.notes">{{ info.schedule.notes }}</p>
        </div>
        <p v-if="info.can_login" class="st-m">Akaunti yako iko tayari. <router-link to="/login" class="st-a">Ingia</router-link> kwa barua pepe na nenosiri ulilochagua, kisha fungua ukurasa wa "Application".</p>
      </div>
      <p class="st-m st-c"><router-link to="/apply/reseller" class="st-a">Tuma ombi jipya</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: true })
const reference = ref('')
const phone = ref('')
const loading = ref(false)
const error = ref('')
const info = ref(null)

async function check() {
  error.value = ''
  info.value = null
  if (!reference.value.trim() || !phone.value.trim()) { error.value = 'Andika namba ya ombi na simu'; return }
  loading.value = true
  try {
    const r = await api.post('/reseller-applications/status', { reference: reference.value.trim(), phone: phone.value.trim() })
    info.value = r.data
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.error) || 'Imeshindikana kuangalia hali'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.st-wrap { min-height: 100vh; background: #0a0a0f; display: flex; justify-content: center; padding: 24px 12px; }
.st-card { width: 100%; max-width: 520px; background: #111118; border: 1px solid #1e1e2a; border-radius: 18px; padding: 24px; color: #e5e7eb; height: fit-content; }
.st-h1 { font-size: 1.3rem; font-weight: 700; color: #fff; margin-bottom: 12px; }
.st-form { display: grid; gap: 10px; }
.st-i { background: #0a0a0f; border: 1px solid #1e1e2a; color: #fff; border-radius: 10px; padding: 10px 12px; }
.st-btn { background: #FF7A30; color: #fff; border: 0; border-radius: 12px; padding: 11px; font-weight: 600; cursor: pointer; }
.st-err { color: #f87171; margin-top: 10px; font-size: 0.85rem; }
.st-res { margin-top: 16px; border-top: 1px solid #1e1e2a; padding-top: 14px; }
.st-name { font-weight: 600; color: #fff; }
.st-ref { color: #6b7280; font-size: 0.8rem; margin-left: 6px; }
.st-status { display: inline-block; margin: 8px 0; padding: 4px 12px; border-radius: 999px; background: #1a1a24; color: #FF7A30; font-weight: 600; font-size: 0.85rem; }
.s-approved, .s-installed { color: #34d399; }
.s-rejected { color: #f87171; }
.st-m { color: #9ca3af; font-size: 0.85rem; margin: 6px 0; }
.st-c { text-align: center; margin-top: 16px; }
.st-box { background: #0a0a0f; border: 1px solid #1e1e2a; border-radius: 12px; padding: 12px; margin: 10px 0; font-size: 0.85rem; }
.st-a { color: #FF7A30; }
</style>
