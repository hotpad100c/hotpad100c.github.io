---
permalink: /RyansRenderingKit/Overview/
---

# RyansRenderingKit 使用文档

**RyansRenderingKit** 是一个为 Minecraft Fabric 模组开发的世界渲染库，极大简化了在游戏世界中绘制自定义 3D 图形、线框、文字、模型等需求。它封装了 Minecraft 底层的渲染操作，让你可以较为轻松地轻松绘制与控制各种形状。


## 特性一览

- 盒子、圆柱、圆锥、球体、圆面、线框、任意折线、OBJ 模型等常见几何体
- 三种渲染模式：即时、批处理、顶点缓冲区
- 自动半透明排序、可控的透视
- 平滑动画差值管理
- 层次化变换、父子结构管理
- 图形生命周期管理
- 射线检测

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

## 快速开始

### 1. 导入

本库[已上传至Maven Central](https://mvnrepository.com/artifact/io.github.hotpad100c/ryansrenderingkit)。因此只需要在`build.gradle` 加入依赖即可。

如果你使用 Architectury Loom / Fabric Loom，这里通常已经包含：

```gradle
repositories
    mavenCentral()
}
```

如果不存在，请添加。随后，在你的`build.gradle` ,`dependencies {}` 中加入：

::: warning
及不建议将本库直接嵌入于你的模组。这可能导致多个模组副本在用户的客户端中同时运行，并点一杯酒吧里的炒饭。
:::

```gradle
dependencies {
    modImplementation "io.github.hotpad100c:ryansrenderingkit:{版本号}"
}
```

关于`版本号`，请前往[这里](https://mvnrepository.com/artifact/io.github.hotpad100c/ryansrenderingkit)查看最新版本。

### 2. 创建一个形状

本库提供多个内置形状构建器。一般情况下，生成图形使用`ShapeGenerator`。生成格式符合以下特征：

```java
Shape shape = ShapeGenerator.generateXXX()
	.pos(...)   
        .其它必要参数 (...)
        .color(...)    
        .seeThrough(...) 
	.transform(transformer -> {...})
        .build(...)
```

如下的例子将构建一个位于100，20，100处的，边长为5的，穿墙可见的青色立方体。

```java
ShapeGenerator.generateBox()                // 创建盒子构建器
        .pos(new Vec3d(100, 70, 100)) 
        .size(new Vec3d(5, 5, 5)) 
        .color(Color.CYAN) 
        .seeThrough(true) 
        .build(Shape.RenderingType.BATCH)
```

## 所有形状快速入口

```java
ShapeGenerator.generateBox()              // 实心盒子
ShapeGenerator.generateBoxWireframe()     // 线框盒子
ShapeGenerator.generateWireframedBox()    // 带颜色边框的实心盒子

ShapeGenerator.generateLine()             // 单条线段
ShapeGenerator.generateStripLine()        // 多点折线

ShapeGenerator.generateFaceCircle()       // 实心圆面
ShapeGenerator.generateLineCircle()       // 圆形线框
ShapeGenerator.generateSphere()           // 球体
ShapeGenerator.generateCylinder()         // 圆柱
ShapeGenerator.generateCone()             // 圆锥
ShapeGenerator.generateCylinderWireframe()// 圆柱线框
ShapeGenerator.generateConeWireframe()    // 圆锥线框

ShapeGenerator.generateObjModel()         // .obj 模型
ShapeGenerator.generateObjModelOutline() // .obj 模型线框

ShapeGenerator.generateText()             // 文字
```

## 渲染类型

| 类型          | 适用场景                           | 性能 |
|---------------|------------------------------------|------|
| IMMEDIATE     | 少量出现/需要自定义化的形状             | 低   |
| BATCH         | 大量动态形状       | 中   |
| BUFFERED      | 完全静止的形状           | 高   |

