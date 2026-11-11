<script setup lang="ts">
/**
 * 全站背景：实时渲染的 Julia 分形，固定铺满窗口，放在所有内容后面。
 *
 * - 每个页面的参数见 fractalPages.ts / fractalPages.json（从 Julia 分形编辑器导出）
 * - 滚动时 C 绕原点旋转、视图中心轻微平移（每页的 scroll.speed / scroll.parallax）
 * - 只在滚动、换页、换主题、改窗口大小时重画；始终按屏幕像素密度、带超采样渲染（不会在滚动时降分辨率）
 * - 分形不直接用页面的滚动位置：它有自己的「位置」和「速度」，像弹簧一样平滑地追随页面
 *   （临界阻尼，SMOOTH_TIME 秒左右追上，不过冲；速度连续变化，与帧率无关）
 * - 超采样的次数（每个像素 1×1 / 2×2 / 3×3 个样本）在每次换页时按这台设备画一帧的耗时自动选择
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

/** 画布最多多少像素（超过时整体降低分辨率，而不是滚动时临时降） */
const MAX_PIXELS = 5_000_000
/** 追随的平滑时间（秒）：越大越「慢、软」 */
const SMOOTH_TIME = 0.45

let renderer: FractalRenderer | null = null
let raf = 0
let reduceMotion = false
let observer: MutationObserver | null = null
let mql: MediaQueryList | null = null
let shownScroll = 0
let velocity = 0
let lastTime = 0
/** 每个像素 aa × aa 个样本；很慢的设备上 lowRes 会把分辨率降到 70% */
let aa = 2
let lowRes = false

function readTheme() {
  theme.value = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function size() {
  const cw = window.innerWidth
  const ch = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const scale = Math.min(dpr * (lowRes ? 0.7 : 1), Math.sqrt(MAX_PIXELS / Math.max(cw * ch, 1)))
  return { ch, scale, w: Math.max(1, Math.round(cw * scale)), h: Math.max(1, Math.round(ch * scale)) }
}

function render(samples: number) {
  const { ch, scale, w, h } = size()
  renderer!.draw(page.value, theme.value, shownScroll, ch, w, h, scale, samples)
}

function draw() {
  raf = 0
  if (!renderer || !canvas.value) return
  const target = reduceMotion ? 0 : window.scrollY
  const now = performance.now()
  const dt = Math.min((now - (lastTime || now)) / 1000, 0.1)
  lastTime = now
  follow(target, dt)
  try {
    render(aa)
  }
  catch (e) {
    console.error('[fractal background]', e)
    useFallback()
    return
  }
  if (shownScroll !== target) request()
  else lastTime = 0
}

/** 临界阻尼弹簧（SmoothDamp）：shownScroll 带着速度追随 target */
function follow(target: number, dt: number) {
  if (dt <= 0) return
  const omega = 2 / SMOOTH_TIME
  const x = omega * dt
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  const change = shownScroll - target
  const temp = (velocity + omega * change) * dt
  velocity = (velocity - omega * temp) * exp
  shownScroll = target + (change + temp) * exp
  if (Math.abs(shownScroll - target) < 0.05 && Math.abs(velocity) < 0.5) {
    shownScroll = target
    velocity = 0
  }
}
function request() {
  if (!raf) raf = requestAnimationFrame(draw)
}

/** 量一帧 2×2 超采样要多久，据此选超采样次数 */
function calibrate() {
  if (!renderer) return
  try {
    lowRes = false
    render(1)
    renderer.finish()          // 第一次画包含着色器编译，不计时
    const t0 = performance.now()
    render(2)
    renderer.finish()
    const t = performance.now() - t0
    aa = t < 9 ? 3 : t < 28 ? 2 : 1
    lowRes = t > 90
  }
  catch {}
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
  shownScroll = reduceMotion ? 0 : window.scrollY
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request, { passive: true })
  calibrate()
  request()
})
function onMotionPref(e: MediaQueryListEvent) {
  reduceMotion = e.matches
  request()
}

onBeforeUnmount(() => {
  window.removeEventListener('scroll', request)
  window.removeEventListener('resize', request)
  mql?.removeEventListener?.('change', onMotionPref)
  observer?.disconnect()
  cancelAnimationFrame(raf)
  renderer?.dispose()
})

// 换页：参数不同时淡出 → 换图 → 淡入；换主题：直接重画
let fadeTimer = 0
watch(page, (next, prev) => {
  if (next === prev || !renderer) return
  clearTimeout(fadeTimer)
  const swap = () => {
    shownScroll = reduceMotion ? 0 : window.scrollY
    velocity = 0
    calibrate()
    draw()
    fading.value = false
  }
  if (reduceMotion) { swap(); return }
  fading.value = true
  fadeTimer = window.setTimeout(swap, 180)
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
