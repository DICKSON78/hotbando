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
        <label class="input-label">Instructions shown to the customer</label>
        <textarea v-model="form.instructions" class="input h-20" placeholder="e.g. Fill in your details and our team will call you."></textarea>
      </div>
      <div>
        <label class="input-label">Type</label>
        <select v-model="form.campaign_type" required class="input">
          <option value="bank_form">Lead Generation (form)</option>
          <option value="survey">Survey</option>
        </select>
      </div>

      <div>
        <label class="input-label">Form fields (one per line)</label>
        <textarea v-model="fieldsText" class="input h-24" placeholder="Full name&#10;Phone number&#10;Monthly income"></textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="input-label">Reward per lead (MB)</label>
          <input v-model.number="form.reward_mb" type="number" min="0" class="input" placeholder="20">
        </div>
        <div>
          <label class="input-label">Cost per lead (TSh)</label>
          <input v-model.number="form.cost_per_action" type="number" min="0" class="input" placeholder="500">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="input-label">Total budget (TSh)</label>
          <input v-model.number="form.total_budget" type="number" min="0" class="input">
        </div>
        <div>
          <label class="input-label">Max leads (0 = unlimited)</label>
          <input v-model.number="form.total_limit" type="number" min="0" class="input">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="input-label">Start date</label>
          <input v-model="form.start_date" type="date" class="input">
        </div>
        <div>
          <label class="input-label">End date (optional)</label>
          <input v-model="form.end_date" type="date" class="input">
        </div>
      </div>

      <div class="bg-blue-500/10 rounded-lg p-4 text-sm text-blue-400">
        The campaign goes live after HotBando approves it. Leads appear under <b>Leads</b> as customers submit the form.
      </div>
      <p v-if="error" class="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{{ error }}</p>
      <p v-if="success" class="text-emerald-400 text-sm bg-green-500/10 p-3 rounded-lg">{{ success }}</p>
      <div class="flex justify-end gap-3 pt-2">
        <router-link to="/bank/campaigns" class="btn btn-ghost">Cancel</router-link>
        <button type="submit" :disabled="submitting" class="btn btn-primary">
          {{ submitting ? 'Saving...' : 'Submit for approval' }}
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
const today = new Date().toISOString().slice(0, 10)
const form = reactive({
  campaign_name: '', description: '', instructions: '', campaign_type: 'bank_form',
  reward_mb: 20, cost_per_action: 0, total_budget: 0, total_limit: 0,
  start_date: today, end_date: ''
})
const fieldsText = ref('Full name\nPhone number')
const error = ref('')
const success = ref('')
const submitting = ref(false)

async function submit() {
  submitting.value = true; error.value = ''; success.value = ''
  try {
    const form_fields = fieldsText.value.split('\n').map(s => s.trim()).filter(Boolean)
      .map(label => ({ label, name: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'), type: 'text', required: true }))
    await apiPost('/campaigns/create', { ...form, form_fields })
    success.value = 'Campaign submitted. It goes live once HotBando approves it.'
    setTimeout(() => router.push('/bank/campaigns'), 1200)
  } catch (e) {
    error.value = e.response?.data?.error || e.response?.data?.message || 'An error occurred'
  } finally { submitting.value = false }
}
</script>
