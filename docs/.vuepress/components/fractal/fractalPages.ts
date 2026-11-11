/**
 * 每个页面的分形参数。
 *
 * fractalPages.json 里的每一项都是从 Julia 分形编辑器「导出」得到的 JSON，原样粘贴即可：
 * 在编辑器里调好某一页 →「复制这一页」→ 替换 JSON 里同名的那一项（或者新增一项）。
 *
 * 哪个页面用哪一项：
 *   1. 页面 frontmatter 里写了 fractal: 名字 的，用那一项（例如 fractal: about）
 *   2. 否则按下面 ROUTES 的路径前缀匹配（从上往下，先匹配到的为准）
 *   3. 都不匹配时用 default
 */
import data from './fractalPages.json'

export interface PostFx {
  enabled: boolean
  chroma: number
  bloom: { threshold: number, intensity: number, radius: number }
  soft: number
  streak: { type: 'none' | 'rotate' | 'zoom' | 'spiral', intensity: number, length: number }
  gradient: { from: string, to: string, angle: number, strength: number }
  vignette: number
  grain: number
  saturation: number
  contrast: number
  exposure: number
}

export interface Palette {
  stops: [string, number][]
  inside: string
  insideMode: 'solid' | 'min' | 'angle'
  gamma: number
  frequency: number
  offset: number
  cycle: boolean
  post?: PostFx
}

export interface FractalPage {
  kind: 'mandelbrot' | 'ship'
  power: number
  inverse: boolean
  mode: 'escape' | 'min'
  iterations: number
  c: [number, number]
  view: { x: number, y: number, zoom: number, rotate: number }
  /** speed：每滚动 1000px，C 绕原点转多少度；parallax：视图中心随滚动平移的幅度 */
  scroll: { speed: number, parallax: number }
  /** 分形上面盖一层与页面底色相同的半透明遮罩，0–1 */
  veil: number
  palette: { dark: Palette, light: Palette }
}

export const fractalPages = data as unknown as Record<string, FractalPage>

/** [路径前缀, 使用哪一项]；'/' 只匹配首页本身 */
const ROUTES: [string, string][] = [
  ['/posts/', 'posts'],
  ['/projects/', 'projects'],
  ['/tools/', 'projects'],
  ['/app/', 'projects'],
  ['/about/', 'about'],
  ['/friends/', 'friends'],
]

export function fractalFor(path: string, override?: unknown): FractalPage {
  if (typeof override === 'string' && fractalPages[override]) return fractalPages[override]
  const p = decodeURI(path)
  if (p === '/' || p === '/index.html') return fractalPages.home
  for (const [prefix, key] of ROUTES) {
    if (p.startsWith(prefix) && fractalPages[key]) return fractalPages[key]
  }
  return fractalPages.default
}
