<template>
  <div class="space-y-5">
    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-brand-100">
        <h3 class="section-title"><i class="fas fa-map-marker-alt section-icon text-brand-500"></i> My Locations</h3>
      </div>
      <div v-if="loading" class="p-10 text-center text-gray-400">Loading...</div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        <div v-for="l in locations" :key="l.id" class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition cursor-pointer">
          <div class="flex items-start justify-between">
            <div>
              <h4 class="font-semibold text-gray-800">{{ l.name }}</h4>
              <p class="text-sm text-gray-500 mt-1">{{ l.address || l.city || '—' }}</p>
            </div>
            <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center"><i class="fas fa-map-marker-alt"></i></div>
          </div>
          <div class="mt-4 flex items-center justify-between text-sm">
            <span class="text-gray-400">Routers: {{ l.router_count || 0 }}</span>
            <span class="text-emerald-600 font-semibold">{{ formatMoney(l.total_revenue) }}</span>
          </div>
        </div>
        <div v-if="!locations.length" class="col-span-full text-center py-12 text-gray-400">No locations assigned yet</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet } from '../../api/client'

const locations = ref([])
const loading = ref(true)
function formatMoney(n) { return 'TSh ' + (Number(n || 0).toLocaleString()) }

onMounted(async () => {
  try { const r = await apiGet('/locations/my-locations'); locations.value = r.locations || r || [] }
  catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>
