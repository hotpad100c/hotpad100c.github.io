<script setup lang="ts">
/**
 * 斜切页面的首屏：左边是 Markdown 正文（插槽），右边是斜切窗口。
 *
 *   <SlantHero label="关于" image="/about/pfp.png">
 *
 *   # 你好，我是 Ryan100c
 *
 *   正文……
 *
 *   </SlantHero>
 *
 * image：窗口里的前景图（透明 PNG 效果最好），可选
 * cover：窗口的背景图，可选，默认 bg-cube
 */
import { computed } from 'vue'
import { withBase } from 'vuepress/client'
import { bgCube } from '../home/useHomeData'

const props = defineProps<{ label?: string, image?: string, cover?: string }>()
const resolve = (src?: string) => (!src ? '' : src.startsWith('/') ? withBase(src) : src)
const coverImg = computed(() => `url(${resolve(props.cover) || bgCube})`)
</script>

<template>
  <header class="sl-hero">
    <div class="sl-hero-text">
      <p v-if="label" class="sl-label">{{ label }}</p>
      <slot />
    </div>
    <div class="sl-window" :style="{ '--cover-img': coverImg }" aria-hidden="true">
      <div class="sl-window-bg" />
      <img v-if="image" :src="resolve(image)" alt="" class="sl-window-fg">
    </div>
  </header>
</template>

<style scoped>
.sl-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  align-items: center;
  padding-bottom: 12px;
}
.sl-hero-text { min-width: 0; }
.sl-hero-text :deep(h1) {
  font-family: var(--sl-display);
  font-size: clamp(40px, 5.4vw, 72px) !important;
  line-height: 1.1;
  margin: 8px 0 18px;
  padding: 0;
  border: none;
  color: var(--sl-fg);
}
.sl-hero-text :deep(h1 em) { font-style: italic; color: var(--sl-accent); }
.sl-hero-text :deep(p) { color: var(--sl-fg-2); line-height: 1.9; margin: 0 0 12px; }
.sl-hero-text :deep(strong) { color: var(--sl-fg); }

.sl-window {
  position: relative;
  aspect-ratio: 16 / 10;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid var(--sl-line);
  box-shadow: 16px 16px 0 rgba(181, 156, 242, 0.08);
  transform: skewX(var(--sl-skew));
}
.sl-window-bg {
  position: absolute;
  inset: 0;
  background: var(--cover-img) center 42% / cover no-repeat;
  transform: skewX(var(--sl-unskew)) scale(1.2);
  filter: brightness(0.7);
}
.sl-window-fg {
  position: absolute;
  left: 50%;
  bottom: 0;
  height: 92%;
  width: auto;
  max-width: none;
  transform: translateX(-50%) skewX(var(--sl-unskew));
  filter: drop-shadow(0 12px 30px rgba(0, 0, 0, 0.5));
}

@media (min-width: 960px) {
  .sl-hero { grid-template-columns: minmax(0, 6fr) minmax(0, 5fr); gap: 48px; }
  .sl-window { aspect-ratio: auto; height: clamp(300px, 46vh, 440px); }
}
</style>
