<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">Staff & HR Management</h2>
        <p class="text-sm" style="color: #6b7280">Manage employees, attendance, and leave</p>
      </div>
      <div class="flex gap-2">
        <button @click="refreshAll()" class="btn btn-secondary btn-sm" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="section-card" style="padding: 4px">
      <div class="flex gap-1">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          :style="activeTab === tab.key ? 'background: linear-gradient(135deg, #FF7A30, #ea6a24); color: #fff' : 'background: transparent; color: #6b7280'">
          <i :class="tab.icon" class="mr-1.5"></i>{{ tab.label }}
        </button>
      </div>
    </div>

    <!-- ===================== STAFF LIST TAB ===================== -->
    <template v-if="activeTab === 'staff'">
      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Total Staff</p>
              <p class="stat-value">{{ staffStats.total || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(59,130,246,0.1); color: #60a5fa"><i class="fas fa-users"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Active</p>
              <p class="stat-value" style="color: #34d399">{{ staffStats.active || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-check-circle"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">On Leave</p>
              <p class="stat-value" style="color: #facc15">{{ staffStats.on_leave || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(250,204,21,0.1); color: #facc15"><i class="fas fa-user-clock"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Departments</p>
              <p class="stat-value" style="color: #a78bfa">{{ staffStats.departments || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #a78bfa"><i class="fas fa-building"></i></div>
          </div>
        </div>
      </div>

      <!-- Filters + Add -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-users" style="color: #FF7A30"></i> Staff Directory</h3>
          <div class="flex gap-2">
            <input v-model="staffSearch" @input="debouncedLoadStaff" placeholder="Search staff..." class="form-input" style="max-width: 200px">
            <select v-model="staffDeptFilter" @change="loadStaff()" class="form-input" style="max-width: 160px">
              <option value="">All Departments</option>
              <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
            </select>
            <select v-model="staffBranchFilter" @change="loadStaff()" class="form-input" style="max-width: 160px">
              <option value="">All Branches</option>
              <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
            <button @click="showAddStaffModal = true" class="btn btn-primary btn-sm">
              <i class="fas fa-plus mr-1"></i> Add Staff
            </button>
          </div>
        </div>
        <div class="section-body">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-12 rounded-lg animate-pulse" style="background: #1e1e2a"></div>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr>
                  <th>Employee ID</th><th>Name</th><th>Department</th><th>Job Title</th><th>Branch</th><th>Type</th><th>Status</th><th>Hire Date</th><th>Salary</th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in staffList" :key="s.id" @click="openStaffDetail(s)" style="cursor: pointer">
                  <td class="font-mono text-xs" style="color: #6b7280">{{ s.employee_id || '—' }}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" :style="'background:' + avatarColor(s.name)">
                        {{ (s.name || 'S').charAt(0).toUpperCase() }}
                      </div>
                      <span class="font-medium text-white text-sm">{{ s.name }}</span>
                    </div>
                  </td>
                  <td><span class="badge badge-blue">{{ s.department || '—' }}</span></td>
                  <td class="text-sm" style="color: #d1d5db">{{ s.job_title || '—' }}</td>
                  <td class="text-sm" style="color: #d1d5db">{{ s.branch_name || '—' }}</td>
                  <td><span class="badge badge-gray">{{ formatEmploymentType(s.employment_type) }}</span></td>
                  <td>
                    <span class="badge" :class="s.status === 'active' ? 'badge-green' : s.status === 'on_leave' ? 'badge-yellow' : s.status === 'suspended' ? 'badge-red' : 'badge-gray'">
                      {{ formatStatus(s.status) }}
                    </span>
                  </td>
                  <td class="text-xs" style="color: #6b7280">{{ formatDate(s.hire_date) }}</td>
                  <td class="text-sm font-medium" style="color: #d1d5db">{{ s.currency || 'TSh' }} {{ (s.salary || 0).toLocaleString() }}</td>
                  <td @click.stop>
                    <button @click="openEditStaffModal(s)" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(59,130,246,0.1); color: #60a5fa" title="Edit">
                      <i class="fas fa-pen text-xs"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="!staffList.length">
                  <td colspan="10" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-users text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No staff members found
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== ATTENDANCE TAB ===================== -->
    <template v-if="activeTab === 'attendance'">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-fingerprint" style="color: #FF7A30"></i> Attendance Log</h3>
          <div class="flex gap-2">
            <input v-model="attDateFrom" type="date" class="form-input" style="max-width: 170px" placeholder="From">
            <input v-model="attDateTo" type="date" class="form-input" style="max-width: 170px" placeholder="To">
            <select v-model="attBranchFilter" @change="loadAttendance()" class="form-input" style="max-width: 160px">
              <option value="">All Branches</option>
              <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
            <button @click="loadAttendance()" class="btn btn-primary btn-sm"><i class="fas fa-search"></i> Filter</button>
            <button @click="showMarkAttendanceModal = true" class="btn btn-primary btn-sm"><i class="fas fa-fingerprint mr-1"></i> Mark Attendance</button>
          </div>
        </div>
        <div class="section-body">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-12 rounded-lg animate-pulse" style="background: #1e1e2a"></div>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr><th>Employee ID</th><th>Staff Name</th><th>Branch</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr v-for="a in attendance" :key="a.id">
                  <td class="font-mono text-xs" style="color: #6b7280">{{ a.employee_id || '—' }}</td>
                  <td class="font-medium text-white text-sm">{{ a.staff_name || '—' }}</td>
                  <td class="text-sm" style="color: #d1d5db">{{ a.branch_name || '—' }}</td>
                  <td class="text-xs" style="color: #6b7280">{{ formatDate(a.attendance_date) }}</td>
                  <td class="text-sm" style="color: #d1d5db">{{ formatTime(a.check_in) }}</td>
                  <td class="text-sm" style="color: #d1d5db">{{ formatTime(a.check_out) }}</td>
                  <td class="text-sm font-medium text-white">{{ a.hours_worked || '—' }}</td>
                  <td>
                    <span class="badge" :class="attStatusClass(a.status)">
                      {{ formatAttStatus(a.status) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!attendance.length">
                  <td colspan="8" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-fingerprint text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No attendance records
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== LEAVE REQUESTS TAB ===================== -->
    <template v-if="activeTab === 'leave'">
      <!-- Leave Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Pending</p>
              <p class="stat-value" style="color: #facc15">{{ leaveStats.pending || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(250,204,21,0.1); color: #facc15"><i class="fas fa-hourglass-half"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Approved</p>
              <p class="stat-value" style="color: #34d399">{{ leaveStats.approved || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #34d399"><i class="fas fa-check-circle"></i></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="stat-label">Rejected</p>
              <p class="stat-value" style="color: #f87171">{{ leaveStats.rejected || 0 }}</p>
            </div>
            <div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #f87171"><i class="fas fa-times-circle"></i></div>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title"><i class="fas fa-calendar-minus" style="color: #FF7A30"></i> Leave Requests</h3>
          <select v-model="leaveStatusFilter" @change="loadLeaveRequests()" class="form-input" style="max-width: 150px">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div class="section-body">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-12 rounded-lg animate-pulse" style="background: #1e1e2a"></div>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="re-table">
              <thead>
                <tr><th>Employee ID</th><th>Staff Name</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Approved By</th><th>Actions</th></tr>
              </thead>
              <tbody>
                <tr v-for="lr in leaveRequests" :key="lr.id">
                  <td class="font-mono text-xs" style="color: #6b7280">{{ lr.employee_id || '—' }}</td>
                  <td class="font-medium text-white text-sm">{{ lr.staff_name || '—' }}</td>
                  <td><span class="badge badge-blue">{{ formatLeaveType(lr.leave_type) }}</span></td>
                  <td class="text-xs" style="color: #6b7280">{{ formatDate(lr.start_date) }}</td>
                  <td class="text-xs" style="color: #6b7280">{{ formatDate(lr.end_date) }}</td>
                  <td class="text-sm font-medium text-white">{{ lr.days_requested || '—' }}</td>
                  <td class="text-xs max-w-[200px] truncate" style="color: #d1d5db" :title="lr.reason">{{ lr.reason || '—' }}</td>
                  <td>
                    <span class="badge" :class="lr.status === 'approved' ? 'badge-green' : lr.status === 'rejected' ? 'badge-red' : lr.status === 'cancelled' ? 'badge-gray' : 'badge-yellow'">
                      {{ lr.status || 'pending' }}
                    </span>
                  </td>
                  <td class="text-xs" style="color: #6b7280">{{ lr.approved_by_name || '—' }}</td>
                  <td>
                    <div v-if="lr.status === 'pending'" class="flex gap-1">
                      <button @click="handleLeave(lr.id, 'approved')" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(16,185,129,0.1); color: #34d399" title="Approve">
                        <i class="fas fa-check text-xs"></i>
                      </button>
                      <button @click="handleLeave(lr.id, 'rejected')" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style="background: rgba(239,68,68,0.1); color: #f87171" title="Reject">
                        <i class="fas fa-times text-xs"></i>
                      </button>
                    </div>
                    <span v-else class="text-xs" style="color: #6b7280">—</span>
                  </td>
                </tr>
                <tr v-if="!leaveRequests.length">
                  <td colspan="10" class="text-center py-10" style="color: #6b7280">
                    <i class="fas fa-calendar-minus text-3xl mb-3 block" style="color: #1e1e2a"></i>
                    No leave requests
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== ADD STAFF MODAL ===================== -->
    <div v-if="showAddStaffModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showAddStaffModal = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white"><i class="fas fa-user-plus mr-2" style="color: #FF7A30"></i>Add Staff Member</h3>
          <button @click="showAddStaffModal = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Full Name *</label>
            <input v-model="staffForm.name" type="text" class="form-input" placeholder="John Doe">
          </div>
          <div>
            <label class="form-label">Email *</label>
            <input v-model="staffForm.email" type="email" class="form-input" placeholder="john@hotbando.com">
          </div>
          <div>
            <label class="form-label">Phone *</label>
            <input v-model="staffForm.phone" type="text" class="form-input" placeholder="+255...">
          </div>
          <div>
            <label class="form-label">Employee ID *</label>
            <input v-model="staffForm.employee_id" type="text" class="form-input" placeholder="e.g. EMP-001">
          </div>
          <div>
            <label class="form-label">Department *</label>
            <input v-model="staffForm.department" type="text" class="form-input" placeholder="e.g. Operations">
          </div>
          <div>
            <label class="form-label">Job Title *</label>
            <input v-model="staffForm.job_title" type="text" class="form-input" placeholder="e.g. Manager">
          </div>
          <div>
            <label class="form-label">Branch *</label>
            <select v-model="staffForm.branch_id" class="form-input">
              <option value="">Select branch</option>
              <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">Hire Date *</label>
            <input v-model="staffForm.hire_date" type="date" class="form-input">
          </div>
          <div>
            <label class="form-label">Salary</label>
            <input v-model.number="staffForm.salary" type="number" class="form-input" placeholder="0">
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="showAddStaffModal = false" class="btn btn-secondary flex-1">Cancel</button>
          <button @click="createStaff" class="btn btn-primary flex-1" :disabled="submitting">{{ submitting ? '...' : 'Add Staff' }}</button>
        </div>
      </div>
    </div>

    <!-- ===================== EDIT STAFF MODAL ===================== -->
    <div v-if="showEditStaffModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showEditStaffModal = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white"><i class="fas fa-user-edit mr-2" style="color: #FF7A30"></i>Edit Staff Member</h3>
          <button @click="showEditStaffModal = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Full Name</label>
            <input v-model="editStaffForm.name" type="text" class="form-input">
          </div>
          <div>
            <label class="form-label">Email</label>
            <input v-model="editStaffForm.email" type="email" class="form-input">
          </div>
          <div>
            <label class="form-label">Phone</label>
            <input v-model="editStaffForm.phone" type="text" class="form-input">
          </div>
          <div>
            <label class="form-label">Department</label>
            <input v-model="editStaffForm.department" type="text" class="form-input">
          </div>
          <div>
            <label class="form-label">Job Title</label>
            <input v-model="editStaffForm.job_title" type="text" class="form-input">
          </div>
          <div>
            <label class="form-label">Branch</label>
            <select v-model="editStaffForm.branch_id" class="form-input">
              <option value="">Select branch</option>
              <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">Salary</label>
            <input v-model.number="editStaffForm.salary" type="number" class="form-input">
          </div>
          <div>
            <label class="form-label">Active</label>
            <select v-model="editStaffForm.is_active" class="form-input">
              <option :value="true">Active</option>
              <option :value="false">Inactive</option>
            </select>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="showEditStaffModal = false" class="btn btn-secondary flex-1">Cancel</button>
          <button @click="updateStaff" class="btn btn-primary flex-1" :disabled="submitting">{{ submitting ? '...' : 'Save Changes' }}</button>
        </div>
      </div>
    </div>

    <!-- ===================== STAFF DETAIL MODAL ===================== -->
    <div v-if="detailStaff" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="detailStaff = null">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-lg rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white">Staff Details</h3>
          <button @click="detailStaff = null" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0" :style="'background:' + avatarColor(detailStaff.name)">
            {{ (detailStaff.name || 'S').charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="text-xl font-bold text-white">{{ detailStaff.name }}</p>
            <p class="text-sm" style="color: #6b7280">{{ detailStaff.job_title || '—' }} &middot; {{ detailStaff.department || '—' }}</p>
            <span class="badge mt-1" :class="detailStaff.status === 'active' ? 'badge-green' : detailStaff.status === 'on_leave' ? 'badge-yellow' : detailStaff.status === 'suspended' ? 'badge-red' : 'badge-gray'">
              {{ formatStatus(detailStaff.status) }}
            </span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Employee ID</p>
            <p class="text-sm font-medium text-white mt-1 font-mono">{{ detailStaff.employee_id || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Branch</p>
            <p class="text-sm font-medium text-white mt-1">{{ detailStaff.branch_name || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">District</p>
            <p class="text-sm font-medium text-white mt-1">{{ detailStaff.district_name || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Region</p>
            <p class="text-sm font-medium text-white mt-1">{{ detailStaff.region_name || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Employment Type</p>
            <p class="text-sm font-medium text-white mt-1">{{ formatEmploymentType(detailStaff.employment_type) }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Hire Date</p>
            <p class="text-sm font-medium text-white mt-1">{{ formatDate(detailStaff.hire_date) }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Contract End</p>
            <p class="text-sm font-medium text-white mt-1">{{ formatDate(detailStaff.contract_end_date) }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Salary</p>
            <p class="text-sm font-medium text-white mt-1">{{ detailStaff.currency || 'TSh' }} {{ (detailStaff.salary || 0).toLocaleString() }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Phone</p>
            <p class="text-sm font-medium text-white mt-1">{{ detailStaff.phone_number || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Email</p>
            <p class="text-sm font-medium text-white mt-1">{{ detailStaff.email || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Bank Name</p>
            <p class="text-sm font-medium text-white mt-1">{{ detailStaff.bank_name || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Bank Account</p>
            <p class="text-sm font-medium text-white mt-1 font-mono">{{ detailStaff.bank_account_number || '—' }}</p>
          </div>
          <div class="p-3 rounded-xl sm:col-span-2" style="background: #0d0d14">
            <p class="text-xs" style="color: #6b7280">Emergency Contact</p>
            <p class="text-sm font-medium text-white mt-1">{{ detailStaff.emergency_contact_name || '—' }} {{ detailStaff.emergency_contact_phone ? '(' + detailStaff.emergency_contact_phone + ')' : '' }}</p>
          </div>
        </div>
        <button @click="detailStaff = null" class="btn btn-secondary w-full mt-4">Close</button>
      </div>
    </div>

    <!-- ===================== MARK ATTENDANCE MODAL ===================== -->
    <div v-if="showMarkAttendanceModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showMarkAttendanceModal = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative w-full max-w-md rounded-2xl p-6" style="background: #111118; border: 1px solid #1e1e2a">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white"><i class="fas fa-fingerprint mr-2" style="color: #FF7A30"></i>Mark Attendance</h3>
          <button @click="showMarkAttendanceModal = false" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #1a1a24; color: #6b7280"><i class="fas fa-times"></i></button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="form-label">Staff Member *</label>
            <select v-model="attendanceForm.staff_id" class="form-input">
              <option value="">Select staff</option>
              <option v-for="s in allStaff" :key="s.id" :value="s.id">{{ s.name }}{{ s.employee_id ? ' (' + s.employee_id + ')' : '' }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">Date *</label>
            <input v-model="attendanceForm.date" type="date" class="form-input">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Check In</label>
              <input v-model="attendanceForm.check_in" type="time" class="form-input">
            </div>
            <div>
              <label class="form-label">Check Out</label>
              <input v-model="attendanceForm.check_out" type="time" class="form-input">
            </div>
          </div>
          <div>
            <label class="form-label">Status *</label>
            <select v-model="attendanceForm.status" class="form-input">
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
          <div>
            <label class="form-label">Notes</label>
            <textarea v-model="attendanceForm.notes" class="form-input" rows="2" placeholder="Optional notes..."></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="showMarkAttendanceModal = false" class="btn btn-secondary flex-1">Cancel</button>
          <button @click="markAttendance" class="btn btn-primary flex-1" :disabled="submitting">{{ submitting ? '...' : 'Mark' }}</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slideIn" :style="toast.type === 'success' ? 'background: rgba(16,185,129,0.9); color: #fff' : 'background: rgba(239,68,68,0.9); color: #fff'">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { adminGet, adminPost, adminPut } from '../../api/client'

const tabs = [
  { key: 'staff', label: 'Staff List', icon: 'fas fa-users' },
  { key: 'attendance', label: 'Attendance', icon: 'fas fa-fingerprint' },
  { key: 'leave', label: 'Leave Requests', icon: 'fas fa-calendar-minus' }
]

const activeTab = ref('staff')
const loading = ref(true)
const submitting = ref(false)
const toast = ref(null)
const branches = ref([])
const departments = ref([])

const staffList = ref([])
const staffStats = ref({})
const staffSearch = ref('')
const staffDeptFilter = ref('')
const staffBranchFilter = ref('')

const attendance = ref([])
const attDateFrom = ref('')
const attDateTo = ref(new Date().toISOString().slice(0, 10))
const attBranchFilter = ref('')

const leaveRequests = ref([])
const leaveStats = ref({})
const leaveStatusFilter = ref('')

const showAddStaffModal = ref(false)
const showEditStaffModal = ref(false)
const showMarkAttendanceModal = ref(false)
const detailStaff = ref(null)

const staffForm = reactive({
  name: '', email: '', phone: '', employee_id: '', department: '',
  job_title: '', branch_id: '', hire_date: '', salary: 0
})
const editStaffForm = reactive({
  id: null, name: '', email: '', phone: '', department: '',
  job_title: '', branch_id: '', salary: 0, is_active: true
})
const attendanceForm = reactive({
  staff_id: '', date: new Date().toISOString().slice(0, 10),
  check_in: '', check_out: '', status: 'present', notes: ''
})

const allStaff = ref([])
let searchTimer = null

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(t) {
  if (!t) return '—'
  try {
    const d = new Date(t)
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch { return t }
}

function avatarColor(name) {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function formatStatus(status) {
  const map = { active: 'Active', on_leave: 'On Leave', terminated: 'Terminated', suspended: 'Suspended' }
  return map[status] || status || '—'
}

function formatEmploymentType(type) {
  const map = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', intern: 'Intern' }
  return map[type] || type || '—'
}

function formatLeaveType(type) {
  const map = { annual: 'Annual', sick: 'Sick', maternity: 'Maternity', paternity: 'Paternity', compassionate: 'Compassionate', unpaid: 'Unpaid', other: 'Other' }
  return map[type] || type || '—'
}

function formatAttStatus(status) {
  const map = { present: 'Present', absent: 'Absent', late: 'Late', half_day: 'Half Day', on_leave: 'On Leave' }
  return map[status] || status || '—'
}

function attStatusClass(status) {
  const map = { present: 'badge-green', late: 'badge-yellow', absent: 'badge-red', half_day: 'badge-blue', on_leave: 'badge-gray' }
  return map[status] || 'badge-gray'
}

function debouncedLoadStaff() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadStaff(), 300)
}

onMounted(async () => {
  await loadBranches()
  refreshAll()
})

async function loadBranches() {
  try {
    const r = await adminGet('/hq/branches')
    branches.value = r.data?.branches || r.branches || r || []
  } catch (e) { console.error(e) }
}

async function refreshAll() {
  loading.value = true
  await Promise.all([loadStaff(), loadAttendance(), loadLeaveRequests(), loadAllStaff()])
  departments.value = [...new Set(staffList.value.map(s => s.department).filter(Boolean))]
  loading.value = false
}

async function loadStaff() {
  try {
    const params = new URLSearchParams()
    if (staffSearch.value) params.set('search', staffSearch.value)
    if (staffDeptFilter.value) params.set('department', staffDeptFilter.value)
    if (staffBranchFilter.value) params.set('branch_id', staffBranchFilter.value)
    const qs = params.toString() ? `?${params}` : ''
    const r = await adminGet(`/hq/staff${qs}`)
    staffList.value = r.data?.staff || r.staff || r || []
    const list = staffList.value
    staffStats.value = {
      total: r.data?.total || r.total || list.length,
      active: list.filter(s => s.status === 'active').length,
      on_leave: list.filter(s => s.status === 'on_leave').length,
      departments: new Set(list.map(s => s.department).filter(Boolean)).size
    }
  } catch (e) {
    console.error(e)
    showToast('Failed to load staff', 'error')
  }
}

async function loadAllStaff() {
  try {
    const r = await adminGet('/hq/staff?limit=1000')
    allStaff.value = r.data?.staff || r.staff || r || []
  } catch (e) { console.error(e) }
}

async function loadAttendance() {
  try {
    const params = new URLSearchParams()
    if (attDateFrom.value) params.set('date_from', attDateFrom.value)
    if (attDateTo.value) params.set('date_to', attDateTo.value)
    if (attBranchFilter.value) params.set('branch_id', attBranchFilter.value)
    const qs = params.toString() ? `?${params}` : ''
    const r = await adminGet(`/hq/attendance${qs}`)
    attendance.value = r.data?.attendance || r.attendance || r || []
  } catch (e) {
    console.error(e)
    showToast('Failed to load attendance', 'error')
  }
}

async function loadLeaveRequests() {
  try {
    const params = new URLSearchParams()
    if (leaveStatusFilter.value) params.set('status', leaveStatusFilter.value)
    const qs = params.toString() ? `?${params}` : ''
    const r = await adminGet(`/hq/leave-requests${qs}`)
    leaveRequests.value = r.data?.requests || r.requests || r || []
    const list = leaveRequests.value
    leaveStats.value = {
      pending: list.filter(l => l.status === 'pending').length,
      approved: list.filter(l => l.status === 'approved').length,
      rejected: list.filter(l => l.status === 'rejected').length
    }
  } catch (e) {
    console.error(e)
    showToast('Failed to load leave requests', 'error')
  }
}

function openStaffDetail(s) {
  detailStaff.value = { ...s }
}

function openEditStaffModal(s) {
  Object.assign(editStaffForm, {
    id: s.id, name: s.name, email: s.email, phone: s.phone_number || s.phone,
    department: s.department, job_title: s.job_title,
    branch_id: s.branch_id, salary: s.salary,
    is_active: s.user_active !== undefined ? s.user_active : s.status === 'active'
  })
  showEditStaffModal.value = true
}

async function createStaff() {
  if (!staffForm.name || !staffForm.email || !staffForm.phone || !staffForm.employee_id || !staffForm.department || !staffForm.job_title || !staffForm.branch_id || !staffForm.hire_date) {
    showToast('Please fill all required fields', 'error'); return
  }
  submitting.value = true
  try {
    await adminPost('/hq/staff', { ...staffForm })
    showAddStaffModal.value = false
    Object.assign(staffForm, { name: '', email: '', phone: '', employee_id: '', department: '', job_title: '', branch_id: '', hire_date: '', salary: 0 })
    await refreshAll()
    showToast('Staff member added')
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to add staff', 'error')
  } finally { submitting.value = false }
}

async function updateStaff() {
  if (!editStaffForm.id) return
  submitting.value = true
  try {
    await adminPut(`/hq/staff/${editStaffForm.id}`, {
      name: editStaffForm.name,
      email: editStaffForm.email,
      phone: editStaffForm.phone,
      branch_id: editStaffForm.branch_id,
      department: editStaffForm.department,
      job_title: editStaffForm.job_title,
      salary: editStaffForm.salary,
      is_active: editStaffForm.is_active
    })
    showEditStaffModal.value = false
    await refreshAll()
    showToast('Staff updated')
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to update staff', 'error')
  } finally { submitting.value = false }
}

async function markAttendance() {
  if (!attendanceForm.staff_id || !attendanceForm.date || !attendanceForm.status) {
    showToast('Please fill all required fields', 'error'); return
  }
  submitting.value = true
  try {
    await adminPost('/hq/attendance', {
      staff_id: attendanceForm.staff_id,
      date: attendanceForm.date,
      status: attendanceForm.status,
      check_in: attendanceForm.check_in || null,
      check_out: attendanceForm.check_out || null,
      notes: attendanceForm.notes || null
    })
    showMarkAttendanceModal.value = false
    Object.assign(attendanceForm, { staff_id: '', date: new Date().toISOString().slice(0, 10), check_in: '', check_out: '', status: 'present', notes: '' })
    await loadAttendance()
    showToast('Attendance marked')
  } catch (e) {
    showToast(e.response?.data?.error || 'Failed to mark attendance', 'error')
  } finally { submitting.value = false }
}

async function handleLeave(id, status) {
  try {
    await adminPut(`/hq/leave-requests/${id}`, { status, notes: null })
    await loadLeaveRequests()
    showToast(`Leave request ${status}`)
  } catch (e) {
    showToast('Failed to update leave request', 'error')
  }
}
</script>
