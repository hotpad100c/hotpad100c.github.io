---
pageLayout: home
home: true
permalink: /RyansRenderingKit/Overview
config:
  - type: doc-hero
    full: false
    hero:

      name: Ryan'sRenderingKit
      text: 化繁为简
      tagline: 一个面向对象的渲染支持库
      image: https://i.imgur.com/2FlFolC.png
    
      actions:
        - theme: brand
          text: 快速开始
          link: /RyansRenderingKit/QuickStart/
        - theme: alt
          text: Github仓库
          link: https://github.com/hotpad100c/ryansrenderingkit/tree/MultiVersion
        - theme: alt
          text: Maven仓库
          link: https://mvnrepository.com/artifact/io.github.hotpad100c/ryansrenderingkit
  - type: custom
---
<script setup>
import RepoCard from 'vuepress-theme-plume/features/RepoCard.vue'
</script>

# RyansRenderingKit 使用文档

<RepoCard repo="hotpad100c/ryansrenderingkit" />

:::: demo-wrapper

Ryan's Rendering Kit 是一个为 Minecraft 开发的 Fabric 模组库，它提供了一套==声明式的、面向对象的图形管理方式。==

这将复杂的三维图形渲染过程抽象成简单直观的对象操作，让开发者能够无需关心图形行为之外的其它细节。

该库可以在 ==1.17 到 26.1== 版本的所有 Minecraft 中运行。 

::::

## 基础工作流

使用该库的工作流程相当简单。

::: timeline

- 申明

  使用链式构建器构建一个形状，将其注册到 ShapeManagers 系统中。

- 操纵

  在外部，或图形的 transformer 回调函数内自由地修改图形的信息，定义它的行为。

- 释放

  在图形不再使用时，调用其 discard 方法 或 直接将其从 ShapeManagers 中移除。

:::
