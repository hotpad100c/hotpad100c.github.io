<template>
  <div class="masonry-page">
    <!-- 按分类显示 -->
    <div 
      v-for="group in navData" 
      :key="group.category"
      class="masonry-group"
    >
      <h2 class="masonry-group-title">{{ group.category }}</h2>

      <div class="masonry-container">
        <div 
          v-for="item in group.items"
          :key="item.id"
          class="masonry-card"
          @click="toggleItem(item)"
        >
          <!-- 封面 -->
          <img 
            v-if="item.cover" 
            :src="item.cover" 
            class="masonry-cover" 
            loading="lazy" 
            :alt="item.title"
          />

          <!-- 基本信息 -->
          <div class="masonry-info">
            <h3>{{ item.title }}</h3>
            <p class="desc">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 居中弹窗 -->
    <transition name="fade">
      <div 
        v-if="activeItem" 
        class="masonry-overlay" 
        @click.self="activeItem = null"
      >
        <div class="masonry-popup">
          <img 
            v-if="activeItem.cover" 
            :src="activeItem.cover" 
            class="popup-cover" 
            loading="lazy"
          />
          <h3>{{ activeItem.title }}</h3>
          <p>{{ activeItem.detail }}</p>
          <button class="view-btn" @click.stop="openLink(activeItem.url)">
            看一看
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { navData } from '../../projects/data.js'

const activeItem = ref(null)

function toggleItem(item) {
  activeItem.value = activeItem.value?.id === item.id ? null : item
}

function openLink(url) {
  window.open(url, '_blank', 'noopener noreferrer')
}
</script>

<style scoped>
/* ====== 布局基础 ====== */
.masonry-page {
  max-width: 1800px;
  margin: 0 auto;
  padding: 1rem;
}

.masonry-group {
  margin-bottom: 2.5rem;
}

.masonry-group-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 1rem;
  padding-bottom: 0.4rem;
}

.masonry-container {
  column-count: 4;
  column-gap: 1rem;
}
@media (max-width: 1200px) {
  .masonry-container { column-count: 3; }
}
@media (max-width: 768px) {
  .masonry-container { column-count: 2; }
}
@media (max-width: 480px) {
  .masonry-container { column-count: 1; }
}

/* ====== 卡片样式 ====== */
.masonry-card {
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  margin-bottom: 1rem;
  display: inline-block;
  width: 100%;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
}
.masonry-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.12);
}

/* ====== 封面 ====== */
.masonry-cover {
  width: 100%;
  display: block;
  object-fit: cover;
  max-height: 200px;
  border-bottom: 1px solid var(--vp-c-divider);
}

/* ====== 标题与简介 ====== */
.masonry-info {
  padding: 0.8rem 1rem;
}
.masonry-info h3 {
  font-size: 1.1rem;
  margin-bottom: 0.4rem;
  color: var(--vp-c-text-1);
}
.masonry-info .desc {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

/* ====== 弹窗样式 ====== */
.masonry-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  animation: fadeIn 0.25s ease;
}

.masonry-popup {
  background: var(--vp-c-bg);
  border-radius: 12px;
  padding: 1.5rem;
  width: 500px;
  max-width: 90%;
  max-height: 85%;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  animation: scaleIn 0.25s ease;
}

.popup-cover {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 1rem;
}

/* ====== 按钮 ====== */
.view-btn {
  margin-top: 1rem;
  padding: 0.5rem 1.2rem;
  border: none;
  background-color: var(--vp-c-brand);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
.view-btn:hover {
  background-color: var(--vp-c-brand-darker);
}

/* ====== 动画 ====== */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@keyframes fadeIn {
  from { opacity: 0; } 
  to { opacity: 1; }
}
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>

<!--
修改自 https://doc.zxbhello.top/nav/guide/
许可证：署名-非商业性-相同方式共享 4.0 国际 (CC-BY-NC-SA-4.0)
-->
