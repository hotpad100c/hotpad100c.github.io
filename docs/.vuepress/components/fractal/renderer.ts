/**
 * 分形背景的 WebGL 渲染器。计算方式与 Julia 分形编辑器一致：
 * 同样的参数（fractalPages.ts 里从编辑器导出的数据）画出来的图一样。
 *
 * 画的是一个 Frame：某个页面在某个主题下的参数。换页 / 换主题时，Frame 由 transition.ts 插值得到
 * （配色用着色器里的第二套配色 pal2 按 palMix 混合）。
 *
 * 渐进超采样：每帧每个像素只算 1 个样本。画面不动时，每帧在略微错开的位置再取一个样本，
 * 和之前的平均（最多 MAX_SAMPLES 个），几帧之内变得清晰；一动就从 1 个样本重新开始。
 * 这样每帧的开销始终只有 1×1，分辨率也不用降低。
 */
import { FS, FS_BLUR, FS_BRIGHT, FS_COMP, FS_MIX, FS_STREAK, VS, VS2 } from './shaders'
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

/** Halton 序列（2, 3）：均匀分布的亚像素偏移 */
function halton(i: number, b: number) {
  let f = 1
  let r = 0
  while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b) }
  return r
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

export class FractalRenderer {
  readonly gl: WebGLRenderingContext
  private fractal: WebGLProgram
  private L: Record<string, WebGLUniformLocation | null> = {}
  private bright: WebGLProgram
  private blur: WebGLProgram
  private streak: WebGLProgram
  private comp: WebGLProgram
  private mixer: WebGLProgram
  private targets: Record<string, Target> = {}
  /** 已累积的样本数 */
  samples = 0
  private locs = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>()

  /** 不支持 WebGL 或着色器编译失败时抛出异常 */
  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' })
    if (!gl) throw new Error('WebGL unavailable')
    this.gl = gl
    this.fractal = this.program(VS, FS)
    this.bright = this.program(VS2, FS_BRIGHT)
    this.blur = this.program(VS2, FS_BLUR)
    this.streak = this.program(VS2, FS_STREAK)
    this.comp = this.program(VS2, FS_COMP)
    this.mixer = this.program(VS2, FS_MIX)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    for (const n of FRACTAL_UNIFORMS) this.L[n] = gl.getUniformLocation(this.fractal, n)
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
   * 画一帧。reset：画面参数变了（滚动、过渡、换页…），从 1 个样本重新累积。
   * 返回 true 表示还可以继续累积（调用方应在下一帧再调用一次）。
   */
  draw(f: Frame, v: View, reset: boolean): boolean {
    const sized = this.canvas.width !== v.w || this.canvas.height !== v.h
    if (sized) { this.canvas.width = v.w; this.canvas.height = v.h }
    if (reset || sized) this.samples = 0
    if (this.samples >= MAX_SAMPLES) return false
    const n = this.samples
    // 第一个样本取像素中心，之后按 Halton 序列错开
    const jitter = n === 0 ? [0, 0] : [halton(n, 2) - 0.5, halton(n, 3) - 0.5]
    const smp = this.target('smp', v.w, v.h)
    this.drawFractal(f, v, smp, jitter)
    // 与之前的结果平均：acc = mix(acc, 新样本, 1 / (n + 1))
    const dst = this.target(n % 2 ? 'accA' : 'accB', v.w, v.h)
    const src = this.target(n % 2 ? 'accB' : 'accA', v.w, v.h)
    this.pass(this.mixer, dst, { t: 1 / (n + 1) }, [['a', src], ['b', smp]])
    this.samples = n + 1
    const P = f.post
    if (P?.enabled) this.postProcess(dst, P, v, null)
    else this.pass(this.mixer, null, { t: 0 }, [['a', dst], ['b', dst]])
    return this.samples < MAX_SAMPLES
  }

  /** 把分形（1 个样本，带亚像素偏移）画进 out */
  private drawFractal(f: Frame, v: View, out: Target, jitter: number[]) {
    const gl = this.gl
    const L = this.L
    const { w, h } = v
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
    gl.uniform1i(L.uAA, 1)
    gl.uniform2f(L.uJitter, jitter[0], jitter[1])
    this.setPalette(f.pal, '')
    if (f.pal2 && f.palMix > 0) this.setPalette(f.pal2, '2')
    gl.uniform1f(L.uPalMix, f.pal2 ? f.palMix : 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** 后期用的小图按 CSS 像素的 1/4 建立：不管画布分辨率多高，光晕 / 柔焦的范围都和编辑器里一样 */
  private postProcess(base: Target, P: PostFx, v: View, out: Target | null) {
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
    // 光晕：取亮部 → 两轮模糊
    this.pass(this.bright, q1, { tx: px, thr: P.bloom.threshold }, [['t', base]])
    for (const k of [rad, rad * 2]) {
      this.pass(this.blur, q2, { dir: [qx[0] * k, 0] }, [['t', q1]])
      this.pass(this.blur, q1, { dir: [0, qx[1] * k] }, [['t', q2]])
    }
    // 柔焦：整幅缩小 → 模糊
    this.pass(this.bright, s1, { tx: px, thr: -1 }, [['t', base]])
    this.pass(this.blur, s2, { dir: [qx[0] * 2, 0] }, [['t', s1]])
    this.pass(this.blur, s1, { dir: [0, qx[1] * 2] }, [['t', s2]])
    // 光迹
    const type = STREAK_TYPES[P.streak.type] ?? 0
    this.pass(this.streak, st, { type, len: P.streak.length, aspect: w / h }, [['t', q1]])
    // 合成
    this.pass(this.comp, out, {
      chroma: P.chroma,
      bloomI: P.bloom.intensity,
      softMix: P.soft,
      streakI: type ? P.streak.intensity : 0,
      gA: hex(P.gradient.from),
      gB: hex(P.gradient.to),
      gAng: P.gradient.angle * Math.PI / 180,
      gStr: P.gradient.strength,
      vig: P.vignette,
      grain: P.grain,
      sat: P.saturation,
      con: P.contrast,
      expo: P.exposure,
      aspect: w / h,
      seed: 17,
    }, [['base', base], ['bloom', q1], ['soft', s1], ['streak', st]])
  }

  dispose() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
