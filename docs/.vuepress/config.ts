import { defineUserConfig } from "vuepress";
import theme from "vuepress-theme-plume";
import { webpackBundler } from '@vuepress/bundler-webpack'
import type { Plugin } from 'vuepress/core'
import { cp, readFile, stat } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

/**
 * 镜像站点（scripts/mirror.mjs 抓取到 docs/.vuepress/mirror-dist/）在网站上的地址是 /mirror/<name>/。
 * 构建：生成完成后复制到 dist/mirror/。开发：由下面的 serveMirror 中间件直接提供。
 */
const MIRROR_DIR = path.resolve(process.cwd(), 'docs/.vuepress/mirror-dist')
const mirrorPlugin = (): Plugin => ({
  name: 'mirror-sites',
  onGenerated: async (app) => {
    // 正常情况下 pnpm docs:build 已经先抓取过了。如果构建命令不是它（例如 Cloudflare Pages 里填的是
    // npx vuepress build docs），这里补抓一次；抓取失败则让构建失败，线上保持旧版本。
    const missing = await stat(MIRROR_DIR).then(() => false, () => true)
    if (missing) {
      console.log('[mirror] 没有找到 docs/.vuepress/mirror-dist，现在抓取镜像站点…')
      execFileSync(process.execPath, [path.resolve(process.cwd(), 'scripts/mirror.mjs')], { stdio: 'inherit' })
    }
    await cp(MIRROR_DIR, app.dir.dest('mirror'), { recursive: true })
  },
})
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm',
}
const serveMirror = async (req: any, res: any, next: () => void) => {
  const url = decodeURIComponent((req.url || '').split('?')[0])
  if (!url.startsWith('/mirror/')) return next()
  let file = path.join(MIRROR_DIR, url.slice('/mirror/'.length))
  if (!file.startsWith(MIRROR_DIR)) return next()
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html')
    const body = await readFile(file)
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream')
    res.end(body)
  } catch { next() }
}

/** 把 frontmatter 的 date（Date 或 "2026–7-4" 之类的字符串）转成 Plume 的 createTime 格式 */
function dateToCreateTime(d: unknown): string | undefined {
  const s = d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? '')
  const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  return m ? `${m[1]}/${m[2].padStart(2, '0')}/${m[3].padStart(2, '0')} 00:00:00` : undefined
}

/**
 * 为首页生成文章数据（@temp/home-posts.js），供 HomeSlant 使用。
 * 直接读取 frontmatter 的 date 与正文开头，不依赖主题的 createTime / excerpt。
 */
const homePostsPlugin = (): Plugin => ({
  name: 'home-posts-data',
  onPrepared: async (app) => {
    const plain = (md: string) => md
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^[#>\-*|\s]+/gm, '')
      .replace(/[*_`~|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    const toDateString = (d: unknown) =>
      d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? '')
    const posts = app.pages
      .filter(p => p.filePathRelative?.startsWith('posts/') && !p.frontmatter.draft)
      .map(p => ({
        title: p.title,
        path: p.path,
        date: toDateString(p.frontmatter.date ?? p.frontmatter.createTime),
        tags: (p.frontmatter.tags as string[]) || [],
        excerpt: (p.frontmatter.description as string) || plain(p.content.replace(/^---[\s\S]*?---/, ''))
          .replace(new RegExp(`^${p.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`), '')
          .slice(0, 160),
      }))
    await app.writeTemp('home-posts.js', `export const homePosts = ${JSON.stringify(posts)}`)
  },
})

export default defineUserConfig({
  lang: "zh-CN",
  title: "Ryan100c的博客",
  description: "杂七杂八的东西！",
  head: [
      // 配置站点图标
      ['link', { rel: 'icon', type: 'image/png', href: 'https://i.postimg.cc/ZRHDmzH8/Untitled30-20251111074818.png' }],
      ['script', { src: 'https://code.iconify.design/2/2.1.2/iconify.min.js', async: 'true' }],
      // 首页与全站标题所用字体（Playfair Display / Noto Serif SC / JetBrains Mono）
      ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
      ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
      ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Noto+Serif+SC:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&display=swap' }],
  ],

  theme: theme({
    logo: 'https://i.postimg.cc/ZRHDmzH8/Untitled30-20251111074818.png',
    appearanc: 'force-dark',
    collections: [ 
      { 
        type: 'post',
        dir: 'posts',
        title: '博客',
        tags: true,
        archives: true,
        categories: true,
        postList: true,
        postCover: 'right',
        pagination: 10,
        // 文章里写的是 date 字段，Plume 读取的是 createTime（缺省时用文件创建时间，
        // 在 CI 上就是构建时间）。这里用 date 覆盖 createTime。
        autoFrontmatter: {
          transform: (data) => {
            const t = dateToCreateTime(data.date)
            if (t) data.createTime = t
            return data
          },
        },
      },
      {
        type: 'doc',
        dir: 'RyansRenderingKit',
        linkPrefix: '/RyansRenderingKit/',
        title: 'Ryan\'sRenderingKit',
        sidebar: ['Overview', 'QuickStart', 'Transformer', 'Examples', 'Customization', 'Details'],
      },
      
    ],
    markdown: {
      pdf: true, 
      collapse: true, 
      field: true, 
      abbr: true, 
      timeline: true, 
      window: true
    },
    navbar: [
      { text: "首页", link: "/" },
      { text: "文章", link: "/posts/" },
      { text: "项目", link: "/projects/" },
      { text: "关于", link: "/about/" },
      { text: "友链", link: "/friends.md" },
      { text: "GitHub", link: "https://github.com/hotpad100c" },
    ],

    social: [
      { icon: "github", link: "https://github.com/hotpad100c" },
      {icon: "bilibili", link: "https://b23.tv/gR2fZk3"},
      {icon: "youtube", link: "https://youtube.com/@ryan100c"},
    ],

    collection: {
      avatar: "/logo.png",
      name: "Ryan100c",
      description: "你好啊，朋友",
    },

    footer: {
      message: "使用 VuePress + Plume 主题构建",
      copyright: "Copyright © 2025 Ryan100c",
    },
    comment: {
      provider: 'Giscus', // "Artalk" | "Giscus" | "Twikoo" | "Waline"
      comment: true,
      repo: 'hotpad100c/hotpad100c.github.io',
      repoId: 'R_kgDOO6QXBw',
      category: 'General',
      categoryId: 'DIC_kwDOO6QXB84CxcwQ',
      mapping: 'url',
      reactionsEnabled: true,
      inputPosition: 'top',
    },
    
  }),
  plugins: [homePostsPlugin(), mirrorPlugin()],
  cache: 'filesystem',
  bundler: webpackBundler({
    devServerSetupMiddlewares: (middlewares) => [{ name: 'mirror-sites', middleware: serveMirror }, ...middlewares],
  }),
});
