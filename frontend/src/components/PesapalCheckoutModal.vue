<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[10000] flex items-stretch sm:items-center justify-center sm:p-4"
      style="background: rgba(0, 0, 0, 0.84)"
      @click.self="requestClose"
    >
      <div
        class="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl bg-[#0a0a0f] sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style="border: 1px solid rgba(255, 122, 48, 0.28)"
      >
        <!-- Title bar -->
        <div class="flex items-center justify-between gap-3 px-4 py-3 shrink-0" style="background: #111118; border-bottom: 1px solid #1e1e2a">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-white truncate">{{ title }}</p>
            <p class="text-[11px] text-white/40 truncate">
              <span v-if="amount">Package TZS {{ formatNum(amount) }}</span>
              <span v-if="providerFee"> · Fee TZS {{ formatNum(providerFee) }}</span>
              <span v-if="amount"> · Total TZS {{ formatNum(totalAmount || (Number(amount) + Number(providerFee))) }} · </span>
              <span class="font-mono">{{ orderTrackingId }}</span>
            </p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span v-if="status === 'checking'" class="hidden sm:flex items-center gap-1.5 text-xs" style="color: #facc15">
              <i class="fas fa-circle-notch fa-spin"></i> Waiting for payment
            </span>
            <span v-else-if="status === 'completed'" class="hidden sm:flex items-center gap-1.5 text-xs" style="color: #34d399">
              <i class="fas fa-circle-check"></i> Paid
            </span>
            <span v-else-if="status === 'failed'" class="hidden sm:flex items-center gap-1.5 text-xs" style="color: #f87171">
              <i class="fas fa-circle-exclamation"></i> Not completed
            </span>
            <button
              type="button"
              class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
              style="color: #9ca3af"
              aria-label="Close checkout"
              @click.stop="requestClose"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Success state -->
        <div v-if="status === 'completed'" class="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div class="w-full max-w-md text-center">
            <div class="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style="background: rgba(16,185,129,0.12)">
              <i class="fas fa-check text-2xl" style="color: #34d399"></i>
            </div>
            <h3 class="text-lg font-bold text-white">Payment complete</h3>
            <p class="text-sm mt-2" style="color: #9ca3af">{{ finalMessage }}</p>

            <div v-if="voucher" class="mt-5 rounded-xl p-4 text-center" style="background: rgba(0,0,0,0.35); border: 1px solid #1e1e2a">
              <p class="text-[10px] tracking-widest" style="color: #6b7280">VOUCHER CODE</p>
              <p class="text-xl font-bold tracking-wider mt-1" style="color: #FF7A30">{{ voucher }}</p>
              <button
                type="button"
                class="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
                style="background: rgba(255,122,48,0.12); color: #FF7A30; border: 1px solid rgba(255,122,48,0.3)"
                @click="copyVoucher"
              >
                <i class="fa-solid fa-copy"></i> {{ copied ? 'Copied!' : 'Copy voucher' }}
              </button>
            </div>

            <button
              type="button"
              class="mt-6 w-full py-3 rounded-xl text-sm font-semibold text-white"
              style="background: linear-gradient(135deg, #FF7A30, #ea6a24)"
              @click="close"
            >
              Done
            </button>
          </div>
        </div>

        <!-- Failed / timed-out state -->
        <div v-else-if="status === 'failed'" class="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div class="w-full max-w-md text-center">
            <div class="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style="background: rgba(239,68,68,0.12)">
              <i class="fas fa-xmark text-2xl" style="color: #f87171"></i>
            </div>
            <h3 class="text-lg font-bold text-white">Payment not completed</h3>
            <p class="text-sm mt-2" style="color: #9ca3af">{{ finalMessage }}</p>
            <p class="text-xs mt-2" style="color: #6b7280">
              If money left your account, do not pay again. Open your dashboard or contact support with the order ID above.
            </p>
            <div class="flex gap-3 mt-6">
              <button
                type="button"
                class="flex-1 py-3 rounded-xl text-sm font-semibold"
                style="background: #1e1e2a; color: #d1d5db"
                @click="close"
              >
                Close
              </button>
              <a v-if="checkoutUrl"
                :href="checkoutUrl"
                target="_blank"
                rel="noopener"
                class="flex-1 py-3 rounded-xl text-sm font-semibold text-white text-center"
                style="background: linear-gradient(135deg, #FF7A30, #ea6a24)"
              >
                Try in new tab
              </a>
            </div>
          </div>
        </div>

        <!-- Checkout iframe -->
        <template v-else>
          <div class="relative flex-1 min-h-[420px] sm:min-h-[540px] bg-white">
            <div v-if="iframeLoading && checkoutUrl" class="absolute inset-0 flex flex-col items-center justify-center gap-3" style="background: #0a0a0f; color: #9ca3af">
              <i class="fas fa-circle-notch fa-spin text-2xl" style="color: #FF7A30"></i>
              <p class="text-sm">Loading secure checkout...</p>
            </div>
            <div v-if="!checkoutUrl" class="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style="background: #0a0a0f; color: #9ca3af">
              <div class="w-16 h-16 rounded-full flex items-center justify-center" style="background: rgba(255,122,48,0.12)">
                <i class="fas fa-mobile-screen-button text-2xl" style="color: #FF7A30"></i>
              </div>
              <div>
                <p class="text-white font-semibold">Check your phone</p>
                <p class="text-sm mt-1">A payment prompt has been sent to your phone. Enter your PIN to complete the payment.</p>
              </div>
              <p class="text-xs text-white/40">Waiting for confirmation...</p>
            </div>
            <iframe
              v-if="checkoutUrl"
              :src="checkoutUrl"
              :title="title"
              class="w-full h-full min-h-[420px] sm:min-h-[540px] border-0"
              allow="payment"
              referrerpolicy="strict-origin-when-cross-origin"
              @load="iframeLoading = false"
            ></iframe>
          </div>
          <div class="shrink-0 flex items-center justify-between gap-2 px-4 py-2.5" style="background: #111118; border-top: 1px solid #1e1e2a">
            <span class="hidden sm:inline text-xs" style="color: #6b7280">
              <i :class="checkoutUrl ? 'fa-solid fa-lock' : 'fa-solid fa-mobile-screen-button'" class="mr-1" style="color: #34d399"></i>
              {{ checkoutUrl ? 'Secure checkout' : 'ClickPesa Push USSD' }}
            </span>
            <div class="flex items-center gap-2 ml-auto">
              <a
                :href="checkoutUrl"
                target="_blank"
                rel="noopener"
                class="px-3 py-1.5 rounded-lg text-xs font-medium"
                style="background: #1e1e2a; color: #d1d5db"
              >
                <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i> New tab
              </a>
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg text-xs font-medium"
                style="background: transparent; color: #9ca3af; border: 1px solid #2a2a38"
                @click="requestClose"
              >
                Close
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { apiGet } from '../api/client'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Complete payment' },
  checkoutUrl: { type: String, default: '' },
  orderTrackingId: { type: String, default: '' },
  amount: { type: [Number, String], default: 0 },
  providerFee: { type: [Number, String], default: 0 },
  totalAmount: { type: [Number, String], default: 0 },
  successMessage: { type: String, default: 'Your payment was received.' },
  pollInterval: { type: Number, default: 15000 },
  maxPollMs: { type: Number, default: 15 * 60 * 1000 }
})

const emit = defineEmits(['close', 'completed', 'failed'])

const status = ref('checking')
const message = ref('')
const voucher = ref('')
const copied = ref(false)
const iframeLoading = ref(true)
let timer = null
let startedAt = 0
let pollCount = 0
let statusRequestInFlight = false

const finalMessage = ref('')

function formatNum(n) {
  return Number(n || 0).toLocaleString()
}

function stopPolling() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

async function checkStatus() {
  if (!props.show || !props.orderTrackingId || statusRequestInFlight) return
  if (status.value === 'completed' || status.value === 'failed') return
  statusRequestInFlight = true
  try {
    const r = await apiGet(`/clickpesa/status/${encodeURIComponent(props.orderTrackingId)}`)
    if (r.status === 'completed' || r.status === 'SUCCESS' || r.status === 'SETTLED') {
      status.value = 'completed'
      finalMessage.value = r.message || props.successMessage
      voucher.value = r.voucher || ''
      stopPolling()
      emit('completed', r)
    } else if (r.status === 'failed' || r.status === 'FAILED' || r.status === 'CANCELLED') {
      status.value = 'failed'
      finalMessage.value = r.message || 'The payment was not completed. Please try again.'
      stopPolling()
      emit('failed', r)
    }
  } catch (e) {
    // Network blips should not close the checkout. Keep polling.
    message.value = e.response?.data?.error || ''
  } finally {
    statusRequestInFlight = false
    pollCount += 1
  }
}

function startPolling() {
  stopPolling()
  status.value = 'checking'
  finalMessage.value = ''
  message.value = ''
  voucher.value = ''
  copied.value = false
  iframeLoading.value = true
  startedAt = Date.now()
  pollCount = 0
  timer = setInterval(() => {
    if (!props.show) return stopPolling()
    if (Date.now() - startedAt > props.maxPollMs) {
      stopPolling()
      if (status.value === 'checking') {
        status.value = 'failed'
        finalMessage.value = 'We could not confirm this payment in time. If you were charged, check your dashboard before paying again.'
        emit('failed', { status: 'timeout' })
      }
      return
    }
    checkStatus()
  }, Math.max(2000, props.pollInterval))
  setTimeout(() => { if (props.show) checkStatus() }, 1500)
}

async function copyVoucher() {
  try {
    await navigator.clipboard.writeText(voucher.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}

function close() {
  stopPolling()
  emit('close')
}

function requestClose() {
  // Closing is allowed while pending; the order remains open and can be
  // verified later from the dashboard or by reopening checkout.
  close()
}

watch(
  () => [props.show, props.orderTrackingId],
  ([visible, tracking]) => {
    if (visible && tracking) startPolling()
    else stopPolling()
  },
  { immediate: true }
)

watch(
  () => props.checkoutUrl,
  () => { iframeLoading.value = true }
)

onUnmounted(stopPolling)
</script>
