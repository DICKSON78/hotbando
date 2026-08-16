<template>
  <div class="space-y-5">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div><p class="metric-label">Active Campaigns</p><p class="metric-value">{{ activeCount }}</p></div>
          <div class="metric-icon bg-emerald-100 text-emerald-600"><i class="fas fa-play"></i></div>
        </div>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div><p class="metric-label">Total Campaigns</p><p class="metric-value">{{ campaigns.length }}</p></div>
          <div class="metric-icon bg-blue-100 text-blue-600"><i class="fas fa-ad"></i></div>
        </div>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div><p class="metric-label">Wallet Balance</p><p class="metric-value">{{ formatMoney(wallet.balance) }}</p></div>
          <div class="metric-icon bg-brand-100 text-brand-600"><i class="fas fa-wallet"></i></div>
        </div>
      </div>
    </div>

    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-brand-100 flex items-center justify-between">
        <h3 class="section-title"><i class="fas fa-ad section-icon text-brand-500"></i> My Campaigns</h3>
        <router-link to="/sponsor/campaigns/create" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> New</router-link>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Title</th><th>Status</th><th>Views</th></tr></thead>
          <tbody>
            <tr v-for="c in campaigns" :key="c.id">
              <td class="font-medium text-gray-800">{{ c.campaign_name }}</td>
              <td><span class="badge" :class="statusClass(campaignStatus(c))">{{ campaignStatus(c) }}</span></td>
              <td>{{ c.views || 0 }}</td>
            </tr>
            <tr v-if="!campaigns.length"><td colspan="3" class="text-center text-gray-400 py-10">No campaigns yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiGet } from '../../api/client'

const campaigns = ref([])
const wallet = ref({})
function formatMoney(n) { return 'TSh ' + (Number(n || 0).toLocaleString()) }
function statusClass(s) {
  return s === 'active' ? 'badge-success' : s === 'pending' ? 'badge-warning' : 'badge-danger'
}
function campaignStatus(c) {
  if (c.is_active === 1 || c.is_active === true) return 'active'
  if (c.requires_approval === 1 || c.requires_approval === true) return 'pending'
  return 'inactive'
}
const activeCount = computed(() => campaigns.value.filter(c => campaignStatus(c) === 'active').length)

onMounted(async () => {
  const [camp, wal] = await Promise.allSettled([apiGet('/campaigns/my-campaigns'), apiGet('/wallet/balance')])
  if (camp.status === 'fulfilled') campaigns.value = camp.value.campaigns || camp.value || []
  if (wal.status === 'fulfilled') wallet.value = wal.value
})
</script>
