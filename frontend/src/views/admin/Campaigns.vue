<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex gap-2">
        <button @click="tab = 'ads'" class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="tab === 'ads' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'">Ads</button>
        <button @click="tab = 'vouchers'" class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="tab === 'vouchers' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'">Vouchers</button>
      </div>
      <button @click="showAdForm = true" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> New Ad</button>
    </div>

    <div v-if="tab === 'ads'" class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Title</th><th>Sponsor</th><th>Reward</th><th>Status</th><th>Views</th><th>Created</th></tr></thead>
          <tbody>
            <tr v-for="ad in ads" :key="ad.id">
              <td class="font-medium text-gray-800">{{ ad.title }}</td>
              <td>{{ ad.sponsor_name }}</td>
              <td>{{ ad.reward_bytes / 1048576 }} MB</td>
              <td><span class="badge" :class="ad.approved ? 'badge-success' : 'badge-warning'">{{ ad.approved ? 'Approved' : 'Pending' }}</span></td>
              <td>{{ ad.views_count || 0 }}</td>
              <td class="text-gray-400 text-xs">{{ new Date(ad.created_at).toLocaleDateString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="tab === 'vouchers'" class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-green-50 p-4 rounded-lg text-center">
          <p class="text-2xl font-bold text-green-600">{{ voucherStats.usedToday || 0 }}</p>
          <p class="text-sm text-gray-600">Used Today</p>
        </div>
        <div class="bg-brand-50 p-4 rounded-lg text-center">
          <p class="text-2xl font-bold text-brand-600">{{ voucherStats.availableVouchers || 0 }}</p>
          <p class="text-sm text-gray-600">Available</p>
        </div>
        <div class="bg-blue-50 p-4 rounded-lg text-center">
          <p class="text-2xl font-bold text-blue-600">{{ salesSummary.todaySales || 0 | number }}</p>
          <p class="text-sm text-gray-600">Today Sales (TZS)</p>
        </div>
      </div>
      <button @click="showVoucherForm = true" class="btn btn-primary btn-sm"><i class="fas fa-ticket mr-1"></i> Generate Vouchers</button>
    </div>

    <div v-if="showAdForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showAdForm = false">
      <div class="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h3 class="text-lg font-bold text-gray-800 mb-4">New Ad</h3>
        <form @submit.prevent="createAd" class="space-y-3">
          <div><label class="input-label">Title</label><input v-model="adForm.title" required class="input"></div>
          <div><label class="input-label">Description</label><textarea v-model="adForm.description" class="input" rows="2"></textarea></div>
          <div><label class="input-label">Image URL</label><input v-model="adForm.image_url" class="input" placeholder="https://..."></div>
          <div><label class="input-label">Reward (MB)</label><input v-model="adForm.reward_mb" type="number" class="input" value="10"></div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="showAdForm = false" class="btn btn-ghost">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showVoucherForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showVoucherForm = false">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 class="text-lg font-bold text-gray-800 mb-4">Generate Vouchers</h3>
        <form @submit.prevent="generateVoucher" class="space-y-3">
          <div><label class="input-label">Batch Name</label><input v-model="voucherForm.batch_name" class="input"></div>
          <div><label class="input-label">Quantity</label><input v-model="voucherForm.count" type="number" class="input" value="50"></div>
          <div><label class="input-label">Value (TZS)</label><input v-model="voucherForm.totalValue" type="number" class="input"></div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="showVoucherForm = false" class="btn btn-ghost">Cancel</button>
            <button type="submit" class="btn btn-primary">Generate</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const tab = ref('ads')
const ads = ref([])
const showAdForm = ref(false)
const showVoucherForm = ref(false)
const voucherStats = ref({})
const salesSummary = ref({})
const adForm = ref({ title: '', description: '', image_url: '', reward_mb: 10 })
const voucherForm = ref({ batch_name: '', count: 50, totalValue: 0 })

onMounted(async () => {
  try { ads.value = (await adminGet('/video-ads')).data || []; voucherStats.value = await adminGet('/voucher-stats'); salesSummary.value = await adminGet('/sales-summary') }
  catch (e) { console.error(e) }
})

async function createAd() { try { await adminPost('/create-ad', adForm.value); showAdForm.value = false; const r = await adminGet('/video-ads'); ads.value = r.data || [] } catch (e) { console.error(e) } }
async function generateVoucher() { try { await adminPost('/generate-voucher', voucherForm.value); showVoucherForm.value = false; alert('Vouchers created!') } catch (e) { console.error(e) } }
</script>
