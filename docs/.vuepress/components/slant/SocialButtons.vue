<script setup lang="ts">
/**
 * 社交链接小按钮，内容与首页相同（docs/.vuepress/components/home/homeConfig.ts 的 socials）。
 *
 *   <SocialButtons />
 */
import { socials } from '../home/homeConfig'
</script>

<template>
  <div class="sl-socials" :style="{ '--n': socials.length }">
    <a
      v-for="s in socials"
      :key="s.link"
      :href="s.link"
      target="_blank"
      rel="noopener"
      :style="s.color ? { '--brand-c': s.color } : undefined"
    >
      <Icon :name="s.icon" class="sl-social-icon" />
      <span>{{ s.text }}</span>
    </a>
  </div>
</template>

<style scoped>
.sl-socials {
  display: grid;
  grid-template-columns: repeat(var(--n, 4), minmax(0, 1fr));
  gap: 1px;
  margin-top: 4px;
  background: var(--sl-line);
  border: 1px solid var(--sl-line);
}
.sl-socials a {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 6px 10px;
  background: var(--sl-panel);
  color: var(--sl-fg-2) !important;
  text-decoration: none !important;
  transition: background 0.2s;
}
.sl-socials a:hover { background: var(--sl-tile-hover); }
.sl-social-icon, .sl-socials :deep(svg) { width: 24px; height: 24px; font-size: 24px; transition: color 0.2s; }
.sl-socials a:hover :deep(svg), .sl-socials a:hover .sl-social-icon { color: var(--brand-c, var(--sl-fg)); }
.sl-socials span { font-family: var(--sl-mono); font-size: 11px; }
@media (max-width: 400px) {
  .sl-socials { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
