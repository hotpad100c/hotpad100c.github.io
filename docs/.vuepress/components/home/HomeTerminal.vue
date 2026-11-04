<script setup lang="ts">
import { computed } from 'vue'
import { RouteLink } from 'vuepress/client'
import { navLinks, profile, projects, socials, useHomePosts, useHomeTags } from './useHomeData'

const posts = useHomePosts()
const tags = useHomeTags()
const recent = computed(() => posts.value.slice(0, 8))

const ascii = String.raw`
 ____                   _  ___   ___
|  _ \ _   _  __ _ _ __/ |/ _ \ / _ \  ___
| |_) | | | |/ _' | '_ \ | | | | | | |/ __|
|  _ <| |_| | (_| | | | || |_| | |_| | (__
|_| \_\\__, |\__,_|_| |_|_|\___/ \___/ \___|
       |___/`
</script>

<template>
  <div class="term-page">
    <div class="term-window">
      <div class="term-bar">
        <span class="dot" /><span class="dot" /><span class="dot" />
        <span class="term-title">ryan100c@blog: ~</span>
        <nav class="term-nav">
          <RouteLink v-for="n in navLinks" :key="n.link" :to="n.link">{{ n.en }}</RouteLink>
        </nav>
      </div>

      <div class="term-body">
        <!-- whoami -->
        <p class="cmd"><span class="ps">ryan@blog</span>:<span class="path">~</span>$ whoami</p>
        <pre class="ascii" aria-label="Ryan100c">{{ ascii }}</pre>
        <p class="out">{{ profile.tagline }}</p>
        <p class="out dim"># {{ profile.text }}</p>

        <!-- motto -->
        <p class="cmd"><span class="ps">ryan@blog</span>:<span class="path">~</span>$ cat motto.txt</p>
        <p class="out hl">"{{ profile.motto }}"</p>

        <!-- posts -->
        <p class="cmd">
          <span class="ps">ryan@blog</span>:<span class="path">~</span>$ ls -lt posts/ | head -{{ recent.length }}
        </p>
        <ul class="ls">
          <li v-for="p in recent" :key="p.path">
            <span class="perm">-rw-r--r--</span>
            <span class="date">{{ p.date }}</span>
            <RouteLink class="file" :to="p.path">{{ p.title }}</RouteLink>
            <span class="tags">
              <span v-for="t in p.tags.slice(0, 3)" :key="t">#{{ t }}</span>
            </span>
          </li>
        </ul>
        <p class="out dim">
          共 {{ posts.length }} 篇 ·
          <RouteLink to="/posts/" class="more">cd posts/ →</RouteLink>
        </p>

        <!-- tags -->
        <p class="cmd"><span class="ps">ryan@blog</span>:<span class="path">~</span>$ grep -c tag posts/* | sort -rn</p>
        <p class="tagcloud">
          <span v-for="t in tags.slice(0, 14)" :key="t.name">{{ t.name }}<sup>{{ t.count }}</sup></span>
        </p>

        <!-- projects -->
        <p class="cmd"><span class="ps">ryan@blog</span>:<span class="path">~</span>$ ls projects/</p>
        <div class="grid">
          <a v-for="p in projects" :key="p.url" :href="p.url" target="_blank" rel="noopener" class="proj">
            <span class="dir">{{ p.title }}/</span>
            <span class="desc">{{ p.description }}</span>
          </a>
        </div>

        <!-- socials -->
        <p class="cmd"><span class="ps">ryan@blog</span>:<span class="path">~</span>$ cat ~/.contacts</p>
        <p class="socials">
          <a v-for="s in socials" :key="s.link" :href="s.link" target="_blank" rel="noopener">
            {{ s.text.toLowerCase() }}=<em>{{ s.handle }}</em>
          </a>
        </p>

        <p class="cmd"><span class="ps">ryan@blog</span>:<span class="path">~</span>$ <span class="cursor" /></p>
      </div>
    </div>
    <p class="term-foot">VuePress + Plume · © Ryan100c</p>
  </div>
</template>

<style scoped>
.term-page {
  --t-bg: #0e0a18;
  --t-panel: #150f24;
  --t-line: #2c2145;
  --t-fg: #cdbdf2;
  --t-dim: #7c6aa6;
  --t-accent: #9d83da;
  --t-hl: #f1e9ff;
  --t-green: #8de3b4;
  min-height: 100vh;
  padding: 48px 16px 24px;
  background:
    radial-gradient(ellipse at top, rgba(93, 59, 153, 0.35), transparent 60%),
    var(--t-bg);
  color: var(--t-fg);
  font-family: 'JetBrains Mono', 'Sarasa Mono SC', ui-monospace, Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.7;
}
.term-window {
  position: relative;
  max-width: 980px;
  margin: 0 auto;
  border: 1px solid var(--t-line);
  border-radius: 10px;
  background: var(--t-panel);
  box-shadow: 0 0 0 1px rgba(157, 131, 218, 0.08), 0 30px 80px rgba(0, 0, 0, 0.6), 0 0 120px rgba(93, 59, 153, 0.25);
  overflow: hidden;
}
/* 扫描线 */
.term-window::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 3px);
}
.term-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--t-line);
  background: #1b1430;
  flex-wrap: wrap;
}
.dot { width: 12px; height: 12px; border-radius: 50%; background: #3a2d5c; }
.dot:nth-child(1) { background: #c56b8f; }
.dot:nth-child(2) { background: #9174c5; }
.dot:nth-child(3) { background: #5d3b99; }
.term-title { margin-left: 8px; color: var(--t-dim); }
.term-nav { margin-left: auto; display: flex; gap: 14px; }
.term-nav a { color: var(--t-fg); text-decoration: none; }
.term-nav a::before { content: './'; color: var(--t-dim); }
.term-nav a:hover { color: var(--t-hl); text-shadow: 0 0 8px var(--t-accent); }

.term-body { padding: 20px 24px 28px; }
.cmd { margin: 22px 0 6px; color: var(--t-hl); word-break: break-all; }
.cmd:first-child { margin-top: 0; }
.ps { color: var(--t-green); }
.path { color: var(--t-accent); }
.out { margin: 2px 0; }
.dim { color: var(--t-dim); }
.hl { color: var(--t-hl); text-shadow: 0 0 10px rgba(157, 131, 218, 0.6); }
.ascii {
  margin: 4px 0 10px;
  color: var(--t-accent);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.15;
  text-shadow: 0 0 12px rgba(157, 131, 218, 0.7);
  overflow-x: auto;
  background: none;
  padding: 0;
}
.ls { list-style: none; margin: 0; padding: 0; }
.ls li {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 16px;
  padding: 2px 6px;
  margin: 0 -6px;
  border-radius: 4px;
}
.ls li:hover { background: rgba(157, 131, 218, 0.12); }
.perm { color: var(--t-dim); }
.date { color: var(--t-accent); }
.file { color: var(--t-hl); text-decoration: none; }
.file:hover { text-decoration: underline; }
.tags { color: var(--t-dim); display: flex; gap: 8px; }
.more { color: var(--t-green); text-decoration: none; }
.tagcloud { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 0; }
.tagcloud sup { color: var(--t-dim); margin-left: 2px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 4px 24px; }
.proj { display: flex; flex-direction: column; text-decoration: none; padding: 6px 8px; margin: 0 -8px; border-radius: 4px; }
.proj:hover { background: rgba(157, 131, 218, 0.12); }
.dir { color: #a8c7ff; font-weight: 700; overflow-wrap: anywhere; }
.desc { color: var(--t-dim); font-size: 13px; }
.socials { display: flex; flex-wrap: wrap; gap: 4px 22px; margin: 0; }
.socials a { color: var(--t-fg); text-decoration: none; }
.socials a:hover { color: var(--t-hl); }
.socials em { font-style: normal; color: var(--t-green); }
.cursor {
  display: inline-block;
  width: 9px;
  height: 1.1em;
  vertical-align: text-bottom;
  background: var(--t-hl);
  animation: blink 1.1s steps(1) infinite;
}
@keyframes blink { 50% { opacity: 0; } }
.term-foot { text-align: center; color: var(--t-dim); font-size: 12px; margin-top: 18px; }

@media (max-width: 640px) {
  .term-body { padding: 16px 14px 22px; }
  .ascii { font-size: 9px; }
  .ls li { grid-template-columns: auto 1fr; gap: 2px 10px; }
  .perm, .tags { display: none; }
  .term-nav { margin-left: 0; width: 100%; }
}
</style>
