/**
 * 首页彩蛋：连点两下首页的方块封面图，周围的组件滑开，露出背景（画面上什么都不加，只有分形）。
 *   - 拖动 / 滑动：实时改变 C，分形跟着变形
 *   - 滚轮 / 双指：缩放（只能稍微放大缩小）
 *   - 摇一摇手机 / 按 R：随机一个新的 Julia 集，能随机的数值全部随机：
 *     迭代的底（普通 z^p + c / Burning Ship）、幂次（正、负、小数）、C、反演、着色模式、内部颜色、
 *     视图（中心、缩放、旋转）、迭代次数、渐变的频率 / 偏移 / 循环；少数时候用著名的 C
 *   - 在画面上快速点两下 / Esc：组件滑回来
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
  const zd = cpow(z, d)
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
    return sum2 / total - mean * mean > 0.015
  }
  // 逃逸次数要有足够的跨度（第 10 到第 90 百分位至少差 2.5 倍），否则画面是一片平涂
  logs.sort((x, y) => x - y)
  const spread = logs.length > 20 ? logs[Math.floor(logs.length * 0.9)] - logs[Math.floor(logs.length * 0.1)] : 0
  return busy / total > 0.12 && inside / total < 0.85 && spread > 1.3
}

/**
 * 自动曝光：粗算画面里逃逸的点，调渐变的 gamma，让它们在渐变上的平均位置在 0.3 左右。
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
  // 二分找 gamma，让整幅画面在渐变上的平均位置在 0.3 左右（渐变从暗到亮，平均位置大致就是平均亮度）。
  // 循环渐变（cycle）时位置会绕回来，没法这样估计，按不循环来算
  const pal0 = p.palette.dark
  const f = pal0.cycle ? 1 : pal0.frequency
  const o = pal0.cycle ? 0 : pal0.offset
  const mean = (g: number) => ts.reduce((acc, t) => acc + Math.min(1, Math.max(0, t ** g * f + o)), 0) / ts.length
  const target = p.mode === 'min' ? 0.38 : 0.3
  let lo = 0.06
  let hi = 2.5
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2
    if (mean(mid) > target) lo = mid
    else hi = mid
  }
  const g = (lo + hi) / 2
  let freq = pal0.frequency
  let off = pal0.offset
  if (pal0.cycle) {
    // 循环渐变：最快逃逸的点（画面外围）在渐变的起点 offset 处，偏移只能取 0–0.12，保证外围是暗的
    off = Math.min(0.12, Math.max(0, off))
  }
  else {
    // 很多点的值接近 1 时（比如最近点模式的外围），gamma 压不下来：把频率也按比例调小
    const m = mean(g)
    if (m > 0.36) freq *= 0.3 / m
  }
  for (const pal of [p.palette.dark, p.palette.light]) {
    pal.gamma = g
    pal.frequency = freq
    pal.offset = off
  }
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const sup = (n: number) => (n < 0 ? '⁻' : '') + String(Math.abs(n)).split('').map(d => SUP[+d]).join('')
const cStr = (c: Cx) => `${c[0].toFixed(4)} ${c[1] < 0 ? '−' : '+'} ${Math.abs(c[1]).toFixed(4)}i`

type Inside = FractalPage['palette']['dark']['insideMode']

/** 生成一个页面：配色用友链页那套（色标在整个渐变上均匀分布），关掉红蓝分光，压低曝光和光晕（亮度交给 autoLevel） */
function makePage(o: {
  kind: FractalPage['kind']
  power: number
  inverse: boolean
  mode: FractalPage['mode']
  iterations: number
  c: Cx
  view: FractalPage['view']
  inside: Inside
  frequency: number
  offset: number
  cycle: boolean
}): FractalPage {
  const base = fractalPages.friends
  const palette = JSON.parse(JSON.stringify(base.palette)) as FractalPage['palette']
  for (const t of [palette.dark, palette.light]) {
    t.insideMode = o.inside
    t.frequency = o.frequency
    t.offset = o.offset
    t.cycle = o.cycle
    if (t.post) {
      t.post.chroma = 0
      t.post.exposure = Math.min(t.post.exposure, 0.15)
      t.post.bloom.intensity = Math.min(t.post.bloom.intensity, 0.7)
    }
  }
  return {
    ...base,
    kind: o.kind,
    set: 'julia',
    mode: o.mode,
    iterations: o.iterations,
    power: o.power,
    inverse: o.inverse,
    c: o.c,
    view: o.view,
    scroll: { speed: 0, parallax: 0 },
    veil: 0,
    palette,
  }
}

/**
 * 随机一个幂次：多数是整数 2–8，也有负数（−2 到 −6）和小数。
 * 小数幂次用复数的主辐角，画面里会有一条笔直的分界线（数学上本来就是这样），所以少一点
 */
function randomPower(): number {
  const r = Math.random()
  if (r < 0.68) return pick([2, 2, 2, 3, 3, 4, 4, 5, 6, 7, 8])
  if (r < 0.86) return -pick([2, 2, 3, 3, 4, 5, 6])
  return Math.round(rand(1.5, 8) * 100) / 100
}

/** 随机生成一个 Julia 集（不够热闹就重来，最多 16 次） */
function generate(): FractalPage {
  let page: FractalPage | null = null
  for (let tries = 0; tries < 16; tries++) {
    const kind: FractalPage['kind'] = Math.random() < 0.3 ? 'ship' : 'mandelbrot'
    let power = randomPower()
    let c: Cx
    const famous = kind === 'mandelbrot' && Math.random() < 0.15
    if (famous) {
      // 少数时候用著名的 C
      const p = Math.random() < 0.5 ? pick(CLASSICS) : pick(juliaPresets)
      c = [p.c[0], p.c[1]]
      power = p.power
    }
    else if (kind === 'mandelbrot' && power > 1) {
      // C 取在主体边界附近（往里是「胖」的集合，往外是尘埃状）
      c = boundaryC(power, [0.94, 1.06])
    }
    else {
      // Burning Ship 底、负数幂次：边界没有公式，在一个范围里随机，由 lively 挑
      c = [rand(-1.8, 1.2), rand(-1.5, 1.5)]
    }
    const inverse = Math.random() < 0.35
    const mode: FractalPage['mode'] = Math.random() < (power < 0 ? 0.45 : 0.04) ? 'min' : 'escape'
    const inside: Inside = power < 0 || mode === 'min'
      ? pick<Inside>(['min', 'min', 'angle'])
      : pick<Inside>(['solid', 'solid', 'solid', 'min', 'angle'])
    const cycle = Math.random() < 0.4
    const view = {
      x: inverse ? rand(-0.4, 0.4) : rand(-0.6, 0.6),
      y: inverse ? rand(-0.4, 0.4) : rand(-0.6, 0.6),
      zoom: inverse ? rand(-1.6, -0.6) : rand(-0.2, 1.6),
      rotate: rand(0, 360),
    }
    page = makePage({
      kind,
      power,
      inverse,
      mode,
      iterations: Math.round(rand(160, 360)),
      c,
      view,
      inside,
      frequency: cycle ? rand(1, 3) : rand(0.8, 1.3),
      offset: cycle ? rand(0, 0.12) : rand(-0.05, 0.1),
      cycle,
    })
    if (lively(page)) break
  }
  return page!
}

/** 显示用的名字（调试信息里能看到） */
function describe(p: FractalPage): string {
  const pw = Number.isInteger(p.power) ? sup(p.power) : `^${p.power}`
  return `${p.kind === 'ship' ? 'Burning Ship ' : ''}Julia：z${pw} + (${cStr(p.c)})${p.inverse ? '，反演' : ''}${p.mode === 'min' ? '，最近点' : ''}`
}

/** 换一个 */
export function randomize() {
  const page = generate()
  autoLevel(page)
  egg.page = page
  egg.name = describe(page)
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
  const k = 0.25 / Math.max(1, Math.abs(p.power) - 1)
  p.c = [p.c[0] + dx * k, p.c[1] - dy * k]
  egg.version++
}

/** 缩放：只能在打开时的缩放附近（往里 2 级、往外 1 级） */
export function zoomBy(dz: number) {
  const p = egg.page
  if (!p) return
  p.view.zoom = Math.min(egg.baseZoom + 2, Math.max(egg.baseZoom - 1, p.view.zoom + dz))
  egg.version++
}
