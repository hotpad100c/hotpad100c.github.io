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
 *     "follow": ["blobs.json"]                 （可选）这些 JSON 里出现的文件名也一并抓取
 *   }]
 *
 * 做法：
 *   1. 从 entries 里的每个 HTML 开始，递归抓取它引用的同源相对路径文件
 *      （src / href / import / fetch("./…") / url(…) 等）。
 *   2. 在每个 HTML 的 </body> 前插入（放在最后，保证覆盖样式排在原样式之后）：
 *        - mirrors/<name>.css（博客风格覆盖，可选）
 *        - mirrors/_bridge.js（与博客同步深浅色、在 iframe 中隐藏重复的页头等）
 *   3. 外部绝对地址（下载链接、图片 CDN、翻译接口等）保持原样。
 *
 * 用法：node scripts/mirror.mjs            抓取全部
 *       node scripts/mirror.mjs modsite    只抓取一个
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
  const missingCode = missing.filter(m => /\.(m?js|css|json)\b/.test(m))
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

function injectTags(html, rel) {
  const depth = rel.split('/').length - 1
  const prefix = depth ? '../'.repeat(depth) : './'
  const tags = `<link rel="stylesheet" href="${prefix}__blog-theme.css" data-blog-mirror>` +
    `<script src="${prefix}__blog-bridge.js" data-blog-mirror></script>`
  // 放在文档最后：覆盖样式排在页面自己的 <style> 之后；桥接脚本在页面脚本之后执行
  const i = html.lastIndexOf('</body>')
  return i >= 0 ? html.slice(0, i) + tags + '\n' + html.slice(i) : html + tags
}

const only = process.argv[2]
const sites = JSON.parse(await readFile(path.join(VP, 'mirrors.json'), 'utf8')).filter(s => !only || s.name === only)
if (!sites.length) { console.error(`[mirror] 没有找到镜像配置${only ? `：${only}` : ''}`); process.exit(1) }
try {
  for (const s of sites) await mirrorOne(s)
} catch (e) {
  console.error(`[mirror] 失败：${e.message}`)
  process.exit(1)
}
