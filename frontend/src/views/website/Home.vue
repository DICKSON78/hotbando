<template>
  <SiteLayout>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-b from-[#111118] via-[#0a0a0f] to-[#0a0a0f]">
      <div class="absolute inset-0 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="opacity-[0.05]">
          <defs>
            <pattern id="honeycomb-hero" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
              <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="#FF7A30" stroke-width="1.5"/>
              <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="#FF7A30" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#honeycomb-hero)"/>
        </svg>
      </div>
      <div class="absolute -top-40 -left-40 w-[500px] h-[500px] bg-[#FF7A30]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-20 -right-40 w-[400px] h-[400px] bg-[#FF7A30]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 py-16 lg:py-24">
          <div class="lg:w-1/2 text-center lg:text-left">
            <span class="inline-flex items-center gap-2 bg-[#FF7A30]/10 border border-[#FF7A30]/30 text-[#FF7A30] text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              <i class="fas fa-wifi"></i> Fast WiFi Across Tanzania
            </span>
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Fast, <span class="text-[#FF7A30]">Affordable &amp; Accessible</span> Internet
            </h1>
            <p class="text-lg lg:text-xl text-white/60 mb-8 max-w-xl mx-auto lg:mx-0">
              HotBando delivers high-speed internet for students, families, and businesses.
              Buy affordable plans or earn free data by watching ads.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <router-link
                to="/hotspot"
                class="bg-[#FF7A30] hover:bg-[#ea6a24] text-white px-8 py-3.5 rounded-full text-lg font-semibold transition-all shadow-lg shadow-[#FF7A30]/25 inline-flex items-center justify-center gap-2"
              >
                <i class="fas fa-bolt"></i> Get Started
              </router-link>
              <router-link
                to="/pricing"
                class="border-2 border-[#FF7A30] text-[#FF7A30] hover:bg-[#FF7A30]/10 px-8 py-3.5 rounded-full text-lg font-semibold transition-all inline-flex items-center justify-center gap-2"
              >
                Our Plans <i class="fas fa-arrow-right"></i>
              </router-link>
            </div>
          </div>

          <div class="lg:w-1/2 relative flex justify-center w-full">
            <div class="relative w-full max-w-lg">
              <img
                src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80"
                alt="WiFi Router"
                class="w-full h-72 lg:h-80 object-cover rounded-2xl border border-[#1e1e2a] shadow-2xl shadow-black/50"
              />
              <img
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80"
                alt="Internet user"
                loading="lazy"
                class="hidden sm:block absolute -bottom-10 -left-6 lg:-left-12 w-48 lg:w-56 h-36 lg:h-40 object-cover rounded-2xl border-4 border-[#0a0a0f] shadow-xl"
              />
              <div class="absolute -top-5 -right-3 lg:-right-6 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-4 shadow-xl">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center"><i class="fas fa-wifi"></i></div>
                  <div>
                    <p class="text-xs text-white/50">Connected to</p>
                    <p class="text-sm font-bold text-white">HotBando WiFi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="py-12 lg:py-16 border-y border-[#1e1e2a] bg-[#0d0d14]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 text-center">
          <div v-for="stat in stats" :key="stat.label" class="stat-card !bg-transparent !border-[#1e1e2a]">
            <div class="text-3xl lg:text-4xl font-bold text-[#FF7A30] mb-1">{{ stat.value }}</div>
            <div class="text-white/60 font-medium text-sm">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Services -->
    <section id="services" class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Our Services</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">Internet Solutions for Everyone</h2>
          <p class="text-lg text-white/60 max-w-2xl mx-auto">
            Tailored connectivity packages designed for students, communities, and businesses.
          </p>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div v-for="service in services" :key="service.title" class="card overflow-hidden group">
            <div class="h-48 overflow-hidden rounded-xl mb-6">
              <img :src="service.img" :alt="service.title" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <h3 class="text-xl font-semibold text-white mb-3">{{ service.title }}</h3>
            <p class="text-white/60 mb-4">{{ service.desc }}</p>
            <p class="text-[#FF7A30] font-semibold mb-5">{{ service.price }}</p>
            <router-link :to="service.to" class="inline-flex items-center gap-2 text-[#FF7A30] font-semibold hover:gap-3 transition-all">
              {{ service.cta }} <i class="fas fa-arrow-right"></i>
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Us -->
    <section id="why-us" class="py-16 lg:py-20 bg-[#0d0d14] border-y border-[#1e1e2a]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Why Choose Us</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">The HotBando Advantage</h2>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="feature in features" :key="feature.title" class="card text-center">
            <div class="w-14 h-14 rounded-2xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center text-xl mx-auto mb-5">
              <i :class="['fas', feature.icon]"></i>
            </div>
            <h4 class="font-semibold text-white mb-2">{{ feature.title }}</h4>
            <p class="text-white/60 text-sm leading-relaxed">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Preview -->
    <section id="pricing" class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Our Pricing</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">Simple, Transparent Plans</h2>
          <p class="text-lg text-white/60 max-w-2xl mx-auto">Choose the plan that fits your needs. No hidden fees.</p>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div v-for="pkg in packages" :key="pkg.name" :class="['card relative flex flex-col', pkg.popular ? 'border-[#FF7A30]' : '']">
            <span v-if="pkg.popular" class="absolute top-4 right-4 bg-[#FF7A30] text-white text-xs font-semibold px-3 py-1 rounded-full">Popular</span>
            <h3 class="text-xl font-semibold text-white">{{ pkg.name }}</h3>
            <p class="text-white/50 text-sm mt-1">{{ pkg.tagline }}</p>
            <div class="mt-5 mb-6">
              <span class="text-4xl font-bold text-[#FF7A30]">TSh {{ pkg.price }}</span>
              <span class="text-white/50 text-sm">/ {{ pkg.duration }}</span>
            </div>
            <ul class="space-y-3 mb-8 flex-1">
              <li v-for="f in pkg.features" :key="f" class="flex items-start gap-3 text-white/70 text-sm">
                <i class="fas fa-check text-[#FF7A30] mt-0.5"></i> {{ f }}
              </li>
            </ul>
            <router-link to="/hotspot/subscribe" class="block w-full text-center bg-[#FF7A30] hover:bg-[#ea6a24] text-white font-semibold py-3 rounded-full transition-all">Buy Now</router-link>
          </div>
        </div>

        <div class="text-center mt-10">
          <router-link to="/pricing" class="inline-flex items-center gap-2 border-2 border-[#FF7A30] text-[#FF7A30] hover:bg-[#FF7A30]/10 px-8 py-3 rounded-full font-semibold transition-all">
            View All Plans <i class="fas fa-arrow-right"></i>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Partner -->
    <section id="partner" class="py-16 lg:py-20 bg-[#0d0d14] border-y border-[#1e1e2a]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Business Opportunity</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">Become a HotBando Partner</h2>
          <p class="text-lg text-white/60 max-w-2xl mx-auto">Start your own internet business with our proven platform. We give you everything you need.</p>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="card grid lg:grid-cols-2 gap-10">
          <div>
            <h3 class="text-2xl font-bold text-white mb-6">How It Works</h3>
            <div class="space-y-6">
              <div v-for="(step, i) in partnerSteps" :key="step.title" class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-full bg-[#FF7A30] text-white flex items-center justify-center font-bold flex-shrink-0">{{ i + 1 }}</div>
                <div>
                  <h4 class="font-semibold text-white">{{ step.title }}</h4>
                  <p class="text-white/60 text-sm mt-0.5">{{ step.desc }}</p>
                </div>
              </div>
            </div>
            <router-link to="/partners" class="mt-8 inline-flex items-center gap-2 bg-[#FF7A30] hover:bg-[#ea6a24] text-white px-8 py-3.5 rounded-full font-semibold transition-all shadow-lg shadow-[#FF7A30]/25">
              <i class="fas fa-handshake"></i> Apply Now
            </router-link>
          </div>

          <div class="space-y-4">
            <h3 class="text-2xl font-bold text-white mb-2">Hardware Bundles</h3>
            <div v-for="bundle in bundles" :key="bundle.name" class="bg-[#0a0a0f] border border-[#1e1e2a] rounded-2xl p-6 hover:border-[#FF7A30]/50 transition-colors">
              <div class="flex justify-between items-start mb-2">
                <h4 class="text-lg font-semibold text-white">{{ bundle.name }}</h4>
                <span class="text-xl font-bold text-[#FF7A30]">{{ bundle.price }}</span>
              </div>
              <p class="text-white/60 text-sm mb-3">{{ bundle.specs }}</p>
              <p class="text-white/40 text-xs uppercase tracking-wide">{{ bundle.suitable }}</p>
            </div>
            <div class="bg-[#FF7A30]/10 border border-[#FF7A30]/30 rounded-xl p-4">
              <p class="text-white/80 text-sm"><i class="fas fa-info-circle text-[#FF7A30] mr-2"></i>Every bundle includes installation, training, and full technical support.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Portals -->
    <section id="portals" class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Access Your Portal</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">One Account, All Portals</h2>
          <p class="text-lg text-white/60 max-w-2xl mx-auto">Log in to your dashboard to manage your account, plans, ads, and earnings.</p>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <router-link v-for="portal in portals" :key="portal.title" :to="portal.href" class="card group">
            <div class="w-12 h-12 rounded-full bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center mb-5 group-hover:bg-[#FF7A30] group-hover:text-white transition-colors">
              <i :class="['fas text-lg', portal.icon]"></i>
            </div>
            <h3 class="text-lg font-semibold text-white mb-1">{{ portal.title }}</h3>
            <p class="text-white/60 text-sm mb-4">{{ portal.desc }}</p>
            <span class="text-[#FF7A30] text-sm font-semibold">Open Portal <i class="fas fa-arrow-right ml-1"></i></span>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Contact -->
    <section id="contact" class="py-16 lg:py-20 bg-[#0d0d14] border-t border-[#1e1e2a]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Contact</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">Get in Touch</h2>
          <p class="text-lg text-white/60 max-w-2xl mx-auto">Have a question or want to learn more? We're here to help.</p>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="card max-w-5xl mx-auto">
          <div class="grid md:grid-cols-2 gap-10">
            <div>
              <h3 class="text-xl font-semibold text-white mb-6">Contact Details</h3>
              <div class="space-y-5">
                <div class="flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0"><i class="fas fa-phone-alt"></i></div>
                  <div><p class="font-medium text-white">Phone</p><p class="text-white/60 text-sm">+255 712 345 678</p></div>
                </div>
                <div class="flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0"><i class="fab fa-whatsapp"></i></div>
                  <div><p class="font-medium text-white">WhatsApp</p><a href="https://wa.me/255712345678" target="_blank" rel="noopener" class="text-[#FF7A30] text-sm hover:underline">wa.me/255712345678</a></div>
                </div>
                <div class="flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0"><i class="fas fa-envelope"></i></div>
                  <div><p class="font-medium text-white">Email</p><p class="text-white/60 text-sm">info@hotbando.co.tz</p></div>
                </div>
                <div class="flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center flex-shrink-0"><i class="fas fa-map-marker-alt"></i></div>
                  <div><p class="font-medium text-white">Locations</p><p class="text-white/60 text-sm">Dar es Salaam, Arusha, Mwanza, Dodoma and more</p></div>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-xl font-semibold text-white mb-6">Send Message</h3>
              <form @submit.prevent="submitContact" class="space-y-4">
                <div>
                  <label class="form-label">Your Name *</label>
                  <input v-model="contact.name" required class="form-input" placeholder="Your full name" />
                </div>
                <div>
                  <label class="form-label">Email *</label>
                  <input v-model="contact.email" type="email" required class="form-input" placeholder="email@example.com" />
                </div>
                <div>
                  <label class="form-label">Message *</label>
                  <textarea v-model="contact.message" required rows="4" class="form-input" placeholder="How can we help?"></textarea>
                </div>
                <p v-if="contactError" class="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{{ contactError }}</p>
                <p v-if="contactSuccess" class="text-green-400 text-sm bg-green-500/10 border border-green-500/20 p-3 rounded-lg">{{ contactSuccess }}</p>
                <button type="submit" :disabled="contactSubmitting" class="w-full bg-[#FF7A30] hover:bg-[#ea6a24] disabled:opacity-50 text-white font-semibold py-3.5 rounded-full transition-all">
                  {{ contactSubmitting ? 'Sending...' : 'Send Message' }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  </SiteLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SiteLayout from './components/SiteLayout.vue'

const stats = ref([
  { value: '10K+', label: 'Active Users' },
  { value: '50+', label: 'Hotspot Locations' },
  { value: '100K+', label: 'GB Data Delivered' },
  { value: '99%', label: 'Network Uptime' }
])

const services = [
  {
    title: 'For Students',
    desc: 'Affordable internet for research, online classes, and educational videos. Start from just TZS 500.',
    price: 'Starting TZS 500',
    img: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80',
    cta: 'Buy Package',
    to: '/hotspot/subscribe'
  },
  {
    title: 'For Communities',
    desc: 'Connect family, friends, and neighbors with fast, reliable internet that everyone can use.',
    price: 'TZS 500 — TZS 20,000',
    img: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    cta: 'View Plans',
    to: '/pricing'
  },
  {
    title: 'For Businesses',
    desc: 'Business-grade connectivity with dedicated support. Great for offices, cafes, and commercial spaces.',
    price: 'Custom Business Plans',
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    cta: 'Become a Partner',
    to: '/partners'
  }
]

const features = [
  { icon: 'fa-bolt', title: 'Blazing Fast Speed', desc: 'Up to 100 Mbps for uninterrupted streaming, gaming, and video calls.' },
  { icon: 'fa-shield-alt', title: 'Reliable Connection', desc: '99% uptime backed by enterprise-grade infrastructure.' },
  { icon: 'fa-circle-play', title: 'Free Data via Ads', desc: 'Watch short ads and earn free data at no cost at all.' },
  { icon: 'fa-headset', title: '24/7 Support', desc: 'Our team is ready to help you anytime, day or night.' }
]

const packages = [
  {
    name: 'MASAA 6',
    tagline: 'For short browsing sessions.',
    price: '500',
    duration: '6 Hours',
    features: ['Speed: 5 Mbps', 'Frequent ads', 'Standard support'],
    popular: false
  },
  {
    name: 'MASAA 24',
    tagline: 'Great for everyday browsing.',
    price: '1,000',
    duration: '24 Hours',
    features: ['Speed: 10 Mbps', 'Fewer ads', 'Priority support'],
    popular: true
  },
  {
    name: 'WIKI 1',
    tagline: 'A full week of browsing.',
    price: '6,000',
    duration: '7 Days',
    features: ['Speed: 10 Mbps', 'Very few ads', '24/7 support'],
    popular: false
  }
]

const partnerSteps = [
  { title: 'Apply Online', desc: 'Fill out a simple application form to become a HotBando partner.' },
  { title: 'Choose Your Bundle', desc: 'Pick Starter, Pro, or Elite depending on your needs.' },
  { title: 'Get Financing', desc: 'Our finance partners review and approve your funding request.' },
  { title: 'Equipment Installed', desc: 'HotBando ships and installs all equipment along with training.' },
  { title: 'Start Earning', desc: 'Revenue starts flowing from day one after installation.' }
]

const bundles = [
  { name: 'Starter', price: 'TSh 350,000', specs: 'Up to 20 devices • MikroTik hAP ac2 • 10–20 Mbps', suitable: 'Small homes, hostels' },
  { name: 'Pro', price: 'TSh 600,000', specs: 'Up to 50 devices • MikroTik RB450G • 20–40 Mbps', suitable: 'Mid-size hostels, cafes' },
  { name: 'Elite', price: 'TSh 950,000', specs: 'Up to 100 devices • MikroTik RB4011 • 40–100 Mbps', suitable: 'Large areas, apartment buildings' }
]

const portals = [
  { title: 'Customer Portal', desc: 'Manage your data, buy plans, and watch ads for free data.', href: '/hotspot', icon: 'fa-user' },
  { title: 'Admin Panel', desc: 'Manage users, locations, routers, revenue, and platform settings.', href: '/login', icon: 'fa-shield-halved' },
  { title: 'Sponsor Portal', desc: 'Upload ads, run campaigns, and track your ad performance.', href: '/login', icon: 'fa-bullhorn' },
  { title: 'Partner Sign In', desc: 'Franchise owners and bank partners manage their dashboards.', href: '/login', icon: 'fa-building' },
  { title: 'Buy Voucher', desc: 'Buy a plan directly without an account.', href: '/hotspot/subscribe', icon: 'fa-ticket' },
  { title: 'Watch Ads', desc: 'Earn free data by watching short sponsored videos.', href: '/hotspot/ads', icon: 'fa-circle-play' }
]

const contactSubmitting = ref(false)
const contactError = ref('')
const contactSuccess = ref('')
const contact = ref({ name: '', email: '', message: '' })

async function submitContact() {
  contactSubmitting.value = true
  contactError.value = ''
  contactSuccess.value = ''
  try {
    const r = await fetch('/api/public/contact-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact.value)
    })
    const data = await r.json()
    if (data.success) {
      contactSuccess.value = data.message || 'Message sent successfully!'
      contact.value = { name: '', email: '', message: '' }
    } else {
      contactError.value = data.message || 'An error occurred. Please try again.'
    }
  } catch {
    contactError.value = 'Connection error. Please try again.'
  } finally {
    contactSubmitting.value = false
  }
}

onMounted(async () => {
  try {
    const r = await fetch('/api/public/stats')
    if (!r.ok) return
    const data = await r.json()
    if (data && data.success && data.stats) {
      const s = data.stats
      stats.value = [
        { value: s.users ?? stats.value[0].value, label: 'Active Users' },
        { value: s.locations ?? stats.value[1].value, label: 'Hotspot Locations' },
        { value: s.data_gb ?? stats.value[2].value, label: 'GB Data Delivered' },
        { value: s.uptime ?? stats.value[3].value, label: 'Network Uptime' }
      ]
    }
  } catch {}
})
</script>
