import { defineClientConfig } from 'vuepress/client'

import './styles/index.css'
import './styles/slant.css'
import NavPage from './components/NavPage.vue'
import HomeTerminal from './components/home/HomeTerminal.vue'
import HomeEditorial from './components/home/HomeEditorial.vue'
import HomeBlueprint from './components/home/HomeBlueprint.vue'
import HomeBento from './components/home/HomeBento.vue'
import HomeGrid from './components/home/HomeGrid.vue'
import HomeSlant from './components/home/HomeSlant.vue'
import HomeCover from './components/home/HomeCover.vue'

export default defineClientConfig({
  enhance({ app }) {
    app.component('NavPage', NavPage) // 添加这一行来注册 NavPage 组件
    // 首页样式候选（预览页见 /home-styles/）
    app.component('HomeTerminal', HomeTerminal)
    app.component('HomeEditorial', HomeEditorial)
    app.component('HomeBlueprint', HomeBlueprint)
    app.component('HomeBento', HomeBento)
    app.component('HomeGrid', HomeGrid)
    app.component('HomeSlant', HomeSlant)
    app.component('HomeCover', HomeCover)
  },
})
