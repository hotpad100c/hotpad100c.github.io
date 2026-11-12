/**
 * 换页 / 换主题时两帧之间的过渡：
 *   C、幂次、视图、迭代次数、滚动参数、遮罩、后期效果的每个数值和颜色都连续过渡，
 *   配色交给着色器按比例混合两套配色。
 *   不能连续变化的开关（反演、Mandelbrot / Burning Ship、模式）在过渡到一半时直接切换，其余参数照常插值。
 */
import type { PostFx } from './fractalPages'
import type { Frame } from './renderer'

/** 先慢后快再慢 */
export const ease = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10)

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function lerpHex(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.replace('#', ''), 16)
  const pb = Number.parseInt(b.replace('#', ''), 16)
  let out = 0
  for (const sh of [16, 8, 0]) out |= Math.round(lerp((pa >> sh) & 255, (pb >> sh) & 255, t)) << sh
  return `#${out.toString(16).padStart(6, '0')}`
}

/** 关闭后期时等价的参数：什么都不做 */
const NEUTRAL: PostFx = {
  enabled: true,
  chroma: 0,
  bloom: { threshold: 1, intensity: 0, radius: 1 },
  soft: 0,
  streak: { type: 'none', intensity: 0, length: 0 },
  gradient: { from: '#000000', to: '#000000', angle: 0, strength: 0 },
  vignette: 0,
  grain: 0,
  saturation: 1,
  contrast: 1,
  exposure: 0,
}

function lerpPost(a: PostFx | undefined, b: PostFx | undefined, t: number): PostFx | undefined {
  if (!a?.enabled && !b?.enabled) return undefined
  const A = a?.enabled ? a : { ...NEUTRAL, gradient: { ...NEUTRAL.gradient, from: b!.gradient.from, to: b!.gradient.to } }
  const B = b?.enabled ? b : { ...NEUTRAL, gradient: { ...NEUTRAL.gradient, from: a!.gradient.from, to: a!.gradient.to } }
  // 光迹类型不能插值：前半程 A 的光迹淡出，后半程 B 的淡入
  const sameStreak = A.streak.type === B.streak.type
  const streak = sameStreak
    ? { type: A.streak.type, intensity: lerp(A.streak.intensity, B.streak.intensity, t), length: lerp(A.streak.length, B.streak.length, t) }
    : t < 0.5
      ? { ...A.streak, intensity: A.streak.intensity * (1 - 2 * t) }
      : { ...B.streak, intensity: B.streak.intensity * (2 * t - 1) }
  return {
    enabled: true,
    chroma: lerp(A.chroma, B.chroma, t),
    bloom: {
      threshold: lerp(A.bloom.threshold, B.bloom.threshold, t),
      intensity: lerp(A.bloom.intensity, B.bloom.intensity, t),
      radius: lerp(A.bloom.radius, B.bloom.radius, t),
    },
    soft: lerp(A.soft, B.soft, t),
    streak,
    gradient: {
      from: lerpHex(A.gradient.from, B.gradient.from, t),
      to: lerpHex(A.gradient.to, B.gradient.to, t),
      angle: lerp(A.gradient.angle, B.gradient.angle, t),
      strength: lerp(A.gradient.strength, B.gradient.strength, t),
    },
    vignette: lerp(A.vignette, B.vignette, t),
    grain: lerp(A.grain, B.grain, t),
    saturation: lerp(A.saturation, B.saturation, t),
    contrast: lerp(A.contrast, B.contrast, t),
    exposure: lerp(A.exposure, B.exposure, t),
  }
}

/** 角度走较短的一边 */
function lerpAngle(a: number, b: number, t: number) {
  let d = ((b - a) % 360 + 540) % 360 - 180
  if (Math.abs(d) === 180) d = 180
  return a + d * t
}

/** 两帧之间插值（a 只能用它的主配色 pal） */
export function lerpFrame(a: Frame, b: Frame, t: number): Frame {
  const s = t < 0.5 ? a : b
  return {
    kind: s.kind,
    set: s.set,
    inverse: s.inverse,
    mode: s.mode,
    power: lerp(a.power, b.power, t),
    iterations: lerp(a.iterations, b.iterations, t),
    c: [lerp(a.c[0], b.c[0], t), lerp(a.c[1], b.c[1], t)],
    view: {
      x: lerp(a.view.x, b.view.x, t),
      y: lerp(a.view.y, b.view.y, t),
      zoom: lerp(a.view.zoom, b.view.zoom, t),
      rotate: lerpAngle(a.view.rotate, b.view.rotate, t),
    },
    scroll: { speed: lerp(a.scroll.speed, b.scroll.speed, t), parallax: lerp(a.scroll.parallax, b.scroll.parallax, t) },
    veil: lerp(a.veil, b.veil, t),
    veilColor: [0, 1, 2].map(i => lerp(a.veilColor[i], b.veilColor[i], t)) as [number, number, number],
    pal: a.pal,
    pal2: b.pal,
    palMix: t,
    post: lerpPost(a.post, b.post, t),
  }
}

/**
 * 正在过渡时又换页：把当前画面当作新的起点。
 * 着色器只能混合两套配色，所以起点取当前占比较大的那套。
 */
export function settle(f: Frame): Frame {
  if (!f.pal2 || f.palMix <= 0) return { ...f, pal2: undefined, palMix: 0 }
  return { ...f, pal: f.palMix < 0.5 ? f.pal : f.pal2, pal2: undefined, palMix: 0 }
}
