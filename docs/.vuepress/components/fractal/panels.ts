/**
 * 半透明面板（文章列表条目、正文、目录、友链卡片……）与导航栏、侧边栏的样式。
 * 数值在 panels.json，深色 / 浅色主题各一套；可以用 ?fractal-tune 调节器实时调整后复制回来。
 *
 *   alpha / hoverAlpha：面板（悬停时）的不透明度，0 为全透明
 *   blur：面板后面背景的模糊半径（px）
 *   saturate / brightness：面板后面背景的饱和度 / 亮度（越低，文字越不受分形颜色干扰）
 *   nav / sidebar：导航栏 / 侧边栏的不透明度
 *
 * styles/fractal.css 里有同样的默认值（页面脚本加载前使用），改这里时最好一并改掉。
 */
import data from './panels.json'

export interface PanelStyle {
  alpha: number
  hoverAlpha: number
  blur: number
  saturate: number
  brightness: number
  nav: number
  sidebar: number
}
export type Panels = Record<'dark' | 'light', PanelStyle>

export const panelDefaults = data as Panels

/** 各部分的底色 */
const BASE = {
  dark: { panel: '12, 10, 18', hover: '26, 20, 38', nav: '11, 9, 16', sidebar: '14, 11, 21' },
  light: { panel: '250, 247, 255', hover: '255, 255, 255', nav: '239, 233, 251', sidebar: '235, 228, 248' },
}

/** 把面板样式写成 <html> 上的 CSS 变量（覆盖 fractal.css 里的默认值） */
export function applyPanels(theme: 'dark' | 'light', s: PanelStyle) {
  const b = BASE[theme]
  const root = document.documentElement.style
  root.setProperty('--fx-panel', `rgba(${b.panel}, ${s.alpha})`)
  root.setProperty('--fx-panel-hover', `rgba(${b.hover}, ${s.hoverAlpha})`)
  root.setProperty('--fx-panel-filter', `blur(${s.blur}px) saturate(${s.saturate}) brightness(${s.brightness})`)
  root.setProperty('--vp-nav-bg-color', `rgba(${b.nav}, ${s.nav})`)
  root.setProperty('--vp-local-nav-bg-color', `rgba(${b.nav}, ${s.nav})`)
  root.setProperty('--vp-sidebar-bg-color', `rgba(${b.sidebar}, ${s.sidebar})`)
}
