<script setup lang="ts">
/**
 * 全站背景：实时渲染的 Julia 分形，固定铺满窗口，放在所有内容后面。
 *
 * - 每个页面的参数见 fractalPages.ts / fractalPages.json（从 Julia 分形编辑器导出）
 * - 滚动时 C 绕原点旋转、视图中心轻微平移（每页的 scroll.speed / scroll.parallax）
 * - 只在滚动、换页、换主题、改窗口大小时重画；滚动中用较低分辨率，停下后再画一张清晰的
 * - 系统设置了「减少动态效果」时不随滚动变化
 * - 不支持 WebGL 时退回到静态背景图 docs/images/bg-main.jpg
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePageFrontmatter, useRoute } from 'vuepress/client'
import { bgMain } from '../home/useHomeData'
import { fractalFor } from './fractalPages'
import { FractalRenderer } from './renderer'

const route = useRoute()
const frontmatter = usePageFrontmatter<{ fractal?: string }>()
const page = computed(() => fractalFor(route.path, frontmatter.value.fractal))

const canvas = ref<HTMLCanvasElement>()
const theme = ref<'dark' | 'light'>('dark')
const fallback = ref(false)
const fading = ref(false)
const veil = computed(() => {
  const rgb = theme.value === 'light' ? '239, 233, 251' : '11, 9, 16'
  return `rgba(${rgb}, ${page.value.veil})`
})

/** 清晰画面最多画多少像素；滚动中用的低分辨率最多多少像素 */
const MAX_PIXELS = 4_000_000
const MAX_PIXELS_MOVING = 900_000
const IDLE_MS = 160

let renderer: FractalRenderer | null = null
let raf = 0
let idleTimer = 0
let moving = false
let reduceMotion = false
let observer: MutationObserver | null = null
let mql: MediaQueryList | null = null

function readTheme() {
  theme.value = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function draw() {
  raf = 0
  if (!renderer || !canvas.value) return
  const cw = window.innerWidth
  const ch = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const cap = moving ? MAX_PIXELS_MOVING : MAX_PIXELS
  // 画布像素 / CSS 像素：屏幕像素密度，但总像素数不超过上限
  const scale = Math.min(dpr, Math.sqrt(cap / Math.max(cw * ch, 1)))
  const w = Math.max(1, Math.round(cw * scale))
  const h = Math.max(1, Math.round(ch * scale))
  const scroll = reduceMotion ? 0 : window.scrollY
  try {
    renderer.draw(page.value, theme.value, scroll, ch, w, h, scale)
  }
  catch (e) {
    console.error('[fractal background]', e)
    useFallback()
  }
}
function request() {
  if (!raf) raf = requestAnimationFrame(draw)
}
/** 滚动 / 改窗口大小：先用低分辨率跟上，停下后补一张清晰的 */
function onMove() {
  if (reduceMotion) return
  moving = true
  request()
  clearTimeout(idleTimer)
  idleTimer = window.setTimeout(() => { moving = false; request() }, IDLE_MS)
}
function onResize() {
  onMove()
  if (reduceMotion) request()
}

function useFallback() {
  fallback.value = true
  renderer?.dispose()
  renderer = null
}

onMounted(() => {
  readTheme()
  observer = new MutationObserver(readTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
  mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduceMotion = mql.matches
  mql.addEventListener?.('change', onMotionPref)
  try {
    renderer = new FractalRenderer(canvas.value!)
    canvas.value!.addEventListener('webglcontextlost', useFallback)
  }
  catch {
    useFallback()
    return
  }
  window.addEventListener('scroll', onMove, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  request()
})
function onMotionPref(e: MediaQueryListEvent) {
  reduceMotion = e.matches
  request()
}

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onMove)
  window.removeEventListener('resize', onResize)
  mql?.removeEventListener?.('change', onMotionPref)
  observer?.disconnect()
  cancelAnimationFrame(raf)
  clearTimeout(idleTimer)
  renderer?.dispose()
})

// 换页：参数不同时淡出 → 换图 → 淡入；换主题：直接重画
let fadeTimer = 0
watch(page, (next, prev) => {
  if (next === prev || !renderer) return
  clearTimeout(fadeTimer)
  if (reduceMotion) { request(); return }
  fading.value = true
  fadeTimer = window.setTimeout(() => {
    draw()
    fading.value = false
  }, 180)
})
watch(theme, request)
</script>

<template>
  <div class="fractal-bg" :class="{ 'is-fallback': fallback }" :style="{ '--fallback-img': `url(${bgMain})` }" aria-hidden="true">
    <canvas v-show="!fallback" ref="canvas" class="fractal-canvas" :class="{ fading }" />
    <div class="fractal-veil" :style="{ background: veil }" />
  </div>
</template>

<style scoped>
.fractal-bg {
  position: fixed;
  inset: 0;
  z-index: -2; /* 斜切页面自定的背景图（z-index: -1）盖在它上面 */
  pointer-events: none;
  background: var(--vp-c-bg);
}
.fractal-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  transition: opacity 0.18s ease;
}
.fractal-canvas.fading { opacity: 0; }
.fractal-veil {
  position: absolute;
  inset: 0;
  transition: background-color 0.3s;
}
.is-fallback {
  background: var(--fallback-img) center / cover no-repeat;
}
@media (prefers-reduced-motion: reduce) {
  .fractal-canvas { transition: none; }
}
</style>
