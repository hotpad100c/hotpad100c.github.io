<script setup lang="ts">
import { computed } from 'vue'
import { RouteLink } from 'vuepress/client'
import { bgCube, navLinks, profile, projects, socials, useHomePosts, useHomeTags } from './useHomeData'

const posts = useHomePosts()
const tags = useHomeTags()
const latest = computed(() => posts.value[0])
const second = computed(() => posts.value.slice(1, 3))
const index = computed(() => posts.value.slice(3, 9))
const mods = computed(() => projects.filter(p => p.cover).slice(0, 4))
const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <div class="cv-page">
    <header class="mast">
      <RouteLink to="/" class="title">Ryan100c</RouteLink>
      <p class="sub">{{ profile.tagline }}</p>
      <nav>
        <RouteLink v-for="n in navLinks" :key="n.link" :to="n.link">{{ n.text }}</RouteLink>
      </nav>
    </header>

    <main class="grid">
      <!-- 封面：bg-cube -->
      <figure class="cell cover" :style="{ backgroundImage: `url(${bgCube})` }">
        <figcaption>
          <p class="label light">封面</p>
          <p class="cover-quote">{{ profile.motto }}</p>
          <span class="dims">1920 × 1080 · bg-cube</span>
        </figcaption>
      </figure>

      <RouteLink v-if="latest" :to="latest.path" class="cell lead">
        <p class="label">最新 · {{ latest.tags[0] || '随笔' }}</p>
        <h2>{{ latest.title }}</h2>
        <p class="excerpt">{{ latest.excerpt.slice(0, 120) }}…</p>
        <p class="byline">{{ latest.date }}　继续阅读 →</p>
      </RouteLink>

      <RouteLink v-for="(p, i) in second" :key="p.path" :to="p.path" class="cell second">
        <span class="num">{{ pad(i + 2) }}</span>
        <h3>{{ p.title }}</h3>
        <p class="byline">{{ p.date }}</p>
      </RouteLink>

      <section class="cell index">
        <div class="head">
          <p class="label">目录</p>
          <RouteLink to="/posts/" class="more">全部 {{ posts.length }} 篇 →</RouteLink>
        </div>
        <ol>
          <li v-for="(p, i) in index" :key="p.path">
            <span class="idx">{{ pad(i + 4) }}</span>
            <RouteLink :to="p.path">{{ p.title }}</RouteLink>
            <span class="leader" />
            <time>{{ p.date.slice(5) }}</time>
          </li>
        </ol>
      </section>

      <section class="cell about">
        <img :src="profile.avatar" alt="Ryan100c" class="avatar">
        <p class="label">编者</p>
        <p class="small">{{ profile.text }}。热爱红石、编程、模组开发与视频创作。</p>
        <div class="socials">
          <a v-for="s in socials" :key="s.link" :href="s.link" target="_blank" rel="noopener">{{ s.text }} ↗</a>
        </div>
      </section>

      <section class="cell topics">
        <p class="label">专题</p>
        <p class="topic-list">
          <span v-for="t in tags" :key="t.name">{{ t.name }}<sup>{{ t.count }}</sup></span>
        </p>
      </section>

      <a v-for="p in mods" :key="p.url" :href="p.url" target="_blank" rel="noopener" class="cell proj">
        <img :src="p.cover" :alt="p.title" loading="lazy">
        <span class="app-cat">{{ p.category }}</span>
        <strong>{{ p.title }}</strong>
      </a>
    </main>

    <footer class="colophon">
      <span>Ryan100c 的博客</span>
      <RouteLink to="/projects/">全部 {{ projects.length }} 个项目 →</RouteLink>
      <span>© 2025–2026</span>
    </footer>
  </div>
</template>

<style scoped>
.cv-page {
  --paper: #f3eefc;
  --cell: #f8f5fe;
  --ink: #1d1534;
  --ink-2: #5b5078;
  --accent: #5d3b99;
  --line: #1d1534;
  --serif: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif;
  --display: 'Playfair Display', 'Noto Serif SC', serif;
  --mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--serif);
  padding: 0 max(16px, 3vw) 40px;
}
.mast, .grid, .colophon { max-width: 1200px; margin: 0 auto; }
.mast {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: 24px;
  padding: 28px 0 14px;
  border-bottom: 3px solid var(--ink);
}
.title { font-family: var(--display); font-weight: 900; font-size: clamp(40px, 6vw, 64px); line-height: 1; color: var(--ink); text-decoration: none; letter-spacing: -0.02em; }
.sub { margin: 0; font-size: 13px; color: var(--ink-2); letter-spacing: 0.15em; }
.mast nav { display: flex; gap: 24px; font-size: 15px; }
.mast nav a { color: var(--ink); text-decoration: none; }
.mast nav a:hover { color: var(--accent); }

.label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); margin: 0; }
.label.light { color: #d9cbff; }
.byline { font-size: 13px; font-style: italic; color: var(--ink-2); margin: 0; }
.more { font-family: var(--mono); font-size: 12px; color: var(--ink-2); text-decoration: none; }
.more:hover { color: var(--accent); }
.head { display: flex; justify-content: space-between; align-items: baseline; }

/* 1px 墨线方格 */
.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  margin-top: 24px;
}
.cell { background: var(--cell); padding: 22px; margin: 0; display: flex; flex-direction: column; gap: 10px; min-width: 0; color: var(--ink); text-decoration: none; }
a.cell:hover { background: #fff; }

.cover {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 440px;
  background-size: cover;
  background-position: center 40%;
  justify-content: flex-end;
  position: relative;
}
.cover figcaption { position: relative; display: grid; gap: 8px; }
.cover::before { content: ''; position: absolute; inset: 0; background: linear-gradient(transparent 45%, rgba(12, 9, 20, 0.85)); }
.cover-quote { margin: 0; font-size: 26px; font-weight: 700; line-height: 1.5; color: #f6f1ff; max-width: 22em; }
.dims { font-family: var(--mono); font-size: 11px; color: rgba(246, 241, 255, 0.6); }

.lead { grid-column: span 2; }
.lead h2 { font-size: clamp(26px, 3vw, 36px); font-weight: 900; line-height: 1.25; margin: 4px 0; border: none; padding: 0; color: var(--ink); }
.lead:hover h2 { color: var(--accent); }
.excerpt { margin: 0; font-size: 15px; line-height: 1.9; color: var(--ink-2); }
.lead .byline { margin-top: auto; }

.second .num { font-family: var(--display); font-size: 40px; font-weight: 900; line-height: 1; color: transparent; -webkit-text-stroke: 1px var(--accent); }
.second h3 { font-size: 18px; line-height: 1.45; margin: 0; color: var(--ink); }
.second:hover h3 { color: var(--accent); }
.second .byline { margin-top: auto; }

.index { grid-column: span 2; }
.index ol { list-style: none; margin: 0; padding: 0; }
.index li { display: flex; align-items: baseline; gap: 10px; padding: 6px 0; }
.idx { font-family: var(--mono); font-size: 12px; color: var(--accent); }
.index li a { color: var(--ink); text-decoration: none; }
.index li a:hover { color: var(--accent); }
.leader { flex: 1; border-bottom: 1px dotted var(--ink-2); transform: translateY(-4px); min-width: 16px; }
.index time { font-family: var(--mono); font-size: 12px; color: var(--ink-2); font-variant-numeric: tabular-nums; white-space: nowrap; }

.about .avatar { width: 64px; height: 64px; border: 1px solid var(--ink); }
.small { margin: 0; font-size: 14px; line-height: 1.8; color: var(--ink-2); }
.socials { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1px solid var(--ink); margin-top: auto; }
.socials a { padding: 6px 0; font-size: 13px; color: var(--ink); text-decoration: none; border-bottom: 1px solid rgba(29, 21, 52, 0.15); }
.socials a:hover { color: var(--accent); }

.topic-list { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 17px; margin: 0; }
.topic-list span:nth-child(3n + 1) { font-style: italic; color: var(--accent); }
.topic-list sup { font-family: var(--mono); font-size: 10px; color: var(--ink-2); }

.proj { padding: 0; gap: 4px; }
.proj img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; display: block; border-bottom: 1px solid var(--line); filter: grayscale(0.6); transition: filter 0.3s; }
.proj:hover img { filter: none; }
.proj .app-cat, .proj strong { padding: 0 14px; }
.proj .app-cat { font-family: var(--mono); font-size: 10px; letter-spacing: 0.15em; color: var(--accent); padding-top: 8px; }
.proj strong { font-size: 14px; padding-bottom: 12px; overflow-wrap: anywhere; }

.colophon { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding-top: 14px; margin-top: 24px; border-top: 3px solid var(--ink); font-size: 13px; color: var(--ink-2); }
.colophon a { color: var(--accent); text-decoration: none; }

@media (max-width: 900px) {
  .mast { grid-template-columns: 1fr; gap: 8px; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .cover { min-height: 340px; }
}
@media (max-width: 560px) {
  .cover, .lead, .index { grid-column: span 2; }
  .about, .topics { grid-column: span 2; }
  .cover-quote { font-size: 20px; }
  .mast nav { gap: 16px; }
}
</style>
