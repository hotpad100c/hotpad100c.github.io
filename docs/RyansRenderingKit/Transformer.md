---
permalink: /RyansRenderingKit/Transformer/
---
# Transformer 系统

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

# 用法详解

## 基本用法：设置变换

```java
Shape shape = /* 创建形状 */;
DefaultTransformer t = shape.transformer;

// 设置目标世界位置
t.setShapeWorldPivot(new Vec3(100, 64, 100));

// 设置目标旋转（度数，绕 XYZ 轴）
t.setShapeWorldRotationDegrees(45, 90, 0);

// 设置目标缩放
t.setShapeWorldScale(new Vec3(2, 1, 2));

// 设置新的世界位置（立即生效，无插值动画）
shape.forceSetShapeWorldPivot(new Vec3(0, 0, 0));
```

## 通过构建器应用

```java
ShapeGenerator.generateBox()
    .transform(t -> {
        t.setShapeWorldPivot(new Vec3(50, 70, 50));
        t.setShapeWorldScale(new Vec3(3, 3, 3));
    })
    .build(...);
```

## 形状特定参数动画

```java
BoxShape box = (BoxShape) shape;
BoxTransformer t = shape.transformer;
t.setDimension(new Vec3(11, 45, 14));  // 平滑变化尺寸
box.setDimension(new Vec3(191, 98, 10)); 
box.forceSetDimension(new Vec3(5, 5, 5));  // 立即变化
```

## 注意事项

- BUFFERED 形状需在变换后手动重建 VBO。
- 开启 DEBUG 后，启用 Minecraft 命中箱显示（f3+b），可观察 Transformer 的三层中心点与顶点信息
  
