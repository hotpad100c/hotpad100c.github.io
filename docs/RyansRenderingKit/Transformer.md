---
permalink: /RyansRenderingKit/Transformer/
---

# 形状构建器与变换器

## 形状目录与构建器

所有的构建器都继承自 `BaseBuilder`，并共享以下公共方法：

* `.pos(Vec3)` — 设置形状在世界中的基准位置。
* `.color(Color)` — 设置基础颜色。
* `.alpha(float)` — 设置透明度 (0.0 - 1.0)。如果小于 1.0，则启用透明度并触发三角形形状的深度排序渲染。
* `.seeThrough(boolean)` — 当为 `true` 时，禁用深度测试。
* `.transform(Consumer<T>)` — 附加一个在每一帧运行的回调函数，用于更新形状的状态。

### 常用形状构建器：

* **Face Circle（面圆形）**: 一个由三角形填充的平面圆。
* **Line Circle（线圆形）**: 一个线框圆（空心）。
* **Box Face（面立方体）**: 一个实心的、由 6 个面组成的 3D 立方体。
* **Box Wireframe（线框立方体）**: 一个由 12 条边组成的线框立方体。
* **Sphere（球体）**: 一个由三角形组成的 UV 球体。
* **Line（线段）**: 两个坐标之间的一条线。第一个和最后一个顶点会自动获得一个透明的“端盖”顶点，以避免在末端出现渲染伪影。
* **Cylinder Wireframe（线框圆柱体）**: 一个带有顶部/底部圆圈和纵向连接线的线框圆柱体。
* **Block（方块）**: 使用 Minecraft 的 `BlockRenderDispatcher` 渲染一个特定的 `BlockState`。你可以自定义光照水平（使用 `LightTexture.FULL_BRIGHT` 以获得最大亮度）。
* **Item（物品）**: 使用 Minecraft 的 `ItemRenderer` 渲染一个 `ItemStack`。
* **Entity（实体）**: 在世界中渲染一个实时的、`Entity` 实例。
* **OBJ Model（OBJ 模型）**: 渲染一个外部加载的 `.obj` 文件。
* **Text（文本）**: 在 3D 世界中渲染 `Component` 文本。



## Transformer 系统

在本库中，**Transformer 系统** 是核心组件之一，它负责处理形状的所有变换操作，包括位置、旋转、缩放，以及可能的模型信息改变。
这个系统支持世界（world）、本地（local）和视觉（matrix）三种变换层级、
平滑插值动画、形状特定参数的动态调整，以及父子层次结构。
它封装了 Minecraft 的 PoseStack 和矩阵操作，让开发者能以高抽象级别控制形状的几何变换，而无需直接处理底层矩阵计算。

Transformer 是每个 Shape 的内部属性（`shape.transformer`），通过构建器（Builder）的 `.transform(Consumer<Transformer>)` 方法或直接访问进行配置。

# 核心类和架构

## 1. DefaultTransformer（默认变换器）
- **关键字段**：
  - `TransformLayer local`：局部变换（相对于形状自身）。
  - `TransformLayer world`：世界变换（绝对坐标/相对于父形状）。
  - `TransformLayer matrix`：渲染矩阵层（额外调整）。
  - `float delta`：当前 tickDelta，用于插值。

- **主要方法**：
  - **更新与同步**：
    - `updateTickDelta(float d)`：更新 delta 并调用 `updateAll(d)`，遍历三层更新。
    - `syncLastToTarget()`：同步所有层的目标值到当前值（跳过动画）。
    - `asyncModelInfo()`：检查是否有未同步的模型信息（子类重写）。
  - **Getter/Setter**：
    - `getShapeWorldPivot(boolean lerp)`、`setShapeWorldPivot(Vec3 v)`：世界位置。
    - `getShapeWorldRotation(boolean lerp)`、`setShapeWorldRotation(Quaternionf q)` 或 `setShapeWorldRotationDegrees(float x, y, z)`：世界旋转（支持度数）。
    - 类似方法用于 local 和 matrix 层。
    - 简便 getter 如 `getWorldPivot()`（默认 lerp=true，lerp 为 true 时返回插值值）

## 2. TransformLayer（单层变换）

- **关键字段**（均为 ValueTransformer 子类）：
  - `Vec3Transformer position`：位置（默认 Vec3.ZERO）。
  - `QuaternionTransformer rotation`：旋转（默认 identity 四元数）。
  - `Vec3Transformer scale`：缩放（默认 Vec3(1,1,1)）。

- **主要方法**：
  - `update(float delta)`：更新所有 Transformer。
  - `syncLastToTarget()`：同步所有。
  - Setter 如 `setPosition(Vec3 v)`、`setRotationDegrees(float x, y, z)`。
  - Getter 如 `getPosition(boolean useLerp)`（lerp 为 true 时返回插值值）。

## 3. ValueTransformer 及其子类

ValueTransformer 是抽象基类，用于处理不同数据类型的目标值与当前值的插值。

- **基类**：`ValueTransformer<T>`

- **子类**：
  - **Vec3Transformer**（Vec3 类型）：处理分量。
  - **QuaternionTransformer**（Quaternionf 类型）：处理旋转。
  - **FloatTransformer**（Float 类型）：处理简单差值，用于半径、线宽等。
  - **IntTransformer**（Integer 类型）：处理整数差值，用于段数等。

## 4. ModelInfoLayer 及其子类

- **基类**：`ModelInfoLayer`

- **子类**（路径在 `shapeModelInfoTransformer` 目录）：
  - **BoxModelInfo**：管理盒形尺寸（Vec3Transformer dimension）。
  - **CircleModelInfo**：管理圆形参数（IntTransformer segments, FloatTransformer radius）。
  - **LineModelInfo**：管理线宽（FloatTransformer width）。
  - **TwoPointLineModelInfo**（扩展 LineModelInfo）：管理起点/终点（Vec3Transformer start/end）。

## 5. 形状特定 Transformer 子类

DefaultTransformer 被扩展以支持形状特定逻辑：
- **BoxTransformer**：用于盒状体管理。
- **CylinderTransformer**：添加 CircleModelInfo 和 FloatTransformer（height），用于圆柱和圆锥体。
- **FaceCircleTransformer**：添加 CircleModelInfo。用于圆面与球体。
- **LineCircleTransformer**：添加 CircleModelInfo 和 LineModelInfo。
- **SimpleLineTransformer**：添加 LineModelInfo（用于线宽）。
- **TwoPointsLineTransformer**：添加 TwoPointLineModelInfo（起点、终点、线宽）。

## 注意事项

- BUFFERED 形状需在变换后手动重建 VBO。
- 使用 /ryansRenderingKit_DEBUG toggle 开启 DRBUG 后，启用 Minecraft 命中箱显示（f3+b），可观察 Transformer 的三层中心点与顶点信息
  
