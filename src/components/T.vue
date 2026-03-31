<script setup>
import { computed } from 'vue'
import { useTranslation } from '../composables/useTranslation'

const props = defineProps({
  k: {
    type: String,
    required: true,
  },
  tag: {
    type: String,
    default: 'span',
  },
})

const { t } = useTranslation()

const translatedText = computed(() => t(props.k))
</script>

<template>
  <component :is="tag" :data-t-key="k">{{ translatedText }}</component>
</template>
