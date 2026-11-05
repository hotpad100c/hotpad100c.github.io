import { computed } from 'vue'
import { withBase } from 'vuepress/client'
// @ts-ignore 由 config.ts 中的 homePostsPlugin 生成
import { homePosts } from '@temp/home-posts.js'
import { navData } from '../../../projects/data.js'

export interface HomePost {
  title: string
  path: string
  excerpt: string
  tags: string[]
  date: string
  cover?: string
}

export { actions, featuredProjects, profile, recentCount, socials } from './homeConfig'

function normalizeDate(raw: string): string {
  const m = String(raw || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (!m) return ''
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

/** 全部文章（按时间倒序，去掉草稿） */
export function useHomePosts() {
  return computed<HomePost[]>(() =>
    (homePosts as any[])
      .map(p => ({ ...p, date: normalizeDate(p.date) }))
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
  )
}

/** 全部标签及出现次数 */
export function useHomeTags() {
  const posts = useHomePosts()
  return computed(() => {
    const map = new Map<string, number>()
    posts.value.forEach(p => p.tags.forEach(t => map.set(t, (map.get(t) || 0) + 1)))
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
  })
}

export interface HomeProject {
  id: string
  title: string
  description: string
  url: string
  cover?: string
  category: string
}

export const projects: HomeProject[] = (navData as any[]).flatMap(group =>
  group.items.map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    url: item.url,
    cover: item.cover,
    category: group.category,
  })),
)

/** 首页展示的项目：homeConfig.ts 中 featuredProjects 指定的，未指定时取前 4 个有封面的 */
export function pickFeaturedProjects(ids: string[]): HomeProject[] {
  if (!ids.length) return projects.filter(p => p.cover).slice(0, 4)
  return ids.map(id => projects.find(p => p.id === id)).filter((p): p is HomeProject => !!p)
}

// 默认背景图（docs/images/Bg.png 的压缩版）：首页整页背景、SlantPage 的背景
// @ts-ignore 图片由打包器处理
import bgMainUrl from '../../../images/bg-main.jpg'
export const bgMain: string = bgMainUrl

// 默认封面图 bg-cube（方块）：首页与 SlantHero 的斜切窗口
// @ts-ignore 图片由打包器处理
import bgCubeUrl from '../../../images/bg-cube.jpg'
export const bgCube: string = bgCubeUrl

/**
 * 解析组件参数里的图片地址：
 *   bg-main / bg-cube —— 上面两张内置图片
 *   / 开头            —— docs/.vuepress/public/ 下的站内图片
 *   其它              —— 原样使用（https:// 地址）
 * 没有填写时返回 fallback。
 */
export function resolveImage(src: string | undefined, fallback: string): string {
  if (!src) return fallback
  if (src === 'bg-main') return bgMain
  if (src === 'bg-cube') return bgCube
  return src.startsWith('/') ? withBase(src) : src
}
