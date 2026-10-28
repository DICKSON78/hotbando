<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-bold text-white">Settings</h2>
      <p class="text-sm" style="color: #6b7280">Manage your profile and account security</p>
    </div>

    <!-- Profile -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-user" style="color: #FF7A30"></i> Profile</h3>
      </div>
      <div class="section-body space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="input-label">Full Name</label>
            <input v-model="profile.name" class="input w-full" />
          </div>
          <div>
            <label class="input-label">Email</label>
            <input v-model="profile.email" type="email" class="input w-full" />
          </div>
          <div>
            <label class="input-label">Phone Number</label>
            <input v-model="profile.phone" type="tel" class="input w-full" />
          </div>
          <div>
            <label class="input-label">Assigned Location</label>
            <input :value="resellerInfo?.location_name || '—'" class="input w-full" disabled />
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="stat-card !p-3">
            <p class="stat-label">Commission Rate</p>
            <p class="stat-value" style="color: #FF7A30; font-size: 1.1rem">{{ resellerInfo?.commission_rate || 0 }}%</p>
          </div>
          <div class="stat-card !p-3">
            <p class="stat-label">Tier</p>
            <p class="stat-value" style="color: #a78bfa; font-size: 1.1rem">{{ resellerInfo?.tier || 'bronze' }}</p>
          </div>
          <div class="stat-card !p-3">
            <p class="stat-label">Status</p>
            <p class="stat-value" style="color: #34d399; font-size: 1.1rem">{{ resellerInfo?.status || 'active' }}</p>
          </div>
        </div>
        <p v-if="profileError" class="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{{ profileError }}</p>
        <p v-if="profileSuccess" class="text-green-400 text-sm bg-green-500/10 p-3 rounded-lg">{{ profileSuccess }}</p>
        <button @click="saveProfile" :disabled="savingProfile" class="btn btn-primary">
          <i class="fas mr-1" :class="savingProfile ? 'fa-spinner fa-spin' : 'fa-save'"></i>
          {{ savingProfile ? 'Saving...' : 'Save Profile' }}
        </button>
      </div>
    </div>

    <!-- Change Password -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-key" style="color: #FF7A30"></i> Change Password</h3>
      </div>
      <div class="section-body space-y-4">
        <div>
          <label class="input-label">Current Password</label>
          <input v-model="pwd.current_password" type="password" class="input" autocomplete="current-password" />
        </div>
        <div>
          <label class="input-label">New Password</label>
          <input v-model="pwd.new_password" type="password" class="input" autocomplete="new-password" />
        </div>
        <div>
          <label class="input-label">Confirm New Password</label>
          <input v-model="pwd.confirm_password" type="password" class="input" autocomplete="new-password" />
        </div>
        <p v-if="pwdError" class="text-sm" style="color: #f87171">{{ pwdError }}</p>
        <button @click="changePassword" :disabled="savingPwd" class="btn btn-primary">
          <i class="fas mr-1" :class="savingPwd ? 'fa-spinner fa-spin' : 'fa-check'"></i>
          {{ savingPwd ? 'Saving...' : 'Update Password' }}
        </button>
      </div>
    </div>

    <!-- PWA Install -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title"><i class="fas fa-mobile-alt" style="color: #FF7A30"></i> Install App</h3>
      </div>
      <div class="section-body">
        <p class="text-sm" style="color: #6b7280; margin-bottom: 12px">Install the HotBando Reseller app on your phone for quick access.</p>
        <button @click="installApp" class="btn btn-primary">
          <i class="fas fa-download mr-2"></i> Install Reseller App
        </button>
        <p v-if="installMsg" class="text-sm mt-2" style="color: #34d399">{{ installMsg }}</p>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slideIn" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { resellerGet, resellerPut, resellerPost } from '../../api/reseller'

const profile = ref({ name: '', email: '', phone: '' })
const resellerInfo = ref(null)
const pwd = ref({ current_password: '', new_password: '', confirm_password: '' })
const savingProfile = ref(false)
const savingPwd = ref(false)
const profileError = ref('')
const profileSuccess = ref('')
const pwdError = ref('')
const toast = ref(null)
const installMsg = ref('')
let deferredPrompt = null

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

onMounted(async () => {
  try {
    const r = await resellerGet('/settings')
    profile.value = { name: r.user?.name || '', email: r.user?.email || '', phone: r.user?.phone_number || '' }
    resellerInfo.value = r.reseller
    // fetch location name
    if (r.reseller?.location_id) {
      try {
        const locs = await (await fetch('/api/public/locations')).json()
        const loc = (locs.locations || []).find(l => l.id === r.reseller.location_id)
        if (loc) resellerInfo.value.location_name = `${loc.name} — ${loc.city}`
      } catch {}
    }
  } catch (e) { console.error(e) }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
  })
})

async function saveProfile() {
  profileError.value = ''; profileSuccess.value = ''
  savingProfile.value = true
  try {
    const r = await resellerPut('/settings/profile', { name: profile.value.name, email: profile.value.email, phone: profile.value.phone })
    profileSuccess.value = r.message || 'Saved'
    showToast(profileSuccess.value)
  } catch (e) {
    profileError.value = e.response?.data?.message || 'Failed to save'
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  pwdError.value = ''
  if (!pwd.value.current_password || !pwd.value.new_password || !pwd.value.confirm_password) {
    pwdError.value = 'Jaza sehemu zote.'
    return
  }
  if (pwd.value.new_password !== pwd.value.confirm_password) {
    pwdError.value = 'Neno la siri jipya halifanani.'
    return
  }
  if (pwd.value.new_password.length < 8) {
    pwdError.value = 'Neno la siri linapaswa kuwa na herufi angalau 8.'
    return
  }
  savingPwd.value = true
  try {
    const r = await resellerPost('/settings/change-password', pwd.value)
    showToast(r.message || 'Password updated')
    pwd.value = { current_password: '', new_password: '', confirm_password: '' }
  } catch (e) {
    pwdError.value = e.response?.data?.message || 'Failed to change password'
  } finally {
    savingPwd.value = false
  }
}

async function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    installMsg.value = outcome === 'accepted' ? 'App installed!' : 'Install cancelled'
    deferredPrompt = null
  } else {
    installMsg.value = 'Use browser menu → "Add to Home Screen" to install.'
  }
}
</script>