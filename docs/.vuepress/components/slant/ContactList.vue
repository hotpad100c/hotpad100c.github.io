<script setup lang="ts">
/**
 * 联系方式列表，每行一个，右侧有「复制」按钮。
 *
 *   <ContactList :items="[
 *     { label: '邮箱', value: 'someone@example.com', href: 'mailto:someone@example.com' },
 *     { label: 'QQ', value: '12345' },
 *   ]" />
 *
 * href 可选；有 href 时数值本身可以点击。
 */
import { ref } from 'vue'

defineProps<{ items: { label: string, value: string, href?: string }[] }>()

const copied = ref('')
async function copy(value: string, el: EventTarget | null) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    // 剪贴板不可用时，选中文字让用户自己复制
    const node = (el as HTMLElement | null)?.closest('li')?.querySelector('.sl-contact-value')
    if (node) {
      const range = document.createRange()
      range.selectNodeContents(node)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }
  copied.value = value
  setTimeout(() => { if (copied.value === value) copied.value = '' }, 1500)
}
</script>

<template>
  <ul class="sl-contacts">
    <li v-for="it in items" :key="it.label">
      <span class="sl-contact-label">{{ it.label }}</span>
      <a v-if="it.href" :href="it.href" target="_blank" rel="noopener" class="sl-contact-value">{{ it.value }}</a>
      <span v-else class="sl-contact-value">{{ it.value }}</span>
      <button type="button" class="sl-copy" @click="copy(it.value, $event.currentTarget)">
        {{ copied === it.value ? '已复制' : '复制' }}
      </button>
    </li>
  </ul>
</template>

<style scoped>
.sl-contacts { list-style: none; margin: 4px 0 0 !important; padding: 0 !important; }
.sl-contacts li {
  display: grid;
  grid-template-columns: 4.5em minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin: 0 !important;
  padding: 8px 0;
  border-top: 1px solid var(--sl-line);
}
.sl-contact-label { font-family: var(--sl-mono); font-size: 11px; letter-spacing: 0.1em; color: var(--sl-accent); }
.sl-contact-value { font-family: var(--sl-mono); font-size: 13px; color: var(--sl-fg) !important; overflow-wrap: anywhere; text-decoration: none !important; }
a.sl-contact-value:hover { color: var(--sl-accent) !important; }
.sl-copy {
  font-family: var(--sl-mono);
  font-size: 11px;
  padding: 3px 12px;
  color: var(--sl-fg-2);
  background: var(--sl-tile);
  border: 1px solid var(--sl-line);
  cursor: pointer;
  clip-path: polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%);
}
.sl-copy:hover { color: var(--sl-fg); border-color: var(--sl-accent); }
.sl-copy:focus-visible { outline: 2px solid var(--sl-accent); outline-offset: 2px; }
</style>
