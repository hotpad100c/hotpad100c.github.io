/**
 * 分形背景的着色器，与 Julia 分形编辑器里的完全相同（改这里时编辑器也要同步改，
 * 否则在编辑器里调好的参数在博客上会长得不一样）。
 *
 *   VS / FS：画 Julia 集（逃逸时间或最近点模式，渐变色标，内部颜色）
 *   VS2 + FS_BRIGHT / FS_BLUR / FS_STREAK / FS_COMP：后期效果
 *     取亮部 → 高斯模糊（光晕）、整幅缩小模糊（柔焦）、旋转 / 径向模糊（光迹）
 *     → 合成（红蓝分光、背景渐变、曝光 / 对比度 / 饱和度、暗角、颗粒）
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
  'uniform int uAA;',
  'vec2 cpow(vec2 z, float p) {',
  '  if (p == 2.0) return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);',
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
  // 超采样：每个像素在 uAA × uAA 的网格上取样再平均，细丝不会闪烁、不会像像素画
  'void main() {',
  '  vec3 acc = vec3(0.0); float k = float(uAA);',
  '  for (int i = 0; i < 3; i++) { if (i >= uAA) break;',
  '    for (int j = 0; j < 3; j++) { if (j >= uAA) break;',
  '      acc += shade(gl_FragCoord.xy - 0.5 + (vec2(float(i), float(j)) + 0.5) / k);',
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
// 可分离的高斯模糊
export const FS_BLUR = [
  'precision mediump float; varying vec2 v; uniform sampler2D t; uniform vec2 dir;',
  'void main(){',
  '  vec3 s = texture2D(t, v).rgb * 0.227027;',
  '  s += (texture2D(t, v + dir * 1.3846).rgb + texture2D(t, v - dir * 1.3846).rgb) * 0.3162162;',
  '  s += (texture2D(t, v + dir * 3.2308).rgb + texture2D(t, v - dir * 3.2308).rgb) * 0.0702703;',
  '  gl_FragColor = vec4(s, 1.0);',
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
// 合成：红蓝分光、光晕、光迹、柔焦、背景渐变、曝光 / 对比度 / 饱和度、暗角、颗粒
export const FS_COMP = [
  'precision highp float; varying vec2 v;',
  'uniform sampler2D base; uniform sampler2D bloom; uniform sampler2D soft; uniform sampler2D streak;',
  'uniform float chroma; uniform float bloomI; uniform float softMix; uniform float streakI;',
  'uniform vec3 gA; uniform vec3 gB; uniform float gAng; uniform float gStr;',
  'uniform float vig; uniform float grain; uniform float sat; uniform float con; uniform float expo; uniform float aspect; uniform float seed;',
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
  '  float n = fract(sin(dot(gl_FragCoord.xy + seed, vec2(12.9898, 78.233))) * 43758.5453); col += (n - 0.5) * grain;',
  '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
  '}'].join('\n');

// 两幅画面按 t 混合（换页时结构不同的两个分形交叉淡化）
export const FS_MIX = [
  'precision mediump float; varying vec2 v; uniform sampler2D a; uniform sampler2D b; uniform float t;',
  'void main(){ gl_FragColor = vec4(mix(texture2D(a, v).rgb, texture2D(b, v).rgb, t), 1.0); }'
].join('\n');
