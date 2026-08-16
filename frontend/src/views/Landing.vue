<template>
  <div class="min-h-screen bg-white font-poppins">
    <!-- Navbar -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 lg:h-20 items-center">
          <router-link to="/" class="flex items-center space-x-2">
            <img src="/hot-bando-logo.png" alt="HotBando" class="h-8 lg:h-10">
            <span class="text-xl lg:text-2xl font-bold text-brand-500">HotBando</span>
          </router-link>
          <div class="hidden lg:flex items-center space-x-8">
            <a href="#services" class="nav-link text-gray-600 hover:text-brand-500 font-medium">Services</a>
            <a href="#why-us" class="nav-link text-gray-600 hover:text-brand-500 font-medium">Why Us</a>
            <a href="#pricing" class="nav-link text-gray-600 hover:text-brand-500 font-medium">Pricing</a>
            <a href="#partner" class="nav-link text-gray-600 hover:text-brand-500 font-medium">Partner</a>
            <a href="#contact" class="nav-link text-gray-600 hover:text-brand-500 font-medium">Contact</a>
            <button v-if="!user" @click="openModal('auth')" class="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl hover-scale">Sign In</button>
            <div v-else class="relative">
              <button @click="avatarDropdown = !avatarDropdown" class="flex items-center space-x-2 bg-brand-50 hover:bg-brand-100 rounded-full px-4 py-2 transition border border-brand-200">
                <div class="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold">{{ user.name.charAt(0).toUpperCase() }}</div>
                <span class="text-sm font-medium text-gray-700">{{ user.name.split(' ')[0] }}</span>
                <i class="fas fa-chevron-down text-xs text-gray-500"></i>
              </button>
              <div v-if="avatarDropdown" class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50" @click="avatarDropdown = false">
                <div class="px-4 py-3 border-b border-gray-100">
                  <p class="text-sm font-semibold text-gray-900">{{ user.name }}</p>
                  <p class="text-xs text-gray-500">{{ user.email }}</p>
                </div>
                <router-link :to="dashboardRoute" class="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 transition">
                  <i class="fas fa-chart-pie w-5 text-brand-500"></i> My Dashboard
                </router-link>
                <router-link :to="dashboardRoute" class="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 transition">
                  <i class="fas fa-user-cog w-5 text-brand-500"></i> Profile
                </router-link>
                <div class="border-t border-gray-100 mt-1 pt-1">
                  <button @click="handleLogout" class="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                    <i class="fas fa-sign-out-alt w-5"></i> Logout
                  </button>
                </div>
              </div>
            </div>
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
          <a href="#contact" @click="mobileOpen = false" class="block px-4 py-2.5 text-gray-600 hover:text-brand-500 hover:bg-brand-50 rounded-lg font-medium">Contact</a>
          <button v-if="!user" @click="openModal('auth'); mobileOpen = false" class="w-full bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-full font-semibold transition-all">Sign In</button>
          <div v-else class="border-t border-gray-100 pt-3 mt-3">
            <div class="flex items-center space-x-3 px-4 mb-3">
              <div class="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold">{{ user.name.charAt(0).toUpperCase() }}</div>
              <div><p class="text-sm font-semibold text-gray-900">{{ user.name }}</p><p class="text-xs text-gray-500">{{ user.email }}</p></div>
            </div>
            <router-link @click="mobileOpen = false" :to="dashboardRoute" class="flex items-center px-4 py-2.5 text-gray-700 hover:bg-brand-50 rounded-lg font-medium"><i class="fas fa-chart-pie w-5 text-brand-500"></i> My Dashboard</router-link>
            <router-link @click="mobileOpen = false" :to="dashboardRoute" class="flex items-center px-4 py-2.5 text-gray-700 hover:bg-brand-50 rounded-lg font-medium"><i class="fas fa-user-cog w-5 text-brand-500"></i> Profile</router-link>
            <button @click="handleLogout" class="flex items-center w-full px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium"><i class="fas fa-sign-out-alt w-5"></i> Logout</button>
          </div>
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
          <div class="lg:w-1/2 text-center lg:text-left animate__animated animate__fadeInLeft">
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">High-Speed Internet, <span class="text-yellow-300">Affordable & Accessible</span></h1>
            <p class="text-lg lg:text-xl text-white/90 mb-8 max-w-xl">HotBando delivers fast, reliable internet for students, families, and businesses. Earn free data by watching ads or purchase affordable packages.</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button @click="openModal('auth')" class="bg-white hover:bg-gray-100 text-brand-600 px-8 py-3.5 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover-scale">Get Started</button>
              <a href="#services" class="border-2 border-white text-white hover:bg-white/10 px-8 py-3.5 rounded-full text-lg font-semibold transition-all hover-scale">Our Services</a>
            </div>
          </div>
          <div class="lg:w-1/2 flex justify-center animate__animated animate__fadeInRight">
            <div class="relative w-72 h-72 lg:w-80 lg:h-80">
              <div class="absolute inset-0 bg-white/10 rounded-full"></div>
              <div class="absolute inset-4 bg-white/5 rounded-full"></div>
              <div class="absolute inset-0 flex items-center justify-center">
                <i class="fas fa-wifi text-8xl lg:text-9xl text-white/90"></i>
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
          <div class="service-card bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
            <div class="h-48 bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <div class="text-white text-6xl"><i class="fas fa-graduation-cap"></i></div>
            </div>
            <div class="p-8">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">For Students</h3>
              <p class="text-gray-600 mb-4">Affordable internet for research, online classes, and educational videos. Start with as little as TZS 500.</p>
            </div>
          </div>
          <div class="service-card bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
            <div class="h-48 bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <div class="text-white text-6xl"><i class="fas fa-users"></i></div>
            </div>
            <div class="p-8">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">For Communities</h3>
              <p class="text-gray-600 mb-4">Connect families, friends, and neighbors with reliable high-speed internet that everyone can use.</p>
            </div>
          </div>
          <div class="service-card bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
            <div class="h-48 bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <div class="text-white text-6xl"><i class="fas fa-briefcase"></i></div>
            </div>
            <div class="p-8">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">For Businesses</h3>
              <p class="text-gray-600 mb-4">Reliable business-grade connectivity with dedicated support. Perfect for offices, cafes, and retail spaces.</p>
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
                <div class="text-center">
                  <div class="w-20 h-20 bg-brand-500 rounded-full flex items-center justify-center text-white mx-auto mb-6"><i class="fas fa-bolt text-3xl"></i></div>
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
          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover-scale">
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
            </div>
          </div>
          <div class="bg-white rounded-2xl shadow-lg border-2 border-brand-500 overflow-hidden relative hover-scale">
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
            </div>
          </div>
          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover-scale">
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

    <!-- Testimonials -->
    <section class="py-16 lg:py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <span class="text-brand-500 font-semibold tracking-wider uppercase">Testimonials</span>
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-4">What Our Users Say</h2>
          <div class="w-20 h-1 bg-brand-500 mx-auto mt-4 rounded-full"></div>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover-scale">
            <div class="flex items-center mb-4 text-yellow-400"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
            <p class="text-gray-600 italic mb-6">"HotBando has been a game-changer for my studies. Fast internet at an affordable price, and I earn free data by watching ads!"</p>
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold mr-3">AM</div>
              <div><h4 class="font-semibold text-gray-900">Amina M.</h4><p class="text-gray-500 text-sm">UDSM Student</p></div>
            </div>
          </div>
          <div class="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover-scale">
            <div class="flex items-center mb-4 text-yellow-400"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
            <p class="text-gray-600 italic mb-6">"As a franchise owner, HotBando made it easy to start my own internet business. The support team is always there when I need them."</p>
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold mr-3">PK</div>
              <div><h4 class="font-semibold text-gray-900">Peter K.</h4><p class="text-gray-500 text-sm">Franchise Owner, Arusha</p></div>
            </div>
          </div>
          <div class="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover-scale">
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
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 class="text-3xl lg:text-4xl font-bold mb-6">Ready to Get <span class="text-yellow-300">Connected?</span></h2>
        <p class="text-xl text-white/90 mb-8 max-w-2xl mx-auto">Join thousands of happy users today. Experience fast, affordable internet with HotBando.</p>
        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <a href="https://wa.me/255712345678" target="_blank" class="border-2 border-white text-white hover:bg-white/10 px-8 py-3.5 rounded-full text-lg font-semibold transition-all hover-scale flex items-center justify-center">
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
              <img src="/hot-bando-logo.png" alt="HotBando" class="h-8">
              <span class="text-xl font-bold text-brand-400">HotBando</span>
            </div>
            <p class="text-gray-400 text-sm">Fast, affordable, and accessible internet for students, families, and businesses across Tanzania.</p>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4 uppercase tracking-wider text-sm">Services</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="#services" class="text-gray-400 hover:text-brand-400 transition">Internet Plans</a></li>
              <li><a href="#pricing" class="text-gray-400 hover:text-brand-400 transition">Pricing</a></li>
              <li><a href="/hotspot/subscribe" class="text-gray-400 hover:text-brand-400 transition">Buy Voucher</a></li>
              <li><a href="/reseller/signup" class="text-gray-400 hover:text-brand-400 transition">Reseller Signup</a></li>
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

    <!-- Auth Modal -->
    <div v-if="activeModal === 'auth'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content max-w-md">
        <div class="flex justify-between items-center mb-6">
          <div class="flex space-x-2">
            <button :class="['px-5 py-2 rounded-full font-semibold text-sm transition', authTab === 'login' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']" @click="authTab = 'login'">Sign In</button>
            <button :class="['px-5 py-2 rounded-full font-semibold text-sm transition', authTab === 'register' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']" @click="authTab = 'register'">Create Account</button>
          </div>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <!-- Login Form -->
        <form v-if="authTab === 'login'" @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input v-model="loginForm.email" type="email" required class="input w-full" placeholder="you@example.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input v-model="loginForm.password" type="password" required class="input w-full" placeholder="Enter your password">
          </div>
          <p v-if="authError" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{{ authError }}</p>
          <button type="submit" :disabled="authLoading" class="btn btn-primary w-full justify-center">{{ authLoading ? 'Signing in...' : 'Sign In' }}</button>
          <p class="text-center text-sm text-gray-500">Forgot password? <a href="/hotspot/login" class="text-brand-500 font-medium">Reset here</a></p>
        </form>

        <!-- Register Form -->
        <form v-if="authTab === 'register'" @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input v-model="registerForm.name" type="text" required class="input w-full" placeholder="John Doe">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input v-model="registerForm.email" type="email" required class="input w-full" placeholder="you@example.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">I want to join as *</label>
            <select v-model="registerForm.role" required class="input w-full">
              <option value="">Select your role</option>
              <option value="sponsor">Marketing (Sponsor)</option>
              <option value="franchise_owner">Franchise Owner</option>
              <option value="reseller">Reseller</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <div class="flex gap-2">
              <select v-model="registerForm.countryCode" class="input w-32 flex-shrink-0">
                <option value="+255">🇹🇿 +255</option>
                <option value="+254">🇰🇪 +254</option>
                <option value="+256">🇺🇬 +256</option>
                <option value="+257">🇧🇮 +257</option>
                <option value="+250">🇷🇼 +250</option>
                <option value="+260">🇿🇲 +260</option>
                <option value="+27">🇿🇦 +27</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
              </select>
              <input v-model="registerForm.phone" type="tel" required class="input w-full" placeholder="7XX XXX XXX">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input v-model="registerForm.password" type="password" required class="input w-full" placeholder="Create a password (min 6 chars)">
          </div>
          <p v-if="authError" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{{ authError }}</p>
          <button type="submit" :disabled="authLoading" class="btn btn-primary w-full justify-center">{{ authLoading ? 'Creating account...' : 'Create Account' }}</button>
          <p class="text-center text-sm text-gray-500">Already have an account? <a href="#" @click.prevent="authTab = 'login'" class="text-brand-500 font-medium">Sign in</a></p>
        </form>
      </div>
    </div>

    <!-- Partner Application Modal -->
    <div v-if="activeModal === 'partner'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content max-w-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-gray-900">Apply as Partner</h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <!-- Step Indicator -->
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
          <!-- Step 1: Personal Details -->
          <div v-if="partnerStep === 1" class="space-y-4">
            <div class="grid md:grid-cols-2 gap-4">
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label><input v-model="partner.name" required class="input w-full" placeholder="Your full name"></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <div class="flex gap-2">
                  <select v-model="partner.countryCode" class="input w-32 flex-shrink-0">
                    <option value="+255">🇹🇿 +255</option>
                    <option value="+254">🇰🇪 +254</option>
                    <option value="+256">🇺🇬 +256</option>
                    <option value="+257">🇧🇮 +257</option>
                    <option value="+250">🇷🇼 +250</option>
                    <option value="+260">🇿🇲 +260</option>
                    <option value="+27">🇿🇦 +27</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                  </select>
                  <input v-model="partner.phone" type="tel" required class="input w-full" placeholder="7XX XXX XXX">
                </div>
              </div>
            </div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label><input v-model="partner.email" type="email" class="input w-full" placeholder="your@email.com"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Location (City/Region) *</label><input v-model="partner.location" required class="input w-full" placeholder="e.g. Dar es Salaam"></div>
            <p class="text-sm text-gray-500">* Required fields</p>
          </div>

          <!-- Step 2: Business Info -->
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

          <!-- Step 3: Confirmation -->
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

          <!-- Navigation -->
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
import { useRouter } from 'vue-router'

const router = useRouter()

const mobileOpen = ref(false)
const currentYear = ref(new Date().getFullYear())
const activeModal = ref(null)
const user = ref(null)
const avatarDropdown = ref(false)

const dashboardRoute = ref('/login')

function getDashboardRoute(role) {
  const map = { admin: '/admin/dashboard', super_admin: '/admin/dashboard', sponsor: '/sponsor/dashboard', bank_partner: '/bank/dashboard', franchise_owner: '/franchise/dashboard', reseller: '/reseller/dashboard', customer: '/hotspot/dashboard' }
  return map[role] || '/login'
}

async function checkSession() {
  try {
    const r = await fetch('/api/me')
    if (r.ok) {
      const data = await r.json()
      user.value = data.user
      dashboardRoute.value = getDashboardRoute(data.user.role)
    }
  } catch {}
}

async function handleLogout() {
  try {
    await fetch('/api/logout')
  } catch {}
  user.value = null
  avatarDropdown.value = false
  window.location.href = '/'
}

function handleClickOutside(e) {
  if (avatarDropdown.value && !e.target.closest('.relative')) {
    avatarDropdown.value = false
  }
}

// Auth modal
const authTab = ref('login')
const authError = ref('')
const authLoading = ref(false)
const loginForm = ref({ email: '', password: '' })
const registerForm = ref({ name: '', email: '', phone: '', countryCode: '+255', password: '', role: '' })

// Partner modal
const partnerStep = ref(1)
const partnerSubmitting = ref(false)
const partnerError = ref('')
const partnerSuccess = ref('')
const partner = ref({ name: '', phone: '', countryCode: '+255', email: '', location: '', businessType: '', packageType: '', estimatedUsers: '', notes: '' })

// Contact modal
const contactSubmitting = ref(false)
const contactError = ref('')
const contactSuccess = ref('')
const contact = ref({ name: '', email: '', message: '' })

function openModal(type) {
  activeModal.value = type
  document.body.style.overflow = 'hidden'
}

function closeModal() {
  activeModal.value = null
  document.body.style.overflow = ''
  authError.value = ''
  partnerError.value = ''
  partnerSuccess.value = ''
  contactError.value = ''
  contactSuccess.value = ''
}

async function handleLogin() {
  authLoading.value = true
  authError.value = ''
  try {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm.value)
    })
    const data = await r.json()
    if (data.success) {
      if (data.user.role === 'admin' || data.user.role === 'super_admin') {
        closeModal()
        window.location.href = data.redirect
        return
      }
      user.value = data.user
      dashboardRoute.value = getDashboardRoute(data.user.role)
      closeModal()
      loginForm.value = { email: '', password: '' }
    } else {
      authError.value = data.error || 'Invalid email or password'
    }
  } catch {
    authError.value = 'Connection error. Please try again.'
  } finally {
    authLoading.value = false
  }
}

async function handleRegister() {
  authLoading.value = true
  authError.value = ''
  try {
    const payload = {
      name: registerForm.value.name,
      email: registerForm.value.email,
      phone_number: registerForm.value.countryCode + registerForm.value.phone.replace(/^0+/, ''),
      password: registerForm.value.password,
      role: registerForm.value.role
    }
    const r = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await r.json()
    if (data.success) {
      authError.value = ''
      registerForm.value = { name: '', email: '', phone: '', countryCode: '+255', password: '', role: '' }
      authTab.value = 'login'
    } else {
      authError.value = data.message || data.error || 'Registration failed'
    }
  } catch {
    authError.value = 'Connection error. Please try again.'
  } finally {
    authLoading.value = false
  }
}

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
  document.addEventListener('click', handleClickOutside)
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
  transition: color 0.3s;
}
.nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: #FF7A30;
  transition: width 0.3s;
}
.nav-link:hover::after {
  width: 100%;
}
.hover-scale {
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease;
}
.hover-scale:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}
.service-card {
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease;
}
.service-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
}
.whatsapp-float {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 50;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #25D366;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(37, 211, 102, 0.4);
  animation: bounce 2s infinite;
  transition: transform 0.3s;
}
.whatsapp-float:hover {
  transform: scale(1.1);
  color: white;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
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
section {
  scroll-margin-top: 5rem;
}
</style>
