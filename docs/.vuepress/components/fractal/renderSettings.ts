/**
 * 分形背景的渲染与性能参数（全站一套），数值在 render.json。
 * 可以用 ?fractal-tune 调节器的「渲染与性能」实时调整，调好后「复制全部」发回来替换 render.json。
 *
 *   maxDpr：渲染比例上限（屏幕像素密度超过它时按它渲染；1 = 按 CSS 像素，最省）
 *   maxMegapixels：画布最多多少百万像素（超过时整体降低分辨率，防止 4K 屏拖垮显卡）
 *   moveFps：运动中（滚动、换页过渡、拖动）的目标帧率，达不到就降分辨率
 *   stillFps：停下后补清晰度时的目标帧率（越低，变清晰越快，但这段时间页面可能没那么跟手）
 *   stillMinShare：停下后每帧至少画多少屏（0.083 ≈ 1/12，保证十几帧之内画完一幅清晰画面）
 *   moveMinScale / moveMaxScale：运动中分辨率比例的下限 / 上限
 *   softTransitions：换页过渡中分辨率低时改为「再低一半 + 每像素 2×2 取样」（1 开 / 0 关）：更柔和、没有碎点
 *   motionBlur：运动模糊的时间常数（秒）：越大拖影越长，0 = 没有
 *   fadeMs：停下后清晰画面淡入的时长
 *   maxSamples：停下后累积多少个样本（越多边缘越平滑，补清晰度的时间越长）
 *   preShare：换页过渡中分给「预先画好下一页清晰画面」的算力比例
 *   cacheSize：缓存几张清晰画面（每张约占一整屏的显存；0 = 不缓存）
 *   transitionMs：换页过渡的时长
 *   smoothTime：滚动时分形追随页面的平滑时间（秒）：越大越「慢、软」
 */
import data from './render.json'

export interface RenderSettings {
  maxDpr: number
  maxMegapixels: number
  moveFps: number
  stillFps: number
  stillMinShare: number
  moveMinScale: number
  moveMaxScale: number
  softTransitions: number
  motionBlur: number
  fadeMs: number
  maxSamples: number
  preShare: number
  cacheSize: number
  transitionMs: number
  smoothTime: number
}

export const renderDefaults = data as RenderSettings
