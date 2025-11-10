<template>
  <div class="m-nav-container">
    <div v-for="group in navData" :key="group.category" class="m-nav-group">
      <h2>{{ group.category }}</h2>
      <div class="m-nav-links">
        <a 
          v-for="item in group.items" 
          :key="item.id"
          :href="item.url" 
          class="m-nav-link" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <div 
            v-if="item.iconType && item.iconType !== 'none' && item.icon && item.icon !== 'none'"
            class="m-nav-link-icon" 
            :class="{ 
              'no-border': item.showIconBorder === false 
            }"
          >
            <span 
              v-if="item.iconType === 'iconify'" 
              class="iconify" 
              :data-icon="item.icon"
            ></span>
            <img 
              v-else-if="item.iconType === 'image'" 
              :src="item.icon" 
              :alt="item.title" 
              loading="lazy" 
            />
          </div>
          <div class="m-nav-link-content">
            <div class="m-nav-link-title">{{ item.title }}</div>
            <div class="m-nav-link-desc">{{ item.description }}</div>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { navData } from '../../nav/data.js'
</script>

<style>
/* 为导航页面添加一些基础样式 */
/* 设置最大宽度为100%，内边距为0 */
.m-nav-layout {
  max-width: 100%;
  padding: 0;
}

/* 容器的最大宽度设置为100% */
.m-nav-layout .container {
  max-width: 100%;
}

/* 隐藏页面中的标题元素 */
.m-nav-layout .page-title {
  display: none;
}

/* 导航容器样式 */
/* 设置最大宽度、居中显示、内边距和左右边距 */
.m-nav-container {
  max-width: 1800px;
  margin: 0 auto;
  padding: 0 0.5rem; /* 减小边距到0.5rem */
  margin-left: 4rem; /* 添加左边距 */
  margin-right: 5; /* 右边距为0 */
}

/* 导航分组样式 */
/* 设置底部外边距 */
.m-nav-group {
  margin-bottom: 2rem;
}

/* 导航分组标题样式 */
/* 设置字体大小、粗细、底部外边距、颜色、下边框和底部内边距 */
.m-nav-group h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--vp-c-text-1);
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.5rem;
}

/* 导航链接容器 */
/* 使用网格布局，设置列数、间距 */
.m-nav-links {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.8rem; /* 导航项之间的间距 */
}

/* 单个导航链接样式 */
/* 设置为弹性布局、对齐方式、内边距、边框、圆角、去除下划线、过渡效果 */
.m-nav-link {
  display: flex;
  align-items: center;
  padding: 0.6rem 0.6rem 0.6rem 0.6rem; /* 上 右 下 左 - 统一内边距 */
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none !important;
  transition: all 0.2s ease;
}

/* 导航链接悬停效果 */
/* 改变边框颜色、添加阴影、向上移动 */
.m-nav-link:hover {
  border-color: var(--vp-c-brand);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* 导航链接图标容器 */
/* 设置宽度、高度、不收缩、右边距、对齐方式 */
/* 添加边框以增强视觉效果 */
.m-nav-link-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  margin-right: 0.8rem; /* 图标与文字之间的间距 */
  margin-left: 0.3rem; /* 图标与左边框的距离 */
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

/* 为不显示边框的图标移除边框样式 */
.m-nav-link-icon.no-border {
  border: none;
}

/* 导航链接图标图片样式 */
/* 设置宽度、高度、适应方式 */
.m-nav-link-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 添加 Iconify 图标支持 */
/* 设置 Iconify 图标的宽度、高度和显示方式 */
.m-nav-link-icon .iconify {
  width: 24px;
  height: 24px;
  display: inline-block;
}

/* 确保所有文本元素都没有下划线 */
.m-nav-link-content,
.m-nav-link-title,
.m-nav-link-desc {
  text-decoration: none;
}

/* 导航链接内容区域 */
/* 设置弹性增长 */
.m-nav-link-content {
  flex: 1;
}

/* 导航链接标题样式 */
/* 设置字体大小、粗细、颜色、底部外边距 */
.m-nav-link-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  margin-bottom: 0.25rem;
}

/* 导航链接描述样式 */
/* 设置字体大小、颜色 */
.m-nav-link-desc {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

/* 响应式设计 - 平板及以下尺寸 */
@media (max-width: 768px) {
  /* 调整导航容器内边距和左边距 */
  .m-nav-container {
    padding: 0 0.5rem;
    margin-left: 0.5rem;
  }
  
  /* 调整导航链接网格列数和间距 */
  .m-nav-links {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }
}

/* 响应式设计 - 手机尺寸 */
@media (max-width: 480px) {
  /* 进一步减小导航容器内边距和左边距 */
  .m-nav-container {
    padding: 0 0.25rem;
    margin-left: 0.25rem;
  }
  
  /* 在手机上使用单列布局，减小间距 */
  .m-nav-links {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  /* 减小导航链接内边距 */
  .m-nav-link {
    padding: 0.75rem;
  }
}
</style>
<!--
修改自
https://doc.zxbhello.top/nav/guide/

许可证：
署名-非商业性-相同方式共享 4.0 国际 (CC-BY-NC-SA-4.0)
-->
