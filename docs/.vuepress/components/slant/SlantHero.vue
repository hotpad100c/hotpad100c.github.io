<script setup lang="ts">
/**
 * 斜切页面的首屏：左边是 Markdown 正文（插槽），右边是斜切窗口。
 *
 *   <SlantHero label="关于" image="/about/pfp.png" cover="bg-main" image-x="49.95" image-y="47.6" image-size="15.8">
 *
 *   # 你好，我是 Ryan100c
 *
 *   正文……
 *
 *   </SlantHero>
 *
 * cover：窗口的背景图，可选，默认 bg-cube；可以写 bg-main / bg-cube 或图片地址
 * image：窗口里的前景图（透明 PNG 效果最好），可选
 *
 * 前景图的位置：
 *   不写 image-size 时，前景图贴着窗口底部、水平居中，高度为窗口的 92%。
 *   写了 image-size 时为「锚定」模式：前景图钉在背景图上的某一点，窗口怎么裁切都跟着背景图走，
 *   适合要把头像放进背景图里某个框的情况。
 *     image-x / image-y：前景图中心在背景图上的位置（百分比，默认 50 / 50）
 *     image-size：前景图宽度占背景图宽度的百分比
 */
import { computed, onMounted, ref } from 'vue'
import { bgCube, resolveImage } from '../home/useHomeData'

const props = defineProps<{
  label?: string
  image?: string
  cover?: string
  imageX?: number | string
  imageY?: number | string
  imageSize?: number | string
}>()
const coverSrc = computed(() => resolveImage(props.cover, bgCube))
const coverImg = computed(() => `url(${coverSrc.value})`)
const imageSrc = computed(() => (props.image ? resolveImage(props.image, '') : ''))
const anchored = computed(() => props.imageSize !== undefined && props.imageSize !== '')

// 锚定模式需要背景图的宽高比，加载后读取（读到之前按 16:9）
const ratio = ref(16 / 9)
onMounted(() => {
  if (!anchored.value) return
  const img = new Image()
  img.onload = () => { if (img.naturalWidth && img.naturalHeight) ratio.value = img.naturalWidth / img.naturalHeight }
  img.src = coverSrc.value
})
const fgStyle = computed(() => ({
  left: `${Number(props.imageX ?? 50)}%`,
  top: `${Number(props.imageY ?? 50)}%`,
  width: `${Number(props.imageSize)}%`,
}))
</script>

<template>
  <header class="sl-hero">
    <div class="sl-hero-text">
      <p v-if="label" class="sl-label">{{ label }}</p>
      <slot />
    </div>
    <div class="sl-window" :class="{ 'sl-window-anchored': anchored }" :style="{ '--cover-img': coverImg, '--ratio': ratio }" aria-hidden="true">
      <div v-if="anchored" class="sl-scene">
        <img v-if="imageSrc" :src="imageSrc" alt="" class="sl-scene-fg" :style="fgStyle">
      </div>
      <template v-else>
        <div class="sl-window-bg" />
        <img v-if="imageSrc" :src="imageSrc" alt="" class="sl-window-fg">
      </template>
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
/* 锚定模式：背景图和前景图放在同一个「场景」里。场景保持背景图的宽高比，像 cover 一样铺满窗口，
   前景图的位置和大小都是场景的百分比，所以窗口怎么裁切，前景图都停在背景图的同一位置。 */
.sl-window-anchored { container-type: size; }
.sl-scene {
  position: absolute;
  left: 50%;
  top: 50%;
  width: max(100cqw, 100cqh * var(--ratio));
  aspect-ratio: var(--ratio);
  background: var(--cover-img) center / 100% 100% no-repeat;
  transform: translate(-50%, -50%) skewX(var(--sl-unskew)) scale(1.2);
}
.sl-scene-fg {
  position: absolute;
  height: auto;
  max-width: none;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.6));
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
