<template>
  <SiteLayout>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-b from-[#111118] to-[#0a0a0f]">
      <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FF7A30]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center py-16 lg:py-24">
        <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Our Services</span>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mt-3 mb-5">Our Services</h1>
        <p class="text-lg lg:text-xl text-white/60 max-w-2xl mx-auto">
          Internet solutions designed specifically for students, communities, and businesses — all at affordable prices with top quality.
        </p>
      </div>
    </section>

    <!-- Detailed Services -->
    <section class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div
          v-for="(service, i) in services"
          :key="service.title"
          :class="['card grid lg:grid-cols-2 gap-8 lg:gap-12 items-center overflow-hidden', i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : '']"
        >
          <div class="h-64 lg:h-80 overflow-hidden rounded-2xl">
            <img :src="service.img" :alt="service.title" loading="lazy" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
          <div>
            <span class="inline-flex items-center gap-2 bg-[#FF7A30]/10 border border-[#FF7A30]/30 text-[#FF7A30] text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              <i :class="['fas', service.icon]"></i> {{ service.badge }}
            </span>
            <h2 class="text-2xl lg:text-3xl font-bold text-white mb-4">{{ service.title }}</h2>
            <p class="text-white/60 mb-6 leading-relaxed">{{ service.desc }}</p>
            <ul class="space-y-3 mb-6">
              <li v-for="point in service.points" :key="point" class="flex items-start gap-3 text-white/70 text-sm">
                <i class="fas fa-check-circle text-[#FF7A30] mt-0.5"></i> {{ point }}
              </li>
            </ul>
            <p class="text-[#FF7A30] text-lg font-bold mb-6">{{ service.price }}</p>
            <router-link :to="service.to" class="inline-flex items-center gap-2 bg-[#FF7A30] hover:bg-[#ea6a24] text-white px-8 py-3 rounded-full font-semibold transition-all shadow-lg shadow-[#FF7A30]/25">
              {{ service.cta }} <i class="fas fa-arrow-right"></i>
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="py-16 lg:py-20 bg-[#0d0d14] border-y border-[#1e1e2a]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Easy to Get Started</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">How It Works</h2>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div v-for="(step, i) in steps" :key="step.title" class="card text-center relative">
            <div class="w-14 h-14 rounded-full bg-[#FF7A30] text-white flex items-center justify-center text-xl font-bold mx-auto mb-5">{{ i + 1 }}</div>
            <h4 class="font-semibold text-white mb-2">{{ step.title }}</h4>
            <p class="text-white/60 text-sm leading-relaxed">{{ step.desc }}</p>
            <i v-if="i < steps.length - 1" class="fas fa-chevron-right hidden lg:block absolute top-1/2 -right-5 text-[#FF7A30]/50"></i>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-16 lg:py-20">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Questions</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">Frequently Asked Questions</h2>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="space-y-4">
          <div v-for="(faq, i) in faqs" :key="i" class="card !p-0 overflow-hidden">
            <button @click="toggleFaq(i)" class="w-full flex justify-between items-center gap-4 p-5 text-left">
              <span class="font-semibold text-white">{{ faq.q }}</span>
              <i :class="['fas fa-chevron-down text-[#FF7A30] transition-transform flex-shrink-0', openFaq === i ? 'rotate-180' : '']"></i>
            </button>
            <div v-show="openFaq === i" class="px-5 pb-5">
              <p class="text-white/60 text-sm leading-relaxed">{{ faq.a }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="pb-16 lg:pb-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF7A30] to-[#c25a1e] text-center py-16 px-6">
          <h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">Ready to Get Connected?</h2>
          <p class="text-lg text-white/90 mb-8 max-w-2xl mx-auto">Join thousands of happy users today. Get fast, affordable internet with HotBando.</p>
          <div class="flex flex-col sm:flex-row justify-center gap-4">
            <router-link to="/hotspot" class="bg-white text-[#c25a1e] hover:bg-white/90 px-8 py-3.5 rounded-full text-lg font-semibold transition-all inline-flex items-center justify-center gap-2">
              <i class="fas fa-wifi"></i> Get Started
            </router-link>
            <router-link to="/pricing" class="border-2 border-white text-white hover:bg-white/10 px-8 py-3.5 rounded-full text-lg font-semibold transition-all inline-flex items-center justify-center gap-2">
              View Our Plans
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </SiteLayout>
</template>

<script setup>
import { ref } from 'vue'
import SiteLayout from './components/SiteLayout.vue'

const openFaq = ref(0)

function toggleFaq(i) {
  openFaq.value = openFaq.value === i ? null : i
}

const services = [
  {
    badge: 'Education',
    icon: 'fa-graduation-cap',
    title: 'Internet for Students',
    desc: 'We have created special plans for school, college, and university students. Do in-depth research, attend online classes without interruptions, and watch educational videos at the lowest possible cost.',
    points: ['Academic research and school assignments', 'Online classes (Zoom, Google Meet)', 'Educational videos and e-learning platforms', 'Free data for watching ads'],
    price: 'Starting TZS 500 / 6 Hours',
    img: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80',
    cta: 'Get Started',
    to: '/hotspot/signup'
  },
  {
    badge: 'Community',
    icon: 'fa-users',
    title: 'Internet for Communities',
    desc: 'Connect your family, friends, and neighbors with one trusted network. Flexible plans let you pay for what you use — by the hour, day, week, or full month.',
    points: ['Connectivity for families and neighbors', 'Plans by hour, day, week, and month', 'Easy sign-up with your phone number', 'Nearby support through our agents'],
    price: 'TZS 500 — TZS 20,000',
    img: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    cta: 'View Our Plans',
    to: '/pricing'
  },
  {
    badge: 'Business',
    icon: 'fa-briefcase',
    title: 'Internet for Businesses',
    desc: 'Offices, cafes, hotels, and commercial spaces need reliable, high-quality connectivity. We offer business-grade solutions with high speeds, dedicated support, and the capacity to connect many devices.',
    points: ['High speed up to 100 Mbps', 'Dedicated technical support', 'Capacity for up to 100 devices', '99% uptime with backup'],
    price: 'Custom Business Plans',
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    cta: 'Become a Partner',
    to: '/partners'
  }
]

const steps = [
  { title: 'Connect', desc: 'Connect your phone or computer to the nearest HotBando WiFi network.' },
  { title: 'Sign Up', desc: 'Register with your phone number in seconds — no complicated steps.' },
  { title: 'Buy a Plan', desc: 'Choose the plan that suits you and pay via ClickPesa, voucher, or an agent.' },
  { title: 'Enjoy the Internet', desc: 'Start using fast internet right away. Watch ads to earn free data!' }
]

const faqs = [
  {
    q: 'How do I buy a plan?',
    a: 'There are three ways: (1) Online via ClickPesa through the customer portal or the Pricing page, (2) with a voucher code you buy from our reseller/agent, or (3) in cash at an agent near you.'
  },
  {
    q: 'Can I get free data?',
    a: 'Yes! In the customer portal, watch short sponsored video ads and earn extra free data. Every ad you watch gives you free data.'
  },
  {
    q: 'What devices do I need?',
    a: 'You only need a smartphone, laptop, or tablet with WiFi, and to be within range of a HotBando hotspot. No extra equipment is required for users.'
  },
  {
    q: 'What is the internet speed?',
    a: 'Speed depends on your plan: MASAA 6 offers 5 Mbps, MASAA 24 and WIKI 1 offer 10 Mbps, and MWEEZI 1 offers 15 Mbps. Businesses can get up to 100 Mbps.'
  },
  {
    q: 'How can I get support?',
    a: 'Our support team is available 24/7. You can reach us on WhatsApp (+255 712 345 678), by phone, email (info@hotbando.co.tz), or via the contact form.'
  },
  {
    q: 'Can I change my plan?',
    a: 'Yes, you can buy a new plan at any time through the customer portal. The remaining time on your current plan is added to your new one.'
  }
]
</script>
