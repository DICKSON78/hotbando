<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Router Fleet — Remote Management</h2>
        <p class="text-sm" style="color: #6b7280">
          Auto-detection na usimamizi wa routers kutoka cloud. Collector (virtual computer) inayopatikana
          karibu na router inasimama tunnel cloud — hakuna inbound ports kwenye router.
          Configuration, terminal, na auto-detect zote zinafanywa hapa ndani ya system.
        </p>
      </div>
      <div class="flex gap-2">
        <button @click="refresh()" class="btn btn-secondary btn-sm"><i class="fas fa-sync-alt mr-1"></i>Segesha</button>
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
              <th class="py-3 px-4 text-left text-xs text-white/60">Hali</th>
              <th class="py-3 px-4 text-left text-xs text-white/60">Routers zilizogunduliwa</th>
              <th class="py-3 px-4 text-center text-xs text-white/60">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in collectors" :key="c.key" class="border-b border-[#1e1e2a]/50">
              <td class="py-3 px-4">
                <div class="text-white">{{ c.name || c.key }}</div>
                <div class="text-xs text-white/40 truncate max-w-xs">{{ c.key }}</div>
              </td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full" :class="c.connected ? 'bg-green-500' : 'bg-red-500'"></span>
                  <span class="text-xs" :style="c.connected ? 'color:#34d399' : 'color:#f87171'">
                    {{ c.connected ? 'Inaonekana' : 'Imeshambaa' }}
                  </span>
                </span>
                <div v-if="c.lastHeartbeat" class="text-[10px] text-white/40 mt-0.5">HB: {{ new Date(c.lastHeartbeat).toLocaleTimeString() }}</div>
              </td>
              <td class="py-3 px-4">
                <span v-if="c.routers && c.routers.length" class="text-xs text-white/60">
                  {{ c.routers.length }} router(s)
                  <div v-for="r in c.routers" :key="r.key" class="text-[10px] text-white/40 mt-0.5">
                    {{ r.identity || r.host }} ({{ r.connected ? 'online' : 'offline' }})
                  </div>
                </span>
                <span v-else class="text-xs text-white/40">Hakuna</span>
              </td>
              <td class="py-3 px-4 text-center">
                <button v-if="c.connected" @click="detect(c.key)" class="text-xs px-3 py-1.5 rounded bg-[#FF7A30]/10 text-[#FF7A30] hover:bg-[#FF7A30]/20" title="Auto-detect">
                  <i class="fas fa-search mr-1"></i>Detect
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Registered + detected routers -->
    <div class="section-card rounded-2xl border border-[#1e1e2a] overflow-hidden">
      <div class="p-4 border-b border-[#1e1e2a]">
        <h3 class="font-medium text-white"><i class="fas fa-router mr-2 text-[#FF7A30]"></i>Routers (zilijadilishwa + zilizogunduliwa)</h3>
      </div>
      <div class="p-4">
        <div v-if="routers.length === 0" class="text-center py-10" style="color: #6b7280">
          <p>Hakuna routers.</p>
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
              <td class="py-3 px-4">
                <div class="text-white">{{ r.router_name || r.name }}</div>
                <div v-if="r.detected_by" class="text-[10px] text-[#FF7A30]">Gunduliwa na: {{ r.detected_by }}</div>
              </td>
              <td class="py-3 px-4 text-xs text-white/40">{{ r.host }}:{{ r.port || 8728 }}</td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full" :class="statusColor(r.status)"></span>
                  <span class="text-xs">{{ r.status }}</span>
                </span>
              </td>
              <td class="py-3 px-4 text-xs text-white/60">{{ r.setup_status || '-' }}</td>
              <td class="py-3 px-4 text-center">
                <button v-if="r.detected_by" @click="registerRouter(r)" class="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 mr-1" title="Jadilisha kwenye system">
                  <i class="fas fa-plus mr-1"></i>Jadilisha
                </button>
                <button @click="pingRouter(r)" class="text-xs px-2 py-1 rounded bg-[#FF7A30]/10 text-[#FF7A30]" title="Ping via collector">
                  <i class="fas fa-ping mr-1"></i>Ping
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Web Terminal (inside system) -->
    <div class="section-card rounded-2xl border border-[#1e1e2a] overflow-hidden">
      <div class="p-4 border-b border-[#1e1e2a]">
        <h3 class="font-medium text-white"><i class="fas fa-terminal mr-2 text-[#FF7A30]"></i>Terminal ya Router (ndani ya system)</h3>
        <p class="text-xs text-white/50 mt-1">
          Tuma commands ya MikroTik kupitia collector tunnel. Hakuna WinBox/Terminal ya nje inayohitaji.
        </p>
      </div>
      <div class="p-4 space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-white/60 mb-1">Collector Key</label>
            <select v-model="term.collectorKey" class="input w-full">
              <option value="">-- chagua collector --</option>
              <option v-for="c in collectors" :key="c.key" :value="c.key">{{ c.name || c.key }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-white/60 mb-1">Router (optional)</label>
            <input v-model="term.routerKey" placeholder="router key (au acha tupu)" class="input w-full">
          </div>
          <div>
            <label class="block text-xs text-white/60 mb-1">Command</label>
            <input v-model="term.path" placeholder="/system/identity/print" class="input w-full" @keyup.enter="runCommand">
          </div>
        </div>
        <div class="flex gap-2">
          <button @click="runCommand" :disabled="term.running" class="btn btn-primary">
            <i class="fas fa-play mr-1"></i>{{ term.running ? 'Inatuma...' : 'Tuma' }}
          </button>
          <button @click="clearTerminal" class="btn btn-ghost">Futa</button>
        </div>
        <!-- Terminal output -->
        <div ref="termOutput" class="bg-black rounded-lg p-3 font-mono text-xs text-green-300 h-64 overflow-y-auto border border-[#1e1e2a]">
          <div v-for="(line, i) in term.lines" :key="i" class="whitespace-pre-wrap" :class="line.type === 'cmd' ? 'text-yellow-300' : line.type === 'err' ? 'text-red-400' : 'text-green-300'">{{ line.text }}</div>
          <div v-if="term.lines.length === 0" class="text-white/30">HotBando Remote Terminal — tuma command ya MikroTik hapo juu...</div>
        </div>
      </div>
    </div>

    <div v-if="toast.show" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const collectors = ref([])
const routers = ref([])
const cmdResult = ref(null)
const toast = ref({ show: false, message: '', type: 'success' })
const term = ref({ collectorKey: '', routerKey: '', path: '/system/identity/print', running: false, lines: [] })
const termOutput = ref(null)

function showToast(msg, type = 'success') { toast.value = { show: true, message: msg, type }; setTimeout(() => toast.value.show = false, 3000) }
function statusColor(s) { return { online: 'bg-green-500', offline: 'bg-red-500', configuring: 'bg-yellow-500', pending: 'bg-yellow-500', detected: 'bg-blue-500' }[s] || 'bg-gray-600' }

async function refresh() {
  try {
    const [c, r] = await Promise.allSettled([
      adminGet('/router-fleet/collectors'),
      adminGet('/router-fleet/routers')
    ])
    if (c.status === 'fulfilled') collectors.value = c.value.collectors || []
    if (r.status === 'fulfilled') routers.value = r.value.routers || []
  } catch (e) { showToast('Segesha kushindikana: ' + e.message, 'error') }
}

async function detect(collectorKey) {
  try {
    await adminPost('/router-fleet/detect', { collectorKey })
    showToast('Auto-detection imetokezwa')
    setTimeout(refresh, 3000)
  } catch (e) { showToast('Kushindikana: ' + (e.response?.data?.message || e.message), 'error') }
}

async function registerRouter(r) {
  try {
    const routerID = r.router_id || `router-${Date.now()}`
    await adminPost('/router-fleet/register', {
      routerID,
      routerName: r.router_name || r.name || 'Router',
      host: r.host,
      port: r.port || 8728,
      model: r.model
    })
    showToast('Router imesajiliwa kwenye system')
    refresh()
  } catch (e) { showToast('Kushindikana: ' + (e.response?.data?.message || e.message), 'error') }
}

async function pingRouter(r) {
  const c = collectors.value.find(x => x.connected)
  if (!c) { showToast('Hakuna collector inayopatikana', 'error'); return }
  const res = await adminPost('/router-fleet/mikrotik', {
    collectorKey: c.key,
    path: '/system/identity/print',
    args: {}
  })
  showToast(res.success ? `Ping OK: ${JSON.stringify(res.data)}` : `Ping kushindikana: ${res.error}`, res.success ? 'success' : 'error')
}

async function runCommand() {
  if (!term.value.collectorKey) { showToast('Chagua collector kwanza', 'error'); return }
  if (!term.value.path) { showToast('Weka command', 'error'); return }
  term.value.running = true
  term.value.lines.push({ type: 'cmd', text: `> ${term.value.path}` })
  await nextTick()
  scrollToBottom()
  try {
    const res = await adminPost('/router-fleet/mikrotik', {
      collectorKey: term.value.collectorKey,
      router: term.value.routerKey || undefined,
      path: term.value.path,
      args: {}
    })
    if (res.success) {
      const out = Array.isArray(res.data) ? res.data : [res.data]
      for (const item of out) {
        term.value.lines.push({ type: 'out', text: JSON.stringify(item, null, 2) })
      }
    } else {
      term.value.lines.push({ type: 'err', text: `ERROR: ${res.error || 'unknown'}` })
    }
  } catch (e) {
    term.value.lines.push({ type: 'err', text: `ERROR: ${e.response?.data?.message || e.message}` })
  }
  term.value.running = false
  await nextTick()
  scrollToBottom()
}

function scrollToBottom() {
  if (termOutput.value) termOutput.value.scrollTop = termOutput.value.scrollHeight
}

function clearTerminal() { term.value.lines = [] }

onMounted(() => {
  refresh()
  setInterval(refresh, 15000)
})
</script>
