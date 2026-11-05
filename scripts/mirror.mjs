#!/usr/bin/env node
/**
 * 构建前抓取「镜像站点」，放进 docs/.vuepress/mirror-dist/<name>/。
 * 构建后由 config.ts 里的插件复制到 dist/mirror/<name>/（开发服务器直接提供这个目录），
 * 不放进 public/：打包器会压缩 public 里的 JS / CSS，镜像文件应当原样保留。
 * 被镜像站点的代码不进入本仓库（该目录已在 .gitignore 中），只存在于构建结果里。
 *
 * 配置：docs/.vuepress/mirrors.json
 *   [{
 *     "name": "modsite",                       镜像名，决定地址 /mirror/<name>/
 *     "url": "https://example.pages.dev/",     原站地址
 *     "entries": ["index.html", "mod.html"],   入口页面
 *     "extra": ["model.json"],                 （可选）自动发现不了的文件，例如脚本里拼接出来的路径
 *     "follow": ["blobs.json"],                （可选）这些 JSON 里出现的文件名也一并抓取
 *     "scanStrings": true                      （可选）代码里所有「像相对路径文件」的字符串也抓取，
 *                                              例如脚本数据里的 src: "img/a.png"（找不到时只警告）
 *   }]
 *
 * 静态快照模式（"mode": "static"）：用于需要服务器才能运行的网站（例如 Next.js），只保存
 * 服务器渲染出来的页面内容，不保留脚本。
 *   {
 *     "name": "gtmc", "url": "https://www.techmc.wiki/", "mode": "static",
 *     "entries": ["en/articles/preface"],      起始页面（不带扩展名的地址）
 *     "crawl": ["en/articles/"],               在这些路径下的页面会被跟进并一起保存
 *     "credit": "…"                            （可选）插在每页底部的署名 HTML
 *   }
 *   页面保存为 <路径>/index.html；以 / 开头的地址改写到 /mirror/<name>/ 下；
 *   不在 crawl 范围内的站内页面改为指向原站的完整地址。
 *
 * 做法：
 *   1. 从 entries 里的每个 HTML 开始，递归抓取它引用的同源相对路径文件
 *      （src / href / import / fetch("./…") / url(…) 等）。
 *   2. 在每个 HTML 的 </body> 前插入（放在最后，保证覆盖样式排在原样式之后）：
 *        - mirrors/<name>.css（博客风格覆盖，可选）
 *        - mirrors/_bridge.js（与博客同步深浅色、在 iframe 中隐藏重复的页头等）
 *   3. 外部绝对地址（下载链接、图片 CDN、翻译接口等）保持原样。
 *
 * 用法：node scripts/mirror.mjs                抓取全部（pnpm docs:build 会先运行它）
 *       node scripts/mirror.mjs modsite        只抓取一个
 *       node scripts/mirror.mjs --if-missing   只抓取还没有抓过的（pnpm docs:dev 会先运行它）
 * 任何必需文件抓取失败都会以非零退出码结束，避免部署出残缺的镜像。
 */
import { mkdir, readFile, rm, writeFile, copyFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VP = path.join(ROOT, 'docs/.vuepress')
const OUT = path.join(VP, 'mirror-dist')
const MIRRORS_DIR = path.join(VP, 'mirrors')

const TEXT_EXT = /\.(html?|js|mjs|css|json|txt|svg|webmanifest)$/i
// scanStrings：引号里的相对路径文件名（至少带一级目录，避免把普通单词当成文件）
const STRING_FILE_RE = /["'`]((?:\.\/)?[\w.-]+(?:\/[\w.-]+)+\.(?:png|jpe?g|webp|gif|svg|avif|mp4|webm|mp3|ogg|wav|json|txt|bin|wasm|glb|gltf|ttf|woff2?))["'`]/g
// 在文本里寻找的相对路径引用。
// rel: 'file' 相对于引用它的文件解析（import、CSS url()、new URL(x, import.meta.url)）；
//      'doc'  相对于页面解析（fetch()、new Worker() 等浏览器按页面地址解析的路径；HTML 里两者相同）。
const REF_PATTERNS = [
  { re: /\b(?:src|href|data-src|poster)\s*=\s*["']([^"'#]+)["']/gi, rel: 'file' },
  { re: /\bimport\s*(?:[\w*{}\s,]+from\s*)?["']([^"']+)["']/g, rel: 'file' },
  { re: /\bimport\(\s*["']([^"']+)["']\s*\)/g, rel: 'file' },
  { re: /\burl\(\s*["']?([^"')]+)["']?\s*\)/g, rel: 'file' },
  { re: /\bnew\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g, rel: 'file' },
  { re: /\bfetch\(\s*["'`]([^"'`$]+)["'`]/g, rel: 'doc' },
  { re: /\bnew\s+(?:Shared)?Worker\(\s*["']([^"']+)["']/g, rel: 'doc' },
]

function isLocalRef(ref) {
  if (!ref || /^(?:[a-z]+:|\/\/|#|data:|mailto:|javascript:)/i.test(ref)) return false
  if (ref.includes('${') || ref.includes('+')) return false
  return true
}

/** 把引用解析为站内相对路径（相对站点根目录），无效则返回 null */
function resolveRef(fromFile, ref) {
  const clean = ref.split('#')[0].split('?')[0].trim()
  if (!clean || clean === './' || clean === '.' || clean.endsWith('/')) return null
  const base = clean.startsWith('/') ? clean.slice(1) : path.posix.join(path.posix.dirname(fromFile), clean)
  const norm = path.posix.normalize(base)
  if (norm.startsWith('..')) return null
  if (!/\.[a-z0-9]+$/i.test(norm)) return null // 只抓带扩展名的文件
  return norm
}

async function fetchFile(siteUrl, rel) {
  const url = new URL(rel, siteUrl).href
  const res = await fetch(url, { headers: { 'user-agent': 'blog-mirror/1.0' } })
  if (!res.ok) return { ok: false, status: res.status, url }
  const type = res.headers.get('content-type') || ''
  const buf = Buffer.from(await res.arrayBuffer())
  // 很多静态托管会把不存在的路径回退成首页 HTML，这里识别出来当作不存在
  if (!/\.html?$/i.test(rel) && type.includes('text/html')) return { ok: false, status: 'html-fallback', url }
  return { ok: true, buf, type, url }
}

async function exists(p) { try { await access(p); return true } catch { return false } }

async function mirrorOne(site) {
  const siteUrl = site.url.endsWith('/') ? site.url : site.url + '/'
  const dest = path.join(OUT, site.name)
  await rm(dest, { recursive: true, force: true })
  await mkdir(dest, { recursive: true })

  const queue = [...(site.entries || ['index.html']), ...(site.extra || [])]
  const required = new Set(queue)
  const follow = new Set(site.follow || [])
  const optional = new Set()
  // 页面所在目录下的一个虚拟文件名，用来解析「相对于页面」的路径
  const docBase = path.posix.join(path.posix.dirname((site.entries || ['index.html'])[0]), '__page__')
  const seen = new Set()
  const files = []
  const missing = []

  while (queue.length) {
    const rel = queue.shift()
    if (seen.has(rel)) continue
    seen.add(rel)
    const r = await fetchFile(siteUrl, rel)
    if (!r.ok) { missing.push(`${rel} (${r.status})`); continue }
    let buf = r.buf
    if (TEXT_EXT.test(rel)) {
      const text = buf.toString('utf8')
      for (const { re, rel: mode } of REF_PATTERNS) {
        re.lastIndex = 0
        for (const m of text.matchAll(re)) {
          if (!isLocalRef(m[1])) continue
          // 'doc' 类引用按入口页面所在目录解析（入口页面都在站点根目录时即根目录）
          const next = resolveRef(mode === 'doc' ? docBase : rel, m[1])
          if (next && !seen.has(next)) queue.push(next)
        }
      }
      if (site.scanStrings && /\.(html?|m?js)$/i.test(rel)) {
        STRING_FILE_RE.lastIndex = 0
        for (const m of text.matchAll(STRING_FILE_RE)) {
          const next = resolveRef(docBase, m[1])
          if (next && !seen.has(next)) { queue.push(next); optional.add(next) }
        }
      }
      if (follow.has(rel)) {
        for (const name of jsonFileNames(JSON.parse(text))) {
          const next = resolveRef(rel, name)
          if (next && !seen.has(next)) { queue.push(next); required.add(next) }
        }
      }
      if (/\.html?$/i.test(rel)) buf = Buffer.from(injectTags(text, rel), 'utf8')
    }
    const out = path.join(dest, rel)
    await mkdir(path.dirname(out), { recursive: true })
    await writeFile(out, buf)
    files.push(rel)
  }

  // 博客风格覆盖与桥接脚本
  const css = path.join(MIRRORS_DIR, `${site.name}.css`)
  await copyFile(path.join(MIRRORS_DIR, '_bridge.js'), path.join(dest, '__blog-bridge.js'))
  if (await exists(css)) await copyFile(css, path.join(dest, '__blog-theme.css'))
  else await writeFile(path.join(dest, '__blog-theme.css'), '/* 没有为该站点编写风格覆盖 */\n')

  const missingRequired = missing.filter(m => required.has(m.split(' ')[0]))
  console.log(`[mirror] ${site.name}: ${files.length} 个文件 ← ${siteUrl}`)
  for (const f of files) console.log(`  + ${f}`)
  for (const m of missing) console.log(`  ! 未找到 ${m}`)
  if (missingRequired.length) throw new Error(`${site.name} 的入口页面抓取失败：${missingRequired.join(', ')}`)
  // 被脚本 import 的文件缺失会导致页面无法运行，同样视为失败
  const missingCode = missing.filter(m => /\.(m?js|css|json)\b/.test(m) && !optional.has(m.split(' ')[0]))
  if (missingCode.length) throw new Error(`${site.name} 有脚本 / 样式 / 数据文件抓取失败：${missingCode.join(', ')}`)
}

/** JSON 里所有「像文件名」的字符串（带扩展名、不是网址） */
function jsonFileNames(value, out = []) {
  if (typeof value === 'string') {
    if (isLocalRef(value) && /^[\w./-]+\.[a-z0-9]+$/i.test(value)) out.push(value)
  } else if (Array.isArray(value)) value.forEach(v => jsonFileNames(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach(v => jsonFileNames(v, out))
  return out
}

function injectTags(html, rel, extraHtml = '', absBase = '') {
  const depth = rel.split('/').length - 1
  const prefix = absBase ? `${absBase}/` : depth ? '../'.repeat(depth) : './'
  const tags = extraHtml +
    `<link rel="stylesheet" href="${prefix}__blog-theme.css" data-blog-mirror>` +
    `<script src="${prefix}__blog-bridge.js" data-blog-mirror></script>`
  // 放在文档最后：覆盖样式排在页面自己的 <style> 之后；桥接脚本在页面脚本之后执行
  const i = html.lastIndexOf('</body>')
  return i >= 0 ? html.slice(0, i) + tags + '\n' + html.slice(i) : html + tags
}


// ---------------------------------------------------------------------------
// 静态快照模式
// ---------------------------------------------------------------------------
const ASSET_ATTR_RE = /\b(src|href|poster|srcset|data-src)\s*=\s*(["'])(.*?)\2/gi
const CSS_URL_RE = /url\(\s*(["']?)([^"')]+)\1\s*\)/g

function safeName(u) {
  // 带查询参数的资源（例如 /_next/image?url=…&w=640）存成 __q/<hash>.<ext>
  let h = 0
  for (const c of u) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const ext = (u.match(/\.(png|jpe?g|webp|gif|svg|avif|ico|woff2?|ttf|css)(?=[?&#]|$)/i) || [, 'bin'])[1]
  return `__q/${h.toString(36)}.${ext}`
}


/**
 * React / Next.js 流式渲染：服务器先输出占位
 *   <!--$?--><template id="B:4"></template>占位内容<!--/$-->
 * 真正的内容放在同一份 HTML 后面的 <div hidden id="S:4">…</div>，再由内联脚本 $RC("B:4","S:4") 换进去。
 * 快照不保留脚本，所以在这里把这一步做掉。没有对应内容的占位保持原样。
 */
function resolveSuspense(html) {
  // 找到从 start 开始的 <div …> 与它配对的 </div> 之后的位置
  const divEnd = (str, start) => {
    const re = /<div\b|<\/div>/gi
    re.lastIndex = start
    let depth = 0, m
    while ((m = re.exec(str))) {
      depth += m[0][1] === '/' ? -1 : 1
      if (depth === 0) return m.index + m[0].length
    }
    return -1
  }
  // 从 start（<!--$?--> 处）开始，找到配对的 <!--/$--> 之后的位置
  const boundaryEnd = (str, start) => {
    const re = /<!--\$[?!]?-->|<!--\/\$-->/g
    re.lastIndex = start
    let depth = 0, m
    while ((m = re.exec(str))) {
      depth += m[0].startsWith('<!--/') ? -1 : 1
      if (depth === 0) return m.index + m[0].length
    }
    return -1
  }
  for (let guard = 0; guard < 200; guard++) {
    const m = /<div hidden id="S:([\w-]+)">/.exec(html)
    if (!m) break
    const id = m[1]
    const end = divEnd(html, m.index)
    if (end < 0) break
    const content = html.slice(m.index + m[0].length, end - '</div>'.length)
    html = html.slice(0, m.index) + html.slice(end) // 去掉隐藏的内容块
    const tpl = `<template id="B:${id}"></template>`
    const t = html.indexOf(tpl)
    if (t < 0) continue
    const open = html.lastIndexOf('<!--$?-->', t)
    const close = open >= 0 ? boundaryEnd(html, open) : -1
    if (open < 0 || close < 0) { html = html.replace(tpl, content); continue }
    html = html.slice(0, open) + '<!--$-->' + content + '<!--/$-->' + html.slice(close)
  }
  return html
}

async function mirrorStatic(site) {
  const origin = new URL(site.url).origin
  const base = `/mirror/${site.name}`
  const dest = path.join(OUT, site.name)
  await rm(dest, { recursive: true, force: true })
  await mkdir(dest, { recursive: true })
  const crawl = (site.crawl || []).map(p => p.replace(/^\/+/, ''))
  const inCrawl = p => crawl.some(c => p === c.replace(/\/$/, '') || p.startsWith(c))

  const pages = [...site.entries.map(e => e.replace(/^\/+|\/+$/g, ''))]
  const seenPages = new Set()
  const assets = new Map() // 原地址（站内路径+查询）→ 保存路径
  const missing = []

  /** 把页面里的一个地址改写成镜像里的地址；顺便把要抓的页面 / 资源加入队列 */
  function rewrite(raw, fromPath, isPageAttr) {
    // HTML 属性里的 & 写作 &amp;，先还原
    const v = raw.trim().replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&quot;/g, '"')
    if (!v || /^(?:#|data:|mailto:|javascript:|tel:)/i.test(v) || /["<>\s]/.test(v)) return raw
    let url
    try { url = new URL(v, `${origin}/${fromPath}`) } catch { return raw }
    if (url.origin !== origin) return raw
    // Next.js 图片优化地址 /_next/image?url=原图&w=…：直接用原图，不保存多种尺寸
    if (url.pathname === '/_next/image' && url.searchParams.get('url')) {
      const orig = url.searchParams.get('url')
      if (/^https?:\/\//i.test(orig) && new URL(orig).origin !== origin) return orig
      return rewrite(orig, fromPath, false)
    }
    const p = url.pathname.replace(/^\/+/, '')
    const hasExt = /\.[a-z0-9]+$/i.test(p)
    if (isPageAttr && !hasExt && !url.pathname.startsWith('/_next/')) {
      const page = p.replace(/\/+$/, '')
      // 只跟进由字母、数字和 - _ . 组成的路径（站点的正常文章地址）；编码过的旧式链接等指向原站
      if (inCrawl(page) && /^[\w.\/-]+$/.test(page) && page.length < 200) {
        if (!seenPages.has(page)) pages.push(page)
        return `${base}/${page}/${url.hash}`
      }
      return `${origin}/${page}${url.search}${url.hash}` // 不在范围内：指向原站
    }
    const key = p + url.search
    if (!assets.has(key)) assets.set(key, url.search ? safeName(key) : p)
    return `${base}/${assets.get(key)}`
  }

  function rewriteSrcset(value, fromPath) {
    return value.split(',').map(part => {
      const [u, ...rest] = part.trim().split(/\s+/)
      return [rewrite(u, fromPath, false), ...rest].join(' ')
    }).join(', ')
  }

  const MAX_PAGES = site.maxPages || 400
  while (pages.length) {
    const page = pages.shift()
    if (seenPages.has(page)) continue
    if (seenPages.size >= MAX_PAGES) throw new Error(`${site.name} 超过 ${MAX_PAGES} 个页面，检查 crawl 范围是否太大（或在配置里设置 maxPages）`)
    seenPages.add(page)
    const res = await fetch(`${origin}/${page}`, { headers: { 'user-agent': 'blog-mirror/1.0' } })
    if (!res.ok) { missing.push(`${page} (${res.status})`); continue }
    let html = resolveSuspense(await res.text())
    // 去掉脚本：快照里只保留服务器渲染出来的内容
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<link\b[^>]*\b(?:rel=["'](?:modulepreload|preload)["'][^>]*\bas=["']script["']|as=["']script["'][^>]*\brel=["'](?:modulepreload|preload)["'])[^>]*>/gi, '')
      .replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, '')
      .replace(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gi, '$1')
      // inert 原本由脚本在展开时移除；没有脚本时它会让折叠区域里的链接永远点不了
      .replace(/\sinert(?:="[^"]*")?(?=[\s>\/])/gi, '')
    html = html.replace(ASSET_ATTR_RE, (m, attr, q, val) => {
      const a = attr.toLowerCase()
      if (a === 'srcset') return `${attr}=${q}${rewriteSrcset(val, page)}${q}`
      // <a href> 和 <link rel=alternate/canonical> 是页面链接，其余是资源
      return `${attr}=${q}${rewrite(val, page, a === 'href')}${q}`
    })
    // <link rel="stylesheet" href> 上面被当成页面链接了：样式表有扩展名，所以仍会按资源处理
    // 行内样式里的 url()：引号可能写成 &quot;
    html = html.replace(/style=(["'])(.*?)\1/gi, (m, q, css) => {
      const decoded = css.replace(/&quot;/g, '"')
      const out = decoded.replace(CSS_URL_RE, (mm, qq, u) => `url(${qq}${rewrite(u, page, false)}${qq})`)
      return `style=${q}${q === '"' ? out.replace(/"/g, '&quot;') : out}${q}`
    })
    const credit = site.credit ? site.credit.replaceAll('{url}', `${origin}/${page}`) : ''
    html = injectTags(html, '', credit, base)
    const out = path.join(dest, page, 'index.html')
    await mkdir(path.dirname(out), { recursive: true })
    await writeFile(out, html)
  }

  // 资源：样式表里的 url() 相对于样式表本身，保存时保持原来的目录结构，所以相对路径不用改
  const assetQueue = [...assets.entries()]
  const doneAssets = new Set()
  while (assetQueue.length) {
    const [key, savePath] = assetQueue.shift()
    if (doneAssets.has(key)) continue
    doneAssets.add(key)
    const res = await fetch(`${origin}/${key}`, { headers: { 'user-agent': 'blog-mirror/1.0' } })
    if (!res.ok) { missing.push(`${key} (${res.status})`); continue }
    let buf = Buffer.from(await res.arrayBuffer())
    if (/\.css$/i.test(savePath)) {
      let css = buf.toString('utf8')
      css = css.replace(CSS_URL_RE, (m, q, u) => {
        if (/^(?:data:|#)/.test(u)) return m
        if (u.startsWith('/')) return `url(${q}${rewrite(u, key, false)}${q})`
        const r = resolveRef(key, u)
        if (r && !assets.has(r)) { assets.set(r, r); assetQueue.push([r, r]) }
        return m
      })
      buf = Buffer.from(css, 'utf8')
    }
    const out = path.join(dest, savePath)
    await mkdir(path.dirname(out), { recursive: true })
    await writeFile(out, buf)
  }

  // /mirror/<name>/ 本身跳转到第一个入口页面
  const first = site.entries[0].replace(/^\/+|\/+$/g, '')
  await writeFile(path.join(dest, 'index.html'), `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${base}/${first}/"><a href="${base}/${first}/">${first}</a>\n`)

  const css = path.join(MIRRORS_DIR, `${site.name}.css`)
  await copyFile(path.join(MIRRORS_DIR, '_bridge.js'), path.join(dest, '__blog-bridge.js'))
  if (await exists(css)) await copyFile(css, path.join(dest, '__blog-theme.css'))
  else await writeFile(path.join(dest, '__blog-theme.css'), '/* 没有为该站点编写风格覆盖 */\n')

  console.log(`[mirror] ${site.name}: ${seenPages.size - missing.filter(m => !/\./.test(m.split(' ')[0])).length} 个页面、${doneAssets.size} 个资源 ← ${origin}（静态快照）`)
  for (const p of seenPages) console.log(`  + ${p}/`)
  for (const m of missing) console.log(`  ! 未找到 ${m}`)
  const missingPages = missing.filter(m => site.entries.some(e => m.startsWith(e.replace(/^\/+|\/+$/g, '') + ' ')))
  if (missingPages.length) throw new Error(`${site.name} 的入口页面抓取失败：${missingPages.join(', ')}`)
  const missingCss = missing.filter(m => /\.css\b/.test(m))
  if (missingCss.length) throw new Error(`${site.name} 的样式表抓取失败：${missingCss.join(', ')}`)
}

const args = process.argv.slice(2)
const ifMissing = args.includes('--if-missing')
const only = args.find(a => !a.startsWith('--'))
const sites = JSON.parse(await readFile(path.join(VP, 'mirrors.json'), 'utf8')).filter(s => !only || s.name === only)
if (!sites.length) { console.error(`[mirror] 没有找到镜像配置${only ? `：${only}` : ''}`); process.exit(1) }
try {
  for (const s of sites) {
    if (ifMissing && await exists(path.join(OUT, s.name, 'index.html'))) {
      console.log(`[mirror] ${s.name}: 已存在，跳过（要更新请运行 pnpm mirror）`)
      continue
    }
    await (s.mode === 'static' ? mirrorStatic(s) : mirrorOne(s))
  }
} catch (e) {
  console.error(`[mirror] 失败：${e.message}`)
  process.exit(1)
}
