---
permalink: /RyansRenderingKit/Transformer/
---

# Transformer 系统

Transformer 系统支持三种变换层级：**世界（world）**、**本地（local）** 和 **视觉（matrix）**。

它们在语义和作用范围上的区别如下：

- **world（世界变换）**  
  表示图形在世界坐标系中的位置、旋转与缩放。  
  该层级会影响图形的射线计算结果，并且会传递给所有子图形。

- **local（本地变换）**  
  基于 world 层变换之上的额外偏移，包括位置、旋转与缩放。
  该层级同样会影响图形的射线计算，但**不会影响子图形**。

- **matrix（视觉变换）**  
  在 world 与 local 变换结果的基础上施加的纯视觉偏移，
  该层级**不参与射线计算**，也**不会影响子图形**。


## DefaultTransformer（默认变换器）

> 所有变换器的父类，默认的变换器。

- **关键方法**：
  - `syncLastToTarget()`：同步所有层的目标值到当前值（跳过动画）。
  - **Getter/Setter**：
    - `getShapeWorldPivot(boolean lerp)`、`setShapeWorldPivot(Vec3 v)`：世界位置。    
    - `getShapeWorldScale(boolean lerp)`、`setShapeWorldScale(Vec3 v)`：世界缩放。
    - `getShapeWorldRotation(boolean lerp)`、`setShapeWorldRotation(Quaternionf q)` 或 `setShapeWorldRotationDegrees(float x, y, z)`：世界旋转。
    - 类似方法用于 local 和 matrix 层。
    - 简便 getter 如 `getWorldPivot()`（默认 lerp=true，lerp 为 true 时返回插值值）

## TransformLayer（单层变换）

> 上方 DefaultTransformer 中实际用于管理位置，旋转和缩放的角色。

## ValueTransformer 及其子类

> ValueTransformer 是抽象基类，用于处理不同数据类型的目标值与当前值的插值。

- **子类**：
  - **Vec3Transformer**（Vec3 类型）：处理分量。
  - **QuaternionTransformer**（Quaternionf 类型）：处理旋转。
  - **FloatTransformer**（Float 类型）：处理简单差值，用于半径、线宽等。
  - **IntTransformer**（Integer 类型）：处理整数差值，用于段数等。

## ModelInfoLayer 及其子类

> 用于管理图形的位置，旋转和缩放意外的模型信息。

- **子类**（路径在 `shapeModelInfoTransformer` 目录）：
  - **BoxModelInfo**：管理盒形尺寸（Vec3Transformer dimension）。
  - **CircleModelInfo**：管理圆形参数（IntTransformer segments, FloatTransformer radius）。
  - **LineModelInfo**：管理线宽（FloatTransformer width）。
  - **TwoPointLineModelInfo**（扩展 LineModelInfo）：管理起点/终点（Vec3Transformer start/end）。

## 形状特定 Transformer 子类

DefaultTransformer 被扩展以支持形状特定逻辑：
- **BoxTransformer**：用于盒状体管理。
- **CylinderTransformer**：添加 CircleModelInfo 和 FloatTransformer（height），用于圆柱和圆锥体。
- **FaceCircleTransformer**：添加 CircleModelInfo。用于圆面与球体。
- **LineCircleTransformer**：添加 CircleModelInfo 和 LineModelInfo。
- **SimpleLineTransformer**：添加 LineModelInfo（用于线宽）。
- **TwoPointsLineTransformer**：添加 TwoPointLineModelInfo（起点、终点、线宽）。
