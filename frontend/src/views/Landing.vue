<template>
  <div class="min-h-screen bg-white font-poppins">
    <!-- Navbar -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 lg:h-20 items-center">
          <router-link to="/" class="flex items-center space-x-2">
            <img src="/hot-bando-logo.png" alt="HotBando" class="h-8 lg:h-10 rounded-full object-cover">
            <span class="text-xl lg:text-2xl font-bold text-brand-500">HotBando</span>
          </router-link>
          <div class="hidden lg:flex items-center space-x-8">
            <a href="#services" class="nav-link text-gray-600 hover:text-brand-500 font-medium">Services</a>
            <a href="#why-us" class="nav-link text-gray-600 hover:text-brand-500 font-medium">Why Us</a>
            <a href="#pricing" class="nav-link text-gray-600 hover:text-brand-500 font-medium">Pricing</a>
            <a href="#partner" class="nav-link text-gray-600 hover:text-brand-500 font-medium">Partner</a>
            <a href="#portals" class="nav-link text-gray-600 hover:text-brand-500 font-medium">Portals</a>
            <a href="#contact" class="nav-link text-gray-600 hover:text-brand-500 font-medium">Contact</a>
            <router-link v-if="!user" to="/login" class="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl">Sign In</router-link>
            <router-link v-else :to="dashboardRoute" class="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl">Dashboard</router-link>
          </div>
          <button @click="mobileOpen = !mobileOpen" class="lg:hidden text-gray-700 hover:text-brand-500 p-2">
            <i class="fas fa-bars text-xl"></i>
          </button>
        </div>
      </div>
      <div :class="['lg:hidden border-t border-gray-100 bg-white overflow-hidden transition-all duration-300', mobileOpen ? 'max-h-96' : 'max-h-0']">
        <div class="px-4 py-3 space-y-1">
          <a href="#services" @click="mobileOpen = false" class="block px-4 py-2.5 text-gray-600 hover:text-brand-500 hover:bg-brand-50 rounded-lg font-medium">Services</a>
          <a href="#why-us" @click="mobileOpen = false" class="block px-4 py-2.5 text-gray-600 hover:text-brand-500 hover:bg-brand-50 rounded-lg font-medium">Why Us</a>
          <a href="#pricing" @click="mobileOpen = false" class="block px-4 py-2.5 text-gray-600 hover:text-brand-500 hover:bg-brand-50 rounded-lg font-medium">Pricing</a>
          <a href="#partner" @click="mobileOpen = false" class="block px-4 py-2.5 text-gray-600 hover:text-brand-500 hover:bg-brand-50 rounded-lg font-medium">Partner</a>
          <a href="#portals" @click="mobileOpen = false" class="block px-4 py-2.5 text-gray-600 hover:text-brand-500 hover:bg-brand-50 rounded-lg font-medium">Portals</a>
          <a href="#contact" @click="mobileOpen = false" class="block px-4 py-2.5 text-gray-600 hover:text-brand-500 hover:bg-brand-50 rounded-lg font-medium">Contact</a>
          <router-link v-if="!user" to="/login" @click="mobileOpen = false" class="block w-full bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-full font-semibold text-center transition-all">Sign In</router-link>
          <router-link v-else :to="dashboardRoute" @click="mobileOpen = false" class="block w-full bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-full font-semibold text-center transition-all">Dashboard</router-link>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="pt-24 lg:pt-28 pb-16 lg:pb-20 relative overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700">
      <div class="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="hex" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
            <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
            <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#hex)"/>
        </svg>
      </div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div class="lg:w-1/2 text-center lg:text-left">
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">High-Speed Internet, <span class="text-yellow-300">Affordable & Accessible</span></h1>
            <p class="text-lg lg:text-xl text-white/90 mb-8 max-w-xl">HotBando delivers fast, reliable internet for students, families, and businesses. Earn free data by watching ads or purchase affordable packages.</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <router-link to="/hotspot/login" class="bg-white hover:bg-gray-100 text-brand-600 px-8 py-3.5 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-xl">Get Started</router-link>
              <a href="#services" class="border-2 border-white text-white hover:bg-white/10 px-8 py-3.5 rounded-full text-lg font-semibold transition-all">Our Services</a>
            </div>
          </div>
          <div class="lg:w-1/2 flex justify-center">
            <div class="relative w-64 h-[480px] sm:w-72 sm:h-[540px]">
              <div class="absolute inset-0 bg-white/10 rounded-full scale-110"></div>
              <div class="relative h-full w-full rounded-[3rem] border-[10px] border-[#0a0a0a] shadow-2xl overflow-hidden bg-white">
                <div class="absolute top-0 left-0 right-0 h-6 bg-[#0a0a0a] z-10 flex items-center justify-center">
                  <div class="w-16 h-1.5 rounded-full bg-gray-700"></div>
                </div>
                <img src="/ads/hotbando-demo-1.png" alt="HotBando app" class="w-full h-full object-cover">
              </div>
              <div class="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center"><i class="fas fa-wifi"></i></div>
                  <div>
                    <p class="text-xs text-gray-500 font-medium">Connected to</p>
                    <p class="text-sm font-bold text-gray-900">HotBando WiFi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
    </section>

    <!-- Stats -->
    <section class="py-12 lg:py-16 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div class="p-4">
            <div class="text-4xl font-bold text-brand-500 mb-1">10K+</div>
            <div class="text-gray-500 font-medium">Active Users</div>
          </div>
          <div class="p-4">
            <div class="text-4xl font-bold text-brand-500 mb-1">50+</div>
            <div class="text-gray-500 font-medium">Hotspot Locations</div>
          </div>
          <div class="p-4">
            <div class="text-4xl font-bold text-brand-500 mb-1">100K+</div>
            <div class="text-gray-500 font-medium">GB Data Delivered</div>
          </div>
          <div class="p-4">
            <div class="text-4xl font-bold text-brand-500 mb-1">99%</div>
            <div class="text-gray-500 font-medium">Uptime Guarantee</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Services -->
    <section id="services" class="py-16 lg:py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-brand-500 font-semibold tracking-wider uppercase">Our Services</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-4">Internet Solutions for Everyone</h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">Tailored connectivity plans designed to meet the unique needs of students, communities, and businesses.</p>
          <div class="w-20 h-1 bg-brand-500 mx-auto mt-4 rounded-full"></div>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
            <div class="h-48 bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <div class="text-white text-6xl"><i class="fas fa-graduation-cap"></i></div>
            </div>
            <div class="p-8">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">For Students</h3>
              <p class="text-gray-600 mb-4">Affordable internet for research, online classes, and educational videos. Start with as little as TZS 500.</p>
              <router-link to="/hotspot" class="inline-flex items-center text-brand-500 font-semibold hover:text-brand-600 transition"><i class="fas fa-arrow-right mr-2"></i> Connect Now</router-link>
            </div>
          </div>
          <div class="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
            <div class="h-48 bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <div class="text-white text-6xl"><i class="fas fa-users"></i></div>
            </div>
            <div class="p-8">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">For Communities</h3>
              <p class="text-gray-600 mb-4">Connect families, friends, and neighbors with reliable high-speed internet that everyone can use.</p>
              <router-link to="/hotspot/subscribe" class="inline-flex items-center text-brand-500 font-semibold hover:text-brand-600 transition"><i class="fas fa-arrow-right mr-2"></i> Buy Voucher</router-link>
            </div>
          </div>
          <div class="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
            <div class="h-48 bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <div class="text-white text-6xl"><i class="fas fa-briefcase"></i></div>
            </div>
            <div class="p-8">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">For Businesses</h3>
              <p class="text-gray-600 mb-4">Reliable business-grade connectivity with dedicated support. Perfect for offices, cafes, and retail spaces.</p>
              <a href="#partner" @click.prevent="openModal('partner')" class="inline-flex items-center text-brand-500 font-semibold hover:text-brand-600 transition"><i class="fas fa-arrow-right mr-2"></i> Become a Partner</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Choose Us -->
    <section id="why-us" class="py-16 lg:py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col lg:flex-row items-center gap-12">
          <div class="lg:w-1/2">
            <span class="text-brand-500 font-semibold tracking-wider uppercase">Why Choose Us</span>
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-6">The <span class="text-brand-500">HotBando</span> Advantage</h2>
            <p class="text-lg text-gray-600 mb-8">We combine cutting-edge technology with local support to deliver the best internet experience in Tanzania.</p>
            <div class="space-y-6">
              <div class="flex items-start">
                <div class="w-12 h-12 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0 mr-4"><i class="fas fa-bolt text-xl"></i></div>
                <div><h4 class="font-semibold text-gray-900">Blazing Fast Speed</h4><p class="text-gray-600">Up to 100 Mbps connectivity for seamless streaming, gaming, and video calls.</p></div>
              </div>
              <div class="flex items-start">
                <div class="w-12 h-12 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0 mr-4"><i class="fas fa-shield-alt text-xl"></i></div>
                <div><h4 class="font-semibold text-gray-900">Reliable Connection</h4><p class="text-gray-600">99% uptime guarantee with enterprise-grade infrastructure and redundant backup.</p></div>
              </div>
              <div class="flex items-start">
                <div class="w-12 h-12 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0 mr-4"><i class="fas fa-wifi text-xl"></i></div>
                <div><h4 class="font-semibold text-gray-900">Free Data via Ads</h4><p class="text-gray-600">Watch short advertisements and earn free internet data without spending a dime.</p></div>
              </div>
              <div class="flex items-start">
                <div class="w-12 h-12 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0 mr-4"><i class="fas fa-headset text-xl"></i></div>
                <div><h4 class="font-semibold text-gray-900">24/7 Local Support</h4><p class="text-gray-600">Our team is always ready to help with any questions or technical issues.</p></div>
              </div>
            </div>
          </div>
          <div class="lg:w-1/2">
            <div class="relative">
              <div class="bg-gradient-to-br from-brand-50 to-white rounded-3xl p-8 shadow-lg border border-brand-100">
                <div class="rounded-2xl overflow-hidden shadow-inner mb-6">
                  <img src="/ads/hotbando-demo-2.png" alt="HotBando dashboard" class="w-full h-72 object-cover object-top">
                </div>
                <div class="text-center">
                  <h3 class="text-2xl font-bold text-gray-900 mb-2">Speed You Can Feel</h3>
                  <p class="text-gray-600 mb-6">Experience the difference with our high-speed network. Perfect for:</p>
                  <div class="space-y-3 text-left">
                    <div class="flex items-center text-gray-700"><i class="fas fa-check-circle text-brand-500 mr-3"></i> HD Video Streaming</div>
                    <div class="flex items-center text-gray-700"><i class="fas fa-check-circle text-brand-500 mr-3"></i> Online Gaming</div>
                    <div class="flex items-center text-gray-700"><i class="fas fa-check-circle text-brand-500 mr-3"></i> Video Conferencing</div>
                    <div class="flex items-center text-gray-700"><i class="fas fa-check-circle text-brand-500 mr-3"></i> Large File Downloads</div>
                  </div>
                  <div class="mt-6 bg-brand-50 rounded-full h-4 w-full"><div class="bg-brand-500 h-4 rounded-full" style="width: 85%"></div></div>
                  <p class="mt-3 text-sm text-gray-500">85% of users rate our speed as excellent</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="py-16 lg:py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-brand-500 font-semibold tracking-wider uppercase">Pricing</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-4">Simple, Transparent Plans</h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">Choose the plan that fits your needs. No hidden fees, no long-term contracts.</p>
          <div class="w-20 h-1 bg-brand-500 mx-auto mt-4 rounded-full"></div>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div class="p-8 border-b border-gray-100">
              <h3 class="text-xl font-semibold text-gray-900">Quick Connect</h3>
              <p class="text-gray-500 mt-2">Perfect for short browsing sessions.</p>
              <div class="mt-6"><span class="text-4xl font-bold text-brand-500">TZS 500</span><span class="text-gray-500">/6 hours</span></div>
              <div class="mt-6 py-3 text-center text-gray-400 text-sm border-t border-dashed border-gray-200 pt-4">Available in user dashboard</div>
            </div>
            <div class="p-8">
              <h4 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Includes</h4>
              <ul class="space-y-3">
                <li class="flex items-start"><i class="fas fa-check text-brand-500 mt-0.5 mr-3"></i><span class="text-gray-600">Speed: 5 Mbps</span></li>
                <li class="flex items-start"><i class="fas fa-check text-brand-500 mt-0.5 mr-3"></i><span class="text-gray-600">Occasional ads</span></li>
                <li class="flex items-start"><i class="fas fa-check text-brand-500 mt-0.5 mr-3"></i><span class="text-gray-600">Standard support</span></li>
              </ul>
              <router-link to="/hotspot/subscribe" class="mt-8 block w-full bg-brand-500 hover:bg-brand-600 text-white text-center font-semibold py-3 rounded-full transition-all">Buy Now</router-link>
            </div>
          </div>
          <div class="bg-white rounded-2xl shadow-lg border-2 border-brand-500 overflow-hidden relative">
            <div class="absolute top-4 right-4 bg-brand-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Popular</div>
            <div class="p-8 border-b border-gray-100">
              <h3 class="text-xl font-semibold text-gray-900">Daily Pass</h3>
              <p class="text-gray-500 mt-2">Best for daily browsing and streaming.</p>
              <div class="mt-6"><span class="text-4xl font-bold text-brand-500">TZS 1,000</span><span class="text-gray-500">/24 hours</span></div>
              <div class="mt-6 py-3 text-center text-gray-400 text-sm border-t border-dashed border-gray-200 pt-4">Available in user dashboard</div>
            </div>
            <div class="p-8">
              <h4 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Includes</h4>
              <ul class="space-y-3">
                <li class="flex items-start"><i class="fas fa-check text-brand-500 mt-0.5 mr-3"></i><span class="text-gray-600">Speed: 10 Mbps</span></li>
                <li class="flex items-start"><i class="fas fa-check text-brand-500 mt-0.5 mr-3"></i><span class="text-gray-600">Fewer ads</span></li>
                <li class="flex items-start"><i class="fas fa-check text-brand-500 mt-0.5 mr-3"></i><span class="text-gray-600">Priority support</span></li>
              </ul>
              <router-link to="/hotspot/subscribe" class="mt-8 block w-full bg-brand-500 hover:bg-brand-600 text-white text-center font-semibold py-3 rounded-full transition-all">Buy Now</router-link>
            </div>
          </div>
          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div class="p-8 border-b border-gray-100">
              <h3 class="text-xl font-semibold text-gray-900">Weekly Boost</h3>
              <p class="text-gray-500 mt-2">Full week of unlimited browsing.</p>
              <div class="mt-6"><span class="text-4xl font-bold text-brand-500">TZS 6,000</span><span class="text-gray-500">/7 days</span></div>
              <div class="mt-6 py-3 text-center text-gray-400 text-sm border-t border-dashed border-gray-200 pt-4">Available in user dashboard</div>
            </div>
            <div class="p-8">
              <h4 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Includes</h4>
              <ul class="space-y-3">
                <li class="flex items-start"><i class="fas fa-check text-brand-500 mt-0.5 mr-3"></i><span class="text-gray-600">Speed: 10 Mbps</span></li>
                <li class="flex items-start"><i class="fas fa-check text-brand-500 mt-0.5 mr-3"></i><span class="text-gray-600">Minimal ads</span></li>
                <li class="flex items-start"><i class="fas fa-check text-brand-500 mt-0.5 mr-3"></i><span class="text-gray-600">24/7 priority support</span></li>
              </ul>
              <router-link to="/hotspot/subscribe" class="mt-8 block w-full bg-brand-500 hover:bg-brand-600 text-white text-center font-semibold py-3 rounded-full transition-all">Buy Now</router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Partner -->
    <section id="partner" class="py-16 lg:py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-brand-500 font-semibold tracking-wider uppercase">Business Opportunity</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-4">Become a HotBando Partner</h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">Start your own internet business with our proven platform. We provide everything you need to succeed.</p>
          <div class="w-20 h-1 bg-brand-500 mx-auto mt-4 rounded-full"></div>
        </div>
        <div class="bg-gray-50 rounded-3xl overflow-hidden shadow-lg">
          <div class="grid lg:grid-cols-2">
            <div class="p-8 lg:p-12">
              <h3 class="text-2xl font-bold text-gray-900 mb-6">How It Works</h3>
              <div class="space-y-6">
                <div class="flex items-start">
                  <div class="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold flex-shrink-0 mr-4">1</div>
                  <div><h4 class="font-semibold text-gray-900">Apply Online</h4><p class="text-gray-600">Fill out a simple application form to become a partner.</p></div>
                </div>
                <div class="flex items-start">
                  <div class="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold flex-shrink-0 mr-4">2</div>
                  <div><h4 class="font-semibold text-gray-900">Choose Your Package</h4><p class="text-gray-600">Select from Starter, Pro, or Elite bundles based on your needs.</p></div>
                </div>
                <div class="flex items-start">
                  <div class="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold flex-shrink-0 mr-4">3</div>
                  <div><h4 class="font-semibold text-gray-900">Get Funded</h4><p class="text-gray-600">Financial partners review and approve your funding application.</p></div>
                </div>
                <div class="flex items-start">
                  <div class="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold flex-shrink-0 mr-4">4</div>
                  <div><h4 class="font-semibold text-gray-900">We Set You Up</h4><p class="text-gray-600">HotBando delivers and installs all equipment with full training.</p></div>
                </div>
                <div class="flex items-start">
                  <div class="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold flex-shrink-0 mr-4">5</div>
                  <div><h4 class="font-semibold text-gray-900">Start Earning</h4><p class="text-gray-600">Revenue starts flowing from day one after installation.</p></div>
                </div>
              </div>
              <div class="mt-8">
                <button @click="openModal('partner')" class="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3.5 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center">
                  <i class="fas fa-handshake mr-2"></i> Apply Now
                </button>
              </div>
            </div>
            <div class="bg-brand-50 p-8 lg:p-12">
              <h3 class="text-2xl font-bold text-gray-900 mb-6">Partner Packages</h3>
              <div class="space-y-4">
                <div class="bg-white p-6 rounded-2xl shadow-sm"><h4 class="text-lg font-semibold text-gray-900 mb-2">Starter</h4><p class="text-gray-600 mb-3">Up to 20 devices &bull; MikroTik hAP ac2 &bull; 10-20 Mbps</p><div class="flex justify-between items-center"><span class="text-xl font-bold text-brand-500">TSh 350,000</span><span class="text-sm text-gray-500">Small homes, hostels</span></div></div>
                <div class="bg-white p-6 rounded-2xl shadow-sm"><h4 class="text-lg font-semibold text-gray-900 mb-2">Pro</h4><p class="text-gray-600 mb-3">Up to 50 devices &bull; MikroTik RB450G &bull; 20-40 Mbps</p><div class="flex justify-between items-center"><span class="text-xl font-bold text-brand-500">TSh 600,000</span><span class="text-sm text-gray-500">Medium hostels, cafes</span></div></div>
                <div class="bg-white p-6 rounded-2xl shadow-sm"><h4 class="text-lg font-semibold text-gray-900 mb-2">Elite</h4><p class="text-gray-600 mb-3">Up to 100 devices &bull; MikroTik RB4011 &bull; 40-100 Mbps</p><div class="flex justify-between items-center"><span class="text-xl font-bold text-brand-500">TSh 950,000</span><span class="text-sm text-gray-500">Large venues, apartments</span></div></div>
              </div>
              <div class="mt-6 p-4 bg-brand-100 rounded-xl"><p class="text-gray-700 text-sm"><i class="fas fa-info-circle text-brand-500 mr-2"></i>Every package includes installation, training, and full technical support.</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Portals -->
    <section id="portals" class="py-16 lg:py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-brand-500 font-semibold tracking-wider uppercase">Access Your Portal</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-4">One Account, Every Portal</h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">Sign in to your dashboard to manage your account, packages, ads, and revenue.</p>
          <div class="w-20 h-1 bg-brand-500 mx-auto mt-4 rounded-full"></div>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <a v-for="portal in portals" :key="portal.title" :href="portal.href" class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-brand-500/30 transition-all group">
            <div class="w-12 h-12 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center mb-5 group-hover:bg-brand-500 group-hover:text-white transition-colors">
              <i class="fas text-lg" :class="portal.icon"></i>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ portal.title }}</h3>
            <p class="text-gray-600 text-sm mb-4">{{ portal.desc }}</p>
            <span class="text-brand-500 text-sm font-semibold">Open Portal <i class="fas fa-arrow-right"></i></span>
          </a>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-16 lg:py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-brand-500 font-semibold tracking-wider uppercase">Testimonials</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-4">What Our Users Say</h2>
          <div class="w-20 h-1 bg-brand-500 mx-auto mt-4 rounded-full"></div>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="bg-gray-50 p-8 rounded-2xl shadow-sm border border-gray-100">
            <div class="flex items-center mb-4 text-yellow-400"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
            <p class="text-gray-600 italic mb-6">"HotBando has been a game-changer for my studies. Fast internet at an affordable price, and I earn free data by watching ads!"</p>
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold mr-3">AM</div>
              <div><h4 class="font-semibold text-gray-900">Amina M.</h4><p class="text-gray-500 text-sm">UDSM Student</p></div>
            </div>
          </div>
          <div class="bg-gray-50 p-8 rounded-2xl shadow-sm border border-gray-100">
            <div class="flex items-center mb-4 text-yellow-400"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
            <p class="text-gray-600 italic mb-6">"As a franchise owner, HotBando made it easy to start my own internet business. The support team is always there when I need them."</p>
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold mr-3">PK</div>
              <div><h4 class="font-semibold text-gray-900">Peter K.</h4><p class="text-gray-500 text-sm">Franchise Owner, Arusha</p></div>
            </div>
          </div>
          <div class="bg-gray-50 p-8 rounded-2xl shadow-sm border border-gray-100">
            <div class="flex items-center mb-4 text-yellow-400"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i></div>
            <p class="text-gray-600 italic mb-6">"Our hostel residents love the reliable internet. The self-service portal makes it easy for everyone to manage their own accounts."</p>
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold mr-3">SJ</div>
              <div><h4 class="font-semibold text-gray-900">Sarah J.</h4><p class="text-gray-500 text-sm">Hostel Manager, Dar</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-16 lg:py-20 bg-gradient-to-br from-brand-500 to-brand-700 text-white relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="hex2" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
            <path d="M28 0L56 16.2V48.5L28 64.7L0 48.5V16.2Z" fill="none" stroke="white" stroke-width="1.5"/>
            <path d="M28 32.4L56 48.6V80.9L28 97L0 80.9V48.6Z" fill="none" stroke="white" stroke-width="1"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#hex2)"/>
        </svg>
      </div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 class="text-3xl lg:text-4xl font-bold mb-6">Ready to Get <span class="text-yellow-300">Connected?</span></h2>
        <p class="text-xl text-white/90 mb-8 max-w-2xl mx-auto">Join thousands of happy users today. Experience fast, affordable internet with HotBando.</p>
        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <router-link to="/hotspot/login" class="bg-white hover:bg-gray-100 text-brand-600 px-8 py-3.5 rounded-full text-lg font-semibold transition-all shadow-lg inline-flex items-center justify-center">
            <i class="fas fa-wifi mr-2"></i> Get Started
          </router-link>
          <a href="https://wa.me/255712345678" target="_blank" class="border-2 border-white text-white hover:bg-white/10 px-8 py-3.5 rounded-full text-lg font-semibold transition-all flex items-center justify-center">
            <i class="fab fa-whatsapp mr-2"></i> WhatsApp Us
          </a>
        </div>
      </div>
    </section>

    <!-- Contact -->
    <section id="contact" class="py-16 lg:py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-brand-500 font-semibold tracking-wider uppercase">Contact</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-4">Get In Touch</h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">Have a question or want to learn more? We're here to help.</p>
          <div class="w-20 h-1 bg-brand-500 mx-auto mt-4 rounded-full"></div>
        </div>
        <div class="max-w-4xl mx-auto">
          <div class="bg-gray-50 rounded-3xl overflow-hidden shadow-lg">
            <div class="grid md:grid-cols-2">
              <div class="p-8 lg:p-12">
                <h3 class="text-xl font-semibold text-gray-900 mb-6">Contact Information</h3>
                <div class="space-y-5">
                  <div class="flex items-start"><i class="fas fa-phone-alt text-brand-500 mt-1 mr-4 text-xl"></i><div><p class="font-medium text-gray-900">Phone</p><p class="text-gray-600">+255 712 345 678</p></div></div>
                  <div class="flex items-start"><i class="fas fa-envelope text-brand-500 mt-1 mr-4 text-xl"></i><div><p class="font-medium text-gray-900">Email</p><p class="text-gray-600">info@hotbando.co.tz</p></div></div>
                  <div class="flex items-start"><i class="fas fa-map-marker-alt text-brand-500 mt-1 mr-4 text-xl"></i><div><p class="font-medium text-gray-900">Coverage Areas</p><p class="text-gray-600">Dar es Salaam, Arusha, Mwanza, Dodoma & more</p></div></div>
                  <div class="flex items-start"><i class="fas fa-clock text-brand-500 mt-1 mr-4 text-xl"></i><div><p class="font-medium text-gray-900">Support Hours</p><p class="text-gray-600">24/7 Customer Support</p></div></div>
                </div>
              </div>
              <div class="p-8 lg:p-12">
                <h3 class="text-xl font-semibold text-gray-900 mb-6">Send Us a Message</h3>
                <button @click="openModal('contact')" class="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 rounded-full transition-all shadow-lg hover:shadow-xl">Open Contact Form</button>
                <p class="text-center text-gray-500 text-sm mt-4">We typically respond within 1 hour during business hours.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white pt-16 pb-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-3 gap-8 lg:gap-12">
          <div>
            <div class="flex items-center space-x-2 mb-4">
              <img src="/hot-bando-logo.png" alt="HotBando" class="h-8 rounded-full object-cover">
              <span class="text-xl font-bold text-brand-400">HotBando</span>
            </div>
            <p class="text-gray-400 text-sm">Fast, affordable, and accessible internet for students, families, and businesses across Tanzania.</p>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4 uppercase tracking-wider text-sm">Services</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="#services" class="text-gray-400 hover:text-brand-400 transition">Internet Plans</a></li>
              <li><a href="#pricing" class="text-gray-400 hover:text-brand-400 transition">Pricing</a></li>
              <li><router-link to="/hotspot/subscribe" class="text-gray-400 hover:text-brand-400 transition">Buy Voucher</router-link></li>
              <li><router-link to="/login" class="text-gray-400 hover:text-brand-400 transition">Partner Sign In</router-link></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4 uppercase tracking-wider text-sm">Follow Us</h4>
            <div class="flex space-x-4">
              <a href="#" class="w-10 h-10 rounded-full bg-gray-800 hover:bg-brand-500 flex items-center justify-center transition"><i class="fab fa-facebook-f"></i></a>
              <a href="#" class="w-10 h-10 rounded-full bg-gray-800 hover:bg-brand-500 flex items-center justify-center transition"><i class="fab fa-twitter"></i></a>
              <a href="#" class="w-10 h-10 rounded-full bg-gray-800 hover:bg-brand-500 flex items-center justify-center transition"><i class="fab fa-instagram"></i></a>
              <a href="#" class="w-10 h-10 rounded-full bg-gray-800 hover:bg-brand-500 flex items-center justify-center transition"><i class="fab fa-linkedin-in"></i></a>
            </div>
            <div class="mt-6">
              <h4 class="font-semibold text-white mb-3 uppercase tracking-wider text-sm">Download App</h4>
              <div class="space-y-2">
                <a href="#" class="flex items-center bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2 transition"><i class="fab fa-google-play text-brand-400 text-xl mr-3"></i><span class="text-sm">Google Play</span></a>
                <a href="#" class="flex items-center bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2 transition"><i class="fab fa-apple text-brand-400 text-xl mr-3"></i><span class="text-sm">App Store</span></a>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {{ currentYear }} BlackScience Technologies. All rights reserved.</p>
          <div class="flex gap-6 mt-4 md:mt-0">
            <a href="#" class="hover:text-brand-400 transition">Privacy Policy</a>
            <a href="#" class="hover:text-brand-400 transition">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- WhatsApp Float -->
    <a href="https://wa.me/255712345678" target="_blank" class="whatsapp-float">
      <i class="fab fa-whatsapp text-3xl"></i>
    </a>

    <!-- Partner Application Modal -->
    <div v-if="activeModal === 'partner'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content max-w-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-gray-900">Apply as Partner</h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div class="flex justify-center mb-8">
          <div class="flex items-center space-x-2">
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold', partnerStep >= 1 ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500']">1</div>
            <div :class="['w-16 h-0.5', partnerStep >= 2 ? 'bg-brand-500' : 'bg-gray-200']"></div>
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold', partnerStep >= 2 ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500']">2</div>
            <div :class="['w-16 h-0.5', partnerStep >= 3 ? 'bg-brand-500' : 'bg-gray-200']"></div>
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold', partnerStep >= 3 ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500']">3</div>
          </div>
        </div>
        <form @submit.prevent="submitPartnerForm">
          <div v-if="partnerStep === 1" class="space-y-4">
            <div class="grid md:grid-cols-2 gap-4">
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label><input v-model="partner.name" required class="input w-full" placeholder="Your full name"></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <div class="flex gap-2">
                  <select v-model="partner.countryCode" class="input w-32 flex-shrink-0">
                    <option value="+255">🇹🇿 +255</option>
                    <option value="+254">🇰🇪 +254</option>
                    <option value="+256">🇺🇬 +256</option>
                  </select>
                  <input v-model="partner.phone" type="tel" required class="input w-full" placeholder="7XX XXX XXX">
                </div>
              </div>
            </div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label><input v-model="partner.email" type="email" class="input w-full" placeholder="your@email.com"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Location (City/Region) *</label><input v-model="partner.location" required class="input w-full" placeholder="e.g. Dar es Salaam"></div>
            <p class="text-sm text-gray-500">* Required fields</p>
          </div>
          <div v-if="partnerStep === 2" class="space-y-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Business Type *</label>
              <select v-model="partner.businessType" required class="input w-full">
                <option value="">Select type</option>
                <option value="apartment">Apartment Building</option>
                <option value="hostel">Hostel</option>
                <option value="cafe">Cafe / Restaurant</option>
                <option value="mall">Shopping Center</option>
                <option value="school">School / Institution</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Package *</label>
              <select v-model="partner.packageType" required class="input w-full">
                <option value="">Select package</option>
                <option value="starter">Starter - TSh 350,000</option>
                <option value="pro">Pro - TSh 600,000</option>
                <option value="elite">Elite - TSh 950,000</option>
              </select>
            </div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Estimated Users per Month</label>
              <select v-model="partner.estimatedUsers" class="input w-full">
                <option value="">Select range</option>
                <option value="1-50">1 - 50</option>
                <option value="51-200">51 - 200</option>
                <option value="201-500">201 - 500</option>
                <option value="500+">500+</option>
              </select>
            </div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label><textarea v-model="partner.notes" rows="3" class="input w-full" placeholder="Any questions or special requirements..."></textarea></div>
          </div>
          <div v-if="partnerStep === 3" class="space-y-4">
            <div class="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <i class="fas fa-check-circle text-green-500 text-5xl mb-4"></i>
              <h4 class="text-lg font-semibold text-green-800 mb-2">Almost Done!</h4>
              <p class="text-green-700">Review your information below before submitting. Our team will contact you within 24 hours.</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-gray-500">Name:</span><span class="font-medium text-gray-900">{{ partner.name }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Phone:</span><span class="font-medium text-gray-900">{{ partner.phone }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Email:</span><span class="font-medium text-gray-900">{{ partner.email || '-' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Location:</span><span class="font-medium text-gray-900">{{ partner.location }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Business Type:</span><span class="font-medium text-gray-900">{{ partner.businessType }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Package:</span><span class="font-medium text-gray-900">{{ partner.packageType }}</span></div>
            </div>
            <p v-if="partnerError" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{{ partnerError }}</p>
            <p v-if="partnerSuccess" class="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{{ partnerSuccess }}</p>
          </div>
          <div class="flex justify-between mt-6">
            <button v-if="partnerStep > 1" type="button" @click="partnerStep--" class="btn btn-ghost">Back</button>
            <div v-else></div>
            <div class="flex gap-3">
              <button type="button" @click="closeModal" class="btn btn-ghost">Cancel</button>
              <button v-if="partnerStep < 3" type="button" @click="partnerStep++" class="btn btn-primary">Continue</button>
              <button v-if="partnerStep === 3" type="submit" :disabled="partnerSubmitting" class="btn btn-primary">{{ partnerSubmitting ? 'Submitting...' : 'Submit Application' }}</button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Contact Modal -->
    <div v-if="activeModal === 'contact'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content max-w-md">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-gray-900">Send Us a Message</h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form @submit.prevent="submitContactForm" class="space-y-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Your Name *</label><input v-model="contact.name" required class="input w-full" placeholder="Your full name"></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Email *</label><input v-model="contact.email" required type="email" class="input w-full" placeholder="your@email.com"></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Message *</label><textarea v-model="contact.message" required rows="4" class="input w-full" placeholder="How can we help you?"></textarea></div>
          <p v-if="contactError" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{{ contactError }}</p>
          <p v-if="contactSuccess" class="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{{ contactSuccess }}</p>
          <button type="submit" :disabled="contactSubmitting" class="btn btn-primary w-full justify-center">{{ contactSubmitting ? 'Sending...' : 'Send Message' }}</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const currentYear = ref(new Date().getFullYear())
const mobileOpen = ref(false)
const activeModal = ref(null)
const user = ref(null)

const dashboardRoute = ref('/login')

function getDashboardRoute(role) {
  const map = { admin: '/admin/dashboard', super_admin: '/admin/dashboard', sponsor: '/sponsor/dashboard', bank_partner: '/bank/dashboard', franchise_owner: '/franchise/dashboard', reseller: '/reseller/dashboard', customer: '/hotspot/dashboard' }
  return map[role] || '/login'
}

const portals = [
  { title: 'Customer Portal', desc: 'Manage your data, buy packages, and watch ads for free data.', href: '/hotspot', icon: 'fa-user' },
  { title: 'Admin Panel', desc: 'Manage users, locations, routers, revenue, and platform settings.', href: '/admin/login', icon: 'fa-shield-halved' },
  { title: 'Sponsor Portal', desc: 'Upload ads, run campaigns, and track your ad performance.', href: '/sponsor/login', icon: 'fa-bullhorn' },
  { title: 'Partner Sign In', desc: 'Franchise owners and bank partners manage their dashboards.', href: '/login', icon: 'fa-building' },
  { title: 'Buy Voucher', desc: 'Buy a package directly without an account.', href: '/hotspot/subscribe', icon: 'fa-ticket' },
  { title: 'Watch Ads', desc: 'Earn free data by watching short sponsored videos.', href: '/hotspot/ads', icon: 'fa-circle-play' },
]

async function checkSession() {
  try {
    const r = await fetch('/api/me')
    if (r.ok) {
      const data = await r.json()
      user.value = data.user
      dashboardRoute.value = data.redirect || getDashboardRoute(data.user.role)
    }
  } catch {}
}

async function handleLogout() {
  try {
    await fetch('/api/logout', { method: 'POST' })
  } catch {}
  user.value = null
  window.location.href = '/'
}

function openModal(type) {
  activeModal.value = type
  document.body.style.overflow = 'hidden'
}

function closeModal() {
  activeModal.value = null
  document.body.style.overflow = ''
  partnerError.value = ''
  partnerSuccess.value = ''
  contactError.value = ''
  contactSuccess.value = ''
}

const partnerStep = ref(1)
const partnerSubmitting = ref(false)
const partnerError = ref('')
const partnerSuccess = ref('')
const partner = ref({ name: '', phone: '', countryCode: '+255', email: '', location: '', businessType: '', packageType: '', estimatedUsers: '', notes: '' })

const contactSubmitting = ref(false)
const contactError = ref('')
const contactSuccess = ref('')
const contact = ref({ name: '', email: '', message: '' })

async function submitPartnerForm() {
  partnerSubmitting.value = true
  partnerError.value = ''
  partnerSuccess.value = ''
  try {
    const payload = {
      ...partner.value,
      phone: partner.value.countryCode + partner.value.phone.replace(/^0+/, '')
    }
    const r = await fetch('/api/public/partner-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await r.json()
    if (data.success) {
      partnerSuccess.value = data.message || 'Application submitted successfully! We will contact you soon.'
    } else {
      partnerError.value = data.message || 'An error occurred. Please try again.'
    }
  } catch {
    partnerError.value = 'Connection error. Please try again.'
  } finally {
    partnerSubmitting.value = false
  }
}

async function submitContactForm() {
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

onMounted(() => {
  checkSession()
  if (window.location.hash) {
    const id = window.location.hash.slice(1)
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 300)
  }
})
</script>

<style scoped>
.nav-link {
  position: relative;
  padding-bottom: 2px;
}
.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: #FF7A30;
  transition: width 0.3s;
}
.nav-link:hover::after {
  width: 100%;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}
.modal-content {
  background: white;
  border-radius: 1.5rem;
  padding: 2rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s;
}
.whatsapp-float:hover {
  transform: scale(1.1);
}
section {
  scroll-margin-top: 5rem;
}
</style>
