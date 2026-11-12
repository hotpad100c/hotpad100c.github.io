<script setup lang="ts">
/**
 * 分形背景与半透明面板的调节器。在任意页面地址后面加 ?fractal-tune 打开（之后换页一直保留，点 × 关闭）。
 * 改动立刻显示在页面上，并保存在浏览器里；调好后「复制全部」发回来，替换 fractalPages.json / panels.json。
 */
import { computed, ref, watch } from 'vue'
import { changed, closeTune, exportAll, exportPage, resetPage, resetPanels, resetRender, tune, tunePage } from './tuneStore'

const props = defineProps<{ pageKey: string, theme: 'dark' | 'light', profile: () => string }>()

const open = ref(true)
const msg = ref('')
const report = ref('')
function runProfile() {
  report.value = '正在测量……'
  // 先让「正在测量」显示出来，再开始（测量时页面会卡一两秒）
  setTimeout(() => { report.value = props.profile() }, 50)
}
const page = computed(() => { void tune.version; return tunePage(props.pageKey) })
const panel = computed(() => tune.panels[props.theme])
const post = computed(() => page.value.palette[props.theme].post)

type Ctl = { label: string, path: string, min: number, max: number, step: number, fmt?: (v: number) => string }
const VIEW: Ctl[] = [
  { label: '中心 X', path: 'view.x', min: -6, max: 6, step: 0.0005 },
  { label: '中心 Y', path: 'view.y', min: -6, max: 6, step: 0.0005 },
  { label: '缩放', path: 'view.zoom', min: -4, max: 10, step: 0.01, fmt: v => `×${(2 ** v).toFixed(2)}` },
  { label: '旋转', path: 'view.rotate', min: -180, max: 180, step: 0.5, fmt: v => `${v.toFixed(1)}°` },
]
const SHAPE: Ctl[] = [
  { label: 'C 实部', path: 'c.0', min: -2, max: 2, step: 0.0001 },
  { label: 'C 虚部', path: 'c.1', min: -2, max: 2, step: 0.0001 },
  { label: '幂次', path: 'power', min: -4, max: 12, step: 0.01 },
  { label: '迭代次数', path: 'iterations', min: 16, max: 1024, step: 1 },
  { label: '遮罩', path: 'veil', min: 0, max: 0.95, step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
  { label: '滚动转速', path: 'scroll.speed', min: -20, max: 20, step: 0.05, fmt: v => `${v.toFixed(2)}°/1000px` },
  { label: '滚动视差', path: 'scroll.parallax', min: 0, max: 1, step: 0.01 },
]
const POST: Ctl[] = [
  { label: '曝光', path: 'exposure', min: -2, max: 2, step: 0.01, fmt: v => `${v > 0 ? '+' : ''}${v.toFixed(2)} EV` },
  { label: '光晕强度', path: 'bloom.intensity', min: 0, max: 3, step: 0.01 },
  { label: '红蓝分光', path: 'chroma', min: 0, max: 0.04, step: 0.0005, fmt: v => (v * 1000).toFixed(1) },
  { label: '饱和度', path: 'saturation', min: 0, max: 2, step: 0.01 },
]
const PANEL: Ctl[] = [
  { label: '面板不透明度', path: 'alpha', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
  { label: '悬停不透明度', path: 'hoverAlpha', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
  { label: '背景模糊', path: 'blur', min: 0, max: 40, step: 0.5, fmt: v => `${v}px` },
  { label: '背景饱和度', path: 'saturate', min: 0, max: 2, step: 0.01 },
  { label: '背景亮度', path: 'brightness', min: 0.2, max: 1.5, step: 0.01 },
  { label: '导航栏不透明度', path: 'nav', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
  { label: '侧边栏不透明度', path: 'sidebar', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
  { label: '文字影子', path: 'shadow', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
  { label: '影子半径', path: 'shadowBlur', min: 0, max: 20, step: 0.5, fmt: v => `${v}px` },
]

const pct = (v: number) => `${Math.round(v * 100)}%`
const RENDER: Ctl[] = [
  { label: '渲染比例上限', path: 'maxDpr', min: 0.5, max: 3, step: 0.05, fmt: v => `×${v.toFixed(2)}（屏幕 ×${(window.devicePixelRatio || 1).toFixed(2)}）` },
  { label: '最多像素', path: 'maxMegapixels', min: 0.5, max: 16, step: 0.1, fmt: v => `${v.toFixed(1)} 百万` },
  { label: '运动目标帧率', path: 'moveFps', min: 15, max: 144, step: 1, fmt: v => `${v} 帧/秒` },
  { label: '停下目标帧率', path: 'stillFps', min: 5, max: 144, step: 1, fmt: v => `${v} 帧/秒` },
  { label: '停下每帧至少', path: 'stillMinShare', min: 0.01, max: 1, step: 0.01, fmt: v => `${pct(v)} 屏` },
  { label: '运动分辨率下限', path: 'moveMinScale', min: 0.1, max: 1, step: 0.01, fmt: v => `×${v.toFixed(2)}` },
  { label: '运动分辨率上限', path: 'moveMaxScale', min: 0.1, max: 1, step: 0.01, fmt: v => `×${v.toFixed(2)}` },
  { label: '换页柔化', path: 'softTransitions', min: 0, max: 1, step: 1, fmt: v => (v >= 0.5 ? '开（2×2 取样）' : '关') },
  { label: '运动模糊', path: 'motionBlur', min: 0, max: 0.2, step: 0.005, fmt: v => (v > 0 ? `${Math.round(v * 1000)}ms` : '关') },
  { label: '淡入时长', path: 'fadeMs', min: 0, max: 1500, step: 10, fmt: v => `${v}ms` },
  { label: '累积样本数', path: 'maxSamples', min: 1, max: 64, step: 1, fmt: v => `${Math.round(v)} 个` },
  { label: '预渲染算力', path: 'preShare', min: 0, max: 0.9, step: 0.05, fmt: pct },
  { label: '缓存张数', path: 'cacheSize', min: 0, max: 12, step: 1, fmt: v => `${Math.round(v)} 张` },
  { label: '换页过渡时长', path: 'transitionMs', min: 100, max: 4000, step: 50, fmt: v => `${v}ms` },
  { label: '滚动追随', path: 'smoothTime', min: 0.02, max: 2, step: 0.01, fmt: v => `${v.toFixed(2)} 秒` },
]

function get(o: any, path: string): number {
  return path.split('.').reduce((a, k) => a?.[k], o) as number
}
function set(o: any, path: string, v: number) {
  const ks = path.split('.')
  const last = ks.pop()!
  ks.reduce((a, k) => a[k], o)[last] = v
}
function show(c: Ctl, v: number) {
  if (v === undefined || Number.isNaN(v)) return '–'
  return c.fmt ? c.fmt(v) : String(Math.round(v * 1e6) / 1e6)
}
function input(o: any, c: Ctl, e: Event) {
  const v = Number.parseFloat((e.target as HTMLInputElement).value)
  if (Number.isNaN(v)) return
  set(o, c.path, v)
  changed()
}

async function copy(text: string, ok: string) {
  try { await navigator.clipboard.writeText(text); msg.value = ok }
  catch { window.prompt('复制下面的内容：', text) }
  setTimeout(() => { msg.value = '' }, 2500)
}

watch(() => props.pageKey, k => tunePage(k), { immediate: true })
</script>

<template>
  <div class="tuner" :class="{ closed: !open }">
    <header>
      <button class="toggle" type="button" @click="open = !open">{{ open ? '▾' : '▸' }} 背景调节 · {{ pageKey }} · {{ theme === 'dark' ? '深色' : '浅色' }}</button>
      <button type="button" title="关闭调节器" @click="closeTune">×</button>
    </header>
    <div v-if="open" class="body">
      <div class="actions">
        <button type="button" :class="{ on: tune.drag }" @click="tune.drag = !tune.drag">{{ tune.drag ? '拖动中（再点结束）' : '拖动背景' }}</button>
        <button type="button" @click="copy(exportPage(pageKey), '已复制本页参数')">复制本页</button>
        <button type="button" @click="copy(exportAll(), '已复制全部参数（所有页面 + 面板）')">复制全部</button>
        <button type="button" title="把这一帧的每个步骤单独计时，找出最耗时的部分" @click="runProfile">性能分析</button>
      </div>
      <p v-if="tune.drag" class="hint">拖动：移动分形 · 滚轮：缩放（以鼠标为中心）。拖动时页面不能点击。</p>
      <p v-if="msg" class="msg">{{ msg }}</p>
      <div v-if="report" class="report">
        <pre>{{ report }}</pre>
        <div class="actions">
          <button type="button" @click="copy(report, '已复制分析结果')">复制结果</button>
          <button type="button" @click="report = ''">收起</button>
        </div>
      </div>

      <h3>位置</h3>
      <label v-for="c in VIEW" :key="c.path" class="row">
        <span>{{ c.label }}</span>
        <input type="range" :min="c.min" :max="c.max" :step="c.step" :value="get(page, c.path)" @input="input(page, c, $event)">
        <input class="num" type="number" :step="c.step" :value="Number(get(page, c.path).toFixed(6))" @change="input(page, c, $event)">
        <em>{{ show(c, get(page, c.path)) }}</em>
      </label>

      <h3>分形</h3>
      <label v-for="c in SHAPE" :key="c.path" class="row">
        <span>{{ c.label }}</span>
        <input type="range" :min="c.min" :max="c.max" :step="c.step" :value="get(page, c.path)" @input="input(page, c, $event)">
        <input class="num" type="number" :step="c.step" :value="Number(get(page, c.path).toFixed(6))" @change="input(page, c, $event)">
        <em>{{ show(c, get(page, c.path)) }}</em>
      </label>

      <template v-if="post?.enabled">
        <h3>后期（{{ theme === 'dark' ? '深色' : '浅色' }}）</h3>
        <label v-for="c in POST" :key="c.path" class="row">
          <span>{{ c.label }}</span>
          <input type="range" :min="c.min" :max="c.max" :step="c.step" :value="get(post, c.path)" @input="input(post, c, $event)">
          <input class="num" type="number" :step="c.step" :value="Number(get(post, c.path).toFixed(6))" @change="input(post, c, $event)">
          <em>{{ show(c, get(post, c.path)) }}</em>
        </label>
      </template>

      <h3>面板（{{ theme === 'dark' ? '深色' : '浅色' }}，全站）</h3>
      <label v-for="c in PANEL" :key="c.path" class="row">
        <span>{{ c.label }}</span>
        <input type="range" :min="c.min" :max="c.max" :step="c.step" :value="get(panel, c.path)" @input="input(panel, c, $event)">
        <input class="num" type="number" :step="c.step" :value="Number(get(panel, c.path).toFixed(6))" @change="input(panel, c, $event)">
        <em>{{ show(c, get(panel, c.path)) }}</em>
      </label>

      <h3>渲染与性能（全站）</h3>
      <p class="hint">运动中达不到「运动目标帧率」就降分辨率（在上下限之间一档档降）；停下后按「停下目标帧率」补清晰度。想更清晰就提高上限 / 降低目标帧率，想更流畅就反过来。</p>
      <label v-for="c in RENDER" :key="c.path" class="row">
        <span>{{ c.label }}</span>
        <input type="range" :min="c.min" :max="c.max" :step="c.step" :value="get(tune.render, c.path)" @input="input(tune.render, c, $event)">
        <input class="num" type="number" :step="c.step" :value="Number(get(tune.render, c.path).toFixed(6))" @change="input(tune.render, c, $event)">
        <em>{{ show(c, get(tune.render, c.path)) }}</em>
      </label>

      <div class="actions">
        <button type="button" @click="resetPage(pageKey)">本页恢复原值</button>
        <button type="button" @click="resetPanels()">面板恢复原值</button>
        <button type="button" @click="resetRender()">渲染恢复原值</button>
      </div>
      <p class="hint">改动保存在这个浏览器里，换页、刷新都还在；「复制全部」会一起导出 render.json。深色 / 浅色分开调：用导航栏的开关切换主题。完整的配色和后期在 Julia 分形编辑器里调。</p>
    </div>
  </div>
</template>

<style scoped>
.tuner {
  position: fixed;
  top: calc(var(--vp-nav-height, 64px) + 10px);
  right: 10px;
  z-index: 120;
  width: min(340px, calc(100vw - 20px));
  max-height: calc(100vh - var(--vp-nav-height, 64px) - 20px);
  overflow: auto;
  font: 12px/1.5 var(--sl-mono, ui-monospace, monospace);
  color: #efe9fd;
  background: rgba(14, 11, 21, 0.94);
  border: 1px solid rgba(181, 156, 242, 0.4);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}
header { display: flex; position: sticky; top: 0; background: #16121f; border-bottom: 1px solid rgba(181, 156, 242, 0.25); }
header button { background: none; border: none; color: inherit; font: inherit; padding: 8px 10px; cursor: pointer; }
header .toggle { flex: 1; text-align: left; color: #b59cf2; }
.body { padding: 8px 10px 12px; }
h3 { margin: 12px 0 4px; font-size: 11px; letter-spacing: 0.1em; color: #b59cf2; font-weight: 700; }
.row { display: grid; grid-template-columns: 78px 1fr 68px; grid-template-rows: auto auto; gap: 0 6px; align-items: center; margin: 4px 0; }
.row span { color: #a197bd; }
.row em { grid-column: 2 / 4; font-style: normal; color: #6f6690; font-size: 11px; text-align: right; margin-top: -4px; }
.row input[type='range'] { width: 100%; accent-color: #b59cf2; }
.num { width: 100%; background: #0b0910; color: #efe9fd; border: 1px solid rgba(181, 156, 242, 0.3); font: inherit; padding: 1px 4px; }
.actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.actions button { background: #221a34; color: #efe9fd; border: 1px solid rgba(181, 156, 242, 0.35); font: inherit; padding: 4px 8px; cursor: pointer; }
.actions button:hover, .actions button.on { background: #b59cf2; color: #0b0910; }
.hint { color: #6f6690; margin: 6px 0; }
.msg { color: #9be7a8; margin: 4px 0; }
.report pre { margin: 6px 0; padding: 6px; background: #0b0910; border: 1px solid rgba(181, 156, 242, 0.25); white-space: pre-wrap; font-size: 11px; line-height: 1.45; color: #d9d0f0; }
</style>
