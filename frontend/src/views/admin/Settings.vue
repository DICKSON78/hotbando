<template>
  <div class="space-y-4">
    <!-- System Settings -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-cog" style="color: #FF7A30"></i> System Settings</h3>
      </div>
      <div class="section-body">
        <div class="space-y-1">
          <div v-for="s in settings" :key="s.id" class="flex items-center justify-between py-2.5" style="border-bottom: 1px solid rgba(30,30,42,0.5)">
            <div>
              <p class="text-sm font-medium text-white">{{ s.setting_key }}</p>
              <p class="text-xs" style="color: #6b7280">{{ s.setting_value }}</p>
            </div>
            <button @click="editSetting(s)" class="text-sm transition-colors" style="color: #FF7A30"><i class="fas fa-pen text-xs mr-1"></i>Edit</button>
          </div>
          <p v-if="!settings.length" class="text-center py-6 text-sm" style="color: #6b7280">No settings configured.</p>
        </div>
      </div>
    </div>

    <!-- Packages -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-box" style="color: #FF7A30"></i> Packages</h3>
      </div>
      <div class="section-body">
        <table class="re-table">
          <thead>
            <tr><th>Name</th><th>Duration</th><th>Price (TSh)</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="p in packages" :key="p.id">
              <td class="font-medium text-white">{{ p.name }}</td>
              <td>{{ p.duration_hours }}h</td>
              <td v-if="editingPkg && editingPkg.id === p.id">
                <div class="flex gap-2 items-center">
                  <input v-model.number="editingPkg.price" type="number" class="input w-24 text-sm" />
                  <input v-model.number="editingPkg.duration_hours" type="number" class="input w-20 text-sm" />
                  <button @click="savePackage" class="btn btn-primary btn-xs"><i class="fas fa-check"></i></button>
                  <button @click="editingPkg = null" class="btn btn-ghost btn-xs"><i class="fas fa-times"></i></button>
                </div>
              </td>
              <td v-else>TSh {{ Number(p.price).toLocaleString() }}</td>
              <td>
                <span class="badge" :class="p.is_active ? 'badge-green' : 'badge-red'">{{ p.is_active ? 'Active' : 'Inactive' }}</span>
              </td>
              <td v-if="!editingPkg || editingPkg.id !== p.id">
                <button @click="startEditPackage(p)" class="btn btn-ghost btn-xs" title="Edit price/duration"><i class="fas fa-pen"></i></button>
              </td>
            </tr>
            <tr v-if="!packages.length"><td colspan="5" class="text-center py-6 text-sm" style="color: #6b7280">No packages configured.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PesaPal Integration -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-credit-card" style="color: #FF7A30"></i> PesaPal Integration</h3>
      </div>
      <div class="section-body">
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
        <button @click="savePesapal" :disabled="savingPesaPal" class="btn btn-primary mt-4">
          <i v-if="savingPesaPal" class="fas fa-spinner fa-spin mr-1"></i>
          {{ savingPesaPal ? 'Saving...' : 'Save PesaPal Settings' }}
        </button>
      </div>
    </div>

    <!-- Edit Setting Modal -->
    <div v-if="editModal" class="fixed inset-0 flex items-center justify-center z-50 p-4" style="background: rgba(0,0,0,0.6)" @click.self="editModal = false">
      <div class="section-card w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-white mb-4">Edit {{ editingKey }}</h3>
        <input v-model="editValue" class="input mb-4">
        <div class="flex justify-end gap-3">
          <button @click="editModal = false" class="btn btn-ghost">Cancel</button>
          <button @click="saveSetting" class="btn btn-primary">Save</button>
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
import { ref, onMounted } from 'vue'
import { adminGet, adminPut } from '../../api/client'

const settings = ref([])
const packages = ref([])
const editModal = ref(false)
const editingKey = ref('')
const editValue = ref('')
const editId = ref(null)
const editingPkg = ref(null)
const savingPesaPal = ref(false)
const toast = ref(null)
const pesapal = ref({ consumer_key: '', consumer_secret: '', env: 'sandbox', callback_url: '' })

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

onMounted(async () => {
  try {
    const [s, p] = await Promise.all([adminGet('/system-settings'), adminGet('/packages')])
    settings.value = s.data || []
    packages.value = p.data || []

    const keys = { pesapal_consumer_key: 'consumer_key', pesapal_consumer_secret: 'consumer_secret', pesapal_env: 'env', pesapal_callback_url: 'callback_url' }
    const sMap = {}
    settings.value.forEach(s => { sMap[s.setting_key] = s.setting_value })
    Object.entries(keys).forEach(([k, f]) => { if (sMap[k] !== undefined) pesapal.value[f] = sMap[k] })
  } catch (e) { console.error(e) }
})

function editSetting(s) {
  editingKey.value = s.setting_key
  editValue.value = s.setting_value
  editId.value = s.id
  editModal.value = true
}

async function saveSetting() {
  try {
    await adminPut('/system-settings', { id: editId.value, setting_value: editValue.value })
    editModal.value = false
    showToast('Setting saved')
    const s = await adminGet('/system-settings')
    settings.value = s.data || []
  } catch (e) {
    showToast('Failed to save setting', 'error')
  }
}

async function savePesapal() {
  savingPesaPal.value = true
  try {
    await adminPut('/system-settings', {
      settings: [
        { setting_key: 'pesapal_consumer_key', setting_value: pesapal.value.consumer_key },
        { setting_key: 'pesapal_consumer_secret', setting_value: pesapal.value.consumer_secret },
        { setting_key: 'pesapal_env', setting_value: pesapal.value.env },
        { setting_key: 'pesapal_callback_url', setting_value: pesapal.value.callback_url }
      ]
    })
    showToast('PesaPal settings saved!')
  } catch (e) {
    showToast('Failed to save PesaPal settings', 'error')
  } finally {
    savingPesaPal.value = false
  }
}

function startEditPackage(p) {
  editingPkg.value = { id: p.id, price: p.price, duration_hours: p.duration_hours }
}

async function savePackage() {
  try {
    await adminPut('/packages/' + editingPkg.value.id, { price: editingPkg.value.price, duration_hours: editingPkg.value.duration_hours })
    showToast('Package updated')
    editingPkg.value = null
    const p = await adminGet('/packages')
    packages.value = p.data || []
  } catch (e) {
    showToast('Failed to update package', 'error')
  }
}
</script>
