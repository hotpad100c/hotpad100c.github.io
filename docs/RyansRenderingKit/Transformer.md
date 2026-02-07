---
permalink: /RyansRenderingKit/Transformer/
---

# Transformer 系统

Transformer 系统支持三种变换层级：**世界（world）**、**本地（local）** 和 **视觉（matrix）**。

它们在语义和作用范围上的区别如下：

- **world（世界变换）**  
  表示图形在世界坐标系中的位置、旋转与缩放。  
  该层级会影响图形的射线计算结果，并且会传递给所有子图形，是最基础、也是最“真实”的空间变换。

- **local（本地变换）**  
  基于 world 层变换之上的额外偏移，包括位置、旋转与缩放的修正。  
  该层级同样会影响图形的射线计算，但**不会影响子图形**，仅作用于当前图形本身。

- **matrix（视觉变换）**  
  在 world 与 local 变换结果的基础上施加的纯视觉偏移，用于最终渲染阶段的矩阵变换。  
  该层级**不参与射线计算**，也**不会影响子图形**，仅用于控制图形的显示效果。


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
  
