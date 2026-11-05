<script setup lang="ts">
/**
 * 在博客页面里显示一个镜像站点（由 scripts/mirror.mjs 抓取到 /mirror/<name>/）。
 *
 *   <MirrorFrame src="/mirror/modsite/" title="Ryan100C's Mods" source="https://modsite-4x9.pages.dev/" />
 *
 * src：镜像地址（/mirror/<name>/，可以带页面和参数）
 * title：顶部标题栏里的名称
 * source：原站地址，可选；有的话标题栏里会有「原站」按钮
 * fit：content（默认）高度跟随内容，整页一起滚动；screen 占满一屏，适合编辑器之类的应用
 *
 * 镜像与博客同域，所以这里可以读取 iframe 的内容高度；深浅色由镜像里的桥接脚本跟随博客切换。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'

const props = withDefaults(defineProps<{
  src: string
  title: string
  source?: string
  label?: string
  fit?: 'content' | 'screen'
  minHeight?: number | string
}>(), { label: '镜像', fit: 'content', minHeight: 480 })

const frame = ref<HTMLIFrameElement>()
const ready = ref(false)
const height = ref(Number(props.minHeight))
const current = ref(withBase(props.src))
let ro: ResizeObserver | null = null
let loads = 0

function measure(doc: Document) {
  // 用 <body> 的高度：<html> 的 scrollHeight 不会小于 iframe 本身的高度，用它的话页面变短后高度降不下来
  const body = doc.body
  if (!body) return
  const style = doc.defaultView?.getComputedStyle(body)
  const margin = style ? (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0) : 0
  const h = Math.max(body.scrollHeight, body.getBoundingClientRect().height) + margin
  const next = Math.max(Number(props.minHeight), Math.ceil(h))
  if (Math.abs(next - height.value) > 1) height.value = next
}

function onLoad() {
  const el = frame.value
  if (!el) return
  let doc: Document | null = null
  try { doc = el.contentDocument } catch { doc = null }
  if (!doc || doc.URL === 'about:blank') return
  ready.value = true
  loads++
  try { current.value = el.contentWindow!.location.pathname + el.contentWindow!.location.search } catch {}
  // 在镜像里点进了另一个页面：滚回到镜像顶部
  if (loads > 1) el.closest('.mf')?.scrollIntoView({ block: 'start' })

  if (props.fit !== 'content') return
  ro?.disconnect()
  const win = el.contentWindow as (Window & typeof globalThis) | null
  const RO = win?.ResizeObserver || ResizeObserver
  ro = new RO(() => measure(doc!))
  if (doc.body) ro.observe(doc.body)
  measure(doc)
}

onMounted(() => {
  // 服务端渲染的 iframe 可能在页面脚本启动前就加载完了，此时 load 事件已经错过
  const doc = frame.value?.contentDocument
  if (doc && doc.readyState === 'complete') onLoad()
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div class="sl-scope mf" :class="`mf-${fit}`">
    <div class="mf-bar">
      <span class="sl-label">{{ label }}</span>
      <strong class="mf-title">{{ title }}</strong>
      <span class="mf-spacer" />
      <a class="mf-btn" :href="current" target="_blank" rel="noopener">单独打开 ↗</a>
      <a v-if="source" class="mf-btn" :href="source" target="_blank" rel="noopener">原站 ↗</a>
    </div>
    <iframe
      ref="frame"
      class="mf-frame"
      :class="{ ready }"
      :src="withBase(src)"
      :title="title"
      :style="fit === 'content' ? { height: `${height}px` } : undefined"
      allow="clipboard-write; fullscreen"
      @load="onLoad"
    />
  </div>
</template>

<style scoped>
.mf {
  position: relative;
  background: var(--sl-bg);
  border-bottom: 1px solid var(--sl-line);
}
.mf-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px max(16px, 3vw);
  background: var(--sl-panel);
  border-bottom: 1px solid var(--sl-line);
}
.mf-title { font-family: var(--sl-serif); font-size: 16px; color: var(--sl-fg); }
.mf-spacer { flex: 1; }
.mf-btn {
  font-family: var(--sl-mono);
  font-size: 12px;
  padding: 4px 14px;
  color: var(--sl-fg-2) !important;
  background: var(--sl-tile);
  text-decoration: none !important;
  clip-path: polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%);
  box-shadow: inset 0 0 0 1px var(--sl-line);
}
.mf-btn:hover { color: var(--sl-fg) !important; background: var(--sl-tile-hover); }

.mf-frame {
  display: block;
  width: 100%;
  border: 0;
  background: var(--sl-bg);
  opacity: 0;
  transition: opacity 0.2s;
}
.mf-frame.ready { opacity: 1; }
.mf-screen .mf-frame { height: calc(100vh - var(--vp-nav-height, 64px) - 49px); min-height: 420px; }
@media (max-width: 959px) {
  .mf-screen .mf-frame { height: calc(100vh - var(--vp-nav-height, 64px) - 49px - 40px); }
}
@media (max-width: 560px) {
  .mf-bar .sl-label { display: none; }
}
</style>
