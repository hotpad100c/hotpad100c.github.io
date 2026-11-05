<script setup lang="ts">
/**
 * 技能图标：一排方正小格，每格一个单色图标 + 名称。
 *
 *   <SkillIcons list="csharp,java,python,javascript,blender,idea,unity" />
 *
 * list 里的名字见下面的 KNOWN；不在其中的名字会被当作 Iconify 图标名直接使用，
 * 例如 list="devicon-plain:rust:Rust"（图标名:显示名）。
 */
import { computed } from 'vue'

const props = defineProps<{ list: string }>()

const KNOWN: Record<string, [icon: string, label: string]> = {
  csharp: ['devicon-plain:csharp', 'C#'],
  java: ['devicon-plain:java', 'Java'],
  python: ['devicon-plain:python', 'Python'],
  javascript: ['devicon-plain:javascript', 'JavaScript'],
  blender: ['simple-icons:blender', 'Blender'],
  idea: ['devicon-plain:intellij', 'IntelliJ'],
  unity: ['devicon-plain:unity', 'Unity'],
}

const items = computed(() => props.list.split(',').map(s => s.trim()).filter(Boolean).map((s) => {
  if (KNOWN[s]) return { icon: KNOWN[s][0], label: KNOWN[s][1] }
  const parts = s.split(':')
  return { icon: parts.slice(0, 2).join(':'), label: parts[2] || parts[1] || s }
}))
</script>

<template>
  <ul class="sl-skills">
    <li v-for="it in items" :key="it.icon" :title="it.label">
      <Icon :name="it.icon" class="sl-skill-icon" />
      <span>{{ it.label }}</span>
    </li>
  </ul>
</template>

<style scoped>
.sl-skills {
  list-style: none;
  margin: 4px 0 0 !important;
  padding: 0 !important;
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  background: var(--sl-line);
  border: 1px solid var(--sl-line);
}
.sl-skills li {
  margin: 0 !important;
  flex: 1 1 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 6px 10px;
  background: var(--sl-panel);
  transition: background 0.2s;
}
.sl-skills li:hover { background: var(--sl-tile-hover); }
.sl-skill-icon, .sl-skills :deep(svg) { width: 28px; height: 28px; font-size: 28px; color: var(--sl-fg-2); transition: color 0.2s; }
.sl-skills li:hover :deep(svg), .sl-skills li:hover .sl-skill-icon { color: var(--sl-accent); }
.sl-skills span { font-family: var(--sl-mono); font-size: 11px; color: var(--sl-fg-2); }
</style>
