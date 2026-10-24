<template>
  <div class="space-y-5">
    <div class="section-card rounded-2xl border border-[#1e1e2a] overflow-hidden">
      <div class="px-5 py-4 border-b border-[#1e1e2a]">
        <h3 class="section-title"><i class="fas fa-map-marker-alt section-icon text-[#FF7A30]"></i> My Locations</h3>
      </div>
      <div v-if="loading" class="p-10 text-center text-white/40">Loading...</div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        <div v-for="l in locations" :key="l.id" class="bg-[#0d0d14] rounded-xl border border-[#1e1e2a] p-4 shadow-sm hover:shadow-md transition cursor-pointer">
          <div class="flex items-start justify-between">
            <div>
              <h4 class="font-semibold text-white">{{ l.name }}</h4>
              <p class="text-sm text-white/50 mt-1">{{ l.address || l.city || '—' }}</p>
            </div>
            <div class="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><i class="fas fa-map-marker-alt"></i></div>
          </div>
          <div class="mt-4 flex items-center justify-between text-sm">
            <span class="text-white/40">Routers: {{ l.router_count || 0 }}</span>
            <span class="text-emerald-500 font-semibold">{{ formatMoney(l.total_revenue) }}</span>
          </div>
        </div>
        <div v-if="!locations.length" class="col-span-full text-center py-12 text-white/40">No locations assigned yet</div>
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
