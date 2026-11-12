/**
 * 分形背景的 WebGL 渲染器。计算方式与 Julia 分形编辑器一致：
 * 同样的参数（fractalPages.ts 里从编辑器导出的数据）画出来的图一样。
 *
 * 画的是一个 Frame：某个页面在某个主题下的参数。换页 / 换主题时，Frame 由 transition.ts 插值得到
 * （配色用着色器里的第二套配色 pal2 按 palMix 混合）。
 *
 * 每帧的计算量由调用方给的 budget（像素数）决定，使每帧都在一帧时间之内：
 *   - 运动中（滚动、换页过渡、拖动）：按 budget 降低分辨率画一帧（带亚像素抖动），
 *     平滑放大后与上一帧按 blend 混合：既是运动模糊，也把低分辨率的锯齿抹平。
 *   - 停下后：按全分辨率在屏幕外（pre）逐帧累积样本（渐进超采样，最多 MAX_SAMPLES 个）。
 *     一个样本的全屏计算量超过 budget 时分成几条横带，几帧画完，画完再整幅更新到屏幕
 *     （第一个样本用 FADE_MS 淡入），不会卡住页面，也看不到一条一条的扫描。
 *   - 停下后的画面是确定的，所以换页过渡中分一部分算力先在 pre 里画它；
 *     停下时接着画，已经画好的直接淡入。画清晰的画面还会缓存几张，回到同一页时立刻清晰。
 */
import { FS_BLUR, FS_BRIGHT, FS_COMP, FS_COPY, FS_STREAK, VS, VS2, fractalFS } from './shaders'
import type { Variant } from './shaders'
import type { FractalPage, Palette, PostFx } from './fractalPages'

type Target = { tex: WebGLTexture, fb: WebGLFramebuffer, w: number, h: number }
type Uniforms = Record<string, number | number[]>

/** 画一帧需要的全部参数 */
export interface Frame {
  kind: FractalPage['kind']
  power: number
  inverse: boolean
  mode: FractalPage['mode']
  iterations: number
  c: [number, number]
  view: FractalPage['view']
  scroll: FractalPage['scroll']
  veil: number
  /** 遮罩颜色（页面底色，随主题） */
  veilColor: [number, number, number]
  pal: Palette
  /** 第二套配色与混合比例（0 = 只用 pal） */
  pal2?: Palette
  palMix: number
  post?: PostFx
}

export function frameOf(page: FractalPage, theme: 'dark' | 'light'): Frame {
  const pal = page.palette[theme]
  const veilColor: [number, number, number] = theme === 'light' ? [239, 233, 251] : [11, 9, 16]
  return { ...page, veilColor, pal, palMix: 0, post: pal.post }
}

const PAL_UNIFORMS = ['uStops', 'uPos', 'uCount', 'uInside', 'uInsideMode', 'uGamma', 'uFreq', 'uOffset', 'uCycle']
const FRACTAL_UNIFORMS = ['uRes', 'uCenter', 'uScale', 'uRot', 'uC', 'uIter', 'uPower', 'uShip', 'uInv', 'uMandel', 'uMode', 'uPalMix', 'uAA', 'uJitter',
  ...PAL_UNIFORMS, ...PAL_UNIFORMS.map(n => `${n}2`)]
const INT_UNIFORMS = new Set(['type'])
export const MAX_SAMPLES = 16
/** 运动时可用的分辨率比例（一档一档地降，不连续变化） */
const SCALE_STEPS = [1, 0.85, 0.72, 0.6, 0.5, 0.42, 0.35]
/** 停下后，从运动时的低分辨率画面淡入到全分辨率画面的时长 */
const FADE_MS = 350
/** 运动中分给「预先画终点画面」的算力比例 */
const PRE_SHARE = 0.4
/** 缓存几张画清晰的画面（每张是一整屏的贴图） */
const CACHE_SIZE = 4

/** Halton 序列（2, 3）：均匀分布的亚像素偏移 */
export function halton(i: number, b: number) {
  let f = 1
  let r = 0
  while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b) }
  return r
}
/** 高斯模糊的 σ（1/4 分辨率的像素）：光晕 = BLOOM_SIGMA × 半径；柔焦固定。大小与原来的两轮模糊相当 */
const BLOOM_SIGMA = 3.67
const SOFT_SIGMA = 3.3
/** 需要记录轨道离原点最近的距离吗（最近点模式，或内部不是纯色） */
function needMinR(mode: FractalPage['mode'], pal: Palette) {
  return mode === 'min' || pal.insideMode !== 'solid'
}

const STREAK_TYPES: Record<string, number> = { none: 0, rotate: 1, zoom: 2, spiral: 3 }

export function hex(h: string): [number, number, number] {
  let s = String(h).replace('#', '')
  if (s.length === 3) s = s.replace(/./g, '$&$&')
  return [Number.parseInt(s.slice(0, 2), 16) / 255, Number.parseInt(s.slice(2, 4), 16) / 255, Number.parseInt(s.slice(4, 6), 16) / 255]
}

/** 缩放用 2 的幂：zoom = 0 时视野高 3.2 个单位 */
export const zoomToScale = (z: number): number => 3.2 / 2 ** z

/**
 * 滚动后的 C 与视图中心（与编辑器的「模拟滚动」一致）：
 *   C 绕原点旋转 speed° / 1000px；视图中心随滚动平移，用 tanh 限制在一个范围内。
 */
export function effective(f: Frame, scroll: number, viewportH: number) {
  const a = (scroll / 1000) * f.scroll.speed * Math.PI / 180
  const c: [number, number] = [f.c[0] * Math.cos(a) - f.c[1] * Math.sin(a), f.c[0] * Math.sin(a) + f.c[1] * Math.cos(a)]
  const scale = zoomToScale(f.view.zoom)
  const k = Math.tanh((scroll / Math.max(viewportH, 1)) * f.scroll.parallax)
  return { c, cx: f.view.x + k * scale * 0.12, cy: f.view.y - k * scale * 0.22, scale }
}

/** 画布尺寸与滚动：w / h 是画布像素，scale 是画布像素 / CSS 像素；scroll、viewportH 用 CSS 像素 */
export interface View { w: number, h: number, scale: number, scroll: number, viewportH: number }

export interface DrawOptions {
  /** 画面在动：降低分辨率并做运动模糊 */
  moving: boolean
  /** 画面参数变了，停下时从头累积 */
  reset: boolean
  /** 这一帧最多算多少个像素 */
  budget: number
  /** 运动中新一帧所占的比例（越小拖影越长） */
  blend: number
  /** 此刻画面的标识（页面、主题、参数版本、滚动位置、尺寸）：停下时用来找预先画好的画面 */
  key?: string
  /** 换页过渡中：低分辨率时用「再低一半 + 2×2 取样」换取柔和（整幅画面都在变，碎点最明显） */
  soft?: boolean
  /** 运动中顺便在屏幕外预先画「停下后的画面」（换页过渡的终点） */
  pre?: { key: string, f: Frame, v: View }
}

export class FractalRenderer {
  readonly gl: WebGLRenderingContext
  private fractal!: WebGLProgram
  private L: Record<string, WebGLUniformLocation | null> = {}
  /** 每个整数幂次一个专用的着色器（'f' 是通用的） */
  private variants = new Map<string, { prog: WebGLProgram, L: Record<string, WebGLUniformLocation | null> }>()
  private bright: WebGLProgram
  private blur: WebGLProgram
  private streak: WebGLProgram
  private comp: WebGLProgram
  private copy: WebGLProgram
  private targets: Record<string, Target> = {}
  /** 已累积的样本数 */
  samples = 0
  /** 停下后正在画的样本已经画到第几行 */
  private band = 0
  /** 第一个全分辨率样本开始淡入的时间（-1：没有在淡入） */
  private fadeStart = -1
  private fadeE = 0
  /** 淡入完成后算作已累积几个样本 */
  private fadeTo = 1
  /** acc 里是否已经有画面 */
  private valid = false
  /** 运动中的分辨率档位 */
  private inMotion = false
  private stepIdx = 0
  private stepTime = 0
  /** 上一帧运动时的分辨率比例（调试用） */
  lastScale = 1
  private locs = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>()

  /** 不支持 WebGL 或着色器编译失败时抛出异常 */
  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' })
    if (!gl) throw new Error('WebGL unavailable')
    this.gl = gl
    this.bright = this.program(VS2, FS_BRIGHT)
    this.blur = this.program(VS2, FS_BLUR)
    this.streak = this.program(VS2, FS_STREAK)
    this.comp = this.program(VS2, FS_COMP)
    this.copy = this.program(VS2, FS_COPY)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    this.useVariant({ power: null, ship: false, minR: true, aa: 1 })
  }

  private program(vs: string, fs: string): WebGLProgram {
    const gl = this.gl
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader')
      return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs))
    gl.bindAttribLocation(p, 0, 'a')
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link')
    return p
  }

  /** 选用某个专用的分形着色器（第一次用到时编译） */
  private useVariant(o: Variant) {
    const power = Number.isInteger(o.power) && o.power! >= 2 && o.power! <= 16 ? o.power : null
    const key = `${power ?? 'f'}|${+o.ship}|${+o.minR}|${o.aa}`
    let v = this.variants.get(key)
    if (!v) {
      const prog = this.program(VS, fractalFS({ ...o, power }))
      const L: Record<string, WebGLUniformLocation | null> = {}
      for (const n of FRACTAL_UNIFORMS) L[n] = this.gl.getUniformLocation(prog, n)
      v = { prog, L }
      this.variants.set(key, v)
    }
    this.fractal = v.prog
    this.L = v.L
  }

  /** 等着在空闲时编译的着色器 */
  private pending: Variant[] = []

  /** 记下这些页面要用的着色器，之后用 prepareStep() 在空闲时一个个编译好（换页时不会因为编译卡一下） */
  prepare(pages: FractalPage[]) {
    for (const p of pages) {
      for (const pal of [p.palette.dark, p.palette.light]) {
        const o = { ship: p.kind === 'ship', minR: needMinR(p.mode, pal) }
        for (const aa of [1, 2] as const) {
          this.pending.push({ power: p.power, aa, ...o }, { power: null, aa, ...o })
        }
      }
    }
  }

  /** 编译一个还没编译的着色器；全部编译完返回 false */
  prepareStep(): boolean {
    const keep = { fractal: this.fractal, L: this.L }
    while (this.pending.length) {
      const before = this.variants.size
      this.useVariant(this.pending.shift()!)
      if (this.variants.size > before) break
    }
    this.fractal = keep.fractal
    this.L = keep.L
    return this.pending.length > 0
  }

  private loc(p: WebGLProgram, name: string) {
    let m = this.locs.get(p)
    if (!m) this.locs.set(p, (m = new Map()))
    if (!m.has(name)) m.set(name, this.gl.getUniformLocation(p, name))
    return m.get(name)!
  }

  /** 渲染目标（贴图 + 帧缓冲），尺寸变了才重建 */
  private target(name: string, w: number, h: number): Target {
    const gl = this.gl
    const old = this.targets[name]
    if (old && old.w === w && old.h === h) return old
    if (old) { gl.deleteTexture(old.tex); gl.deleteFramebuffer(old.fb) }
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const fb = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    return (this.targets[name] = { tex, fb, w, h })
  }

  private pass(p: WebGLProgram, out: Target | null, uniforms: Uniforms, inputs: [string, Target][]) {
    const gl = this.gl
    gl.useProgram(p)
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null)
    gl.viewport(0, 0, out ? out.w : this.canvas.width, out ? out.h : this.canvas.height)
    inputs.forEach(([name, t], i) => {
      gl.activeTexture(gl.TEXTURE0 + i)
      gl.bindTexture(gl.TEXTURE_2D, t.tex)
      gl.uniform1i(this.loc(p, name), i)
    })
    for (const [k, v] of Object.entries(uniforms)) {
      const l = this.loc(p, k)
      if (Array.isArray(v)) (v.length === 2 ? gl.uniform2fv : gl.uniform3fv).call(gl, l, v)
      else if (INT_UNIFORMS.has(k)) gl.uniform1i(l, v)
      else gl.uniform1f(l, v)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  private setPalette(pal: Palette, suffix: '' | '2') {
    const gl = this.gl
    const L = (n: string) => this.L[n + suffix]
    const stops = pal.stops.slice().sort((a, b) => a[1] - b[1]).slice(0, 8)
    const cols: number[] = []
    const pos: number[] = []
    for (let i = 0; i < 8; i++) {
      const s = stops[Math.min(i, stops.length - 1)]
      cols.push(...hex(s[0]))
      pos.push(s[1])
    }
    gl.uniform3fv(L('uStops'), new Float32Array(cols))
    gl.uniform1fv(L('uPos'), new Float32Array(pos))
    gl.uniform1i(L('uCount'), stops.length)
    gl.uniform3fv(L('uInside'), hex(pal.inside))
    gl.uniform1i(L('uInsideMode'), ({ solid: 0, min: 1, angle: 2 } as Record<string, number>)[pal.insideMode] ?? 0)
    gl.uniform1f(L('uGamma'), pal.gamma)
    gl.uniform1f(L('uFreq'), pal.frequency)
    gl.uniform1f(L('uOffset'), pal.offset)
    gl.uniform1i(L('uCycle'), pal.cycle ? 1 : 0)
  }

  /**
   * 画一帧。返回 true 表示还要继续画（调用方应在下一帧再调用一次）。
   */
  draw(f: Frame, v: View, o: DrawOptions): boolean {
    const gl = this.gl
    const { w, h } = v
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
      this.valid = false
    }
    const acc = this.target('acc', w, h)
    if (!this.valid) this.restart()
    let more = true
    /** acc 这一帧有没有变（没变就不用重新输出到屏幕） */
    let changed = true
    if (o.moving || !this.valid) {
      // 有要预先画的终点画面时，分 PRE_SHARE 的算力给它，其余给运动中的画面
      const pre = o.pre && this.valid ? o.pre : undefined
      const budget = pre ? o.budget * (1 - PRE_SHARE) : o.budget
      // 低分辨率画进 smp 的左下角，再用三次 B 样条平滑放大，混合进 acc。
      // 分辨率在一次运动中只会往下调（且隔一段时间才调一档），不会每帧变来变去；取样位置也固定，画面不会抖
      const want = Math.sqrt(budget / (w * h))
      const now = performance.now()
      if (!this.inMotion) {
        this.stepIdx = SCALE_STEPS.findIndex(x => x <= want * 1.0001)
        if (this.stepIdx < 0) this.stepIdx = SCALE_STEPS.length - 1
        this.inMotion = true
        this.stepTime = now
      }
      else if (want < SCALE_STEPS[this.stepIdx] * 0.8 && this.stepIdx < SCALE_STEPS.length - 1 && now - this.stepTime > 400) {
        this.stepIdx++
        this.stepTime = now
      }
      const s = SCALE_STEPS[this.stepIdx]
      this.lastScale = s
      // 换页过渡中分辨率低时改为「再低一半 + 每像素 2×2 取样」：计算量相同，但每个像素是 4 个点的平均，
      // 细节不会变成一颗颗闪烁的噪点，放大后是柔和的模糊。同页滚动时画面变化慢，保持清晰（不这样做）
      const aa = o.soft && s < 0.85 ? 2 : 1
      const sw = Math.max(1, Math.round(w * s / aa))
      const sh = Math.max(1, Math.round(h * s / aa))
      const smp = this.target('smp', w, h)
      this.drawFractal(f, v, smp, sw, sh, [0, 0], aa)
      this.blendInto(acc, this.valid ? o.blend : 1, () =>
        this.pass(this.copy, acc, { sc: [sw / w, sh / h], lim: [(sw - 0.5) / w, (sh - 0.5) / h], ts: s < 1 ? [w, h] : [0, 0] }, [['t', smp]]))
      this.valid = true
      this.restart()
      if (pre) this.prerender(pre, o.budget * PRE_SHARE)
    }
    else {
      this.inMotion = false
      if (o.reset) this.restart()
      const key = o.key ?? ''
      if (this.fadeStart >= 0) {
        // 新画面已经画好：从运动时的画面淡入（不是一条一条地出现）
        const el = Math.min(1, (performance.now() - this.fadeStart) / FADE_MS)
        const e = el * el * (3 - 2 * el)
        // acc = mix(原画面, 新画面, e)：每帧按剩下的比例补上
        const t = e >= 1 ? 1 : (e - this.fadeE) / Math.max(1e-6, 1 - this.fadeE)
        this.blendInto(acc, t, () => this.pass(this.copy, acc, { sc: [1, 1], lim: [1, 1], ts: [0, 0] }, [['t', this.target('pre', w, h)]]))
        this.fadeE = e
        if (e >= 1) { this.fadeStart = -1; this.samples = this.fadeTo }
      }
      else if (this.samples >= MAX_SAMPLES) {
        return false
      }
      else {
        // 停下后的画面在屏幕外的 pre 里累积（运动中已经预先画了的部分接着画；缓存里有就直接用）。
        // pre 每多一个样本，整幅更新到屏幕上：第一次淡入，之后直接替换（变化很细微）
        this.prerender({ key, f, v }, o.budget)
        if (this.pre.samples > this.samples) {
          if (this.samples === 0) {
            this.fadeTo = this.pre.samples
            this.fadeStart = performance.now()
            this.fadeE = 0
            changed = false
          }
          else {
            this.pass(this.copy, acc, { sc: [1, 1], lim: [1, 1], ts: [0, 0] }, [['t', this.target('pre', w, h)]])
            this.samples = this.pre.samples
          }
        }
        else {
          changed = false
        }
      }
      more = this.fadeStart >= 0 || this.samples < MAX_SAMPLES
    }
    if (!changed) return more
    const P = f.post
    if (P?.enabled) this.postProcess(acc, P, v, null)
    else this.pass(this.copy, null, { sc: [1, 1], lim: [1, 1], ts: [0, 0] }, [['t', acc]])
    return more
  }

  private nextBand = 0
  /** 把第 n 个全分辨率样本从第 y0 行起画一条（约 budget 个像素）进 out；画完整幅时返回 true，否则 nextBand 是下一条的起点 */
  private bandStep(f: Frame, v: View, out: Target, n: number, budget: number, y0: number): boolean {
    const gl = this.gl
    const { w, h } = v
    const jitter = n === 0 ? [0, 0] : [halton(n, 2) - 0.5, halton(n, 3) - 0.5]
    const rows = Math.min(h, Math.max(8, Math.round(budget / w)))
    const y1 = Math.min(h, y0 + rows)
    gl.enable(gl.SCISSOR_TEST)
    gl.scissor(0, y0, w, y1 - y0)
    this.drawFractal(f, v, out, w, h, jitter, 1)
    gl.disable(gl.SCISSOR_TEST)
    this.nextBand = y1
    return y1 >= h
  }

  /** 预先画好的终点画面：key、已累积的样本数、画到第几行 */
  private pre = { key: '', samples: 0, band: 0 }
  /** 最多缓存几张（0：不缓存） */
  cacheSize = CACHE_SIZE
  /** 已经画清晰的画面（最多 cacheSize 张，最近用过的留下）：key → 贴图名 */
  private cache = new Map<string, string>()

  private prerender(p: { key: string, f: Frame, v: View }, budget: number) {
    const { w, h } = p.v
    const out = this.target('pre', w, h)
    if (this.pre.key !== p.key) {
      this.pre = { key: p.key, samples: 0, band: 0 }
      const hit = this.cache.get(p.key)
      if (hit) {
        // 缓存里有：不用画了（挪到最近用过）
        this.cache.delete(p.key)
        this.cache.set(p.key, hit)
        this.pass(this.copy, out, { sc: [1, 1], lim: [1, 1], ts: [0, 0] }, [['t', this.target(hit, w, h)]])
        this.pre.samples = MAX_SAMPLES
      }
    }
    if (this.pre.samples >= MAX_SAMPLES) return
    const n = this.pre.samples
    const psmp = this.target('psmp', w, h)
    if (this.bandStep(p.f, p.v, psmp, n, budget, this.pre.band)) {
      this.pre.band = 0
      this.blendInto(out, 1 / (n + 1), () => this.pass(this.copy, out, { sc: [1, 1], lim: [1, 1], ts: [0, 0] }, [['t', psmp]]))
      this.pre.samples = n + 1
      if (this.pre.samples >= MAX_SAMPLES) this.store(p.key, out)
    }
    else {
      this.pre.band = this.nextBand
    }
  }

  /** 画清晰的画面存进缓存 */
  private store(key: string, src: Target) {
    if (this.cache.has(key)) return
    let name: string
    if (this.cacheSize <= 0) return
    if (this.cache.size >= this.cacheSize) {
      const [oldKey, oldName] = this.cache.entries().next().value as [string, string]
      this.cache.delete(oldKey)
      name = oldName
    }
    else {
      name = `cache${this.cache.size}`
    }
    this.pass(this.copy, this.target(name, src.w, src.h), { sc: [1, 1], lim: [1, 1], ts: [0, 0] }, [['t', src]])
    this.cache.set(key, name)
  }

  /** 停下后从第一个样本重新累积 */
  private restart() {
    this.samples = 0
    this.band = 0
    this.fadeStart = -1
  }

  /** 在 draw() 里画到 out 的内容按 out = mix(out, 新内容, t) 混合 */
  private blendInto(_out: Target, t: number, draw: () => void) {
    const gl = this.gl
    if (t >= 1) { draw(); return }
    gl.enable(gl.BLEND)
    gl.blendColor(0, 0, 0, t)
    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA)
    draw()
    gl.disable(gl.BLEND)
  }

  /** 把分形（每像素 1 个样本，带亚像素偏移）画进 out 左下角 w × h 的范围 */
  private drawFractal(f: Frame, v: View, out: Target, w: number, h: number, jitter: number[], aa: number) {
    const gl = this.gl
    const mix2 = !!f.pal2 && f.palMix > 0
    this.useVariant({
      power: f.power,
      ship: f.kind === 'ship',
      minR: needMinR(f.mode, f.pal) || (mix2 && needMinR(f.mode, f.pal2!)),
      aa: aa >= 2 ? 2 : 1,
    })
    const L = this.L
    const e = effective(f, v.scroll, v.viewportH)
    gl.useProgram(this.fractal)
    gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb)
    gl.viewport(0, 0, w, h)
    gl.uniform2f(L.uRes, w, h)
    gl.uniform2f(L.uCenter, e.cx, e.cy)
    gl.uniform1f(L.uScale, e.scale)
    gl.uniform1f(L.uRot, f.view.rotate * Math.PI / 180)
    gl.uniform2f(L.uC, e.c[0], e.c[1])
    gl.uniform1f(L.uIter, Math.round(f.iterations))
    gl.uniform1f(L.uPower, f.power)
    gl.uniform1i(L.uShip, f.kind === 'ship' ? 1 : 0)
    gl.uniform1i(L.uInv, f.inverse ? 1 : 0)
    gl.uniform1i(L.uMandel, 0)
    gl.uniform1i(L.uMode, f.mode === 'min' ? 1 : 0)
    gl.uniform1i(L.uAA, aa)
    gl.uniform2f(L.uJitter, jitter[0], jitter[1])
    this.setPalette(f.pal, '')
    if (mix2) this.setPalette(f.pal2!, '2')
    gl.uniform1f(L.uPalMix, mix2 ? f.palMix : 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** 后期用的小图按 CSS 像素的 1/4 建立：不管画布分辨率多高，光晕 / 柔焦的范围都和编辑器里一样 */
  private postProcess(base: Target, P: PostFx, v: View, out: Target | null) {
    for (const [, run] of this.postStages(base, P, v, out)) run()
  }

  /** 后期的各个步骤（性能分析时分开计时）。没用到的步骤（柔焦为 0、没有光迹）直接跳过 */
  private postStages(base: Target, P: PostFx, v: View, out: Target | null): [string, () => void][] {
    const { w, h, scale } = v
    const qw = Math.max(1, Math.round(w / scale / 4))
    const qh = Math.max(1, Math.round(h / scale / 4))
    const q1 = this.target('q1', qw, qh)
    const q2 = this.target('q2', qw, qh)
    const s1 = this.target('s1', qw, qh)
    const s2 = this.target('s2', qw, qh)
    const st = this.target('st', qw, qh)
    const px = [scale / w, scale / h]
    const qx = [1 / qw, 1 / qh]
    const rad = P.bloom.radius
    const type = STREAK_TYPES[P.streak.type] ?? 0
    const useStreak = type > 0 && P.streak.intensity > 0
    const useSoft = P.soft > 0
    const stages: [string, () => void][] = [
      // 光晕：取亮部 → 高斯模糊
      [`后期 · 光晕（${qw}×${qh}）`, () => {
        this.pass(this.bright, q1, { tx: px, thr: P.bloom.threshold }, [['t', base]])
        this.pass(this.blur, q2, { dir: [qx[0], 0], sigma: BLOOM_SIGMA * rad }, [['t', q1]])
        this.pass(this.blur, q1, { dir: [0, qx[1]], sigma: BLOOM_SIGMA * rad }, [['t', q2]])
      }],
    ]
    // 柔焦：整幅缩小 → 模糊
    if (useSoft) {
      stages.push(['后期 · 柔焦', () => {
        this.pass(this.bright, s1, { tx: px, thr: -1 }, [['t', base]])
        this.pass(this.blur, s2, { dir: [qx[0], 0], sigma: SOFT_SIGMA }, [['t', s1]])
        this.pass(this.blur, s1, { dir: [0, qx[1]], sigma: SOFT_SIGMA }, [['t', s2]])
      }])
    }
    // 光迹
    if (useStreak) stages.push(['后期 · 光迹', () => this.pass(this.streak, st, { type, len: P.streak.length, aspect: w / h }, [['t', q1]])])
    // 合成
    stages.push([`后期 · 合成（${w}×${h}）`, () => this.pass(this.comp, out, {
      chroma: P.chroma,
      bloomI: P.bloom.intensity,
      softMix: useSoft ? P.soft : 0,
      streakI: useStreak ? P.streak.intensity : 0,
      gA: hex(P.gradient.from),
      gB: hex(P.gradient.to),
      gAng: P.gradient.angle * Math.PI / 180,
      gStr: P.gradient.strength,
      vig: P.vignette,
      sat: P.saturation,
      con: P.contrast,
      expo: P.exposure,
      aspect: w / h,
    }, [['base', base], ['bloom', q1], ['soft', useSoft ? s1 : q1], ['streak', useStreak ? st : q1]])])
    return stages
  }

  /**
   * 性能分析：把一帧的每个步骤单独画几次，等 GPU 画完再计时（会卡一下）。
   * 另外测几种对照（非整数幂次、迭代减半、半分辨率），看哪里最耗时。
   */
  profile(f: Frame, v: View): { name: string, ms: number }[] {
    const gl = this.gl
    const { w, h } = v
    const acc = this.target('acc', w, h)
    const smp = this.target('smp', w, h)
    const px = new Uint8Array(4)
    const time = (run: () => void) => {
      const once = () => {
        const t0 = performance.now()
        run()
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px) // 等 GPU 画完
        return performance.now() - t0
      }
      once()
      const r = [once(), once(), once()].sort((a, b) => a - b)
      return r[1]
    }
    const frac = { ...f, power: Math.floor(f.power) + 0.37 }
    const rows: { name: string, ms: number }[] = []
    const add = (name: string, run: () => void) => rows.push({ name, ms: time(run) })
    add(`分形 · 全分辨率 ${w}×${h} · 1 个样本（当前参数，幂次 ${+f.power.toFixed(3)}）`, () => this.drawFractal(f, v, smp, w, h, [0, 0], 1))
    add(`　对照：非整数幂次 ${frac.power}（换页过渡时）`, () => this.drawFractal(frac, v, smp, w, h, [0, 0], 1))
    add(`　对照：迭代次数减半（${Math.round(f.iterations / 2)}）`, () => this.drawFractal({ ...f, iterations: f.iterations / 2 }, v, smp, w, h, [0, 0], 1))
    add('　对照：一半分辨率（像素数 1/4）', () => this.drawFractal(f, v, smp, Math.round(w / 2), Math.round(h / 2), [0, 0], 1))
    add('运动模糊（放大 + 混合）', () => this.blendInto(acc, 0.5, () => this.pass(this.copy, acc, { sc: [0.5, 0.5], lim: [0.5, 0.5], ts: [w, h] }, [['t', smp]])))
    if (f.post?.enabled) {
      for (const [name, run] of this.postStages(acc, f.post, v, null)) add(name, run)
    }
    else add('输出到屏幕（未开后期）', () => this.pass(this.copy, null, { sc: [1, 1], lim: [1, 1], ts: [0, 0] }, [['t', acc]]))
    // 测量时 acc 被弄乱了：下一帧整幅重画
    this.valid = false
    return rows
  }

  /** 显卡名称（浏览器允许时） */
  gpuName(): string {
    const gl = this.gl
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
  }

  dispose() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
