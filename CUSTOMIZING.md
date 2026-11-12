# 博客外观维护说明

这份文档说明「斜切」风格的首页和全站样式是怎么组织的，以及怎么改文字、换图片、改板块、加板块。

整套样式只用 Vue 组件 + CSS 覆盖 Plume 主题，没有改主题源码。导航栏、搜索、深浅色切换、文章列表、标签、评论等仍然是 Plume 提供的。

## 文件一览

| 文件 | 作用 |
|---|---|
| `docs/README.md` | 首页。`config` 里写 `type: HomeSlant`，并在这里配置封面图 |
| `docs/.vuepress/components/fractal/fractalPages.json` | **全站分形背景的参数**，每个页面一项，从 Julia 分形编辑器导出（见「分形背景」） |
| `docs/.vuepress/components/fractal/` | 分形背景的渲染器（`FractalBackground.vue`、`renderer.ts`、`shaders.ts`） |
| `docs/.vuepress/components/fractal/panels.json` | 半透明面板、导航栏、侧边栏的不透明度和模糊（深色 / 浅色各一套） |
| `docs/.vuepress/styles/fractal.css` | 分形背景配套样式：各层透明、半透明阅读面板 |
| `docs/.vuepress/components/home/homeConfig.ts` | **首页内容配置**：文字、按钮、社交链接、显示数量、展示哪些项目 |
| `docs/.vuepress/components/home/HomeSlant.vue` | 首页的布局和样式 |
| `docs/.vuepress/components/home/useHomeData.ts` | 读取文章、标签、项目数据（一般不用改） |
| `docs/.vuepress/components/slant/` | 斜切页面组件（`SlantPage`、`SlantRow`、`SlantCell` 等），「关于」页用的就是它们 |
| `docs/about/README.md` | 「关于」页，用斜切页面组件排版 |
| `docs/.vuepress/mirrors.json` | 镜像站点列表（见「镜像站点」） |
| `docs/.vuepress/mirrors/` | 镜像站点的风格覆盖 CSS 和桥接脚本 |
| `scripts/mirror.mjs` | 抓取镜像站点的脚本，`pnpm docs:build` 会先运行它 |
| `.github/workflows/refresh-mirrors.yml` | 每天让 Cloudflare 重新构建一次，跟上镜像原站的更新（需要设置，见「镜像站点」） |
| `docs/tools/` | 镜像工具的页面（mcdelta 检索、Redstone Modeler） |
| `docs/.vuepress/public/about/` | 「关于」页用到的图片 |
| `docs/.vuepress/styles/index.css` | 全站配色（浅色 / 深色两套） |
| `docs/.vuepress/styles/slant.css` | 全站形状规则：无圆角、发丝线、平行四边形、标题字体 |
| `docs/.vuepress/config.ts` | 字体链接、文章数据插件、`date` → `createTime` 的日期修正 |
| `docs/images/Bg.png` | 背景图原图 |
| `docs/images/bg-main.jpg` | `Bg.png` 的压缩版（约 80KB）：「关于」页首屏窗口；不支持 WebGL 的浏览器里代替分形背景 |
| `docs/images/bg-cube.jpg` | 默认封面图（方块，约 100KB）：首页和 `SlantHero` 的斜切窗口 |

## 本地预览

```bash
pnpm install
```

```bash
pnpm docs:dev
```

浏览器打开终端里显示的地址（通常是 `http://localhost:8080/`）。改动保存后页面会自动刷新。

镜像站点的文件不在仓库里。`pnpm docs:dev` 第一次运行时会自动抓取；之后想拿到原站的最新版本时运行：

```bash
pnpm mirror
```

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

## 分形背景

全站的背景是实时渲染的 Julia 分形：固定铺满窗口，在所有内容后面。每个页面有自己的参数，滚动时分形会跟着变化，有立体感。

### 在博客里直接调（调节器）

在任意页面地址后面加 `?fractal-tune`，例如 `https://…/posts/?fractal-tune`，右上角会出现「背景调节」面板：

- **位置**：中心 X / Y、缩放、旋转。点「拖动背景」后可以直接用鼠标拖动分形、用滚轮缩放（以鼠标为中心），对着真实的页面内容摆位置。再点一次结束拖动。
- **分形**：C、幂次、迭代次数、遮罩、滚动转速、滚动视差。
- **后期**：曝光、光晕强度、红蓝分光、饱和度（当前主题）。
- **面板**（全站，当前主题）：文章列表 / 正文 / 目录等半透明面板的不透明度、悬停时的不透明度、背景模糊、背景饱和度、背景亮度，以及导航栏、侧边栏的不透明度。

调节器调的是当前页面用的那一项（标题里显示名字，例如 `posts`），深色 / 浅色主题的后期和面板分开调（用导航栏的开关切换主题）。改动立刻显示，并保存在这个浏览器里：换页、刷新都还在，可以一页一页调。调好后点「复制全部」，把复制的内容发回来（或自己拆开替换 `fractalPages.json` 和 `panels.json`）。「本页恢复原值」「面板恢复原值」撤销调节器里的改动。点 × 关闭调节器。

完整的配色、后期效果在 Julia 分形编辑器里调。

### 修改某个页面的分形

1. 打开 Julia 分形编辑器，在「页面」里选要调的页面，调好分形、配色和后期效果（深色、浅色主题分开调）。
2. 点「复制这一页」，得到一段 JSON，形如 `{ "posts": { ... } }`。
3. 打开 `docs/.vuepress/components/fractal/fractalPages.json`，用复制的内容替换同名的那一项（`"posts": { ... }` 整段）。

JSON 里的字段和编辑器一一对应，也可以直接手改，例如：

- `scroll.speed`：每向下滚动 1000px，C 绕原点转多少度。数值大时，滚动后分形变化很大（可能散成碎点）。
- `scroll.parallax`：滚动时视图中心平移的幅度，0 为不动。
- `veil`：分形上面盖的一层页面底色，0–1。数值越大背景越淡，文字越清楚。
- `palette.dark` / `palette.light`：深色 / 浅色主题的配色；里面的 `post` 是后期效果（红蓝分光、光晕、光迹、背景渐变等）。

### 哪个页面用哪一项

| 项 | 页面 |
|---|---|
| `home` | 首页 |
| `posts` | 文章列表和每篇文章（`/posts/` 下的所有页面） |
| `projects` | 项目页，以及 `/tools/`、`/app/` 下的页面 |
| `about` | 关于 |
| `friends` | 友链 |
| `default` | 其他页面（Ryan'sRenderingKit 文档等） |

规则写在 `fractalPages.ts` 的 `ROUTES` 里，按路径前缀匹配。

单独给某个页面指定一项：在它的 frontmatter 里写 `fractal: 名字`。例如让某篇文章用「关于」的分形：

```yaml
---
title: ...
fractal: about
---
```

想给某个页面一套新参数：在 `fractalPages.json` 里新增一项（名字随意，例如 `"gtmc": { ... }`），再在那个页面写 `fractal: gtmc`。

### 性能与兼容

- 只在滚动、换页、换主题、改窗口大小时重画，静止时不占 GPU。
- 每帧的计算量按实际帧率自动调整。运动中（滚动、换页过渡、拖动）按档位降低分辨率（一次运动中只降不升，取样位置固定，不会抖），放大时带一点模糊，并把新一帧与上一帧混合（运动模糊，同时抹平低分辨率的锯齿）；停下后按全分辨率（屏幕像素密度最多按 1.5 倍、最多 500 万像素）逐帧累积到 16 个样本（渐进超采样）。一个样本算不完时在屏幕外分几帧画完，画完再整幅淡入（看不到扫描线），不会卡住页面。光晕和柔焦用高斯模糊（与编辑器相同）。
- 停下后的画面是确定的（目标页的参数 + 滚动停下的位置），所以换页过渡中会分出约 40% 的算力在屏幕外先画它，停下时接着画、画好就淡入。画清晰的画面会缓存 4 张（一张约占一整屏的显存），回到刚看过的页面时立刻清晰。
- 分形着色器按需编译专用版本（在空闲时预先编译好）：整数幂次（2–16）展开成几次固定的复数乘法；不用的功能（Burning Ship、最近点距离）从迭代循环里去掉；每像素取样数展开成固定调用，不用动态循环包着迭代（这一层循环即使只取 1 个样本也会慢 1.5–2.5 倍）。画面与编辑器相同，速度约为原来的 3–4 倍。换页过渡时幂次是小数，要用通用公式，仍会慢一些（由自动调整兜住）。
- 某一页特别卡时，先用调节器的「性能分析」看是哪一步慢：通常是分形本身。迭代次数越多、画面里「很久才逃逸」的区域越大（靠近集合边界、C 靠近抛物点）就越慢，可以降低迭代次数或换个 C。
- 分形不直接使用页面的滚动位置，而是像弹簧一样平滑地追随（`FractalBackground.vue` 的 `SMOOTH_TIME`，越大越慢、越软）。
- 换页、换主题时参数在约 1.1 秒内平滑过渡（`TRANSITION_MS`）。反演、Burning Ship、模式这些开关在过渡到一半时直接切换，其余参数照常插值。
- 地址后面加 `?fractal-debug`，右下角会显示当前页面用的哪一项、已累积的样本数、分辨率和运动时的帧率，用来排查模糊或卡顿（调节器面板底部也有这一行）。
- 调节器里的「性能分析」把一帧的每个步骤单独计时（分形本身、非整数幂次 / 迭代减半 / 半分辨率三种对照、运动模糊、光晕、柔焦、光迹、合成），并显示显卡名称，可以「复制结果」发回来。
- 系统设置了「减少动态效果」时，分形不随滚动变化。
- 浏览器不支持 WebGL 时，背景换成静态图 `docs/images/bg-main.jpg`。
- 渲染代码与编辑器完全相同（`shaders.ts`）。改了其中一边的计算方式，另一边也要改，否则编辑器里调好的样子和博客上不一致。

### 用图片代替分形

`HomeSlant` 和 `SlantPage` 仍然接受 `background`：写了就用这张图盖住分形（图片固定在窗口上，带模糊和蒙版）。

```yaml
# docs/README.md
config:
  - type: HomeSlant
    background: /images/home-bg.jpg
```

```md
<SlantPage background="/images/xxx.jpg">
```

## 更换封面图

首页首屏右侧斜切窗口里的封面图，在 `docs/README.md` 里配置：

```yaml
config:
  - type: HomeSlant
    cover: /images/home-cover.jpg
```

1. 把图片放进 `docs/.vuepress/public/` 下（例如 `docs/.vuepress/public/images/home-cover.jpg`）。
2. 用 `/` 开头的路径引用，路径从 `public/` 之后开始写。也可以直接填 `https://` 开头的完整地址。
3. 不写时用 `docs/images/bg-cube.jpg`。

建议：封面图会被斜切窗口裁掉左右两角，主体放在画面中间。窗口在横屏下约为 16:7 到 16:9。用 JPG 或 WebP，控制在 300KB 以内。

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

## 斜切页面组件

首页以外的页面也可以用斜切风格排版。「关于」页（`docs/about/README.md`）就是这样做的，可以直接照着改。

内容仍然写 Markdown，只是用几个组件把它包起来。**组件标签和 Markdown 之间、组件和组件之间都要空一行**，否则里面的 Markdown 不会被解析。

### 页面骨架

```md
---
title: 关于
pageLayout: page
---

<SlantPage>

<SlantHero label="关于" image="/about/pfp.png">

# 你好，我是 *Ryan100c*

正文……

</SlantHero>

<SlantRow kind="square">

<SlantCell span="7" label="01" title="爱好">

Markdown 正文……

</SlantCell>

<SlantCell span="5" label="02" title="技能">

<SkillIcons list="csharp,java,python" />

</SlantCell>

</SlantRow>

</SlantPage>
```

frontmatter 里必须写 `pageLayout: page`，页面才会铺满宽度（没有右侧目录栏）。

### 组件

| 组件 | 作用 | 参数 |
|---|---|---|
| `SlantPage` | 整页容器：配色、最大宽度 | `background`：背景图，可选。不写时显示全站的分形背景 |
| `SlantHero` | 首屏：左边是插槽里的 Markdown，右边是斜切窗口 | `label`：小标签；`image`：窗口里的前景图（透明 PNG 最好）；`cover`：窗口背景图，默认 `bg-cube.jpg`；`image-x`、`image-y`、`image-size`、`image-fill`：把前景图钉在背景图上的某个位置并放大（见下） |
| `SlantRow` | 一行格子，横屏下是 12 列网格 | `kind`：`slant`（斜切 /）、`rev`（反向斜切 \）、`square`（方正面板） |
| `SlantCell` | 一个格子，形状跟随所在的行 | `span`：占 12 列中的几列（默认 12）；`label`、`title`；`image`：顶部配图；`fit="contain"`：配图完整显示在深色底上；`max-height`：正文超出这个高度（像素）时在格子里滚动；`href`：整格变成链接 |
| `SkillIcons` | 一排技能图标 | `list`：逗号分隔，可用 `csharp`、`java`、`python`、`javascript`、`blender`、`idea`、`unity`；其它写成 `图标集:图标名:显示名`，例如 `devicon-plain:rust:Rust` |
| `SocialButtons` | 社交链接小按钮 | 无。内容与首页相同，在 `homeConfig.ts` 的 `socials` 里改 |
| `ContactList` | 联系方式列表，每行带「复制」按钮 | `:items="[{ label: '邮箱', value: 'a@b.com', href: 'mailto:a@b.com' }]"`，`href` 可选 |

补充说明：

- **`span`**：同一行的 `span` 加起来最好等于 12。平板上 `span` ≤ 6 的格子占半行，其它占整行；手机上所有格子都占整行。
- **图片**：站内图片放在 `docs/.vuepress/public/` 下，用 `/` 开头引用（例如 `image="/about/pfp.png"`）；也可以填 `https://` 地址。`background`、`cover` 还可以直接写 `bg-main`（`docs/images/bg-main.jpg`，分形图）或 `bg-cube`（`docs/images/bg-cube.jpg`，方块）。正文里的 Markdown 图片（`![](...)`）照常可用。
- **把头像钉在背景图里**：`SlantHero` 写了 `image-size` 时，前景图的位置按**背景图**计算，而不是按窗口：`image-x` / `image-y` 是前景图中心在背景图上的位置（百分比），`image-size` 是前景图宽度占背景图宽度的百分比。窗口在不同屏幕上裁切的范围不同，但前景图始终停在背景图的同一位置。「关于」页的头像就是这样放进分形中央的暗框里的：

  ```md
  <SlantHero label="关于" image="/about/pfp.png" cover="bg-main" image-x="49.95" image-y="47.6" image-size="15.8" image-fill="80">
  ```

  `image-x`、`image-y`、`image-size` 是按图量出来的（中央暗区的内切圆圆心约在 49.8% / 49.2%，直径约为图宽的 19.4%；头像宽 15.8% 时整个头像都在圆内）。换了背景图或头像，需要重新调整。

  `image-fill` 是头像占**窗口**宽度的百分比。写了它时，窗口变成竖长的平行四边形（宽:高默认 5:6，可以用 `window-ratio="4/5"` 之类调整，数字越小窗口越高），背景图以头像为中心放大，让头像占满窗口宽度的这个比例，暗框也跟着一起放大，头像始终在框里。想让头像再大一点或小一点，改这个数即可（不需要动另外三个）。

  不写 `image-size` 时，前景图贴着窗口底部居中，高度为窗口的 92%。
- **链接不能嵌套**：给 `SlantCell` 写了 `href` 后，它的正文里就不要再放链接。
- **方向规则**：与首页相同，方正行上下两侧的斜切行方向相反。`SlantHero` 的窗口算作 `/`，所以它下面如果是 `square`，再下面的斜切行要用 `rev`。「关于」页的顺序是：首屏窗口（/）→ square → rev → square → slant → square。

## 镜像站点

可以把其它网站「镜像」到博客里：在博客的页面里直接使用，风格也改成和博客一致，而原站的代码不进入本仓库。目前有六个：

| 原站 | 博客里的位置 |
|---|---|
| `https://shader-escape.github.io/emergency-exit/render-scale/` | 文章「逃离光影地狱」（`/posts/EscapingFromShaderHell/`），地址里的 `#bsl` / `#kappa` / `#sr` 与镜像同步 |
| `https://modsite-4x9.pages.dev/` | 「项目」页上半部分（代替原来的「模组」卡片） |
| `https://mcdeltasearch.hotpad100c.workers.dev/` | `/tools/mcdeltasearch/`，「项目」页「网页」分类里可以找到 |
| `https://hotpad100c.github.io/Redstone-Modeler/` | `/tools/redstone-modeler/`，同上 |
| `https://hotpad100c.github.io/TMCWords-Search/` | `/tools/tmcwords-search/`，同上 |
| `https://www.techmc.wiki/`（GTMC，**别人的网站**） | `/tools/gtmc/`，同上；静态快照（见下） |

### 工作方式

1. **抓取**：构建前 `scripts/mirror.mjs` 读取 `docs/.vuepress/mirrors.json`，从每个入口页面开始，递归抓取它引用的同站文件（`src`、`href`、`import`、`fetch("./…")`、CSS 里的 `url()` 等），存进 `docs/.vuepress/mirror-dist/<name>/`（不提交，已在 `.gitignore` 中）。构建完成后复制到网站的 `/mirror/<name>/`。
2. **改风格**：抓取时在每个 HTML 的末尾插入 `docs/.vuepress/mirrors/<name>.css`（风格覆盖）和 `_bridge.js`（桥接脚本）。覆盖 CSS 排在原站样式之后，所以写同样的选择器就能覆盖。
3. **显示**：博客页面用 `MirrorFrame` 组件把 `/mirror/<name>/` 放进 iframe。因为和博客同域，iframe 的高度可以跟随内容，深浅色也能同步。

桥接脚本做的事：

- 在博客里时，深浅色跟随博客导航栏的开关实时切换；单独打开 `/mirror/<name>/` 时读取博客保存的深浅色设置。
- 在博客里时，指向其它网站的链接在新标签页打开（GitHub 等网站不允许被嵌在 iframe 里）。
- 给 `<html>` 加上 `blog-mirror`（在博客里时再加 `blog-mirror-framed`），覆盖 CSS 可以用它只在博客里隐藏原站的主题按钮等。

**什么时候抓取**：`pnpm docs:build` 会先抓取镜像再构建，所以网站每次构建（Cloudflare Pages 在 `main` 有新提交时自动构建）都会拿到原站当时的最新版本。如果某个文件抓取失败，构建会失败，Cloudflare 继续使用上一次成功的版本，不会发布残缺的镜像。即使构建命令不是 `pnpm docs:build`，VuePress 插件在发现没有镜像文件时也会补抓一次。

**原站更新、博客没有新提交时**：Cloudflare 不会自己重新构建。`.github/workflows/refresh-mirrors.yml` 每天（北京时间 03:41）调用一次 Cloudflare 的 Deploy Hook 让它重新构建，需要先设置一次：

1. Cloudflare 控制台 → Workers & Pages → 博客的 Pages 项目 → Settings → Builds → Deploy hooks，添加一个（分支选 `main`），复制生成的地址。
2. GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret，名字填 `CF_DEPLOY_HOOK`，值填上一步的地址。

设置之后，想立刻更新时也可以在 GitHub 的 Actions → refresh-mirrors → Run workflow 手动运行。没有设置时这个工作流什么也不做。

### 添加一个镜像

**1. 在 `docs/.vuepress/mirrors.json` 里加一项**：

```json
{
  "name": "mytool",
  "url": "https://mytool.example.dev/",
  "entries": ["index.html"]
}
```

| 字段 | 说明 |
|---|---|
| `name` | 镜像名，决定地址 `/mirror/<name>/` 和覆盖 CSS 的文件名 |
| `url` | 原站地址 |
| `entries` | 入口页面，有多个页面时都列出来（例如 modsite 的 `index.html` 和 `mod.html`） |
| `extra` | 可选。脚本里用变量拼出来、自动发现不了的文件，例如 mcdelta 的 `model.json` |
| `follow` | 可选。这些 JSON 文件里出现的文件名也一并抓取，例如 mcdelta 的 `blobs.json` 里列着模型分片 |
| `scanStrings` | 可选，`true` 时把页面和脚本里所有「像相对路径文件」的字符串也抓取（例如脚本数据里的 `src: "img/a.png"`），找不到的只警告。shader-escape 的流程图图片就是这样找到的 |

运行 `pnpm mirror`，终端会列出抓到的文件和找不到的文件。然后 `pnpm docs:dev`，打开 `http://localhost:8080/mirror/<name>/` 确认原站能正常运行；打开浏览器开发者工具的「网络」面板，如果有 404，就把缺的文件加进 `extra` 或 `follow`。

**2. 写风格覆盖** `docs/.vuepress/mirrors/<name>.css`（可选，没有就保持原样）。建议的顺序：

- 先找原站的颜色变量（`:root { --bg: …; }` 之类），换成博客的颜色（见「配色」）。三个现有的覆盖文件都是这样开头的，可以照抄。
- `* { border-radius: 0 !important; }` 去掉圆角。
- 按钮、标签等加 `clip-path: polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)` 变成平行四边形。
- 文件开头 `@import` 博客用的字体（iframe 里不会继承博客的字体）。
- `.blog-mirror-framed body { min-height: 0 !important; }`：原站如果用了 `min-height: 100vh`，在 iframe 里会和自适应高度互相影响。

**3. 新建一个页面**，例如 `docs/tools/mytool.md`：

```md
---
title: My Tool
permalink: /tools/mytool/
pageLayout: page
description: 一句话介绍。
---

<MirrorFrame src="/mirror/mytool/" title="My Tool" source="https://mytool.example.dev/" />
```

`MirrorFrame` 的参数：`src` 镜像地址；`title` 标题栏里的名称；`source` 原站地址（可选，有的话标题栏里有「原站」按钮）；`fit` 为 `content`（默认，高度跟随内容，整页一起滚动）或 `screen`（占满一屏，适合编辑器这类应用）；`sync-hash`：博客地址的 `#…` 与镜像页面的 `#…` 双向同步，适合用 `#…` 切换内容的页面（例如「逃离光影地狱」的 `#bsl`）。`MirrorFrame` 也可以放在 `SlantPage` 里和其它内容一起排版，「项目」页就是这样。

想放进「项目」页，在 `docs/projects/data.js` 里加一项，`url` 写站内地址（`/tools/mytool/`），点击后会在当前标签页打开（博客页面走路由，`public/` 里的独立 HTML 整页打开）。封面图可以放在 `docs/.vuepress/public/projects/` 下。

「项目」页（`docs/projects/README.md`）的卡片由 `<NavPage />` 显示；`<NavPage :exclude="['模组']" />` 可以不显示某些分类。现在「模组」分类由上方的 modsite 镜像代替，但 `data.js` 里的模组条目仍然保留：首页的「展示项目」（`homeConfig.ts` 的 `featuredProjects`）和项目数用的是它们。

**站内链接请写成 `/` 开头的路径**（例如 `/RyansRenderingKit/Overview`），不要写 `https://hotpad100c.github.io/...`：博客现在由 Cloudflare Pages 提供，`hotpad100c.github.io` 这个地址下已经没有博客了（`hotpad100c.github.io/Redstone-Modeler/` 等其它仓库的项目站点不受影响）。

### 静态快照（GTMC）

GTMC 是 Next.js 网站，页面由服务器渲染，切换页面也要向服务器请求数据，直接复制文件无法运行。所以它用 `"mode": "static"`：

```json
{
  "name": "gtmc",
  "url": "https://www.techmc.wiki/",
  "mode": "static",
  "entries": ["en/articles/preface", "zh/articles/preface"],
  "crawl": ["en/articles/", "zh/articles/"],
  "credit": "<footer class=\"blog-mirror-credit\">…</footer>"
}
```

- 从 `entries` 开始，跟进 `crawl` 路径下的页面，每页存成 `<路径>/index.html`。不在 `crawl` 范围内的站内链接（作者页、编辑器等）指向原站。
- **去掉所有脚本**，只保留服务器渲染出来的内容。Next.js 流式渲染时真正的内容藏在页面后面的 `<div hidden id="S:…">` 里、本来由脚本换进去，抓取时会先做这一步。
- 以 `/` 开头的地址改写到 `/mirror/<name>/` 下；`/_next/image?url=…` 直接用原图。
- `credit` 是插在每页底部的 HTML，`{url}` 会换成这一页的原文地址。GTMC 依 CC BY-NC-SA 4.0 授权，转载需要写明来源、授权和做过的修改，这里就是写这些的地方。**不要删掉它。**
- 搜索、编辑、切换语言、主题按钮等需要脚本的功能在快照里不能用，风格覆盖 `gtmc.css` 把这些按钮隐藏了，并展开了目录里的所有分组；切换语言改用页面底部的链接。
- 最多跟进 400 个页面（`maxPages` 可调），防止范围写错时抓下整个网站。

### 限制

- 普通模式只适合**纯前端**的静态网站。原站如果调用自己的后端接口，换了域名之后可能被跨域限制拦下；需要服务器的网站用静态快照，只能看、不能用交互功能。
- 镜像**别人的网站**之前，先确认授权允许转载（GTMC 是 CC BY-NC-SA 4.0），并保留署名和原站链接。
- 原站里写死的外部地址（下载链接、图片 CDN、第三方接口，例如 modsite 的机器翻译）保持原样，会直接访问原来的地址。
- 风格覆盖依赖原站的类名和变量名。原站改版后，覆盖可能需要跟着调整。

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
