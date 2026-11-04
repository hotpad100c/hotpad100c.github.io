<script setup lang="ts">
import { computed } from 'vue'
import { RouteLink, withBase } from 'vuepress/client'
import { actions, bgCube, featuredProjects, pickFeaturedProjects, profile, projects, recentCount, socials, useHomePosts, useHomeTags } from './useHomeData'

/**
 * 作为 Plume 首页区块使用：docs/README.md 中
 *   config:
 *     - type: HomeSlant
 *       background: /images/home-bg.jpg   # 整页背景（可选）
 *       cover: /images/home-cover.jpg      # 首屏斜切窗口里的封面（可选）
 * 图片放在 docs/.vuepress/public/ 下，以 / 开头引用；也可以填完整的 https:// 地址。
 * 两者都不填时使用 bg-cube。
 *
 * 文字、链接、数量等内容在 homeConfig.ts 中修改；布局与样式说明见仓库根目录 CUSTOMIZING.md。
 */
const props = defineProps<{
  background?: string
  cover?: string
}>()

const resolveImg = (src?: string) => (!src ? bgCube : src.startsWith('/') ? withBase(src) : src)
const bgImg = computed(() => `url(${resolveImg(props.background)})`)
const coverImg = computed(() => `url(${resolveImg(props.cover ?? props.background)})`)

const posts = useHomePosts()
const tags = useHomeTags()
const latest = computed(() => posts.value[0])
const recent = computed(() => posts.value.slice(1, 1 + recentCount))
const mods = pickFeaturedProjects(featuredProjects)
</script>

<template>
  <div class="sl-page" :style="{ '--bg-img': bgImg, '--cover-img': coverImg }">
    <div class="backdrop" aria-hidden="true" />

    <!-- 横屏：两列两行，一屏装下；竖屏：依次堆叠 -->
    <div class="stage">
      <section class="intro">
        <p class="label">{{ profile.tagline }}</p>
        <h1>Ryan<em>100c</em></h1>
        <p class="lede">{{ profile.text }}。<br>{{ profile.motto }}</p>
        <div class="actions">
          <RouteLink v-for="a in actions" :key="a.link" :to="a.link" class="btn" :class="{ solid: a.primary }">
            <span>{{ a.text }}</span>
          </RouteLink>
        </div>
        <p class="topics">
          <span class="label">话题</span>
          <span v-for="t in tags" :key="t.name" class="topic">{{ t.name }}</span>
        </p>
      </section>

      <div class="hero-window" aria-hidden="true">
        <div class="window-img" />
      </div>

      <div class="col-left">
        <!-- 斜切：最新文章 -->
        <RouteLink v-if="latest" :to="latest.path" class="tile latest">
          <div class="in">
            <p class="label">最新 · {{ latest.date }}</p>
            <h2>{{ latest.title }}</h2>
            <p class="muted excerpt">{{ latest.excerpt }}</p>
            <span class="tag-line">{{ latest.tags.map(t => '#' + t).join('  ') }}</span>
          </div>
        </RouteLink>

        <!-- 方正：计数 + 社交小按钮 -->
        <div class="panel quick" :style="{ '--quick-cols': 2 + socials.length }">
          <RouteLink to="/posts/" class="sq stat">
            <strong>{{ String(posts.length).padStart(2, '0') }}</strong><span>文章</span>
          </RouteLink>
          <RouteLink to="/projects/" class="sq stat">
            <strong>{{ String(projects.length).padStart(2, '0') }}</strong><span>项目</span>
          </RouteLink>
          <a
            v-for="s in socials"
            :key="s.link"
            :href="s.link"
            target="_blank"
            rel="noopener"
            class="sq social"
            :style="s.color ? { '--brand-c': s.color } : undefined"
            :title="s.text"
          >
            <Icon :name="s.icon" class="s-icon" />
            <span>{{ s.text }}</span>
          </a>
        </div>
      </div>

      <div class="col-right">
        <!-- 方正：近期文章 -->
        <section class="panel">
          <div class="sq recent">
            <div class="head">
              <p class="label">近期文章</p>
              <RouteLink to="/posts/" class="more">全部 {{ posts.length }} 篇 →</RouteLink>
            </div>
            <ol>
              <li v-for="p in recent" :key="p.path">
                <RouteLink :to="p.path" class="row">
                  <span class="t">{{ p.title }}</span><time>{{ p.date }}</time>
                </RouteLink>
              </li>
            </ol>
          </div>
        </section>

        <!-- 斜切（反向）：上方方框之上是左斜的封面窗口，所以这里换成右斜 -->
        <div class="proj-strip" :style="{ '--proj-cols': mods.length }">
          <a v-for="p in mods" :key="p.url" :href="p.url" target="_blank" rel="noopener" class="tile proj rev">
            <div class="in img-in">
              <img :src="p.cover" :alt="p.title" loading="lazy">
              <span>{{ p.title }}</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sl-page {
  --bg: #0b0910;
  --tile: rgba(19, 15, 28, 0.86);
  --tile-hover: rgba(34, 26, 52, 0.92);
  --panel: rgba(16, 13, 24, 0.94);
  --line: rgba(181, 156, 242, 0.22);
  --fg: #efe9fd;
  --fg-2: #a197bd;
  --accent: #b59cf2;
  --on-accent: #0b0910;
  --veil-1: rgba(11, 9, 16, 0.5);
  --veil-2: rgba(11, 9, 16, 0.92);
  --skew: -10deg;
  --unskew: 10deg;
  --nav-h: var(--vp-nav-height, 64px);
  --serif: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif;
  --display: 'Playfair Display', 'Noto Serif SC', serif;
  --mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  position: relative;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--serif);
  overflow: hidden;
}
/* 浅色模式（Plume 在 <html> 上设置 data-theme） */
[data-theme='light'] .sl-page {
  --bg: #efe9fb;
  --tile: rgba(250, 247, 255, 0.9);
  --tile-hover: #ffffff;
  --panel: rgba(248, 245, 254, 0.96);
  --line: rgba(93, 59, 153, 0.28);
  --fg: #1d1534;
  --fg-2: #5b5078;
  --accent: #5d3b99;
  --on-accent: #ffffff;
  --veil-1: rgba(239, 233, 251, 0.8);
  --veil-2: rgba(239, 233, 251, 0.94);
}
.backdrop {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--veil-1), var(--veil-2) 55%, var(--bg)), var(--bg-img) center top / cover no-repeat;
  filter: blur(2px);
  transform: scale(1.03);
}

/* 平行四边形：外层 skew，内容反向 skew 保持文字直立。
 * 规则：同一列里，方正面板上下两侧的斜切块方向相反（.rev 为反向）。 */
.tile, .btn, .hero-window { transform: skewX(var(--skew)); }
.tile > .in, .btn > span { display: block; transform: skewX(var(--unskew)); }
.rev { transform: skewX(var(--unskew)); }
.rev > .in { transform: skewX(var(--skew)); }

.label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin: 0; }
.muted { color: var(--fg-2); font-size: 13px; line-height: 1.7; margin: 0; }
.more { font-family: var(--mono); font-size: 12px; color: var(--fg-2); text-decoration: none; }
.more:hover { color: var(--accent); }

/* ---------- 舞台 ---------- */
.stage {
  position: relative;
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px max(36px, 4vw) 40px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
}

.intro h1 { white-space: nowrap; font-family: var(--display); font-size: clamp(52px, 7vw, 96px); font-weight: 900; line-height: 1; margin: 8px 0 12px; border: none; padding: 0; color: var(--fg); }
.intro h1 em { font-style: italic; color: var(--accent); }
.lede { color: var(--fg-2); font-size: 15px; line-height: 1.8; margin: 0 0 18px; }
.actions { display: flex; gap: 12px; padding-left: 6px; }
.btn { padding: 8px 22px; border: 1px solid var(--accent); color: var(--fg); text-decoration: none; font-size: 14px; }
.btn.solid { background: var(--accent); color: var(--on-accent); font-weight: 700; }
.btn:hover { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.topics { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin: 18px 0 0; font-size: 14px; }
.topic:nth-child(even) { font-style: italic; color: var(--accent); }

.hero-window { overflow: hidden; border: 1px solid var(--line); box-shadow: 16px 16px 0 rgba(181, 156, 242, 0.08); aspect-ratio: 16 / 8; max-width: 100%; }
.window-img { width: 100%; height: 100%; background: var(--cover-img) center 42% / cover no-repeat; transform: skewX(var(--unskew)) scale(1.2); }

.col-left, .col-right { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

/* 斜切卡片 */
.tile { background: var(--tile); border: 1px solid var(--line); color: var(--fg); text-decoration: none; min-width: 0; overflow: hidden; transition: background 0.2s, border-color 0.2s; }
.tile > .in { padding: 16px 26px; display: flex; flex-direction: column; gap: 6px; height: 100%; box-sizing: border-box; }
a.tile:hover { background: var(--tile-hover); border-color: var(--accent); }
.latest { flex: 1; }
.latest > .in { justify-content: center; }
.latest h2 { font-size: 22px; line-height: 1.35; margin: 0; border: none; padding: 0; color: var(--fg); }
.excerpt { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }
.tag-line { margin-top: auto; font-family: var(--mono); font-size: 11px; color: var(--fg-2); }

/* 方正面板：1px 发丝线网格 */
.panel { display: grid; gap: 1px; background: var(--line); border: 1px solid var(--line); }
.sq { background: var(--panel); padding: 14px 18px; display: flex; flex-direction: column; gap: 6px; min-width: 0; color: var(--fg); text-decoration: none; }
a.sq { transition: background 0.2s; }
a.sq:hover { background: var(--tile-hover); }

.quick { grid-template-columns: repeat(var(--quick-cols, 6), minmax(0, 1fr)); }
.quick .sq { padding: 10px 8px; align-items: center; justify-content: center; gap: 4px; min-height: 62px; text-align: center; }
.stat strong { font-family: var(--display); font-size: 26px; line-height: 1; font-weight: 900; color: var(--accent); }
.stat span, .social span { font-family: var(--mono); font-size: 10px; letter-spacing: 0.06em; color: var(--fg-2); }
.social .s-icon, .social :deep(svg) { width: 22px; height: 22px; font-size: 22px; color: var(--fg-2); transition: color 0.2s; }
.social:hover :deep(svg), .social:hover .s-icon { color: var(--brand-c, var(--fg)); }

.recent .head { display: flex; justify-content: space-between; align-items: baseline; }
.recent ol { list-style: none; margin: 0; padding: 0; counter-reset: r; }
.recent li { counter-increment: r; border-top: 1px solid var(--line); }
.recent .row { display: grid; grid-template-columns: 2.4em minmax(0, 1fr) auto; gap: 12px; padding: 6px 0; color: var(--fg); text-decoration: none; font-size: 15px; }
.recent .row::before { content: counter(r, decimal-leading-zero); font-family: var(--mono); font-size: 11px; color: var(--fg-2); padding-top: 3px; }
.recent .row:hover .t { color: var(--accent); }
.recent .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent time { font-family: var(--mono); font-size: 11px; color: var(--fg-2); font-variant-numeric: tabular-nums; padding-top: 3px; }

.proj-strip { display: grid; grid-template-columns: repeat(var(--proj-cols, 4), minmax(0, 1fr)); gap: 12px; padding-inline: 8px; }
.proj .img-in { padding: 0; gap: 0; position: relative; }
.proj img { display: block; width: 100%; aspect-ratio: 2 / 1; object-fit: cover; transform: scale(1.18); filter: saturate(0.7); transition: filter 0.3s; }
.proj:hover img { filter: none; }
.proj span { position: absolute; left: 0; right: 0; bottom: 0; padding: 4px 20px; font-family: var(--mono); font-size: 11px; background: var(--tile); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ---------- 横屏：一屏装下 ---------- */
@media (min-width: 1024px) {
  .stage {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 18px 40px;
    min-height: calc(100vh - var(--nav-h));
    box-sizing: border-box;
    padding-block: 24px 28px;
  }
  .intro { align-self: center; }
  .intro h1 { font-size: clamp(48px, min(5.6vw, 10vh), 96px); margin: 6px 0 10px; }
  .lede { margin-bottom: 14px; }
  .topics { margin-top: 14px; }
  /* 多余的高度交给封面窗口，下半部分按内容高度 */
  .hero-window { aspect-ratio: auto; height: auto; min-height: 200px; max-height: 560px; align-self: stretch; }
  .col-left, .col-right { align-self: stretch; }
}
/* 在桌面端延伸到 Plume 透明导航栏之下 */
@media (min-width: 960px) {
  .sl-page { margin-top: calc(-1 * var(--nav-h)); padding-top: var(--nav-h); }
}

/* ---------- 竖屏 / 手机 ---------- */
@media (max-width: 560px) {
  .sl-page { --skew: -6deg; --unskew: 6deg; }
  .stage { padding: 20px 24px 32px; gap: 14px; }
  .quick { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .recent time { display: none; }
  .recent .row { grid-template-columns: 2.4em minmax(0, 1fr); }
  .proj-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
