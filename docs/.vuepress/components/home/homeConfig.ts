/**
 * 首页内容配置 —— 改首页上的文字、链接、数量，只需要改这个文件。
 * 详细说明见仓库根目录的 CUSTOMIZING.md。
 */

/** 首屏文字 */
export const profile = {
  /** 标题上方的小标签 */
  tagline: '编程 · Minecraft · 创造',
  /** 标题下方第一行 */
  text: '记录开发日志、灵感、与 Minecraft 技术研究',
  /** 标题下方第二行 */
  motto: '让他人看见那些平时看不见的游戏逻辑。',
}

/** 首屏的两个按钮 */
export const actions = [
  { text: '阅读文章', link: '/posts/', primary: true },
  { text: '查看项目', link: '/projects/', primary: false },
]

/**
 * 社交链接（方正小按钮，排在「文章 / 项目」计数之后）。
 * icon 使用 Iconify 图标名，可在 https://icon-sets.iconify.design/ 搜索。
 * 横屏下这一行共 6 格（2 个计数 + 4 个链接）；增减链接时格子会自动均分。
 */
export const socials = [
  { text: 'GitHub', link: 'https://github.com/hotpad100c', icon: 'mdi:github', color: '' },
  { text: 'Bilibili', link: 'https://b23.tv/gR2fZk3', icon: 'ri:bilibili-fill', color: '#fb7299' },
  { text: 'YouTube', link: 'https://youtube.com/@ryan100c', icon: 'mdi:youtube', color: '#ff3b3b' },
  { text: 'Discord', link: 'https://discord.gg/r25t6cQpDP', icon: 'ic:baseline-discord', color: '#7289ff' },
]

/** 「近期文章」显示几篇（最新的一篇单独显示在「最新」卡片里，不计入） */
export const recentCount = 5

/**
 * 首页展示的项目，填 docs/projects/data.js 里的 id，按顺序显示。
 * 留空数组则自动取前 4 个有封面的项目。横屏下建议保持 4 个。
 */
export const featuredProjects: string[] = ['TMWIN', 'Lucidity', 'YetAnotherCarpetAddition', 'Trajectory']
