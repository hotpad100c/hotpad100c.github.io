# Markdown 格式

站点是 VuePress 2 + vuepress-theme-plume。文章放在 `docs/posts/`，图片放在 `docs/posts/media/`。

## Frontmatter

```yaml
---
title: 红石粉连接异常
date: 2026-11-13
permalink: /posts/IncorrectDustConnection/
tags: [TMC, Redstone]
draft: true
---
```

- `title`：中文标题，和文件名一致。
- `date`：写作当天，`YYYY-MM-DD`。
- `permalink`：`/posts/` + 英文 + `/`。用大驼峰概括主题，例如 `RedstoneDustMath`、`InstantElevator`、`ComparatorUpdate`、`EntityCollisionCheck`、`ManipulateClientSideBlocks`、`ItemEntityAndLavaAbove1.21.5`。漏洞报告类可以用 `why-mc-310372` 这种形式。不要和已有文章重复（先看一眼 `docs/posts/` 里的 permalink）。
- `tags`：优先用现有 tag：`TMC`（技术向，几乎每篇都有）、`Redstone`（红石元件 / 红石线）、`BlockUpdate`（方块更新）、`Entity`（实体）、`ModDev`（模组开发）。确实需要新 tag 时用英文大驼峰，并在回复里告诉用户。
- `draft: true`：草稿都带上，首页不会显示。发布前由博主删除。
- 可选：`description`（首页摘要，不写就自动取正文开头）。

## 标题

- 正文可以有多个 `#` 一级标题（主题允许），大节用 `#`，小节用 `##` / `###`。
- 大节之间常用 `---` 分隔。
- 编号式标题：`## 01｜误解`、`## 1. LevelTicks 的排序逻辑分析`、`## 规律1：`。
- 问句式标题：`# 玩家究竟是在游戏的哪个阶段被传送至电梯顶部？`

## 强调

- `**粗体**`：关键词、关键条件。
- Plume 标记：`==重点结论=={.important}`；表示「这是常见误区 / 看起来像但其实不是」时用 `==……=={.warning}`。
- 删除线吐槽：`~~……~~`（偶尔用）。

## 引用块

用途很多：
- 引用流行说法、wiki 原文、视频原话、漏洞报告翻译；
- 写定义式结论；
- 写需要强调的规律（`> 虽然有默认16个“抽屉”但……`）；
- 包住带标题的代码：

  ~~~markdown
  > 发射器的充能检测(beta1.2_02)
  >
  > ```java
  > boolean var6 = …;
  > ```
  ~~~

## 容器

```markdown
::: tip 模拟器
[红石粉更新顺序模拟器](链接)
:::
```

```markdown
::: demo-wrapper
![例子](media/xxx.jpeg)

拉动拉杆激活一次活塞，……

> - 服务端看到……
> - ……
:::
```

`::: demo-wrapper` 用于把一个装置示例（图 + 操作步骤 + 结果）框在一起。

### 待验证 / 待补充（草稿专用）

没有依据的结论放进待验证容器，写清楚缺什么依据、需要什么来验证：

```markdown
::: warning 待验证
理论上，计划刻 EMP 时也会出现同样的乱序。

依据不足：素材中没有 EMP 场景的测试。需要：在 EMP 场景下复现一次。
:::
```

缺图、缺链接、缺数据、缺源码时用待补充容器：

```markdown
::: warning 待补充
需要 `ShulkerBoxBlock.getShape` 的源码（Mojang 映射，版本同上），用来验证潜影盒的碰撞箱依赖方块实体。
:::
```

这两个容器在页面上很醒目，博主处理完后删掉容器即可。不要用 HTML 注释代替。

## 代码块

- 语言标 `java`（也见过 `Java`），伪代码和树形结构用 `text` 或不标语言。
- 聚焦关键行：在行尾加 `// [!code focus]`，几乎每段源码都会用。
- 版本 diff：`// [!code --]`、`// [!code ++]`。
- 行高亮：```` ```java{15,33-36} ````。
- 删掉无关部分时用 `...` 或 `// ...` 表示。
- 长代码折叠：

  ~~~markdown
  <details>
    <summary>穷举代码</summary>

  ```java
  …
  ```

  </details>
  ~~~

## 图片

- 本地图片：`![描述](media/文件名.png)`，文件放 `docs/posts/media/`。
- GitHub 附件图：`<img width="1280" height="720" alt="Image" src="https://github.com/user-attachments/assets/…" />`。
- 外链图直接用 URL。
- 用户还没给图时，不要编文件名，用待补充容器说明这里需要什么图。

## 链接

- 视频：B 站 / YouTube 原链接，文中可写 BV 号。
- 漏洞报告：`https://bugs.mojang.com/browse/MC/issues/MC-xxxxxx`
- 中文 wiki：`https://zh.minecraft.wiki/w/…`
- 所有链接都必须来自素材；没有的链接用待补充容器。
