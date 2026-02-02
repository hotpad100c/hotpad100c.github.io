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


## 3. 添加与移除形状

### 注册形状

要向世界中添加形状，请调用 `ShapeManagers.addShape(...)`，并传入一个 `ResourceLocation` 标识符和构建好的形状：

```java
import ml.mypals.ryansrenderingkit.shapeManagers.ShapeManagers;
import ml.mypals.ryansrenderingkit.builders.shapeBuilders.ShapeGenerator;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.phys.Vec3;
import java.awt.Color;

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

### 移除形状

你可以通过`ShapeManagers.removeShape(id)`移除指定图形，或`ShapeManagers.removeShapes(rootID)`进行批量移除。
如果你已经持有图形实例本身，可以调用其`discard`方法自动完成上述操作。

```java
ShapeManagers.removeShape(ResourceLocation.fromNamespaceAndPath("my_mod", "cool_sphere"));

coolSphere.discard();
```

<LinkCard title="变换器" href="https://hotpad100c.github.io/RyansRenderingKit/Transformer" description="变换器特性介绍" />
