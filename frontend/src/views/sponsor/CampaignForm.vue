<template>
  <div class="max-w-2xl">
    <h3 class="section-title mb-5"><i class="fas fa-plus-circle section-icon text-brand-500"></i> New Campaign</h3>

    <form @submit.prevent="submit" class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-6 shadow-sm space-y-4">
      <div>
        <label class="input-label">Campaign Title</label>
        <input v-model="form.campaign_name" required class="input" placeholder="e.g. New Product Launch">
      </div>
      <div>
        <label class="input-label">Description</label>
        <textarea v-model="form.description" class="input h-24" placeholder="Describe your campaign..."></textarea>
      </div>
      <div>
        <label class="input-label">Type</label>
        <select v-model="form.campaign_type" required class="input">
          <option value="ad_video">Video Ad</option>
          <option value="ad_image">Image Ad</option>
          <option value="survey">Survey</option>
        </select>
      </div>
      <div>
        <label class="input-label">Media URL</label>
        <input v-model="form.media_url" class="input" placeholder="https://">
      </div>
      <div>
        <label class="input-label">Target URL</label>
        <input v-model="form.target_url" class="input" placeholder="https://">
      </div>
      <p v-if="error" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{{ error }}</p>
      <p v-if="success" class="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{{ success }}</p>
      <div class="flex justify-end gap-3 pt-2">
        <router-link to="/sponsor/campaigns" class="btn btn-ghost">Cancel</router-link>
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
const form = reactive({ campaign_name: '', description: '', campaign_type: 'ad_video', media_url: '', target_url: '' })
const error = ref('')
const success = ref('')
const submitting = ref(false)

async function submit() {
  submitting.value = true; error.value = ''; success.value = ''
  try {
    await apiPost('/campaigns/create', form)
    success.value = 'Campaign created!'
    setTimeout(() => router.push('/sponsor/campaigns'), 1000)
  } catch (e) {
    error.value = e.response?.data?.error || 'An error occurred'
  } finally { submitting.value = false }
}
</script>
