---
permalink: /RyansRenderingKit/Examples/
---

# 示例与参考

## 使用示例

### 示例 A：方块螺旋

```java
for (int i = 0; i < 20; i++) {
    double angle = i * 0.5;
    Vec3 offset = new Vec3(Math.cos(angle) * 3, i * 0.5, Math.sin(angle) * 3);
    
    ShapeManagers.addShape(
        new ResourceLocation("example", "block_" + i),
        ShapeGenerator.block()
            .pos(playerPos.add(offset))
            .blockState(Blocks.GOLD_BLOCK.defaultBlockState())
            .color(new Color(255, 215, 0))
            .renderType(Shape.RenderType.BUFFERED)
            .build()
    );
}

```

### 示例 B：带子级的旋转立方体

```java
// 创建父立方体
BoxFaceShape parent = ShapeGenerator.boxFace()
    .pos(center)
    .size(2f)
    .color(Color.GRAY)
    .transform(t -> t.setWorldRotationDegrees(new Vec3(0, System.currentTimeMillis() / 10.0, 0)))
    .build();

// 添加一个围绕父级旋转的小球体子级
Shape sphereChild = ShapeGenerator.sphere()
    .color(Color.RED)
    .radius(0.5f)
    .transform(t -> t.setLocalPosition(new Vec3(3, 0, 0))) // 偏离父级中心 3 格
    .build();

parent.addChild(sphereChild);
ShapeManagers.addShape(new ResourceLocation("mod", "orbit"), parent);
ShapeManagers.addShape(new ResourceLocation("mod", "orbitChild"), sphereChild);

```

## 快速参考表

### 渲染类型决策表

| 场景 | 推荐类型 | 性能损耗 |
| --- | --- | --- |
| 静态装饰（地图叠加层、大型模型） | `BUFFERED` | 上传后每帧开销极小 |
| 一次性效果（爆炸、标记） | `BATCH` 或 `IMMEDIATE` | 适用于大多数形状 |
| 需要高度自定义的图形 | `IMMEDIATE` | 适用于要求极高自定义度的高级自定义图形，一般推荐使用BATCH。|

### 变换层参考

| 层级 | 应用顺序 | 典型用途 |
| --- | --- | --- |
| `world` | 第 1 | 基础世界位置，旋转和缩放 |
| `local` | 第 2 | 相对于世界位置的位移，旋转和缩放 |
| `matrix` | 第 3 | 仅视觉上的位移，旋转和缩放；不影响射线检测等 |

### 设置器快速参考
更具Transformer实例可获得拥有它的图形。
所有图形拥有设置器用于设置自身信息。所有设置器都有“平滑（smooth）”和“强制（force）”（瞬时）两种变体：

| 平滑 (插值) | 瞬时 (无插值) |
| --- | --- |
| `setWorldPosition(vec)` | `forceSetWorldPosition(vec)` |
| `setWorldRotation(quat)` | `forceSetWorldRotation(quat)` |
| `setWorldScale(vec)` | `forceSetWorldScale(vec)` |
| `setLocalPosition(vec)` | `forceSetLocalPosition(vec)` |
| `setLocalRotation(quat)` | `forceSetLocalRotation(quat)` |
| `setLocalScale(vec)` | `forceSetLocalScale(vec)` |
| `setRenderPivot(vec)` | `forceSetRenderPivot(vec)` |
| `setRenderRotation(quat)` | `forceSetRenderRotation(quat)` |
| `setRenderScale(vec)` | `forceSetRenderScale(vec)` |
