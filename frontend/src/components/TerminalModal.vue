<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 flex items-center justify-center z-[9999] p-4" style="background: rgba(0,0,0,0.8)" @click.self="$emit('close')">
      <div class="w-full max-w-2xl section-card overflow-hidden" style="border: 1px solid rgba(255,122,48,0.3)">
        <!-- Title bar -->
        <div class="flex items-center justify-between px-4 py-3" style="background: #111118; border-bottom: 1px solid var(--border)">
          <div class="flex items-center gap-3">
            <div class="flex gap-1.5">
              <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span class="text-sm font-semibold text-white">{{ title }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="running" class="flex items-center gap-1.5 text-xs" style="color: #FF7A30">
              <span class="w-1.5 h-1.5 rounded-full bg-[#FF7A30] animate-pulse"></span>
              Running...
            </span>
            <span v-else-if="success" class="flex items-center gap-1.5 text-xs" style="color: #34d399">
              <i class="fas fa-check-circle"></i> Done
            </span>
            <span v-else-if="error" class="flex items-center gap-1.5 text-xs" style="color: #f87171">
              <i class="fas fa-times-circle"></i> Error
            </span>
            <button @click="$emit('close')" class="p-1 rounded transition-colors" style="color: #6b7280">
              <i class="fas fa-times hover:text-white"></i>
            </button>
          </div>
        </div>

        <!-- Progress bar -->
        <div v-if="progress" class="px-4 py-2" style="background: #0d0d14; border-bottom: 1px solid var(--border)">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium" style="color: #9ca3af">{{ progress.label || 'Working...' }}</span>
            <span class="text-xs font-mono" style="color: #6b7280">{{ progress.step }}/{{ progress.total }}</span>
          </div>
          <div class="h-1.5 rounded-full overflow-hidden" style="background: #1e1e2a">
            <div class="h-full rounded-full transition-all duration-500 ease-out"
              :style="{ width: ((progress.step / progress.total) * 100) + '%', background: 'linear-gradient(90deg, #FF7A30, #ea6a24)' }"></div>
          </div>
        </div>

        <!-- Terminal output -->
        <div ref="terminalBody" class="p-4 overflow-y-auto font-mono text-xs leading-relaxed" style="background: #0a0a0f; height: 360px; max-height: 50vh">
          <div v-if="lines.length === 0 && running" class="flex items-center gap-2" style="color: #6b7280">
            <i class="fas fa-circle-notch fa-spin" style="color: #FF7A30"></i>
            <span>Initializing...</span>
          </div>
          <p v-for="(line, i) in lines" :key="i" class="py-0.5 whitespace-pre-wrap" :style="lineStyle(line.type)">
            <span v-if="line.type === 'success'" style="color: #34d399">&#10003;</span>
            <span v-else-if="line.type === 'error'" style="color: #f87171">&#10007;</span>
            <span v-else-if="line.type === 'warn'" style="color: #fbbf24">!</span>
            <span v-else style="color: #4b5563">&gt;</span>
            {{ line.message }}
            <span v-if="line.time" class="ml-2" style="color: #374151">{{ formatTime(line.time) }}</span>
          </p>
          <div v-if="running" class="flex items-center gap-1 mt-1">
            <span style="color: #FF7A30">$</span>
            <span class="animate-pulse" style="color: #FF7A30">_</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-4 py-3" style="background: #111118; border-top: 1px solid var(--border)">
          <span class="text-xs" style="color: #6b7280">{{ lines.length }} lines</span>
          <div class="flex gap-2">
            <button v-if="success || error" @click="$emit('close')" class="btn btn-primary btn-sm">
              {{ success ? 'Done' : 'Close' }}
            </button>
            <button v-if="running" @click="$emit('cancel')" class="btn btn-secondary btn-sm" style="color: #f87171">
              <i class="fas fa-stop mr-1"></i> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Terminal' },
  running: { type: Boolean, default: false },
  success: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  progress: { type: Object, default: null },
  lines: { type: Array, default: () => [] }
})

defineEmits(['close', 'cancel'])

const terminalBody = ref(null)

function lineStyle(type) {
  if (type === 'success') return 'color: #34d399'
  if (type === 'error') return 'color: #f87171'
  if (type === 'warn') return 'color: #fbbf24'
  return 'color: #9ca3af'
}

function formatTime(t) {
  try { return new Date(t).toLocaleTimeString() } catch { return '' }
}

watch(() => props.lines.length, async () => {
  await nextTick()
  if (terminalBody.value) {
    terminalBody.value.scrollTop = terminalBody.value.scrollHeight
  }
})
</script>
