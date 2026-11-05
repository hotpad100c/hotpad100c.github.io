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
 * 插槽（可选）：显示在镜像下方的底栏，例如署名和指向原站的链接。
 * sync-hash：博客地址的 #… 与镜像页面的 #… 双向同步。适合用 #… 切换内容的页面：
 *            打开 /posts/xxx/#kappa 时镜像直接显示 kappa；在镜像里切换后，博客地址也跟着变，方便分享。
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
  syncHash?: boolean
}>(), { label: '镜像', fit: 'content', minHeight: 480, syncHash: false })

const frame = ref<HTMLIFrameElement>()
const ready = ref(false)
const height = ref(Number(props.minHeight))
const current = ref(withBase(props.src))
let ro: ResizeObserver | null = null
let loads = 0
// 防止「内容高度跟着 iframe 高度一起长」的循环（镜像页面里有跟视口挂钩的高度时会出现）
let growth = { count: 0, since: 0 }
let unlistenHash: (() => void) | null = null

/** 把镜像里的 #… 写回博客地址（不新增历史记录，不触发路由） */
function pushHashToParent(hash: string) {
  if (hash === window.location.hash) return
  const url = window.location.pathname + window.location.search + hash
  window.history.replaceState(window.history.state, '', url)
}

function measure(doc: Document) {
  // 用 <body> 的高度：<html> 的 scrollHeight 不会小于 iframe 本身的高度，用它的话页面变短后高度降不下来
  const body = doc.body
  if (!body) return
  const style = doc.defaultView?.getComputedStyle(body)
  const margin = style ? (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0) : 0
  const h = Math.max(body.scrollHeight, body.getBoundingClientRect().height) + margin
  const next = Math.max(Number(props.minHeight), Math.ceil(h))
  if (Math.abs(next - height.value) <= 1) return
  const now = Date.now()
  if (next > height.value) {
    if (now - growth.since > 2000) growth = { count: 0, since: now }
    // 2 秒内连续变高 40 次，或者超过 10 万像素：判定为循环，停止跟随
    if (++growth.count > 40 || next > 100000) {
      ro?.disconnect()
      console.warn('[MirrorFrame] 镜像页面的高度在不断增长，已停止自适应高度：', props.src)
      return
    }
  }
  height.value = next
}

function onLoad() {
  const el = frame.value
  if (!el) return
  let doc: Document | null = null
  try { doc = el.contentDocument } catch { doc = null }
  if (!doc || doc.URL === 'about:blank') return
  ready.value = true
  loads++
  const win0 = el.contentWindow!
  try { current.value = win0.location.pathname + win0.location.search + win0.location.hash } catch {}

  if (props.syncHash) {
    // 第一次加载：博客地址带了 #… 就交给镜像；否则把镜像的默认 #… 写回博客地址
    if (loads === 1 && window.location.hash && window.location.hash !== win0.location.hash) win0.location.hash = window.location.hash
    else if (win0.location.hash) pushHashToParent(win0.location.hash)
    unlistenHash?.()
    const onHash = () => {
      pushHashToParent(win0.location.hash)
      current.value = win0.location.pathname + win0.location.search + win0.location.hash
    }
    win0.addEventListener('hashchange', onHash)
    win0.addEventListener('popstate', onHash)
    // 有的页面用 history.replaceState / pushState 改 #…，这不会触发 hashchange，所以也包一层
    const h = win0.history
    const wrap = (name: 'pushState' | 'replaceState') => {
      const orig = h[name]
      h[name] = function (this: History, ...args: Parameters<History['pushState']>) {
        const r = orig.apply(this, args)
        onHash()
        return r
      } as History['pushState']
      return () => { h[name] = orig }
    }
    const restore = [wrap('pushState'), wrap('replaceState')]
    unlistenHash = () => {
      win0.removeEventListener('hashchange', onHash)
      win0.removeEventListener('popstate', onHash)
      restore.forEach(f => f())
    }
  }
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
onBeforeUnmount(() => { ro?.disconnect(); unlistenHash?.() })
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
    <div v-if="$slots.default" class="mf-foot"><slot /></div>
  </div>
</template>

<style scoped>
.mf {
  position: relative;
  background: var(--sl-bg);
  border: 1px solid var(--sl-line);
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
.mf-foot {
  padding: 12px max(16px, 3vw);
  background: var(--sl-panel);
  border-top: 1px solid var(--sl-line);
  font-family: var(--sl-mono);
  font-size: 12px;
  line-height: 1.8;
  color: var(--sl-fg-2);
}
.mf-foot :deep(a) { color: var(--sl-accent); overflow-wrap: anywhere; }
.mf-foot :deep(p) { margin: 0; }
.mf-screen .mf-frame { height: calc(100vh - var(--vp-nav-height, 64px) - 49px); min-height: 420px; }
.mf-screen:has(.mf-foot) .mf-frame { height: calc(100vh - var(--vp-nav-height, 64px) - 49px - 46px); }
@media (max-width: 959px) {
  .mf-screen .mf-frame { height: calc(100vh - var(--vp-nav-height, 64px) - 49px - 40px); }
}
@media (max-width: 560px) {
  .mf-bar .sl-label { display: none; }
}
</style>
