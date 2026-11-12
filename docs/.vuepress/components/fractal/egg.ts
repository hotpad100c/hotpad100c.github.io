/**
 * 首页彩蛋：连点两下首页的方块封面图，周围的组件滑开，露出背景。
 *   - 拖动 / 滑动：实时改变 C，分形跟着变形
 *   - 滚轮 / 双指：缩放（只能稍微放大缩小）
 *   - 摇一摇手机 / 按 R / 点「换一个」：随机一个新的分形（约三成是著名的 Julia 集；其余随机：Julia、
 *     Mandelbrot / Multibrot 放大、Burning Ship 及其 Julia 集、负数幂次，有时反演）
 *   - Mandelbrot / Burning Ship 集本身没有可变的 C，拖动改为平移
 *   - Esc / 点「返回」：组件滑回来
 * 状态放在这里；交互和画面在 FractalBackground.vue，组件滑开的样式在 styles/fractal.css（html.fx-egg）。
 */
import { reactive } from 'vue'
import type { FractalPage } from './fractalPages'
import { fractalPages, juliaPresets } from './fractalPages'

export const egg = reactive({
  active: false,
  /** 当前的分形；换一个时整个替换（背景会平滑过渡过去），拖动 / 缩放时原地修改并让 version 加一 */
  page: null as FractalPage | null,
  name: '',
  /** 打开时的缩放，缩放只能在它附近 */
  baseZoom: 0,
  version: 0,
})

/** 几个最有名的 Julia 集（反演后更好看的用反演） */
const CLASSICS: { name: string, c: [number, number], power: number, inverse: boolean, zoom: number }[] = [
  { name: '杜阿迪兔子', c: [-0.123, 0.745], power: 2, inverse: true, zoom: -1.1 },
  { name: 'Basilica', c: [-1, 0], power: 2, inverse: true, zoom: -1.1 },
  { name: 'San Marco', c: [-0.75, 0], power: 2, inverse: true, zoom: -1.1 },
  { name: '飞机', c: [-1.7549, 0], power: 2, inverse: false, zoom: 0.4 },
  { name: '树枝（c = i）', c: [0, 1], power: 2, inverse: false, zoom: 0.6 },
  { name: '-0.8 + 0.156i', c: [-0.8, 0.156], power: 2, inverse: false, zoom: 0.9 },
  { name: '0.285 + 0.01i', c: [0.285, 0.01], power: 2, inverse: false, zoom: 0.9 },
]

const rand = (a: number, b: number) => a + Math.random() * (b - a)
function pick<T>(xs: T[]): T { return xs[Math.floor(Math.random() * xs.length)] }

type Cx = [number, number]
const mul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]
function ipow(z: Cx, n: number): Cx {
  let r: Cx = [1, 0]
  for (let i = 0; i < n; i++) r = mul(r, z)
  return r
}
/** 与着色器相同的复数乘方（整数幂连乘，负数 / 小数幂用极坐标） */
function cpow(z: Cx, p: number): Cx {
  if (Number.isInteger(p) && p >= 1 && p <= 16) return ipow(z, p)
  const r2 = z[0] * z[0] + z[1] * z[1]
  if (r2 === 0) return p > 0 ? [0, 0] : [1e10, 0]
  const a = Math.atan2(z[1], z[0]) * p
  const m = r2 ** (0.5 * p)
  return [m * Math.cos(a), m * Math.sin(a)]
}

/**
 * 边界上的点：z^d + c 主体（吸引不动点的那一块）的边界。
 * 不动点 z 满足 |d·z^(d−1)| = 1，即 z = (e^{iφ}/d)^{1/(d−1)}，c = z − z^d。
 * 幂次 2 时，有时改用左边那个圆（周期 2）的边界：c = −1 + e^{iφ}/4。
 * 用作 Julia 集的 C（再往里 / 往外挪一点：往里是「胖」的集合，往外是尘埃状），
 * 或者 Mandelbrot 集放大的中心（边界附近的细节最多）。
 */
function boundaryC(d: number, jitter: [number, number]): Cx {
  const k = rand(jitter[0], jitter[1])
  if (d === 2 && Math.random() < 0.3) {
    const phi = rand(0, Math.PI * 2)
    return [-1 + Math.cos(phi) / 4 * k, Math.sin(phi) / 4 * k]
  }
  const phi = rand(0, Math.PI * 2)
  const r = (1 / d) ** (1 / (d - 1))
  const a = phi / (d - 1)
  const z: Cx = [r * Math.cos(a), r * Math.sin(a)]
  const zd = ipow(z, d)
  return [(z[0] - zd[0]) * k, (z[1] - zd[1]) * k]
}

/** 与着色器相同的一次迭代：返回逃逸次数（没逃逸为 max）和离原点最近的距离² */
function orbit(p: FractalPage, x: number, y: number, max: number): [number, number] {
  if (p.inverse) { const dd = x * x + y * y || 1e-12; x = x / dd; y = -y / dd }
  let z: Cx
  let c: Cx
  if (p.set === 'mandel') { c = [x, y]; z = p.power > 0 ? [0, 0] : [x, y] }
  else { z = [x, y]; c = p.c }
  let minR = 1e20
  for (let n = 0; n < max; n++) {
    if (p.kind === 'ship') z = [Math.abs(z[0]), -Math.abs(z[1])]
    z = cpow(z, p.power)
    z = [z[0] + c[0], z[1] + c[1]]
    const m2 = z[0] * z[0] + z[1] * z[1]
    if (!(m2 < 1e8)) return [n, minR]
    minR = Math.min(minR, m2)
  }
  return [max, minR]
}

/**
 * 在 CPU 上粗算一遍（48 × 30 个点），看画面是不是够「热闹」：
 * 逃逸时间模式：不能几乎全是很快逃逸的空白，也不能几乎全是内部；
 * 最近点模式：颜色不能几乎都一样
 */
function lively(p: FractalPage): boolean {
  const W = 48
  const H = 30
  const scale = 3.2 / 2 ** p.view.zoom
  const a = p.view.rotate * Math.PI / 180
  let busy = 0
  let inside = 0
  let sum = 0
  let sum2 = 0
  const logs: number[] = []
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const qx = (i + 0.5 - W / 2) / H
      const qy = (j + 0.5 - H / 2) / H
      const x = (Math.cos(a) * qx - Math.sin(a) * qy) * scale + p.view.x
      const y = (Math.sin(a) * qx + Math.cos(a) * qy) * scale + p.view.y
      const [n, minR] = orbit(p, x, y, 120)
      if (n >= 120) inside++
      else { if (n >= 4) busy++; logs.push(Math.log2(n + 1)) }
      const t = 1 - Math.exp(-Math.sqrt(Math.sqrt(minR)) * 1.5)
      sum += t
      sum2 += t * t
    }
  }
  const total = W * H
  if (p.mode === 'min') {
    const mean = sum / total
    return sum2 / total - mean * mean > 0.006
  }
  // 逃逸次数要有足够的跨度（第 10 到第 90 百分位至少差 2.5 倍），否则画面是一片平涂
  logs.sort((x, y) => x - y)
  const spread = logs.length > 20 ? logs[Math.floor(logs.length * 0.9)] - logs[Math.floor(logs.length * 0.1)] : 0
  return busy / total > 0.12 && inside / total < 0.85 && spread > 1.3
}

/**
 * 自动曝光：粗算画面里逃逸的点，把渐变的 gamma 调到「三成多的点落在渐变 0.4 以上」。
 * 不同的分形逃逸次数差别很大（有的几次就逃逸，有的要上百次），固定的 gamma 会让很多画面几乎全黑
 */
function autoLevel(p: FractalPage) {
  const W = 40
  const H = 25
  const scale = 3.2 / 2 ** p.view.zoom
  const a = p.view.rotate * Math.PI / 180
  const ts: number[] = []
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const qx = (i + 0.5 - W / 2) / H
      const qy = (j + 0.5 - H / 2) / H
      const [n, minR] = orbit(p, (Math.cos(a) * qx - Math.sin(a) * qy) * scale + p.view.x, (Math.sin(a) * qx + Math.cos(a) * qy) * scale + p.view.y, p.iterations)
      if (p.mode === 'min') ts.push(1 - Math.exp(-Math.sqrt(Math.sqrt(minR)) * 1.5))
      else if (n < p.iterations) ts.push((n + 1) / p.iterations)
    }
  }
  if (ts.length < 20) return
  ts.sort((x, y) => x - y)
  // 取偏亮的那部分（第 65 百分位）对齐到渐变的 0.4
  const q = Math.min(0.98, Math.max(1e-4, ts[Math.floor(ts.length * 0.65)]))
  const g = Math.min(1.2, Math.max(0.1, Math.log(0.4) / Math.log(q)))
  for (const pal of [p.palette.dark, p.palette.light]) {
    pal.gamma = g
    pal.frequency = 1
    pal.offset = 0
    pal.cycle = false
  }
}

/** 在一个范围里找一个「边界附近」的点（逃逸得不快不慢）作为放大的中心 */
function edgePoint(p: FractalPage, box: [number, number, number, number]): Cx | null {
  for (let k = 0; k < 400; k++) {
    const x = rand(box[0], box[2])
    const y = rand(box[1], box[3])
    const [n] = orbit(p, x, y, 256)
    if (n >= 24 && n < 256) return [x, y]
  }
  return null
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const sup = (n: number) => (n < 0 ? '⁻' : '') + String(Math.abs(n)).split('').map(d => SUP[+d]).join('')
const cStr = (c: Cx) => `${c[0].toFixed(4)} ${c[1] < 0 ? '−' : '+'} ${Math.abs(c[1]).toFixed(4)}i`

function makePage(o: { c: Cx, power: number, inverse: boolean, zoom: number, rotate: number, x?: number, y?: number, set?: 'julia' | 'mandel', kind?: 'mandelbrot' | 'ship', mode?: 'escape' | 'min' }): FractalPage {
  // 用友链页的配色：色标在整个渐变上均匀分布，适合各种分形（再由 autoLevel 调 gamma）
  const base = fractalPages.friends
  return {
    ...base,
    kind: o.kind ?? 'mandelbrot',
    set: o.set ?? 'julia',
    mode: o.mode ?? 'escape',
    iterations: 256,
    power: o.power,
    inverse: o.inverse,
    c: o.c,
    view: { x: o.x ?? 0, y: o.y ?? 0, zoom: o.zoom, rotate: o.rotate },
    scroll: { speed: 0, parallax: 0 },
    veil: 0,
    palette: tamePalette(base.palette, o.power < 0 || o.mode === 'min'),
  }
}

/** 彩蛋用的配色：曝光、光晕压低一点（交给 autoLevel 调亮度）；负数幂次 / 最近点模式的内部也按最近点着色，不然一片黑 */
function tamePalette(src: FractalPage['palette'], minInside: boolean): FractalPage['palette'] {
  const pal = JSON.parse(JSON.stringify(src)) as FractalPage['palette']
  for (const t of [pal.dark, pal.light]) {
    if (minInside) t.insideMode = 'min'
    if (t.post) {
      t.post.exposure = Math.min(t.post.exposure, 0.15)
      t.post.bloom.intensity = Math.min(t.post.bloom.intensity, 0.7)
    }
  }
  return pal
}

/** 随机生成一种（不够热闹就重来，最多 12 次） */
function generate(): { page: FractalPage, name: string } {
  const r = Math.random()
  // 著名的 Julia 集
  if (r < 0.28) {
    if (Math.random() < 0.5) {
      const p = pick(CLASSICS)
      return { page: makePage({ c: p.c, power: p.power, inverse: p.inverse, zoom: p.zoom, rotate: rand(-30, 30) }), name: p.name }
    }
    const p = pick(juliaPresets)
    return { page: makePage({ c: p.c, power: p.power, inverse: p.inverse, zoom: p.view.zoom, rotate: rand(-30, 30), x: p.view.x, y: p.view.y }), name: p.name }
  }
  let best: { page: FractalPage, name: string } | null = null
  for (let tries = 0; tries < 12; tries++) {
    let page: FractalPage
    let name: string
    const inv = Math.random() < 0.3
    const rot = rand(0, 360)
    if (r < 0.52) {
      // 随机 Julia 集：z^d + c，c 取在主体边界附近
      const d = pick([2, 2, 2, 3, 3, 4, 5, 6])
      const c = boundaryC(d, [0.96, 1.05])
      page = makePage({ c, power: d, inverse: inv, zoom: inv ? rand(-1.4, -0.9) : rand(0.4, 1.0), rotate: rot })
      name = `Julia：z${sup(d)} + (${cStr(c)})`
    }
    else if (r < 0.68) {
      // Mandelbrot / Multibrot 集：放大到边界上的某一点
      const d = pick([2, 2, 2, 3, 4, 5])
      if (Math.random() < 0.2) {
        page = makePage({ c: [0, 0], power: d, inverse: true, zoom: rand(-1.6, -0.8), rotate: rot, set: 'mandel', x: rand(-0.3, 0.3), y: rand(-0.3, 0.3) })
        name = `Mandelbrot${d === 2 ? '' : `（z${sup(d)}）`}：反演`
      }
      else {
        const ctr = boundaryC(d, [0.995, 1.005])
        page = makePage({ c: [0, 0], power: d, inverse: false, zoom: rand(2, 6), rotate: rot, set: 'mandel', x: ctr[0], y: ctr[1] })
        name = `Mandelbrot${d === 2 ? '' : `（z${sup(d)}）`}：放大到 ${cStr(ctr)}`
      }
    }
    else if (r < 0.86) {
      // Burning Ship：集合本身放大到船身边缘，或者它的 Julia 集
      if (Math.random() < 0.55) {
        page = makePage({ c: [0, 0], power: 2, inverse: false, zoom: 0, rotate: 0, set: 'mandel', kind: 'ship' })
        const ctr = edgePoint(page, [-2, -2, 1, 1])
        if (ctr) { page.view.x = ctr[0]; page.view.y = ctr[1]; page.view.zoom = rand(1.5, 5) }
        else { page.view.x = -0.45; page.view.y = -0.5; page.view.zoom = 0.3 }
        name = `Burning Ship：放大到 ${cStr([page.view.x, page.view.y])}`
      }
      else {
        const c: Cx = [rand(-1.9, 0.6), rand(-1.2, 0.6)]
        page = makePage({ c, power: pick([2, 2, 3]), inverse: inv, zoom: inv ? rand(-1.4, -0.9) : rand(0.2, 0.9), rotate: rot, kind: 'ship' })
        name = `Burning Ship Julia：c = ${cStr(c)}${page.power === 2 ? '' : `，z${sup(page.power)}`}`
      }
    }
    else {
      // 负数幂次：z^(−d) + c，配最近点着色更好看
      const d = pick([-2, -2, -3, -4, -5])
      const c: Cx = [rand(-1, 1), rand(-1, 1)]
      const mode = Math.random() < 0.6 ? 'min' : 'escape'
      page = makePage({ c, power: d, inverse: inv, zoom: rand(-0.6, 0.8), rotate: rot, mode })
      name = `负幂：z${sup(d)} + (${cStr(c)})${mode === 'min' ? '，最近点着色' : ''}`
    }
    if (inv && page.set !== 'mandel' && !name.includes('反演')) name += '，反演'
    best = { page, name }
    if (lively(page)) break
  }
  return best!
}

/** 换一个：大约三成是著名的 Julia 集，其余随机（Julia、Mandelbrot、Burning Ship、负数幂次，可能反演） */
export function randomize() {
  const { page, name } = generate()
  autoLevel(page)
  egg.page = page
  egg.name = name
  egg.baseZoom = page.view.zoom
}

export function openEgg() {
  if (egg.active) return
  randomize()
  egg.active = true
  document.documentElement.classList.add('fx-egg', 'fx-egg-anim')
}

let animTimer = 0
export function closeEgg() {
  if (!egg.active) return
  egg.active = false
  document.documentElement.classList.remove('fx-egg')
  // 滑回来的动画放完再去掉过渡样式（平时不影响导航栏等组件自己的过渡）
  clearTimeout(animTimer)
  animTimer = window.setTimeout(() => { if (!egg.active) document.documentElement.classList.remove('fx-egg-anim') }, 1400)
}

/** 拖动：C 跟着手指移动（dx, dy 为屏幕上的位移，单位是屏幕短边的比例） */
export function nudgeC(dx: number, dy: number) {
  const p = egg.page
  if (!p) return
  if (p.set === 'mandel') {
    // Mandelbrot / Burning Ship 集本身没有可变的 C：拖动改为平移画面
    const s = 3.2 / 2 ** p.view.zoom
    const a = p.view.rotate * Math.PI / 180
    p.view.x -= (Math.cos(a) * dx + Math.sin(a) * dy) * s
    p.view.y -= (Math.sin(a) * dx - Math.cos(a) * dy) * s
  }
  else {
    const k = 0.25 / Math.max(1, Math.abs(p.power) - 1)
    p.c = [p.c[0] + dx * k, p.c[1] - dy * k]
  }
  egg.version++
}

/** 缩放：只能在打开时的缩放附近（往里 2 级、往外 1 级） */
export function zoomBy(dz: number) {
  const p = egg.page
  if (!p) return
  p.view.zoom = Math.min(egg.baseZoom + 2, Math.max(egg.baseZoom - 1, p.view.zoom + dz))
  egg.version++
}
