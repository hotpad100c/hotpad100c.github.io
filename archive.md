---
layout: page
title: Blog Archive
---

<div class="archive">
  {% if site.tags.size > 0 %}
    {% for tag in site.tags %}
      <h3 class="tag-title">{{ tag[0] }}</h3>
      <ul class="post-list">
        {% for post in tag[1] %}
          <li class="post-item">
            <a href="{{ post.url }}">
              <span class="post-date">{{ post.date | date: "%B %Y" }}</span> - 
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


{% for tag in site.tags %}
  <h3>{{ tag[0] }}</h3>
  <ul>
    {% for post in tag[1] %}
      <li><a href="{{ post.url }}">{{ post.date | date: "%B %Y" }} - {{ post.title }}</a></li>
    {% endfor %}
  </ul>
{% endfor %}
