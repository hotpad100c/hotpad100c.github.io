import { defineUserConfig } from "vuepress";
import theme from "vuepress-theme-plume";
import { webpackBundler } from '@vuepress/bundler-webpack'
import type { Plugin } from 'vuepress/core'

/**
 * 为首页样式候选生成文章数据（@temp/home-posts.js）。
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
        excerpt: plain(p.content.replace(/^---[\s\S]*?---/, ''))
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
      // 首页样式候选所用字体
      ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
      ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
      ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@400;600;800&family=JetBrains+Mono:wght@400;700&family=Noto+Serif+SC:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Space+Grotesk:wght@400;600;700&display=swap' }],
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
  plugins: [homePostsPlugin()],
  cache: 'filesystem',
  bundler: webpackBundler(),
});
