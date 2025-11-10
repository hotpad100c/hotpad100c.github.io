<template>
  <div class="masonry-page">
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

          <!-- 展开详情 -->
          <transition name="fade">
            <div 
              v-if="expandedItem === item"
              class="masonry-detail"
            >
              <p>{{ item.detail }}</p>
              <button 
                class="view-btn" 
                @click.stop="openLink(item.url)"
              >
                看一看
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { navData } from '../../projects/data.js'

const expandedItem = ref(null)

function toggleItem(item) {
  expandedItem.value = expandedItem.value === item ? null : item
}

function openLink(url) {
  window.open(url, '_blank', 'noopener noreferrer')
}
</script>

<style scoped>
/* 整体布局 */
.masonry-page {
  max-width: 1800px;
  margin: 0 auto;
  padding: 1rem;
}

/* 每个分组 */
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

/* Masonry 瀑布流布局 */
.masonry-container {
  column-count: 4;
  column-gap: 1rem;
}

@media (max-width: 1200px) {
  .masonry-container {
    column-count: 3;
  }
}
@media (max-width: 768px) {
  .masonry-container {
    column-count: 2;
  }
}
@media (max-width: 480px) {
  .masonry-container {
    column-count: 1;
  }
}

/* 单个卡片 */
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

/* 封面图 */
.masonry-cover {
  width: 100%;
  display: block;
  object-fit: cover;
  max-height: 200px;
  border-bottom: 1px solid var(--vp-c-divider);
}

/* 标题与简介 */
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

/* 展开详情 */
.masonry-detail {
  padding: 0.8rem 1rem 1rem;
  background: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-divider);
  animation: fadeIn 0.25s ease;
}
.masonry-detail p {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

/* 按钮 */
.view-btn {
  padding: 0.4rem 1rem;
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

/* 动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

<!--
修改自
https://doc.zxbhello.top/nav/guide/

许可证：
署名-非商业性-相同方式共享 4.0 国际 (CC-BY-NC-SA-4.0)
-->
