<template>
  <div class="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
    <div class="p-5">
      <div class="flex items-center justify-between mb-4">
        <div class="flex gap-2">
          <input v-model="search" @input="loadUsers" placeholder="Search by phone/name..." class="input w-64">
          <select v-model="statusFilter" @change="loadUsers" class="input w-32">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>
      <table class="tbl-shadcn">
        <thead><tr><th>Phone</th><th>Name</th><th>Expires</th><th>Free Data</th><th>Status</th><th>Spent</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="font-medium text-gray-800">{{ u.phone_number }}</td>
            <td>{{ u.name }}</td>
            <td>{{ u.usage_until ? new Date(u.usage_until).toLocaleDateString() : '—' }}</td>
            <td>{{ u.free_mb || 0 }} MB</td>
            <td><span class="badge" :class="u.is_active ? 'badge-success' : 'badge-danger'">{{ u.is_active ? 'Active' : 'Suspended' }}</span></td>
            <td>{{ u.moneyspent || 0 }} TZS</td>
            <td>
              <button @click="suspendUser(u)" class="text-xs" :class="u.is_active ? 'text-red-500 hover:underline' : 'text-green-500 hover:underline'">
                {{ u.is_active ? 'Suspend' : 'Enable' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="pagination.pages > 1" class="flex items-center justify-between pt-4">
        <p class="text-sm text-gray-500">Total: {{ pagination.total }}</p>
        <div class="flex gap-2">
          <button @click="page = Math.max(1, page - 1); loadUsers()" :disabled="page === 1" class="btn btn-outline btn-xs">Previous</button>
          <span class="px-3 py-1 text-sm text-gray-600">{{ page }} / {{ pagination.pages }}</span>
          <button @click="page = Math.min(pagination.pages, page + 1); loadUsers()" :disabled="page === pagination.pages" class="btn btn-outline btn-xs">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminGet, adminPost } from '../../api/client'

const users = ref([])
const search = ref('')
const statusFilter = ref('')
const page = ref(1)
const pagination = ref({})

onMounted(loadUsers)

async function loadUsers() {
  try { const r = await adminGet(`/customers?search=${search.value}&page=${page.value}&limit=20`); users.value = r.data || []; pagination.value = r.pagination || {} }
  catch (e) { console.error(e) }
}
async function suspendUser(u) {
  try { if (u.is_active) { await adminPost('/suspend-customer/' + u.id) } else { await adminPost('/unsuspend/' + u.id) }; await loadUsers() }
  catch (e) { console.error(e) }
}
</script>
