<template>
  <div class="max-w-2xl">
    <h3 class="section-title mb-5"><i class="fas fa-plus-circle section-icon text-[#FF7A30]"></i> New Lead Generation Campaign</h3>

    <form @submit.prevent="submit" class="bg-[#111118] rounded-2xl border border-[#1e1e2a] p-6 shadow-sm space-y-4">
      <div>
        <label class="input-label">Campaign Title</label>
        <input v-model="form.campaign_name" required class="input" placeholder="e.g. Business Loan Offer">
      </div>
      <div>
        <label class="input-label">Description</label>
        <textarea v-model="form.description" class="input h-24" placeholder="Describe your offer..."></textarea>
      </div>
      <div>
        <label class="input-label">Type</label>
        <select v-model="form.campaign_type" required class="input">
          <option value="bank_form">Lead Generation</option>
        </select>
      </div>
      <div class="bg-blue-500/10 rounded-lg p-4 text-sm text-blue-400">
        Lead generation campaigns help you collect prospective customer information for financial products.
      </div>
      <p v-if="error" class="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{{ error }}</p>
      <p v-if="success" class="text-emerald-400 text-sm bg-green-500/10 p-3 rounded-lg">{{ success }}</p>
      <div class="flex justify-end gap-3 pt-2">
        <router-link to="/bank/campaigns" class="btn btn-ghost">Cancel</router-link>
        <button type="submit" :disabled="submitting" class="btn btn-primary">
          {{ submitting ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiPost } from '../../api/client'

const router = useRouter()
const form = reactive({ campaign_name: '', description: '', campaign_type: 'bank_form' })
const error = ref('')
const success = ref('')
const submitting = ref(false)

async function submit() {
  submitting.value = true; error.value = ''; success.value = ''
  try {
    await apiPost('/campaigns/create', form)
    success.value = 'Campaign created!'
    setTimeout(() => router.push('/bank/campaigns'), 1000)
  } catch (e) {
    error.value = e.response?.data?.error || 'An error occurred'
  } finally { submitting.value = false }
}
</script>
