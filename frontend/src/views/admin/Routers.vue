<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex gap-2">
        <button @click="tab = 'list'" class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="tab === 'list' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'">List</button>
        <button @click="tab = 'wireguard'" class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="tab === 'wireguard' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'">WireGuard</button>
      </div>
      <button @click="showForm = true; editing = null" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Add Router</button>
    </div>

    <div v-if="tab === 'list'">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="r in routers" :key="r.id" class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm hover:shadow-md transition">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="relative">
                <div class="w-3 h-3 rounded-full" :class="r.status === 'online' ? 'bg-green-500' : 'bg-red-500'"></div>
                <div v-if="r.status === 'online'" class="pulse-online absolute inset-0"></div>
              </div>
              <span class="font-semibold text-gray-800">{{ r.router_name || r.router_id }}</span>
            </div>
            <span class="text-xs text-gray-400">{{ r.router_id }}</span>
          </div>
          <div class="text-sm text-gray-500 space-y-1 mb-3">
            <p><i class="fas fa-server w-4 mr-1"></i> {{ r.host }}:{{ r.port }}</p>
            <p><i class="fas fa-wifi w-4 mr-1"></i> {{ r.ssid || '—' }}</p>
            <p><i class="fas fa-map-marker w-4 mr-1"></i> {{ r.location_name || 'No location' }}</p>
          </div>
          <div class="flex items-center justify-between pt-3 border-t border-gray-100">
            <span class="text-xs" :class="r.status === 'online' ? 'text-green-600' : 'text-red-600'">{{ r.active_users || 0 }} users</span>
            <div class="flex gap-2">
              <button @click="rebootRouter(r.router_id)" class="text-xs text-gray-500 hover:text-brand-500"><i class="fas fa-sync-alt"></i></button>
              <button @click="editRouter(r)" class="text-xs text-gray-500 hover:text-brand-500"><i class="fas fa-edit"></i></button>
              <button @click="deleteRouter(r.id)" class="text-xs text-gray-500 hover:text-red-500"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="tab === 'wireguard'" class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm space-y-4">
      <h3 class="section-title"><i class="fas fa-shield-alt section-icon text-brand-500"></i> WireGuard Configuration</h3>
      <div v-if="wgServer.serverInfo" class="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
        <p><span class="font-medium">Server IP:</span> {{ wgServer.serverInfo.publicIp }}</p>
        <p><span class="font-medium">Port:</span> {{ wgServer.serverInfo.port }}</p>
        <p><span class="font-medium">Network:</span> {{ wgServer.serverInfo.network }}</p>
      </div>
      <div class="flex gap-4 items-end">
        <div class="flex-1">
          <label class="input-label">Select Router</label>
          <select v-model="wgRouterId" class="input">
            <option value="">—</option>
            <option v-for="r in routers" :key="r.id" :value="r.router_id">{{ r.router_name || r.router_id }}</option>
          </select>
        </div>
        <button @click="generateWG" :disabled="!wgRouterId" class="btn btn-primary">Generate Config</button>
      </div>
      <div v-if="wgConfig" class="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">{{ wgConfig }}</div>
    </div>

    <div v-if="showForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showForm = false">
      <div class="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h3 class="text-lg font-bold text-gray-800 mb-4">{{ editing ? 'Edit Router' : 'Add Router' }}</h3>
        <form @submit.prevent="saveRouter" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="input-label">Router ID</label><input v-model="form.router_id" required class="input"></div>
            <div><label class="input-label">Name</label><input v-model="form.router_name" class="input"></div>
            <div><label class="input-label">Host/IP</label><input v-model="form.host" required class="input"></div>
            <div><label class="input-label">Port</label><input v-model="form.port" type="number" class="input" placeholder="8728"></div>
            <div><label class="input-label">Username</label><input v-model="form.user" class="input"></div>
            <div><label class="input-label">Password</label><input v-model="form.password" type="password" class="input"></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="input-label">SSID</label><input v-model="form.ssid" class="input"></div>
            <div><label class="input-label">Location</label>
              <select v-model="form.location_id" class="input">
                <option :value="null">—</option>
                <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="showForm = false" class="btn btn-ghost">Cancel</button>
            <button type="submit" class="btn btn-primary">{{ editing ? 'Save' : 'Add' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api/client'

const tab = ref('list')
const routers = ref([])
const locations = ref([])
const showForm = ref(false)
const editing = ref(null)
const wgRouterId = ref('')
const wgConfig = ref('')
const wgServer = ref({})
const form = ref({ router_id: '', router_name: '', host: '', port: 8728, user: 'admin', password: '', ssid: '', location_id: null })

onMounted(async () => {
  await loadRouters(); await loadLocations()
  try { wgServer.value = await api.get('/routers/wireguard/server-config').then(r => r.data) } catch {}
})

async function loadRouters() { try { const r = await api.get('/routers/'); routers.value = r.data.routers || [] } catch {} }
async function loadLocations() { try { const r = await api.get('/locations/'); locations.value = r.data.data || [] } catch {} }
async function saveRouter() {
  try { if (editing.value) { await api.put('/routers/' + editing.value.id, form.value) } else { await api.post('/routers/', form.value) }; showForm.value = false; editing.value = null; await loadRouters() }
  catch (e) { console.error(e) }
}
function editRouter(r) { form.value = { router_id: r.router_id, router_name: r.router_name, host: r.host, port: r.port || 8728, user: r.user, password: '', ssid: r.ssid, location_id: r.location_id }; editing.value = r; showForm.value = true }
async function deleteRouter(id) { if (!confirm('Are you sure?')) return; try { await api.delete('/routers/' + id); await loadRouters() } catch {} }
async function rebootRouter(routerId) { if (!confirm('Reboot router?')) return; try { await api.post('/routers/' + routerId + '/reboot'); alert('Router rebooting...') } catch {} }
async function generateWG() { try { const r = await api.post('/routers/wireguard/generate/' + wgRouterId.value); wgConfig.value = r.data.config || r.data.commands || JSON.stringify(r.data, null, 2) } catch (e) { console.error(e) } }
</script>
