---
pageLayout: home
home: true
permalink: /RyansRenderingKit/Overview
config:
  - type: doc-hero
    full: false
    hero:

      name: Ryan'sRenderingKit
      text: 一个面向对象的渲染支持库
      tagline: 化繁为简
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


## 核心概念
- 形状 (Shape)
> 最基本的单元。此库中所有可渲染的对象都是 Shape 的子类。 一个形状持有自己的顶点数据 (model_vertexes)、索引缓冲区、以及一个控制其在世界中位置，旋转，大小和其它信息的 变换器（transformer）。

- 构建器 (Builder)
> 流式辅助类，让你能通过可读的、可链式调用的方法来构造形状。 ShapeGenerator 类是入口点，它为你提供任何形状类型的全新构建器。

- 变换器 (Transformer)
> 图形对象核心之一。每个形状都拥有一个 DefaultTransformer（或其子类，如 BoxTransformer、CylinderTransformer 等）。它们存储图形的位置，旋转，缩放等重要信息。

- 形状管理器 (ShapeManagers)
> 全局注册表。它根据形状的几何类型（线段、三角形或“空网格”形状，如使用 Minecraft 自身渲染器的文本和方块）将每个形状路由到正确的内部绘制管道



<LinkCard title="快速开始" href="https://hotpad100c.github.io/RyansRenderingKit/QuickStart" description="前往快速入手教程" />
<LinkCard title="参考与案例" href="https://hotpad100c.github.io/RyansRenderingKit/Examples" description="一些现成的使用案例" />
