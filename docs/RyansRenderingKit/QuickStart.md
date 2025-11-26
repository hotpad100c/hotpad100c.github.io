---
permalink: /RyansRenderingKit/QuickStart/
---

# 快速开始

## 1. 导入

### ✦ Maven 仓库
本库[已上传至Maven Central](https://mvnrepository.com/artifact/io.github.hotpad100c/ryansrenderingkit)。因此只需要在`build.gradle` 加入依赖即可。

如果你使用 Architectury Loom / Fabric Loom，这里通常已经包含：

```gradle
repositories
    mavenCentral()
}
```

如果不存在，请添加。随后，在你的`build.gradle` ,`dependencies {}` 中加入：

### ✦ 添加依赖

::: warning
不建议把本库直接打进你的模组 JAR 中。
这可能导致在生产环境出现多个本库的重复副本，并点一杯酒吧里的炒饭。
:::

```gradle
dependencies {
    modImplementation "io.github.hotpad100c:ryansrenderingkit:{版本号}"
}
```

`版本号` 请前往最新版本页面查看：
[https://mvnrepository.com/artifact/io.github.hotpad100c/ryansrenderingkit](https://mvnrepository.com/artifact/io.github.hotpad100c/ryansrenderingkit)



## 2. 创建一个形状

本库提供多个内置形状构建器。一般情况下，生成图形使用`ShapeGenerator`。生成格式符合以下特征：

```java
Shape shape = ShapeGenerator.generateXXX()
	.pos(...)   
	.其它参数 (...)
	.color(...)    
	.seeThrough(...) 
	.transform(transformer -> {...})
	.build(...)
```

下面的示例会生成一个位于`(100, 70, 100)`、边长为 5、可穿墙看见的青色立方体：

```java
ShapeGenerator.generateBox()
        .pos(new Vec3d(100, 70, 100))
        .size(new Vec3d(5, 5, 5))
        .color(Color.CYAN)
        .seeThrough(true)
        .build(Shape.RenderingType.BATCH);
```

::: details 所有形状快速入口

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
:::

::: details 渲染类型

| 类型      | 适用场景                         | 性能 |
| ----------- | ---------------------------------- | ------ |
| IMMEDIATE | 少量、特殊、需要临时自定义的形状 | 低   |
| BATCH     | 大量动态形状（推荐一般使用）     | 中   |
| BUFFERED  | 完全静止、数量巨大的形状         | 高   |

:::

## 3. 注册并渲染
`ShapeManagers` 是本库的核心渲染管理器。
它会在每帧的世界渲染事件中自动处理所有注册的形状。

要让形状开始渲染，只需要调用：
`ShapeManagers.addShape(id, shape)`

以下的例子将注册一个立方体:

```java
Shape cube = ShapeGenerator.generateBox()
        .pos(new Vec3d(100, 70, 100)) 
        .size(new Vec3d(5, 5, 5)) 
        .color(Color.CYAN) 
        .seeThrough(true) 
        .build(Shape.RenderingType.BATCH)

ResourceLocation id = new Identifier("mymod", "debug_box_1");  // 自定义 ID
ShapeManagers.addShape(id, cube);//注册形状
```
:::info
每个形状都需要一个唯一 ID（ResourceLocation 类型，格式如 modid:path/to/shape），这个 ID 确保形状不会重复注册或冲突，且可被追踪。
:::
调用 `addShape(id, Shape)`时，图形将长期保存，直到被移除。此外，也可以调`addShape(shape)` 进行**匿名形状**注册，这样的图形是一次性的，**会在首次渲染后被自动移除**。

你可以通过`ShapeManagers.removeShape(id)`移除指定图形，或`ShapeManagers.removeShapes(rootID)`进行批量移除。

<LinkCard title="变换器" href="https://hotpad100c.github.io/RyansRenderingKit/Transformer" description="变换器特性介绍" />
