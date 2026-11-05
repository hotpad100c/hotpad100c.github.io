<script setup lang="ts">
/**
 * 一个格子，形状跟随所在的 SlantRow（斜切 / 反向斜切 / 方正）。内容写 Markdown（插槽）。
 *
 *   <SlantCell span="6" label="02" title="爱好" image="/about/xxx.png" href="https://…">
 *
 *   Markdown 正文……
 *
 *   </SlantCell>
 *
 * span：横屏下占 12 列中的几列（默认 12）。平板上 ≤6 的格子占半行，手机上都占整行。
 * label / title：左上角的小标签和标题，都可选。
 * image：顶部配图，可选。站内图片放在 docs/.vuepress/public/ 下，用 / 开头引用。
 * fit：配图的显示方式。cover（默认）裁切铺满；contain 完整显示，背景固定为深色
 *      （适合透明底、白色文字的截图）。
 * max-height：正文最大高度（像素），超出部分在格子里滚动。适合很长的图片或表格。
 * href：整格变成链接。/ 开头为站内链接，其它在新标签页打开。
 *       有 href 时正文里不要再放链接（链接不能嵌套）。
 */
import { computed, inject } from 'vue'
import { RouteLink, withBase } from 'vuepress/client'

const props = withDefaults(defineProps<{
  span?: number | string
  label?: string
  title?: string
  image?: string
  fit?: 'cover' | 'contain'
  maxHeight?: number | string
  href?: string
}>(), { span: 12, fit: 'cover' })

const kind = inject<string>('slantKind', 'slant')
const isInternal = computed(() => !!props.href && props.href.startsWith('/'))
const imgSrc = computed(() => (!props.image ? '' : props.image.startsWith('/') ? withBase(props.image) : props.image))
const spanN = computed(() => Math.min(12, Math.max(1, Number(props.span) || 12)))
</script>

<template>
  <component
    :is="href ? (isInternal ? RouteLink : 'a') : 'section'"
    v-bind="href ? (isInternal ? { to: href } : { href, target: '_blank', rel: 'noopener' }) : {}"
    class="sl-cell"
    :class="[`sl-cell-${kind}`, { 'sl-cell-link': href, 'sl-cell-half': spanN <= 6 }]"
    :style="{ '--span': spanN }"
  >
    <div class="sl-in">
      <div v-if="imgSrc" class="sl-media" :class="`sl-media-${fit}`">
        <img :src="imgSrc" :alt="title || ''" loading="lazy">
      </div>
      <div class="sl-body">
        <p v-if="label || title" class="sl-head">
          <span v-if="label" class="sl-label">{{ label }}</span>
          <strong v-if="title">{{ title }}</strong>
        </p>
        <div class="sl-content" :class="{ 'sl-content-scroll': maxHeight }" :style="maxHeight ? { maxHeight: `${maxHeight}px` } : undefined"><slot /></div>
      </div>
      <span v-if="href" class="sl-arrow" aria-hidden="true">↗</span>
    </div>
  </component>
</template>

<style scoped>
.sl-cell {
  grid-column: span var(--span);
  position: relative;
  min-width: 0;
  overflow: hidden;
  color: var(--sl-fg);
  text-decoration: none !important;
  transition: background 0.2s, border-color 0.2s;
}
.sl-in { position: relative; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; }
.sl-body { padding: 18px 24px 20px; display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }

/* 斜切 / 反向斜切：外框 skew，内容反向 skew */
.sl-cell-slant, .sl-cell-rev { background: var(--sl-tile); border: 1px solid var(--sl-line); }
.sl-cell-slant { transform: skewX(var(--sl-skew)); }
.sl-cell-slant > .sl-in { transform: skewX(var(--sl-unskew)); }
.sl-cell-rev { transform: skewX(var(--sl-unskew)); }
.sl-cell-rev > .sl-in { transform: skewX(var(--sl-skew)); }
.sl-cell-slant .sl-body, .sl-cell-rev .sl-body { padding-inline: 30px; }

/* 方正 */
.sl-cell-square { background: var(--sl-panel); }

.sl-cell-link:hover { background: var(--sl-tile-hover); }
.sl-cell-slant.sl-cell-link:hover, .sl-cell-rev.sl-cell-link:hover { border-color: var(--sl-accent); }

.sl-media { overflow: hidden; border-bottom: 1px solid var(--sl-line); }
.sl-media img { display: block; width: 100%; aspect-ratio: 16 / 7; object-fit: cover; max-width: none; filter: saturate(0.8); transition: filter 0.3s; }
.sl-cell-slant .sl-media img, .sl-cell-rev .sl-media img { transform: scale(1.2); }
.sl-cell-link:hover .sl-media img { filter: none; }
.sl-media-contain { background: #110d1a; }
.sl-media-contain img, .sl-cell-slant .sl-media-contain img, .sl-cell-rev .sl-media-contain img { object-fit: contain; padding: 10px 18px; box-sizing: border-box; transform: none; }
.sl-content-scroll { overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; }

.sl-head { display: flex; align-items: baseline; gap: 10px; margin: 0 !important; }
.sl-head strong { font-family: var(--sl-serif); font-size: 20px; font-weight: 700; color: var(--sl-fg); }
.sl-cell-link:hover .sl-head strong { color: var(--sl-accent); }
.sl-arrow { position: absolute; top: 14px; right: 18px; font-size: 13px; color: var(--sl-fg-2); }
.sl-cell-slant .sl-arrow, .sl-cell-rev .sl-arrow { right: 26px; }

/* 插槽里的 Markdown */
.sl-content { color: var(--sl-fg-2); font-size: 14.5px; line-height: 1.85; }
.sl-content :deep(> :first-child) { margin-top: 0; }
.sl-content :deep(> :last-child) { margin-bottom: 0; }
.sl-content :deep(p) { margin: 0 0 10px; line-height: 1.85; }
.sl-content :deep(strong) { color: var(--sl-fg); }
.sl-content :deep(ul) { margin: 0; padding-left: 1.2em; }
.sl-content :deep(img) { max-width: 100%; }

@media (max-width: 959px) {
  .sl-cell { grid-column: span 12; }
  .sl-cell-half { grid-column: span 6; }
}
@media (max-width: 560px) {
  .sl-cell, .sl-cell-half { grid-column: span 12; }
  .sl-body { padding: 16px 18px; }
  .sl-cell-slant .sl-body, .sl-cell-rev .sl-body { padding-inline: 22px; }
}
</style>
