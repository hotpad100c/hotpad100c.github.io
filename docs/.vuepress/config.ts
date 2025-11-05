import { defaultTheme } from 'vuepress'

export default {
  lang: 'zh-CN',
  title: '我的博客',
  description: '这是一个使用 VuePress 搭建的静态博客',
  theme: defaultTheme({
    navbar: [{ text: '首页', link: '/' }],
  }),
}
