<template>
  <SiteLayout>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-b from-[#111118] to-[#0a0a0f]">
      <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FF7A30]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center py-16 lg:py-24">
        <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Our Pricing</span>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mt-3 mb-5">Our Pricing</h1>
        <p class="text-lg lg:text-xl text-white/60 max-w-2xl mx-auto">
          Simple, transparent, and affordable plans. Pay only for the time you need — no hidden fees, no long-term contracts.
        </p>
      </div>
    </section>

    <!-- Pricing Cards -->
    <section class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-stretch">
          <div
            v-for="pkg in packages"
            :key="pkg.name"
            :class="['card relative flex flex-col', pkg.popular ? 'border-2 border-[#FF7A30] shadow-xl shadow-[#FF7A30]/10 lg:-translate-y-3' : '']"
          >
            <span v-if="pkg.popular" class="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF7A30] text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">Popular</span>
            <h3 class="text-xl font-semibold text-white">{{ pkg.name }}</h3>
            <p class="text-white/50 text-sm mt-1 mb-5">{{ pkg.tagline }}</p>
            <div class="mb-6">
              <span class="text-4xl font-bold text-[#FF7A30]">TSh {{ pkg.price }}</span>
            </div>
            <ul class="space-y-3 mb-8 flex-1">
              <li v-for="f in pkg.features" :key="f" class="flex items-start gap-3 text-white/70 text-sm">
                <i class="fas fa-check text-[#FF7A30] mt-0.5"></i> {{ f }}
              </li>
            </ul>
            <router-link
              to="/hotspot/subscribe"
              :class="['block w-full text-center font-semibold py-3 rounded-full transition-all', pkg.popular ? 'bg-[#FF7A30] hover:bg-[#ea6a24] text-white' : 'border-2 border-[#FF7A30] text-[#FF7A30] hover:bg-[#FF7A30]/10']"
            >Buy Now</router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Comparison Table -->
    <section class="py-16 lg:py-20 bg-[#0d0d14] border-y border-[#1e1e2a]">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Compare</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">Compare Plans</h2>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="card !p-0 overflow-x-auto">
          <table class="w-full text-sm min-w-[600px]">
            <thead>
              <tr class="bg-[#0a0a0f] border-b border-[#1e1e2a]">
                <th class="text-left px-5 py-4 text-white/50 uppercase tracking-wider text-xs font-semibold">Feature</th>
                <th v-for="pkg in packages" :key="pkg.name" class="px-5 py-4 text-center">
                  <span class="font-semibold text-white">{{ pkg.name }}</span>
                  <span v-if="pkg.popular" class="block text-[10px] text-[#FF7A30] font-semibold uppercase tracking-wide mt-0.5">Popular</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in comparison" :key="row.label" :class="['border-b border-[#1e1e2a]/60', i % 2 === 1 ? 'bg-white/[0.02]' : '']">
                <td class="px-5 py-4 text-white/60">{{ row.label }}</td>
                <td v-for="pkg in packages" :key="pkg.name" class="px-5 py-4 text-center text-white/80">{{ row.values[pkg.name] }}</td>
              </tr>
              <tr>
                <td class="px-5 py-4"></td>
                <td v-for="pkg in packages" :key="pkg.name" class="px-5 py-4 text-center">
                  <router-link to="/hotspot/subscribe" class="inline-block bg-[#FF7A30] hover:bg-[#ea6a24] text-white text-xs font-semibold px-4 py-2 rounded-full transition-all">Buy</router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- How to Buy -->
    <section class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Payments</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">How to Buy</h2>
          <p class="text-lg text-white/60 max-w-2xl mx-auto">Three easy ways to get HotBando internet instantly.</p>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div v-for="(method, i) in methods" :key="method.title" class="card text-center relative">
            <div class="w-14 h-14 rounded-2xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center text-xl mx-auto mb-5">
              <i :class="['fas', method.icon]"></i>
            </div>
            <span class="absolute top-4 left-4 text-white/20 font-bold text-lg">0{{ i + 1 }}</span>
            <h4 class="font-semibold text-white mb-2">{{ method.title }}</h4>
            <p class="text-white/60 text-sm leading-relaxed">{{ method.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="pb-16 lg:pb-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF7A30] to-[#c25a1e] text-center py-16 px-6">
          <h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">Choose Your Plan Today</h2>
          <p class="text-lg text-white/90 mb-8 max-w-2xl mx-auto">Get connected in minutes. No contracts, no hidden fees.</p>
          <router-link to="/hotspot" class="inline-flex items-center gap-2 bg-white text-[#c25a1e] hover:bg-white/90 px-10 py-4 rounded-full text-lg font-semibold transition-all">
            <i class="fas fa-bolt"></i> Get Started
          </router-link>
        </div>
      </div>
    </section>
  </SiteLayout>
</template>

<script setup>
import SiteLayout from './components/SiteLayout.vue'

const packages = [
  {
    name: 'MASAA 6',
    tagline: 'For short browsing sessions.',
    price: '500',
    features: ['6 hours of usage', 'Speed: 5 Mbps', 'Frequent ads', 'Standard support'],
    popular: false
  },
  {
    name: 'MASAA 24',
    tagline: 'Great for everyday use.',
    price: '1,000',
    features: ['24 hours of usage', 'Speed: 10 Mbps', 'Fewer ads', 'Priority support'],
    popular: true
  },
  {
    name: 'WIKI 1',
    tagline: 'A full week, worry-free.',
    price: '6,000',
    features: ['7 days of usage', 'Speed: 10 Mbps', 'Very few ads', '24/7 support'],
    popular: false
  },
  {
    name: 'MWEEZI 1',
    tagline: 'Best value for a full month.',
    price: '20,000',
    features: ['30 days of usage', 'Speed: 15 Mbps', 'Very few ads', 'Priority 24/7 support'],
    popular: false
  }
]

const comparison = [
  { label: 'Price (TSh)', values: { 'MASAA 6': '500', 'MASAA 24': '1,000', 'WIKI 1': '6,000', 'MWEEZI 1': '20,000' } },
  { label: 'Usage Duration', values: { 'MASAA 6': '6 Hours', 'MASAA 24': '24 Hours', 'WIKI 1': '7 Days', 'MWEEZI 1': '30 Days' } },
  { label: 'Internet Speed', values: { 'MASAA 6': '5 Mbps', 'MASAA 24': '10 Mbps', 'WIKI 1': '10 Mbps', 'MWEEZI 1': '15 Mbps' } },
  { label: 'Ads', values: { 'MASAA 6': 'Standard', 'MASAA 24': 'Fewer', 'WIKI 1': 'Very few', 'MWEEZI 1': 'Very few' } },
  { label: 'Free Data via Ads', values: { 'MASAA 6': 'Yes', 'MASAA 24': 'Yes', 'WIKI 1': 'Yes', 'MWEEZI 1': 'Yes' } },
  { label: 'Support', values: { 'MASAA 6': 'Standard', 'MASAA 24': 'Priority', 'WIKI 1': '24/7', 'MWEEZI 1': 'Priority 24/7' } }
]

const methods = [
  {
    icon: 'fa-mobile-screen-button',
    title: 'Online via ClickPesa',
    desc: 'Buy a plan directly through the customer portal or the Subscribe page using M-Pesa, Tigo Pesa, Airtel Money, or Halo Pesa via ClickPesa.'
  },
  {
    icon: 'fa-ticket',
    title: 'Voucher Code',
    desc: 'Buy a voucher from our reseller or agent near you, then enter the code in the customer portal to activate your plan.'
  },
  {
    icon: 'fa-money-bill-wave',
    title: 'Cash at an Agent',
    desc: 'Visit your nearest HotBando agent, pay in cash, and get your plan instantly. Our agents are ready to help you.'
  }
]
</script>
