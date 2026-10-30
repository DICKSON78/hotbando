<template>
  <DashboardLayout
    title="HotBando HQ"
    :subtitle="pageTitle"
    :navItems="navItems"
    :user="auth.user"
    :onLogout="logout"
  >
    <router-view />
  </DashboardLayout>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout.vue'

const route = useRoute()
const auth = useAuthStore()

const navItems = [
  { divider: 'COMMAND CENTER' },
  { path: '/admin/overview', label: 'Overview', icon: 'fas fa-globe' },
  { path: '/admin/dashboard', label: 'Analytics', icon: 'fas fa-chart-pie' },

  { divider: 'OPERATIONS' },
  { path: '/admin/branches', label: 'Branches', icon: 'fas fa-building' },
  { path: '/admin/staff', label: 'Staff & HR', icon: 'fas fa-user-tie' },
  { path: '/admin/routers', label: 'Router Fleet', icon: 'fas fa-wifi' },
  { path: '/admin/locations', label: 'Locations', icon: 'fas fa-map-marker-alt' },
  { path: '/admin/assets', label: 'Assets & Inventory', icon: 'fas fa-boxes' },

  { divider: 'FINANCE' },
  { path: '/admin/payments', label: 'All Payments', icon: 'fas fa-receipt' },
  { path: '/admin/finance', label: 'Finance', icon: 'fas fa-chart-line' },
  { path: '/admin/revenue', label: 'Revenue', icon: 'fas fa-coins' },
  { path: '/admin/wallet', label: 'Wallet', icon: 'fas fa-wallet' },
  { path: '/admin/withdrawals', label: 'Withdrawals', icon: 'fas fa-hand-holding-usd' },
  { path: '/admin/revenue-share', label: 'Rev. Share', icon: 'fas fa-percentage' },

  { divider: 'BUSINESS' },
  { path: '/admin/users', label: 'Customers', icon: 'fas fa-users' },
  { path: '/admin/resellers', label: 'Resellers', icon: 'fas fa-store' },
  { path: '/admin/campaigns', label: 'Campaigns', icon: 'fas fa-ad' },
  { path: '/admin/reports', label: 'Reports & Marketing', icon: 'fas fa-bullhorn' },
  { path: '/admin/applications', label: 'Applications', icon: 'fas fa-file-alt' },
  { path: '/admin/packages', label: 'Packages', icon: 'fas fa-box' },

  { divider: 'COMPLIANCE' },
  { path: '/admin/compliance', label: 'Contracts & Licenses', icon: 'fas fa-gavel' },
  { path: '/admin/tickets', label: 'Support Tickets', icon: 'fas fa-headset' },
  { path: '/admin/audit', label: 'Audit Trail', icon: 'fas fa-shield-alt' },

  { divider: 'SYSTEM' },
  { path: '/admin/notifications', label: 'Notifications', icon: 'fas fa-bell' },
  { path: '/admin/settings', label: 'Settings', icon: 'fas fa-cog' },
  { path: '/admin/change-password', label: 'Change Password', icon: 'fas fa-key' },
]

const pageTitle = computed(() => {
  const map = {
    'overview': 'National Overview',
    'dashboard': 'Analytics Dashboard',
    'branches': 'Branch Management',
    'staff': 'Staff & HR',
    'routers': 'Router Fleet',
    'locations': 'Locations',
    'assets': 'Assets & Inventory',
    'finance': 'Financial Management',
    'payments': 'All Payments & Business Processes',
    'revenue': 'Revenue',
    'wallet': 'Wallet',
    'withdrawals': 'Withdrawals',
    'revenue-share': 'Revenue Sharing',
    'users': 'Customer Management',
    'resellers': 'Reseller Management',
    'campaigns': 'Campaigns',
    'reports': 'Reports & Marketing',
    'applications': 'Partner Applications',
    'packages': 'Internet Packages',
    'compliance': 'Contracts & Compliance',
    'tickets': 'Support Tickets',
    'audit': 'Audit Trail',
    'notifications': 'Notifications',
    'settings': 'System Settings',
    'change-password': 'Change Password'
  }
  return map[route.name] || 'Admin'
})

function logout() {
  auth.logout().then(() => window.location.href = '/login')
}

onMounted(async () => {
  if (!(await auth.checkSession())) window.location.href = '/login'
})
</script>
