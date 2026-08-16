<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-lg mx-auto space-y-4">
      <router-link to="/hotspot/dashboard" class="text-brand-500 text-sm"><i class="fas fa-arrow-left mr-1"></i> Back</router-link>
      <h2 class="text-xl font-bold text-gray-800">Internet Packages</h2>

      <div v-if="loading" class="text-center py-10 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>

      <div v-else class="grid gap-3">
        <div v-for="p in packages" :key="p.id" class="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p class="font-semibold text-gray-800">{{ p.name }}</p>
            <p class="text-sm text-gray-500">{{ p.duration_hours }}h</p>
          </div>
          <div class="text-right">
            <p class="font-bold text-brand-500">{{ Number(p.price).toLocaleString() }} TZS</p>
            <button @click="purchase(p)" class="btn btn-primary btn-xs mt-1">Buy</button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <h3 class="font-semibold text-gray-800 mb-3">Enter Voucher Code</h3>
        <div class="flex gap-2">
          <input v-model="voucherCode" class="input flex-1" placeholder="Voucher code">
          <button @click="redeemVoucher" class="btn btn-primary">Redeem</button>
        </div>
        <p v-if="voucherMsg" class="text-sm mt-2" :class="voucherError ? 'text-red-500' : 'text-green-500'">{{ voucherMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { hotspotGet, hotspotPost } from '../../api/client'

const packages = ref([])
const loading = ref(true)
const voucherCode = ref('')
const voucherMsg = ref('')
const voucherError = ref(false)

onMounted(async () => {
  try {
    const r = await hotspotGet('/packages')
    packages.value = r.packages || []
  } catch (e) {
    voucherMsg.value = 'Imeshindikana kupata kifurushi.'
    voucherError.value = true
  } finally { loading.value = false }
})

async function purchase(pkg) {
  try {
    const r = await hotspotPost('/payment/direct', { package_id: pkg.id })
    if (r && r.redirect_url) {
      window.location.href = r.redirect_url
      return
    }
    voucherMsg.value = 'Error. Try again.'
    voucherError.value = true
  } catch (e) {
    voucherMsg.value = e.response?.data?.error || 'Error. Please try again.'
    voucherError.value = true
  }
}

async function redeemVoucher() {
  if (!voucherCode.value) return
  try {
    const r = await hotspotPost('/voucher', { voucher_code: voucherCode.value })
    voucherMsg.value = 'Voucher redeemed!'
    voucherError.value = false
    voucherCode.value = ''
  } catch (e) {
    voucherMsg.value = e.response?.data?.error || 'Invalid voucher'
    voucherError.value = true
  }
}
</script>
