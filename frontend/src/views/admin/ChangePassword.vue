<template>
  <div class="max-w-lg">
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-key" style="color: #FF7A30"></i> Change Password</h3>
      </div>
      <div class="section-body space-y-4">
        <div>
          <label class="input-label">Current Password</label>
          <input v-model="form.current_password" type="password" class="input" autocomplete="current-password" />
        </div>
        <div>
          <label class="input-label">New Password</label>
          <input v-model="form.new_password" type="password" class="input" autocomplete="new-password" />
        </div>
        <div>
          <label class="input-label">Confirm New Password</label>
          <input v-model="form.confirm_password" type="password" class="input" autocomplete="new-password" />
        </div>
        <p v-if="error" class="text-sm" style="color: #f87171">{{ error }}</p>
        <button @click="submit" :disabled="saving" class="btn btn-primary">
          <i class="fas mr-1" :class="saving ? 'fa-spinner fa-spin' : 'fa-check'"></i>
          {{ saving ? 'Saving...' : 'Update Password' }}
        </button>
      </div>
    </div>

    <div v-if="toast" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slideIn"
      :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { adminPost } from '../../api/client'

const form = ref({ current_password: '', new_password: '', confirm_password: '' })
const saving = ref(false)
const error = ref('')
const toast = ref(null)

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

async function submit() {
  error.value = ''
  if (!form.value.current_password || !form.value.new_password || !form.value.confirm_password) {
    error.value = 'Jaza sehemu zote.'
    return
  }
  if (form.value.new_password !== form.value.confirm_password) {
    error.value = 'Neno la siri jipya halifanani.'
    return
  }
  if (form.value.new_password.length < 8) {
    error.value = 'Neno la siri linapaswa kuwa na herufi angalau 8.'
    return
  }

  saving.value = true
  try {
    const res = await adminPost('/change-password', form.value)
    showToast(res.message || 'Password updated')
    form.value = { current_password: '', new_password: '', confirm_password: '' }
  } catch (e) {
    error.value = e.response?.data?.message || 'Imeshindikana kubadilisha neno la siri.'
  } finally {
    saving.value = false
  }
}
</script>
