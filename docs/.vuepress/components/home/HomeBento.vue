<script setup lang="ts">
import { computed } from 'vue'
import { RouteLink } from 'vuepress/client'
import { navLinks, profile, projects, socials, useHomePosts, useHomeTags } from './useHomeData'

const posts = useHomePosts()
const tags = useHomeTags()
const latest = computed(() => posts.value[0])
const more = computed(() => posts.value.slice(1, 5))
const mods = computed(() => projects.filter(p => p.cover).slice(0, 6))
const socialIcon: Record<string, string> = {
  GitHub: 'mdi:github',
  Bilibili: 'ri:bilibili-fill',
  YouTube: 'mdi:youtube',
  Discord: 'ic:baseline-discord',
}
</script>

<template>
  <div class="bento-page">
    <header class="bento-nav">
      <RouteLink to="/" class="brand">
        <img :src="profile.avatar" alt="">Ryan100c
      </RouteLink>
      <nav>
        <RouteLink v-for="n in navLinks" :key="n.link" :to="n.link">{{ n.text }}</RouteLink>
      </nav>
    </header>

    <main class="bento">
      <!-- 自我介绍 -->
      <section class="tile intro">
        <div class="intro-glow" />
        <img :src="profile.avatar" alt="Ryan100c" class="avatar">
        <h1>你好，我是 <span>Ryan100c</span></h1>
        <p>{{ profile.text }}。{{ profile.motto }}</p>
        <div class="chips">
          <span>红石</span><span>Fabric 模组</span><span>TMC</span><span>视频创作</span>
        </div>
      </section>

      <!-- 最新文章 -->
      <RouteLink v-if="latest" :to="latest.path" class="tile latest">
        <span class="label">最新文章</span>
        <h2>{{ latest.title }}</h2>
        <p>{{ latest.excerpt.slice(0, 80) }}…</p>
        <span class="meta">{{ latest.date }} · {{ latest.tags.slice(0, 2).join(' / ') }}</span>
        <span class="arrow">↗</span>
      </RouteLink>

      <!-- 统计 -->
      <section class="tile stat">
        <strong>{{ posts.length }}</strong><span>篇文章</span>
      </section>
      <section class="tile stat alt">
        <strong>{{ projects.length }}</strong><span>个项目</span>
      </section>

      <!-- 更多文章 -->
      <section class="tile list">
        <div class="tile-head">
          <span class="label">近期</span>
          <RouteLink to="/posts/" class="link">全部 →</RouteLink>
        </div>
        <RouteLink v-for="p in more" :key="p.path" :to="p.path" class="row">
          <span>{{ p.title }}</span>
          <time>{{ p.date.slice(5) }}</time>
        </RouteLink>
      </section>

      <!-- 社交 -->
      <a
        v-for="s in socials"
        :key="s.link"
        :href="s.link"
        target="_blank"
        rel="noopener"
        class="tile social"
        :class="s.text.toLowerCase()"
      >
        <Icon :name="socialIcon[s.text]" class="s-icon" />
        <span>{{ s.text }}</span>
      </a>

      <!-- 项目 -->
      <section class="tile projects">
        <div class="tile-head">
          <span class="label">模组 & 工具</span>
          <RouteLink to="/projects/" class="link">更多 →</RouteLink>
        </div>
        <div class="proj-grid">
          <a v-for="p in mods" :key="p.url" :href="p.url" target="_blank" rel="noopener" class="proj">
            <img :src="p.cover" :alt="p.title" loading="lazy">
            <span>{{ p.title }}</span>
          </a>
        </div>
      </section>

      <!-- 标签 -->
      <section class="tile tags">
        <span class="label">话题</span>
        <div class="tag-wrap">
          <span v-for="t in tags.slice(0, 12)" :key="t.name">{{ t.name }}</span>
        </div>
      </section>
    </main>

    <footer class="bento-foot">© Ryan100c · VuePress + Plume</footer>
  </div>
</template>

<style scoped>
.bento-page {
  --bg: #efe8ff;
  --tile: #ffffff;
  --tile-2: #e3d8fb;
  --fg: #1e1636;
  --fg-2: #625782;
  --brand: #5d3b99;
  --brand-2: #9174c5;
  --border: rgba(93, 59, 153, 0.12);
  min-height: 100vh;
  background: var(--bg);
  color: var(--fg);
  font-family: 'Space Grotesk', 'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  padding: 0 16px 32px;
}
[data-theme='dark'] .bento-page {
  --bg: #121016;
  --tile: #1c1824;
  --tile-2: #2a2140;
  --fg: #f1ecff;
  --fg-2: #a59cc0;
  --brand: #b49cf0;
  --brand-2: #7a5cc0;
  --border: rgba(180, 156, 240, 0.12);
}

.bento-nav, .bento, .bento-foot { max-width: 1120px; margin: 0 auto; }
.bento-nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; color: var(--fg); text-decoration: none; }
.brand img { width: 32px; height: 32px; border-radius: 10px; }
.bento-nav nav { display: flex; gap: 6px; background: var(--tile); padding: 5px; border-radius: 999px; border: 1px solid var(--border); }
.bento-nav nav a { padding: 6px 14px; border-radius: 999px; color: var(--fg-2); text-decoration: none; font-size: 14px; }
.bento-nav nav a:hover { background: var(--tile-2); color: var(--fg); }

.bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(120px, auto);
  gap: 14px;
}
.tile {
  position: relative;
  background: var(--tile);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 22px;
  overflow: hidden;
  color: var(--fg);
  text-decoration: none;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
a.tile:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(93, 59, 153, 0.18); }
.label { font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--brand); }
.tile-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.link { font-size: 13px; color: var(--fg-2); text-decoration: none; }
.link:hover { color: var(--brand); }

.intro { grid-column: span 2; grid-row: span 2; display: flex; flex-direction: column; justify-content: flex-end; min-height: 300px; }
.intro-glow {
  position: absolute;
  inset: -40% -20% auto auto;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--brand-2), transparent 70%);
  opacity: 0.45;
  pointer-events: none;
}
.avatar { width: 72px; height: 72px; border-radius: 20px; margin-bottom: auto; position: relative; }
.intro h1 { font-size: clamp(28px, 4vw, 40px); line-height: 1.2; margin: 24px 0 10px; border: none; position: relative; }
.intro h1 span { color: var(--brand); }
.intro p { color: var(--fg-2); line-height: 1.7; margin: 0 0 14px; position: relative; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; position: relative; }
.chips span { font-size: 12px; padding: 4px 10px; border-radius: 999px; background: var(--tile-2); color: var(--brand); }

.latest {
  grid-column: span 2;
  background: linear-gradient(135deg, #422a82, #9174c5);
  color: #fff;
  border: none;
  display: flex;
  flex-direction: column;
}
.latest .label { color: rgba(255, 255, 255, 0.75); }
.latest h2 { font-size: 24px; line-height: 1.35; margin: 10px 0 8px; border: none; color: #fff; padding: 0; }
.latest p { margin: 0 0 12px; color: rgba(255, 255, 255, 0.82); font-size: 14px; line-height: 1.7; }
.latest .meta { margin-top: auto; font-size: 12px; color: rgba(255, 255, 255, 0.7); }
.arrow { position: absolute; top: 18px; right: 22px; font-size: 22px; }

.stat { display: flex; flex-direction: column; justify-content: center; }
.stat strong { font-size: 52px; line-height: 1; color: var(--brand); font-weight: 700; }
.stat span { color: var(--fg-2); margin-top: 6px; }
.stat.alt { background: var(--tile-2); border: none; }

.list { grid-column: span 2; grid-row: span 2; }
.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  color: var(--fg);
  text-decoration: none;
  font-size: 15px;
}
.row:hover span { color: var(--brand); }
.row time { color: var(--fg-2); font-size: 13px; font-variant-numeric: tabular-nums; flex-shrink: 0; }

.social { display: flex; flex-direction: column; justify-content: space-between; font-weight: 600; min-height: 120px; }
.social .s-icon, .social :deep(svg) { width: 32px; height: 32px; font-size: 32px; }
.social.github { background: var(--fg); color: var(--bg); border: none; }
.social.bilibili { color: #fb7299; }
.social.youtube { color: #ff3b3b; }
.social.discord { background: #5865f2; color: #fff; border: none; }
.social.bilibili span:last-child, .social.youtube span:last-child { color: var(--fg); }

.projects { grid-column: span 3; }
.proj-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.proj { position: relative; border-radius: 14px; overflow: hidden; aspect-ratio: 16 / 9; display: block; }
.proj img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
.proj span {
  position: absolute;
  inset: auto 0 0 0;
  padding: 18px 10px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(transparent, rgba(20, 10, 40, 0.85));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.proj:hover img { transform: scale(1.06); }

.tags { grid-column: span 1; }
.tag-wrap { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.tag-wrap span { font-size: 12px; padding: 4px 10px; border-radius: 8px; border: 1px solid var(--border); color: var(--fg-2); }

.bento-foot { text-align: center; color: var(--fg-2); font-size: 12px; padding-top: 24px; }

@media (max-width: 900px) {
  .bento { grid-template-columns: repeat(2, 1fr); }
  .projects { grid-column: span 2; }
  .tags { grid-column: span 2; }
}
@media (max-width: 560px) {
  .bento { grid-template-columns: 1fr 1fr; gap: 10px; }
  .intro, .latest, .list, .projects, .tags { grid-column: span 2; }
  .intro, .list { grid-row: auto; }
  .proj-grid { grid-template-columns: 1fr 1fr; }
  .bento-nav { flex-direction: column; gap: 12px; }
}
</style>
