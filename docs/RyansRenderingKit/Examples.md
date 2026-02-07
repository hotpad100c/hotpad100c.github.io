---
permalink: /RyansRenderingKit/Examples/
---

# 示例与参考

本篇展示了 [Ryan's Rendering Kit 中所有的测试图形示例。](https://github.com/hotpad100c/ryansrenderingkit/blob/MultiVersion/src/main/java/ml/mypals/ryansrenderingkit/test/Debug.java)

## 基础图形

### 圆形图形

::: tabs#circle

@tab:active 面圆形

**资源位置**: `ryansrenderingkit:test/demo_face_circle`

**图形类型**: 填充圆形（Face Circle）

**配置参数**:
- **位置**: 动态计算（使用 `xPos()` 函数）
- **半径**: 2.0f
- **分段数**: 64
- **轴向**: Y轴（CircleAxis.Y）
- **颜色**: 随机颜色
- **透视**: 否（seeThrough = false）
- **渲染类型**: BATCH

**变换效果**:
```java
// 绕Y轴旋转
float time = client.getGameTime();
t.setShapeWorldRotationDegrees(0, time * 3, 0);
```

每帧绕Y轴旋转，旋转速度为游戏时间的3倍。

@tab 线圆形

**资源位置**: `ryansrenderingkit:test/demo_line_circle`

**图形类型**: 线框圆形（Line Circle）

**配置参数**:
- **位置**: 动态计算
- **半径**: 2.0f
- **分段数**: 64
- **轴向**: Y轴
- **线宽**: 3.0f
- **颜色**: 随机颜色
- **透视**: 否
- **渲染类型**: BUFFERED

**变换效果**:
```java
float time = client.getGameTime();
double offset = Math.sin(time * 0.05);

// 本地旋转（绕自身中心）
t.setShapeLocalRotationDegrees(0, time * 4, 0);

// 世界旋转（绕世界轴）
t.setShapeWorldRotationDegrees(time * 4, 0, 0);

// 动态调整世界锚点位置
t.setShapeWorldPivot(new Vec3(t.getWorldPivot().x(), 0, offset * 1));
```

复杂的组合旋转效果：同时进行本地和世界旋转，并且锚点随正弦波动。

:::

### 球体图形

::: tabs#sphere

@tab:active 基础球体

**资源位置**: `ryansrenderingkit:test/demo_sphere`

**图形类型**: 球体（Sphere）

**配置参数**:
- **位置**: 动态计算
- **半径**: 2.0f
- **分段数**: 32
- **颜色**: 随机颜色
- **透视**: 是（seeThrough = true）
- **渲染类型**: BUFFERED

**变换效果**:
```java
float time = client.getGameTime();
// 多轴旋转
t.setShapeWorldRotationDegrees(time * 2, time * 3, 0);
```

同时绕X轴和Y轴旋转，创造复杂的旋转效果。

@tab 父球体（带动画）

**资源位置**: `ryansrenderingkit:test/demo_sphere_2`

**图形类型**: 球体（父级）

**配置参数**:
- **位置**: Vec3(动态X, 0, 20)
- **半径**: 2.0f
- **分段数**: 6（低多边形）
- **颜色**: 随机颜色
- **透视**: 否
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
// 绕Y轴旋转
t.setShapeWorldRotationDegrees(0, time * 3, 0);

// 垂直上下浮动
float yOffset = (float) Math.sin(time * 0.1) * 2f;
Vec3 worldPivot = t.getShapeWorldPivot(false);
t.setShapeWorldPivot(new Vec3(worldPivot.x, 0 + yOffset, worldPivot.z));
```

球体会上下浮动，同时旋转。**这是一个父级形状，带有子形状层级**。

@tab 中间子球体

**资源位置**: `ryansrenderingkit:test/demo_sphere_2_child`

**图形类型**: 球体（子级 - 第一层）

**配置参数**:
- **相对位置**: Vec3(15, 0, 0)
- **半径**: 1.0f
- **分段数**: 3（极低多边形）
- **颜色**: 随机颜色
- **透视**: 否
- **渲染类型**: BATCH

**父子关系**: `s1.addChild(s2)` - 作为 demo_sphere_2 的子对象

**变换效果**:
```java
float time = client.getGameTime();
// 更快的旋转速度
t.setShapeWorldRotationDegrees(0, time * 6, 0);
```

继承父球体的位置和旋转，并在此基础上进行自己的旋转。

@tab 最小子球体（交互式）

**资源位置**: `ryansrenderingkit:test/demo_sphere_3_child`

**图形类型**: 球体（子级 - 第二层）

**配置参数**:
- **相对位置**: Vec3(7, 0, 0)
- **半径**: 0.3f
- **分段数**: 5
- **颜色**: 随机颜色
- **透视**: 是
- **渲染类型**: BATCH

**父子关系**: `s2.addChild(s3)` - 作为 demo_sphere_2_child 的子对象

**变换效果**:
```java
float time = client.getGameTime();
// 玩家视线检测
if (t.shape.isPlayerLookingAt().hit) {
    // 被看着时变为黄色
    t.shape.baseColor = new Color(255, 234, 0, 100);
} else {
    // 未被看着时为品红色
    t.shape.baseColor = new Color(255, 0, 251, 100);
}
```

**交互功能**: 当玩家视线指向此球体时，颜色会从品红色变为黄色。这展示了三级父子层级关系。

:::

### 3D模型

::: tabs#3dmodel

@tab:active OBJ模型（可抓取）

**资源位置**: `ryansrenderingkit:test/demo_obj_model`

**图形类型**: OBJ模型

**配置参数**:
- **位置**: 动态计算
- **模型文件**: `ryansrenderingkit:models/monkey.obj`（Blender猴头）
- **颜色**: 随机颜色
- **透视**: 否
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
// 基础旋转
transformer.setShapeWorldRotationDegrees(0, time * 5, 0);
Shape shape = transformer.shape;

// 视线检测和鼠标抓取逻辑
if (shape.isPlayerLookingAt().hit) {
    if (Minecraft.getInstance().mouseHandler.isLeftPressed()) {
        Player player = Minecraft.getInstance().player;
        
        // 首次抓取时记录距离
        if (!shape.getCustomData("isHolding", false)) {
            shape.putCustomData("isHolding", true);
            double distance = transformer.getShapeWorldPivot(true)
                    .distanceTo(player.getEyePosition());
            shape.putCustomData("distance", distance);
        }
        
        // 将模型移动到玩家视线方向
        transformer.setShapeWorldPivot(
            player.getEyePosition(transformer.getTickDelta())
                .add(player.getLookAngle().scale(shape.getCustomData("distance", 5.0)))
                .add(0, -1, 0)
        );
        transformer.world.position.syncLastToTarget();
    } else {
        if (shape.getCustomData("isHolding", false))
            shape.putCustomData("isHolding", false);
    }
    
    // 被看着时为红色
    shape.baseColor = new Color(255, 0, 72, 100);
} else {
    if (shape.getCustomData("isHolding", false))
        shape.putCustomData("isHolding", false);
    // 未被看着时为绿色
    shape.baseColor = new Color(0, 255, 72, 100);
}
```

**交互功能**: 
- 视线指向时变红
- 按住鼠标左键可抓取并移动模型
- 释放鼠标后恢复绿色

@tab OBJ模型轮廓线

**资源位置**: `ryansrenderingkit:test/demo_obj_outline`

**图形类型**: OBJ模型轮廓（Outline）

**配置参数**:
- **位置**: 动态计算
- **模型文件**: `ryansrenderingkit:models/monkey.obj`
- **线宽**: 4.0f
- **颜色**: 随机颜色
- **透视**: 否
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
// 旋转
t.setShapeWorldRotationDegrees(0, time * 5, 0);

// 视线检测改变颜色
if (t.shape.isPlayerLookingAt().hit) {
    t.shape.baseColor = new Color(255, 0, 72, 100);  // 红色
} else {
    t.shape.baseColor = new Color(0, 255, 72, 100);  // 绿色
}
```

只渲染模型的边缘轮廓线，创造线框效果。

:::

### 圆锥体

::: tabs#cone

@tab:active 实心圆锥（动态分段）

**资源位置**: `ryansrenderingkit:test/demo_cone`

**图形类型**: 圆锥体（Cone）

**配置参数**:
- **位置**: 动态计算
- **半径**: 2.0f
- **高度**: 4.0f
- **分段数**: 32（动态变化）
- **轴向**: Y轴
- **颜色**: 随机颜色
- **透视**: 否
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
// 绕X轴旋转
t.setShapeWorldRotationDegrees(time, 0, 0);

// 动态调整分段数（3-20段）
double f = (Math.sin(time * 0.1) + 1) / 2;
int seg = (int) (3 + f * 20 - 3);

// 视线检测改变颜色
if (t.shape.isPlayerLookingAt().hit) {
    t.shape.baseColor = new Color(0, 255, 149, 100);  // 青绿色
} else {
    t.shape.baseColor = new Color(136, 136, 136, 100);  // 灰色
}

t.setSegment(Math.max(3, seg));
```

**特殊效果**: 分段数随时间平滑变化，从粗糙的3边形到光滑的20边形循环变化。

@tab 线框圆锥

**资源位置**: `ryansrenderingkit:test/demo_cone_wire`

**图形类型**: 圆锥体线框（Cone Wireframe）

**配置参数**:
- **位置**: 动态计算
- **半径**: 2.0f
- **高度**: 4.0f
- **分段数**: 32（动态变化）
- **轴向**: Y轴
- **颜色**: 随机颜色
- **透视**: 否
- **线宽**: 3
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
// 旋转
t.setShapeWorldRotationDegrees(time, 0, 0);

// 动态分段数（同实心圆锥）
double f = (Math.sin(time * 0.1) + 1) / 2;
int seg = (int) (3 + f * 20 - 3);
t.setSegment(Math.max(3, seg));
```

与实心圆锥相同的动态分段效果，但只显示边缘线框。

:::

### 圆柱体

::: tabs#cylinder

@tab:active 实心圆柱（多重锚点）

**资源位置**: `ryansrenderingkit:test/demo_cylinder`

**图形类型**: 圆柱体（Cylinder）

**配置参数**:
- **位置**: 固定X坐标
- **半径**: 1.5f
- **高度**: 4.0f
- **分段数**: 32
- **轴向**: Z轴
- **颜色**: 随机颜色
- **透视**: 否
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
double offset = Math.sin(time * 0.05);

// 本地锚点（相对于形状自身）
t.setShapeLocalPivot(new Vec3(offset * 3, 0, 0));

// 矩阵锚点（用于额外变换）
t.setShapeMatrixPivot(new Vec3(0, offset * -2, 0));

// 世界锚点（绝对位置）
t.setShapeWorldPivot(new Vec3(fixedCylX, 0, offset * 1));
```

**特殊效果**: 展示了三种不同层级的锚点变换，创造复杂的振荡运动。

@tab 线框圆柱

**资源位置**: `ryansrenderingkit:test/demo_cylinder_wire`

**图形类型**: 圆柱体线框（Cylinder Wireframe）

**配置参数**:
- **位置**: 动态计算
- **半径**: 1.5f
- **高度**: 4.0f
- **分段数**: 32
- **轴向**: Z轴
- **颜色**: 随机颜色
- **透视**: 否
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
// 多轴旋转
t.setShapeWorldRotationDegrees(time * 2, time * 5, 0);
```

快速的双轴旋转，展示线框圆柱的结构。

:::

### 线条图形

::: tabs#lines

@tab:active 单线段

**资源位置**: `ryansrenderingkit:test/demo_line`

**图形类型**: 线段（Line）

**配置参数**:
- **起点**: Vec3(linex - 2, 0, 0)
- **终点**: Vec3(linex + 2, 4, 0)
- **线宽**: 3.0f
- **颜色**: 随机颜色
- **透视**: 否
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
// 起点固定
t.setStart(new Vec3(linex - 2, 0, 0));
// 终点Y坐标上下波动
t.setEnd(new Vec3(linex + 2, 4 + (float) Math.sin(time * 0.1) * 2, 0));
```

创造类似弹簧或波浪的效果。

@tab 条带线（螺旋）

**资源位置**: `ryansrenderingkit:test/demo_strip_line`

**图形类型**: 条带线（Strip Line）

**配置参数**:
- **顶点数**: 100个点（动态生成螺旋）
- **线宽**: 2.0f
- **颜色**: 随机颜色
- **透视**: 否
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
// 持续更新螺旋顶点，带有旋转偏移
((StripLineShape) t.getShape()).setVertexes(
    generateSpiral(cx, 100, 2.0f, 5.0f, time * 0.05f)
);
```

**螺旋生成函数**:
```java
// 生成螺旋形顶点列表
ArrayList<Vec3> generateSpiral(float centerX, int segments, 
                               float radius, float height, float offset) {
    ArrayList<Vec3> points = new ArrayList<>();
    for (int i = 0; i <= segments; i++) {
        float t = i / (float) segments;
        float angle = t * 10 * (float) Math.PI + offset;
        float x = centerX + radius * (float) Math.cos(angle);
        float z = radius * (float) Math.sin(angle);
        float y = t * height;
        points.add(new Vec3(x, y, z));
    }
    return points;
}
```

创造一个旋转上升的螺旋线条。

:::

### 盒子图形

::: tabs#box

@tab:active 面盒子

**资源位置**: `ryansrenderingkit:test/demo_box_face`

**图形类型**: 盒子面（Box Face）

**配置参数**:
- **位置**: 动态计算
- **尺寸**: Vec3(2, 2, 2)
- **颜色**: 随机颜色
- **透视**: 否
- **构造类型**: CENTER_AND_DIMENSIONS（中心点+尺寸）
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
// 三轴旋转，不同速度
t.setShapeWorldRotationDegrees(time * 2, time * 3, time * 1.5f);
```

创造一个在空中翻转的立方体。

@tab 线框盒子

**资源位置**: `ryansrenderingkit:test/demo_box_wire`

**图形类型**: 盒子线框（Box Wireframe）

**配置参数**:
- **AABB**: 从Vec3(xPos-2, 0, -2) 到 Vec3(xPos+2, 4, 2)
- **边缘宽度**: 3.0f
- **颜色**: 随机颜色
- **透视**: 否
- **构造类型**: CORNERS（两个角点定义）
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
// 绕Y轴旋转
t.setShapeWorldRotationDegrees(0, time * 4, 0);
```

只显示盒子的12条边缘线。

@tab 面+线盒子

**资源位置**: `ryansrenderingkit:test/demo_wireframed_box`

**图形类型**: 带线框的盒子（Wireframed Box）

**配置参数**:
- **AABB**: 从Vec3(xPos-2, 0, -2) 到 Vec3(xPos+2, 4, 2)
- **面颜色**: 随机颜色
- **边缘颜色**: Color(255, 255, 255, 200) - 白色
- **边缘宽度**: 2.0f
- **面透视**: 否
- **线透视**: 否
- **构造类型**: CORNERS
- **渲染类型**: BATCH

**变换效果**:
```java
float time = client.getGameTime();
// 三轴旋转，不同速度
t.setShapeWorldRotationDegrees(time * 1.5f, time * 2.5f, time * 0.5f);
```

同时渲染盒子的面和边缘线，创造更立体的效果。

:::

## 文本图形

::: tabs#text

@tab:active 公告牌文本

**资源位置**: `ryansrenderingkit:test/demo_text1`

**图形类型**: 文本（Text Shape）

**配置参数**:
- **位置**: 动态计算
- **公告牌模式**: BillBoardMode.ALL（总是面向玩家）
- **透视**: 是
- **阴影**: 是
- **轮廓**: 是
- **文本内容**: 
  - "§b§l!TEST!" （青色加粗）
  - "§e你好" （黄色）
  - "§aAWA" （绿色）
  - "§dBillBoardMode.ALL" （品红色）
- **文本颜色**: 青色、黄色、绿色、品红色

**变换效果**:
```java
// 垂直浮动
t.setShapeMatrixPivot(
    new Vec3(0, Math.sin(Minecraft.getInstance().level.getGameTime() * 0.05) * 0.3, 0)
);
```

**特性**: 
- 多行文本显示
- 支持Minecraft颜色代码
- 始终面向玩家（公告牌效果）
- 轻微上下浮动

@tab 距离测量文本

**资源位置**: `ryansrenderingkit:test/demo_t1`

**图形类型**: 动态文本标签

**配置参数**:
- **位置**: 动态计算（在两个锚点之间）
- **公告牌模式**: BillBoardMode.ALL
- **透视**: 是
- **阴影**: 是
- **轮廓**: 否
- **初始文本**: "-"
- **文本颜色**: 青色、黄色、绿色、品红色

**变换效果**:
```java
// 获取线段的起点和终点
Vec3 start = ((TwoPointsLineShape.TwoPointsLineTransformer) line.transformer).getStart(true);
Vec3 end = ((TwoPointsLineShape.TwoPointsLineTransformer) line.transformer).getEnd(true);
Entity player = Minecraft.getInstance().player;
if (player == null) return;

Vec3 eyePos = player.getPosition(t.getTickDelta()).add(0, player.getEyeHeight(), 0);
Vec3 lineDir = end.subtract(start);
double lineLength = lineDir.length();

if (lineLength < 0.001) {
    t.setShapeMatrixPivot(start.add(0, 0.1, 0));
    return;
}

// 计算玩家视线到线段的最近点
Vec3 toEye = eyePos.subtract(start);
double proj = toEye.dot(lineDir) / (lineLength * lineLength);
proj = Mth.clamp(proj, 0.0, 1.0);
Vec3 closestPoint = start.add(lineDir.scale(proj));

// 定位到最近点附近，略微偏向玩家
Vec3 labelOffset = new Vec3(0, 0.3, 0);
Vec3 towardsPlayer = eyePos.subtract(closestPoint).normalize().scale(0.15);
Vec3 finalPos = closestPoint.add(labelOffset).add(towardsPlayer.yRot((float) Math.toRadians(15)));

t.setShapeWorldPivot(finalPos);
t.world.syncLastToTarget();

// 计算并显示距离
double d = anchor1.transformer.getWorldPivot().distanceTo(anchor2.transformer.getWorldPivot());
((TextShape) t.shape).setText(1, "Distance : " + String.format("%.2f", d));
```

**功能**: 显示两个可移动锚点之间的实时距离测量。

:::

## Minecraft内置元素

::: tabs#minecraft

@tab:active 方块形状（可抓取）

**资源位置**: `ryansrenderingkit:test/demo_block_shape`

**图形类型**: 方块形状（Block Shape）

**配置参数**:
- **位置**: 动态计算
- **方块**: Blocks.GLASS.defaultBlockState()（玻璃方块）
- **光照**: FULL_BLOCK（完全亮度）

**变换效果**:
使用 `handleMouseGrab()` 函数实现鼠标抓取功能。

**交互功能**: 可以用鼠标左键抓取并移动玻璃方块。

@tab 物品形状（可抓取）

**资源位置**: `ryansrenderingkit:test/demo_item_shape`

**图形类型**: 物品形状（Item Shape）

**配置参数**:
- **位置**: 动态计算
- **物品**: Items.DRAGON_EGG（龙蛋）
- **显示上下文**: ItemDisplayContext.FIXED
- **光照**: FULL_BLOCK

**变换效果**:
使用 `handleMouseGrab()` 函数实现鼠标抓取功能。

**交互功能**: 可以用鼠标左键抓取并移动龙蛋物品。

@tab 实体形状（可抓取+旋转）

**资源位置**: `ryansrenderingkit:test/demo_entity_shape`

**图形类型**: 实体形状（Entity Shape）

**配置参数**:
- **位置**: 动态计算
- **实体**: 玩家自己（Minecraft.getInstance().player）
- **光照**: FULL_BLOCK

**变换效果**:
```java
handleMouseGrab(Minecraft.getInstance().player, t.shape, t);
float time = client.getGameTime();
// 三轴旋转
t.setShapeWorldRotationDegrees(time * 2, time * 3, time * 1.5f);
```

**交互功能**: 
- 渲染玩家自己的3D模型
- 可抓取移动
- 持续旋转

:::

## 交互式测量工具

::: tabs#tools

@tab:active 距离测量器

这是一个完整的交互式测量工具，由多个形状组成。

**组件1: 锚点1**
- **资源位置**: `ryansrenderingkit:test/demo_a1`
- **类型**: 小球体
- **半径**: 0.1f
- **分段数**: 16
- **颜色**: 蓝色半透明 Color(0, 0, 1, 0.5f)
- **功能**: 可抓取移动的起点

**组件2: 锚点2**
- **资源位置**: `ryansrenderingkit:test/demo_a2`
- **类型**: 小球体
- **半径**: 0.1f
- **分段数**: 16
- **颜色**: 红色半透明 Color(1, 0, 0, 0.5f)
- **功能**: 可抓取移动的终点

**组件3: 连接线**
- **资源位置**: `ryansrenderingkit:test/demo_l1`
- **类型**: 线段
- **线宽**: 2.1f
- **颜色**: 白色
- **功能**: 实时连接两个锚点

**变换逻辑**:
```java
LineShape shape = (LineShape) transformer.getShape();
// 实时更新线段两端，跟随锚点位置
shape.forceSetStart(anchor1.transformer.getShapeWorldPivot(false));
shape.forceSetEnd(anchor2.transformer.getShapeWorldPivot(false));
```

**组件4: 距离标签**
- **资源位置**: `ryansrenderingkit:test/demo_t1`
- **类型**: 文本
- **功能**: 显示两锚点间的实时距离

**使用方法**:
1. 用鼠标左键拖动蓝色或红色球体到不同位置
2. 白色线段会自动连接两个球体
3. 文本标签显示精确距离（保留两位小数）
4. 标签会智能定位在线段中间靠近玩家的位置

:::

## 通用交互函数

### handleMouseGrab() 函数

这是一个通用的鼠标抓取处理函数，用于多个可交互形状。

```java
public static void handleMouseGrab(Player player, Shape shape, DefaultTransformer transformer) {
    Minecraft mc = Minecraft.getInstance();
    boolean isLeftPressed = mc.mouseHandler.isLeftPressed();
    boolean wasHolding = shape.getCustomData("isHolding", false);
    boolean isLookingAt = shape.isPlayerLookingAt().hit;
    
    // 保存原始颜色
    if (!wasHolding) shape.putCustomData("color", shape.baseColor);
    
    boolean shouldHold = wasHolding || (isLeftPressed && isLookingAt);
    
    // 开始抓取
    if (shouldHold && !wasHolding) {
        double distance = transformer.getShapeWorldPivot(true)
                .distanceTo(player.getEyePosition());
        shape.putCustomData("grabDistance", distance);
        shape.putCustomData("isHolding", true);
    }
    
    // 持续抓取中
    if (isLeftPressed && shape.getCustomData("isHolding", false)) {
        double savedDistance = shape.getCustomData("grabDistance", 4.0);
        Vec3 eyePos = player.getEyePosition(transformer.getTickDelta());
        Vec3 look = player.getLookAngle();
        
        // 将形状移动到玩家视线方向
        Vec3 targetPos = eyePos.add(look.scale(savedDistance));
        
        transformer.setShapeWorldPivot(targetPos);
        transformer.world.position.syncLastToTarget();
        shape.baseColor = new Color(255, 255, 255, 200);  // 抓取时变白色
    } 
    // 释放抓取
    else if (!isLeftPressed && wasHolding) {
        shape.putCustomData("isHolding", false);
        shape.putCustomData("grabDistance", null);
        shape.baseColor = shape.getCustomData("color", Color.WHITE);
    } 
    // 未抓取状态
    else if (!isLeftPressed) {
        shape.baseColor = shape.getCustomData("color", Color.WHITE);
    }
}
```

