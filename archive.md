---
layout: page
title: Blog Archive
---
<link rel="stylesheet" href="/css/main.css">
<style>
.tag-title {
  font-size: 1.5em;
  margin-top: 2rem;
  color: #333;
  border-bottom: 2px solid #7a4cb5;
  padding-bottom: 0.5rem;
}

.post-list {
  list-style: none;
  padding: 0;
}

.post-item {
  background: #f9f9f9;
  border-left: 4px solid #ad7feb;
  margin: 1rem 0;
  padding: 1rem;
  position: relative;
  transition: background 0.3s ease;
}

.post-item:hover {
  background: #e9ecef;
}

.post-item a {
  text-decoration: none;
  color: #333;
  display: block;
}

.post-date {
  color: #6c757d;
  font-size: 0.9em;
}

.post-title {
  font-weight: bold;
}


</style>

<div class="archive">
  {% if site.tags.size > 0 %}
    {% for tag in site.tags %}
      <h3 class="tag-title">{{ tag[0] }}</h3>
      <ul class="post-list">
        {% for post in tag[1] %}
          <li class="post-item">
            <a href="{{ post.url }}">
                   <span class="post-date">{{ post.date | date: "%B %Y" }}</span> 
              
                   <span class="post-title">{{ post.title }}</span>
            </a>
          </li>
        {% endfor %}
      </ul>
    {% endfor %}
  {% else %}
    <p>暂无标签或文章。</p>
  {% endif %}
</div>
