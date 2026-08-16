<template>
  <div class="space-y-4">
    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
      <h3 class="section-title mb-4"><i class="fas fa-cog section-icon text-brand-500"></i> System Settings</h3>
      <div class="space-y-3">
        <div v-for="s in settings" :key="s.id" class="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <p class="text-sm font-medium text-gray-700">{{ s.setting_key }}</p>
            <p class="text-xs text-gray-400">{{ s.setting_value }}</p>
          </div>
          <button @click="editSetting(s)" class="text-brand-500 text-sm hover:underline">Edit</button>
        </div>
      </div>
    </div>

    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-brand-100">
        <h3 class="section-title"><i class="fas fa-box section-icon text-brand-500"></i> Packages</h3>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Name</th><th>Duration</th><th>Price (TZS)</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="p in packages" :key="p.id">
              <td class="font-medium text-gray-800">{{ p.name }}</td>
              <td>{{ p.duration_hours }}h</td>
              <td>{{ p.price }}</td>
              <td><span class="badge" :class="p.is_active ? 'badge-success' : 'badge-danger'">{{ p.is_active ? 'Active' : 'Inactive' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
      <h3 class="section-title mb-4"><i class="fas fa-credit-card section-icon text-brand-500"></i> PesaPal Integration</h3>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="input-label">Consumer Key</label><input v-model="pesapal.consumer_key" class="input"></div>
        <div><label class="input-label">Consumer Secret</label><input v-model="pesapal.consumer_secret" type="password" class="input"></div>
        <div><label class="input-label">Environment</label>
          <select v-model="pesapal.env" class="input">
            <option value="live">Live</option>
            <option value="sandbox">Sandbox</option>
          </select>
        </div>
        <div><label class="input-label">Callback URL</label><input v-model="pesapal.callback_url" class="input" placeholder="https://yourdomain.com/api/wallet/payment/callback"></div>
      </div>
      <button @click="savePesapal" class="btn btn-primary mt-4">Save PesaPal Settings</button>
    </div>

    <div v-if="editModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="editModal = false">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 class="text-lg font-bold text-gray-800 mb-4">Edit {{ editingKey }}</h3>
        <input v-model="editValue" class="input mb-4">
        <div class="flex justify-end gap-3">
          <button @click="editModal = false" class="btn btn-ghost">Cancel</button>
          <button @click="saveSetting" class="btn btn-primary">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminGet, adminPut } from '../../api/client'

const settings = ref([])
const packages = ref([])
const editModal = ref(false)
const editingKey = ref('')
const editValue = ref('')
const editId = ref(null)
const pesapal = ref({ consumer_key: '', consumer_secret: '', env: 'sandbox', callback_url: '' })

onMounted(async () => {
  try { const s = await adminGet('/system-settings'); settings.value = s.data || []; const p = await adminGet('/packages'); packages.value = p.data || [] }
  catch (e) { console.error(e) }
})

function editSetting(s) { editingKey.value = s.setting_key; editValue.value = s.setting_value; editId.value = s.id; editModal.value = true }
async function saveSetting() { try { await adminPut('/system-settings', { id: editId.value, setting_value: editValue.value }); editModal.value = false; const s = await adminGet('/system-settings'); settings.value = s.data || [] } catch (e) { console.error(e) } }
async function savePesapal() {
  try {
    await adminPut('/system-settings', { setting_key: 'pesapal_consumer_key', setting_value: pesapal.value.consumer_key })
    await adminPut('/system-settings', { setting_key: 'pesapal_consumer_secret', setting_value: pesapal.value.consumer_secret })
    await adminPut('/system-settings', { setting_key: 'pesapal_env', setting_value: pesapal.value.env })
    await adminPut('/system-settings', { setting_key: 'pesapal_callback_url', setting_value: pesapal.value.callback_url })
    alert('PesaPal settings saved!')
  } catch (e) { console.error(e) }
}
</script>
