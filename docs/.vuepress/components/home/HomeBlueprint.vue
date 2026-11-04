<script setup lang="ts">
import { computed } from 'vue'
import { RouteLink } from 'vuepress/client'
import { navLinks, profile, projects, socials, useHomePosts, useHomeTags } from './useHomeData'

const posts = useHomePosts()
const tags = useHomeTags()
const bom = computed(() => posts.value.slice(0, 9))
const parts = projects.slice(0, 10)
const pad = (n: number, w = 2) => String(n).padStart(w, '0')
const rev = computed(() => posts.value[0]?.date || '')

// 等轴测立方体 + 六个方向的「更新」箭头
const neighbors = [
  { label: '+Y', x1: 200, y1: 70, x2: 200, y2: 18 },
  { label: '-Y', x1: 200, y1: 250, x2: 200, y2: 302 },
  { label: '+X', x1: 290, y1: 185, x2: 345, y2: 215 },
  { label: '-X', x1: 110, y1: 135, x2: 55, y2: 105 },
  { label: '+Z', x1: 110, y1: 185, x2: 55, y2: 215 },
  { label: '-Z', x1: 290, y1: 135, x2: 345, y2: 105 },
]
</script>

<template>
  <div class="bp-page">
    <div class="sheet">
      <!-- 顶部 -->
      <header class="bp-head">
        <div class="logo">
          <span class="mark">R</span>
          <span>RYAN100C / <em>技术图纸</em></span>
        </div>
        <nav>
          <RouteLink v-for="(n, i) in navLinks" :key="n.link" :to="n.link">
            <small>{{ pad(i + 1) }}</small>{{ n.text }}
          </RouteLink>
        </nav>
      </header>

      <!-- Hero：图 01 -->
      <section class="hero">
        <div class="hero-text">
          <p class="fig">FIG. 01 — 作者总成</p>
          <h1>看见<span>看不见</span>的<br>游戏逻辑。</h1>
          <p class="lede">{{ profile.text }}。<br>{{ profile.tagline }}</p>
          <div class="dim-line"><span>{{ posts.length }} 篇文章 · {{ projects.length }} 个项目 · {{ tags.length }} 个标签</span></div>
          <div class="actions">
            <RouteLink to="/posts/" class="btn solid">阅读文章</RouteLink>
            <RouteLink to="/about/" class="btn">关于我</RouteLink>
          </div>
        </div>

        <figure class="hero-fig">
          <svg viewBox="0 0 400 320" role="img" aria-label="方块与六个相邻方向的示意图">
            <defs>
              <marker id="bp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
              </marker>
            </defs>
            <!-- 立方体 -->
            <g class="cube">
              <polygon points="200,70 290,120 200,170 110,120" class="top" />
              <polygon points="110,120 200,170 200,250 110,200" class="left" />
              <polygon points="290,120 200,170 200,250 290,200" class="right" />
            </g>
            <!-- 方向箭头 -->
            <g class="arrows">
              <g v-for="n in neighbors" :key="n.label">
                <line :x1="n.x1" :y1="n.y1" :x2="n.x2" :y2="n.y2" marker-end="url(#bp-arrow)" />
                <text :x="n.x2 + (n.x2 > 200 ? 8 : n.x2 < 200 ? -26 : 8)" :y="n.y2 + (n.y2 < 160 ? 4 : 12)">{{ n.label }}</text>
              </g>
            </g>
            <text x="200" y="124" class="center-label" text-anchor="middle">update()</text>
          </svg>
          <figcaption>图 01：一次方块更新 = 对六个邻居的方法调用</figcaption>
        </figure>
      </section>

      <!-- BOM：文章清单 -->
      <section class="block">
        <div class="block-head">
          <p class="fig">FIG. 02 — 零件清单（文章）</p>
          <RouteLink to="/posts/" class="more">全部 {{ posts.length }} 篇 →</RouteLink>
        </div>
        <table class="bom">
          <thead>
            <tr><th>编号</th><th>名称</th><th class="hide-sm">规格（标签）</th><th>日期</th></tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in bom" :key="p.path">
              <td class="mono">P-{{ pad(i + 1, 3) }}</td>
              <td><RouteLink :to="p.path">{{ p.title }}</RouteLink></td>
              <td class="hide-sm mono dim">{{ p.tags.slice(0, 3).join(' · ') || '—' }}</td>
              <td class="mono dim">{{ p.date }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 项目：标注 -->
      <section class="block">
        <div class="block-head">
          <p class="fig">FIG. 03 — 外购件（项目 {{ parts.length }}/{{ projects.length }}）</p>
          <RouteLink to="/projects/" class="more">项目页 →</RouteLink>
        </div>
        <div class="parts">
          <a v-for="(p, i) in parts" :key="p.url" :href="p.url" target="_blank" rel="noopener" class="part">
            <span class="callout">{{ i + 1 }}</span>
            <div class="part-img">
              <img v-if="p.cover" :src="p.cover" :alt="p.title" loading="lazy">
            </div>
            <strong>{{ p.title }}</strong>
            <span class="dim">{{ p.description }}</span>
          </a>
        </div>
      </section>

      <!-- 标题栏 -->
      <footer class="title-block">
        <div class="tb-cell wide">
          <small>项目名称</small>
          <strong>Ryan100c 的博客</strong>
        </div>
        <div class="tb-cell"><small>设计</small>Ryan100c</div>
        <div class="tb-cell"><small>版次</small>{{ rev }}</div>
        <div class="tb-cell"><small>材料</small>VuePress + Plume</div>
        <div class="tb-cell links">
          <small>联络</small>
          <span>
            <a v-for="s in socials" :key="s.link" :href="s.link" target="_blank" rel="noopener">{{ s.text }}</a>
          </span>
        </div>
        <div class="tb-cell"><small>图号</small>RY-100C-HOME</div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.bp-page {
  --bg: #1d1544;
  --grid: rgba(190, 170, 255, 0.07);
  --grid-major: rgba(190, 170, 255, 0.14);
  --line: rgba(214, 200, 255, 0.55);
  --fg: #ebe4ff;
  --dim: rgba(220, 208, 255, 0.6);
  --accent: #c7b3ff;
  --hot: #ffd36e;
  min-height: 100vh;
  padding: 28px 16px;
  color: var(--fg);
  font-family: 'IBM Plex Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background-color: var(--bg);
  background-image:
    linear-gradient(var(--grid-major) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-major) 1px, transparent 1px),
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
}
.mono, .fig, .bp-head, .title-block, .bom th { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
.dim { color: var(--dim); }

/* 图框 + 角标 */
.sheet {
  position: relative;
  max-width: 1160px;
  margin: 0 auto;
  border: 1.5px solid var(--line);
  outline: 1px solid var(--grid-major);
  outline-offset: 8px;
  padding: 0 32px;
}
.sheet::before, .sheet::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border: 2px solid var(--hot);
}
.sheet::before { top: -10px; left: -10px; border-right: none; border-bottom: none; }
.sheet::after { bottom: -10px; right: -10px; border-left: none; border-top: none; }

.bp-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 13px;
  letter-spacing: 0.08em;
}
.logo { display: flex; align-items: center; gap: 10px; }
.logo em { font-style: normal; color: var(--accent); }
.mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1.5px solid var(--hot);
  color: var(--hot);
  font-weight: 700;
}
.bp-head nav { display: flex; gap: 22px; }
.bp-head nav a { color: var(--fg); text-decoration: none; }
.bp-head nav small { color: var(--hot); margin-right: 4px; }
.bp-head nav a:hover { color: var(--accent); }

.fig { font-size: 12px; letter-spacing: 0.15em; color: var(--hot); margin: 0 0 12px; }

.hero {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 40px;
  align-items: center;
  padding: 56px 0 48px;
  border-bottom: 1px dashed var(--line);
}
.hero h1 {
  font-size: clamp(38px, 6vw, 72px);
  line-height: 1.15;
  font-weight: 800;
  margin: 0 0 18px;
  border: none;
  color: var(--fg);
}
.hero h1 span {
  color: transparent;
  -webkit-text-stroke: 1.5px var(--accent);
}
.lede { color: var(--dim); font-size: 16px; line-height: 1.8; margin: 0; }
.dim-line {
  position: relative;
  margin: 26px 0;
  border-top: 1px solid var(--line);
  max-width: 440px;
}
.dim-line::before, .dim-line::after {
  content: '';
  position: absolute;
  top: -7px;
  width: 1px;
  height: 13px;
  background: var(--line);
}
.dim-line::before { left: 0; }
.dim-line::after { right: 0; }
.dim-line span {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg);
  padding: 0 8px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  white-space: nowrap;
  color: var(--accent);
}
.actions { display: flex; gap: 12px; }
.btn {
  padding: 10px 20px;
  border: 1.5px solid var(--accent);
  color: var(--fg);
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s;
}
.btn:hover { background: rgba(199, 179, 255, 0.15); }
.btn.solid { background: var(--accent); color: var(--bg); font-weight: 700; }
.btn.solid:hover { background: var(--fg); }

.hero-fig { margin: 0; color: var(--accent); }
.hero-fig svg { width: 100%; height: auto; overflow: visible; }
.cube polygon { stroke: var(--fg); stroke-width: 1.5; }
.cube .top { fill: rgba(199, 179, 255, 0.28); }
.cube .left { fill: rgba(199, 179, 255, 0.14); }
.cube .right { fill: rgba(199, 179, 255, 0.06); }
.cube .hidden { stroke: var(--line); stroke-dasharray: 4 4; }
.arrows line { stroke: var(--hot); stroke-width: 1.5; color: var(--hot); }
.arrows marker path, #bp-arrow path { fill: var(--hot); }
.arrows text, .center-label { fill: var(--fg); font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
.center-label { fill: var(--hot); font-size: 12px; }
.hero-fig figcaption { text-align: center; font-size: 12px; color: var(--dim); font-family: 'IBM Plex Mono', monospace; margin-top: 8px; }

.block { padding: 36px 0; border-bottom: 1px dashed var(--line); }
.block-head { display: flex; justify-content: space-between; align-items: baseline; }
.more { color: var(--accent); text-decoration: none; font-size: 13px; }

.bom { width: 100%; border-collapse: collapse; display: table; margin: 0; font-size: 14px; }
.bom th, .bom td { border: 1px solid var(--line); padding: 8px 12px; text-align: left; background: transparent; }
.bom tr { background: transparent !important; border: none; }
.bom th { font-weight: 500; font-size: 12px; letter-spacing: 0.1em; color: var(--accent); background: rgba(199, 179, 255, 0.06); }
.bom td a { color: var(--fg); text-decoration: none; }
.bom tbody tr:hover td { background: rgba(255, 211, 110, 0.06); }
.bom tbody tr:hover a { color: var(--hot); }

.parts { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
.part {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--line);
  color: var(--fg);
  text-decoration: none;
  font-size: 14px;
}
.part:hover { border-color: var(--hot); }
.callout {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1.5px solid var(--hot);
  background: var(--bg);
  color: var(--hot);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
}
.part-img { aspect-ratio: 16 / 9; border: 1px dashed var(--line); overflow: hidden; }
.part-img img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) sepia(0.5) hue-rotate(210deg) saturate(1.6) brightness(0.9); transition: filter 0.3s; }
.part:hover .part-img img { filter: none; }
.part .dim { font-size: 13px; }
.part strong { overflow-wrap: anywhere; }

.title-block {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.4fr;
  margin: 32px 0 32px auto;
  max-width: 760px;
  border: 1.5px solid var(--line);
  font-size: 13px;
}
.tb-cell { padding: 8px 12px; border: 0.5px solid var(--line); display: flex; flex-direction: column; gap: 2px; }
.tb-cell small { font-size: 10px; letter-spacing: 0.15em; color: var(--dim); }
.tb-cell.wide { grid-row: span 2; justify-content: center; }
.tb-cell.wide strong { font-size: 18px; font-family: 'IBM Plex Sans', 'PingFang SC', sans-serif; }
.tb-cell.links { grid-column: span 2; }
.tb-cell.links span { display: flex; gap: 12px; flex-wrap: wrap; }
.tb-cell a { color: var(--accent); text-decoration: none; }
.tb-cell a:hover { color: var(--hot); }

@media (max-width: 860px) {
  .sheet { padding: 0 16px; }
  .hero { grid-template-columns: 1fr; padding-top: 36px; }
  .hide-sm { display: none; }
  .bom th, .bom td { padding: 8px; }
  .bom td.mono { white-space: nowrap; font-size: 12px; }
  .parts { grid-template-columns: 1fr 1fr; gap: 16px; }
  .part { padding: 10px; font-size: 13px; }
  .title-block { grid-template-columns: 1fr 1fr; }
  .tb-cell.wide { grid-row: auto; grid-column: span 2; }
  .bp-head nav { gap: 14px; }
}
</style>
