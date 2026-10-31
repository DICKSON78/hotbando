<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Router Fleet — Remote</h2>
        <p class="text-sm" style="color: #6b7280">
          Auto-detection na usimamizi wa routers kutoka cloud. Collector (virtual computer) inayopatikana
          karibu na router inasimama tunnel cloud, hivyo sijalazimu kuwa na inbound ports kwenye router.
        </p>
      </div>
      <div class="flex gap-2">
        <button @click="refresh()" class="btn btn-secondary btn-sm"><i class="fas fa-sync-alt mr-1"></i>Segesha</button>
        <button @click="openNewRouter()" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i>Router Jipya</button>
      </div>
    </div>

    <!-- Collectors (virtual computers) -->
    <div class="section-card rounded-2xl border border-[#1e1e2a] overflow-hidden">
      <div class="p-4 border-b border-[#1e1e2a]">
        <h3 class="font-medium text-white"><i class="fas fa-desktop mr-2 text-[#FF7A30]"></i>Collectors (Virtual Computers)</h3>
        <p class="text-xs text-white/50 mt-1">
          Containers inayopatikana kwenye mtandao wa client. Inayopatikana = tunnel ipo na cloud.
        </p>
      </div>
      <div class="p-4">
        <div v-if="collectors.length === 0" class="text-center py-10" style="color: #6b7280">
          <i class="fas fa-desktop-slash text-4xl mb-3 opacity-30"></i>
          <p>Hakuna collector inayopatikana sasa.</p>
          <p class="text-xs mt-2">Deploy container <code>hotbando-collector</code> kwenye mtandao wa router na ulinganishe na cloud.</p>
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-[#1e1e2a]">
              <th class="py-3 px-4 text-left text-xs text-white/60">Collector</th>
              <th class="py-3 px-4 text-left text-xs text-white/60">Key</th>
              <th class="py-3 px-4 text-left text-xs text-white/60">Hali</th>
              <th class="py-3 px-4 text-right text-xs text-white/60">Routers zilizoitambulishwa</th>
              <th class="py-3 px-4 text-center text-xs text-white/60">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in collectors" :key="c.key" class="border-b border-[#1e1e2a]/50">
              <td class="py-3 px-4 text-white">{{ c.name || c.key }}</td>
              <td class="py-3 px-4 text-xs text-white/40 truncate max-w-xs">{{ c.key }}</td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full" :class="c.connected ? 'bg-green-500' : 'bg-red-500'"></span>
                  <span class="text-xs" :style="c.connected ? 'color:#34d399' : 'color:#f87171'">
                    {{ c.connected ? 'Inaonekana' : 'Imeshambaa' }}
                  </span>
                </span>
              </td>
              <td class="py-3 px-4 text-right text-xs text-white/60">{{ c.routerCount || '-' }}</td>
              <td class="py-3 px-4 text-center">
                <button v-if="c.connected" @click="detect(c.key)" class="text-xs px-2 py-1 rounded bg-[#FF7A30]/10 text-[#FF7A30]" title="Auto-detect"><i class="fas fa-search mr-1"></i>Detect</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Registered routers -->
    <div class="section-card rounded-2xl border border-[#1e1e2a] overflow-hidden">
      <div class="p-4 border-b border-[#1e1e2a]">
        <h3 class="font-medium text-white"><i class="fas fa-router mr-2 text-[#FF7A30]"></i>Routers zilijadilishwa</h3>
      </div>
      <div class="p-4">
        <div v-if="routers.length === 0" class="text-center py-10" style="color: #6b7280">
          <p>Hakuna routers zilijadilishwa.</p>
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-[#1e1e2a]">
              <th class="py-3 px-4 text-left text-xs text-white/60">Jina</th>
              <th class="py-3 px-4 text-left text-xs text-white/60">Host</th>
              <th class="py-3 px-4 text-left text-xs text-white/60">Status</th>
              <th class="py-3 px-4 text-left text-xs text-white/60">Setup</th>
              <th class="py-3 px-4 text-center text-xs text-white/60">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in routers" :key="r.router_id || r.id" class="border-b border-[#1e1e2a]/50">
              <td class="py-3 px-4 text-white">{{ r.router_name || r.name }}</td>
              <td class="py-3 px-4 text-xs text-white/40">{{ r.host }}:{{ r.port || 8728 }}</td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full" :class="statusColor(r.status)"></span>
                  <span class="text-xs">{{ r.status }}</span>
                </span>
              </td>
              <td class="py-3 px-4 text-xs text-white/60">{{ r.setup_status || '-' }}</td>
              <td class="py-3 px-4 text-center">
                <button @click="pingRouter(r)" class="text-xs px-2 py-1 rounded bg-[#FF7A30]/10 text-[#FF7A30]" title="Ping via collector"><i class="fas fa-ping mr-1"></i>Ping</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Manual MikroTik command (test tunnel) -->
    <div class="section-card rounded-2xl border border-[#1e1e2a] overflow-hidden">
      <div class="p-4 border-b border-[#1e1e2a]">
        <h3 class="font-medium text-white"><i class="fas fa-terminal mr-2 text-[#FF7A30]"></i>Jaribu MikroTik Command (Test Tunnel)</h3>
      </div>
      <div class="p-4 space-y-3">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs text-white/60 mb-1">Collector Key</label>
            <input v-model="cmd.collectorKey" placeholder="collector key" class="input w-full">
          </div>
          <div>
            <label class="block text-xs text-white/60 mb-1">Path</label>
            <input v-model="cmd.path" value="/system/identity/print" class="input w-full">
          </div>
          <div class="col-span-2">
            <label class="block text-xs text-white/60 mb-1">Args (JSON)</label>
            <input v-model="cmd.args" value="{}" class="input w-full">
          </div>
        </div>
        <button @click="runMikrotik" class="btn btn-primary"><i class="fas fa-play mr-1"></i>Tuma Command</button>
        <div v-if="cmdResult" class="p-3 rounded-lg text-xs" :class="cmdResult.ok ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'">
          <pre>{{ JSON.stringify(cmdResult, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <div v-if="toast.show" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const collectors = ref([])
const routers = ref([])
const cmdResult = ref(null)
const toast = ref({ show: false, message: '', type: 'success' })
const cmd = ref({ collectorKey: '', path: '/system/identity/print', args: {} })
const loading = ref(false)

function showToast(msg, type = 'success') { toast.value = { show: true, message: msg, type }; setTimeout(() => toast.value.show = false, 3000) }
function statusColor(s) { return { online: 'bg-green-500', offline: 'bg-red-500', configuring: 'bg-yellow-500', pending: 'bg-yellow-500' }[s] || 'bg-gray-600' }

async function refresh() {
  loading.value = true
  try {
    const [c, r] = await Promise.allSettled([
      adminGet('/router-fleet/collectors'),
      adminGet('/router-fleet/routers')
    ])
    if (c.status === 'fulfilled') collectors.value = c.value.collectors || []
    if (r.status === 'fulfilled') routers.value = r.value.routers || []
  } catch (e) { showToast('Segesha kushindikana: ' + e.message, 'error') }
  loading.value = false
}

async function detect(collectorKey) {
  loading.value = true
  try {
    await adminPost('/router-fleet/detect', { collectorKey })
    showToast('Auto-detection imetokezwa')
    setTimeout(refresh, 3000)
  } catch (e) { showToast('Kushindikana: ' + (e.response?.data?.message || e.message), 'error') }
  loading.value = false
}

async function runMikrotik() {
  loading.value = true
  try {
    let args = {}
    try { args = JSON.parse(cmd.value.args || '{}') } catch { args = {} }
    const r = await adminPost('/router-fleet/mikrotik', {
      collectorKey: cmd.value.collectorKey,
      path: cmd.value.path,
      args
    })
    cmdResult.value = r
    showToast(r.success ? 'Command imetumwa' : 'Command kushindikana: ' + (r.error || ''), r.success ? 'success' : 'error')
  } catch (e) { showToast('Kushindikana: ' + e.message, 'error') }
  loading.value = false
}

async function pingRouter(r) {
  // Find a connected collector and ping the router's /system/identity/print
  const c = collectors.value.find(x => x.connected)
  if (!c) { showToast('Hakuna collector inayopatikana', 'error'); return }
  const res = await adminPost('/router-fleet/mikrotik', {
    collectorKey: c.key,
    path: '/system/identity/print',
    args: {}
  })
  showToast(res.success ? `Ping OK: ${JSON.stringify(res.data)}` : `Ping kushindikana: ${res.error}`, res.success ? 'success' : 'error')
}

function openNewRouter() {
  // Navigate to existing routers create flow
  const router = useRouter()
  router.push('/admin/routers')
}

onMounted(refresh)
</script>
