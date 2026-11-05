<script setup lang="ts">
/**
 * 一行格子。横屏下是 12 列网格，里面放 SlantCell，用 span 指定每格占几列。
 *
 * kind：
 *   slant  —— 斜切（/）
 *   rev    —— 反向斜切（\）
 *   square —— 方正面板（1px 发丝线）
 *
 * 规则：方正行上下两侧的斜切行，方向必须相反。
 *   例：SlantHero（窗口是 /） → square → rev → square → slant …
 */
import { provide } from 'vue'

const props = withDefaults(defineProps<{ kind?: 'slant' | 'rev' | 'square' }>(), { kind: 'slant' })
provide('slantKind', props.kind)
</script>

<template>
  <div class="sl-row" :class="`sl-row-${kind}`">
    <slot />
  </div>
</template>

<style scoped>
.sl-row {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  align-items: stretch;
}
.sl-row-slant, .sl-row-rev { gap: 14px; padding-inline: 10px; }
.sl-row-square {
  gap: 1px;
  background: var(--sl-line);
  border: 1px solid var(--sl-line);
}
</style>
