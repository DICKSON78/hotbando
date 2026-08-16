<template>
  <div class="space-y-5">
    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-brand-100">
        <h3 class="section-title"><i class="fas fa-users section-icon text-brand-500"></i> Leads</h3>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Name</th><th>Phone</th><th>Campaign</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            <tr v-for="l in leads" :key="l.id">
              <td class="font-medium text-gray-800">{{ l.user_name || '-' }}</td>
              <td>{{ l.phone_number || '-' }}</td>
              <td>{{ l.campaign_title || '-' }}</td>
              <td>
                <select :value="l.lead_status" @change="updateStatus(l, $event.target.value)" class="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none">
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </td>
              <td class="text-gray-400">{{ new Date(l.completed_at).toLocaleDateString() }}</td>
            </tr>
            <tr v-if="!leads.length"><td colspan="5" class="text-center text-gray-400 py-10">No leads yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet, apiPut } from '../../api/client'

const leads = ref([])

onMounted(async () => {
  try { const r = await apiGet('/campaigns/my-leads'); leads.value = r.leads || [] }
  catch (e) { console.error(e) }
})

async function updateStatus(lead, status) {
  try {
    await apiPut(`/campaigns/leads/${lead.id}/status`, { status })
    lead.lead_status = status
  } catch (e) {
    alert('Error: ' + (e.response?.data?.error || 'Try again'))
  }
}
</script>
