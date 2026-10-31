<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Router Fleet Management</h2>
        <p class="text-sm" style="color: #6b7280">Detect, configure and manage MikroTik routers with auto WireGuard</p>
      </div>
      <div class="flex gap-2">
        <button @click="refreshAll()" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
        <button @click="activeTab = 'detect'" class="btn btn-primary btn-sm"><i class="fas fa-crosshairs mr-1"></i> Detect Router</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Total Routers</p><p class="stat-value">{{ stats.total }}</p></div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-router"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Online</p><p class="stat-value" style="color: #34d399">{{ stats.online }}</p></div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-check-circle"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Pending Connect</p><p class="stat-value" style="color: #f59e0b">{{ stats.pending }}</p></div>
          <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b"><i class="fas fa-hourglass-half"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">WireGuard</p><p class="stat-value" style="color: #a78bfa">{{ stats.wireguard }}</p></div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-shield-halved"></i></div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="section-card" style="padding: 4px">
      <div class="flex gap-1">
        <button v-for="t in tabs" :key="t.key" @click="activeTab = t.key"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :style="activeTab === t.key ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'background: transparent; color: #6b7280'">
          <i :class="t.icon" class="mr-1.5"></i>{{ t.label }}
        </button>
      </div>
    </div>

    <!-- ===================== DETECT TAB ===================== -->
    <template v-if="activeTab === 'detect'">
      <!-- Auto detect (primary) -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-bolt" style="color: #FF7A30"></i> Auto Detect & Configure</h3>
        </div>
        <div class="section-body space-y-3">
          <p class="text-xs" style="color: #6b7280">Plug the MikroTik into this network, then press the button — the system finds it, logs in with default credentials and configures it automatically. No IP typing needed.</p>
          <div class="flex gap-2 flex-wrap">
            <button @click="autoDetect()" :disabled="autoDetecting || configRunning" class="btn btn-primary">
              <i class="fas mr-1" :class="autoDetecting ? 'fa-spinner fa-spin' : 'fa-radar'"></i>
              {{ autoDetecting ? 'Detecting...' : 'Auto-Detect Router' }}
            </button>
            <button v-if="detectResult?.isMikrotik && !detectResult?.inDatabase" @click="quickConfigure()" :disabled="configRunning" class="btn btn-secondary">
              <i class="fas mr-1" :class="configRunning ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
              {{ configRunning ? 'Configuring...' : 'Auto-Configure Now' }}
            </button>
          </div>
          <div v-if="detectResult" class="p-4 rounded-xl space-y-2" :style="detectResult.isMikrotik ? 'background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2)' : 'background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2)'">
            <p v-if="detectResult.isMikrotik" class="text-sm font-medium" style="color: #34d399"><i class="fas fa-check-circle mr-1"></i> MikroTik Detected ({{ detectForm.ip }})</p>
            <p v-else class="text-sm font-medium" style="color: #f87171"><i class="fas fa-times-circle mr-1"></i> {{ detectResult.message || 'Not a MikroTik device' }}</p>
            <div v-if="detectResult.isMikrotik" class="grid grid-cols-2 gap-2 mt-2">
              <div class="text-xs"><span style="color: #6b7280">Identity:</span> <span class="text-white font-medium">{{ detectResult.identity }}</span></div>
              <div class="text-xs"><span style="color: #6b7280">Model:</span> <span class="text-white font-medium">{{ detectResult.model }}</span></div>
              <div class="text-xs"><span style="color: #6b7280">Firmware:</span> <span class="text-white font-medium">{{ detectResult.firmware }}</span></div>
              <div class="text-xs"><span style="color: #6b7280">In DB:</span> <span :class="detectResult.inDatabase ? 'text-yellow-400' : 'text-green-400'">{{ detectResult.inDatabase ? 'Yes' : 'No' }}</span></div>
            </div>
            <p v-if="detectResult.credentialsAuto" class="text-xs mt-2" style="color: #FF7A30">
              <i class="fas fa-key mr-1"></i> Default credentials detected automatically — no password needed
            </p>
            <button v-if="detectResult.isMikrotik && !detectResult.inDatabase" @click="activeTab = 'configure'" class="btn btn-secondary btn-sm w-full mt-2">
              <i class="fas fa-sliders mr-1"></i> Custom Configure (name, location, SSID)
            </button>
          </div>
          <!-- Manual / advanced fallback -->
          <details class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
            <summary class="text-xs cursor-pointer" style="color: #6b7280">Manual connect (IP + credentials)</summary>
            <div class="grid grid-cols-2 gap-3 mt-3">
              <div><label class="input-label">Router IP *</label><input v-model="detectForm.ip" class="form-input" placeholder="192.168.88.1"></div>
              <div><label class="input-label">API Port</label><input v-model.number="detectForm.port" type="number" class="form-input" placeholder="8728"></div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-3">
              <div><label class="input-label">Username</label><input v-model="detectForm.user" class="form-input" placeholder="admin"></div>
              <div><label class="input-label">Password</label><input v-model="detectForm.password" type="password" class="form-input" placeholder="admin"></div>
            </div>
            <button @click="detectRouter()" :disabled="!detectForm.ip || detecting" class="btn btn-secondary w-full mt-3">
              <i class="fas mr-1" :class="detecting ? 'fa-spinner fa-spin' : 'fa-plug'"></i>
              {{ detecting ? 'Connecting...' : 'Detect This IP' }}
            </button>
          </details>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <!-- ARP scan -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-network-wired" style="color: #60a5fa"></i> Found Devices</h3>
            <button @click="scanNetwork()" :disabled="scanning" class="btn btn-secondary btn-sm">
              <i class="fas mr-1" :class="scanning ? 'fa-spinner fa-spin' : 'fa-radar'"></i> {{ scanning ? 'Scanning...' : 'Scan' }}
            </button>
          </div>
          <div class="section-body">
            <p class="text-xs mb-3" style="color: #6b7280">Scans ARP table and local network for MikroTik devices by MAC OUI and API port — plus the WireGuard tunnel network, so remote routers that phoned home appear here as if local.</p>
            <div v-if="scanResults.length" class="space-y-2 max-h-72 overflow-y-auto">
              <div v-for="d in scanResults" :key="d.ip"
                class="flex items-center justify-between p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
                <div class="flex items-center gap-3">
                  <div class="w-2.5 h-2.5 rounded-full" :class="d.isMikrotik ? 'bg-green-500' : 'bg-gray-500'"></div>
                  <div>
                    <p class="text-sm font-medium text-white">{{ d.identity || d.ip }}</p>
                    <p class="text-xs font-mono" style="color: #6b7280">{{ d.ip }} <span v-if="d.mac">({{ d.mac }})</span></p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span v-if="d.model" class="text-xs px-2 py-0.5 rounded-full" style="background: rgba(59,130,246,0.1); color: #60a5fa">{{ d.model }}</span>
                  <span v-if="d.source === 'tunnel'" class="text-xs px-2 py-0.5 rounded-full" style="background: rgba(139,92,246,0.15); color: #a78bfa" title="Remote router reachable over WireGuard tunnel — as if local">TUNNEL</span>
                  <span v-if="d.inDatabase" class="text-xs px-2 py-0.5 rounded-full" style="background: rgba(245,158,11,0.1); color: #f59e0b">In DB</span>
                  <button v-if="d.isMikrotik && !d.inDatabase" @click="useDetected(d)" class="text-xs px-2 py-1 rounded-lg" style="background: rgba(255,122,48,0.1); color: #FF7A30">
                    <i class="fas fa-arrow-right mr-1"></i>Use
                  </button>
                  <button v-if="d.source === 'tunnel'" @click="checkDetected(d)" class="text-xs px-2 py-1 rounded-lg" style="background: rgba(139,92,246,0.1); color: #a78bfa" title="Run Detect on this tunnel IP">
                    <i class="fas fa-plug mr-1"></i>Detect
                  </button>
                </div>
              </div>
            </div>
            <div v-else-if="!scanning" class="text-center py-6" style="color: #6b7280">
              <i class="fas fa-satellite-dish text-2xl mb-2 block" style="color: #1e1e2a"></i>
              <p class="text-sm">Click "Scan" to discover MikroTik devices on the network</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== CONFIGURE TAB ===================== -->
    <template v-if="activeTab === 'configure'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-cog" style="color: #FF7A30"></i> Router Configuration</h3>
          </div>
          <div class="section-body space-y-3">
            <p class="text-xs" style="color: #6b7280">Configure the router's basic settings. These will be applied during the WireGuard setup.</p>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="input-label">Router Name *</label><input v-model="configForm.routerName" class="form-input" placeholder="Dar Office Router"></div>
              <div><label class="input-label">SSID</label><input v-model="configForm.ssid" class="form-input" placeholder="HotBando-Free-WiFi"></div>
            </div>
            <div>
              <label class="input-label">Location</label>
              <select v-model="configForm.locationId" class="form-input" @change="onLocationSelect()">
                <option :value="null">-- None --</option>
                <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }} ({{ loc.city || 'no city' }})</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="input-label">Latitude</label><input v-model.number="configForm.latitude" type="number" step="any" class="form-input" placeholder="-6.7924"></div>
              <div><label class="input-label">Longitude</label><input v-model.number="configForm.longitude" type="number" step="any" class="form-input" placeholder="39.2083"></div>
            </div>
            <div class="p-3 rounded-xl" style="background: rgba(255,122,48,0.05); border: 1px solid rgba(255,122,48,0.15)">
              <p class="text-xs font-medium mb-1" style="color: #FF7A30"><i class="fas fa-info-circle mr-1"></i> Connection Details</p>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <div class="text-xs"><span style="color: #6b7280">IP:</span> <span class="text-white font-mono">{{ detectForm.ip || 'Not set' }}</span></div>
                <div class="text-xs"><span style="color: #6b7280">Port:</span> <span class="text-white font-mono">{{ detectForm.port }}</span></div>
                <div class="text-xs"><span style="color: #6b7280">User:</span> <span class="text-white font-mono">{{ detectForm.user }}</span></div>
                <div class="text-xs"><span style="color: #6b7280">Password:</span> <span class="text-white font-mono">{{ detectForm.password ? '****' : '(empty)' }}</span></div>
              </div>
            </div>
            <button @click="startWireGuardConfig()" :disabled="!detectForm.ip || configRunning" class="btn btn-primary w-full">
              <i class="fas mr-1" :class="configRunning ? 'fa-spinner fa-spin' : 'fa-shield-halved'"></i>
              {{ configRunning ? 'Configuring...' : 'Auto-Configure WireGuard' }}
            </button>
          </div>
        </div>
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-route" style="color: #a78bfa"></i> What Will Happen</h3>
          </div>
          <div class="section-body">
            <div class="space-y-3">
              <div v-for="(step, i) in configSteps" :key="i" class="flex items-start gap-3 p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
                <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  :style="configProgress && configProgress.step > i ? 'background: rgba(16,185,129,0.2); color: #34d399' : 'background: rgba(255,122,48,0.1); color: #FF7A30'">
                  <i v-if="configProgress && configProgress.step > i" class="fas fa-check"></i>
                  <span v-else>{{ i + 1 }}</span>
                </div>
                <div>
                  <p class="text-sm font-medium text-white">{{ step.title }}</p>
                  <p class="text-xs mt-0.5" style="color: #6b7280">{{ step.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== SITE SETUP TAB ===================== -->
    <template v-if="activeTab === 'sitesetup'">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="section-card">
          <div class="section-header"><h3 class="section-title"><i class="fas fa-bolt" style="color: #FF7A30"></i> 1. Same network</h3></div>
          <div class="section-body space-y-2">
            <p class="text-xs" style="color: #6b7280">PC and router on the same LAN. Open Detect, press <b>Auto-Detect Router</b>, then <b>Auto-Configure Now</b> — fully automatic.</p>
            <button @click="activeTab = 'detect'" class="btn btn-primary btn-sm w-full"><i class="fas fa-crosshairs mr-1"></i> Go to Auto-Detect</button>
          </div>
        </div>
        <div class="section-card">
          <div class="section-header"><h3 class="section-title"><i class="fas fa-box-open" style="color: #60a5fa"></i> 2. Pre-provisioned</h3></div>
          <div class="section-body space-y-2">
            <p class="text-xs" style="color: #6b7280">Configure the router here first (path 1), then ship it to site. Site person only plugs WAN + power — tunnel comes up alone, portal opens for configured routers only.</p>
          </div>
        </div>
        <div class="section-card">
          <div class="section-header"><h3 class="section-title"><i class="fas fa-satellite-dish" style="color: #a78bfa"></i> 3. Remote site</h3></div>
          <div class="section-body space-y-2">
            <p class="text-xs" style="color: #6b7280">Router already far away? Send the script below (WhatsApp). Site person pastes it once into WebFig Terminal (<span class="font-mono">http://192.168.88.1</span>, router with internet). Everything after is automatic.</p>
            <button @click="loadBootstrap()" :disabled="loadingBootstrap" class="btn btn-secondary btn-sm w-full">
              <i class="fas mr-1" :class="loadingBootstrap ? 'fa-spinner fa-spin' : 'fa-file-code'"></i> {{ bootstrapScript ? 'Reload site script' : 'Show site script' }}
            </button>
            <div v-if="bootstrapScript">
              <pre class="p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 overflow-y-auto" style="background: #0a0a0f; border: 1px solid var(--border); color: #9ca3af">{{ bootstrapScript }}</pre>
              <button @click="copyBootstrap()" class="btn btn-primary btn-sm w-full mt-2"><i class="fas fa-copy mr-1"></i> Copy script</button>
            </div>
          </div>
        </div>
      </div>
      <div class="section-card mt-4">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-hourglass-half" style="color: #f59e0b"></i> Waiting for your Connect ({{ pendingRouters.length }})</h3>
          <button @click="refreshAll()" class="btn btn-secondary btn-sm"><i class="fas fa-sync-alt mr-1"></i> Refresh</button>
        </div>
        <div class="section-body">
          <div v-if="pendingRouters.length" class="space-y-2">
            <div v-for="r in pendingRouters" :key="r.id" class="flex items-center justify-between p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
              <div>
                <p class="text-sm font-medium text-white">{{ r.router_name || r.router_id }}</p>
                <p class="text-xs font-mono" style="color: #6b7280">{{ r.router_id }} · WG {{ r.wireguard_ip || '—' }}</p>
              </div>
              <button @click="connectRouter(r)" class="btn btn-primary btn-sm"><i class="fas fa-plug mr-1"></i> Connect</button>
            </div>
          </div>
          <p v-else class="text-sm text-center py-4" style="color: #6b7280">No pending routers. A router appears here within a minute of the site paste.</p>
        </div>
      </div>
    </template>

    <!-- ===================== FLEET TAB ===================== -->
    <template v-if="activeTab === 'fleet'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-network-wired" style="color: #FF7A30"></i> Router Fleet</h3>
          <div class="flex gap-2 flex-wrap">
            <div class="relative">
              <input v-model="search" placeholder="Search routers..." class="form-input" style="max-width: 220px; padding-left: 32px">
              <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs" style="color: #6b7280"></i>
            </div>
            <select v-model="statusFilter" class="form-input" style="max-width: 140px">
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="pending">Pending Connect</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
        <div v-if="filteredRouters.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <div v-for="r in filteredRouters" :key="r.id"
            class="section-card p-5 hover:border-[#2a2a3a] transition-all hover:-translate-y-0.5 cursor-pointer group"
            @click="viewRouter(r)">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2.5">
                <div class="relative">
                  <div class="w-3 h-3 rounded-full" :class="r.status === 'online' ? 'bg-green-500' : 'bg-red-500'"></div>
                  <div v-if="r.status === 'online'" class="pulse-online absolute inset-0"></div>
                </div>
                <span class="font-semibold text-white group-hover:text-[#FF7A30] transition-colors">{{ r.router_name || r.router_id }}</span>
              </div>
              <div class="flex items-center gap-1">
                <span v-if="r.wireguard_configured || r.wireguard_ip" class="text-xs px-1.5 py-0.5 rounded-full" style="background: rgba(139,92,246,0.15); color: #a78bfa" title="WireGuard configured">
                  <i class="fas fa-shield-halved"></i>
                </span>
                <span v-if="r.setup_status === 'pending'" class="text-xs px-2 py-0.5 rounded-full" style="background: rgba(245,158,11,0.15); color: #f59e0b" title="Waiting for Connect approval">
                  PENDING
                </span>
                <span v-else-if="r.setup_status === 'configuring'" class="text-xs px-2 py-0.5 rounded-full" style="background: rgba(59,130,246,0.15); color: #60a5fa" title="Config pushed, router pulling">
                  CONNECTING
                </span>
                <span v-else class="text-xs px-2 py-0.5 rounded-full" :class="r.status === 'online' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'">{{ (r.status || 'offline').toUpperCase() }}</span>
              </div>
            </div>
            <div class="text-sm space-y-1.5 mb-3" style="color: #9ca3af">
              <p class="flex items-center gap-2"><i class="fas fa-fingerprint w-4 text-center" style="color: #4b5563"></i> <span class="font-mono text-xs">{{ r.router_id }}</span></p>
              <p class="flex items-center gap-2"><i class="fas fa-server w-4 text-center" style="color: #4b5563"></i> <span class="font-mono text-xs">{{ r.host }}:{{ r.port || 8728 }}</span></p>
              <p class="flex items-center gap-2"><i class="fas fa-wifi w-4 text-center" style="color: #4b5563"></i> {{ r.ssid || '---' }}</p>
              <p class="flex items-center gap-2"><i class="fas fa-map-marker-alt w-4 text-center" style="color: #4b5563"></i> {{ r.location_name || 'No location' }}</p>
            </div>
            <div v-if="r.status === 'online'" class="grid grid-cols-2 gap-2 mb-3">
              <div class="p-2 rounded-lg" style="background: rgba(59,130,246,0.08)">
                <p class="text-xs" style="color: #6b7280">CPU</p>
                <div class="flex items-center gap-2 mt-1">
                  <div class="flex-1 h-1.5 rounded-full" style="background: #1e1e2a">
                    <div class="h-full rounded-full" :style="{ width: (r.cpu_load || 0) + '%', background: (r.cpu_load || 0) > 80 ? '#f87171' : '#60a5fa' }"></div>
                  </div>
                  <span class="text-xs font-mono text-white">{{ r.apiReachable ? `${r.cpu_load || 0}%` : '—' }}</span>
                </div>
              </div>
              <div class="p-2 rounded-lg" style="background: rgba(139,92,246,0.08)">
                <p class="text-xs" style="color: #6b7280">Memory</p>
                <div class="flex items-center gap-2 mt-1">
                  <div class="flex-1 h-1.5 rounded-full" style="background: #1e1e2a">
                    <div class="h-full rounded-full" :style="{ width: (r.memory_usage || 0) + '%', background: (r.memory_usage || 0) > 80 ? '#f87171' : '#a78bfa' }"></div>
                  </div>
                  <span class="text-xs font-mono text-white">{{ r.apiReachable ? `${r.memory_usage || 0}%` : '—' }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between pt-3" style="border-top: 1px solid var(--border)">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1 text-xs" :title="`${r.customer_count || 0} customer accounts; ${r.active_bundle_users || 0} with active bundles`">
                  <i class="fas fa-users" :class="r.customer_count > 0 ? 'text-green-400' : 'text-gray-600'"></i>
                  <span :class="r.customer_count > 0 ? 'text-green-400' : 'text-gray-600'">{{ r.customer_count || 0 }}</span>
                </span>
                <span v-if="r.wireguard_ip" class="text-xs font-mono" style="color: #6b7280">{{ r.wireguard_ip }}</span>
              </div>
              <div class="flex gap-1.5">
                <button v-if="r.setup_status === 'pending'" @click.stop="connectRouter(r)" class="px-2 py-1 rounded-lg text-xs font-medium" style="background: rgba(255,122,48,0.15); color: #FF7A30" title="Connect & provision this router">
                  <i class="fas fa-plug mr-1"></i>Connect
                </button>
                <button @click.stop="viewRouter(r)" class="p-1.5 rounded-lg transition-colors" style="color: #6b7280" title="View"><i class="fas fa-eye hover:text-[#FF7A30] text-xs"></i></button>
                <button @click.stop="editRouter(r)" class="p-1.5 rounded-lg transition-colors" style="color: #6b7280" title="Edit"><i class="fas fa-edit hover:text-[#FF7A30] text-xs"></i></button>
                <button @click.stop="deleteRouter(r)" class="p-1.5 rounded-lg transition-colors" style="color: #6b7280" title="Delete"><i class="fas fa-trash hover:text-red-400 text-xs"></i></button>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="!loading" class="text-center py-16">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style="background: rgba(255,122,48,0.08)">
            <i class="fas fa-router text-4xl" style="color: #FF7A30; opacity: 0.6"></i>
          </div>
          <p class="text-white font-medium mb-1">No routers found</p>
          <p class="text-sm mb-4" style="color: #6b7280">{{ search || statusFilter ? 'No routers match filters' : 'Start by detecting your first MikroTik router' }}</p>
          <button v-if="!search && !statusFilter" @click="activeTab = 'detect'" class="btn btn-primary btn-sm">
            <i class="fas fa-crosshairs mr-1"></i> Detect First Router
          </button>
        </div>
      </div>
    </template>

    <!-- ===================== WIREGUARD TAB ===================== -->
    <template v-if="activeTab === 'wireguard'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-shield-halved" style="color: #FF7A30"></i> WireGuard Server</h3>
            <span v-if="wgServer.running" class="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
              <i class="fas fa-check-circle mr-1"></i> Running
            </span>
            <span v-else class="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Stopped</span>
          </div>
          <div class="section-body space-y-4">
            <div v-if="wgServer.running" class="p-4 rounded-xl space-y-2" style="background: #0a0a0f; border: 1px solid var(--border)">
              <div class="flex justify-between text-sm"><span style="color: #6b7280">Interface</span><span class="font-mono text-white">{{ wgServer.interface }}</span></div>
              <div class="flex justify-between text-sm"><span style="color: #6b7280">Listen Port</span><span class="font-mono text-white">{{ wgServer.listenPort }}</span></div>
              <div class="flex justify-between text-sm"><span style="color: #6b7280">Server IP</span><span class="font-mono text-white">{{ wgServer.serverIp }}</span></div>
              <div class="flex justify-between text-sm"><span style="color: #6b7280">Public Host</span><span class="font-mono text-white">{{ wgServer.serverPublicIp }}</span></div>
              <div class="flex justify-between text-sm"><span style="color: #6b7280">Network</span><span class="font-mono text-white">{{ wgServer.network }}</span></div>
              <div v-if="wgServer.activePeers != null" class="flex justify-between text-sm"><span style="color: #6b7280">Active peers</span><span class="font-mono text-white">{{ wgServer.activePeers }} / {{ wgServer.wgPeers ?? wgPeers.length }}</span></div>
            </div>
            <div v-else class="p-4 rounded-xl text-sm text-center" style="background: #0a0a0f; border: 1px solid var(--border); color: #6b7280">
              <i class="fas fa-info-circle mr-1"></i> WireGuard server is not running. It will start automatically when you configure the first router.
            </div>
            <button @click="applyServerConfig()" class="btn btn-secondary btn-sm w-full" :disabled="applyingServer">
              <i class="fas mr-1" :class="applyingServer ? 'fa-spinner fa-spin' : 'fa-rotate'"></i>
              {{ applyingServer ? 'Applying...' : 'Re-apply Server Config' }}
            </button>
          </div>
        </div>
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><i class="fas fa-network-wired" style="color: #34d399"></i> Connected Peers</h3>
            <span class="text-xs px-2 py-0.5 rounded-full" style="background: rgba(59,130,246,0.1); color: #60a5fa">{{ wgPeers.length }} peers</span>
          </div>
          <div class="section-body">
            <div v-if="wgPeers.length" class="space-y-2 max-h-72 overflow-y-auto">
              <div v-for="p in wgPeers" :key="p.routerId" class="flex items-center justify-between p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
                <div>
                  <p class="text-sm font-medium text-white">{{ p.name }}</p>
                  <p class="text-xs font-mono" style="color: #6b7280">{{ p.wgIp }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs" :class="p.status === 'online' ? 'text-green-400' : 'text-red-400'">{{ p.status === 'online' ? 'Connected' : 'Offline' }}</p>
                  <p class="text-xs" style="color: #6b7280">{{ p.lastSeen ? new Date(p.lastSeen).toLocaleDateString() : 'Never' }}</p>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8" style="color: #6b7280">
              <i class="fas fa-shield-halved text-2xl mb-2 block" style="color: #1e1e2a"></i>
              <p class="text-sm">No WireGuard peers configured yet</p>
              <p class="text-xs mt-1">Configure a router in the Detect tab to add a peer</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== ROUTER DETAIL MODAL ===================== -->
    <div v-if="detailRouter" class="fixed inset-0 flex items-center justify-center z-50 p-4" style="background: rgba(0,0,0,0.7)" @click.self="detailRouter = null">
      <div class="section-card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div class="p-5 flex items-center justify-between" style="border-bottom: 1px solid var(--border)">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full" :class="detailRouter.status === 'online' ? 'bg-green-500' : 'bg-red-500'"></div>
            <div>
              <h3 class="text-lg font-bold text-white">{{ detailRouter.router_name || detailRouter.router_id }}</h3>
              <p class="text-xs" style="color: #6b7280">{{ detailRouter.router_id }} &middot; {{ detailRouter.host }}:{{ detailRouter.port || 8728 }}</p>
            </div>
          </div>
          <button @click="detailRouter = null" class="p-2 rounded-lg" style="color: #6b7280"><i class="fas fa-times text-lg hover:text-white"></i></button>
        </div>
        <div class="p-5 space-y-4">
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div class="p-3 rounded-xl text-center" style="background: rgba(59,130,246,0.08)" :title="`${detailRouter.active_bundle_users || 0} with active bundles`">
              <p class="text-xl font-bold text-white">{{ detailRouter.customer_count ?? detailRouter.total_users ?? 0 }}</p><p class="text-xs" style="color: #6b7280">Customers</p>
              <p class="text-[10px]" style="color:#6b7280">{{ detailRouter.active_bundle_users || 0 }} active bundles</p>
            </div>
            <div class="p-3 rounded-xl text-center" style="background: rgba(34,197,94,0.08)">
              <p class="text-xl font-bold text-white">{{ detailRouter.apiReachable ? (detailRouter.active_users || 0) : '—' }}</p><p class="text-xs" style="color: #6b7280">Router sessions</p>
              <p v-if="!detailRouter.apiReachable" class="text-[10px]" style="color:#f59e0b">Router API unavailable</p>
            </div>
            <div class="p-3 rounded-xl text-center" style="background: rgba(16,185,129,0.08)">
              <p class="text-xl font-bold text-white">{{ detailRouter.apiReachable ? `${detailRouter.cpu_load || 0}%` : '—' }}</p><p class="text-xs" style="color: #6b7280">CPU</p>
            </div>
            <div class="p-3 rounded-xl text-center" style="background: rgba(139,92,246,0.08)">
              <p class="text-xl font-bold text-white">{{ detailRouter.apiReachable ? `${detailRouter.memory_usage || 0}%` : '—' }}</p><p class="text-xs" style="color: #6b7280">Memory</p>
            </div>
            <div class="p-3 rounded-xl text-center" style="background: rgba(245,158,11,0.08)">
              <p class="text-xl font-bold text-white">{{ detailRouter.wireguard_ip || '---' }}</p><p class="text-xs" style="color: #6b7280">WG IP</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div v-for="(item, i) in detailInfoItems" :key="i" class="p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
              <p class="text-xs mb-1" style="color: #6b7280">{{ item.label }}</p>
              <p class="text-sm font-mono text-white">{{ item.value || '---' }}</p>
            </div>
          </div>
          <div class="flex gap-2 pt-2">
            <button v-if="detailRouter.setup_status === 'pending'" @click="connectRouter(detailRouter); detailRouter = null" class="btn btn-primary btn-sm"><i class="fas fa-plug mr-1"></i> Connect Router</button>
            <button @click="editRouter(detailRouter); detailRouter = null" class="btn btn-secondary btn-sm"><i class="fas fa-edit mr-1"></i> Edit</button>
            <button @click="deleteRouter(detailRouter)" class="btn btn-secondary btn-sm" style="color: #f87171"><i class="fas fa-trash mr-1"></i> Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== EDIT MODAL ===================== -->
    <div v-if="showForm" class="fixed inset-0 flex items-center justify-center z-50 p-4" style="background: rgba(0,0,0,0.6)" @click.self="showForm = false">
      <div class="section-card w-full max-w-lg p-6">
        <h3 class="text-lg font-bold text-white mb-5">{{ editing ? 'Edit Router' : 'Add New Router' }}</h3>
        <form @submit.prevent="saveRouter" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="input-label">Router ID *</label><input v-model="form.router_id" required class="form-input" placeholder="RT-001"></div>
            <div><label class="input-label">Router Name *</label><input v-model="form.router_name" required class="form-input" placeholder="Dar Office"></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="input-label">Host / IP *</label><input v-model="form.host" required class="form-input" placeholder="10.7.0.10"></div>
            <div><label class="input-label">Port</label><input v-model.number="form.port" type="number" class="form-input" placeholder="8728"></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="input-label">Username *</label><input v-model="form.user" required class="form-input" placeholder="admin"></div>
            <div><label class="input-label">Password *</label><input v-model="form.password" type="password" class="form-input"></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="input-label">SSID</label><input v-model="form.ssid" class="form-input" placeholder="HotBando-WiFi"></div>
            <div><label class="input-label">Location</label>
              <select v-model="form.location_id" class="form-input">
                <option :value="null">-- None --</option>
                <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-3" style="border-top: 1px solid var(--border)">
            <button type="button" @click="showForm = false" class="btn btn-ghost">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving"><i v-if="saving" class="fas fa-spinner fa-spin mr-1"></i>{{ editing ? 'Save Changes' : 'Add Router' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">{{ toast.message }}</div>

    <!-- Terminal Modal -->
    <TerminalModal
      :show="showTerminal"
      :title="terminalTitle"
      :running="terminalRunning"
      :success="terminalSuccess"
      :error="terminalError"
      :progress="terminalProgress"
      :lines="terminalLines"
      @close="showTerminal = false"
    />
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { adminGet, adminPost, adminPut, adminDelete } from '../../api/client'
import TerminalModal from '../../components/TerminalModal.vue'

const activeTab = ref('detect')
const tabs = [
  { key: 'detect', label: 'Detect', icon: 'fas fa-crosshairs' },
  { key: 'configure', label: 'Configure', icon: 'fas fa-cog' },
  { key: 'sitesetup', label: 'Site Setup', icon: 'fas fa-location-dot' },
  { key: 'fleet', label: 'Fleet', icon: 'fas fa-network-wired' },
  { key: 'wireguard', label: 'WireGuard', icon: 'fas fa-shield-halved' }
]

const loading = ref(false)
const routers = ref([])
const locations = ref([])
const search = ref('')
const statusFilter = ref('')
const toast = ref(null)
let liveRefreshTimer = null

// Detect
const detectForm = ref({ ip: '', port: 8728, user: 'admin', password: '' })
const detecting = ref(false)
const autoDetecting = ref(false)
const detectResult = ref(null)
const scanning = ref(false)
const scanResults = ref([])

// Configure
const configForm = ref({ routerName: '', ssid: 'HotBando-Free-WiFi', locationId: null, latitude: null, longitude: null })
const configRunning = ref(false)
const configProgress = ref(null)
const configSteps = [
  { title: 'Connect to MikroTik', desc: 'Establish API connection and identify the device' },
  { title: 'Check WireGuard support', desc: 'Verify WireGuard package and existing interfaces' },
  { title: 'Scan interfaces', desc: 'Enumerate available network interfaces' },
  { title: 'Generate WireGuard keys', desc: 'Create keypairs for server and router' },
  { title: 'Push config to router', desc: 'Create WG interface, peer, IP, routes, firewall' },
  { title: 'Register in database', desc: 'Save router details and WireGuard info' },
  { title: 'Update server peers', desc: 'Add router as peer on the HotBando server' },
  { title: 'Verify tunnel', desc: 'Test WireGuard connectivity' }
]

// Terminal
const showTerminal = ref(false)
const terminalTitle = ref('WireGuard Setup')
const terminalRunning = ref(false)
const terminalSuccess = ref(false)
const terminalError = ref(false)
const terminalProgress = ref(null)
const terminalLines = ref([])

// Fleet
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const form = ref({ router_id: '', router_name: '', host: '', port: 8728, user: 'admin', password: '', ssid: '', location_id: null })
const detailRouter = ref(null)

// WireGuard
const wgServer = ref({})
const wgPeers = ref([])
const applyingServer = ref(false)

const stats = computed(() => ({
  total: routers.value.length,
  online: routers.value.filter(r => r.status === 'online').length,
  pending: routers.value.filter(r => r.setup_status === 'pending').length,
  wireguard: routers.value.filter(r => r.wireguard_configured || r.wireguard_ip).length,
  activeUsers: routers.value.reduce((sum, r) => sum + (r.active_users || 0), 0)
}))

const filteredRouters = computed(() => {
  return routers.value.filter(r => {
    const q = search.value.toLowerCase()
    const matchSearch = !q || (r.router_name || '').toLowerCase().includes(q) || (r.router_id || '').toLowerCase().includes(q) || (r.host || '').includes(q)
    const matchStatus = !statusFilter.value || statusFilter.value === 'pending'
      ? statusFilter.value === 'pending' ? r.setup_status === 'pending' : true
      : r.status === statusFilter.value
    return matchSearch && matchStatus
  })
})

const detailInfoItems = computed(() => {
  if (!detailRouter.value) return []
  const r = detailRouter.value
  return [
    { label: 'Model', value: r.model },
    { label: 'Firmware', value: r.firmware_version },
    { label: 'Serial', value: r.serial_number },
    { label: 'SSID', value: r.ssid },
    { label: 'Location', value: r.location_name },
    { label: 'WireGuard IP', value: r.wireguard_ip },
    { label: 'WireGuard Configured', value: r.wireguard_configured ? 'Yes' : 'No' }
  ]
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

onMounted(async () => {
  loading.value = true
  await Promise.all([loadRouters(), loadLocations(), loadWGStatus()])
  loading.value = false
  liveRefreshTimer = window.setInterval(() => loadRouters(), 60000)
})
onUnmounted(() => window.clearInterval(liveRefreshTimer))

async function refreshAll() {
  loading.value = true
  await Promise.all([loadRouters(), loadLocations(), loadWGStatus()])
  loading.value = false
}

async function loadRouters() {
  try {
    const [r, live] = await Promise.all([adminGet('/routers'), adminGet('/routers/status-all')])
    const liveById = new Map((live.routers || []).map(item => [String(item.routerId), item]))
    routers.value = (r.routers || r.data || []).map(router => {
      const current = liveById.get(String(router.router_id))
      return current ? {
        ...router,
        status: current.isOnline ? 'online' : 'offline',
        apiReachable: !!current.apiReachable,
        total_users: Number(current.totalUsers ?? router.customer_count ?? 0),
        active_users: current.apiReachable ? Number(current.activeUsers || 0) : null,
        cpu_load: current.apiReachable ? Number(current.cpu || 0) : null,
        memory_usage: current.apiReachable ? Number(current.memory || 0) : null,
        live_checked_at: new Date().toISOString(),
      } : router
    })
  }
  catch (e) { console.error(e) }
}

async function loadLocations() {
  try { const r = await adminGet('/locations'); locations.value = r.locations || r.data || [] }
  catch (e) { console.error(e) }
}

async function loadWGStatus() {
  try {
    const r = await adminGet('/mikrotik-setup/server-status')
    wgServer.value = r.server || {}
    wgPeers.value = r.peers || []
  } catch (e) { console.error(e) }
}

// ── Detect ──
async function detectRouter() {
  detecting.value = true
  detectResult.value = null
  try {
    const params = new URLSearchParams({
      ip: detectForm.value.ip,
      port: detectForm.value.port,
      user: detectForm.value.user,
      password: detectForm.value.password
    })
    const r = await adminGet('/mikrotik-setup/detect?' + params.toString())
    detectResult.value = r
    if (r.isMikrotik && !r.inDatabase) {
      configForm.value.routerName = r.identity || ''
    }
    if (r.credentialsAuto) {
      detectForm.value.user = r.credentialsAuto.user
      detectForm.value.password = r.credentialsAuto.password
      showToast('Default MikroTik credentials detected automatically — ready to configure', 'success')
    }
  } catch (e) {
    detectResult.value = { isMikrotik: false, message: e.response?.data?.message || e.message || 'Connection failed' }
  }
  detecting.value = false
}

async function scanNetwork() {
  scanning.value = true
  scanResults.value = []
  try {
    const r = await adminGet('/mikrotik-setup/scan')
    scanResults.value = r.devices || []
  } catch (e) {
    showToast('Scan failed: ' + (e.message || 'Unknown error'), 'error')
  }
  scanning.value = false
}

async function useDetected(d) {
  detectForm.value.ip = d.ip
  detectForm.value.port = d.port || 8728
  activeTab.value = 'configure'
  await detectRouter()
}

// ── One-button auto detect: scan → pick first new MikroTik → detect it ──
async function autoDetect() {
  autoDetecting.value = true
  detectResult.value = null
  try {
    await scanNetwork()
    const fresh = scanResults.value.filter(d => d.isMikrotik && !d.inDatabase)
    if (!fresh.length) {
      if (!scanResults.value.length) {
        detectResult.value = { isMikrotik: false, message: 'No devices found. Plug the MikroTik into this network and try again.' }
      } else {
        showToast('No NEW MikroTik found — all detected devices are already registered', 'error')
      }
      return
    }
    const d = fresh[0]
    detectForm.value.ip = d.ip
    detectForm.value.port = d.port || 8728
    detectForm.value.user = 'admin'
    detectForm.value.password = ''
    await detectRouter()
    if (detectResult.value?.isMikrotik && !detectResult.value?.inDatabase) {
      showToast('Router detected — press Auto-Configure Now', 'success')
    }
  } finally {
    autoDetecting.value = false
  }
}

// ── One-button auto configure with sensible defaults ──
async function quickConfigure() {
  configForm.value.routerName = detectResult.value?.identity || ('Router-' + detectForm.value.ip.replace(/\./g, '-'))
  configForm.value.ssid = 'HotBando-Free-WiFi'
  configForm.value.locationId = null
  configForm.value.latitude = null
  configForm.value.longitude = null
  startWireGuardConfig()
}

// ── Detect a tunnel (remote) device as if it were local ──
async function checkDetected(d) {
  detectForm.value.ip = d.ip
  detectForm.value.port = d.port || 8728
  await detectRouter()
}

// ── WireGuard Configure (SSE) ──
function startConfigure() {
  configForm.value.routerName = detectResult.value?.identity || ''
  activeTab.value = 'configure'
}

function onLocationSelect() {
  const loc = locations.value.find(l => l.id === configForm.value.locationId)
  if (loc && loc.latitude && loc.longitude) {
    configForm.value.latitude = loc.latitude
    configForm.value.longitude = loc.longitude
  }
}

function startWireGuardConfig() {
  if (!detectForm.value.ip) return showToast('Enter router IP first', 'error')

  terminalLines.value = []
  terminalRunning.value = true
  terminalSuccess.value = false
  terminalError.value = false
  terminalProgress.value = null
  terminalTitle.value = 'WireGuard Setup - ' + (detectForm.value.ip)
  showTerminal.value = true
  configRunning.value = true

  const token = document.cookie.match(/hotbando_session=([^;]+)/)?.[1] || ''

  fetch('/api/admin/mikrotik-setup/configure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ip: detectForm.value.ip,
      port: detectForm.value.port,
      user: detectForm.value.user,
      password: detectForm.value.password,
      routerName: configForm.value.routerName,
      ssid: configForm.value.ssid,
      locationId: configForm.value.locationId,
      latitude: configForm.value.latitude,
      longitude: configForm.value.longitude
    }),
    credentials: 'same-origin'
  }).then(response => {
    if (!response.ok) throw new Error('HTTP ' + response.status)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    function read() {
      reader.read().then(({ done, value }) => {
        if (done) {
          terminalRunning.value = false
          configRunning.value = false
          return
        }
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop()

        for (const evt of events) {
          const eventMatch = evt.match(/^event: (.+)$/m)
          const dataMatch = evt.match(/^data: (.+)$/m)
          if (!eventMatch || !dataMatch) continue

          const eventType = eventMatch[1]
          let data
          try { data = JSON.parse(dataMatch[1]) } catch { continue }

          if (eventType === 'log') {
            terminalLines.value.push({ message: data.message, type: data.type, time: data.time })
          } else if (eventType === 'progress') {
            terminalProgress.value = data
            configProgress.value = data
          } else if (eventType === 'detected') {
            terminalLines.value.push({ message: 'Detected: ' + data.identity + ' (' + data.model + ')', type: 'success' })
          } else if (eventType === 'keys-generated') {
            terminalLines.value.push({ message: 'Assigned WireGuard IP: ' + data.assignedIp, type: 'info' })
          } else if (eventType === 'done') {
            terminalSuccess.value = true
            terminalRunning.value = false
            configRunning.value = false
            if (data.router) {
              terminalLines.value.push({ message: 'Router ID: ' + data.router.routerID, type: 'success' })
            }
            loadRouters()
            loadWGStatus()
          } else if (eventType === 'error') {
            terminalError.value = true
            terminalRunning.value = false
            configRunning.value = false
          }
        }
        read()
      })
    }
    read()
  }).catch(err => {
    terminalLines.value.push({ message: 'Connection error: ' + err.message, type: 'error' })
    terminalError.value = true
    terminalRunning.value = false
    configRunning.value = false
  })
}

// ── Site setup ──
const bootstrapScript = ref('')
const loadingBootstrap = ref(false)
const pendingRouters = computed(() => routers.value.filter(r => r.setup_status === 'pending'))

async function loadBootstrap() {
  loadingBootstrap.value = true
  try {
    const r = await adminGet('/mikrotik-setup/bootstrap')
    bootstrapScript.value = r.script || ''
  } catch (e) {
    showToast('Failed to load site script', 'error')
  }
  loadingBootstrap.value = false
}

async function copyBootstrap() {
  try {
    await navigator.clipboard.writeText(bootstrapScript.value)
    showToast('Site script copied — send it via WhatsApp', 'success')
  } catch (e) {
    showToast('Copy failed — select the text manually', 'error')
  }
}

// ── Fleet management ──
function editRouter(r) {
  form.value = { router_id: r.router_id, router_name: r.router_name, host: r.host, port: r.port || 8728, user: r.user || 'admin', password: '', ssid: r.ssid, location_id: r.location_id }
  editing.value = r
  showForm.value = true
}

function viewRouter(r) { detailRouter.value = r }

async function saveRouter() {
  saving.value = true
  try {
    if (editing.value) {
      const payload = { ...form.value }
      if (!payload.password) delete payload.password
      await adminPut('/routers/' + editing.value.id, payload)
      showToast('Router updated')
    } else {
      await adminPost('/routers', form.value)
      showToast('Router added')
    }
    showForm.value = false
    editing.value = null
    await loadRouters()
  } catch (e) {
    showToast(e.response?.data?.error || e.message || 'Failed to save', 'error')
  }
  saving.value = false
}

async function deleteRouter(r) {
  if (!confirm('Delete "' + (r.router_name || r.router_id) + '"?')) return
  try {
    await adminDelete('/routers/' + r.id)
    showToast('Router deleted')
    if (detailRouter.value?.id === r.id) detailRouter.value = null
    await loadRouters()
  } catch (e) { showToast('Delete failed', 'error') }
}

async function connectRouter(r) {
  if (!confirm('Connect "' + (r.router_name || r.router_id) + '" now? WireGuard peer will be added and the router will pull and apply its full config on its next poll (≤2 min).')) return
  try {
    const res = await adminPost('/routers/' + r.router_id + '/connect')
    showToast(res.message || 'Router connected — configuring')
    await loadRouters()
  } catch (e) { showToast(e.response?.data?.message || e.message || 'Connect failed', 'error') }
}

async function applyServerConfig() {
  applyingServer.value = true
  try {
    const r = await adminPost('/mikrotik-setup/apply-server')
    showToast(r.message || 'Applied')
    await loadWGStatus()
  } catch (e) { showToast('Apply failed', 'error') }
  applyingServer.value = false
}
</script>
