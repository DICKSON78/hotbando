<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Campaigns & Advertising</h2>
        <p class="text-sm" style="color: #6b7280">Manage ads, voucher campaigns, and conversion tracking</p>
      </div>
      <div class="flex gap-2">
        <button @click="loadAll()" class="btn btn-secondary btn-sm"><i class="fas fa-sync-alt"></i></button>
        <button @click="showCreateAd = true" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> New Ad</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Total Ads</p><p class="stat-value">{{ campaignStats.total_ads || 0 }}</p></div>
          <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-ad"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Active Ads</p><p class="stat-value" style="color: #34d399">{{ campaignStats.active || 0 }}</p></div>
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-play-circle"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Total Views</p><p class="stat-value" style="color: #f59e0b">{{ fmtNum(campaignStats.total_views) }}</p></div>
          <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b"><i class="fas fa-eye"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Completed Views</p><p class="stat-value" style="color: #a78bfa">{{ fmtNum(campaignStats.completed_views) }}</p></div>
          <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-check-double"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div><p class="stat-label">Campaigns</p><p class="stat-value" style="color: #FF7A30">{{ campaignStats.total_campaigns || 0 }}</p></div>
          <div class="stat-icon" style="background: rgba(255,122,48,0.1); color: #FF7A30"><i class="fas fa-bullhorn"></i></div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="section-card" style="padding: 4px">
      <div class="flex gap-1">
        <button v-for="t in ['ads','campaigns']" :key="t" @click="activeTab = t"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :style="activeTab === t ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'background: transparent; color: #6b7280'">
          {{ t === 'ads' ? 'Video Ads (' + ads.length + ')' : 'Marketing Campaigns (' + campaigns.length + ')' }}
        </button>
      </div>
    </div>

    <!-- ADS TAB -->
    <template v-if="activeTab === 'ads'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-ad" style="color: #FF7A30"></i> Video Advertisements</h3>
        </div>
        <div class="section-body">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr style="border-bottom: 1px solid var(--border)">
                <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Title</th>
                <th class="text-left py-3 px-4 text-xs font-medium" style="color: #6b7280">Sponsor</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Reward</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Views</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Completed</th>
                <th class="text-center py-3 px-4 text-xs font-medium" style="color: #6b7280">Completion %</th>
                <th class="text-center py-3 px-4 text-xs font-medium" style="color: #6b7280">Status</th>
                <th class="text-right py-3 px-4 text-xs font-medium" style="color: #6b7280">Actions</th>
              </tr></thead>
              <tbody>
                <tr v-for="ad in ads" :key="ad.id" style="border-bottom: 1px solid rgba(30,30,42,0.5)" class="hover:bg-white/[0.02]">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background: rgba(59,130,246,0.1)">
                        <i class="fas fa-play text-blue-400 text-xs"></i>
                      </div>
                      <div>
                        <p class="font-medium text-white text-sm">{{ ad.title }}</p>
                        <p class="text-xs truncate max-w-[200px]" style="color: #6b7280">{{ ad.description || 'No description' }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-xs text-white">{{ ad.sponsor_name || 'Platform' }}</td>
                  <td class="py-3 px-4 text-right text-xs text-white">{{ fmtMB(ad.reward_bytes || ad.reward_mb) }}</td>
                  <td class="py-3 px-4 text-right text-xs" style="color: #6b7280">{{ fmtNum(ad.view_count || ad.views_count || 0) }}</td>
                  <td class="py-3 px-4 text-right text-xs" style="color: #34d399">{{ fmtNum(ad.completed_views || 0) }}</td>
                  <td class="py-3 px-4 text-center">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 h-1.5 rounded-full" style="background: #1e1e2a">
                        <div class="h-full rounded-full" :style="{ width: completionRate(ad) + '%', background: completionRate(ad) > 60 ? '#34d399' : '#f59e0b' }"></div>
                      </div>
                      <span class="text-xs font-mono" style="color: #6b7280">{{ completionRate(ad) }}%</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span class="text-xs px-2 py-0.5 rounded-full" :class="ad.is_active ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-500'">
                      {{ ad.is_active ? 'ACTIVE' : 'INACTIVE' }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right space-x-1">
                    <button v-if="!ad.is_active" @click="approveAd(ad)" class="p-1.5 rounded-lg transition-colors text-green-400 hover:bg-green-500/10" title="Approve"><i class="fas fa-check text-xs"></i></button>
                    <button v-if="ad.is_active" @click="declineAd(ad)" class="p-1.5 rounded-lg transition-colors text-red-400 hover:bg-red-500/10" title="Deactivate"><i class="fas fa-ban text-xs"></i></button>
                  </td>
                </tr>
                <tr v-if="!ads.length"><td colspan="8" class="text-center py-12" style="color: #6b7280"><p>No ads yet</p></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- CAMPAIGNS TAB -->
    <template v-if="activeTab === 'campaigns'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-bullhorn" style="color: #FF7A30"></i> Marketing Campaigns</h3>
          <button @click="showCreateCampaign = true" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i> Create Campaign</button>
        </div>
        <div class="section-body">
          <div v-for="c in campaigns" :key="c.id" class="p-4 rounded-xl mb-3" style="background: #0a0a0f; border: 1px solid var(--border)">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center" :style="{ background: statusBg(c.status) }">
                  <i class="fas" :class="statusIcon(c.status)" :style="{ color: statusColor(c.status) }"></i>
                </div>
                <div>
                  <p class="font-medium text-white text-sm">{{ c.name }}</p>
                  <p class="text-xs" style="color: #6b7280">{{ c.campaign_type || 'General' }} &bull; {{ c.target_audience || 'All' }}</p>
                </div>
              </div>
              <div class="flex gap-1">
                <button v-if="c.status === 'draft' || c.status === 'paused'" @click="lifecycle(c, 'activate')" class="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400">Activate</button>
                <button v-if="c.status === 'active'" @click="lifecycle(c, 'pause')" class="text-xs px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-400">Pause</button>
                <button v-if="c.status === 'active'" @click="lifecycle(c, 'complete')" class="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400">Complete</button>
                <button v-if="c.status !== 'completed' && c.status !== 'cancelled'" @click="lifecycle(c, 'cancel')" class="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400">Cancel</button>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div class="p-2 rounded-lg" style="background: rgba(59,130,246,0.05)">
                <p class="text-xs" style="color: #6b7280">Budget</p>
                <p class="text-sm font-medium text-white">TSh {{ fmtNum(c.budget) }}</p>
              </div>
              <div class="p-2 rounded-lg" style="background: rgba(239,68,68,0.05)">
                <p class="text-xs" style="color: #6b7280">Spent</p>
                <p class="text-sm font-medium text-white">TSh {{ fmtNum(c.actual_spend || c.spent) }}</p>
              </div>
              <div class="p-2 rounded-lg" style="background: rgba(16,185,129,0.05)">
                <p class="text-xs" style="color: #6b7280">Completions</p>
                <p class="text-sm font-medium text-white">{{ c.completed_count || 0 }}</p>
              </div>
              <div class="p-2 rounded-lg" style="background: rgba(245,158,11,0.05)">
                <p class="text-xs" style="color: #6b7280">CPL</p>
                <p class="text-sm font-medium text-white">{{ c.completed_count > 0 ? 'TSh ' + fmtNum((c.actual_spend || c.spent || 0) / c.completed_count) : '—' }}</p>
              </div>
              <div class="p-2 rounded-lg" style="background: rgba(139,92,246,0.05)">
                <p class="text-xs" style="color: #6b7280">Status</p>
                <p class="text-sm font-medium" :style="{ color: statusColor(c.status) }">{{ (c.status || 'draft').toUpperCase() }}</p>
              </div>
            </div>
          </div>
          <div v-if="!campaigns.length" class="text-center py-12" style="color: #6b7280"><p>No campaigns yet. Create one to start tracking.</p></div>
        </div>
      </div>
    </template>

    <!-- CREATE AD MODAL -->
    <div v-if="showCreateAd" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px)">
      <div class="relative w-full max-w-md rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <button @click="showCreateAd = false" class="absolute top-4 right-4" style="color: #6b7280"><i class="fas fa-times text-lg hover:text-white"></i></button>
        <h3 class="text-lg font-bold text-white mb-4">Create Ad</h3>
        <div class="space-y-3">
          <div><label class="input-label">Title *</label><input v-model="adForm.title" class="form-input" placeholder="Ad title"></div>
          <div><label class="input-label">Description</label><textarea v-model="adForm.description" class="form-input" rows="2" placeholder="Ad description"></textarea></div>
          <div><label class="input-label">Video URL</label><input v-model="adForm.video_url" class="form-input" placeholder="https://.../ad.mp4"></div>
          <div><label class="input-label">Image URL</label><input v-model="adForm.image_url" class="form-input" placeholder="https://.../ad.jpg (required if no video)"></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="input-label">Reward (MB)</label><input v-model.number="adForm.reward_mb" type="number" min="1" class="form-input" placeholder="15"></div>
            <div><label class="input-label">Duration (sec)</label><input v-model.number="adForm.duration_seconds" type="number" min="5" class="form-input" placeholder="30"></div>
          </div>
          <p class="text-xs" style="color: #6b7280">The ad is published immediately. Use the toggle in the table to pause it.</p>
          <button @click="createAd()" class="btn btn-primary w-full" :disabled="!adForm.title || (!adForm.video_url && !adForm.image_url) || creating"><i v-if="creating" class="fas fa-spinner fa-spin mr-1"></i> Create Ad</button>
        </div>
      </div>
    </div>

    <!-- CREATE CAMPAIGN MODAL -->
    <div v-if="showCreateCampaign" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px)">
      <div class="relative w-full max-w-md rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <button @click="showCreateCampaign = false" class="absolute top-4 right-4" style="color: #6b7280"><i class="fas fa-times text-lg hover:text-white"></i></button>
        <h3 class="text-lg font-bold text-white mb-4">Create Campaign</h3>
        <div class="space-y-3">
          <div><label class="input-label">Campaign Name *</label><input v-model="campForm.name" class="form-input" placeholder="Q4 Growth Campaign"></div>
          <div><label class="input-label">Type</label>
            <select v-model="campForm.campaign_type" class="form-input">
              <option value="general">General</option>
              <option value="social_media">Social Media</option>
              <option value="referral">Referral</option>
              <option value="voucher">Voucher</option>
              <option value="brand_awareness">Brand Awareness</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="input-label">Budget (TSh)</label><input v-model.number="campForm.budget" type="number" class="form-input" placeholder="1000000"></div>
            <div><label class="input-label">Daily Budget</label><input v-model.number="campForm.daily_budget" type="number" class="form-input" placeholder="50000"></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="input-label">Start Date</label><input v-model="campForm.start_date" type="date" class="form-input"></div>
            <div><label class="input-label">End Date</label><input v-model="campForm.end_date" type="date" class="form-input"></div>
          </div>
          <div><label class="input-label">Target Audience</label>
            <select v-model="campForm.target_audience" class="form-input">
              <option value="all">All Users</option>
              <option value="students">Students</option>
              <option value="business">Business</option>
              <option value="resellers">Resellers</option>
            </select>
          </div>
          <button @click="createCampaign()" class="btn btn-primary w-full" :disabled="!campForm.name || creating"><i v-if="creating" class="fas fa-spinner fa-spin mr-1"></i> Create Campaign</button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminGet, adminPost, adminPut } from '../../api/client'

const activeTab = ref('ads')
const creating = ref(false)
const ads = ref([])
const campaigns = ref([])
const campaignStats = ref({})
const showCreateAd = ref(false)
const showCreateCampaign = ref(false)

const adForm = ref({ title: '', description: '', video_url: '', image_url: '', reward_mb: 15, duration_seconds: 30 })
const campForm = ref({ name: '', campaign_type: 'general', budget: 0, daily_budget: 0, start_date: '', end_date: '', target_audience: 'all' })

const toast = ref({ show: false, message: '', type: 'success' })
function showToast(msg, type = 'success') { toast.value = { show: true, message: msg, type }; setTimeout(() => toast.value.show = false, 3000) }

function fmtNum(n) { return Number(n || 0).toLocaleString() }
function fmtMB(bytes) { if (!bytes) return '0 MB'; return (bytes / 1024 / 1024).toFixed(0) + ' MB' }
function completionRate(ad) { const t = (ad.view_count || ad.views_count || 0); return t > 0 ? Math.round((ad.completed_views || 0) / t * 100) : 0 }

function statusBg(s) { return { active: 'rgba(16,185,129,0.1)', paused: 'rgba(245,158,11,0.1)', completed: 'rgba(59,130,246,0.1)', cancelled: 'rgba(239,68,68,0.1)', draft: 'rgba(107,114,128,0.1)' }[s] || 'rgba(107,114,128,0.1)' }
function statusColor(s) { return { active: '#34d399', paused: '#f59e0b', completed: '#60a5fa', cancelled: '#f87171', draft: '#6b7280' }[s] || '#6b7280' }
function statusIcon(s) { return { active: 'fa-play', paused: 'fa-pause', completed: 'fa-check', cancelled: 'fa-times', draft: 'fa-pencil-alt' }[s] || 'fa-circle' }

async function loadAll() {
  try {
    const r = await adminGet('/business/campaigns')
    ads.value = r.ads || []
    campaigns.value = r.campaigns || []
    campaignStats.value = r.stats || {}
  } catch (e) { console.error(e) }
}

async function createAd() {
  creating.value = true
  try {
    await adminPost('/business/ads', adForm.value)
    showToast('Ad created and published')
    showCreateAd.value = false
    adForm.value = { title: '', description: '', video_url: '', image_url: '', reward_mb: 15, duration_seconds: 30 }
    loadAll()
  } catch (e) { showToast('Failed: ' + (e.response?.data?.message || e.message), 'error') }
  creating.value = false
}

async function approveAd(ad) {
  try {
    await adminPut('/business/ads/' + ad.id, { approved: 1, is_active: 1 })
    showToast('Ad approved')
    loadAll()
  } catch (e) { showToast('Failed', 'error') }
}

async function declineAd(ad) {
  try {
    await adminPut('/business/ads/' + ad.id, { approved: 0, is_active: 0 })
    showToast('Ad deactivated')
    loadAll()
  } catch (e) { showToast('Failed', 'error') }
}

async function createCampaign() {
  creating.value = true
  try {
    await adminPost('/business/campaigns', campForm.value)
    showToast('Campaign created')
    showCreateCampaign.value = false
    campForm.value = { name: '', campaign_type: 'general', budget: 0, daily_budget: 0, start_date: '', end_date: '', target_audience: 'all' }
    loadAll()
  } catch (e) { showToast('Failed: ' + (e.response?.data?.message || e.message), 'error') }
  creating.value = false
}

async function lifecycle(c, action) {
  try {
    await adminPost('/business/campaigns/' + c.id + '/lifecycle', { action })
    showToast('Campaign ' + action + 'd')
    loadAll()
  } catch (e) { showToast('Failed', 'error') }
}

onMounted(loadAll)
</script>
