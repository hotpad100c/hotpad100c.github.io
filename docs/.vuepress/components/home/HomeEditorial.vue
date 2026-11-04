<script setup lang="ts">
import { computed } from 'vue'
import { RouteLink } from 'vuepress/client'
import { navLinks, profile, projects, socials, useHomePosts, useHomeTags } from './useHomeData'

const posts = useHomePosts()
const tags = useHomeTags()
const lead = computed(() => posts.value[0])
const secondary = computed(() => posts.value.slice(1, 4))
const index = computed(() => posts.value.slice(4, 12))
const latestDate = computed(() => {
  const d = lead.value?.date
  if (!d) return ''
  const [y, m] = d.split('-')
  return `${y} 年 ${Number(m)} 月`
})
const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <div class="ed-page">
    <header class="masthead">
      <div class="mast-top">
        <span>第 {{ pad(posts.length) }} 期</span>
        <span class="mast-mid">{{ profile.tagline }}</span>
        <span>{{ latestDate }}</span>
      </div>
      <h1 class="mast-title">Ryan100c</h1>
      <nav class="mast-nav">
        <RouteLink v-for="n in navLinks" :key="n.link" :to="n.link">{{ n.text }}</RouteLink>
        <a href="https://github.com/hotpad100c" target="_blank" rel="noopener">GitHub</a>
      </nav>
    </header>

    <main class="ed-grid">
      <!-- 头条 -->
      <article v-if="lead" class="lead">
        <p class="kicker">最新 · {{ lead.tags.slice(0, 2).join(' / ') || '随笔' }}</p>
        <RouteLink :to="lead.path" class="lead-title">{{ lead.title }}</RouteLink>
        <p class="lead-excerpt">{{ lead.excerpt }}…</p>
        <p class="byline">文 / Ryan100c　·　{{ lead.date }}</p>
        <RouteLink :to="lead.path" class="read">继续阅读 →</RouteLink>
      </article>

      <!-- 作者栏 -->
      <aside class="author">
        <img :src="profile.avatar" alt="Ryan100c" class="avatar">
        <h3>编者按</h3>
        <p class="quote">“{{ profile.motto }}”</p>
        <p class="small">{{ profile.text }}。热爱红石、编程、模组开发与视频创作。</p>
        <ul class="social-list">
          <li v-for="s in socials" :key="s.link">
            <a :href="s.link" target="_blank" rel="noopener">{{ s.text }}</a>
          </li>
        </ul>
      </aside>

      <!-- 次要文章 -->
      <section class="secondary">
        <article v-for="(p, i) in secondary" :key="p.path" class="sec-item">
          <span class="num">{{ pad(i + 2) }}</span>
          <p class="kicker">{{ p.tags[0] || '随笔' }}</p>
          <RouteLink :to="p.path" class="sec-title">{{ p.title }}</RouteLink>
          <p class="sec-excerpt">{{ p.excerpt.slice(0, 64) }}…</p>
          <p class="byline">{{ p.date }}</p>
        </article>
      </section>

      <!-- 目录 -->
      <section class="index">
        <h2 class="sec-head">本期目录</h2>
        <ol>
          <li v-for="(p, i) in index" :key="p.path">
            <span class="idx">{{ pad(i + 5) }}</span>
            <RouteLink :to="p.path">{{ p.title }}</RouteLink>
            <span class="leader" />
            <span class="idx-date">{{ p.date.slice(5) }}</span>
          </li>
        </ol>
        <RouteLink to="/posts/" class="read">全部文章 →</RouteLink>
      </section>

      <!-- 专题 / 标签 -->
      <section class="topics">
        <h2 class="sec-head">专题</h2>
        <p class="topic-cloud">
          <span v-for="t in tags.slice(0, 16)" :key="t.name" :style="{ fontSize: `${0.9 + Math.min(t.count, 6) * 0.12}rem` }">
            {{ t.name }}
          </span>
        </p>
      </section>

      <!-- 项目附录 -->
      <section class="appendix">
        <h2 class="sec-head">附录 · 作品</h2>
        <div class="app-grid">
          <a v-for="p in projects" :key="p.url" :href="p.url" target="_blank" rel="noopener" class="app-item">
            <span class="app-cat">{{ p.category }}</span>
            <strong>{{ p.title }}</strong>
            <span>{{ p.description }}</span>
          </a>
        </div>
      </section>
    </main>

    <footer class="colophon">
      <span>Ryan100c 的博客</span>
      <span>排印：VuePress + Plume</span>
      <span>© 2025–2026</span>
    </footer>
  </div>
</template>

<style scoped>
.ed-page {
  --paper: #f4efff;
  --ink: #1f1538;
  --ink-2: #4f4470;
  --rule: #1f1538;
  --accent: #5d3b99;
  --accent-soft: rgba(157, 131, 218, 0.25);
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif;
  padding: 0 16px 40px;
}
.masthead, .ed-grid, .colophon { max-width: 1180px; margin: 0 auto; }
.masthead { padding-top: 22px; border-bottom: 4px double var(--rule); }
.mast-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  letter-spacing: 0.1em;
  border-bottom: 1px solid var(--rule);
  padding-bottom: 8px;
  color: var(--ink-2);
}
.mast-title {
  font-family: 'Playfair Display', 'Noto Serif SC', serif;
  font-weight: 900;
  font-size: clamp(64px, 14vw, 180px);
  line-height: 1;
  letter-spacing: -0.03em;
  text-align: center;
  margin: 18px 0 10px;
  color: var(--ink);
  border: none;
}
.mast-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  border-top: 1px solid var(--rule);
  padding: 10px 0;
  font-size: 15px;
  letter-spacing: 0.2em;
}
.mast-nav a { color: var(--ink); text-decoration: none; }
.mast-nav a:hover { color: var(--accent); }

.ed-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0 48px;
  padding-top: 32px;
}
.kicker {
  font-family: 'Playfair Display', serif;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--accent);
  margin: 0 0 8px;
}
.lead { padding-bottom: 32px; border-bottom: 1px solid var(--rule); }
.lead-title {
  display: block;
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 900;
  line-height: 1.15;
  color: var(--ink);
  text-decoration: none;
}
.lead-title:hover { color: var(--accent); }
.lead-excerpt {
  font-size: 18px;
  line-height: 1.9;
  color: var(--ink-2);
  margin: 18px 0 12px;
}
.lead-excerpt::first-letter {
  float: left;
  font-size: 4.2em;
  line-height: 0.9;
  font-weight: 900;
  margin: 6px 10px 0 0;
  color: var(--accent);
}
.byline { font-size: 13px; color: var(--ink-2); font-style: italic; margin: 6px 0; }
.read {
  display: inline-block;
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  font-size: 14px;
  margin-top: 6px;
}

.author {
  grid-row: span 2;
  border-left: 1px solid var(--rule);
  padding-left: 32px;
}
.avatar { width: 96px; height: 96px; border-radius: 50%; border: 2px solid var(--ink); filter: saturate(0.9); }
.author h3 { font-size: 13px; letter-spacing: 0.3em; margin: 16px 0 6px; color: var(--ink-2); }
.quote { font-size: 22px; line-height: 1.6; font-weight: 700; margin: 0 0 14px; }
.small { font-size: 14px; line-height: 1.8; color: var(--ink-2); }
.social-list { list-style: none; padding: 0; margin: 16px 0 0; border-top: 1px solid var(--rule); }
.social-list li { border-bottom: 1px solid var(--accent-soft); }
.social-list a { display: block; padding: 8px 0; color: var(--ink); text-decoration: none; }
.social-list a::after { content: ' ↗'; color: var(--accent); }

.secondary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  padding: 24px 0;
  border-bottom: 1px solid var(--rule);
}
.sec-item { padding: 0 20px; border-left: 1px solid var(--accent-soft); position: relative; }
.sec-item:first-child { padding-left: 0; border-left: none; }
.num {
  font-family: 'Playfair Display', serif;
  font-size: 42px;
  font-weight: 900;
  color: var(--accent-soft);
  -webkit-text-stroke: 1px var(--accent);
  line-height: 1;
}
.sec-title { display: block; font-size: 20px; font-weight: 700; line-height: 1.4; color: var(--ink); text-decoration: none; }
.sec-title:hover { color: var(--accent); }
.sec-excerpt { font-size: 14px; line-height: 1.8; color: var(--ink-2); margin: 8px 0 0; }

.sec-head {
  font-size: 14px;
  letter-spacing: 0.3em;
  border-top: 3px solid var(--ink);
  border-bottom: none;
  padding-top: 8px;
  margin: 28px 0 14px;
}
.index { grid-column: 1; }
.index ol { list-style: none; padding: 0; margin: 0 0 12px; }
.index li { display: flex; align-items: baseline; gap: 12px; padding: 6px 0; }
.idx { font-family: 'Playfair Display', serif; color: var(--accent); font-weight: 700; }
.index a { color: var(--ink); text-decoration: none; font-size: 16px; }
.index a:hover { color: var(--accent); }
.leader { flex: 1; border-bottom: 1px dotted var(--ink-2); transform: translateY(-4px); }
.idx-date { font-size: 13px; color: var(--ink-2); font-variant-numeric: tabular-nums; }

.topics { grid-column: 2; padding-left: 32px; border-left: 1px solid var(--rule); }
.topic-cloud { display: flex; flex-wrap: wrap; gap: 4px 14px; line-height: 1.6; margin: 0; }
.topic-cloud span:nth-child(3n) { font-style: italic; color: var(--accent); }

.appendix { grid-column: 1 / -1; }
.app-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0; border-top: 1px solid var(--rule); }
.app-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px 14px 0;
  border-bottom: 1px solid var(--accent-soft);
  color: var(--ink);
  text-decoration: none;
  font-size: 14px;
}
.app-item span:last-child { color: var(--ink-2); }
.app-item strong { overflow-wrap: anywhere; }
.app-item:hover strong { color: var(--accent); }
.app-cat { font-size: 11px; letter-spacing: 0.2em; color: var(--accent); }

.colophon {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 40px;
  padding-top: 12px;
  border-top: 4px double var(--rule);
  font-size: 13px;
  color: var(--ink-2);
}

@media (max-width: 860px) {
  .ed-grid { grid-template-columns: 1fr; }
  .author, .topics { grid-row: auto; grid-column: 1; border-left: none; padding-left: 0; }
  .author { padding: 24px 0; border-bottom: 1px solid var(--rule); }
  .secondary { grid-template-columns: 1fr; gap: 20px; }
  .sec-item, .sec-item:first-child { padding: 0; border-left: none; }
  .mast-top .mast-mid { display: none; }
  .mast-nav { gap: 18px; letter-spacing: 0.1em; }
}
</style>
