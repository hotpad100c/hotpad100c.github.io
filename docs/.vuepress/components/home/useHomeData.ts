import { computed } from 'vue'
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

export const profile = {
  name: 'Ryan100c',
  tagline: '编程 · Minecraft · 创造',
  text: '记录开发日志、灵感、与 Minecraft 技术研究',
  motto: '让他人看见那些平时看不见的游戏逻辑。',
  avatar: 'https://i.postimg.cc/ZRHDmzH8/Untitled30-20251111074818.png',
  banner: 'https://i.imgur.com/uTPkgAY.png',
}

export const navLinks = [
  { text: '文章', link: '/posts/', en: 'posts' },
  { text: '项目', link: '/projects/', en: 'projects' },
  { text: '关于', link: '/about/', en: 'about' },
  { text: '友链', link: '/friends/', en: 'friends' },
]

export const socials = [
  { text: 'GitHub', link: 'https://github.com/hotpad100c', handle: 'hotpad100c' },
  { text: 'Bilibili', link: 'https://b23.tv/gR2fZk3', handle: 'Ryan100c' },
  { text: 'YouTube', link: 'https://youtube.com/@ryan100c', handle: '@ryan100c' },
  { text: 'Discord', link: 'https://discord.gg/r25t6cQpDP', handle: 'server' },
]

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
  title: string
  description: string
  url: string
  cover?: string
  category: string
}

export const projects: HomeProject[] = (navData as any[]).flatMap(group =>
  group.items.map((item: any) => ({
    title: item.title,
    description: item.description,
    url: item.url,
    cover: item.cover,
    category: group.category,
  })),
)

// bg-cube 背景图（docs/images/Bg.png 的压缩版）
// @ts-ignore 图片由打包器处理
import bgCubeUrl from '../../../images/bg-cube.jpg'
export const bgCube: string = bgCubeUrl
