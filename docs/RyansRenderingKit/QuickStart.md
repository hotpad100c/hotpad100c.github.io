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


## 3. 基础操作

### 注册形状

要向世界中添加形状，请调用 `ShapeManagers.addShape(...)`，并传入一个 `ResourceLocation` 标识符和构建好的形状：

```java
// 创建并添加一个酷炫的球体
SphereShape coolSphere =
		ShapeGenerator.sphere()
        .pos(new Vec3(100, 70, 100))
        .radius(2.5f)
        .color(Color.BLUE)
        .build()

ShapeManagers.addShape(
    ResourceLocation.fromNamespaceAndPath("my_mod", "cool_sphere"),
    coolSphere
);

```
:::info
每个形状都需要一个唯一 ID（ResourceLocation 类型，格式如 modid:path/to/shape），这个 ID 确保形状不会重复注册或冲突，且可被追踪。
:::
调用 `addShape(id, Shape)`时，图形将长期保存，直到被移除。此外，也可以调`addShape(shape)` 进行**匿名形状**注册，这样的图形是一次性的，**会在首次渲染后被自动移除**。

### 操作形状

#### 默认tick逻辑

我们创建好了图形，并拿到了它的实例，是时候充分利用它提供的功能了。
你现在可以认为，你持有的图形是一个真实存在于世界中的对象，就像实体，方块一样。

这个是实例有自己的tick回调函数，它叫`transformer`,它每帧执行一次。

:::info
仅有渲染模式为非 `BUFFERED `模式的图形可以这样操作。
:::

为了使用这个回调，你需要在构建时加入这一行：

```java
SphereShape coolSphere =
		ShapeGenerator.sphere()
		//已有的其它构建参数...
        .transform(transformer->{// [!code ++]
								// [!code ++]
		})						// [!code ++]
        //已有的其它构建参数...
        .build();
```

现在，你可以通过回调函数传入的`transformer`控制该图形每帧的逻辑。此外，你可以从`transformer.getShape()`拿到图形实例本身，进行更多的操控。

:::info
如果你持有图形实例，你也可以在其它逻辑循环内自由地操作图形。
:::
#### 变位 / 变形

每个图形都拥有一个对应的 `Transformer`（或其子类）实例，用于描述和控制图形自身的可变属性。  
例如，正方体线框图形的 `Transformer` 可以控制线条粗细；球体图形的 `Transformer` 则可以控制分段数、半径等参数。

只要你持有图形实例，就可以在任意逻辑体系中自由修改这些属性，从而实时影响图形在下一帧中的表现形式。

<LinkCard title="变换器" href="https://hotpad100c.github.io/RyansRenderingKit/Transformer" description="变换器特性介绍" />


#### 存储数据

每个图形实例内部都维护了一个 `Map<String, Object>` 结构，用于存储自定义数据。  
你可以通过 `putCustomData()` 与 `getCustomData()` 方法自由地写入和读取这些数据，其中 `String` 作为键，用于标识不同的数据项。

### 移除形状

你可以通过`ShapeManagers.removeShape(id)`移除指定图形，或`ShapeManagers.removeShapes(rootID)`进行批量移除。
如果你已经持有图形实例本身，可以调用其`discard`方法自动完成上述操作。

```java
ShapeManagers.removeShape(ResourceLocation.fromNamespaceAndPath("my_mod", "cool_sphere"));

coolSphere.discard();
```
