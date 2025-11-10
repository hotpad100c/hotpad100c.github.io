import { defineUserConfig } from "vuepress";
import theme from "vuepress-theme-plume";
import { webpackBundler } from '@vuepress/bundler-webpack'

export default defineUserConfig({
  lang: "zh-CN",
  title: "Ryan100c的博客",
  description: "杂七杂八的东西！",

  theme: theme({
    logo: "/images/icon.png",
    favicon: "/images/icon.png",
    collections: [ 
      { type: 'post', dir: 'posts', title: '博客' }
    ],
    markdown: {
      pdf: true, 
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
  cache: 'filesystem',
  bundler: webpackBundler(),
});
