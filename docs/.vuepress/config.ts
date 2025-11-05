import { defineUserConfig } from "vuepress";
import theme from "vuepress-theme-plume";
import { webpackBundler } from '@vuepress/bundler-webpack'

export default defineUserConfig({
  lang: "zh-CN",
  title: "Ryan100c的博客",
  description: "-。",

  theme: theme({
    logo: "/logo.png",
    favicon: "/logo.png",

    navbar: [
      { text: "首页", link: "/" },
      { text: "文章", link: "/posts/" },
      { text: "关于", link: "/about/" },
      { text: "GitHub", link: "https://github.com/hotpad100c" },
    ],

    social: [
      { icon: "github", link: "https://github.com/hotpad100c" },
    ],

    collection: {
      avatar: "/logo.png",
      name: "Ryan100c",
      description: "-",
    },

    footer: {
      message: "使用 VuePress + Plume 主题构建, 参考 https://github.com/ZXBHELLO/Website",
      copyright: "Copyright © 2025 Ryan100c",
    },
  }),
  bundler: webpackBundler(),
});
