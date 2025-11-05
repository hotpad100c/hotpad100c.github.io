import { defineUserConfig } from 'vuepress'
import { defaultTheme } from '@vuepress/theme-default'

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'Ryan100c的博客',
  description: '这是Ryan100c的VuePress博客！',
  theme: defaultTheme({
    navbar: [
      { text: '首页', link: '/' },
      { text: '关于', link: '/about/' },
    ],
  }),
})
