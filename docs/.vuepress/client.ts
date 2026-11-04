import { defineClientConfig } from 'vuepress/client'

import './styles/index.css'
import './styles/slant.css'
import NavPage from './components/NavPage.vue'
import HomeSlant from './components/home/HomeSlant.vue'

export default defineClientConfig({
  enhance({ app }) {
    app.component('NavPage', NavPage) // 添加这一行来注册 NavPage 组件
    // 首页区块（在 docs/README.md 的 config 里以 type: HomeSlant 使用）
    app.component('HomeSlant', HomeSlant)
  },
})
