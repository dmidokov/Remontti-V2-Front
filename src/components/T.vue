<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from '../composables/useTranslation'

const props = defineProps<{
  k: string
  tag?: string
}>()

const { t } = useTranslation()

const translatedText = computed(() => t(props.k, ''))
</script>

<template>
  <component :is="tag || 'span'" :data-t-key="k">{{ translatedText }}</component>
</template>
