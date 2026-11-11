<script setup lang="ts">
/**
 * 斜切风格的整页容器：提供与首页一致的配色和最大宽度。
 * 用在 pageLayout: page 的 Markdown 页面里，里面放 SlantHero / SlantRow / SlantCell。
 *
 *   <SlantPage>
 *   ...
 *   </SlantPage>
 *
 * 背景默认是全站的分形背景（components/fractal）。
 * 写了 background（bg-main / bg-cube / 图片地址）时，改用这张图盖住分形，图片固定在窗口上。
 */
import { computed } from 'vue'
import { resolveImage } from '../home/useHomeData'

const props = defineProps<{ background?: string }>()
const bg = computed(() => (props.background ? `url(${resolveImage(props.background, '')})` : ''))
</script>

<template>
  <div class="sl-scope sl-page-wrap" :style="bg ? { '--bg-img': bg } : undefined">
    <div v-if="bg" class="sl-backdrop" aria-hidden="true" />
    <div class="sl-stage">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.sl-page-wrap {
  position: relative;
  color: var(--sl-fg);
}
/* 固定在窗口上（以前是铺满整页，页面很长时 cover 会把图放得很大） */
.sl-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
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
