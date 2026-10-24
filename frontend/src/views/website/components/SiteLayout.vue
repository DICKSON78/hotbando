<template>
  <div class="min-h-screen bg-[#0a0a0f] text-white">
    <!-- Navbar -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-[#111118] border-b border-[#1e1e2a]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 lg:h-20 items-center">
          <router-link to="/" class="flex items-center space-x-2">
            <img src="/hot-bando-logo.png" alt="HotBando" class="h-8 lg:h-10 rounded-full object-cover" />
            <span class="text-xl lg:text-2xl font-bold text-white">Hot<span class="text-[#FF7A30]">Bando</span></span>
          </router-link>

          <div class="hidden lg:flex items-center space-x-8">
            <router-link
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              :class="['nav-link font-medium transition-colors', isActive(link.to) ? 'text-[#FF7A30]' : 'text-white/60 hover:text-white']"
            >{{ link.label }}</router-link>
            <router-link
              to="/login"
              class="bg-[#FF7A30] hover:bg-[#ea6a24] text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-[#FF7A30]/20"
            >Sign In</router-link>
          </div>

          <button @click="mobileOpen = !mobileOpen" class="lg:hidden text-white/70 hover:text-white p-2" aria-label="Menu">
            <i :class="['fas text-xl', mobileOpen ? 'fa-xmark' : 'fa-bars']"></i>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div :class="['lg:hidden overflow-hidden border-t border-[#1e1e2a] bg-[#111118] transition-all duration-300', mobileOpen ? 'max-h-[420px]' : 'max-h-0 border-t-0']">
        <div class="px-4 py-3 space-y-1">
          <router-link
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            @click="mobileOpen = false"
            :class="['block px-4 py-2.5 rounded-lg font-medium', isActive(link.to) ? 'text-[#FF7A30] bg-[#FF7A30]/10' : 'text-white/60 hover:text-white hover:bg-white/5']"
          >{{ link.label }}</router-link>
          <router-link
            to="/login"
            @click="mobileOpen = false"
            class="block w-full bg-[#FF7A30] hover:bg-[#ea6a24] text-white px-6 py-2.5 rounded-full font-semibold text-center transition-all mt-2"
          >Sign In</router-link>
        </div>
      </div>
    </nav>

    <!-- Page content -->
    <main class="pt-16 lg:pt-20">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-[#111118] border-t border-[#1e1e2a] pt-16 pb-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <div class="flex items-center space-x-2 mb-4">
              <img src="/hot-bando-logo.png" alt="HotBando" class="h-9 rounded-full object-cover" />
              <span class="text-xl font-bold text-white">Hot<span class="text-[#FF7A30]">Bando</span></span>
            </div>
            <p class="text-white/60 text-sm leading-relaxed mb-5">
              Fast, affordable internet for students, families and businesses across Tanzania.
            </p>
            <div class="flex space-x-3">
              <a href="#" aria-label="Facebook" class="w-9 h-9 rounded-full bg-white/5 border border-[#1e1e2a] hover:bg-[#FF7A30] hover:border-[#FF7A30] flex items-center justify-center transition-all"><i class="fab fa-facebook-f text-sm"></i></a>
              <a href="#" aria-label="Twitter" class="w-9 h-9 rounded-full bg-white/5 border border-[#1e1e2a] hover:bg-[#FF7A30] hover:border-[#FF7A30] flex items-center justify-center transition-all"><i class="fab fa-twitter text-sm"></i></a>
              <a href="#" aria-label="Instagram" class="w-9 h-9 rounded-full bg-white/5 border border-[#1e1e2a] hover:bg-[#FF7A30] hover:border-[#FF7A30] flex items-center justify-center transition-all"><i class="fab fa-instagram text-sm"></i></a>
              <a href="#" aria-label="LinkedIn" class="w-9 h-9 rounded-full bg-white/5 border border-[#1e1e2a] hover:bg-[#FF7A30] hover:border-[#FF7A30] flex items-center justify-center transition-all"><i class="fab fa-linkedin-in text-sm"></i></a>
            </div>
          </div>

          <div>
            <h4 class="font-semibold text-white mb-4 uppercase tracking-wider text-sm">Quick Links</h4>
            <ul class="space-y-2.5 text-sm">
              <li v-for="link in links.slice(1)" :key="link.to">
                <router-link :to="link.to" class="text-white/60 hover:text-[#FF7A30] transition-colors">{{ link.label }}</router-link>
              </li>
            </ul>
          </div>

          <div>
            <h4 class="font-semibold text-white mb-4 uppercase tracking-wider text-sm">Portals</h4>
            <ul class="space-y-2.5 text-sm">
              <li><router-link to="/hotspot" class="text-white/60 hover:text-[#FF7A30] transition-colors">Customer Portal</router-link></li>
              <li><router-link to="/hotspot/subscribe" class="text-white/60 hover:text-[#FF7A30] transition-colors">Buy Voucher</router-link></li>
              <li><router-link to="/hotspot/ads" class="text-white/60 hover:text-[#FF7A30] transition-colors">Watch Ads</router-link></li>
              <li><router-link to="/reseller/signup" class="text-white/60 hover:text-[#FF7A30] transition-colors">Become a Reseller</router-link></li>
              <li><router-link to="/login" class="text-white/60 hover:text-[#FF7A30] transition-colors">Partner Sign In</router-link></li>
            </ul>
          </div>

          <div>
            <h4 class="font-semibold text-white mb-4 uppercase tracking-wider text-sm">Contact</h4>
            <ul class="space-y-3 text-sm text-white/60">
              <li class="flex items-start gap-3"><i class="fas fa-envelope text-[#FF7A30] mt-0.5"></i> info@hotbando.co.tz</li>
              <li class="flex items-start gap-3"><i class="fas fa-phone-alt text-[#FF7A30] mt-0.5"></i> +255 712 345 678</li>
              <li class="flex items-start gap-3"><i class="fas fa-map-marker-alt text-[#FF7A30] mt-0.5"></i> Dar es Salaam, Tanzania</li>
              <li class="flex items-start gap-3"><i class="fas fa-clock text-[#FF7A30] mt-0.5"></i> 24/7 Support</li>
            </ul>
          </div>
        </div>

        <div class="mt-12 pt-8 border-t border-[#1e1e2a] flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-white/40">
          <p>&copy; {{ year }} HotBando WiFi by BlackScience Technologies. All rights reserved.</p>
          <div class="flex gap-6">
            <a href="#" class="hover:text-[#FF7A30] transition-colors">Privacy Policy</a>
            <a href="#" class="hover:text-[#FF7A30] transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- WhatsApp Float -->
    <a
      href="https://wa.me/255712345678"
      target="_blank"
      rel="noopener"
      aria-label="WhatsApp"
      class="whatsapp-float"
    >
      <i class="fab fa-whatsapp text-3xl"></i>
    </a>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const mobileOpen = ref(false)
const year = new Date().getFullYear()

const links = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
  { label: 'Partners', to: '/partners' },
  { label: 'Contact', to: '/contact' }
]

function isActive(to) {
  return route.path === to
}
</script>

<style scoped>
.nav-link {
  position: relative;
  padding-bottom: 2px;
}
.nav-link::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background: #FF7A30;
  border-radius: 9999px;
  transition: width 0.3s;
}
.nav-link:hover::after {
  width: 100%;
}
.whatsapp-float {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 40;
  background: #25D366;
  color: white;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(37, 211, 102, 0.35);
  transition: transform 0.3s;
}
.whatsapp-float:hover {
  transform: scale(1.1);
}
</style>
