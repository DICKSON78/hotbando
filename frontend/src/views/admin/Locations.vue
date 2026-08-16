<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex gap-2">
        <button @click="viewMode = 'map'" class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="viewMode === 'map' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'"><i class="fas fa-map mr-1"></i> Map</button>
        <button @click="viewMode = 'list'" class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="viewMode === 'list' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'"><i class="fas fa-list mr-1"></i> List</button>
      </div>
      <button @click="showForm = true; editing = null" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Add Location</button>
    </div>

    <div v-if="viewMode === 'map'" class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden h-[600px]" ref="mapRef"></div>

    <div v-else class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Name</th><th>City</th><th>Type</th><th>Routers</th><th>Actions</th></tr></thead>
          <tbody>
            <tr v-for="loc in locations" :key="loc.id">
              <td class="font-medium text-gray-800">{{ loc.name }}</td>
              <td>{{ loc.city }}, {{ loc.region }}</td>
              <td><span class="badge" :class="typeColor(loc.location_type)">{{ loc.location_type }}</span></td>
              <td>{{ loc.router_count || 0 }}</td>
              <td>
                <button @click="editLocation(loc)" class="btn btn-ghost btn-xs"><i class="fas fa-edit"></i></button>
                <button @click="deleteLocation(loc.id)" class="btn btn-ghost btn-xs text-red-500"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showForm = false">
      <div class="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h3 class="text-lg font-bold text-gray-800 mb-4">{{ editing ? 'Edit Location' : 'Add Location' }}</h3>
        <form @submit.prevent="saveLocation" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="input-label">Name</label><input v-model="form.name" required class="input"></div>
            <div><label class="input-label">City</label><input v-model="form.city" required class="input"></div>
            <div><label class="input-label">Region</label><input v-model="form.region" class="input"></div>
            <div><label class="input-label">Type</label>
              <select v-model="form.location_type" class="input">
                <option>Bar</option><option>Restaurant</option><option>Cafe</option><option>Mall</option><option>University</option><option>Hostel</option><option>Other</option>
              </select>
            </div>
          </div>
          <div><label class="input-label">Address</label><input v-model="form.address" class="input"></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="input-label">Latitude</label><input v-model="form.latitude" type="number" step="any" class="input"></div>
            <div><label class="input-label">Longitude</label><input v-model="form.longitude" type="number" step="any" class="input"></div>
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
import { ref, onMounted, watch, nextTick } from 'vue'
import api from '../../api/client'

const viewMode = ref('map')
const locations = ref([])
const routers = ref([])
const showForm = ref(false)
const editing = ref(null)
const mapRef = ref(null)
let map = null
let markers = []
const form = ref({ name: '', city: '', region: '', address: '', latitude: -6.7924, longitude: 39.2083, location_type: 'Bar' })

onMounted(async () => { await loadLocations(); await loadRouters(); if (viewMode.value === 'map') await nextTick(initMap) })
watch(viewMode, async (v) => { if (v === 'map') { await nextTick(); initMap() } })

async function loadLocations() { try { const r = await api.get('/locations/'); locations.value = r.data.data || [] } catch (e) { console.error(e) } }
async function loadRouters() { try { const r = await api.get('/routers/'); routers.value = r.data.routers || [] } catch (e) { console.error(e) } }
async function saveLocation() {
  try {
    if (editing.value) { await api.put('/locations/' + editing.value.id, form.value) }
    else { await api.post('/locations/', form.value) }
    showForm.value = false; editing.value = null; await loadLocations()
  } catch (e) { console.error(e) }
}
function editLocation(loc) { form.value = { ...loc }; editing.value = loc; showForm.value = true }
async function deleteLocation(id) { if (!confirm('Are you sure?')) return; try { await api.delete('/locations/' + id); await loadLocations() } catch (e) { console.error(e) } }

function typeColor(t) {
  const m = { 'University': 'bg-blue-100 text-blue-800', 'Hostel': 'bg-purple-100 text-purple-800', 'Mall': 'bg-orange-100 text-orange-800', 'Restaurant': 'bg-orange-100', 'Bar': 'bg-orange-100', 'Residential': 'bg-green-100 text-green-800', 'Cafe': 'bg-yellow-100 text-yellow-800' }
  return m[t] || 'bg-gray-100 text-gray-800'
}

function initMap() {
  if (!mapRef.value) return
  if (map) { map.remove(); map = null }
  map = L.map(mapRef.value).setView([-6.7924, 39.2083], 11)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)
  locations.value.forEach(loc => {
    if (!loc.latitude || !loc.longitude) return
    const col = typeColor(loc.location_type).match(/text-(\w+)/)?.[1] === 'blue' ? '#3B82F6'
      : typeColor(loc.location_type).match(/text-(\w+)/)?.[1] === 'purple' ? '#8B5CF6'
      : typeColor(loc.location_type).match(/text-(\w+)/)?.[1] === 'orange' ? '#F97316'
      : typeColor(loc.location_type).match(/text-(\w+)/)?.[1] === 'green' ? '#22C55E'
      : '#FF7A30'
    const icon = L.divIcon({
      html: `<div style="background:${col};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><i class="fas fa-wifi text-sm"></i></div>`,
      className: '', iconSize: [32, 32], iconAnchor: [16, 16]
    })
    const mkr = L.marker([loc.latitude, loc.longitude], { icon }).addTo(map)
    const routerCount = routers.value.filter(r => r.location_id === loc.id).length
    mkr.bindPopup(`<b>${loc.name}</b><br>${loc.city}, ${loc.region}<br>Routers: ${routerCount}<br>${loc.location_type}`)
    markers.push(mkr)
  })
}
</script>
