/**
 * 分形背景的着色器，与 Julia 分形编辑器里的完全相同（改这里时编辑器也要同步改，
 * 否则在编辑器里调好的参数在博客上会长得不一样）。
 *
 *   VS / FS：画 Julia 集（逃逸时间或最近点模式，渐变色标，内部颜色）
 *   VS2 + FS_BRIGHT / FS_BLUR / FS_STREAK / FS_COMP：后期效果
 *     取亮部 → 高斯模糊（光晕）、整幅缩小模糊（柔焦）、旋转 / 径向模糊（光迹）
 *     → 合成（红蓝分光、背景渐变、曝光 / 对比度 / 饱和度、暗角；博客里不画颗粒）
 */
export const VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
export const FS = [
  'precision highp float;',
  'uniform vec2 uRes; uniform vec2 uCenter; uniform float uScale; uniform float uRot;',
  'uniform vec2 uC; uniform float uIter; uniform float uPower;',
  'uniform int uShip; uniform int uInv; uniform int uMandel; uniform int uMode;',
  'uniform vec3 uStops[8]; uniform float uPos[8]; uniform int uCount;',
  'uniform vec3 uInside; uniform int uInsideMode; uniform float uGamma; uniform float uFreq; uniform float uOffset; uniform int uCycle;',
  // 第二套配色：换页 / 换主题时两套配色按 uPalMix 混合（编辑器里 uPalMix 恒为 0）
  'uniform vec3 uStops2[8]; uniform float uPos2[8]; uniform int uCount2;',
  'uniform vec3 uInside2; uniform int uInsideMode2; uniform float uGamma2; uniform float uFreq2; uniform float uOffset2; uniform int uCycle2;',
  'uniform float uPalMix;',
  'uniform int uAA; uniform vec2 uJitter;',
  'vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }',
  'vec2 cpow(vec2 z, float p) {',
  '  if (p == 2.0) return cmul(z, z);',
  // 整数幂（3–12）用连乘，比极坐标形式（atan / pow / cos / sin）快得多
  '  if (p >= 3.0 && p <= 12.0 && fract(p) == 0.0) {',
  '    vec2 r = z;',
  '    for (int i = 1; i < 12; i++) { if (float(i) >= p) break; r = cmul(r, z); }',
  '    return r;',
  '  }',
  '  float r2 = dot(z, z);',
  '  if (r2 == 0.0) return p > 0.0 ? vec2(0.0) : vec2(1e10, 0.0);',
  '  float a = atan(z.y, z.x) * p;',
  '  float m = pow(r2, 0.5 * p);',
  '  return m * vec2(cos(a), sin(a));',
  '}',
  'vec3 grad(float t, int P) {',
  '  int cnt = P == 0 ? uCount : uCount2;',
  '  t = (P == 0 ? uCycle : uCycle2) == 1 ? fract(t) : clamp(t, 0.0, 1.0);',
  '  vec3 col = P == 0 ? uStops[0] : uStops2[0];',
  '  for (int i = 1; i < 8; i++) {',
  '    if (i >= cnt) break;',
  '    float a = P == 0 ? uPos[i - 1] : uPos2[i - 1]; float b = P == 0 ? uPos[i] : uPos2[i];',
  '    col = mix(col, P == 0 ? uStops[i] : uStops2[i], clamp((t - a) / max(b - a, 1e-5), 0.0, 1.0));',
  '  }',
  '  return col;',
  '}',
  'float shape(float t, int P) {',
  '  return P == 0 ? pow(max(t, 0.0), uGamma) * uFreq + uOffset : pow(max(t, 0.0), uGamma2) * uFreq2 + uOffset2;',
  '}',
  // 按某一套配色上色。esc：是否逃逸；sn：平滑的逃逸次数；minR：轨道离原点最近的距离²；z：最后的 z
  'vec3 paint(int P, bool esc, float sn, float minR, vec2 z) {',
  '  vec3 inside = P == 0 ? uInside : uInside2; int im = P == 0 ? uInsideMode : uInsideMode2;',
  '  if (uMode == 1) {',
  '    float t = esc ? 1.0 - exp(-sqrt(sqrt(minR)) * 1.5) : clamp(sqrt(sqrt(minR)), 0.0, 1.0);',
  '    return esc ? grad(shape(t, P), P) : mix(inside, grad(shape(t, P), P), im == 0 ? 0.0 : 1.0);',
  '  }',
  '  if (!esc) {',
  '    if (im == 0) return inside;',
  '    if (im == 1) return grad(shape(clamp(sqrt(sqrt(minR)), 0.0, 1.0), P), P);',
  '    return grad(atan(z.y, z.x) / 6.2831853 + 0.5 + (P == 0 ? uOffset : uOffset2), P);',
  '  }',
  '  return grad(shape(clamp(sn / uIter, 0.0, 1.0), P), P);',
  '}',
  'vec3 shade(vec2 fc) {',
  '  vec2 q = (fc - 0.5 * uRes) / min(uRes.x, uRes.y);',
  '  float cr = cos(uRot), sr = sin(uRot);',
  '  vec2 p = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y) * uScale + uCenter;',
  '  if (uInv == 1) { float d = dot(p, p); p = d > 0.0 ? vec2(p.x, -p.y) / d : vec2(1e10, 0.0); }',
  '  vec2 z; vec2 c;',
  '  if (uMandel == 1) { c = p; z = uPower > 0.0 ? vec2(0.0) : c; } else { z = p; c = uC; }',
  '  float n = 0.0; float m2 = dot(z, z); float minR = 1e20; bool esc = false;',
  '  for (int i = 0; i < 2048; i++) {',
  '    if (float(i) >= uIter) break;',
  '    if (uShip == 1) z = vec2(abs(z.x), -abs(z.y));',
  '    z = cpow(z, uPower) + c;',
  '    m2 = dot(z, z);',
  '    minR = min(minR, m2);',
  '    if (m2 > 1e8) { esc = true; if (uMode == 0) break; }',
  '    if (!esc) n += 1.0;',
  '  }',
  '  float sn = n + 1.0 - log(max(0.5 * log(m2), 1e-6)) / log(max(abs(uPower), 1.0001));',
  '  vec3 col = paint(0, esc, sn, minR, z);',
  '  if (uPalMix > 0.0) col = mix(col, paint(1, esc, sn, minR, z), uPalMix);',
  '  return col;',
  '}',
  // 超采样：每个像素在 uAA × uAA 的网格上取样再平均；uJitter 是整体的亚像素偏移（博客用它逐帧累积取样）
  'void main() {',
  '  vec3 acc = vec3(0.0); float k = float(uAA);',
  '  for (int i = 0; i < 3; i++) { if (i >= uAA) break;',
  '    for (int j = 0; j < 3; j++) { if (j >= uAA) break;',
  '      acc += shade(gl_FragCoord.xy - 0.5 + (vec2(float(i), float(j)) + 0.5) / k + uJitter);',
  '    }',
  '  }',
  '  gl_FragColor = vec4(acc / (k * k), 1.0);',
  '}'
].join('\n');

export const VS2 = 'attribute vec2 a; varying vec2 v; void main(){ v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }';
// 取亮部（同时缩小到 1/4）；thr < 0 时不取阈值，只缩小（用于柔焦）
export const FS_BRIGHT = [
  'precision mediump float; varying vec2 v; uniform sampler2D t; uniform vec2 tx; uniform float thr;',
  'void main(){',
  '  vec3 c = (texture2D(t, v + tx * vec2(-1.0, -1.0)).rgb + texture2D(t, v + tx * vec2(1.0, -1.0)).rgb',
  '          + texture2D(t, v + tx * vec2(-1.0, 1.0)).rgb + texture2D(t, v + tx * vec2(1.0, 1.0)).rgb) * 0.25;',
  '  float l = max(c.r, max(c.g, c.b));',
  '  float k = thr < 0.0 ? 1.0 : smoothstep(thr, thr + 0.2, l);',
  '  gl_FragColor = vec4(c * k, 1.0);',
  '}'].join('\n');
// 可分离的高斯模糊：dir 是一个像素的步长（横或竖），sigma 以像素计；在 ±3σ 内取样（最多每边 32 个，σ 大时加大间隔）
export const FS_BLUR = [
  'precision highp float; varying vec2 v; uniform sampler2D t; uniform vec2 dir; uniform float sigma;',
  'void main(){',
  '  float st = max(1.0, sigma * 3.0 / 32.0);',
  '  float n = ceil(sigma * 3.0 / st);',
  '  float k = -0.5 / max(sigma * sigma, 1e-4);',
  '  vec3 s = texture2D(t, v).rgb; float ws = 1.0;',
  '  for (int i = 1; i <= 32; i++) {',
  '    if (float(i) > n) break;',
  '    float x = float(i) * st; float w = exp(k * x * x);',
  '    s += (texture2D(t, v + dir * x).rgb + texture2D(t, v - dir * x).rgb) * w; ws += 2.0 * w;',
  '  }',
  '  gl_FragColor = vec4(s / ws, 1.0);',
  '}'].join('\n');
// 光迹：绕画面中心旋转 / 向中心缩放 / 两者一起（螺旋）的模糊
export const FS_STREAK = [
  'precision mediump float; varying vec2 v; uniform sampler2D t; uniform int type; uniform float len; uniform float aspect;',
  'void main(){',
  '  vec3 acc = vec3(0.0); float ws = 0.0; vec2 c = vec2(0.5); vec2 k = vec2(aspect, 1.0);',
  '  for (int i = 0; i < 24; i++) {',
  '    float f = float(i) / 23.0; vec2 d = (v - c) * k; vec2 dd = d;',
  '    if (type != 2) { float a = -len * f; dd = vec2(cos(a) * d.x - sin(a) * d.y, sin(a) * d.x + cos(a) * d.y); }',
  '    if (type == 2) dd = d * (1.0 - len * f);',
  '    if (type == 3) dd *= (1.0 - len * 0.5 * f);',
  '    float w = 1.0 - f; acc += texture2D(t, c + dd / k).rgb * w; ws += w;',
  '  }',
  '  gl_FragColor = vec4(acc / ws, 1.0);',
  '}'].join('\n');
// 合成：红蓝分光、光晕、光迹、柔焦、背景渐变、曝光 / 对比度 / 饱和度、暗角
export const FS_COMP = [
  'precision highp float; varying vec2 v;',
  'uniform sampler2D base; uniform sampler2D bloom; uniform sampler2D soft; uniform sampler2D streak;',
  'uniform float chroma; uniform float bloomI; uniform float softMix; uniform float streakI;',
  'uniform vec3 gA; uniform vec3 gB; uniform float gAng; uniform float gStr;',
  'uniform float vig; uniform float sat; uniform float con; uniform float expo; uniform float aspect;',
  'void main(){',
  '  vec2 d = v - 0.5; vec2 off = d * chroma;',
  '  vec3 col = vec3(texture2D(base, v + off).r, texture2D(base, v).g, texture2D(base, v - off).b);',
  '  col = mix(col, texture2D(soft, v).rgb, softMix);',
  '  vec3 bl = vec3(texture2D(bloom, v + off * 2.0).r, texture2D(bloom, v).g, texture2D(bloom, v - off * 2.0).b);',
  '  col += bl * bloomI + texture2D(streak, v).rgb * streakI;',
  '  vec2 k = vec2(aspect, 1.0);',
  '  float gt = dot(d * k, vec2(cos(gAng), sin(gAng))) / (0.5 * length(k)) * 0.5 + 0.5;',
  '  vec3 g = mix(gA, gB, clamp(gt, 0.0, 1.0));',
  '  col = 1.0 - (1.0 - col) * (1.0 - g * gStr);',
  '  col *= exp2(expo);',
  '  col = (col - 0.5) * con + 0.5;',
  '  float l = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(l), col, sat);',
  '  float r = length(d * k) / length(k * 0.5); col *= 1.0 - vig * smoothstep(0.35, 1.0, r);',
  '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
  '}'].join('\n');

// 复制一幅画面（可以只取左下角 sc 的部分：运动时低分辨率的那一帧放大到全屏）。lim 防止取到范围外。
// ts > 0（源贴图的像素尺寸）时用三次 B 样条放大：4 次双线性取样拼出 4×4 的平滑核，
// 没有双线性放大那种一格一格的方块感，代价是略软（正好盖住低分辨率）
export const FS_COPY = [
  'precision highp float; varying vec2 v; uniform sampler2D t; uniform vec2 sc; uniform vec2 lim; uniform vec2 ts;',
  'vec3 at(vec2 u) { return texture2D(t, clamp(u, vec2(0.0), lim)).rgb; }',
  'void main(){',
  '  vec2 u = v * sc;',
  '  if (ts.x <= 0.0) { gl_FragColor = vec4(at(u), 1.0); return; }',
  '  vec2 p = u * ts - 0.5; vec2 i = floor(p); vec2 f = p - i;',
  '  vec2 f2 = f * f; vec2 f3 = f2 * f;',
  '  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;',
  '  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;',
  '  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;',
  '  vec2 w3 = f3 / 6.0;',
  '  vec2 g0 = w0 + w1; vec2 g1 = w2 + w3;',
  '  vec2 h0 = (i - 0.5 + w1 / g0) / ts; vec2 h1 = (i + 1.5 + w3 / g1) / ts;',
  '  vec3 c = g0.y * (g0.x * at(vec2(h0.x, h0.y)) + g1.x * at(vec2(h1.x, h0.y)))',
  '         + g1.y * (g0.x * at(vec2(h0.x, h1.y)) + g1.x * at(vec2(h1.x, h1.y)));',
  '  gl_FragColor = vec4(c, 1.0);',
  '}'
].join('\n');

/** 生成专用着色器的选项（都在编译时决定，避免着色器里的动态分支和循环） */
export interface Variant {
  /** 整数幂次（2–16）展开成固定的乘法；null 用通用的极坐标公式 */
  power: number | null
  /** Burning Ship */
  ship: boolean
  /** 需要记录轨道离原点最近的距离（最近点模式，或内部颜色不是纯色） */
  minR: boolean
  /** 每像素取样 aa × aa 个（1 或 2），展开成固定的几次调用 */
  aa: 1 | 2
}

/**
 * 博客用的分形着色器：画出来与 FS 完全相同，只是把能在编译时确定的东西都定死：
 *   - 整数幂次（2–16）展开成平方-乘法（例如 z^10 = ((z²)²·z)²，4 次），没有内层循环
 *   - 不需要的东西（Burning Ship 的绝对值、最近点距离、逃逸后继续迭代）从迭代循环里去掉
 *   - 每像素的取样数展开成固定的调用，不再用包着 shade() 的动态循环
 *     （这一层循环即使只取 1 个样本也会让整体慢 1.5–2.5 倍：编译器没法优化循环里的循环）
 */
export function fractalFS(o: Variant): string {
  let src = FS
  // 1. 幂次
  const a = src.indexOf('vec2 cpow(vec2 z, float p) {')
  const b = src.indexOf('vec3 grad(float t, int P)')
  let body: string
  const pw = o.power
  if (pw !== null && Number.isInteger(pw) && pw >= 2 && pw <= 16) {
    body = 'vec2 r = z;'
    for (const bit of pw.toString(2).slice(1)) body += ' r = csq(r);' + (bit === '1' ? ' r = cmul(r, z);' : '')
    body += ' return r;'
  }
  else {
    body = [
      'float r2 = dot(z, z);',
      'if (r2 == 0.0) return p > 0.0 ? vec2(0.0) : vec2(1e10, 0.0);',
      'float a = atan(z.y, z.x) * p;',
      'float m = exp2(0.5 * p * log2(r2));',
      'return m * vec2(cos(a), sin(a));',
    ].join(' ')
  }
  src = `${src.slice(0, a)}vec2 csq(vec2 z) { return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y); }\nvec2 cpow(vec2 z, float p) { ${body} }\n${src.slice(b)}`
  // 2. 迭代循环：不需要最近点时，逃逸就停，循环里只剩迭代本身
  const loop = [
    '    if (uShip == 1) z = vec2(abs(z.x), -abs(z.y));',
    '    z = cpow(z, uPower) + c;',
    '    m2 = dot(z, z);',
    '    minR = min(minR, m2);',
    '    if (m2 > 1e8) { esc = true; if (uMode == 0) break; }',
    '    if (!esc) n += 1.0;',
  ].join('\n')
  if (!src.includes(loop)) throw new Error('fractalFS: 迭代循环与 FS 不一致')
  const lines: string[] = []
  if (o.ship) lines.push('    z = vec2(abs(z.x), -abs(z.y));')
  lines.push('    z = cpow(z, uPower) + c;', '    m2 = dot(z, z);')
  if (o.minR) {
    lines.push('    minR = min(minR, m2);', '    if (m2 > 1e8) { esc = true; if (uMode == 0) break; }', '    if (!esc) n += 1.0;')
  }
  else {
    lines.push('    if (m2 > 1e8) { esc = true; break; }', '    n += 1.0;')
  }
  src = src.replace(loop, lines.join('\n'))
  // 3. 每像素取样：展开
  const m = src.indexOf('void main() {')
  const main = o.aa === 2
    ? 'void main() {\n  vec2 f = gl_FragCoord.xy + uJitter;\n  gl_FragColor = vec4((shade(f + vec2(-0.25, -0.25)) + shade(f + vec2(0.25, -0.25)) + shade(f + vec2(-0.25, 0.25)) + shade(f + vec2(0.25, 0.25))) * 0.25, 1.0);\n}'
    : 'void main() { gl_FragColor = vec4(shade(gl_FragCoord.xy + uJitter), 1.0); }'
  return src.slice(0, m) + main
}
