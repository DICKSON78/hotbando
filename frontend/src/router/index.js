import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useResellerStore } from '../stores/reseller'
import { usePartnerStore } from '../stores/partner'

const routes = [
  { path: '/', name: 'landing', component: () => import('../views/Landing.vue') },
  { path: '/login', name: 'portal-login', component: () => import('../views/PortalLogin.vue') },
  { path: '/admin/login', redirect: '/login' },
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/admin/Dashboard.vue') },
      { path: 'locations', name: 'locations', component: () => import('../views/admin/Locations.vue') },
      { path: 'routers', name: 'routers', component: () => import('../views/admin/Routers.vue') },
      { path: 'users', name: 'users', component: () => import('../views/admin/Users.vue') },
      { path: 'resellers', name: 'resellers', component: () => import('../views/admin/Resellers.vue') },
      { path: 'withdrawals', name: 'withdrawals', component: () => import('../views/admin/Withdrawals.vue') },
      { path: 'campaigns', name: 'campaigns', component: () => import('../views/admin/Campaigns.vue') },
      { path: 'revenue', name: 'revenue', component: () => import('../views/admin/Revenue.vue') },
      { path: 'wallet', name: 'wallet', component: () => import('../views/admin/Wallet.vue') },
      { path: 'settings', name: 'settings', component: () => import('../views/admin/Settings.vue') }
    ]
  },
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
  {
    path: '/reseller',
    component: () => import('../layouts/ResellerLayout.vue'),
    meta: { requiresReseller: true },
    children: [
      { path: '', redirect: '/reseller/dashboard' },
      { path: 'dashboard', name: 'reseller-dashboard', component: () => import('../views/reseller/Dashboard.vue') },
      { path: 'vouchers', name: 'reseller-vouchers', component: () => import('../views/reseller/Vouchers.vue') },
      { path: 'withdraw', name: 'reseller-withdraw', component: () => import('../views/reseller/Withdraw.vue') },
      { path: 'topup', name: 'reseller-topup', component: () => import('../views/reseller/TopUp.vue') }
    ]
  },
  {
    path: '/reseller/signup',
    name: 'reseller-signup',
    component: () => import('../views/reseller/Signup.vue')
  },
  {
    path: '/franchise',
    component: () => import('../layouts/FranchiseLayout.vue'),
    meta: { requiresPartner: 'franchise_owner' },
    children: [
      { path: '', redirect: '/franchise/dashboard' },
      { path: 'dashboard', name: 'franchise-dashboard', component: () => import('../views/franchise/Dashboard.vue') },
      { path: 'locations', name: 'franchise-locations', component: () => import('../views/franchise/Locations.vue') },
      { path: 'revenue', name: 'franchise-revenue', component: () => import('../views/franchise/Revenue.vue') }
    ]
  },
  {
    path: '/sponsor',
    component: () => import('../layouts/SponsorLayout.vue'),
    meta: { requiresPartner: 'sponsor' },
    children: [
      { path: '', redirect: '/sponsor/dashboard' },
      { path: 'dashboard', name: 'sponsor-dashboard', component: () => import('../views/sponsor/Dashboard.vue') },
      { path: 'campaigns', name: 'sponsor-campaigns', component: () => import('../views/sponsor/Campaigns.vue') },
      { path: 'campaigns/create', name: 'sponsor-campaigns-create', component: () => import('../views/sponsor/CampaignForm.vue') },
      { path: 'wallet', name: 'sponsor-wallet', component: () => import('../views/sponsor/Wallet.vue') }
    ]
  },
  {
    path: '/bank',
    component: () => import('../layouts/BankLayout.vue'),
    meta: { requiresPartner: 'bank_partner' },
    children: [
      { path: '', redirect: '/bank/dashboard' },
      { path: 'dashboard', name: 'bank-dashboard', component: () => import('../views/bank/Dashboard.vue') },
      { path: 'campaigns', name: 'bank-campaigns', component: () => import('../views/bank/Campaigns.vue') },
      { path: 'campaigns/create', name: 'bank-campaigns-create', component: () => import('../views/bank/CampaignForm.vue') },
      { path: 'leads', name: 'bank-leads', component: () => import('../views/bank/Leads.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const auth = useAuthStore()
    if (!auth.isAdmin) {
      const ok = await auth.checkSession()
      if (!ok) return '/'
    }
  }
  if (to.meta.requiresReseller) {
    const reseller = useResellerStore()
    if (!reseller.user) {
      const ok = await reseller.checkSession()
      if (!ok) return '/'
    }
  }
  if (to.meta.requiresPartner) {
    const partner = usePartnerStore()
    if (!partner.user) {
      await partner.checkSession()
    }
    if (!partner.user || partner.user.role !== to.meta.requiresPartner) {
      return '/'
    }
  }
})

export default router
