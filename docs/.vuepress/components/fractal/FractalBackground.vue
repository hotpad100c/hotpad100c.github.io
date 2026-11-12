<script setup lang="ts">
/**
 * 全站背景：实时渲染的 Julia 分形，固定铺满窗口，放在所有内容后面。
 *
 * - 每个页面的参数见 fractalPages.ts / fractalPages.json（从 Julia 分形编辑器导出）
 * - 滚动时 C 绕原点旋转、视图中心轻微平移（每页的 scroll.speed / scroll.parallax）。
 *   分形不直接用页面的滚动位置：它有自己的「位置」和「速度」，像弹簧一样平滑地追随页面
 *   （临界阻尼，render.json 的 smoothTime 秒左右追上，不过冲；速度连续变化，与帧率无关）
 * - 换页 / 换主题：参数在 render.json 的 transitionMs 内平滑过渡到新页面（见 transition.ts），
 *   反演等开关在过渡到一半时直接切换
 * - 每帧的计算量按实际帧率自动调整（budget，像素数）：
 *   运动中降低分辨率并做运动模糊（新一帧与上一帧混合）；停下后按全分辨率逐帧累积到 16 个样本，
 *   一个样本算不完时分成几条横带画，不会卡住页面
 * - 只在滚动、换页、换主题、改窗口大小时重画，累积完成后不占 GPU
 * - 系统设置了「减少动态效果」时不随滚动变化、换页不过渡
 * - 不支持 WebGL 时退回到静态背景图 docs/images/bg-main.jpg
 * - 地址后面加 ?fractal-debug 会在右下角显示累积的样本数、分辨率和运动时的帧率
 * - 地址后面加 ?fractal-tune 打开调节器（FractalTuner.vue）：实时调分形位置、面板透明度等，并导出参数
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePageFrontmatter, useRoute } from 'vuepress/client'
import { bgMain } from '../home/useHomeData'
import FractalTuner from './FractalTuner.vue'
import { fractalKeyFor, fractalPages } from './fractalPages'
import { applyPanels, panelDefaults } from './panels'
import type { Frame, View } from './renderer'
import { FractalRenderer, frameOf, zoomToScale } from './renderer'
import { ease, lerpFrame, settle } from './transition'
import { changed, initTune, renderSettings, tune, tunePage } from './tuneStore'

const route = useRoute()
const frontmatter = usePageFrontmatter<{ fractal?: string }>()
const pageKey = computed(() => fractalKeyFor(route.path, frontmatter.value.fractal))
/** 调节器打开时，用调节器里改过的参数 */
const page = computed(() => (tune.active && tune.pages[pageKey.value]) || fractalPages[pageKey.value])

const canvas = ref<HTMLCanvasElement>()
const theme = ref<'dark' | 'light'>('dark')
const fallback = ref(false)
const veil = ref('transparent')
const debug = ref('')


let renderer: FractalRenderer | null = null
let raf = 0
let reduceMotion = false
let observer: MutationObserver | null = null
let mql: MediaQueryList | null = null
let showDebug = false

let shownScroll = 0
let velocity = 0
let lastTime = 0
/** 上一次 draw 的时间（调整 budget 用） */
let prevTime = 0

/** 下一帧是否要从头累积（换页、换主题、改窗口大小） */
let dirty = true
/** 运动时的平均帧间隔（调试用） */
let avgMs = 0
/** 每帧最多算多少个像素：按实际帧间隔自动调整（运动中 / 停下后各一个） */
let budget = 0
let budgetMove = 0
let budgetStill = 0
let lastMoving = false
/** 上一帧是否画过（帧间隔才能用来调整 budget） */
let drewLast = false
/** 调节器改了参数：这一帧按运动处理 */
let nudged = false

/** 当前目标帧；正在过渡时是 trans.to */
let current: Frame | null = null
let trans: { from: Frame, to: Frame, start: number } | null = null

function readTheme() {
  theme.value = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function view(): View {
  const cw = window.innerWidth
  const ch = window.innerHeight
  const R = renderSettings()
  const dpr = Math.min(window.devicePixelRatio || 1, Math.max(0.25, R.maxDpr))
  const scale = Math.min(dpr, Math.sqrt(Math.max(0.1, R.maxMegapixels) * 1e6 / Math.max(cw * ch, 1)))
  return { w: Math.max(1, Math.round(cw * scale)), h: Math.max(1, Math.round(ch * scale)), scale, scroll: shownScroll, viewportH: ch }
}

/** 过渡进行到哪里（0–1，已缓动） */
function progress(now: number) {
  return trans ? ease(Math.min(1, (now - trans.start) / Math.max(1, renderSettings().transitionMs))) : 1
}

/** 此刻画面上的帧 */
function shownFrame(now: number): Frame | null {
  if (!trans) return current
  return lerpFrame(trans.from, trans.to, progress(now))
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
  const before = shownScroll
  follow(target, dt)

  let f = current
  let ended = false
  if (trans) {
    const t = progress(now)
    if (t >= 1) { trans = null; ended = true }
    else f = lerpFrame(trans.from, trans.to, t)
  }
  const moving = !!trans || shownScroll !== before || nudged
  nudged = false
  if (moving && dt > 0) avgMs = avgMs ? avgMs * 0.9 + dt * 100 : dt * 1000
  const v = view()
  const full = v.w * v.h
  // 按上一帧实际花的时间调整计算量：慢了马上减，快了慢慢加。
  // 运动中和停下后分开调（目标帧率见 render.json 的 moveFps / stillFps）：运动中要流畅；停下后只是在补清晰度，
  // 帧率低一些也行，而且每帧至少画 stillMinShare 屏，保证一定能很快画完一幅清晰画面。
  // （一帧的时间里还有后期、浏览器合成等与分形无关的固定开销，高分辨率下不小，
  //   如果都算到分形头上，计算量会被一直压到最低，停下后迟迟不变清晰）
  const ms = (now - prevTime) || 0
  if (!budgetMove) budgetMove = full
  if (!budgetStill) budgetStill = full
  const R = renderSettings()
  if (drewLast && ms > 0) {
    // 帧间隔超过目标的 1.1 倍就按比例减，低于 0.9 倍就慢慢加
    const target = 1000 / Math.max(5, lastMoving ? R.moveFps : R.stillFps)
    if (lastMoving) {
      if (ms > target * 1.1) budgetMove *= Math.max(0.5, target * 0.8 / ms)
      else if (ms < target * 0.9) budgetMove *= 1.06
    }
    else {
      if (ms > target * 1.1) budgetStill *= Math.max(0.5, target * 0.9 / ms)
      else if (ms < target * 0.9) budgetStill *= 1.1
    }
  }
  budgetMove = Math.min(full, Math.max(20000, budgetMove))
  budgetStill = Math.min(full, Math.max(full * Math.min(1, Math.max(0.01, R.stillMinShare)), budgetStill))
  budget = moving ? budgetMove : budgetStill
  lastMoving = moving
  prevTime = now
  let more = false
  try {
    // 停下后的画面是确定的（目标页的参数 + 滚动停下的位置）：换页过渡中在屏幕外先把它画好。
    // 同页滚动时不分算力给它，滚动中的画面保持尽量清晰
    const keyAt = (scroll: number) => `${pageKey.value}|${theme.value}|${tune.version}|${Math.round(scroll)}|${v.w}x${v.h}`
    const pre = trans && current ? { key: keyAt(target), f: current, v: { ...v, scroll: target } } : undefined
    renderer.cfg = renderSettings()
    more = renderer.draw(f, v, { moving, reset: dirty || ended, budget, blend: renderSettings().motionBlur > 0 ? 1 - Math.exp(-Math.max(dt, 1 / 240) / renderSettings().motionBlur) : 1, key: keyAt(shownScroll), soft: !!trans, pre })
    dirty = false
    setVeil(f)
  }
  catch (e) {
    console.error('[fractal background]', e)
    useFallback()
    return
  }
  if (showDebug || tune.active) {
    debug.value = `${trans ? '过渡中 · ' : ''}${pageName()} · 已累积 ${renderer.samples}/${renderer.maxS} 个样本 · ${v.w}×${v.h}（×${v.scale.toFixed(2)}） · 每帧算 运动 ${(budgetMove / full * 100).toFixed(0)}% / 停下 ${(budgetStill / full * 100).toFixed(0)}% 像素，运动时分辨率 ×${renderer.lastScale.toFixed(2)} · 运动时约 ${avgMs ? (1000 / avgMs).toFixed(0) : '–'} 帧/秒（${avgMs.toFixed(0)}ms）`
  }
  drewLast = trans !== null || shownScroll !== target || more
  if (trans || shownScroll !== target || more) request()
  else lastTime = 0
}
function request() {
  if (!raf) raf = requestAnimationFrame(draw)
}
function onResize() {
  dirty = true
  request()
}

/** 临界阻尼弹簧（SmoothDamp）：shownScroll 带着速度追随 target */
function follow(target: number, dt: number) {
  if (dt <= 0) return
  const omega = 2 / Math.max(0.01, renderSettings().smoothTime)
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

/** 调节器的「性能分析」：用此刻的画面参数把每个步骤单独计时 */
function runProfile(): string {
  if (!renderer || !current) return '没有在用 WebGL 渲染（不支持 WebGL 或已退回静态图）'
  const f = shownFrame(performance.now()) ?? current
  const v = view()
  const rows = renderer.profile(f, v)
  dirty = true
  request()
  const full = v.w * v.h
  const lines = [
    `页面 ${pageKey.value} · ${theme.value === 'dark' ? '深色' : '浅色'} · 显卡：${renderer.gpuName()}`,
    `画布 ${v.w}×${v.h}（屏幕像素比 ${(window.devicePixelRatio || 1).toFixed(2)}，渲染比例 ×${v.scale.toFixed(2)}） · 迭代 ${Math.round(f.iterations)} · 反演 ${f.inverse ? '开' : '关'}`,
    `自动调整：每帧最多算 运动中 ${(budgetMove / (view().w * view().h) * 100).toFixed(0)}% / 停下后 ${(budgetStill / (view().w * view().h) * 100).toFixed(0)}% 的像素，运动时分辨率 ×${renderer.lastScale.toFixed(2)}，运动时约 ${avgMs ? (1000 / avgMs).toFixed(0) : '–'} 帧/秒`,
    '',
    ...rows.map(r => `${r.ms.toFixed(1).padStart(7)} ms  ${r.name}`),
  ]
  return lines.join('\n')
}

function pageName() {
  return pageKey.value
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
    trans = { from: settle(from), to: next, start: now }
  }
  dirty = true
  request()
}

onMounted(() => {
  initTune()
  readTheme()
  applyPanels(theme.value, tune.active ? tune.panels[theme.value] : panelDefaults[theme.value])
  const q = window.location.search
  showDebug = /[?&]fractal-debug\b/.test(q)
  // 排查问题用的开关（加在地址后面）：
  //   ?fx-noblur      所有面板不做背景模糊
  //   ?fx-noshadow    去掉文字影子
  //   ?fractal-off    不渲染分形，用静态背景图
  //   ?fractal-nocache 不缓存清晰画面
  for (const flag of ['fx-noblur', 'fx-noshadow']) {
    if (new RegExp(`[?&]${flag}\\b`).test(q)) document.documentElement.classList.add(flag)
  }
  if (/[?&]fractal-off\b/.test(q)) { useFallback(); return }
  observer = new MutationObserver(readTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
  mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduceMotion = mql.matches
  mql.addEventListener?.('change', onMotionPref)
  try {
    renderer = new FractalRenderer(canvas.value!)
    canvas.value!.addEventListener('webglcontextlost', useFallback)
    if (/[?&]fractal-nocache\b/.test(q)) renderer.noCache = true
    // 其他页面要用的着色器在空闲时一个个编译（第一次换页时就不用现编）
    renderer.prepare(Object.values(fractalPages))
    const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 200))
    const step = () => { if (renderer?.prepareStep()) idle(step) }
    idle(step)
  }
  catch {
    useFallback()
    return
  }
  shownScroll = reduceMotion ? 0 : window.scrollY
  current = frameOf(page.value, theme.value)
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  draw()
})
function onMotionPref(e: MediaQueryListEvent) {
  reduceMotion = e.matches
  request()
}

onBeforeUnmount(() => {
  window.removeEventListener('scroll', request)
  window.removeEventListener('resize', onResize)
  mql?.removeEventListener?.('change', onMotionPref)
  observer?.disconnect()
  cancelAnimationFrame(raf)
  renderer?.dispose()
})

watch(page, (next, prev) => { if (next !== prev) retarget() })
watch(theme, (t) => {
  applyPanels(t, tune.active ? tune.panels[t] : panelDefaults[t])
  retarget()
})

// 调节器改了参数：立刻用新参数重画（不做过渡）
watch(() => tune.version, () => {
  applyPanels(theme.value, tune.active ? tune.panels[theme.value] : panelDefaults[theme.value])
  if (!renderer) return
  current = frameOf(page.value, theme.value)
  if (trans) trans.to = current
  dirty = true
  nudged = true
  request()
})

// 「拖动背景」：拖动平移、滚轮缩放（以鼠标为中心），与 Julia 分形编辑器的手感一致
let dragFrom: { x: number, y: number } | null = null
/** 屏幕上的位移（CSS px，y 向下）→ 分形坐标里的位移 */
function toWorld(dx: number, dy: number, zoom: number, rotate: number) {
  const m = Math.min(window.innerWidth, window.innerHeight)
  const s = zoomToScale(zoom)
  const a = rotate * Math.PI / 180
  const qx = dx / m
  const qy = -dy / m
  return [(Math.cos(a) * qx - Math.sin(a) * qy) * s, (Math.sin(a) * qx + Math.cos(a) * qy) * s]
}
function onDragStart(e: PointerEvent) {
  dragFrom = { x: e.clientX, y: e.clientY };
  (e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function onDragMove(e: PointerEvent) {
  if (!dragFrom) return
  const p = tunePage(pageKey.value)
  const [wx, wy] = toWorld(e.clientX - dragFrom.x, e.clientY - dragFrom.y, p.view.zoom, p.view.rotate)
  p.view.x -= wx
  p.view.y -= wy
  dragFrom = { x: e.clientX, y: e.clientY }
  changed()
}
function onDragEnd() { dragFrom = null }
function onWheel(e: WheelEvent) {
  const p = tunePage(pageKey.value)
  const cx = e.clientX - window.innerWidth / 2
  const cy = e.clientY - window.innerHeight / 2
  const [ax, ay] = toWorld(cx, cy, p.view.zoom, p.view.rotate)
  p.view.zoom = Math.min(12, Math.max(-6, p.view.zoom - e.deltaY * 0.0015))
  const [bx, by] = toWorld(cx, cy, p.view.zoom, p.view.rotate)
  p.view.x += ax - bx
  p.view.y += ay - by
  changed()
}
</script>

<template>
  <div class="fractal-bg" :class="{ 'is-fallback': fallback }" :style="{ '--fallback-img': `url(${bgMain})` }" aria-hidden="true">
    <canvas v-show="!fallback" ref="canvas" class="fractal-canvas" />
    <div class="fractal-veil" :style="{ background: veil }" />
  </div>
  <!-- 调试信息单独放：放进调节器会让它每帧重新渲染，正在输入的数字会被改回去 -->
  <div v-if="debug" class="fractal-debug" :class="{ 'with-tuner': tune.active }">{{ debug }}</div>
  <template v-if="tune.active">
    <div
      v-if="tune.drag"
      class="fractal-drag"
      @pointerdown.prevent="onDragStart"
      @pointermove="onDragMove"
      @pointerup="onDragEnd"
      @pointercancel="onDragEnd"
      @wheel.prevent="onWheel"
    />
    <FractalTuner :page-key="pageKey" :theme="theme" :profile="runProfile" />
  </template>
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
.fractal-drag {
  position: fixed;
  inset: 0;
  z-index: 110;
  cursor: grab;
  background: rgba(181, 156, 242, 0.04);
  outline: 2px dashed rgba(181, 156, 242, 0.5);
  outline-offset: -6px;
  touch-action: none;
}
.fractal-drag:active { cursor: grabbing; }
.fractal-debug.with-tuner { right: auto; left: 12px; max-width: min(420px, calc(100vw - 24px)); z-index: 121; }
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
