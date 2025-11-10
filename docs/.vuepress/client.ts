import { defineClientConfig } from 'vuepress/client'

import './styles/index.css'
import NavPage from './components/NavPage.vue'
export default defineClientConfig({
  enhance({ app }) {
    app.component('NavPage', NavPage) // 添加这一行来注册 NavPage 组件
  },
})
