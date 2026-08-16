<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-800">Withdraw Funds</h1>

    <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-5 shadow-sm">
      <div class="mb-6">
        <p class="metric-label">Available Balance</p>
        <p class="metric-value">TSH {{ (earnings?.wallet?.balance || 0).toLocaleString() }}</p>
      </div>

      <form @submit.prevent="submitWithdraw" class="space-y-4">
        <div>
          <label class="input-label">Amount (TSH)</label>
          <input v-model.number="amount" type="number" min="1000" required class="input" :max="earnings?.wallet?.balance || 0" placeholder="10000">
        </div>
        <div>
          <label class="input-label">Phone Number (M-Pesa)</label>
          <input v-model="phone" type="tel" required class="input" placeholder="0755123456">
        </div>
        <p v-if="error" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{{ error }}</p>
        <p v-if="success" class="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{{ success }}</p>
        <button type="submit" :disabled="submitting" class="btn btn-primary w-full justify-center py-2.5">
          {{ submitting ? 'Processing...' : 'Submit Withdrawal Request' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { resellerGet, resellerPost } from '../../api/reseller'

const earnings = ref(null)
const amount = ref(10000)
const phone = ref('')
const error = ref('')
const success = ref('')
const submitting = ref(false)

onMounted(async () => { try { earnings.value = await resellerGet('/earnings') } catch {} })

async function submitWithdraw() {
  error.value = ''; success.value = ''
  if (amount.value < 1000) { error.value = 'Minimum amount is TSH 1,000'; return }
  if (amount.value > (earnings?.value?.wallet?.balance || 0)) { error.value = 'Insufficient balance'; return }
  if (!phone.value.match(/^0[0-9]{9}$/)) { error.value = 'Invalid phone number'; return }
  submitting.value = true
  try {
    const r = await resellerPost('/withdraw', { amount: amount.value, phone: phone.value })
    success.value = r.message || 'Request submitted'; amount.value = 10000; phone.value = ''
    earnings.value = await resellerGet('/earnings')
  } catch (e) { error.value = e.response?.data?.message || 'Failed to submit withdrawal' }
  finally { submitting.value = false }
}
</script>
