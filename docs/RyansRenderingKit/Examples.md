---
permalink: /RyansRenderingKit/Examples/
---

# 示例展示

本页是一些使用例。

---

### 1. 实心圆面（动态旋转）

```java
ShapeManagers.addShape(
    ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_face_circle"),
    ShapeGenerator.generateFaceCircle()
        .pos(new Vec3(0, 0, 0))  // 位置
        .radius(2.0f)  // 半径
        .segments(64)  // 分段数
        .axis(CircleLikeShape.CircleAxis.Y)  // 轴向
        .color(randomColor())  // 随机颜色
        .seeThrough(false)  // 不透明
        .transform((t) -> {  // 动态旋转
            float time = client.getGameTime();  // 获取游戏时间
            t.setShapeWorldRotationDegrees(0, time * 3, 0);  // 绕 Y 轴旋转
        })
        .build(Shape.RenderingType.BATCH)  // 使用批处理渲染
);
```

---

### 2. 圆形线框（多层旋转)

```java
ShapeManagers.addShape(
    ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_line_circle"),
    ShapeGenerator.generateLineCircle()
        .pos(new Vec30, 0, 0))  // 位置
        .radius(2.0f)  // 半径
        .segments(64)  // 分段数
        .axis(CircleLikeShape.CircleAxis.Y)  // 轴向
        .lineWidth(3.0f)  // 线宽
        .color(randomColor())  // 随机颜色
        .seeThrough(false)  // 不透明
        .transform((t) -> {  // 多层旋转
            float time = client.getGameTime();
            t.setShapeLocalRotationDegrees(0, time * 4, 0);  // 局部旋转
            t.setShapeWorldRotationDegrees(time * 4, 0, 0);  // 世界旋转
        })
        .build(Shape.RenderingType.BATCH) 
);
```

---

### 3. 父子层次结构

```java
Vec3 spos = new Vec3(10, 0, 20);  // 初始位置
Shape s1 = ShapeGenerator.generateSphere()  // 大球（太阳）
    .pos(new Vec3(0, 0, 0))
    .radius(2.0f)
    .segments(6)
    .color(randomColor())
    .seeThrough(false)
    .transform((t) -> {  // 大球上下浮动
        float time = client.getGameTime();
        t.setShapeWorldRotationDegrees(0, time * 3, 0);  // 旋转
        float yOffset = (float) Math.sin(time * 0.1) * 2f;  // Y 轴浮动
        Vec3 worldPivot = t.getShapeWorldPivot(false);
        t.setShapeWorldPivot(new Vec3(worldPivot.x, 0 + yOffset, worldPivot.z));
    })
    .build(Shape.RenderingType.BATCH);

Shape s2 = ShapeGenerator.generateSphere()  // 小球（行星）
    .pos(new Vec3(15, 0, 0))  // 相对父级位置
    .radius(1.0f)
    .segments(3)
    .color(randomColor())
    .seeThrough(false)
    .transform((t) -> {  // 小球绕大球公转
        float time = client.getGameTime();
        t.setShapeWorldRotationDegrees(0, time * 6, 0);
    })
    .build(Shape.RenderingType.BATCH);

Shape s3 = ShapeGenerator.generateSphere()  // 更小球（卫星）
    .pos(new Vec3(7, 0, 0))  // 相对父级位置
    .radius(0.3f)
    .segments(5)
    .color(randomColor())
    .seeThrough(false)
    .transform((t) -> {  // 卫星自转 + 看向变色
        float time = client.getGameTime();
        if (t.shape.isPlayerLookingAt().hit) {
            t.shape.baseColor = new Color(255, 234, 0, 100);  // 黄
        } else {
            t.shape.baseColor = new Color(255, 0, 251, 100);  // 紫
        }
    })
    .build(Shape.RenderingType.BATCH);

s2.addChild(s3);  // 卫星加到行星
s1.addChild(s2);  // 行星加到太阳

// 注册
ShapeManagers.addShape(ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_sphere_2"), s1);
ShapeManagers.addShape(ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_sphere_2_child"), s2);
ShapeManagers.addShape(ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_sphere_3_child"), s3);
```

---

### 4. OBJ 模型加载 + 鼠标抓取

```java
ShapeManagers.addShape(
    ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_obj_model"),
    ShapeGenerator.generateObjModel()
        .pos(new Vec3(0, 0, 0))  // 位置
        .model(ResourceLocation.fromNamespaceAndPath(MOD_ID, "models/monkey.obj"))  // OBJ 文件
        .color(randomColor())  // 随机颜色
        .seeThrough(false)  // 不透明
        .transform((transformer) -> {  // 旋转 + 抓取交互
            float time = client.getGameTime();
            transformer.setShapeWorldRotationDegrees(0, time * 5, 0);  // 旋转
            Shape shape = transformer.shape;
            if (shape.isPlayerLookingAt().hit) {  // 射线检测
                if (Minecraft.getInstance().mouseHandler.isLeftPressed()) {  // 左键按住
                    Player player = Minecraft.getInstance().player;
                    if (!shape.getCustomData("isHolding", false)) {  // 初始化抓取
                        shape.putCustomData("isHolding", true);
                        double distance = transformer.getShapeWorldPivot(true).distanceTo(player.getEyePosition());
                        shape.putCustomData("distance", distance);
                    }
                    transformer.setShapeWorldPivot(  // 跟随鼠标
                        player.getEyePosition(transformer.getTickDelta())
                            .add(player.getLookAngle().scale(shape.getCustomData("distance", 5.0)))
                    );
                    transformer.world.position.syncLastToTarget();  // 立即同步
                } else {
                    if (shape.getCustomData("isHolding", false))
                        shape.putCustomData("isHolding", false);
                }
                shape.baseColor = new Color(255, 0, 72, 100);  // 红（看向）
            } else {
                if (shape.getCustomData("isHolding", false))
                    shape.putCustomData("isHolding", false);
                shape.baseColor = new Color(0, 255, 72, 100);  // 绿（未看向）
            }
        })
        .build(Shape.RenderingType.BATCH)
);
```
---

### 5. 三层位移

```java
float fixedCylX = xPos();  // 固定 X 坐标
ShapeManagers.addShape(
    ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_cylinder"),
    ShapeGenerator.generateCylinder()
        .pos(new Vec3(0, 0, 0))  // 位置
        .radius(1.5f)  // 半径
        .height(4.0f)  // 高度
        .segments(32)  // 分段数
        .axis(CircleLikeShape.CircleAxis.Z)  // 轴向
        .color(randomColor())  // 随机颜色
        .seeThrough(false)  // 不透明
        .transform((t) -> {  // 三层偏移
            float time = client.getGameTime();
            double offset = (Math.sin(time * 0.05));  // 正弦偏移
            t.setShapeLocalPivot(new Vec3(offset * 3, 0, 0));  // 局部
            t.setShapeMatrixPivot(new Vec3(0, offset * -2, 0));  // 矩阵
            t.setShapeWorldPivot(new Vec3(fixedCylX, 0, offset * 1));  // 世界
        })
        .build(Shape.RenderingType.BATCH)
);
```

---

### 6. 世界文字

```java
ShapeManagers.addShape(
    ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_text1"),
    ShapeGenerator.generateText()
        .pos(new Vec3(0, 0, 0))  // 位置
        .type(Shape.RenderingType.BATCH)  // 类型
        .billBoardMode(TextShape.BillBoardMode.ALL)  // 永远朝向玩家
        .seeThrough(false)  // 不透明
        .shadow(true)  // 阴影
        .outline(true)  // 外边框
        .texts("§b§l!TEST!", "§e你好", "§aAWA", "§dBillboardMode.ALL")  // 多行文字
        .textColors(Color.CYAN, Color.YELLOW, Color.GREEN, Color.MAGENTA)  // 颜色
        .transform(t -> {  // 浮动
            t.setShapeMatrixPivot(
                new Vec3(0, Math.sin(Minecraft.getInstance().level.getGameTime() * 0.05) * 0.3, 0)
            );
        })
        .build(Shape.RenderingType.BATCH)  // 批处理渲染
);
```

### 7. 距离测量器

```java
Minecraft mc = Minecraft.getInstance();
Shape anchor1 = ShapeGenerator.generateSphere()  // 锚点1（蓝）
    .pos(new Vec3(0, 0, 0))
    .radius(0.1f)
    .segments(16)
    .color(new Color(0, 0, 1, 0.5f))  // 蓝
    .seeThrough(false)
    .transform((transformer) -> {  // 鼠标抓取逻辑
        Shape shape = transformer.getShape();
        handleMouseGrab(mc.player, shape, transformer);  // 见辅助函数
    })
    .build(Shape.RenderingType.BATCH);

Shape anchor2 = ShapeGenerator.generateSphere()  // 锚点2（红）
    .pos(new Vec3(20, 0, 0))
    .radius(0.1f)
    .segments(16)
    .color(new Color(1, 0, 0, 0.5f))  // 红
    .seeThrough(false)
    .transform((transformer) -> {
        Shape shape = transformer.getShape();
        handleMouseGrab(mc.player, shape, transformer);
    })
    .build(Shape.RenderingType.BATCH);

Shape line = ShapeGenerator.generateLine()  // 连接线
    .pos(new Vec3(0, 0, 0))
    .start(anchor1.transformer.getShapeWorldPivot(false))
    .end(anchor2.transformer.getShapeWorldPivot(false))
    .lineWidth(2.1f)
    .color(Color.WHITE)
    .seeThrough(false)
    .transform((transformer) -> {  // 实时更新端点
        transformer.setStart(anchor1.transformer.getShapeWorldPivot(true));
        transformer.setEnd(anchor2.transformer.getShapeWorldPivot(true));
    })
    .build(Shape.RenderingType.BATCH);

Shape text = ShapeGenerator.generateText()  // 距离显示
    .pos(new Vec3(0, 0, 0))
    .billBoardMode(TextShape.BillBoardMode.ALL)  // 朝向玩家
    .seeThrough(false)
    .shadow(true)
    .outline(false)
    .texts("-")  // 初始文字
    .textColors(Color.CYAN, Color.YELLOW, Color.GREEN, Color.MAGENTA)
    .transform(t -> {  // 文字位置 + 更新距离
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
        Vec3 toEye = eyePos.subtract(start);
        double proj = toEye.dot(lineDir) / (lineLength * lineLength);
        proj = Mth.clamp(proj, 0.0, 1.0);
        Vec3 closestPoint = start.add(lineDir.scale(proj));
        Vec3 labelOffset = new Vec3(0, 0.3, 0);
        Vec3 towardsPlayer = eyePos.subtract(closestPoint).normalize().scale(0.15);
        Vec3 finalPos = closestPoint.add(labelOffset).add(towardsPlayer.yRot((float) Math.toRadians(15)));
        t.setShapeWorldPivot(finalPos);
        t.world.syncLastToTarget();  // 立即同步
        double d = anchor1.transformer.getWorldPivot().distanceTo(anchor2.transformer.getWorldPivot());
        ((TextShape) t.shape).setText(1, "Distance : " + String.format("%.2f", d));  // 更新文字
    })
    .build(Shape.RenderingType.BATCH);

// 注册
ShapeManagers.addShape(ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_a1"), anchor1);
ShapeManagers.addShape(ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_a2"), anchor2);
ShapeManagers.addShape(ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_l1"), line);
ShapeManagers.addShape(ResourceLocation.fromNamespaceAndPath(MOD_ID, "test/demo_t1"), text);
```

```java
public static void handleMouseGrab(Player player, Shape shape, DefaultTransformer transformer) {
    Minecraft mc = Minecraft.getInstance();
    boolean isLeftPressed = mc.mouseHandler.isLeftPressed();
    boolean wasHolding = shape.getCustomData("isHolding", false);
    boolean isLookingAt = shape.isPlayerLookingAt().hit;
    if (!wasHolding) shape.putCustomData("color", shape.baseColor);
    boolean shouldHold = wasHolding || (isLeftPressed && isLookingAt);
    if (shouldHold && !wasHolding) {
        double distance = transformer.getShapeWorldPivot(true).distanceTo(player.getEyePosition());
        shape.putCustomData("grabDistance", distance);
        shape.putCustomData("isHolding", true);
    }
    if (isLeftPressed && shape.getCustomData("isHolding", false)) {
        double savedDistance = shape.getCustomData("grabDistance", 4.0);
        Vec3 eyePos = player.getEyePosition(transformer.getTickDelta());
        Vec3 look = player.getLookAngle();
        Vec3 targetPos = eyePos.add(look.scale(savedDistance));
        transformer.setShapeWorldPivot(targetPos);
        transformer.world.position.syncLastToTarget();
        shape.baseColor = new Color(255, 255, 255, 200);
    } else if (!isLeftPressed && wasHolding) {
        shape.putCustomData("isHolding", false);
        shape.putCustomData("grabDistance", null);
        shape.baseColor = shape.getCustomData("color", Color.WHITE);
    } else if (!isLeftPressed) {
        shape.baseColor = shape.getCustomData("color", Color.WHITE);
    }
}
```
