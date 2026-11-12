/**
 * 每个页面的分形参数。
 *
 * fractalPages.json 里的每一项都是从 Julia 分形编辑器「导出」得到的 JSON，原样粘贴即可：
 * 在编辑器里调好某一页 →「复制这一页」→ 替换 JSON 里同名的那一项（或者新增一项）。
 *
 * 哪个页面用哪一项：
 *   1. 页面 frontmatter 里写了 fractal: 名字 的，用那一项（例如 fractal: about）
 *   2. 每篇文章（/posts/<名字>/）各用一个不同的著名 Julia 集（juliaPresets.json），
 *      配色和后期沿用 posts（文章列表）那一项。名字是 post:<名字>（例如 post:QC）；
 *      fractalPages.json 里写了同名的一项时用那一项（在调节器里调好某篇文章后「复制本页」贴进去即可）
 *   3. 否则按下面 ROUTES 的路径前缀匹配（从上往下，先匹配到的为准）
 *   4. 都不匹配时用 default
 */
import data from './fractalPages.json'
import presets from './juliaPresets.json'

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

export interface JuliaPreset {
  name: string
  c: [number, number]
  power: number
  inverse: boolean
  view: FractalPage['view']
}
export const juliaPresets = presets as JuliaPreset[]

/** /posts/ 下不是文章的页面 */
const NOT_ARTICLES = new Set(['archives', 'categories', 'tags'])

/** 文章的名字（/posts/QC/ → QC）；不是文章时返回 null */
function articleSlug(p: string): string | null {
  const m = /^\/posts\/([^/]+)\/(?:index\.html)?$/.exec(p)
  return m && !NOT_ARTICLES.has(m[1]) ? m[1] : null
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** 文章 → 预设编号。按文章名排序后依次按哈希挑一个还没被用的，保证每篇不一样 */
const assigned = new Map<string, number>()

/** 告诉这里全站有哪些页面（路径列表），用来给每篇文章分配不重复的预设 */
export function setArticles(paths: string[]) {
  assigned.clear()
  const used = new Set<number>()
  const n = juliaPresets.length
  const slugs = [...new Set(paths.map(p => { try { return articleSlug(decodeURI(p)) } catch { return articleSlug(p) } }).filter((x): x is string => !!x))].sort()
  for (const slug of slugs) {
    let i = hash(slug) % n
    for (let k = 0; k < n && used.has(i); k++) i = (i + 1) % n
    used.add(i)
    assigned.set(slug, i)
  }
}

/** 某个名字对应的页面参数：fractalPages.json 里有就用它，否则是文章（post:<名字>）就按预设生成 */
export function pageFor(key: string): FractalPage {
  if (fractalPages[key]) return fractalPages[key]
  if (key.startsWith('post:')) return articlePage(key.slice(5))
  return fractalPages.default
}

const articleCache = new Map<string, FractalPage>()
function articlePage(slug: string): FractalPage {
  const i = assigned.get(slug) ?? hash(slug) % juliaPresets.length
  const ck = `${slug}|${i}`
  let page = articleCache.get(ck)
  if (!page) {
    const pr = juliaPresets[i]
    const base = fractalPages.posts
    page = {
      ...base,
      kind: 'mandelbrot',
      mode: 'escape',
      iterations: 256,
      power: pr.power,
      inverse: pr.inverse,
      c: [pr.c[0], pr.c[1]],
      view: { ...pr.view },
      scroll: { ...base.scroll },
      veil: 0,
      palette: JSON.parse(JSON.stringify(base.palette)),
    }
    articleCache.set(ck, page)
  }
  return page
}

/** 文章用的是哪个预设（调试用） */
export function presetName(key: string): string {
  if (!key.startsWith('post:') || fractalPages[key]) return ''
  const slug = key.slice(5)
  return juliaPresets[assigned.get(slug) ?? hash(slug) % juliaPresets.length].name
}

/** 某个页面用哪一项（fractalPages.json 里的名字，或者文章的 post:<名字>） */
export function fractalKeyFor(path: string, override?: unknown): string {
  if (typeof override === 'string' && fractalPages[override]) return override
  let p = path
  try { p = decodeURI(path) } catch {}
  if (p === '/' || p === '/index.html') return 'home'
  const slug = articleSlug(p)
  if (slug) return `post:${slug}`
  for (const [prefix, key] of ROUTES) {
    if (p.startsWith(prefix) && fractalPages[key]) return key
  }
  return 'default'
}

export function fractalFor(path: string, override?: unknown): FractalPage {
  return pageFor(fractalKeyFor(path, override))
}
