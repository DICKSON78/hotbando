<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-800">Voucher Management</h1>

    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Generate New Vouchers</h2>
      <div class="space-y-3">
        <div v-for="pkg in packages" :key="pkg.id" class="flex items-center justify-between py-2 border-b last:border-0">
          <div>
            <p class="font-medium text-gray-800">{{ pkg.name }}</p>
            <p class="text-sm text-gray-500">TSH {{ parseFloat(pkg.price).toLocaleString() }}</p>
          </div>
          <input type="number" min="0" max="10000" v-model.number="quantities[pkg.name]"
            class="w-24 px-3 py-2 border rounded-lg text-center" placeholder="0">
        </div>
      </div>
      <div class="mt-4 flex items-center justify-between">
        <p class="text-sm text-gray-500">Platform fee: <strong>20%</strong></p>
        <button @click="generate" :disabled="generating" class="btn btn-primary">
          {{ generating ? 'Generating...' : 'Generate Vouchers' }}
        </button>
      </div>
      <p v-if="genError" class="text-red-500 text-sm mt-3 bg-red-50 p-3 rounded-lg">{{ genError }}</p>
      <p v-if="genSuccess" class="text-green-600 text-sm mt-3 bg-green-50 p-3 rounded-lg">{{ genSuccess }}</p>
    </div>

    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-brand-100">
        <h2 class="section-title"><i class="fas fa-layer-group section-icon text-brand-500"></i> Your Batches</h2>
      </div>
      <div class="p-5">
        <table class="tbl-shadcn">
          <thead><tr><th>Batch</th><th class="text-right">Vouchers</th><th class="text-right">Total Value</th><th class="text-right">Date</th></tr></thead>
          <tbody>
            <tr v-for="b in batches" :key="b.id">
              <td class="font-medium">{{ b.batch_name }}</td>
              <td class="text-right">{{ b.total_vouchers }}</td>
              <td class="text-right">TSH {{ parseFloat(b.total_value).toLocaleString() }}</td>
              <td class="text-right text-gray-500">{{ b.formatted_date }}</td>
            </tr>
            <tr v-if="!batches?.length"><td colspan="4" class="text-center text-gray-400 py-8">No batches yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { resellerGet, resellerPost } from '../../api/reseller'

const packages = ref([])
const quantities = ref({})
const batches = ref([])
const generating = ref(false)
const genError = ref('')
const genSuccess = ref('')

onMounted(async () => {
  try { const [r] = await Promise.all([resellerGet('/vouchers')]); batches.value = r.batches || [] } catch {}
  try { const resp = await import('../../api/client').then(m => m.default.get('/packages')); packages.value = resp.data }
  catch { packages.value = [{ id: 1, name: '6 HOURS', price: '500.00' }, { id: 2, name: '24 HOURS', price: '1000.00' }, { id: 3, name: '1 WEEK', price: '6000.00' }, { id: 4, name: '1 MONTH', price: '20000.00' }] }
  packages.value.forEach(p => { quantities.value[p.name] = 0 })
})

async function generate() {
  genError.value = ''; genSuccess.value = ''
  const pkgs = {}; let hasAny = false
  for (const [name, qty] of Object.entries(quantities.value)) { if (qty > 0) { pkgs[name] = qty; hasAny = true } }
  if (!hasAny) { genError.value = 'Select at least one package'; return }
  generating.value = true
  try {
    const r = await resellerPost('/vouchers/generate', { packages: pkgs })
    genSuccess.value = r.message; quantities.value = {}; packages.value.forEach(p => { quantities.value[p.name] = 0 })
    const v = await resellerGet('/vouchers'); batches.value = v.batches || []
  } catch (e) { genError.value = e.response?.data?.message || 'Failed to generate' }
  finally { generating.value = false }
}
</script>
