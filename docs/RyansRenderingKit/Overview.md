---
pageLayout: home
home: true
permalink: /RyansRenderingKit/Overview
---
<script setup>
import RepoCard from 'vuepress-theme-plume/features/RepoCard.vue'
</script>

# RyansRenderingKit 使用文档

<RepoCard repo="hotpad100c/ryansrenderingkit" />

## 概述与目的

Ryan's Rendering Kit 是一个为 Minecraft 开发的 Fabric 模组库，它提供了一种声明式的、面向对象的方式，直接在游戏世界中渲染任意 3D 几何图形。 其主要目的是让你能够定义各种几何形状——如立方体、球体、线段、圆柱体、OBJ 模型、文本，甚至是原生的 Minecraft 方块、物品和实体——并使它们在每一帧都得到渲染，且完整支持平滑动画、父子变换、透视（禁用深度测试）渲染以及 GPU 缓冲绘图调用。

该库可以在 1.17 到 26.1 版本的 Minecraft 中运行。 作为使用此库的模组作者，你无需担心任何渲染相关的细节，你只需与此处描述的稳定且与版本无关的公开 API 交互即可。

## 基础工作流

工作流程始终相同：
1.使用链式构建器构建一个形状。
2.使用 ResourceLocation 标识符将其注册到 ShapeManagers 系统中。
3.若有需要，在外部，或图形的 transformer 回调函数内修改图形的信息。
4.在图形不再使用时，调用其 discard 方法 或 直接将其从 ShapeManagers 中移除。

## 核心概念
- 形状 (Shape)
> 最基本的单元。此库中所有可渲染的对象都是 Shape 的子类。 一个形状持有自己的顶点数据 (model_vertexes)、索引缓冲区、以及一个控制其在世界中位置，旋转，大小和其它信息的 变换器（transformer）。

- 构建器 (Builder)
> 流式辅助类（如 BoxFaceBuilder、SphereBuilder 等），让你能通过可读的、可链式调用的方法来构造形状。 ShapeGenerator 类是唯一的入口点，它为你提供任何形状类型的全新构建器。

- 变换器 (Transformer)
> 动画系统的核心。每个形状都拥有一个 DefaultTransformer（或其子类，如 BoxTransformer、CylinderTransformer 等）。

- 形状管理器 (ShapeManagers)
> 全局注册表。它根据形状的几何类型（线段、三角形或“空网格”形状，如使用 Minecraft 自身渲染器的文本和方块）将每个形状路由到正确的内部绘制管道



<LinkCard title="快速开始" href="https://hotpad100c.github.io/RyansRenderingKit/QuickStart" description="前往快速入手教程" />
<LinkCard title="参考与案例" href="https://hotpad100c.github.io/RyansRenderingKit/Examples" description="一些现成的使用案例" />

## 适用性

### 什么情况下，它适合我？

这个渲染库为**简单的客户端渲染**设计。如过你以下条例是你寻找渲染库的目的，它大概适合你：

* 我的模组需要在世界中绘制一些简单的立体图形。
* 我不愿意在渲染系统上耗费太多时间。
* 我对渲染方面并不熟悉。

### 什么情况下，它不适合我？

如过你以下条例是你寻找渲染库的目的，那么很遗憾，它大概不适合你：

* 我的模组需要渲染复杂的图形或华丽的特效。
* 我的模组需要处理模型光照，贴图处理等。
* 我的模组需要一个2D的，UI上的渲染库。
