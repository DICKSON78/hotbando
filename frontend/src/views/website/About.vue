<template>
  <SiteLayout>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-b from-[#111118] to-[#0a0a0f]">
      <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FF7A30]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center py-16 lg:py-24">
        <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">About Us</span>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mt-3 mb-5">About HotBando</h1>
        <p class="text-lg lg:text-xl text-white/60 max-w-2xl mx-auto">
          We believe every Tanzanian deserves fast, affordable, and accessible internet — wherever you are.
        </p>
      </div>
    </section>

    <!-- Mission / Vision -->
    <section class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-8">
        <div class="card">
          <div class="w-14 h-14 rounded-2xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center text-xl mb-5">
            <i class="fas fa-bullseye"></i>
          </div>
          <h3 class="text-xl font-semibold text-white mb-3">Our Mission</h3>
          <p class="text-white/60 leading-relaxed">
            To ensure every citizen — student, worker, or business owner — has access to fast, reliable internet at a price they can afford, powered by modern technology and community partnerships.
          </p>
        </div>
        <div class="card">
          <div class="w-14 h-14 rounded-2xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center text-xl mb-5">
            <i class="fas fa-eye"></i>
          </div>
          <h3 class="text-xl font-semibold text-white mb-3">Our Vision</h3>
          <p class="text-white/60 leading-relaxed">
            To become Tanzania's largest WiFi network, connecting millions of people and advancing education, business, and community development through internet that is accessible to all.
          </p>
        </div>
      </div>
    </section>

    <!-- Our Story -->
    <section class="py-16 lg:py-20 bg-[#0d0d14] border-y border-[#1e1e2a]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div class="h-72 lg:h-96 overflow-hidden rounded-2xl order-1">
            <img src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80" alt="Network tower" loading="lazy" class="w-full h-full object-cover" />
          </div>
          <div class="order-2">
            <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Our Story</span>
            <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-6">Built by BlackScience Technologies</h2>
            <p class="text-white/60 mb-4 leading-relaxed">
              HotBando is a product of <span class="text-white font-medium">BlackScience Technologies</span>, a Tanzanian technology company created to solve the country's biggest internet access challenge. We saw students unable to do research, families spending large amounts on data, and small businesses lacking reliable connectivity.
            </p>
            <p class="text-white/60 mb-4 leading-relaxed">
              So we built the HotBando platform — a hotspot system that unites community WiFi networks under one technology umbrella, allowing users to pay for just the time they need and earn free data by watching ads.
            </p>
            <p class="text-white/60 leading-relaxed">
              Today, HotBando continues to grow from a few locations to many cities across Tanzania — every hotspot being an income opportunity for our partners and a gateway to the internet for communities.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section class="py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Our Principles</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">Our Values</h2>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="value in values" :key="value.title" class="card text-center">
            <div class="w-14 h-14 rounded-2xl bg-[#FF7A30]/15 text-[#FF7A30] flex items-center justify-center text-xl mx-auto mb-5">
              <i :class="['fas', value.icon]"></i>
            </div>
            <h4 class="font-semibold text-white mb-2">{{ value.title }}</h4>
            <p class="text-white/60 text-sm leading-relaxed">{{ value.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Team -->
    <section class="py-16 lg:py-20 bg-[#0d0d14] border-y border-[#1e1e2a]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Our Team</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">The People Behind HotBando</h2>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="member in team" :key="member.role" class="card text-center">
            <div class="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF7A30] to-[#c25a1e] text-white flex items-center justify-center text-2xl font-bold mx-auto mb-5">{{ member.initials }}</div>
            <h4 class="font-semibold text-white">{{ member.name }}</h4>
            <p class="text-[#FF7A30] text-sm mt-1">{{ member.role }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Timeline -->
    <section class="py-16 lg:py-20">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-[#FF7A30] font-semibold tracking-wider uppercase text-sm">Our Journey</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">Milestones</h2>
          <div class="w-20 h-1 bg-[#FF7A30] mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="relative">
          <div class="absolute left-5 top-0 bottom-0 w-px bg-[#1e1e2a]"></div>
          <div v-for="(milestone, i) in milestones" :key="milestone.year" class="relative pl-16 pb-10 last:pb-0">
            <div class="absolute left-0 top-0 w-10 h-10 rounded-full bg-[#111118] border-2 border-[#FF7A30] text-[#FF7A30] flex items-center justify-center text-xs font-bold">{{ i + 1 }}</div>
            <span class="inline-block bg-[#FF7A30]/10 border border-[#FF7A30]/30 text-[#FF7A30] text-xs font-bold px-3 py-1 rounded-full mb-2">{{ milestone.year }}</span>
            <h4 class="font-semibold text-white mb-1">{{ milestone.title }}</h4>
            <p class="text-white/60 text-sm leading-relaxed">{{ milestone.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="pb-16 lg:pb-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF7A30] to-[#c25a1e] text-center py-16 px-6">
          <h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">Join Us on the Journey</h2>
          <p class="text-lg text-white/90 mb-8 max-w-2xl mx-auto">Whether you are a student, a partner, or an investor — there is a place for you in HotBando.</p>
          <div class="flex flex-col sm:flex-row justify-center gap-4">
            <router-link to="/hotspot" class="bg-white text-[#c25a1e] hover:bg-white/90 px-8 py-3.5 rounded-full text-lg font-semibold transition-all inline-flex items-center justify-center gap-2">
              <i class="fas fa-wifi"></i> Get Started
            </router-link>
            <router-link to="/partners" class="border-2 border-white text-white hover:bg-white/10 px-8 py-3.5 rounded-full text-lg font-semibold transition-all inline-flex items-center justify-center gap-2">
              Become a Partner
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </SiteLayout>
</template>

<script setup>
import SiteLayout from './components/SiteLayout.vue'

const values = [
  { icon: 'fa-universal-access', title: 'Accessibility', desc: 'Internet should reach everyone — in cities and rural areas, regardless of income.' },
  { icon: 'fa-tags', title: 'Affordability', desc: 'Clear, affordable pricing. Pay for what you use, no hidden fees.' },
  { icon: 'fa-shield-alt', title: 'Reliability', desc: 'A strong network with 99% uptime and 24/7 available support.' },
  { icon: 'fa-lightbulb', title: 'Innovation', desc: 'We use modern technology — like free data for watching ads — to change how the internet is purchased.' }
]

const team = [
  { initials: 'BS', name: 'BlackScience Team', role: 'Founder & CEO' },
  { initials: 'CT', name: 'Engineering', role: 'CTO & Developers' },
  { initials: 'OP', name: 'Operations', role: 'Head of Operations' },
  { initials: 'CS', name: 'Customer Care', role: 'Support Lead' }
]

const milestones = [
  { year: '2023', title: 'BlackScience Technologies Founded', desc: 'BlackScience Technologies was established with a goal to solve internet access challenges across Tanzania.' },
  { year: '2024', title: 'First Hotspot in Dar es Salaam', desc: 'HotBando\'s first hotspot was launched in Dar es Salaam, providing internet access to students and community members.' },
  { year: '2025', title: '50+ Locations & Ad Platform', desc: 'HotBando expanded to over 50 locations and launched an ad platform that provides free data to users and revenue for partners.' },
  { year: '2026', title: 'Nationwide Expansion', desc: 'Our goal this year: over 100 locations across the country, new partners, and better services for our users.' }
]
</script>
