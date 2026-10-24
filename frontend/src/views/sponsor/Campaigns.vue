<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <h3 class="section-title"><i class="fas fa-ad section-icon text-[#FF7A30]"></i> My Campaigns</h3>
      <router-link to="/sponsor/campaigns/create" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> New Campaign</router-link>
    </div>

    <div class="section-card rounded-2xl border border-[#1e1e2a] overflow-hidden">
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Views</th><th>Date</th></tr></thead>
          <tbody>
            <tr v-for="c in campaigns" :key="c.id">
              <td class="font-medium text-white">{{ c.campaign_name }}</td>
              <td>{{ c.campaign_type }}</td>
              <td><span class="badge" :class="statusClass(campaignStatus(c))">{{ campaignStatus(c) }}</span></td>
              <td>{{ c.views || 0 }}</td>
              <td class="text-white/40">{{ new Date(c.created_at).toLocaleDateString() }}</td>
            </tr>
            <tr v-if="!campaigns.length"><td colspan="5" class="text-center text-white/40 py-10">No campaigns yet. <router-link to="/sponsor/campaigns/create" class="text-[#FF7A30] font-medium hover:underline">Create one</router-link></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet } from '../../api/client'

const campaigns = ref([])
function statusClass(s) {
  return s === 'active' ? 'badge-success' : s === 'pending' ? 'badge-warning' : 'badge-danger'
}
function campaignStatus(c) {
  if (c.is_active === 1 || c.is_active === true) return 'active'
  if (c.requires_approval === 1 || c.requires_approval === true) return 'pending'
  return 'inactive'
}

onMounted(async () => {
  try { const r = await apiGet('/campaigns/my-campaigns'); campaigns.value = r.campaigns || r || [] }
  catch (e) { console.error(e) }
})
</script>
