import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useHotspotStore } from '../stores/hotspot'

const routes = [
  // Website pages (public)
  { path: '/', name: 'landing', component: () => import('../views/website/Home.vue') },
  { path: '/services', name: 'website-services', component: () => import('../views/website/Services.vue') },
  { path: '/pricing', name: 'website-pricing', component: () => import('../views/website/Pricing.vue') },
  { path: '/about', name: 'website-about', component: () => import('../views/website/About.vue') },
  { path: '/partners', name: 'website-partners', component: () => import('../views/website/Partners.vue') },
  { path: '/contact', name: 'website-contact', component: () => import('../views/website/Contact.vue') },

  // Single unified login for all portals
  { path: '/login', name: 'portal-login', component: () => import('../views/PortalLogin.vue') },
  { path: '/register', name: 'partner-register', component: () => import('../views/PartnerRegister.vue') },
  { path: '/partner/register', redirect: '/register' },
  { path: '/admin/login', redirect: '/login' },
  { path: '/sponsor/login', redirect: '/login' },
  { path: '/bank/login', redirect: '/login' },
  { path: '/franchise/login', redirect: '/login' },
  { path: '/reseller/login', redirect: '/login' },
  { path: '/apply/reseller', name: 'reseller-apply', component: () => import('../views/PartnerRegister.vue') },
  { path: '/apply/status', name: 'reseller-apply-status', component: () => import('../views/ResellerApplyStatus.vue') },
  { path: '/investor/login', redirect: '/login' },
  { path: '/partner/login', redirect: '/login' },
  { path: '/partners/login', redirect: '/login' },

  // Legacy EJS URLs now redirect to their Vue equivalents.
  { path: '/admin/vouchers', redirect: '/admin/packages' },
  { path: '/admin/video-ads', redirect: '/admin/campaigns' },
  { path: '/admin/upload-video', redirect: '/admin/campaigns' },
  { path: '/admin/analytics', redirect: '/admin/dashboard' },
  { path: '/admin/my-ads', redirect: '/admin/campaigns' },
  { path: '/admin/approve-content', redirect: '/admin/campaigns' },
  { path: '/admin/leads', redirect: '/admin/users' },
  { path: '/admin/generate-vouchers', redirect: '/admin/packages' },
  { path: '/admin/setup-wizard', redirect: '/admin/routers' },
  { path: '/sponsor/my-ads', redirect: '/sponsor/campaigns' },
  { path: '/sponsor/upload-video', redirect: '/sponsor/campaigns/create' },
  { path: '/sponsor/analytics', redirect: '/sponsor/dashboard' },
  { path: '/sponsor/settings', redirect: '/sponsor/dashboard' },

  // ==================== Admin Portal ====================
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'super_admin'] },
    children: [
      { path: '', redirect: '/admin/overview' },
      { path: 'overview', name: 'overview', component: () => import('../views/admin/Overview.vue') },
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/admin/Dashboard.vue') },
      { path: 'branches', name: 'branches', component: () => import('../views/admin/Branches.vue') },
      { path: 'staff', name: 'staff', component: () => import('../views/admin/Staff.vue') },
      { path: 'finance', name: 'finance', component: () => import('../views/admin/Finance.vue') },
      { path: 'assets', name: 'assets', component: () => import('../views/admin/Assets.vue') },
      { path: 'tickets', name: 'tickets', component: () => import('../views/admin/Tickets.vue') },
      { path: 'audit', name: 'audit', component: () => import('../views/admin/Audit.vue') },
      { path: 'compliance', name: 'compliance', component: () => import('../views/admin/Compliance.vue') },
      { path: 'reports', name: 'reports', component: () => import('../views/admin/Reports.vue') },
      { path: 'users', name: 'users', component: () => import('../views/admin/Users.vue') },
      { path: 'routers', name: 'routers', component: () => import('../views/admin/Routers.vue') },
      { path: 'router-fleet', name: 'router-fleet', component: () => import('../views/admin/RouterFleet.vue') },
      { path: 'locations', name: 'locations', component: () => import('../views/admin/Locations.vue') },
      { path: 'resellers', name: 'resellers', component: () => import('../views/admin/Resellers.vue') },
      { path: 'reseller-routers', name: 'reseller-routers', component: () => import('../views/admin/ResellerRouters.vue') },
      { path: 'reseller-onboarding', name: 'reseller-onboarding', component: () => import('../views/admin/ResellerOnboarding.vue') },
      { path: 'withdrawals', name: 'withdrawals', component: () => import('../views/admin/Withdrawals.vue') },
      { path: 'campaigns', name: 'campaigns', component: () => import('../views/admin/Campaigns.vue') },
      { path: 'revenue', name: 'revenue', component: () => import('../views/admin/Revenue.vue') },
      { path: 'payments', name: 'payments', component: () => import('../views/admin/Payments.vue') },
      { path: 'wallet', name: 'wallet', component: () => import('../views/admin/Wallet.vue') },
      { path: 'revenue-share', name: 'revenue-share', component: () => import('../views/admin/RevenueShare.vue') },
      { path: 'notifications', name: 'notifications', component: () => import('../views/admin/Notifications.vue') },
      { path: 'applications', name: 'applications', component: () => import('../views/admin/Applications.vue') },
      { path: 'packages', name: 'packages', component: () => import('../views/admin/Packages.vue') },
      { path: 'settings', name: 'settings', component: () => import('../views/admin/Settings.vue') },
      { path: 'change-password', name: 'change-password', component: () => import('../views/admin/ChangePassword.vue') }
    ]
  },

  // ==================== Customer / Hotspot Portal ====================
  {
    path: '/hotspot',
    component: () => import('../layouts/HotspotLayout.vue'),
    children: [
      { path: '', name: 'hotspot-index', component: () => import('../views/hotspot/Index.vue') },
      { path: 'login', name: 'hotspot-login', component: () => import('../views/hotspot/Login.vue') },
      { path: 'signup', name: 'hotspot-signup', component: () => import('../views/hotspot/Signup.vue') },
      { path: 'dashboard', name: 'hotspot-dashboard', component: () => import('../views/hotspot/Dashboard.vue') },
      { path: 'subscribe', name: 'hotspot-subscribe', component: () => import('../views/hotspot/Subscribe.vue') },
      { path: 'ads', name: 'hotspot-ads', component: () => import('../views/hotspot/Ads.vue') }
    ]
  },

  // ==================== Reseller Portal ====================
  {
    path: '/reseller',
    component: () => import('../layouts/ResellerLayout.vue'),
    meta: { requiresAuth: true, roles: ['reseller'] },
    children: [
      { path: '', redirect: '/reseller/dashboard' },
      { path: 'dashboard', name: 'reseller-dashboard', component: () => import('../views/reseller/Dashboard.vue') },
      { path: 'vouchers', name: 'reseller-vouchers', component: () => import('../views/reseller/Vouchers.vue') },
      { path: 'withdraw', name: 'reseller-withdraw', component: () => import('../views/reseller/Withdraw.vue') },
      { path: 'topup', name: 'reseller-topup', component: () => import('../views/reseller/TopUp.vue') },
      { path: 'settings', name: 'reseller-settings', component: () => import('../views/reseller/Settings.vue') },
      { path: 'application', name: 'reseller-application', component: () => import('../views/reseller/Application.vue') }
    ]
  },
  {
    path: '/reseller/signup',
    name: 'reseller-signup',
    component: () => import('../views/reseller/Signup.vue')
  },

  // ==================== Franchise Portal ====================
  {
    path: '/franchise',
    component: () => import('../layouts/FranchiseLayout.vue'),
    meta: { requiresAuth: true, roles: ['franchise_owner', 'admin', 'super_admin'] },
    children: [
      { path: '', redirect: '/franchise/dashboard' },
      { path: 'dashboard', name: 'franchise-dashboard', component: () => import('../views/franchise/Dashboard.vue') },
      { path: 'locations', name: 'franchise-locations', component: () => import('../views/franchise/Locations.vue') },
      { path: 'revenue', name: 'franchise-revenue', component: () => import('../views/franchise/Revenue.vue') }
    ]
  },

  // ==================== Sponsor Portal ====================
  {
    path: '/sponsor',
    component: () => import('../layouts/SponsorLayout.vue'),
    meta: { requiresAuth: true, roles: ['sponsor', 'admin', 'super_admin'] },
    children: [
      { path: '', redirect: '/sponsor/dashboard' },
      { path: 'dashboard', name: 'sponsor-dashboard', component: () => import('../views/sponsor/Dashboard.vue') },
      { path: 'campaigns', name: 'sponsor-campaigns', component: () => import('../views/sponsor/Campaigns.vue') },
      { path: 'campaigns/create', name: 'sponsor-campaigns-create', component: () => import('../views/sponsor/CampaignForm.vue') },
      { path: 'wallet', name: 'sponsor-wallet', component: () => import('../views/sponsor/Wallet.vue') }
    ]
  },

  // ==================== Bank Portal ====================
  {
    path: '/bank',
    component: () => import('../layouts/BankLayout.vue'),
    meta: { requiresAuth: true, roles: ['bank_partner', 'admin', 'super_admin'] },
    children: [
      { path: '', redirect: '/bank/dashboard' },
      { path: 'dashboard', name: 'bank-dashboard', component: () => import('../views/bank/Dashboard.vue') },
      { path: 'campaigns', name: 'bank-campaigns', component: () => import('../views/bank/Campaigns.vue') },
      { path: 'campaigns/create', name: 'bank-campaigns-create', component: () => import('../views/bank/CampaignForm.vue') },
      { path: 'leads', name: 'bank-leads', component: () => import('../views/bank/Leads.vue') }
    ]
  },

  // ==================== Investor Portal ====================
  {
    path: '/investor',
    component: () => import('../layouts/InvestorLayout.vue'),
    meta: { requiresAuth: true, roles: ['investor', 'admin', 'super_admin', 'franchise_owner'] },
    children: [
      { path: '', redirect: '/investor/dashboard' },
      { path: 'dashboard', name: 'investor-dashboard', component: () => import('../views/investor/Dashboard.vue') },
      { path: 'investments', name: 'investor-investments', component: () => import('../views/investor/Investments.vue') },
      { path: 'returns', name: 'investor-returns', component: () => import('../views/investor/Returns.vue') },
      { path: 'portfolio', name: 'investor-portfolio', component: () => import('../views/investor/Portfolio.vue') }
    ]
  },

  // Vue-only 404 page
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFound.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  }
})

// ==================== Unified RBAC Guard ====================
router.beforeEach(async (to) => {
  // Hotspot guest routes (login/signup) — bounce logged-in customers
  const hotspotGuestRoutes = ['hotspot-login', 'hotspot-signup']
  if (hotspotGuestRoutes.includes(to.name)) {
    const hotspot = useHotspotStore()
    await hotspot.init(to.query)
    if (hotspot.isLoggedIn) return '/hotspot/dashboard'
    return  // allow
  }

  // Hotspot protected routes — require customer session + WiFi
  const hotspotAuthRoutes = ['hotspot-dashboard', 'hotspot-subscribe', 'hotspot-ads']
  if (hotspotAuthRoutes.includes(to.name)) {
    const hotspot = useHotspotStore()
    await hotspot.init(to.query)
    if (!hotspot.isLoggedIn) return '/hotspot/login'
    if (!hotspot.onWifi) return '/hotspot'
    return  // allow
  }

  // Portal routes — require auth + role check
  if (to.meta.requiresAuth) {
    const auth = useAuthStore()
    // Only call checkSession if we don't already have a user
    if (!auth.user) {
      const ok = await auth.checkSession()
      if (!ok) return '/login'
    }
    // Role check — meta.roles defines allowed roles for this portal
    if (to.meta.roles && to.meta.roles.length > 0) {
      if (!auth.hasRole(...to.meta.roles)) {
        // Wrong portal — redirect to their correct dashboard
        return auth.dashboardUrl()
      }
    }
  }
})

export default router
