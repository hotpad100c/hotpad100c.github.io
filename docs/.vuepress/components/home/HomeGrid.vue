<script setup lang="ts">
import { computed } from 'vue'
import { RouteLink } from 'vuepress/client'
import { bgCube, navLinks, profile, projects, socials, useHomePosts, useHomeTags } from './useHomeData'

const posts = useHomePosts()
const tags = useHomeTags()
const latest = computed(() => posts.value[0])
const recent = computed(() => posts.value.slice(1, 6))
const mods = computed(() => projects.filter(p => p.cover).slice(0, 6))
const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <div class="gd-page">
    <!-- 背景图首屏 -->
    <header class="hero" :style="{ backgroundImage: `url(${bgCube})` }">
      <nav class="topbar">
        <RouteLink to="/" class="brand">RYAN100C</RouteLink>
        <div class="links">
          <RouteLink v-for="n in navLinks" :key="n.link" :to="n.link">{{ n.text }}</RouteLink>
        </div>
      </nav>
      <div class="hero-text">
        <p class="label">{{ profile.tagline }}</p>
        <h1>Ryan100c</h1>
        <p class="lede">{{ profile.text }}。</p>
      </div>
      <span class="coord">x 0 · y 64 · z 0</span>
    </header>

    <!-- 方格：gap 1px + 容器底色 = 发丝线网格 -->
    <main class="grid">
      <section class="cell intro">
        <p class="label">00 / 关于</p>
        <p class="quote">“{{ profile.motto }}”</p>
        <p class="muted">热爱红石、编程、Minecraft 模组开发与视频创作。</p>
        <RouteLink to="/about/" class="more">关于我 →</RouteLink>
      </section>

      <RouteLink v-if="latest" :to="latest.path" class="cell latest">
        <p class="label">01 / 最新 · {{ latest.date }}</p>
        <h2>{{ latest.title }}</h2>
        <p class="muted">{{ latest.excerpt.slice(0, 90) }}…</p>
        <span class="tagline">{{ latest.tags.map(t => '#' + t).join('  ') }}</span>
      </RouteLink>

      <section class="cell stat">
        <strong>{{ pad(posts.length) }}</strong><span>文章</span>
      </section>
      <section class="cell stat">
        <strong>{{ pad(projects.length) }}</strong><span>项目</span>
      </section>
      <section class="cell stat">
        <strong>{{ pad(tags.length) }}</strong><span>标签</span>
      </section>
      <section class="cell stat">
        <strong>{{ latest?.date.slice(0, 7) }}</strong><span>最近更新</span>
      </section>

      <section class="cell recent">
        <div class="head">
          <p class="label">02 / 近期文章</p>
          <RouteLink to="/posts/" class="more">全部 →</RouteLink>
        </div>
        <ol>
          <li v-for="p in recent" :key="p.path">
            <RouteLink :to="p.path">
              <span class="t">{{ p.title }}</span>
              <time>{{ p.date }}</time>
            </RouteLink>
          </li>
        </ol>
      </section>

      <section class="cell tags">
        <p class="label">03 / 话题</p>
        <div class="tag-list">
          <span v-for="t in tags" :key="t.name">{{ t.name }}<sup>{{ t.count }}</sup></span>
        </div>
      </section>

      <a v-for="s in socials" :key="s.link" :href="s.link" target="_blank" rel="noopener" class="cell social">
        <span class="label">{{ s.handle }}</span>
        <strong>{{ s.text }}</strong>
        <span class="arrow">↗</span>
      </a>

      <section class="cell projects">
        <div class="head">
          <p class="label">04 / 模组与工具</p>
          <RouteLink to="/projects/" class="more">全部 {{ projects.length }} 个 →</RouteLink>
        </div>
        <div class="proj-grid">
          <a v-for="p in mods" :key="p.url" :href="p.url" target="_blank" rel="noopener" class="proj">
            <img :src="p.cover" :alt="p.title" loading="lazy">
            <span>{{ p.title }}</span>
          </a>
        </div>
      </section>
    </main>

    <footer class="foot">
      <span>© Ryan100c</span><span>VuePress + Plume</span>
    </footer>
  </div>
</template>

<style scoped>
.gd-page {
  --bg: #0c0a12;
  --cell: #13101c;
  --cell-hover: #1b1628;
  --line: #2d2542;
  --fg: #ece6fb;
  --fg-2: #9a90b8;
  --accent: #b59cf2;
  --serif: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif;
  --display: 'Playfair Display', 'Noto Serif SC', serif;
  --mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  min-height: 100vh;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--serif);
}

.hero {
  position: relative;
  min-height: min(78vh, 720px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0 max(16px, 4vw) 48px;
  background-size: cover;
  background-position: center 40%;
  border-bottom: 1px solid var(--line);
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(12, 10, 18, 0.55) 0%, transparent 30%, transparent 55%, var(--bg) 100%);
}
.hero > * { position: relative; }
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
  border-bottom: 1px solid rgba(236, 230, 251, 0.18);
  font-family: var(--mono);
  font-size: 13px;
}
.brand { color: var(--fg); text-decoration: none; letter-spacing: 0.2em; font-weight: 700; }
.links { display: flex; gap: 28px; }
.links a { color: var(--fg-2); text-decoration: none; }
.links a:hover { color: var(--fg); }
.hero-text { max-width: 640px; }
.hero h1 {
  font-family: var(--display);
  font-size: clamp(56px, 10vw, 128px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 8px 0 12px;
  border: none;
  color: var(--fg);
}
.lede { font-size: 17px; color: var(--fg-2); margin: 0; }
.coord {
  position: absolute;
  right: max(16px, 4vw);
  bottom: 52px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--fg-2);
}

.label {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0;
}
.muted { color: var(--fg-2); font-size: 14px; line-height: 1.8; margin: 0; }
.more { font-family: var(--mono); font-size: 12px; color: var(--fg-2); text-decoration: none; }
.more:hover { color: var(--accent); }

.grid {
  max-width: 1200px;
  margin: -1px auto 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}
.cell {
  background: var(--cell);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  color: var(--fg);
  text-decoration: none;
}
a.cell { transition: background 0.2s; }
a.cell:hover { background: var(--cell-hover); }
.head { display: flex; justify-content: space-between; align-items: baseline; }

.intro { grid-column: span 2; }
.quote { font-size: 24px; font-weight: 700; line-height: 1.5; margin: 8px 0 0; }
.intro .more { margin-top: auto; }

.latest { grid-column: span 2; }
.latest h2 { font-size: 28px; line-height: 1.35; margin: 4px 0 0; border: none; padding: 0; color: var(--fg); }
.latest:hover h2 { color: var(--accent); }
.tagline { margin-top: auto; font-family: var(--mono); font-size: 12px; color: var(--fg-2); }

.stat { min-height: 150px; justify-content: flex-end; }
.stat strong { font-family: var(--display); font-size: clamp(32px, 4vw, 56px); line-height: 1; font-weight: 900; }
.stat span { font-family: var(--mono); font-size: 12px; color: var(--fg-2); }

.recent { grid-column: span 3; }
.recent ol { list-style: none; margin: 0; padding: 0; counter-reset: r; }
.recent li { border-top: 1px solid var(--line); counter-increment: r; }
.recent li a {
  display: grid;
  grid-template-columns: 2.5em 1fr auto;
  gap: 12px;
  padding: 11px 0;
  color: var(--fg);
  text-decoration: none;
}
.recent li a::before { content: counter(r, decimal-leading-zero); font-family: var(--mono); font-size: 12px; color: var(--fg-2); padding-top: 3px; }
.recent li a:hover .t { color: var(--accent); }
.recent time { font-family: var(--mono); font-size: 12px; color: var(--fg-2); font-variant-numeric: tabular-nums; padding-top: 3px; }

.tags .tag-list { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 15px; }
.tags sup { font-family: var(--mono); font-size: 10px; color: var(--fg-2); margin-left: 2px; }

.social { aspect-ratio: 2 / 1; justify-content: space-between; position: relative; }
.social strong { font-family: var(--display); font-size: 22px; }
.social .arrow { position: absolute; top: 20px; right: 22px; color: var(--fg-2); }
.social:hover .arrow { color: var(--accent); }

.projects { grid-column: span 4; }
.proj-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); }
.proj { display: flex; flex-direction: column; background: var(--cell); color: var(--fg); text-decoration: none; min-width: 0; }
.proj img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; display: block; filter: saturate(0.7); transition: filter 0.3s; }
.proj:hover img { filter: none; }
.proj span { font-size: 12px; font-family: var(--mono); padding: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--fg-2); }
.proj:hover span { color: var(--fg); }

.foot {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px max(16px, 0px) 32px;
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--fg-2);
}

@media (max-width: 900px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .recent, .projects { grid-column: span 2; }
  .tags { grid-column: span 2; }
  .proj-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .intro, .latest { grid-column: span 2; }
  .links { gap: 14px; }
  .coord { display: none; }
  .hero { min-height: 520px; }
  .cell { padding: 18px; }
  .foot { padding-inline: 16px; }
}
</style>
