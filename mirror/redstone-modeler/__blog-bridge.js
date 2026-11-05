/*
 * 博客镜像桥接脚本：由 scripts/mirror.mjs 注入到每个镜像页面的末尾。
 *
 *  - <html> 加上 class="blog-mirror"（在博客里以 iframe 打开时再加 "blog-mirror-framed"），
 *    风格覆盖 CSS 用它来区分。
 *  - 深浅色：在博客里时跟随博客页面实时切换；单独打开时读取博客保存的设置
 *    （localStorage 的 vuepress-theme-appearance），没有则跟随系统。
 *  - 在博客里时，指向其它网站的链接在新标签页打开（很多网站不允许被嵌在 iframe 里）。
 */
(function () {
  var root = document.documentElement
  var parentDoc = null
  try {
    if (window.parent !== window && window.parent.document) parentDoc = window.parent.document
  } catch (e) { /* 跨域：不在博客里 */ }

  root.classList.add('blog-mirror')
  if (parentDoc) root.classList.add('blog-mirror-framed')

  function wanted() {
    if (parentDoc) return parentDoc.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
    var v = 'auto'
    try { v = localStorage.getItem('vuepress-theme-appearance') || 'auto' } catch (e) {}
    if (v === 'dark' || v === 'light') return v
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  function apply() {
    var t = wanted()
    if (root.dataset.theme !== t) root.dataset.theme = t
    root.style.colorScheme = t
  }
  apply()
  // 页面自己的主题脚本改了 data-theme 时改回来
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  if (parentDoc) {
    new MutationObserver(apply).observe(parentDoc.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  } else {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply)
  }

  if (parentDoc) {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null
      if (!a || a.target) return
      var url
      try { url = new URL(a.href, location.href) } catch (err) { return }
      if (url.origin !== location.origin && /^https?:$/.test(url.protocol)) {
        a.target = '_blank'
        a.rel = 'noopener'
      }
    }, true)
  }
})()
