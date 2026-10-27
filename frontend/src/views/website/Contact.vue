<template>
  <SiteLayout>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-b from-[#111118] to-[#0a0a0f]">
      <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FF7A30]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center py-16 lg:py-24">
        <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Contact</span>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mt-3 mb-5">Get In Touch</h1>
        <p class="text-lg lg:text-xl text-white/60 max-w-2xl mx-auto">
          Questions, suggestions or issues? Our team is ready to help you at any time.
        </p>
      </div>
    </section>

    <!-- Contact Info + Form -->
    <section class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-5 gap-12">
          <!-- Contact Details -->
          <div class="lg:col-span-2 space-y-8">
            <div>
              <h2 class="text-2xl font-bold text-white mb-6">Contact Details</h2>
              <div class="space-y-5">
                <div class="flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-envelope"></i>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white">Email</p>
                    <a href="mailto:info@hotbando.co.tz" class="text-[#FF7A30] text-sm hover:underline">info@hotbando.co.tz</a>
                    <a href="mailto:support@hotbando.co.tz" class="text-[#FF7A30] text-sm hover:underline block">support@hotbando.co.tz</a>
                  </div>
                </div>
                <div class="flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-phone-alt"></i>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white">Phone</p>
                    <a href="tel:+255712345678" class="text-[#FF7A30] text-sm hover:underline">+255 712 345 678</a>
                    <a href="tel:+255789123456" class="text-[#FF7A30] text-sm hover:underline block">+255 789 123 456</a>
                  </div>
                </div>
                <div class="flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0">
                    <i class="fab fa-whatsapp"></i>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white">WhatsApp</p>
                    <a href="https://wa.me/255712345678" target="_blank" class="text-[#FF7A30] text-sm hover:underline">+255 712 345 678</a>
                  </div>
                </div>
                <div class="flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-map-marker-alt"></i>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white">Address</p>
                    <p class="text-white/60 text-sm">Samora Avenue, Dar es Salaam, Tanzania</p>
                  </div>
                </div>
                <div class="flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-clock"></i>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white">Business Hours</p>
                    <p class="text-white/60 text-sm">Monday — Friday: 8:00 AM — 6:00 PM</p>
                    <p class="text-white/60 text-sm">Saturday: 9:00 AM — 2:00 PM</p>
                    <p class="text-white/60 text-sm">24/7 support via WhatsApp</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Social Links -->
            <div>
              <h3 class="text-sm font-semibold text-white uppercase tracking-wider mb-3">Follow Us</h3>
              <div class="flex space-x-3">
                <a href="#" class="w-10 h-10 rounded-xl bg-white/5 border border-[#1e1e2a] hover:bg-[#FF7A30] hover:border-[#FF7A30] flex items-center justify-center transition-all"><i class="fab fa-facebook-f"></i></a>
                <a href="#" class="w-10 h-10 rounded-xl bg-white/5 border border-[#1e1e2a] hover:bg-[#FF7A30] hover:border-[#FF7A30] flex items-center justify-center transition-all"><i class="fab fa-twitter"></i></a>
                <a href="#" class="w-10 h-10 rounded-xl bg-white/5 border border-[#1e1e2a] hover:bg-[#FF7A30] hover:border-[#FF7A30] flex items-center justify-center transition-all"><i class="fab fa-instagram"></i></a>
                <a href="#" class="w-10 h-10 rounded-xl bg-white/5 border border-[#1e1e2a] hover:bg-[#FF7A30] hover:border-[#FF7A30] flex items-center justify-center transition-all"><i class="fab fa-youtube"></i></a>
              </div>
            </div>
          </div>

          <!-- Contact Form -->
          <div class="lg:col-span-3">
            <div v-if="submitted" class="card text-center py-12">
              <div class="w-16 h-16 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center text-3xl mx-auto mb-4">
                <i class="fas fa-check"></i>
              </div>
              <h3 class="text-xl font-semibold text-white mb-2">Message Sent!</h3>
              <p class="text-white/60">Thank you. We will get back to you shortly.</p>
            </div>

            <form v-else @submit.prevent="sendMessage" class="card space-y-5">
              <h2 class="text-xl font-semibold text-white mb-2">Send a Message</h2>
              <p class="text-white/50 text-sm mb-6">Fill out this form and we will reply within 24 hours.</p>

              <div class="grid md:grid-cols-2 gap-5">
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-1.5">Name *</label>
                  <input v-model="form.name" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="Your name" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-1.5">Email *</label>
                  <input v-model="form.email" type="email" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="email@example.com" />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-1.5">Phone</label>
                <input v-model="form.phone" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="07XX XXX XXX" />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-1.5">Subject *</label>
                <select v-model="form.subject" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors">
                  <option value="">Select a subject</option>
                  <option value="support">Technical Support</option>
                  <option value="billing">Billing & Pricing</option>
                  <option value="partnership">Partnership</option>
                  <option value="complaint">Complaint</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-1.5">Message *</label>
                <textarea v-model="form.message" required rows="5" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors resize-none" placeholder="Type your message here..."></textarea>
              </div>
              <button type="submit" :disabled="submitting" class="w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-[#FF7A30]/20 disabled:opacity-50 disabled:cursor-not-allowed">
                <i v-if="submitting" class="fas fa-spinner fa-spin mr-2"></i>
                {{ submitting ? 'Sending...' : 'Send Message' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- Map placeholder -->
    <section class="h-80 bg-[#111118] relative overflow-hidden">
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center text-3xl mx-auto mb-4">
            <i class="fas fa-map-marked-alt"></i>
          </div>
          <h3 class="text-xl font-semibold text-white mb-2">Our Office</h3>
          <p class="text-white/60">Samora Avenue, Dar es Salaam, Tanzania</p>
          <a href="https://maps.google.com/?q=Samora+Avenue+Dar+es+Salaam" target="_blank" class="inline-flex items-center gap-2 text-[#FF7A30] text-sm font-semibold mt-3 hover:underline">
            Open on Google Maps <i class="fas fa-external-link-alt text-xs"></i>
          </a>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-16 lg:py-20">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Frequently Asked Questions</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2">FAQ</h2>
        </div>
        <div class="space-y-4">
          <div v-for="(faq, i) in faqs" :key="i" class="card">
            <button @click="faq.open = !faq.open" class="w-full flex items-center justify-between text-left">
              <span class="font-semibold text-white pr-4">{{ faq.q }}</span>
              <i :class="['fas text-[#FF7A30] transition-transform', faq.open ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
            </button>
            <div v-show="faq.open" class="mt-3 text-white/60 text-sm leading-relaxed">{{ faq.a }}</div>
          </div>
        </div>
      </div>
    </section>
  </SiteLayout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import SiteLayout from './components/SiteLayout.vue'

const submitted = ref(false)
const submitting = ref(false)
const form = reactive({ name: '', email: '', phone: '', subject: '', message: '' })

const faqs = reactive([
  { q: 'How do I buy a plan?', a: 'Go to the customer portal, choose the plan you want, and pay via M-Pesa, Tigo Pesa, Airtel Money, or Halo Pesa through PesaPal. After payment, your plan is activated instantly.', open: false },
  { q: 'How can I get free data?', a: 'Watch ads on your dashboard. Each completed ad gives you free MBs (default 15MB per ad, max 8 per day).', open: false },
  { q: 'What if the internet is not working?', a: 'Contact us via WhatsApp at +255 712 345 678 or email support@hotbando.co.tz. Our team will resolve the issue within 24 hours.', open: false },
  { q: 'How do I become a reseller?', a: 'Join as a reseller for free. Buy vouchers at wholesale price and sell them for profit. Visit /reseller/signup to get started.', open: false },
  { q: 'Where can I get equipment?', a: 'Equipment is available at our office in Dar es Salaam or through our partners. Contact us via WhatsApp for equipment orders.', open: false },
])

async function sendMessage() {
  submitting.value = true
  try {
    const res = await fetch('/api/public/contact-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (data.success) {
      submitted.value = true
    }
  } catch (e) {
    console.error('Contact error:', e)
  } finally {
    submitting.value = false
  }
}
</script>
