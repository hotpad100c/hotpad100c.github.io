# 博客外观维护说明

这份文档说明「斜切」风格的首页和全站样式是怎么组织的，以及怎么改文字、换图片、改板块、加板块。

整套样式只用 Vue 组件 + CSS 覆盖 Plume 主题，没有改主题源码。导航栏、搜索、深浅色切换、文章列表、标签、评论等仍然是 Plume 提供的。

## 文件一览

| 文件 | 作用 |
|---|---|
| `docs/README.md` | 首页。`config` 里写 `type: HomeSlant`，并在这里配置背景图和封面图 |
| `docs/.vuepress/components/home/homeConfig.ts` | **首页内容配置**：文字、按钮、社交链接、显示数量、展示哪些项目 |
| `docs/.vuepress/components/home/HomeSlant.vue` | 首页的布局和样式 |
| `docs/.vuepress/components/home/useHomeData.ts` | 读取文章、标签、项目数据（一般不用改） |
| `docs/.vuepress/styles/index.css` | 全站配色（浅色 / 深色两套） |
| `docs/.vuepress/styles/slant.css` | 全站形状规则：无圆角、发丝线、平行四边形、标题字体 |
| `docs/.vuepress/config.ts` | 字体链接、文章数据插件、`date` → `createTime` 的日期修正 |
| `docs/images/bg-cube.jpg` | 默认背景图（`Bg.png` 的压缩版，约 100KB） |

## 本地预览

```bash
pnpm install
```

```bash
pnpm docs:dev
```

浏览器打开终端里显示的地址（通常是 `http://localhost:8080/`）。改动保存后页面会自动刷新。

要检查正式构建是否正常：

```bash
pnpm docs:build
```

> Plume 在构建时会自动往文章的 frontmatter 里写 `createTime` 等字段。这些改动不需要提交，可以用 `git checkout -- docs/posts` 还原。

## 修改首页内容

首页上的文字和链接都在 `docs/.vuepress/components/home/homeConfig.ts`：

| 配置项 | 对应位置 |
|---|---|
| `profile.tagline` | 大标题上方的小标签 |
| `profile.text`、`profile.motto` | 大标题下方的两行文字 |
| `actions` | 首屏的两个斜切按钮。`primary: true` 的是实心按钮。`link` 只能填站内路径（如 `/posts/`） |
| `socials` | 「文章 / 项目」计数后面的方正小按钮。`icon` 是 [Iconify](https://icon-sets.iconify.design/) 图标名，`color` 是鼠标悬停时图标的颜色（留空则用文字色） |
| `recentCount` | 「近期文章」显示几篇（默认 5） |
| `featuredProjects` | 首页展示的项目，填 `docs/projects/data.js` 里各项目的 `id`，按顺序显示 |

以下内容是自动生成的，不需要手动维护：

- **最新 / 近期文章**：读取 `docs/posts/` 下的文章，按 frontmatter 的 `date` 排序。`draft: true` 的文章不显示。
- **话题**：所有文章的 `tags`，按使用次数排序。
- **文章数 / 项目数**：文章总数，以及 `docs/projects/data.js` 里的项目总数。

大标题 “Ryan100c” 写在 `HomeSlant.vue` 的模板里（`<h1>Ryan<em>100c</em></h1>`），`<em>` 里的部分显示为斜体紫色。

## 更换背景图和封面图

首页有两张图：

- **背景图**：铺满整页，加了模糊和暗化（浅色模式下是淡紫色蒙版）。
- **封面图**：首屏右侧斜切窗口里的那张，不加蒙版。

在 `docs/README.md` 里配置：

```yaml
config:
  - type: HomeSlant
    background: /images/home-bg.jpg
    cover: /images/home-cover.jpg
```

1. 把图片放进 `docs/.vuepress/public/` 下（例如 `docs/.vuepress/public/images/home-bg.jpg`）。
2. 用 `/` 开头的路径引用，路径从 `public/` 之后开始写，如上例。也可以直接填 `https://` 开头的完整地址。
3. 只写 `background` 时，封面也用这张图；两个都不写时使用 `bg-cube`。

建议：

- 背景图用 16:9 左右的横图，1920 宽足够。背景会被模糊，细节不重要。
- 封面图会被斜切窗口裁掉左右两角，主体放在画面中间。窗口在横屏下约为 16:7 到 16:9。
- 用 JPG 或 WebP，控制在 300KB 以内，首页加载会快很多。原图 `Bg.png` 有 1.7MB，所以默认用的是压缩后的 `bg-cube.jpg`。

想换掉默认图（不写配置时用的那张），替换 `docs/images/bg-cube.jpg` 即可，文件名保持不变。

## 首页布局

横屏（宽度 ≥ 1024px）是两列两行，设计目标是一屏装下（1366×768 起）：

```
┌──────────────────────┬──────────────────────────────┐
│ 小标签                │                              │
│ Ryan100c（大标题）     │      封面窗口（斜切 /）        │
│ 两行介绍               │                              │
│ [按钮] [按钮]          │                              │
│ 话题：TMC Redstone …  │                              │
├──────────────────────┼──────────────────────────────┤
│  最新文章（斜切 /）     │ 近期文章（方正面板）           │
│                      │  01 …                         │
│                      │  02 …                         │
├──────────────────────┼──────────────────────────────┤
│ 13│21│GH│B站│YT│DC   │ 项目 ×4（斜切 \，反向）         │
│ （方正小按钮）          │                              │
└──────────────────────┴──────────────────────────────┘
```

竖屏（手机）按 介绍 → 封面 → 最新 → 小按钮 → 近期文章 → 项目 的顺序依次堆叠。

横屏下多出来的高度会分给封面窗口，下半部分只占内容需要的高度。

### 两种块

| 类型 | 写法 | 用在哪里 |
|---|---|---|
| 斜切块 | 外层 `class="tile"`，内容包在 `<div class="in">` 里 | 最新文章、项目、封面窗口、按钮 |
| 反向斜切块 | 外层 `class="tile rev"` | 项目（见下面的规则） |
| 方正面板 | 外层 `class="panel"`，每一格 `class="sq"` | 计数与社交按钮、近期文章 |

斜切块是用 `transform: skewX()` 把外框斜过来，再把 `.in` 反向斜回去，所以里面的文字是正的。**斜切块里的内容一定要包在 `.in` 里**，否则文字也会跟着斜。

方正面板用 `gap: 1px` 加底色画出 1px 的发丝线，格子之间不需要写边框。

### 斜切方向规则

**同一列里，方正面板上下两侧的斜切块方向必须相反。**

例如右列：封面窗口是 `/`，下面接方正的「近期文章」，再下面的项目就必须是 `\`（`.rev`）。在一列里加块或者调换顺序时，按这条规则决定用 `tile` 还是 `tile rev`。

## 修改板块

几个常见改法（都在 `HomeSlant.vue`）：

- **「最新文章」摘要显示几行**：改 `.excerpt` 的 `-webkit-line-clamp: 4`。
- **斜切的角度**：改 `.sl-page` 里的 `--skew: -10deg` 和 `--unskew: 10deg`（两个值必须互为相反数）。手机上的角度在 `@media (max-width: 560px)` 里单独设置（默认 6°）。
- **大标题大小**：横屏下在 `@media (min-width: 1024px)` 里的 `.intro h1`，手机上在外面的 `.intro h1`。
- **左右两列的宽度比例**：`@media (min-width: 1024px)` 里的 `grid-template-columns: minmax(0, 5fr) minmax(0, 7fr)`。
- **封面窗口最高多高**：`.hero-window` 的 `max-height: 560px`。
- **去掉某个板块**：删掉模板里对应的那一段即可（每一段前面都有注释说明是哪个板块）。

改完用 `pnpm docs:dev` 看一下 1366×768 下是否还能一屏装下（浏览器开发者工具里可以模拟这个尺寸）。

## 添加板块

### 在已有面板里加一格

例如在「文章 / 项目」计数旁边加一个「标签数」：在 `<div class="panel quick">` 里加

```vue
<RouteLink to="/posts/tags/" class="sq stat">
  <strong>{{ String(tags.length).padStart(2, '0') }}</strong><span>标签</span>
</RouteLink>
```

再把同一个元素上的 `'--quick-cols': 2 + socials.length` 改成 `3 + socials.length`，让格子重新均分。

加一个社交链接则不用改模板，直接在 `homeConfig.ts` 的 `socials` 里加一项。

### 在某一列里加一个块

在 `<div class="col-left">` 或 `<div class="col-right">` 里按顺序插入。

斜切块：

```vue
<section class="tile">
  <div class="in">
    <p class="label">小标题</p>
    <p class="muted">内容</p>
  </div>
</section>
```

方正块：

```vue
<section class="panel">
  <div class="sq">
    <p class="label">小标题</p>
    <p class="muted">内容</p>
  </div>
</section>
```

记得按上面的方向规则决定斜切块要不要加 `rev`。注意横屏下首页是按一屏装下设计的，加块会让页面变高；内容较多时，更适合用下面的方法放到首屏下方。

### 在首屏下方加一整段

Plume 首页的 `config` 是一个列表，`HomeSlant` 只是其中一项。可以在它后面继续加。

**写 Markdown**：用 Plume 自带的 `custom` 类型，内容就是 `docs/README.md` frontmatter 下面的正文：

```yaml
---
home: true
title: Ryan100c
config:
  - type: HomeSlant
  - type: custom
---

## 最近在做

这里写 Markdown，样式和文章正文一致（同样无圆角、h2 带斜切色块）。
```

**写一个新组件**：

1. 在 `docs/.vuepress/components/home/` 下新建一个 `.vue` 文件，例如 `HomeTimeline.vue`。
2. 在 `docs/.vuepress/client.ts` 里注册：`app.component('HomeTimeline', HomeTimeline)`。
3. 在 `docs/README.md` 的 `config` 里加 `- type: HomeTimeline`。写在这一项下面的其它字段会作为 props 传给组件（`HomeSlant` 的 `background`、`cover` 就是这样传进去的）。

新组件想沿用首页的样子，可以照抄 `HomeSlant.vue` 里 `.sl-page` 的颜色变量和 `.tile` / `.panel` / `.sq` 的写法。

## 配色

有两处配色，改的时候两边保持一致：

- `docs/.vuepress/styles/index.css`：全站（文章、列表、导航栏等），`:root` 是浅色，`[data-theme="dark"]` 是深色。
- `HomeSlant.vue` 顶部 `.sl-page` 的变量是首页深色，`[data-theme='light'] .sl-page` 是首页浅色。

主要的几个颜色：

| 用途 | 浅色 | 深色 |
|---|---|---|
| 背景 | `#efe9fb` | `#0b0910` |
| 主要文字 | `#1d1534` | `#efe9fd` |
| 次要文字 | `#5b5078` | `#a197bd` |
| 强调色（链接、数字、标签） | `#5d3b99` | `#b59cf2` |

## 全站形状规则

都在 `docs/.vuepress/styles/slant.css`，每一段都有注释：

- **无圆角**：文件开头的 `border-radius: 0 !important` 作用于整个站点。
- **平行四边形**：标签、按钮、分页、上下篇链接、「标签 / 分类 / 归档」入口。这些小元素用 `clip-path` 裁成平行四边形，文字不斜。想让别的元素也这样，把它的选择器加进文件里那一组 `clip-path` 规则；偏移量是 `--sl-cut`。
- **发丝线方格**：文章列表 `.vp-post-list`。
- **标题**：文章标题、h1–h3 用衬线字体，h2 前面有一个斜切色块。
- **等宽**：日期、字数、目录、代码、页脚。

不想要全站样式时，删掉 `docs/.vuepress/client.ts` 里的 `import './styles/slant.css'` 即可，首页不受影响。

## 文章日期

文章的 frontmatter 写 `date` 就行：

```yaml
---
title: 逃离光影地狱
date: 2026-10-16
---
```

Plume 本身读的是 `createTime`。没有它的时候会用文件创建时间，在 CI 上就是每次部署的时间。`config.ts` 里的 `autoFrontmatter.transform` 会用 `date` 覆盖 `createTime`，所以文章列表、归档、文章页显示的都是 `date`。

`date` 写成 `2026-7-4` 或 `2026–7-4`（全角破折号）也能识别，不过建议统一写成 `2026-07-04`。

## 深浅色

使用 Plume 导航栏右侧的开关切换，首页和其它页面一起切换。默认跟随系统设置。

如果想让全站固定为深色，在 `config.ts` 的 `theme({ ... })` 里写 `appearance: 'force-dark'`。现在的配置里写的是 `appearanc`（少了一个 e），所以这一行目前不起作用。
