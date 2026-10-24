<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <router-link to="/reseller/topup" class="stat-card cursor-pointer hover:border-orange-500/30">
        <div class="flex items-center gap-4">
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399">
            <i class="fas fa-wallet"></i>
          </div>
          <div>
            <p class="stat-value" style="color: #34d399">TSH {{ balance.toLocaleString() }}</p>
            <p class="stat-label">Wallet Balance</p>
          </div>
        </div>
      </router-link>
      <div class="stat-card">
        <div class="flex items-center gap-4">
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa">
            <i class="fas fa-ticket-alt"></i>
          </div>
          <div>
            <p class="stat-value" style="color: #60a5fa">{{ vouchersGenerated }}</p>
            <p class="stat-label">Vouchers Generated</p>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-4">
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa">
            <i class="fas fa-check-circle"></i>
          </div>
          <div>
            <p class="stat-value" style="color: #a78bfa">{{ vouchersRedeemed }}</p>
            <p class="stat-label">Vouchers Redeemed</p>
          </div>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-bolt" style="color: #FF7A30"></i> Quick Actions</h3>
      </div>
      <div class="section-body">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <router-link to="/reseller/topup" class="p-4 rounded-xl text-center transition-colors" style="background: rgba(255,122,48,0.08)">
            <i class="fas fa-plus-circle text-2xl mb-2" style="color: #FF7A30"></i>
            <p class="text-sm font-medium" style="color: #FF7A30">Top Up Wallet</p>
          </router-link>
          <router-link to="/reseller/vouchers" class="p-4 rounded-xl text-center transition-colors" style="background: rgba(59,130,246,0.08)">
            <i class="fas fa-ticket-alt text-2xl mb-2" style="color: #60a5fa"></i>
            <p class="text-sm font-medium" style="color: #60a5fa">Vouchers</p>
          </router-link>
          <router-link to="/reseller/withdraw" class="p-4 rounded-xl text-center transition-colors" style="background: rgba(245,158,11,0.08)">
            <i class="fas fa-money-bill-wave text-2xl mb-2" style="color: #fbbf24"></i>
            <p class="text-sm font-medium" style="color: #fbbf24">Withdraw</p>
          </router-link>
          <router-link to="/hotspot/login" class="p-4 rounded-xl text-center transition-colors" style="background: rgba(255,255,255,0.03)">
            <i class="fas fa-sign-out-alt text-2xl mb-2 text-white/30"></i>
            <p class="text-sm font-medium text-white/50">Hotspot</p>
          </router-link>
        </div>
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
    balance.value = earnings.wallet?.balance || 0
    vouchersGenerated.value = vouchers.summary?.total || 0
    vouchersRedeemed.value = vouchers.summary?.redeemed || 0
  } catch {}
}
</script>
