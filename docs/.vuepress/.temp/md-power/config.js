import { defineClientConfig } from 'vuepress/client'
import Tabs from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/components/Tabs.vue'
import CodeTabs from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/components/CodeTabs.vue'
import PDFViewer from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/components/PDFViewer.vue'
import Plot from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/components/Plot.vue'
import FileTreeNode from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/components/FileTreeNode.vue'
import Abbreviation from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/components/Abbreviation.vue'
import VPTimeline from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/components/VPTimeline.vue'
import VPTimelineItem from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/components/VPTimelineItem.vue'
import VPCollapse from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/components/VPCollapse.vue'
import VPCollapseItem from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/components/VPCollapseItem.vue'
import VPField from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/components/VPField.vue'
import { setupMarkHighlight } from '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/composables/mark.js'

import '/home/user/hotpad100c.github.io/node_modules/.pnpm/vuepress-plugin-md-power@1.0.0-rc.173_esbuild@0.25.12_markdown-it@14.3.0_typescript@5.9_a0f783e095da8ffe47d3361045a322f0/node_modules/vuepress-plugin-md-power/lib/client/styles/index.css'

export default defineClientConfig({
  enhance({ router, app }) {
    app.component('Tabs', Tabs)
    app.component('CodeTabs', CodeTabs)
    app.component('PDFViewer', PDFViewer)
    app.component('Plot', Plot)
    app.component('FileTreeNode', FileTreeNode)
    app.component('Abbreviation', Abbreviation)
    app.component('VPTimeline', VPTimeline)
    app.component('VPTimelineItem', VPTimelineItem)
    app.component('VPCollapse', VPCollapse)
    app.component('VPCollapseItem', VPCollapseItem)
    app.component('VPField', VPField)
  },
  setup() {
        setupMarkHighlight("eager")

  }
})
