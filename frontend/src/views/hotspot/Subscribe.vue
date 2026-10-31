<template>
  <div class="pb-4">
    <div class="px-4 pt-4 pb-3">
      <p class="text-xs text-white/50">Shop</p>
      <h1 class="text-xl font-bold text-white">Internet Packages</h1>
      <p class="text-sm text-white/50">Nunua kifurushi cha mtandao</p>
    </div>

    <div v-if="returnStatus" class="mx-4 mt-3 rounded-2xl border p-4" :class="returnStatus === 'completed' ? 'bg-green-500/10 border-green-500/30' : returnStatus === 'pending' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'">
      <div class="flex items-start gap-3">
        <i class="fa-solid mt-0.5" :class="returnStatus === 'completed' ? 'fa-circle-check text-green-400' : returnStatus === 'pending' ? 'fa-clock text-yellow-400' : 'fa-circle-exclamation text-red-400'"></i>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-white">{{ returnStatus === 'completed' ? 'Payment Complete' : returnStatus === 'pending' ? 'Payment Pending' : 'Payment Failed' }}</p>
          <p class="text-xs text-white/60 mt-1">{{ returnMessage }}</p>
          <div v-if="returnVoucher" class="mt-3 rounded-xl bg-black/30 border border-white/10 p-3 text-center">
            <p class="text-[10px] tracking-widest text-white/50">VOUCHER CODE</p>
            <p class="text-base font-bold tracking-wider text-[#FF7A30] mt-1">{{ returnVoucher }}</p>
            <button class="pay-copy mt-2" @click="copyReturnVoucher"><i class="fa-solid fa-copy"></i> {{ returnCopied ? 'Copied!' : 'Copy Voucher' }}</button>
          </div>
          <div v-if="returnStatus === 'completed'" class="mt-3 space-y-2">
            <p v-if="reconnectMsg" class="text-xs" :class="reconnectOk ? 'text-green-400' : 'text-yellow-300'">{{ reconnectMsg }}</p>
            <div class="flex flex-wrap gap-2">
              <button class="ig-btn ig-btn-primary text-xs px-4 py-2" :disabled="reconnecting" @click="reconnectAfterPayment">
                <i v-if="reconnecting" class="fas fa-spinner fa-spin mr-1"></i>
                {{ reconnecting ? 'Inaunganisha…' : 'Unganisha / Reconnect' }}
              </button>
              <button class="ig-btn ig-btn-outline text-xs px-4 py-2" @click="router.push('/hotspot/dashboard')">Go to Dashboard</button>
            </div>
          </div>
          <button v-else class="ig-btn ig-btn-primary text-xs mt-3 px-4 py-2" @click="router.push('/hotspot/dashboard')">Go to Dashboard</button>
        </div>
      </div>
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
          <PhoneInput :initialDigits="myPhone" @change="onPayerPhoneChange" label="Namba ya simu kwa malipo" hint="Utapokea ombi la malipo kwenye simu yako kupitia ClickPesa Push USSD." />
        </div>

        <div v-if="buyMode === 'gift'" class="mt-3">
          <PhoneInput :initialDigits="recipientPhone" @change="onRecipientPhoneChange" label="Namba ya mnunuzi wa vocha" hint="Namba hii haihitaji kuwa na akaunti ya HotBando. Voucher code itaonekana baada ya malipo kuthibitishwa." />
        </div>

        <div v-if="paymentQuote" class="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
          <div class="flex justify-between text-white/60"><span>Bei ya kifurushi</span><span>TSh {{ formatPrice(paymentQuote.amount) }}</span></div>
          <div class="flex justify-between text-white/60 mt-1"><span>Ada ya ClickPesa / {{ paymentQuote.channel }}</span><span>TSh {{ formatPrice(paymentQuote.fee) }}</span></div>
          <div class="flex justify-between text-white font-semibold mt-2 pt-2 border-t border-white/10"><span>Jumla kwenye simu</span><span>TSh {{ formatPrice(paymentQuote.total) }}</span></div>
        </div>

        <div v-if="buyMode === 'gift'" class="pay-gift-note">
          <i class="fa-solid fa-ticket text-green-400"></i>
          <p>Utapata <b>voucher code</b> baada ya malipo. Tuma voucher kwa mtu unayemnunulia, naye ataiweka kwenye <b>Enter Voucher Code</b>.</p>
        </div>

        <button class="pay-start" :disabled="processing" @click="startPayment">
          <i v-if="processing" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-lock"></i>
          {{ processing ? (paymentQuote ? 'Inatuma ombi la malipo...' : 'Inakokotoa ada...') : paymentQuote ? `Tuma Push USSD · TSh ${formatPrice(paymentQuote.total)}` : 'Angalia jumla ya malipo' }}
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

    <ClickPesaCheckoutModal
      :show="showCheckout"
      title="Thibitisha malipo ya ClickPesa"
      :checkout-url="checkoutUrl"
      :order-tracking-id="checkoutTracking"
      :amount="checkoutAmount"
      :provider-fee="checkoutFee"
      :total-amount="checkoutTotal"
      success-message="Payment received. Your package is being activated."
      @close="closeCheckout"
      @completed="onCheckoutCompleted"
      @failed="onCheckoutFailed"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hotspotGet, hotspotPost } from '../../api/client'
import { apiPost, apiGet } from '../../api/client'
import { useHotspotStore } from '../../stores/hotspot'
import PhoneInput from '../../components/PhoneInput.vue'
import ClickPesaCheckoutModal from '../../components/PesapalCheckoutModal.vue'

const route = useRoute()
const router = useRouter()
const store = useHotspotStore()
const packages = ref([])
const loading = ref(true)
const voucherCode = ref('')
const voucherMsg = ref('')
const voucherError = ref(false)

const showModal = ref(false)
const selectedPackage = ref(null)
const buyMode = ref('me')
const payerPhone = ref('')
const recipientPhone = ref('')
const myPhone = ref('')
const processing = ref(false)
const modalMsg = ref('')
const modalError = ref(false)
const generatedVoucher = ref('')
const copied = ref(false)
const paymentQuote = ref(null)
const returnStatus = ref('')
const returnMessage = ref('')
const returnVoucher = ref('')
const returnCopied = ref(false)
const reconnecting = ref(false)
const reconnectMsg = ref('')
const reconnectOk = ref(false)
const showCheckout = ref(false)
const checkoutUrl = ref('')
const checkoutTracking = ref('')
const checkoutAmount = ref(0)
const checkoutFee = ref(0)
const checkoutTotal = ref(0)

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
  await handlePaymentReturn()
})

const featured = computed(() => packages.value[0] || null)

async function handlePaymentReturn() {
  const tracking = route.query.order_tracking_id
  if (!tracking) return
  try {
    const r = await apiGet(`/payments/status/${encodeURIComponent(tracking)}`)
    if (r.status === 'completed') {
      returnStatus.value = 'completed'
      returnMessage.value = r.message || 'Malipo yamekamilika!'
      returnVoucher.value = r.voucher || ''
      if (!returnVoucher.value) reconnectAfterPayment()
    } else if (r.status === 'failed') {
      returnStatus.value = 'failed'
      returnMessage.value = r.message || 'Malipo hayajakamilika. Tafadhali jaribu tena.'
    } else {
      returnStatus.value = 'pending'
      returnMessage.value = r.message || 'Malipo bado hayajakamilika. Tafadhali subiri kidogo kisha fungua ukurasa huu tena.'
    }
  } catch (e) {
    returnStatus.value = 'failed'
    returnMessage.value = e.response?.data?.error || 'Imeshindikana kuthibitisha malipo.'
  }
}

async function copyReturnVoucher() {
  try {
    await navigator.clipboard.writeText(returnVoucher.value)
    returnCopied.value = true
    setTimeout(() => { returnCopied.value = false }, 2000)
  } catch {}
}

// After a confirmed payment, ask the router to let this device back in. The
// session is deliberately kept alive: logging out here was what made customers
// lose their portal session right after paying. If the router is unreachable
// (for example its API is down) we tell the customer the one action that always
// works: toggle Wi-Fi so the router can re-authenticate the device by MAC.
async function reconnectAfterPayment() {
  if (reconnecting.value) return
  reconnecting.value = true
  reconnectMsg.value = ''
  try {
    await store.refreshUser()
    const r = await hotspotPost('/connect')
    if (r?.success) {
      reconnectOk.value = true
      reconnectMsg.value = 'Umeunganishwa! Fungua dashboard kuanza kutumia internet.'
      await store.refreshUser()
    } else {
      reconnectOk.value = false
      reconnectMsg.value = 'Malipo yamekamilika. Zima na washa WiFi ya simu (au fungua ukurasa huu upya) ili kifaa chako kiingie mtandaoni.'
    }
  } catch (e) {
    reconnectOk.value = false
    reconnectMsg.value = 'Malipo yamekamilika. Zima na washa WiFi ya simu (au fungua ukurasa huu upya) ili kifaa chako kiingie mtandaoni.'
  } finally {
    reconnecting.value = false
  }
}

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
  paymentQuote.value = null
  modalMsg.value = ''
  modalError.value = false
  copied.value = false
  showModal.value = true
}

function closeModal() {
  if (processing.value) return
  showModal.value = false
  selectedPackage.value = null
}

function onCheckoutCompleted(payload) {
  returnStatus.value = 'completed'
  returnMessage.value = payload?.message || 'Malipo yamekamilika!'
  returnVoucher.value = payload?.voucher || ''
  if (!returnVoucher.value) reconnectAfterPayment()
}

function onCheckoutFailed(payload) {
  returnStatus.value = 'failed'
  returnMessage.value = payload?.message || 'Malipo hayajakamilika. Tafadhali jaribu tena.'
}

function closeCheckout() {
  showCheckout.value = false
  checkoutUrl.value = ''
  checkoutTracking.value = ''
  checkoutAmount.value = 0
  checkoutFee.value = 0
  checkoutTotal.value = 0
}

function toLocalPhone(p) {
  if (!p) return ''
  return p.startsWith('+255') ? '0' + p.slice(4) : p.replace(/\D/g, '')
}

function onPayerPhoneChange(value) {
  payerPhone.value = value
  paymentQuote.value = null
}

function onRecipientPhoneChange(value) {
  recipientPhone.value = value
}

async function startPayment() {
  if (processing.value) return
  const phone = toLocalPhone(payerPhone.value)
  if (!/^0[0-9]{9}$/.test(phone)) {
    modalMsg.value = 'Tafadhali ingiza namba ya simu sahihi.'
    modalError.value = true
    return
  }
  if (buyMode.value === 'gift' && !/^0[0-9]{9}$/.test(toLocalPhone(recipientPhone.value))) {
    modalMsg.value = 'Weka namba halali ya anayenunuliwa voucher.'
    modalError.value = true
    return
  }
  processing.value = true
  modalMsg.value = ''
  modalError.value = false
  generatedVoucher.value = ''
  try {
    if (!paymentQuote.value) {
      const quote = await apiPost('/clickpesa/preview', {
        purpose: 'package_purchase',
        package_id: selectedPackage.value.id,
        phoneNumber: phone,
        gift: buyMode.value === 'gift',
        recipient_phone: buyMode.value === 'gift' ? toLocalPhone(recipientPhone.value) : null,
      })
      paymentQuote.value = {
        amount: Number(quote.amount || selectedPackage.value.price),
        fee: Number(quote.fee || 0),
        total: Number(quote.total || quote.amount || selectedPackage.value.price),
        channel: quote.channel || 'Mobile Money',
      }
      modalMsg.value = 'Kagua jumla hapo juu. Bonyeza tena kutuma Push USSD.'
      processing.value = false
      return
    }
    const r = await apiPost('/clickpesa/pay', {
      purpose: 'package_purchase',
      package_id: selectedPackage.value.id,
      phoneNumber: phone,
      gift: buyMode.value === 'gift',
      recipient_phone: buyMode.value === 'gift' ? toLocalPhone(recipientPhone.value) : null,
      expectedTotal: paymentQuote.value.total,
    })
    if (r.success && r.orderReference) {
      checkoutUrl.value = ''
      checkoutTracking.value = r.orderReference
      checkoutAmount.value = Number(r.amount || paymentQuote.value.amount)
      checkoutFee.value = Number(r.providerFee ?? paymentQuote.value.fee)
      checkoutTotal.value = Number(r.customerTotal || paymentQuote.value.total)
      showModal.value = false
      showCheckout.value = true
      processing.value = false
      return
    }
    if (r.success && r.voucher) {
      generatedVoucher.value = r.voucher
      modalMsg.value = r.message || 'Voucher imegeneratiwa!'
      processing.value = false
      return
    }
    if (r.success && r.activated) {
      modalMsg.value = r.message || 'Kifurushi kimewashwa!'
      processing.value = false
      setTimeout(() => router.push('/hotspot/dashboard'), 1500)
      return
    }
    modalMsg.value = r.error || 'Imeshindikana. Jaribu tena.'
    modalError.value = true
    processing.value = false
  } catch (e) {
    if (e.response?.status === 409 && e.response?.data?.quote) {
      paymentQuote.value = {
        amount: Number(e.response.data.quote.amount || 0),
        fee: Number(e.response.data.quote.fee || 0),
        total: Number(e.response.data.quote.total || 0),
        channel: e.response.data.quote.channel || 'Mobile Money',
      }
    }
    modalMsg.value = e.response?.data?.error || 'Error. Please try again.'
    modalError.value = true
    processing.value = false
  }
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
