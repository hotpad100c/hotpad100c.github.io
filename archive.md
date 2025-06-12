---
layout: page
title: Blog Archive
---
<style>
  .post-list { list-style: none; }
  .post-item { border-left: 4px solid blue; padding: 10px; margin: 10px 0; }
</style>

<div class="archive">
  {% if site.tags.size > 0 %}
    {% for tag in site.tags %}
      <h3 class="tag-title">{{ tag[0] }}</h3>
      <ul class="post-list">
        {% for post in tag[1] %}
        <blockquote>
          <li class="post-item">
            <a href="{{ post.url }}">
                   <span class="post-date">{{ post.date | date: "%B %Y" }}</span> - 
                   <span class="post-title">{{ post.title }}</span>
            </a>
          </li>
        </blockquote>
        {% endfor %}
      </ul>
    {% endfor %}
  {% else %}
    <p>暂无标签或文章。</p>
  {% endif %}
</div>
