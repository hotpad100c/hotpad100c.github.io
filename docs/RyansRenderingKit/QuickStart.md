---
permalink: /RyansRenderingKit/QuickStart/
---

# 快速开始

## 1. 导入

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

## 2. 创建一个形状

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

::: collapse
- 所有形状快速入口
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
- 渲染类型

| 类型          | 适用场景                           | 性能 |
|---------------|------------------------------------|------|
| IMMEDIATE     | 少量出现/需要自定义化的形状             | 低   |
| BATCH         | 大量动态形状       | 中   |
| BUFFERED      | 大量完全静止的形状           | 高   |

:::

## 3. 注册形状
在本库中，`ShapeManagers` 是形状渲染的核心管理器。它负责将形状注册到适当的渲染管道，并在每帧的世界渲染事件中自动调用渲染逻辑。

要注册一个形状并使其渲染，你需要使用`ShapeManagers.addShape()`方法注册它。
以下的例子将注册一个立方体。

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

每个形状都需要一个唯一 ID（ResourceLocation 类型，格式如 modid:path/to/shape），它在库中扮演“键”的角色，用于标识和管理。
