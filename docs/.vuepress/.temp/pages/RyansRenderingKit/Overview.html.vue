<template><div><h1 id="ryansrenderingkit-使用文档" tabindex="-1"><a class="header-anchor" href="#ryansrenderingkit-使用文档"><span>RyansRenderingKit 使用文档</span></a></h1>
<RepoCard repo="hotpad100c/ryansrenderingkit" /><div class="demo-wrapper">
  <div class="demo-head">
    <div class="demo-ctrl"><i></i><i></i><i></i></div>
    
  </div>
  <div class="demo-container" >
<p>Ryan's Rendering Kit 是一个为 Minecraft 开发的 Fabric 模组库，它提供了一套<mark>声明式的、面向对象的图形管理方式。</mark></p>
<p>这将复杂的三维图形渲染过程抽象成简单直观的对象操作，让开发者能够无需关心图形行为之外的其它细节。</p>
<p>该库可以在 <mark>1.17 到 26.1</mark> 版本的所有 Minecraft 中运行。</p>
</div></div><h2 id="基础工作流" tabindex="-1"><a class="header-anchor" href="#基础工作流"><span>基础工作流</span></a></h2>
<p>使用该库的工作流程相当简单。</p>
<VPTimeline :card="undefined"><VPTimelineItem :card="undefined"><template #title>申明</template><p>使用链式构建器构建一个形状，将其注册到 ShapeManagers 系统中。</p>
</VPTimelineItem><VPTimelineItem :card="undefined"><template #title>操纵</template><p>在外部，或图形的 transformer 回调函数内自由地修改图形的信息，定义它的行为。</p>
</VPTimelineItem><VPTimelineItem :card="undefined"><template #title>释放</template><p>在图形不再使用时，调用其 discard 方法 或 直接将其从 ShapeManagers 中移除。</p>
</VPTimelineItem></VPTimeline></div></template>


<script setup>
import RepoCard from 'vuepress-theme-plume/features/RepoCard.vue'
</script>