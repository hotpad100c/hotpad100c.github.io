/**
 * ?fractal-tune 调节器的状态：改过的页面参数和面板样式，保存在浏览器里（localStorage），
 * 换页、刷新都还在；「复制全部」导出后发回来，替换 fractalPages.json / panels.json / render.json。
 */
import { reactive } from 'vue'
import type { FractalPage } from './fractalPages'
import { fractalPages } from './fractalPages'
import type { Panels } from './panels'
import { panelDefaults } from './panels'
import type { RenderSettings } from './renderSettings'
import { renderDefaults } from './renderSettings'

const STORE = 'fractal-tune-v1'
const ON = 'fractal-tune-on'

function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)) }

export const tune = reactive({
  active: false,
  drag: false,
  pages: {} as Record<string, FractalPage>,
  panels: clone(panelDefaults) as Panels,
  render: clone(renderDefaults) as RenderSettings,
  /** 每次修改加一，背景据此重画 */
  version: 0,
})

export function initTune() {
  try {
    if (/[?&]fractal-tune\b/.test(window.location.search)) sessionStorage.setItem(ON, '1')
    tune.active = sessionStorage.getItem(ON) === '1'
    if (!tune.active) return
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null')
    if (saved?.pages) tune.pages = saved.pages
    if (saved?.render) tune.render = { ...renderDefaults, ...saved.render }
    if (saved?.panels) tune.panels = { dark: { ...panelDefaults.dark, ...saved.panels.dark }, light: { ...panelDefaults.light, ...saved.panels.light } }
  }
  catch {}
}

export function closeTune() {
  tune.active = false
  tune.drag = false
  try { sessionStorage.removeItem(ON) } catch {}
  tune.version++
}

/** 开始调某一页：第一次时复制一份原始参数 */
export function tunePage(key: string): FractalPage {
  if (!tune.pages[key]) tune.pages[key] = clone(fractalPages[key])
  return tune.pages[key]
}

export function changed() {
  tune.version++
  try { localStorage.setItem(STORE, JSON.stringify({ pages: tune.pages, panels: tune.panels, render: tune.render })) } catch {}
}

export function resetPage(key: string) {
  delete tune.pages[key]
  changed()
}
export function resetRender() {
  tune.render = clone(renderDefaults)
  changed()
}
/** 现在生效的渲染参数：调节器打开时用调节器里的 */
export function renderSettings(): RenderSettings {
  return tune.active ? tune.render : renderDefaults
}
export function resetPanels() {
  tune.panels = clone(panelDefaults)
  changed()
}

function round(x: unknown): unknown {
  if (typeof x === 'number') return Math.round(x * 1e6) / 1e6
  if (Array.isArray(x)) return x.map(round)
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, round(v)]))
  return x
}

/** 导出：所有页面（改过的用改过的）+ 面板样式 */
export function exportAll(): string {
  const pages: Record<string, FractalPage> = {}
  for (const k of Object.keys(fractalPages)) pages[k] = tune.pages[k] ?? fractalPages[k]
  for (const k of Object.keys(tune.pages)) pages[k] = tune.pages[k]
  return JSON.stringify(round({ 'fractalPages.json': pages, 'panels.json': tune.panels, 'render.json': tune.render }), null, 2)
}
export function exportPage(key: string): string {
  return JSON.stringify(round({ [key]: tune.pages[key] ?? fractalPages[key] }), null, 2)
}
