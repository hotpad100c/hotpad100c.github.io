/**
 * 分形背景的 WebGL 渲染器。计算方式与 Julia 分形编辑器一致：
 * 同样的参数（fractalPages.ts 里从编辑器导出的数据）画出来的图一样。
 */
import { FS, FS_BLUR, FS_BRIGHT, FS_COMP, FS_STREAK, VS, VS2 } from './shaders'
import type { FractalPage, Palette, PostFx } from './fractalPages'

type Target = { tex: WebGLTexture, fb: WebGLFramebuffer, w: number, h: number }
type Uniforms = Record<string, number | number[]>

const FRACTAL_UNIFORMS = ['uRes', 'uCenter', 'uScale', 'uRot', 'uC', 'uIter', 'uPower', 'uShip', 'uInv', 'uMandel', 'uMode',
  'uStops', 'uPos', 'uCount', 'uInside', 'uInsideMode', 'uGamma', 'uFreq', 'uOffset', 'uCycle', 'uAA']
const INT_UNIFORMS = new Set(['type'])
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
export function effective(page: FractalPage, scroll: number, viewportH: number) {
  const a = (scroll / 1000) * page.scroll.speed * Math.PI / 180
  const c: [number, number] = [page.c[0] * Math.cos(a) - page.c[1] * Math.sin(a), page.c[0] * Math.sin(a) + page.c[1] * Math.cos(a)]
  const scale = zoomToScale(page.view.zoom)
  const k = Math.tanh((scroll / Math.max(viewportH, 1)) * page.scroll.parallax)
  return { c, cx: page.view.x + k * scale * 0.12, cy: page.view.y - k * scale * 0.22, scale }
}

export class FractalRenderer {
  readonly gl: WebGLRenderingContext
  private fractal: WebGLProgram
  private L: Record<string, WebGLUniformLocation | null> = {}
  private bright: WebGLProgram
  private blur: WebGLProgram
  private streak: WebGLProgram
  private comp: WebGLProgram
  private targets: Record<string, Target> = {}
  private locs = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>()

  /** 不支持 WebGL 或着色器编译失败时抛出异常 */
  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' })
    if (!gl) throw new Error('WebGL unavailable')
    this.gl = gl
    this.fractal = this.program(VS, FS)
    this.bright = this.program(VS2, FS_BRIGHT)
    this.blur = this.program(VS2, FS_BLUR)
    this.streak = this.program(VS2, FS_STREAK)
    this.comp = this.program(VS2, FS_COMP)
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

  private setPalette(pal: Palette) {
    const gl = this.gl
    const L = this.L
    const stops = pal.stops.slice().sort((a, b) => a[1] - b[1]).slice(0, 8)
    const cols: number[] = []
    const pos: number[] = []
    for (let i = 0; i < 8; i++) {
      const s = stops[Math.min(i, stops.length - 1)]
      cols.push(...hex(s[0]))
      pos.push(s[1])
    }
    gl.uniform3fv(L.uStops, new Float32Array(cols))
    gl.uniform1fv(L.uPos, new Float32Array(pos))
    gl.uniform1i(L.uCount, stops.length)
    gl.uniform3fv(L.uInside, hex(pal.inside))
    gl.uniform1i(L.uInsideMode, ({ solid: 0, min: 1, angle: 2 } as Record<string, number>)[pal.insideMode] ?? 0)
    gl.uniform1f(L.uGamma, pal.gamma)
    gl.uniform1f(L.uFreq, pal.frequency)
    gl.uniform1f(L.uOffset, pal.offset)
    gl.uniform1i(L.uCycle, pal.cycle ? 1 : 0)
  }

  /**
   * 画一帧。w / h 是画布像素尺寸，scale 是画布像素 / CSS 像素；scroll 与 viewportH 用 CSS 像素（和编辑器一致）。
   * aa：超采样，每个像素取 aa × aa 个样本（1–3）。
   */
  draw(page: FractalPage, theme: 'dark' | 'light', scroll: number, viewportH: number, w: number, h: number, scale: number, aa = 2) {
    const gl = this.gl
    const L = this.L
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h }
    const pal = page.palette[theme]
    const P = pal.post
    const usePost = !!P?.enabled
    const e = effective(page, scroll, viewportH)
    const base = usePost ? this.target('base', w, h) : null

    gl.useProgram(this.fractal)
    gl.bindFramebuffer(gl.FRAMEBUFFER, base ? base.fb : null)
    gl.viewport(0, 0, w, h)
    gl.uniform2f(L.uRes, w, h)
    gl.uniform2f(L.uCenter, e.cx, e.cy)
    gl.uniform1f(L.uScale, e.scale)
    gl.uniform1f(L.uRot, page.view.rotate * Math.PI / 180)
    gl.uniform2f(L.uC, e.c[0], e.c[1])
    gl.uniform1f(L.uIter, page.iterations)
    gl.uniform1f(L.uPower, page.power)
    gl.uniform1i(L.uShip, page.kind === 'ship' ? 1 : 0)
    gl.uniform1i(L.uInv, page.inverse ? 1 : 0)
    gl.uniform1i(L.uMandel, 0)
    gl.uniform1i(L.uMode, page.mode === 'min' ? 1 : 0)
    gl.uniform1i(L.uAA, aa)
    this.setPalette(pal)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (base && P) this.postProcess(base, P, w, h, scale)
  }

  /** 后期用的小图按 CSS 像素的 1/4 建立：不管画布分辨率多高，光晕 / 柔焦的范围都和编辑器里一样 */
  private postProcess(base: Target, P: PostFx, w: number, h: number, scale: number) {
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
    // 合成到画面
    this.pass(this.comp, null, {
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

  /** 等 GPU 画完（用来测一帧要多久） */
  finish() {
    const px = new Uint8Array(4)
    this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, px)
  }

  dispose() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
