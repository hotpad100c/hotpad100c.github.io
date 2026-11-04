import { defineClientConfig } from 'vuepress/client'

import './styles/index.css'
import './styles/slant.css'
import NavPage from './components/NavPage.vue'
import HomeSlant from './components/home/HomeSlant.vue'

/**
 * 每次部署后，页面脚本的文件名（带哈希）都会变，旧文件会被删除。
 * 部署前就打开的标签页仍在运行旧脚本，切换页面时会去加载已经不存在的旧文件，
 * 导致切换失败、页面停在原处、之后点什么都没反应。
 * 这里在加载失败时整页刷新到目标地址，拿到新版本的页面。
 */
const CHUNK_ERROR = /Loading (CSS )?chunk [\w-]+ failed|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i
const RELOAD_KEY = 'chunk-reload'

function reloadTo(url: string): void {
  // 防止新版本本身有问题时无限刷新：同一地址 10 秒内只自动刷新一次
  try {
    const last = JSON.parse(sessionStorage.getItem(RELOAD_KEY) || 'null')
    if (last && last.url === url && Date.now() - last.time < 10_000) return
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ url, time: Date.now() }))
  } catch {}
  window.location.assign(url)
}

export default defineClientConfig({
  enhance({ app, router }) {
    app.component('NavPage', NavPage) // 添加这一行来注册 NavPage 组件
    // 首页区块（在 docs/README.md 的 config 里以 type: HomeSlant 使用）
    app.component('HomeSlant', HomeSlant)

    if (!__VUEPRESS_SSR__) {
      router.onError((err, to) => {
        if (CHUNK_ERROR.test(String(err?.message ?? err))) {
          reloadTo(router.resolve(to).href)
        }
      })
    }
  },
})
