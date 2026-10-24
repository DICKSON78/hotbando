<template>
  <SiteLayout>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-b from-[#111118] to-[#0a0a0f]">
      <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FF7A30]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center py-16 lg:py-24">
        <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Business Opportunity</span>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mt-3 mb-5">Become a HotBando Partner</h1>
        <p class="text-lg lg:text-xl text-white/60 max-w-2xl mx-auto">
          Start an internet business with HotBando. We provide the equipment, technology, and support at every step.
        </p>
      </div>
    </section>

    <!-- Business Model -->
    <section class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">How It Works</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">Our Business Model</h2>
          <p class="text-white/60 max-w-2xl mx-auto">Choose the best way for you to partner with us.</p>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="card group hover:border-[#FF7A30]/40 transition-all">
            <div class="h-48 rounded-2xl overflow-hidden mb-6">
              <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80" alt="Franchise" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div class="w-12 h-12 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center text-lg mb-4">
              <i class="fas fa-store"></i>
            </div>
            <h3 class="text-xl font-semibold text-white mb-3">Franchise Owner</h3>
            <p class="text-white/60 text-sm leading-relaxed mb-4">
              Buy equipment, deploy HotBando WiFi in your area, and earn a share of revenue every time a customer purchases a plan.
            </p>
            <ul class="space-y-2 text-sm text-white/50 mb-6">
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Monthly revenue share</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Equipment provided</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Full management support</li>
            </ul>
            <router-link to="/login" class="block w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white text-center font-semibold py-3 rounded-xl transition-all">
              Apply Now
            </router-link>
          </div>

          <div class="card group hover:border-[#FF7A30]/40 transition-all">
            <div class="h-48 rounded-2xl overflow-hidden mb-6">
              <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80" alt="Reseller" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div class="w-12 h-12 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center text-lg mb-4">
              <i class="fas fa-ticket"></i>
            </div>
            <h3 class="text-xl font-semibold text-white mb-3">Reseller</h3>
            <p class="text-white/60 text-sm leading-relaxed mb-4">
              Buy vouchers at wholesale price and sell them to customers. Your profit is the price difference.
            </p>
            <ul class="space-y-2 text-sm text-white/50 mb-6">
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Quick profits</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> No registration fee</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Simple system</li>
            </ul>
            <router-link to="/reseller/signup" class="block w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white text-center font-semibold py-3 rounded-xl transition-all">
              Sign Up
            </router-link>
          </div>

          <div class="card group hover:border-[#FF7A30]/40 transition-all">
            <div class="h-48 rounded-2xl overflow-hidden mb-6">
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" alt="Sponsor" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div class="w-12 h-12 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center text-lg mb-4">
              <i class="fas fa-bullhorn"></i>
            </div>
            <h3 class="text-xl font-semibold text-white mb-3">Sponsor / Advertiser</h3>
            <p class="text-white/60 text-sm leading-relaxed mb-4">
              Advertise your brand to HotBando users. Pay per view for every person who watches your ad.
            </p>
            <ul class="space-y-2 text-sm text-white/50 mb-6">
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Wide reach</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Real-time reports</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Flexible budget</li>
            </ul>
            <router-link to="/login" class="block w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white text-center font-semibold py-3 rounded-xl transition-all">
              Start Ad
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Hardware Bundles -->
    <section class="py-16 lg:py-20 bg-[#111118]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Equipment</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">Business Startup Bundles</h2>
          <p class="text-white/60 max-w-2xl mx-auto">Choose the right equipment package with full setup and technical support.</p>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="card text-center group hover:border-[#FF7A30]/40 transition-all">
            <div class="h-40 flex items-center justify-center mb-6">
              <img src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80" alt="Starter" class="h-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <span class="inline-block bg-[#FF7A30]/10 text-[#FF7A30] text-xs font-semibold px-3 py-1 rounded-full mb-3">Starter</span>
            <h3 class="text-xl font-semibold text-white mb-2">Starter Bundle</h3>
            <p class="text-3xl font-bold text-[#FF7A30] mb-1">TSh 350,000</p>
            <p class="text-white/50 text-sm mb-4">MikroTik hAP ac2</p>
            <ul class="space-y-2 text-sm text-white/50 text-left max-w-xs mx-auto mb-6">
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> WiFi Router (hAP ac2)</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Hotspot setup</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Up to 30 users</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> 3 months support</li>
            </ul>
            <button @click="showApply = true" class="w-full bg-white/5 border border-[#1e1e2a] hover:border-[#FF7A30] text-white font-semibold py-3 rounded-xl transition-all">
              Select
            </button>
          </div>

          <div class="card text-center group border-[#FF7A30]/40 relative">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF7A30] text-white text-xs font-semibold px-4 py-1 rounded-full">Recommended</div>
            <div class="h-40 flex items-center justify-center mb-6">
              <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80" alt="Pro" class="h-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <span class="inline-block bg-[#FF7A30]/10 text-[#FF7A30] text-xs font-semibold px-3 py-1 rounded-full mb-3">Pro</span>
            <h3 class="text-xl font-semibold text-white mb-2">Pro Bundle</h3>
            <p class="text-3xl font-bold text-[#FF7A30] mb-1">TSh 600,000</p>
            <p class="text-white/50 text-sm mb-4">MikroTik RB450G</p>
            <ul class="space-y-2 text-sm text-white/50 text-left max-w-xs mx-auto mb-6">
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Business Router (RB450G)</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Full setup included</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Up to 100 users</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> 6 months support</li>
            </ul>
            <button @click="showApply = true" class="w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-[#FF7A30]/20">
              Select
            </button>
          </div>

          <div class="card text-center group hover:border-[#FF7A30]/40 transition-all">
            <div class="h-40 flex items-center justify-center mb-6">
              <img src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80" alt="Elite" class="h-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <span class="inline-block bg-[#FF7A30]/10 text-[#FF7A30] text-xs font-semibold px-3 py-1 rounded-full mb-3">Elite</span>
            <h3 class="text-xl font-semibold text-white mb-2">Elite Bundle</h3>
            <p class="text-3xl font-bold text-[#FF7A30] mb-1">TSh 950,000</p>
            <p class="text-white/50 text-sm mb-4">MikroTik RB4011</p>
            <ul class="space-y-2 text-sm text-white/50 text-left max-w-xs mx-auto mb-6">
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Premium Router (RB4011)</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Full setup + Access Point</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> Unlimited users</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-[#FF7A30] text-xs"></i> 12 months support</li>
            </ul>
            <button @click="showApply = true" class="w-full bg-white/5 border border-[#1e1e2a] hover:border-[#FF7A30] text-white font-semibold py-3 rounded-xl transition-all">
              Select
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Revenue Share -->
    <section class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col lg:flex-row items-center gap-12">
          <div class="lg:w-1/2">
            <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Revenue</span>
            <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-6">How You Earn</h2>
            <p class="text-white/60 leading-relaxed mb-8">
              Our revenue model is transparent and reliable. Every time a customer purchases a plan, your share goes directly to you.
            </p>
            <div class="space-y-6">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-percent"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-white">Revenue Share</h4>
                  <p class="text-white/60 text-sm">Earn your share from every plan purchased at your location.</p>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-wallet"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-white">Direct Payments</h4>
                  <p class="text-white/60 text-sm">Your earnings are deposited directly into your wallet, ready for bank withdrawal.</p>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-chart-line"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-white">Real-Time Reports</h4>
                  <p class="text-white/60 text-sm">Track your earnings in real time through your partner dashboard.</p>
                </div>
              </div>
            </div>
          </div>
          <div class="lg:w-1/2">
            <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" alt="Revenue" class="rounded-2xl w-full object-cover shadow-2xl" />
          </div>
        </div>
      </div>
    </section>

    <!-- Application Form -->
    <section class="py-16 lg:py-20 bg-[#111118]">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Apply to Partner</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">Join Us Today</h2>
          <p class="text-white/60">Fill out this form and we will get back to you within 2 days.</p>
        </div>

        <div v-if="submitted" class="card text-center py-12">
          <div class="w-16 h-16 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center text-3xl mx-auto mb-4">
            <i class="fas fa-check"></i>
          </div>
          <h3 class="text-xl font-semibold text-white mb-2">Application Sent!</h3>
          <p class="text-white/60">Thank you! Our team will contact you shortly.</p>
        </div>

        <form v-else @submit.prevent="submitApplication" class="card space-y-5">
          <div class="grid md:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Full Name *</label>
              <input v-model="form.name" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="Your full name" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Phone *</label>
              <input v-model="form.phone" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="07XX XXX XXX" />
            </div>
          </div>
          <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Email *</label>
            <input v-model="form.email" type="email" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="email@example.com" />
          </div>
          <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Partnership Type *</label>
              <select v-model="form.type" required class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors">
                <option value="">Select type</option>
              <option value="franchise">Franchise Owner</option>
              <option value="reseller">Reseller</option>
              <option value="sponsor">Sponsor / Advertiser</option>
            </select>
          </div>
          <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Area / Region</label>
              <input v-model="form.location" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors" placeholder="Dar es Salaam, Arusha, etc." />
          </div>
          <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">Message / Details</label>
              <textarea v-model="form.message" rows="3" class="w-full bg-[#0a0a0f] border border-[#1e1e2a] rounded-xl px-4 py-3 text-white focus:border-[#FF7A30] focus:outline-none transition-colors resize-none" placeholder="Tell us anything you want us to know..."></textarea>
          </div>
          <button type="submit" :disabled="submitting" class="w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-[#FF7A30]/20 disabled:opacity-50 disabled:cursor-not-allowed">
            <i v-if="submitting" class="fas fa-spinner fa-spin mr-2"></i>
            {{ submitting ? 'Sending...' : 'Submit Application' }}
          </button>
        </form>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">What Our Partners Say</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2">Testimonials</h2>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="card">
            <div class="flex items-center gap-1 text-[#FF7A30] mb-4">
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star text-sm"></i>
            </div>
            <p class="text-white/70 text-sm leading-relaxed mb-4">
              "I started HotBando in Temeke, Dar es Salaam. Revenue is great and the team's support is always there."
            </p>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[#FF7A30]/20 text-[#FF7A30] flex items-center justify-center font-semibold text-sm">JM</div>
              <div>
                <p class="text-white font-semibold text-sm">Juma Mwangi</p>
                <p class="text-white/50 text-xs">Franchise Owner — Temeke</p>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="flex items-center gap-1 text-[#FF7A30] mb-4">
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star text-sm"></i>
            </div>
            <p class="text-white/70 text-sm leading-relaxed mb-4">
              "As a reseller, I sell vouchers to students near our university. Profits are good and the system is easy to use."
            </p>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[#FF7A30]/20 text-[#FF7A30] flex items-center justify-center font-semibold text-sm">AM</div>
              <div>
                <p class="text-white font-semibold text-sm">Amina Mwakasege</p>
                <p class="text-white/50 text-xs">Reseller — Arusha</p>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="flex items-center gap-1 text-[#FF7A30] mb-4">
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star text-sm"></i>
              <i class="fas fa-star-half-alt text-sm"></i>
            </div>
            <p class="text-white/70 text-sm leading-relaxed mb-4">
              "We've been advertising on HotBando for 3 months and have gained many customers. Real-time reports are excellent."
            </p>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[#FF7A30]/20 text-[#FF7A30] flex items-center justify-center font-semibold text-sm">DK</div>
              <div>
                <p class="text-white font-semibold text-sm">David Kimaro</p>
                <p class="text-white/50 text-xs">Sponsor — Mwanza</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-16 lg:py-20 bg-gradient-to-r from-[#FF7A30] to-[#ea6a24]">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">Ready to Partner?</h2>
        <p class="text-white/80 text-lg mb-8">Start your internet business today with HotBando.</p>
        <button @click="showApply = true" class="bg-white text-[#FF7A30] hover:bg-white/90 px-8 py-3.5 rounded-full text-lg font-semibold transition-all shadow-lg">
          Join Us
        </button>
      </div>
    </section>
  </SiteLayout>
</template>

<script setup>
import { ref, reactive } from 'vue'
import SiteLayout from './components/SiteLayout.vue'

const showApply = ref(false)
const submitted = ref(false)
const submitting = ref(false)
const form = reactive({ name: '', phone: '', email: '', type: '', location: '', message: '' })

async function submitApplication() {
  submitting.value = true
  try {
    const res = await fetch('/api/public/partner-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (data.success) {
      submitted.value = true
    }
  } catch (e) {
    console.error('Application error:', e)
  } finally {
    submitting.value = false
  }
}
</script>
