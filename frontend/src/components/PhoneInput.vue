<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1">{{ label }}</label>
    <div class="flex">
      <select v-model="selectedCode" class="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-28">
        <option v-for="c in countries" :key="c.code" :value="c">{{ c.flag }} {{ c.code }} ({{ c.prefix }})</option>
      </select>
      <input
        v-model="digits"
        type="tel"
        required
        :maxlength="maxDigits"
        class="input-field rounded-l-none flex-1"
        :placeholder="placeholder"
        @input="onInput"
      >
    </div>
    <p class="text-xs text-gray-400 mt-1">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  label: { type: String, default: 'Namba ya Simu' },
  placeholder: { type: String, default: '7XXXXXXXX' },
  hint: { type: String, default: 'Weka namba bila 0 au +' },
  maxDigits: { type: Number, default: 9 },
  countryCode: { type: String, default: 'TZ' }
})

const emit = defineEmits(['change'])

const countries = [
  { flag: '🇹🇿', code: 'TZ', prefix: '+255' },
  { flag: '🇰🇪', code: 'KE', prefix: '+254' },
  { flag: '🇺🇬', code: 'UG', prefix: '+256' },
  { flag: '🇷🇼', code: 'RW', prefix: '+250' },
  { flag: '🇧🇮', code: 'BI', prefix: '+257' },
  { flag: '🇨🇩', code: 'CD', prefix: '+243' },
  { flag: '🇿🇲', code: 'ZM', prefix: '+260' },
  { flag: '🇲🇼', code: 'MW', prefix: '+265' },
  { flag: '🇲🇿', code: 'MZ', prefix: '+258' },
  { flag: '🇿🇦', code: 'ZA', prefix: '+27' },
  { flag: '🇪🇹', code: 'ET', prefix: '+251' },
  { flag: '🇸🇴', code: 'SO', prefix: '+252' },
  { flag: '🇸🇸', code: 'SS', prefix: '+211' },
  { flag: '🇸🇩', code: 'SD', prefix: '+249' },
  { flag: '🇩🇯', code: 'DJ', prefix: '+253' },
  { flag: '🇪🇷', code: 'ER', prefix: '+291' },
  { flag: '🇳🇦', code: 'NA', prefix: '+264' },
  { flag: '🇧🇼', code: 'BW', prefix: '+267' },
  { flag: '🇿🇼', code: 'ZW', prefix: '+263' },
  { flag: '🇦🇴', code: 'AO', prefix: '+244' },
  { flag: '🇲🇬', code: 'MG', prefix: '+261' },
  { flag: '🇹🇩', code: 'TD', prefix: '+235' },
  { flag: '🇨🇲', code: 'CM', prefix: '+237' },
  { flag: '🇳🇬', code: 'NG', prefix: '+234' },
  { flag: '🇬🇭', code: 'GH', prefix: '+233' },
]

const defaultCountry = countries.find(c => c.code === props.countryCode) || countries[0]
const selectedCode = ref(defaultCountry)
const digits = ref('')

function getFullNumber() {
  return selectedCode.value.prefix + digits.value
}

function onInput() {
  digits.value = digits.value.replace(/\D/g, '').slice(0, props.maxDigits)
  emit('change', getFullNumber())
}

watch(selectedCode, () => {
  emit('change', getFullNumber())
})

function reset() {
  digits.value = ''
  selectedCode.value = defaultCountry
}

defineExpose({ reset })
</script>
