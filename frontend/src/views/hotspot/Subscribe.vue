<template>
  <div class="pb-4">
    <div class="px-4 pt-4 pb-3">
      <p class="text-xs text-white/50">Shop</p>
      <h1 class="text-xl font-bold text-white">Internet Packages</h1>
      <p class="text-sm text-white/50">Nunua kifurushi cha mtandao</p>
    </div>

    <div v-if="loading" class="text-center py-12 text-white/40"><i class="fas fa-spinner fa-spin text-2xl"></i></div>

    <div v-else>
      <div v-if="featured" class="mx-4 mt-1 balance-card rounded-2xl p-5 text-white">
        <div class="flex items-center justify-between">
          <p class="text-white/80 text-xs font-medium">Featured Package</p>
          <i class="fas fa-bolt text-white/80"></i>
        </div>
        <p class="text-2xl font-bold mt-1">{{ featured.name }}</p>
        <div class="flex items-center justify-between mt-4 pt-4 border-t border-white/20 text-sm">
          <div>
            <p class="text-white/70 text-xs">Price</p>
            <p class="text-xl font-bold">{{ formatPrice(featured.price) }} <span class="text-xs font-medium">TZS</span></p>
          </div>
          <button class="bg-[#FF7A30] text-white font-semibold text-sm px-5 py-2.5 rounded-full" @click="openModal(featured)">Buy Now</button>
        </div>
      </div>

      <div class="mx-4 mt-3 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-4">
        <div class="flex items-center gap-3">
          <div class="tile-icon" style="background:rgba(34,197,94,0.1);color:#22c55e"><i class="fa-solid fa-ticket"></i></div>
          <div>
            <p class="text-sm font-semibold text-white">Enter Voucher Code</p>
            <p class="text-xs text-white/50">Weka voucher uliyopewa</p>
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <input v-model="voucherCode" class="ig-input flex-1" placeholder="Enter voucher code">
          <button class="ig-btn ig-btn-primary flex-shrink-0" @click="redeemVoucher">Redeem</button>
        </div>
        <p v-if="voucherMsg" class="text-sm mt-2" :class="voucherError ? 'text-red-400' : 'text-green-400'">{{ voucherMsg }}</p>
      </div>

      <p class="px-4 pt-5 pb-2 text-sm font-semibold text-white">All Packages</p>
      <div class="px-4 space-y-3">
        <div v-for="p in packages" :key="p.id" class="bg-[#111118] border border-[#1e1e2a] rounded-2xl p-4 flex items-center gap-3">
          <div class="tile-icon" :style="iconStyle(p)"><i :class="iconFor(p)"></i></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white">{{ p.name }}</p>
            <p class="text-xs text-white/50">{{ p.duration_hours }}h · {{ p.data_limit_mb > 0 ? p.data_limit_mb + ' MB' : 'Unlimited' }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-[#FF7A30]">{{ formatPrice(p.price) }}</p>
            <button class="ig-btn ig-btn-outline text-xs mt-1 px-3 py-1" @click="openModal(p)">Buy</button>
          </div>
        </div>
        <div v-if="packages.length === 0" class="bg-[#111118] rounded-2xl border border-[#1e1e2a] p-8 text-center">
          <i class="fa-solid fa-box-open text-3xl text-white/40 mb-3"></i>
          <p class="text-sm text-white/50">No packages available right now</p>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="pay-overlay" @click.self="closeModal">
      <div class="pay-modal">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-white">Buy Package</p>
          <button type="button" class="pay-close" @click.stop="closeModal" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="flex items-center gap-3 mt-3">
          <div class="tile-icon" style="background:rgba(255,122,48,0.1);color:#FF7A30"><i class="fa-solid fa-wifi"></i></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white">{{ selectedPackage?.name }}</p>
            <p class="text-xs text-white/50">{{ selectedPackage?.duration_hours }}h duration</p>
          </div>
          <p class="text-lg font-bold text-[#FF7A30]">{{ Number(selectedPackage?.price || 0).toLocaleString() }} <span class="text-xs font-semibold">TZS</span></p>
        </div>

        <div class="pay-options">
          <button class="pay-option" :class="{ 'pay-option-active': buyMode === 'me' }" @click="buyMode = 'me'">
            <i class="fa-solid fa-user pay-option-icon"></i>
            <span class="pay-option-title">Nunua kwangu</span>
            <span class="pay-option-sub">Kifurushi kinawashwa kwenye akaunti yako</span>
          </button>
          <button class="pay-option" :class="{ 'pay-option-active': buyMode === 'gift' }" @click="buyMode = 'gift'">
            <i class="fa-solid fa-gift pay-option-icon"></i>
            <span class="pay-option-title">Nunulia mwingine</span>
            <span class="pay-option-sub">Ungenerate voucher code ya kumnunulia mtu</span>
          </button>
        </div>

        <div class="mt-3">
          <PhoneInput :initialDigits="myPhone" @change="v => payerPhone = v" label="Namba ya simu kwa malipo (push)" hint="Tutakutumia push ya malipo" />
        </div>

        <div v-if="buyMode === 'gift'" class="pay-gift-note">
          <i class="fa-solid fa-ticket text-green-400"></i>
          <p>Utapata <b>voucher code</b> baada ya malipo. Tuma voucher kwa mtu unayemnunulia, naye ataiweka kwenye <b>Enter Voucher Code</b>.</p>
        </div>

        <button class="pay-start" :disabled="processing" @click="startPayment">
          <i v-if="polling" class="fas fa-spinner fa-spin"></i>
          <i v-else-if="processing" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-mobile-screen-button"></i>
          {{ polling ? 'Inasubiri malipo... (Angalia simu)' : processing ? 'Inatuma push...' : 'Lipia kwa Mobile Money' }}
        </button>

        <p v-if="modalMsg" class="pay-msg mt-3" :class="modalError ? 'pay-msg-err' : 'pay-msg-ok'">{{ modalMsg }}</p>

        <div v-if="generatedVoucher" class="pay-voucher">
          <i class="fa-solid fa-gift pay-voucher-icon"></i>
          <p class="pay-voucher-label">VOUCHER CODE</p>
          <p class="pay-voucher-code">{{ generatedVoucher }}</p>
          <button class="pay-copy" @click="copyVoucher"><i class="fa-solid fa-copy"></i> {{ copied ? 'Copied!' : 'Copy Voucher' }}</button>
          <p class="pay-voucher-hint">Tuma code hii kwa mtu unayemnunulia ili aipate kwenye "Enter Voucher Code".</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { hotspotGet, hotspotPost } from '../../api/client'
import { apiPost, apiGet } from '../../api/client'
import PhoneInput from '../../components/PhoneInput.vue'

const router = useRouter()
const packages = ref([])
const loading = ref(true)
const voucherCode = ref('')
const voucherMsg = ref('')
const voucherError = ref(false)

const showModal = ref(false)
const selectedPackage = ref(null)
const buyMode = ref('me')
const payerPhone = ref('')
const myPhone = ref('')
const processing = ref(false)
const polling = ref(false)
const modalMsg = ref('')
const modalError = ref(false)
const generatedVoucher = ref('')
const copied = ref(false)
let pollTimer = null

onMounted(async () => {
  try {
    const r = await hotspotGet('/packages')
    packages.value = r.packages || []
  } catch (e) {
    voucherMsg.value = 'Imeshindikana kupata kifurushi.'
    voucherError.value = true
  } finally { loading.value = false }
  try {
    const d = await hotspotGet('/dashboard')
    const phone = d?.user?.phone_number
    if (phone) {
      myPhone.value = phone.startsWith('+') ? phone.slice(1) : phone
      payerPhone.value = phone
    }
  } catch {}
})

onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

const featured = computed(() => packages.value[0] || null)

function formatPrice(v) { return Number(v || 0).toLocaleString() }

function iconFor(p) {
  const h = Number(p?.duration_hours || 0)
  if (h >= 720) return 'fa-solid fa-calendar'
  if (h >= 168) return 'fa-solid fa-calendar-week'
  if (h >= 24) return 'fa-solid fa-mobile-screen'
  return 'fa-solid fa-bolt'
}

function iconStyle(p) {
  const h = Number(p?.duration_hours || 0)
  if (h >= 168) return 'background:rgba(139,92,246,0.1);color:#8b5cf6'
  if (h >= 24) return 'background:rgba(34,197,94,0.1);color:#22c55e'
  return 'background:rgba(255,122,48,0.1);color:#FF7A30'
}

function openModal(pkg) {
  selectedPackage.value = pkg
  buyMode.value = 'me'
  generatedVoucher.value = ''
  modalMsg.value = ''
  modalError.value = false
  copied.value = false
  showModal.value = true
}

function closeModal() {
  if (polling.value || processing.value) return
  if (pollTimer) clearInterval(pollTimer)
  showModal.value = false
  selectedPackage.value = null
}

function toLocalPhone(p) {
  if (!p) return ''
  return p.startsWith('+255') ? '0' + p.slice(4) : p.replace(/\D/g, '')
}

async function startPayment() {
  if (polling.value) return
  const phone = toLocalPhone(payerPhone.value)
  if (!/^0[0-9]{9}$/.test(phone)) {
    modalMsg.value = 'Tafadhali ingiza namba ya simu sahihi.'
    modalError.value = true
    return
  }
  processing.value = true
  modalMsg.value = ''
  modalError.value = false
  generatedVoucher.value = ''
  try {
    const r = await apiPost('/clickpesa/pay', {
      amount: selectedPackage.value.price,
      phoneNumber: phone,
      purpose: 'package_purchase',
      package_id: selectedPackage.value.id,
      gift: buyMode.value === 'gift',
    })
    if (r.success && r.orderReference) {
      processing.value = false
      polling.value = true
      modalMsg.value = 'Tafadhali angalia simu yako na weka PIN kukamilisha malipo'
      modalError.value = false
      startPolling(r.orderReference)
    } else {
      modalMsg.value = r.error || 'Imeshindikana. Jaribu tena.'
      modalError.value = true
      processing.value = false
    }
  } catch (e) {
    modalMsg.value = e.response?.data?.error || 'Error. Please try again.'
    modalError.value = true
    processing.value = false
  }
}

function startPolling(orderRef) {
  if (pollTimer) clearInterval(pollTimer)
  let attempts = 0
  pollTimer = setInterval(async () => {
    attempts++
    if (attempts > 60) {
      clearInterval(pollTimer)
      polling.value = false
      modalMsg.value = 'Muda umekwisha. Malipo hayajakamilika.'
      modalError.value = true
      return
    }
    try {
      const r = await apiGet(`/clickpesa/confirm/${orderRef}`)
      if (r.success && r.status === 'completed') {
        clearInterval(pollTimer)
        polling.value = false
        if (r.voucher) {
          generatedVoucher.value = r.voucher
          modalMsg.value = 'Malipo yamekamilika! Voucher imegeneratiwa.'
        } else if (r.activated) {
          modalMsg.value = r.message || 'Kifurushi kimewashwa!'
        } else {
          modalMsg.value = r.message || 'Malipo yamekamilika!'
        }
        modalError.value = false
      }
    } catch (_) {}
  }, 5000)
}

async function copyVoucher() {
  try {
    await navigator.clipboard.writeText(generatedVoucher.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}

async function redeemVoucher() {
  if (!voucherCode.value) return
  try {
    const r = await hotspotPost('/voucher', { voucher_code: voucherCode.value })
    voucherMsg.value = r?.message || 'Voucher redeemed!'
    voucherError.value = !(r?.success === 'success' || r?.success === true)
    if (!voucherError.value) voucherCode.value = ''
  } catch (e) {
    voucherMsg.value = e.response?.data?.error || 'Invalid voucher'
    voucherError.value = true
  }
}
</script>
