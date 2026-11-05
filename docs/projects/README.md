---
title: 我的项目
pageLayout: page
---

<!--
  上半部分「模组」镜像 https://modsite-4x9.pages.dev/ （配置见 docs/.vuepress/mirrors.json）；
  下半部分来自 docs/projects/data.js，「模组」分类已由上面的镜像代替，这里不再显示。
  data.js 里的模组条目仍然保留：首页的「展示项目」和项目数用的是它。
-->

<SlantPage>

<p class="sl-label">项目</p>

# 我的项目

我已经创建和参与了许多大大小小的项目。它们会被列在下方，如果你感兴趣，一定要看看哦！

<MirrorFrame src="/mirror/modsite/" title="模组" source="https://modsite-4x9.pages.dev/" />

<NavPage :exclude="['模组']" />

</SlantPage>
