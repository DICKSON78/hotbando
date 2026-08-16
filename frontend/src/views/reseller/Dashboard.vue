<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <router-link to="/reseller/topup" class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition cursor-pointer">
        <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <i class="fas fa-wallet text-green-600 text-xl"></i>
        </div>
        <div>
          <p class="text-2xl font-bold text-green-600">TSH {{ balance.toLocaleString() }}</p>
          <p class="metric-label">Wallet Balance</p>
        </div>
      </router-link>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <i class="fas fa-ticket-alt text-blue-600 text-xl"></i>
        </div>
        <div>
          <p class="text-2xl font-bold text-blue-600">{{ vouchersGenerated }}</p>
          <p class="metric-label">Vouchers Generated</p>
        </div>
      </div>
      <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
          <i class="fas fa-check-circle text-purple-600 text-xl"></i>
        </div>
        <div>
          <p class="text-2xl font-bold text-purple-600">{{ vouchersRedeemed }}</p>
          <p class="metric-label">Vouchers Redeemed</p>
        </div>
      </div>
    </div>

    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
      <h3 class="section-title mb-4">Quick Actions</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <router-link to="/reseller/topup" class="p-4 rounded-xl bg-green-50 hover:bg-green-100 text-center transition-colors">
          <i class="fas fa-plus-circle text-green-500 text-2xl mb-2"></i>
          <p class="text-sm font-medium text-green-700">Top Up Wallet</p>
        </router-link>
        <router-link to="/reseller/vouchers" class="p-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-center transition-colors">
          <i class="fas fa-ticket-alt text-blue-500 text-2xl mb-2"></i>
          <p class="text-sm font-medium text-blue-700">Vouchers</p>
        </router-link>
        <router-link to="/reseller/withdraw" class="p-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-center transition-colors">
          <i class="fas fa-money-bill-wave text-amber-500 text-2xl mb-2"></i>
          <p class="text-sm font-medium text-amber-700">Withdraw</p>
        </router-link>
        <router-link to="/hotspot/login" class="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-center transition-colors">
          <i class="fas fa-sign-out-alt text-gray-500 text-2xl mb-2"></i>
          <p class="text-sm font-medium text-gray-700">Hotspot</p>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { resellerGet } from '../../api/reseller'

const balance = ref(0)
const vouchersGenerated = ref(0)
const vouchersRedeemed = ref(0)

onMounted(loadData)

async function loadData() {
  try {
    const [earnings, vouchers] = await Promise.all([resellerGet('/earnings'), resellerGet('/vouchers')])
    balance.value = earnings.wallet?.balance || 0; vouchersGenerated.value = vouchers.summary?.total || 0; vouchersRedeemed.value = vouchers.summary?.redeemed || 0
  } catch {}
}
</script>
