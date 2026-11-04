<script setup lang="ts">
import { computed } from 'vue'
import { RouteLink } from 'vuepress/client'
import { bgCube, navLinks, profile, projects, socials, useHomePosts, useHomeTags } from './useHomeData'

/**
 * standalone: 独立页面（自带导航与页脚）。
 * 作为 Plume 首页区块使用时（config: - type: HomeSlant）保持 false，导航、搜索、深浅色切换、页脚都由主题提供。
 */
withDefaults(defineProps<{ standalone?: boolean }>(), { standalone: false })

const posts = useHomePosts()
const tags = useHomeTags()
const latest = computed(() => posts.value[0])
const recent = computed(() => posts.value.slice(1, 6))
const mods = computed(() => projects.filter(p => p.cover).slice(0, 4))
</script>

<template>
  <div class="sl-page" :class="{ embedded: !standalone }" :style="{ '--bg-img': `url(${bgCube})` }">
    <div class="backdrop" aria-hidden="true" />

    <nav v-if="standalone" class="topbar">
      <RouteLink to="/" class="brand"><span class="mark" />RYAN100C</RouteLink>
      <div class="links">
        <RouteLink v-for="n in navLinks" :key="n.link" :to="n.link" class="nav-item">
          <span>{{ n.text }}</span>
        </RouteLink>
      </div>
    </nav>

    <header class="hero">
      <div class="hero-text">
        <p class="label">{{ profile.tagline }}</p>
        <h1>Ryan<em>100c</em></h1>
        <p class="lede">{{ profile.text }}。<br>{{ profile.motto }}</p>
        <div class="actions">
          <RouteLink to="/posts/" class="btn solid"><span>阅读文章</span></RouteLink>
          <RouteLink to="/projects/" class="btn"><span>查看项目</span></RouteLink>
        </div>
      </div>
      <div class="hero-window" aria-hidden="true">
        <div class="window-img" />
      </div>
    </header>

    <main class="tiles">
      <RouteLink v-if="latest" :to="latest.path" class="tile latest">
        <div class="in">
          <p class="label">最新 · {{ latest.date }}</p>
          <h2>{{ latest.title }}</h2>
          <p class="muted">{{ latest.excerpt.slice(0, 96) }}…</p>
        </div>
      </RouteLink>

      <section class="tile stat">
        <div class="in"><strong>{{ posts.length }}</strong><span>篇文章</span></div>
      </section>
      <section class="tile stat">
        <div class="in"><strong>{{ projects.length }}</strong><span>个项目</span></div>
      </section>

      <section class="tile recent">
        <div class="in">
          <div class="head">
            <p class="label">近期文章</p>
            <RouteLink to="/posts/" class="more">全部 →</RouteLink>
          </div>
          <RouteLink v-for="p in recent" :key="p.path" :to="p.path" class="row">
            <span>{{ p.title }}</span><time>{{ p.date.slice(5) }}</time>
          </RouteLink>
        </div>
      </section>

      <section class="tile tags">
        <div class="in">
          <p class="label">话题</p>
          <div class="tag-list">
            <span v-for="t in tags" :key="t.name">{{ t.name }}</span>
          </div>
        </div>
      </section>

      <a v-for="p in mods" :key="p.url" :href="p.url" target="_blank" rel="noopener" class="tile proj">
        <div class="in img-in">
          <img :src="p.cover" :alt="p.title" loading="lazy">
          <span>{{ p.title }}</span>
        </div>
      </a>

      <a v-for="s in socials" :key="s.link" :href="s.link" target="_blank" rel="noopener" class="tile social">
        <div class="in"><strong>{{ s.text }}</strong><span class="muted">{{ s.handle }} ↗</span></div>
      </a>
    </main>

    <footer v-if="standalone" class="foot">© Ryan100c · VuePress + Plume</footer>
  </div>
</template>

<style scoped>
.sl-page {
  --bg: #0b0910;
  --tile: rgba(19, 15, 28, 0.86);
  --tile-hover: rgba(34, 26, 52, 0.92);
  --line: rgba(181, 156, 242, 0.22);
  --fg: #efe9fd;
  --fg-2: #a197bd;
  --accent: #b59cf2;
  --on-accent: #0b0910;
  --veil-1: rgba(11, 9, 16, 0.5);
  --veil-2: rgba(11, 9, 16, 0.92);
  --skew: -10deg;
  --unskew: 10deg;
  --serif: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif;
  --display: 'Playfair Display', 'Noto Serif SC', serif;
  --mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  position: relative;
  min-height: 100vh;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--serif);
  overflow: hidden;
}
.backdrop {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--veil-1), var(--veil-2) 55%, var(--bg)), var(--bg-img) center top / cover no-repeat;
  filter: blur(2px);
  transform: scale(1.03);
}
/* 浅色模式（Plume 在 <html> 上设置 data-theme） */
[data-theme='light'] .sl-page {
  --bg: #efe9fb;
  --tile: rgba(250, 247, 255, 0.9);
  --tile-hover: #ffffff;
  --line: rgba(93, 59, 153, 0.28);
  --fg: #1d1534;
  --fg-2: #5b5078;
  --accent: #5d3b99;
  --on-accent: #ffffff;
  --veil-1: rgba(239, 233, 251, 0.8);
  --veil-2: rgba(239, 233, 251, 0.94);
}

/* 嵌入 Plume 首页：在桌面端延伸到透明导航栏之下 */
@media (min-width: 960px) {
  .sl-page.embedded { margin-top: calc(-1 * var(--vp-nav-height, 64px)); padding-top: var(--vp-nav-height, 64px); }
}

.topbar, .hero, .tiles, .foot { position: relative; max-width: 1200px; margin: 0 auto; padding-inline: max(16px, 3vw); }

/* 平行四边形：外层 skew，内容反向 skew 保持文字直立 */
.tile, .btn, .nav-item, .hero-window, .mark { transform: skewX(var(--skew)); }
.tile > .in, .btn > span, .nav-item > span { display: block; transform: skewX(var(--unskew)); }

.topbar { display: flex; justify-content: space-between; align-items: center; height: 64px; font-family: var(--mono); font-size: 13px; }
.brand { display: flex; align-items: center; gap: 10px; color: var(--fg); text-decoration: none; letter-spacing: 0.2em; font-weight: 700; }
.mark { width: 14px; height: 14px; background: var(--accent); }
.links { display: flex; gap: 4px; }
.nav-item { padding: 6px 14px; color: var(--fg-2); text-decoration: none; border: 1px solid transparent; }
.nav-item:hover { color: var(--fg); border-color: var(--line); background: var(--tile); }

.hero { display: grid; grid-template-columns: 1fr 1.15fr; gap: 40px; align-items: center; padding-block: 48px 56px; }
.label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin: 0; }
.hero h1 { font-family: var(--display); font-size: clamp(56px, 9vw, 120px); font-weight: 900; line-height: 1; margin: 10px 0 18px; border: none; color: var(--fg); }
.hero h1 em { font-style: italic; color: var(--accent); }
.lede { color: var(--fg-2); font-size: 16px; line-height: 1.85; margin: 0 0 28px; }
.actions { display: flex; gap: 14px; padding-left: 8px; }
.btn { padding: 10px 24px; border: 1px solid var(--accent); color: var(--fg); text-decoration: none; font-size: 14px; }
.btn.solid { background: var(--accent); color: var(--on-accent); font-weight: 700; }
.btn:hover { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.tiles { padding-bottom: 56px; }

.hero-window { aspect-ratio: 16 / 10; overflow: hidden; border: 1px solid var(--line); box-shadow: 24px 24px 0 rgba(181, 156, 242, 0.08); max-width: 100%; }
.window-img { width: 100%; height: 100%; background: var(--bg-img) center 40% / cover no-repeat; transform: skewX(var(--unskew)) scale(1.2); }

.tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding-inline: max(40px, 4vw);
}
.tile { background: var(--tile); border: 1px solid var(--line); color: var(--fg); text-decoration: none; min-width: 0; overflow: hidden; transition: background 0.2s, border-color 0.2s; }
.tile > .in { padding: 22px 28px; display: flex; flex-direction: column; gap: 10px; height: 100%; box-sizing: border-box; }
a.tile:hover { background: var(--tile-hover); border-color: var(--accent); }
.muted { color: var(--fg-2); font-size: 14px; line-height: 1.75; margin: 0; }
.more { font-family: var(--mono); font-size: 12px; color: var(--fg-2); text-decoration: none; }
.more:hover { color: var(--accent); }
.head { display: flex; justify-content: space-between; align-items: baseline; }

.latest { grid-column: span 2; }
.latest h2 { font-size: 28px; line-height: 1.35; margin: 2px 0; border: none; padding: 0; color: var(--fg); }
.stat .in { justify-content: flex-end; min-height: 150px; }
.stat strong { font-family: var(--display); font-style: italic; font-size: 64px; line-height: 1; font-weight: 900; color: var(--accent); }
.stat span { font-family: var(--mono); font-size: 12px; color: var(--fg-2); }

.recent { grid-column: span 3; }
.row { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-top: 1px solid var(--line); color: var(--fg); text-decoration: none; }
.row:hover span { color: var(--accent); }
.row time { font-family: var(--mono); font-size: 12px; color: var(--fg-2); flex-shrink: 0; padding-top: 3px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 15px; }
.tag-list span:nth-child(odd) { font-style: italic; color: var(--accent); }

.proj .img-in { padding: 0; gap: 0; }
.proj img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; transform: scale(1.18); filter: saturate(0.7); transition: filter 0.3s; }
.proj:hover img { filter: none; }
.proj span { position: relative; padding: 10px 28px; font-family: var(--mono); font-size: 12px; background: var(--tile); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.social strong { font-family: var(--display); font-size: 22px; }

.foot { text-align: center; padding-block: 32px; font-family: var(--mono); font-size: 12px; color: var(--fg-2); }

@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; }
  .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .recent { grid-column: span 2; }
}
@media (max-width: 560px) {
  .sl-page { --skew: -6deg; --unskew: 6deg; }
  .tiles { padding-inline: 28px; gap: 10px; }
  .latest, .tags { grid-column: span 2; }
  .tile > .in { padding: 16px 20px; }
  .links { gap: 0; }
  .nav-item { padding: 6px 8px; }
  .stat strong { font-size: 48px; }
}
</style>
