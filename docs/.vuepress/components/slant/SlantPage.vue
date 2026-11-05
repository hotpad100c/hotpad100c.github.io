<script setup lang="ts">
/**
 * 斜切风格的整页容器：提供与首页一致的配色、模糊背景图和最大宽度。
 * 用在 pageLayout: page 的 Markdown 页面里，里面放 SlantHero / SlantRow / SlantCell。
 *
 *   <SlantPage background="/images/xxx.jpg">   （background 可选，默认 bg-cube）
 *   ...
 *   </SlantPage>
 */
import { computed } from 'vue'
import { withBase } from 'vuepress/client'
import { bgCube } from '../home/useHomeData'

const props = defineProps<{ background?: string }>()
const bg = computed(() => {
  const src = props.background
  return `url(${!src ? bgCube : src.startsWith('/') ? withBase(src) : src})`
})
</script>

<template>
  <div class="sl-scope sl-page-wrap" :style="{ '--bg-img': bg }">
    <div class="sl-backdrop" aria-hidden="true" />
    <div class="sl-stage">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.sl-page-wrap {
  position: relative;
  overflow: hidden;
  background: var(--sl-bg);
  color: var(--sl-fg);
}
.sl-backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, var(--sl-veil-1), var(--sl-veil-2) 40%, var(--sl-bg) 85%),
    var(--bg-img) center top / cover no-repeat;
  filter: blur(2px);
  transform: scale(1.03);
}
.sl-stage {
  position: relative;
  max-width: 1280px;
  margin: 0 auto;
  padding: 40px max(36px, 4vw) 56px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
@media (max-width: 560px) {
  .sl-stage { padding: 24px 24px 40px; gap: 14px; }
}
</style>
