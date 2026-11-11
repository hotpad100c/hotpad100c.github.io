<script setup lang="ts">
/**
 * 全站背景：实时渲染的 Julia 分形，固定铺满窗口，放在所有内容后面。
 *
 * - 每个页面的参数见 fractalPages.ts / fractalPages.json（从 Julia 分形编辑器导出）
 * - 滚动时 C 绕原点旋转、视图中心轻微平移（每页的 scroll.speed / scroll.parallax）。
 *   分形不直接用页面的滚动位置：它有自己的「位置」和「速度」，像弹簧一样平滑地追随页面
 *   （临界阻尼，SMOOTH_TIME 秒左右追上，不过冲；速度连续变化，与帧率无关）
 * - 换页 / 换主题：参数在 TRANSITION_MS 内平滑过渡到新页面（见 transition.ts）；
 *   两页结构不同（例如一个反演、一个不反演）时两幅画面交叉淡化，不会先变黑
 * - 始终按屏幕像素密度、带超采样渲染；超采样次数（每个像素 1×1 / 2×2 / 3×3 个样本）
 *   在每次换页时按这台设备画一帧的耗时自动选择
 * - 只在滚动、换页、换主题、改窗口大小时重画，静止时不占 GPU
 * - 系统设置了「减少动态效果」时不随滚动变化、换页不过渡
 * - 不支持 WebGL 时退回到静态背景图 docs/images/bg-main.jpg
 * - 地址后面加 ?fractal-debug 会在右下角显示超采样次数、分辨率和一帧的耗时
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePageFrontmatter, useRoute } from 'vuepress/client'
import { bgMain } from '../home/useHomeData'
import { fractalFor, fractalPages } from './fractalPages'
import type { Frame, View } from './renderer'
import { FractalRenderer, frameOf } from './renderer'
import { compatible, ease, lerpFrame, settle } from './transition'

const route = useRoute()
const frontmatter = usePageFrontmatter<{ fractal?: string }>()
const page = computed(() => fractalFor(route.path, frontmatter.value.fractal))

const canvas = ref<HTMLCanvasElement>()
const theme = ref<'dark' | 'light'>('dark')
const fallback = ref(false)
const veil = ref('transparent')
const debug = ref('')

/** 画布最多多少像素（超过时整体降低分辨率） */
const MAX_PIXELS = 5_000_000
/** 滚动追随的平滑时间（秒）：越大越「慢、软」 */
const SMOOTH_TIME = 0.45
/** 换页过渡的时长 */
const TRANSITION_MS = 1100

let renderer: FractalRenderer | null = null
let raf = 0
let reduceMotion = false
let observer: MutationObserver | null = null
let mql: MediaQueryList | null = null
let showDebug = false

let shownScroll = 0
let velocity = 0
let lastTime = 0

/** 每个像素 aa × aa 个样本；很慢的设备上 lowRes 会把分辨率降到 70% */
let aa = 2
let lowRes = false
let frameMs = 0

/** 当前目标帧；正在过渡时是 trans.to */
let current: Frame | null = null
let trans: { from: Frame, to: Frame, start: number, cross: boolean } | null = null

function readTheme() {
  theme.value = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function view(): View {
  const cw = window.innerWidth
  const ch = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const scale = Math.min(dpr * (lowRes ? 0.7 : 1), Math.sqrt(MAX_PIXELS / Math.max(cw * ch, 1)))
  return { w: Math.max(1, Math.round(cw * scale)), h: Math.max(1, Math.round(ch * scale)), scale, scroll: shownScroll, viewportH: ch, aa }
}

/** 过渡进行到哪里（0–1，已缓动） */
function progress(now: number) {
  return trans ? ease(Math.min(1, (now - trans.start) / TRANSITION_MS)) : 1
}

/** 此刻画面上的帧（交叉淡化时取占比较大的一边） */
function shownFrame(now: number): Frame | null {
  if (!trans) return current
  const t = progress(now)
  if (trans.cross) return t < 0.5 ? trans.from : trans.to
  return lerpFrame(trans.from, trans.to, t)
}

function setVeil(f: Frame) {
  veil.value = `rgba(${f.veilColor.map(Math.round).join(', ')}, ${f.veil})`
}

function draw() {
  raf = 0
  if (!renderer || !canvas.value || !current) return
  const now = performance.now()
  const dt = Math.min((now - (lastTime || now)) / 1000, 0.1)
  lastTime = now
  const target = reduceMotion ? 0 : window.scrollY
  follow(target, dt)

  const v = view()
  try {
    if (trans) {
      const t = progress(now)
      if (t >= 1) {
        trans = null
      }
      else if (trans.cross) {
        renderer.drawCrossfade(trans.from, trans.to, t, v)
        setVeil(lerpFrame(trans.from, trans.to, t)) // 遮罩照样插值
      }
      else {
        const f = lerpFrame(trans.from, trans.to, t)
        renderer.draw(f, v)
        setVeil(f)
      }
    }
    if (!trans) {
      renderer.draw(current, v)
      setVeil(current)
    }
  }
  catch (e) {
    console.error('[fractal background]', e)
    useFallback()
    return
  }
  if (showDebug) {
    debug.value = `${trans ? (trans.cross ? '交叉淡化 · ' : '插值 · ') : ''}${pageName()} · ${aa}×${aa} 超采样 · ${v.w}×${v.h}（×${v.scale.toFixed(2)}${lowRes ? '，已降分辨率' : ''}） · 一帧约 ${frameMs.toFixed(1)}ms`
  }
  if (trans || shownScroll !== target) request()
  else lastTime = 0
}
function request() {
  if (!raf) raf = requestAnimationFrame(draw)
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

/**
 * 量一帧 2×2 超采样要多久，据此选超采样次数。
 * 和随后的正式绘制在同一个任务里完成，测量用的画面不会显示出来。
 */
function calibrate(f: Frame) {
  if (!renderer) return
  try {
    lowRes = false
    const v = view()
    renderer.draw(f, { ...v, aa: 1 })
    renderer.finish() // 第一次画可能包含着色器编译，不计时
    const t0 = performance.now()
    renderer.draw(f, { ...v, aa: 2 })
    renderer.finish()
    frameMs = performance.now() - t0
    aa = frameMs < 12 ? 3 : frameMs < 45 ? 2 : 1
    lowRes = frameMs > 150
  }
  catch {}
}

function pageName() {
  return Object.keys(fractalPages).find(k => fractalPages[k] === page.value) ?? '?'
}

function useFallback() {
  fallback.value = true
  renderer?.dispose()
  renderer = null
}

/** 换页 / 换主题：从此刻的画面过渡到新的目标帧 */
function retarget() {
  const next = frameOf(page.value, theme.value)
  if (!renderer || !current) { current = next; return }
  const now = performance.now()
  const from = shownFrame(now)
  current = next
  if (!from || reduceMotion) {
    trans = null
  }
  else {
    const start = settle(from)
    trans = { from: start, to: next, start: now, cross: !compatible(start, next) }
  }
  calibrate(next)
  if (trans) trans.start = performance.now() // 过渡从测量之后才开始计时
  draw()
}

onMounted(() => {
  readTheme()
  showDebug = /[?&]fractal-debug\b/.test(window.location.search)
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
  current = frameOf(page.value, theme.value)
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request, { passive: true })
  calibrate(current)
  draw()
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

watch(page, (next, prev) => { if (next !== prev) retarget() })
watch(theme, retarget)
</script>

<template>
  <div class="fractal-bg" :class="{ 'is-fallback': fallback }" :style="{ '--fallback-img': `url(${bgMain})` }" aria-hidden="true">
    <canvas v-show="!fallback" ref="canvas" class="fractal-canvas" />
    <div class="fractal-veil" :style="{ background: veil }" />
  </div>
  <div v-if="debug" class="fractal-debug">{{ debug }}</div>
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
}
.fractal-veil {
  position: absolute;
  inset: 0;
}
.is-fallback {
  background: var(--fallback-img) center / cover no-repeat;
}
.fractal-debug {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 100;
  padding: 6px 10px;
  font: 12px/1.4 var(--sl-mono, monospace);
  color: #efe9fd;
  background: rgba(11, 9, 16, 0.85);
  border: 1px solid rgba(181, 156, 242, 0.4);
  pointer-events: none;
}
</style>
