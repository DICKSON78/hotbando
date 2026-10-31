<template>
  <div class="max-w-2xl">
    <h3 class="section-title mb-5"><i class="fas fa-plus-circle section-icon text-[#FF7A30]"></i> New Campaign</h3>

    <form @submit.prevent="submit" class="section-card rounded-2xl border border-[#1e1e2a] p-6 shadow-sm space-y-4">
      <div>
        <label class="input-label">Campaign Title</label>
        <input v-model="form.campaign_name" required class="input" placeholder="e.g. New Product Launch">
      </div>
      <div>
        <label class="input-label">Description</label>
        <textarea v-model="form.description" class="input h-24" placeholder="What the customer will see under the ad..."></textarea>
      </div>
      <div>
        <label class="input-label">Type</label>
        <select v-model="form.campaign_type" required class="input">
          <option value="ad_video">Video Ad</option>
          <option value="ad_image">Image Ad</option>
          <option value="survey">Survey</option>
        </select>
      </div>
      <div v-if="isAd">
        <label class="input-label">{{ form.campaign_type === 'ad_video' ? 'Video URL (direct .mp4 link)' : 'Image URL' }}</label>
        <input v-model="form.media_url" required class="input" placeholder="https://">
      </div>
      <div>
        <label class="input-label">Target URL (optional)</label>
        <input v-model="form.target_url" class="input" placeholder="https://">
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="input-label">Reward per view (MB)</label>
          <input v-model.number="form.reward_mb" type="number" min="1" class="input" placeholder="15">
        </div>
        <div v-if="form.campaign_type === 'ad_video'">
          <label class="input-label">Video length (seconds)</label>
          <input v-model.number="form.duration_seconds" type="number" min="5" class="input" placeholder="30">
        </div>
        <div v-else>
          <label class="input-label">Display time (seconds)</label>
          <input v-model.number="form.duration_seconds" type="number" min="5" class="input" placeholder="10">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="input-label">Total budget (TSh)</label>
          <input v-model.number="form.total_budget" type="number" min="0" class="input" placeholder="100000">
        </div>
        <div>
          <label class="input-label">Cost per view (TSh)</label>
          <input v-model.number="form.cost_per_action" type="number" min="0" class="input" placeholder="50">
        </div>
      </div>
      <p class="text-xs text-white/50">Budget is reserved from your wallet. The campaign pauses automatically once the budget or view limit is reached.</p>

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
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="input-label">Max views per day (0 = unlimited)</label>
          <input v-model.number="form.daily_limit" type="number" min="0" class="input">
        </div>
        <div>
          <label class="input-label">Max total views (0 = unlimited)</label>
          <input v-model.number="form.total_limit" type="number" min="0" class="input">
        </div>
      </div>

      <p v-if="error" class="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">{{ error }}</p>
      <p v-if="success" class="text-green-500 text-sm bg-green-500/10 p-3 rounded-lg">{{ success }}</p>
      <div class="flex justify-end gap-3 pt-2">
        <router-link to="/sponsor/campaigns" class="btn btn-ghost">Cancel</router-link>
        <button type="submit" :disabled="submitting" class="btn btn-primary">
          {{ submitting ? 'Saving...' : 'Submit for approval' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiPost } from '../../api/client'

const router = useRouter()
const today = new Date().toISOString().slice(0, 10)
const form = reactive({
  campaign_name: '', description: '', campaign_type: 'ad_video', media_url: '', target_url: '',
  reward_mb: 15, duration_seconds: 30, total_budget: 0, cost_per_action: 0,
  start_date: today, end_date: '', daily_limit: 0, total_limit: 0
})
const error = ref('')
const success = ref('')
const submitting = ref(false)
const isAd = computed(() => form.campaign_type === 'ad_video' || form.campaign_type === 'ad_image')

async function submit() {
  submitting.value = true; error.value = ''; success.value = ''
  try {
    await apiPost('/campaigns/create', form)
    success.value = 'Campaign submitted. It goes live once HotBando approves it.'
    setTimeout(() => router.push('/sponsor/campaigns'), 1200)
  } catch (e) {
    error.value = e.response?.data?.error || e.response?.data?.message || 'An error occurred'
  } finally { submitting.value = false }
}
</script>
