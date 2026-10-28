<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Locations & Router Map</h2>
        <p class="text-sm" style="color: #6b7280">Manage locations and monitor router deployment on live map</p>
      </div>
      <div class="flex gap-2">
        <button @click="refreshAll()" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
        <button @click="openAddLocation()" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Add Location</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Locations</p>
            <p class="stat-value">{{ locations.length }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-map-marker-alt"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Routers Online</p>
            <p class="stat-value" style="color: #34d399">{{ routersOnline }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-check-circle"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Routers Offline</p>
            <p class="stat-value" style="color: #f87171">{{ routersOffline }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #f87171"><i class="fas fa-times-circle"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">Total Users</p>
            <p class="stat-value" style="color: #a78bfa">{{ totalUsers }}</p>
          </div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-users"></i></div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="section-card" style="padding: 4px">
      <div class="flex gap-1">
        <button @click="activeTab = 'map'" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :style="activeTab === 'map' ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'background: transparent; color: #6b7280'">
          <i class="fas fa-map mr-1.5"></i>Live Map
        </button>
        <button @click="activeTab = 'list'" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :style="activeTab === 'list' ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'background: transparent; color: #6b7280'">
          <i class="fas fa-list mr-1.5"></i>Locations List
        </button>
        <button @click="activeTab = 'routers'" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :style="activeTab === 'routers' ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'background: transparent; color: #6b7280'">
          <i class="fas fa-router mr-1.5"></i>Router Fleet
        </button>
      </div>
    </div>

    <!-- ===================== MAP TAB ===================== -->
    <template v-if="activeTab === 'map'">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <!-- Map (3/4 width) -->
        <div class="lg:col-span-3 section-card overflow-hidden" style="padding: 0">
          <div ref="mapRef" class="w-full" style="height: 650px"></div>
        </div>

        <!-- Sidebar (1/4 width) -->
        <div class="space-y-4">
          <!-- Layer Controls -->
          <div class="section-card">
            <div class="section-header">
              <h3 class="section-title"><i class="fas fa-layer-group" style="color: #FF7A30"></i> Map Layers</h3>
            </div>
            <div class="section-body space-y-2">
              <label class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.03]">
                <input type="radio" v-model="mapLayer" value="street" class="accent-[#FF7A30]" @change="switchLayer">
                <i class="fas fa-road w-5 text-center text-sm" style="color: #60a5fa"></i>
                <span class="text-sm text-white">Street Map</span>
              </label>
              <label class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.03]">
                <input type="radio" v-model="mapLayer" value="satellite" class="accent-[#FF7A30]" @change="switchLayer">
                <i class="fas fa-satellite w-5 text-center text-sm" style="color: #f59e0b"></i>
                <span class="text-sm text-white">Satellite</span>
              </label>
              <label class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.03]">
                <input type="radio" v-model="mapLayer" value="terrain" class="accent-[#FF7A30]" @change="switchLayer">
                <i class="fas fa-mountain w-5 text-center text-sm" style="color: #34d399"></i>
                <span class="text-sm text-white">Terrain</span>
              </label>
            </div>
          </div>

          <!-- Marker Toggles -->
          <div class="section-card">
            <div class="section-header">
              <h3 class="section-title"><i class="fas fa-toggle-on" style="color: #60a5fa"></i> Markers</h3>
            </div>
            <div class="section-body space-y-2">
              <label class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.03]">
                <input type="checkbox" v-model="showLocationMarkers" @change="updateMarkers" class="accent-[#FF7A30]">
                <div class="w-3 h-3 rounded-full" style="background: #3b82f6"></div>
                <span class="text-sm text-white">Locations</span>
                <span class="ml-auto text-xs" style="color: #6b7280">{{ locations.length }}</span>
              </label>
              <label class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.03]">
                <input type="checkbox" v-model="showOnlineRouters" @change="updateMarkers" class="accent-[#FF7A30]">
                <div class="w-3 h-3 rounded-full" style="background: #34d399"></div>
                <span class="text-sm text-white">Online Routers</span>
                <span class="ml-auto text-xs" style="color: #6b7280">{{ routersOnline }}</span>
              </label>
              <label class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.03]">
                <input type="checkbox" v-model="showOfflineRouters" @change="updateMarkers" class="accent-[#FF7A30]">
                <div class="w-3 h-3 rounded-full" style="background: #ef4444"></div>
                <span class="text-sm text-white">Offline Routers</span>
                <span class="ml-auto text-xs" style="color: #6b7280">{{ routersOffline }}</span>
              </label>
            </div>
          </div>

          <!-- Router Quick List -->
          <div class="section-card">
            <div class="section-header">
              <h3 class="section-title"><i class="fas fa-router" style="color: #FF7A30"></i> On Map</h3>
            </div>
            <div class="section-body max-h-64 overflow-y-auto space-y-1.5">
              <div v-for="r in routersWithCoords" :key="r.id"
                @click="flyToRouter(r)"
                class="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all hover:bg-white/[0.03]"
                style="border: 1px solid transparent" @mouseenter="$event.target.style.borderColor='var(--border)'" @mouseleave="$event.target.style.borderColor='transparent'">
                <div class="w-2 h-2 rounded-full flex-shrink-0" :class="r.status === 'online' ? 'bg-green-500' : 'bg-red-500'"></div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium text-white truncate">{{ r.router_name || r.router_id }}</p>
                  <p class="text-xs truncate" style="color: #6b7280">{{ r.location_name || r.host }}</p>
                </div>
                <span class="text-xs" style="color: #6b7280">{{ r.active_users || 0 }}u</span>
              </div>
              <div v-if="!routersWithCoords.length" class="text-center py-4" style="color: #6b7280">
                <p class="text-xs">No routers with coordinates</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== LIST TAB ===================== -->
    <template v-if="activeTab === 'list'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-map-marker-alt" style="color: #FF7A30"></i> All Locations</h3>
          <div class="flex gap-2">
            <input v-model="listSearch" placeholder="Search..." class="form-input" style="max-width: 200px">
            <select v-model="listTypeFilter" class="form-input" style="max-width: 140px">
              <option value="">All Types</option>
              <option v-for="t in locationTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
        </div>
        <div class="section-body">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr style="border-bottom: 1px solid var(--border)">
                  <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Name</th>
                  <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">City / Region</th>
                  <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Type</th>
                  <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Coords</th>
                  <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Routers</th>
                  <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="loc in filteredLocations" :key="loc.id" style="border-bottom: 1px solid rgba(30,30,42,0.5)" class="hover:bg-white/[0.02]">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <div class="w-2 h-2 rounded-full" style="background: #3b82f6"></div>
                      <span class="font-medium text-white">{{ loc.name }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-[#d1d5db]">{{ loc.city }}, {{ loc.region }}</td>
                  <td class="py-3 px-4"><span class="text-xs px-2 py-0.5 rounded-full" :class="typeBadgeClass(loc.location_type)">{{ loc.location_type }}</span></td>
                  <td class="py-3 px-4 font-mono text-xs" style="color: #6b7280">{{ loc.latitude ? loc.latitude.toFixed(4) : '—' }}, {{ loc.longitude ? loc.longitude.toFixed(4) : '—' }}</td>
                  <td class="py-3 px-4 text-white">{{ routersForLocation(loc.id).length }}</td>
                  <td class="py-3 px-4 text-right">
                    <button @click="editLocation(loc)" class="p-1.5 rounded-lg transition-colors" style="color: #6b7280" title="Edit"><i class="fas fa-edit hover:text-[#FF7A30] text-xs"></i></button>
                    <button @click="flyToLocation(loc)" class="p-1.5 rounded-lg transition-colors" style="color: #6b7280" title="Show on map"><i class="fas fa-map-marked-alt hover:text-blue-400 text-xs"></i></button>
                    <button @click="deleteLocation(loc.id)" class="p-1.5 rounded-lg transition-colors" style="color: #6b7280" title="Delete"><i class="fas fa-trash hover:text-red-400 text-xs"></i></button>
                  </td>
                </tr>
                <tr v-if="!filteredLocations.length">
                  <td colspan="6" class="text-center py-12" style="color: #6b7280">
                    <i class="fas fa-map-marker-alt text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    <p>No locations found</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="filteredLocations.length" class="flex items-center justify-between mt-4 pt-4" style="border-top: 1px solid var(--border)">
            <p class="text-xs" style="color: #6b7280">Showing {{ filteredLocations.length }} of {{ locations.length }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== ROUTER FLEET TAB ===================== -->
    <template v-if="activeTab === 'routers'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-router" style="color: #FF7A30"></i> Installed Routers</h3>
          <div class="flex gap-2">
            <input v-model="routerSearch" placeholder="Search routers..." class="form-input" style="max-width: 200px">
            <select v-model="routerStatusFilter" class="form-input" style="max-width: 140px">
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
        <div class="section-body">
          <div v-if="filteredRouters.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="r in filteredRouters" :key="r.id"
              class="p-4 rounded-xl transition-all hover:-translate-y-0.5" style="background: #0a0a0f; border: 1px solid var(--border)">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="relative">
                    <div class="w-3 h-3 rounded-full" :class="r.status === 'online' ? 'bg-green-500' : r.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'"></div>
                    <div v-if="r.status === 'online'" class="pulse-online absolute inset-0"></div>
                  </div>
                  <span class="font-semibold text-white text-sm">{{ r.router_name || r.router_id }}</span>
                </div>
                <span class="text-xs px-2 py-0.5 rounded-full" :class="routerStatusClass(r.status)">{{ (r.status || 'offline').toUpperCase() }}</span>
              </div>
              <div class="text-xs space-y-1 mb-3" style="color: #9ca3af">
                <p><i class="fas fa-fingerprint w-4 mr-1" style="color: #4b5563"></i>{{ r.router_id }}</p>
                <p><i class="fas fa-server w-4 mr-1" style="color: #4b5563"></i>{{ r.host }}:{{ r.port || 8728 }}</p>
                <p><i class="fas fa-wifi w-4 mr-1" style="color: #4b5563"></i>{{ r.ssid || '—' }}</p>
                <p><i class="fas fa-map-marker-alt w-4 mr-1" style="color: #4b5563"></i>{{ r.location_name || 'No location' }}</p>
              </div>
              <!-- Health bars -->
              <div v-if="r.status === 'online'" class="grid grid-cols-2 gap-2 mb-3">
                <div class="p-1.5 rounded-lg" style="background: rgba(59,130,246,0.08)">
                  <p class="text-xs" style="color: #6b7280">CPU</p>
                  <div class="flex items-center gap-1 mt-0.5">
                    <div class="flex-1 h-1 rounded-full" style="background: #1e1e2a">
                      <div class="h-full rounded-full" :style="{ width: (r.cpu_load||0)+'%', background: (r.cpu_load||0)>80?'#f87171':'#60a5fa' }"></div>
                    </div>
                    <span class="text-xs font-mono text-white">{{ r.cpu_load||0 }}%</span>
                  </div>
                </div>
                <div class="p-1.5 rounded-lg" style="background: rgba(139,92,246,0.08)">
                  <p class="text-xs" style="color: #6b7280">Memory</p>
                  <div class="flex items-center gap-1 mt-0.5">
                    <div class="flex-1 h-1 rounded-full" style="background: #1e1e2a">
                      <div class="h-full rounded-full" :style="{ width: (r.memory_usage||0)+'%', background: (r.memory_usage||0)>80?'#f87171':'#a78bfa' }"></div>
                    </div>
                    <span class="text-xs font-mono text-white">{{ r.memory_usage||0 }}%</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between pt-3" style="border-top: 1px solid var(--border)">
                <span class="text-xs" style="color: #6b7280"><i class="fas fa-users mr-1"></i>{{ r.active_users || 0 }} users</span>
                <div class="flex gap-1">
                  <button @click="flyToRouter(r); activeTab='map'" class="p-1.5 rounded-lg transition-colors" style="color: #6b7280" title="Show on map"><i class="fas fa-map-marked-alt hover:text-blue-400 text-xs"></i></button>
                  <button @click="remoteReboot(r)" class="p-1.5 rounded-lg transition-colors" style="color: #6b7280" title="Reboot"><i class="fas fa-sync-alt hover:text-yellow-400 text-xs"></i></button>
                  <button @click="remoteSessions(r)" class="p-1.5 rounded-lg transition-colors" style="color: #6b7280" title="Sessions"><i class="fas fa-globe hover:text-green-400 text-xs"></i></button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12" style="color: #6b7280">
            <i class="fas fa-router text-3xl mb-3 block" style="color: #1e1e2a"></i>
            <p>No routers installed yet</p>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== ROUTER CONTROL PANEL (floating on map) ===================== -->
    <div v-if="selectedRouter" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4 rounded-2xl shadow-2xl" style="background: #111118; border: 1px solid var(--border)">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" :class="selectedRouter.status === 'online' ? 'bg-green-500' : 'bg-red-500'"></div>
          <span class="font-bold text-white">{{ selectedRouter.router_name || selectedRouter.router_id }}</span>
          <span class="text-xs px-2 py-0.5 rounded-full" :class="routerStatusClass(selectedRouter.status)">{{ selectedRouter.status || 'offline' }}</span>
        </div>
        <button @click="selectedRouter = null" class="p-1 rounded-lg" style="color: #6b7280"><i class="fas fa-times"></i></button>
      </div>

      <div class="grid grid-cols-3 gap-2 mb-3">
        <div class="p-2 rounded-lg text-center" style="background: rgba(59,130,246,0.08)">
          <p class="text-lg font-bold text-white">{{ selectedRouter.active_users || 0 }}</p>
          <p class="text-xs" style="color: #6b7280">Users</p>
        </div>
        <div class="p-2 rounded-lg text-center" style="background: rgba(16,185,129,0.08)">
          <p class="text-lg font-bold text-white">{{ selectedRouter.cpu_load || 0 }}%</p>
          <p class="text-xs" style="color: #6b7280">CPU</p>
        </div>
        <div class="p-2 rounded-lg text-center" style="background: rgba(139,92,246,0.08)">
          <p class="text-lg font-bold text-white">{{ selectedRouter.memory_usage || 0 }}%</p>
          <p class="text-xs" style="color: #6b7280">Memory</p>
        </div>
      </div>

      <div class="text-xs space-y-1 mb-3" style="color: #9ca3af">
        <p><i class="fas fa-server w-4 mr-1" style="color: #4b5563"></i>{{ selectedRouter.host }}:{{ selectedRouter.port || 8728 }}</p>
        <p v-if="selectedRouter.ssid"><i class="fas fa-wifi w-4 mr-1" style="color: #4b5563"></i>{{ selectedRouter.ssid }}</p>
        <p v-if="selectedRouter.location_name"><i class="fas fa-map-marker-alt w-4 mr-1" style="color: #4b5563"></i>{{ selectedRouter.location_name }}</p>
      </div>

      <div class="flex gap-2">
        <button @click="remoteReboot(selectedRouter)" class="flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all" style="background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2)">
          <i class="fas fa-redo mr-1"></i> Reboot
        </button>
        <button @click="remoteSessions(selectedRouter)" class="flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all" style="background: rgba(59,130,246,0.1); color: #60a5fa; border: 1px solid rgba(59,130,246,0.2)">
          <i class="fas fa-globe mr-1"></i> Sessions
        </button>
        <button @click="remoteStatus(selectedRouter)" class="flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all" style="background: rgba(16,185,129,0.1); color: #34d399; border: 1px solid rgba(16,185,129,0.2)">
          <i class="fas fa-signal mr-1"></i> Status
        </button>
        <button @click="editRouterFromMap(selectedRouter)" class="px-3 py-2 rounded-xl text-xs font-medium transition-all" style="background: rgba(255,122,48,0.1); color: #FF7A30; border: 1px solid rgba(255,122,48,0.2)">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    </div>

    <!-- ===================== SESSIONS MODAL ===================== -->
    <div v-if="sessionsModal" class="fixed inset-0 flex items-center justify-center z-50 p-4" style="background: rgba(0,0,0,0.7)" @click.self="sessionsModal = null">
      <div class="section-card w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div class="p-5 flex items-center justify-between" style="border-bottom: 1px solid var(--border)">
          <div>
            <h3 class="text-lg font-bold text-white">Active Sessions</h3>
            <p class="text-xs" style="color: #6b7280">{{ sessionsModal.router_name || sessionsModal.router_id }}</p>
          </div>
          <button @click="sessionsModal = null" class="p-2 rounded-lg" style="color: #6b7280"><i class="fas fa-times text-lg hover:text-white"></i></button>
        </div>
        <div class="p-5">
          <div v-if="routerSessions.length" class="space-y-2">
            <div v-for="s in routerSessions" :key="s.id || s.name" class="flex items-center justify-between p-3 rounded-xl" style="background: #0a0a0f; border: 1px solid var(--border)">
              <div>
                <p class="text-sm font-medium text-white">{{ s.name || s.user || 'Guest' }}</p>
                <p class="text-xs font-mono" style="color: #6b7280">{{ s.address || s.ip || '' }} &middot; {{ s.uptime || '' }}</p>
              </div>
              <button @click="kickUser(s)" class="text-xs px-3 py-1.5 rounded-lg" style="background: rgba(239,68,68,0.1); color: #f87171">
                <i class="fas fa-user-slash mr-1"></i> Kick
              </button>
            </div>
          </div>
          <div v-else class="text-center py-8" style="color: #6b7280">
            <p>No active sessions</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== ADD/EDIT LOCATION MODAL ===================== -->
    <div v-if="showForm" class="fixed inset-0 flex items-center justify-center z-50 p-4" style="background: rgba(0,0,0,0.6)" @click.self="showForm = false">
      <div class="section-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-5 flex items-center justify-between" style="border-bottom: 1px solid var(--border)">
          <h3 class="text-lg font-bold text-white">{{ editing ? 'Edit Location' : 'Add New Location' }}</h3>
          <button @click="showForm = false" class="p-2 rounded-lg" style="color: #6b7280"><i class="fas fa-times text-lg hover:text-white"></i></button>
        </div>
        <div class="p-5">
          <form @submit.prevent="saveLocation" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="input-label">Name *</label><input v-model="form.name" required class="form-input"></div>
              <div><label class="input-label">City *</label><input v-model="form.city" required class="form-input"></div>
              <div><label class="input-label">Region</label><input v-model="form.region" class="form-input"></div>
              <div>
                <label class="input-label">Type</label>
                <select v-model="form.location_type" class="form-input">
                  <option v-for="t in locationTypes" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>
            <div><label class="input-label">Address</label><input v-model="form.address" class="form-input"></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="input-label">Latitude</label><input v-model.number="form.latitude" type="number" step="any" class="form-input" placeholder="-6.7924"></div>
              <div><label class="input-label">Longitude</label><input v-model.number="form.longitude" type="number" step="any" class="form-input" placeholder="39.2083"></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="input-label">Branch</label>
                <select v-model="form.branch_id" class="form-input">
                  <option :value="null">Unassigned</option>
                  <option v-for="branch in branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
                </select>
              </div>
              <div>
                <label class="input-label">Approx. Wi-Fi coverage (metres)</label>
                <input v-model.number="form.coverage_radius_m" type="number" min="1" max="50000" class="form-input" placeholder="e.g. 150">
              </div>
            </div>
            <p class="text-[11px]" style="color:#6b7280">Coverage is an approximate planning radius set by your team; walls, access points and interference affect real signal.</p>
            <div>
              <button type="button" @click="pickFromMap()" class="w-full px-3 py-2 rounded-xl text-xs font-medium transition-all" style="background: rgba(59,130,246,0.1); color: #60a5fa; border: 1px dashed rgba(59,130,246,0.3)">
                <i class="fas fa-map-pin mr-1"></i> Click on map to pick coordinates
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="input-label">Contact Person</label><input v-model="form.contact_person" class="form-input"></div>
              <div><label class="input-label">Contact Phone</label><input v-model="form.contact_phone" class="form-input"></div>
            </div>
            <div class="flex justify-end gap-3 pt-3" style="border-top: 1px solid var(--border)">
              <button type="button" @click="showForm = false" class="btn btn-ghost">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                <i v-if="saving" class="fas fa-spinner fa-spin mr-1"></i>
                {{ editing ? 'Save Changes' : 'Add Location' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slideIn" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { adminGet, adminPost, adminPut, adminDelete } from '../../api/client'

const activeTab = ref('map')
const loading = ref(false)
const locations = ref([])
const branches = ref([])
const routers = ref([])
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const mapRef = ref(null)
let map = null
let tileLayer = null
let markerLayer = null
let liveRefreshTimer = null

const mapLayer = ref('street')
const showLocationMarkers = ref(true)
const showOnlineRouters = ref(true)
const showOfflineRouters = ref(true)

const selectedRouter = ref(null)
const sessionsModal = ref(null)
const routerSessions = ref([])

const listSearch = ref('')
const listTypeFilter = ref('')
const routerSearch = ref('')
const routerStatusFilter = ref('')

const form = ref({ name: '', city: '', region: '', address: '', latitude: null, longitude: null, location_type: 'University', contact_person: '', contact_phone: '' })
const toast = ref({ show: false, message: '', type: 'success' })

const locationTypes = ['University', 'Hostel', 'Mall', 'Market', 'Office', 'Restaurant', 'Bar', 'Cafe', 'Other']

const routersOnline = computed(() => routers.value.filter(r => r.status === 'online').length)
const routersOffline = computed(() => routers.value.filter(r => r.status !== 'online').length)
const totalUsers = computed(() => routers.value.reduce((s, r) => s + (r.active_users || 0), 0))

const routersWithCoords = computed(() => routers.value.filter(r => r.latitude && r.longitude))

const filteredLocations = computed(() => {
  const q = listSearch.value.toLowerCase()
  return locations.value.filter(loc => {
    const matchQ = !q || (loc.name || '').toLowerCase().includes(q) || (loc.city || '').toLowerCase().includes(q)
    const matchT = !listTypeFilter.value || loc.location_type === listTypeFilter.value
    return matchQ && matchT
  })
})

const filteredRouters = computed(() => {
  const q = routerSearch.value.toLowerCase()
  return routers.value.filter(r => {
    const matchQ = !q || (r.router_name || '').toLowerCase().includes(q) || (r.router_id || '').toLowerCase().includes(q) || (r.host || '').includes(q)
    const matchS = !routerStatusFilter.value || r.status === routerStatusFilter.value
    return matchQ && matchS
  })
})

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

function routerStatusClass(s) {
  if (s === 'online') return 'bg-green-500/10 text-green-400'
  if (s === 'maintenance') return 'bg-yellow-500/10 text-yellow-400'
  return 'bg-red-500/10 text-red-400'
}

function typeBadgeClass(t) {
  const m = { University: 'bg-blue-500/10 text-blue-400', Hostel: 'bg-yellow-500/10 text-yellow-400', Mall: 'bg-purple-500/10 text-purple-400', Market: 'bg-green-500/10 text-green-400', Office: 'bg-gray-500/10 text-gray-400', Restaurant: 'bg-orange-500/10 text-orange-400', Bar: 'bg-pink-500/10 text-pink-400', Cafe: 'bg-cyan-500/10 text-cyan-400', Other: 'bg-gray-500/10 text-gray-400' }
  return m[t] || 'bg-gray-500/10 text-gray-400'
}

function routersForLocation(locId) {
  return routers.value.filter(r => r.location_id === locId)
}

onMounted(async () => {
  loading.value = true
  await Promise.all([loadLocations(), loadRouters(), loadBranches()])
  if (activeTab.value === 'map') await nextTick(initMap)
  loading.value = false
  liveRefreshTimer = window.setInterval(() => loadRouters(), 60000)
})
onUnmounted(() => window.clearInterval(liveRefreshTimer))

watch(activeTab, async (v) => {
  if (v === 'map') { await nextTick(); initMap() }
})

async function refreshAll() {
  loading.value = true
  await Promise.all([loadLocations(), loadRouters(), loadBranches()])
  if (activeTab.value === 'map' && map) updateMarkers()
  loading.value = false
}

async function loadLocations() {
  try { const r = await adminGet('/locations/'); locations.value = r.locations || r.data || [] } catch (e) { console.error(e) }
}

async function loadRouters() {
  try {
    const [r, live] = await Promise.all([adminGet('/routers/'), adminGet('/routers/status-all')])
    const liveById = new Map((live.routers || []).map(item => [String(item.routerId), item]))
    routers.value = (r.routers || r.data || []).map(router => {
      const current = liveById.get(String(router.router_id))
      return current ? {
        ...router,
        status: current.isOnline ? 'online' : 'offline',
        active_users: Number(current.activeUsers || 0),
        cpu_load: Number(current.cpu || 0),
        memory_usage: Number(current.memory || 0),
        live_checked_at: live.timestamp || new Date().toISOString(),
      } : router
    })
    if (map && activeTab.value === 'map') updateMarkers()
  } catch (e) { console.error(e) }
}

async function loadBranches() {
  try { const r = await adminGet('/hq/branches?limit=1000'); branches.value = r.data || r.branches || [] } catch (e) { console.error(e) }
}

// ===================== MAP =====================
const tileUrls = {
  street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
}

const tileAttributions = {
  street: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  satellite: '&copy; Esri, Maxar, Earthstar Geographics',
  terrain: '&copy; OpenTopoMap, OpenStreetMap'
}

function initMap() {
  if (!mapRef.value) return
  if (map) { map.remove(); map = null }

  map = L.map(mapRef.value, { zoomControl: false, attributionControl: true }).setView([-6.7924, 39.2083], 6)
  L.control.zoom({ position: 'topright' }).addTo(map)

  tileLayer = L.tileLayer(tileUrls.street, {
    maxZoom: 19,
    attribution: tileAttributions.street
  }).addTo(map)

  // Layers control
  const baseLayers = {
    'Street': L.tileLayer(tileUrls.street, { maxZoom: 19, attribution: tileAttributions.street }),
    'Satellite': L.tileLayer(tileUrls.satellite, { maxZoom: 18, attribution: tileAttributions.satellite }),
    'Terrain': L.tileLayer(tileUrls.terrain, { maxZoom: 17, attribution: tileAttributions.terrain })
  }
  L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map)

  markerLayer = L.layerGroup().addTo(map)

  // Click on map to place location
  map.on('click', (e) => {
    if (pickingCoords.value) {
      form.value.latitude = parseFloat(e.latlng.lat.toFixed(6))
      form.value.longitude = parseFloat(e.latlng.lng.toFixed(6))
      pickingCoords.value = false
      showToast('Coordinates selected: ' + e.latlng.lat.toFixed(4) + ', ' + e.latlng.lng.toFixed(4))
    }
  })

  updateMarkers()
}

function switchLayer() {
  if (!tileLayer || !map) return
  map.removeLayer(tileLayer)
  tileLayer = L.tileLayer(tileUrls[mapLayer.value], {
    maxZoom: 19,
    attribution: tileAttributions[mapLayer.value]
  }).addTo(map)
}

function updateMarkers() {
  if (!markerLayer) return
  markerLayer.clearLayers()

  // Location markers
  if (showLocationMarkers.value) {
    locations.value.forEach(loc => {
      if (!loc.latitude || !loc.longitude) return
      const routerCount = routersForLocation(loc.id).length
      const liveUsers = routersForLocation(loc.id).reduce((sum, router) => sum + Number(router.active_users || 0), 0)
      if (Number(loc.coverage_radius_m) > 0) {
        L.circle([loc.latitude, loc.longitude], {
          radius: Number(loc.coverage_radius_m), color: '#3b82f6', weight: 1,
          fillColor: '#3b82f6', fillOpacity: 0.12
        }).addTo(markerLayer).bindPopup(`${loc.name}: configured coverage estimate ${Number(loc.coverage_radius_m)} m`)
      }
      const icon = L.divIcon({
        html: `<div style="background:#3b82f6;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(59,130,246,0.4);font-size:11px;font-weight:700">${routerCount || '📍'}</div>`,
        className: '', iconSize: [28, 28], iconAnchor: [14, 14]
      })
      const mkr = L.marker([loc.latitude, loc.longitude], { icon }).addTo(markerLayer)
      mkr.bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:700;font-size:14px;color:#1a1a2e;margin-bottom:4px">${loc.name}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px">${loc.city || ''}, ${loc.region || ''}</div>
          <div style="font-size:12px;color:#3b82f6">Routers: ${routerCount} &bull; ${loc.location_type}</div>
          <div style="font-size:12px;color:#6b7280">Branch: ${loc.branch_name || 'Unassigned'} &bull; Live active users: ${liveUsers}</div>
          ${Number(loc.coverage_radius_m) > 0 ? `<div style="font-size:12px;color:#6b7280">Configured coverage estimate: ${Number(loc.coverage_radius_m)} m</div>` : '<div style="font-size:12px;color:#b45309">Coverage radius not configured</div>'}
        </div>
      `)
    })
  }

  // Router markers
  const showOnline = showOnlineRouters.value
  const showOffline = showOfflineRouters.value
  routers.value.forEach(r => {
    if (!r.latitude || !r.longitude) return
    const isOnline = r.status === 'online'
    if (isOnline && !showOnline) return
    if (!isOnline && !showOffline) return

    const color = isOnline ? '#22c55e' : '#ef4444'
    const pulse = isOnline ? `box-shadow: 0 0 0 4px rgba(34,197,94,0.2)` : ''
    const icon = L.divIcon({
      html: `<div style="position:relative">
        <div style="background:${color};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.3);${pulse}">
          <i class="fas fa-router" style="color:#fff;font-size:14px"></i>
        </div>
        ${isOnline ? '<div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:#22c55e;border-radius:50%;border:2px solid #fff"></div>' : ''}
      </div>`,
      className: '', iconSize: [36, 36], iconAnchor: [18, 18]
    })
    const mkr = L.marker([r.latitude, r.longitude], { icon }).addTo(markerLayer)
    mkr.bindPopup(`
      <div style="min-width:200px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <div style="width:10px;height:10px;border-radius:50%;background:${color}"></div>
          <span style="font-weight:700;font-size:14px;color:#1a1a2e">${r.router_name || r.router_id}</span>
        </div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">${r.host}:${r.port || 8728}</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">${r.ssid || 'No SSID'}</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Branch: ${r.branch_name || r.location_branch_name || 'Unassigned'}</div>
        <div style="font-size:12px;color:#FF7A30;margin-bottom:8px">Users: ${r.active_users || 0} &bull; ${r.status || 'offline'}</div>
        <button onclick="window.__selectRouter && window.__selectRouter(${r.id})" style="width:100%;padding:6px 12px;background:#FF7A30;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">Remote Control</button>
      </div>
    `, { maxWidth: 250 })

    // Click to select
    mkr.on('click', () => { window.__selectRouter = selectRouterById })
  })
}

function selectRouterById(id) {
  selectedRouter.value = routers.value.find(r => r.id === id) || null
}

// Make it globally accessible for Leaflet popup onclick
window.__selectRouter = null

function flyToRouter(r) {
  if (!map || !r.latitude || !r.longitude) return
  map.flyTo([r.latitude, r.longitude], 15, { duration: 1.2 })
  selectedRouter.value = r
}

function flyToLocation(loc) {
  if (!map || !loc.latitude || !loc.longitude) return
  activeTab.value = 'map'
  nextTick(() => {
    if (!map) initMap()
    setTimeout(() => map.flyTo([loc.latitude, loc.longitude], 14, { duration: 1.2 }), 200)
  })
}

// ===================== FORM =====================
const pickingCoords = ref(false)

function openAddLocation() {
  editing.value = null
  form.value = { name: '', city: '', region: '', address: '', latitude: null, longitude: null, branch_id: null, coverage_radius_m: null, location_type: 'University', contact_person: '', contact_phone: '' }
  showForm.value = true
}

function editLocation(loc) {
  form.value = { ...loc }
  editing.value = loc
  showForm.value = true
}

function pickFromMap() {
  pickingCoords.value = true
  showForm.value = true
  activeTab.value = 'map'
  nextTick(() => {
    if (!map) initMap()
    showToast('Click on the map to set coordinates', 'success')
  })
}

async function saveLocation() {
  saving.value = true
  try {
    if (editing.value) {
      await adminPut('/locations/' + editing.value.id, form.value)
      showToast('Location updated successfully')
    } else {
      await adminPost('/locations/', form.value)
      showToast('Location added successfully')
    }
    showForm.value = false; editing.value = null
    await loadLocations()
    if (map) updateMarkers()
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to save location', 'error')
  }
  saving.value = false
}

async function deleteLocation(id) {
  if (!confirm('Delete this location?')) return
  try {
    await adminDelete('/locations/' + id)
    showToast('Location deleted')
    await loadLocations()
    if (map) updateMarkers()
  } catch (e) {
    showToast('Failed to delete location', 'error')
  }
}

// ===================== REMOTE CONTROLS =====================
async function remoteReboot(r) {
  if (!confirm('Reboot "' + (r.router_name || r.router_id) + '"?')) return
  try {
    await adminPost('/routers/' + r.router_id + '/reboot')
    showToast('Router is rebooting...')
  } catch { showToast('Failed to reboot', 'error') }
}

async function remoteSessions(r) {
  sessionsModal.value = r
  routerSessions.value = []
  try {
    const data = await adminGet('/routers/' + r.router_id + '/hotspot/sessions')
    routerSessions.value = data.sessions || data.data || []
  } catch { routerSessions.value = [] }
}

async function remoteStatus(r) {
  try {
    const data = await adminGet('/routers/' + r.router_id + '/status')
    if (data.success) {
      selectedRouter.value = { ...r, ...(data.health || data.data || {}) }
      showToast('Router status updated')
    } else {
      showToast(data.message || 'Router unreachable', 'error')
    }
  } catch { showToast('Failed to get status', 'error') }
}

function kickUser(s) {
  showToast('User kicked: ' + (s.name || s.user || 'guest'))
}

function editRouterFromMap(r) {
  showToast('Edit router from Router Fleet tab')
  activeTab.value = 'routers'
}
</script>

<style scoped>
.pulse-online {
  animation: pulse-ring 2s ease-out infinite;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.4);
}
@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}
:deep(.leaflet-popup-content-wrapper) {
  background: #fff !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 30px rgba(0,0,0,0.2) !important;
  border: none !important;
}
:deep(.leaflet-popup-tip) {
  background: #fff !important;
}
:deep(.leaflet-popup-content) {
  margin: 12px 16px !important;
  color: #1a1a2e !important;
}
:deep(.leaflet-control-layers) {
  background: #111118 !important;
  border: 1px solid #1e1e2a !important;
  border-radius: 10px !important;
  color: #fff !important;
}
:deep(.leaflet-control-layers label) {
  color: #d1d5db !important;
}
:deep(.leaflet-control-zoom a) {
  background: #111118 !important;
  color: #fff !important;
  border-color: #1e1e2a !important;
}
</style>
