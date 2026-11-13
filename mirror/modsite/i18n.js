// i18n module with dictionary-based UI translations and protected machine translation fallback

export const translations = {
  en: {
    brandMark: "✦",
    homeEyebrow: "MOD COLLECTION",
    homeTitle: "Collection",
    homeDesc: "All my mods",
    searchPlaceholder: "Search by name, version, loader…",
    searchAriaLabel: "Filter mods",
    modsCountSingle: "1 mod",
    modsCountPlural: "{count} mods",
    loadingMods: "Loading mods…",
    viewList: "List",
    viewGrid: "Grid",
    viewToggleLabel: "Display mode",
    themeToggleLabel: "Toggle light or dark theme",
    noMatch: "No matching mods found.",
    noModsYet: "No mods published yet.",
    latestVersion: "Latest {version}",
    gameVersion: "Game {version}",
    mcVersion: "MC {version}",
    modOverview: "MOD OVERVIEW",
    byAuthor: "By: {authors}",
    sourceLink: "Source ↗",
    sectionDescription: "Description",
    sectionDownloads: "Downloads",
    tagLatest: "Latest",
    btnDownload: "Download",
    emptyVersions: "No available versions yet.",
    emptyDescription: "No description provided yet.",
    loadingModDetails: "Loading mod details…",
    modNotExist: "Mod does not exist",
    backToList: "← Back",
    transBadgeMT: "🌐 Machine Translated",
    transBadgeOrig: "📄 Original English",
    transHintMT: "Content translated into Chinese",
    transHintOrig: "Viewing original untranslated text",
    btnShowOriginal: "View Original English",
    btnShowTranslation: "Translate to Chinese ↗",
    translating: "Translating content…",
    transFail: "Translation unavailable, displaying original.",
    noSummaryAvailable: "No description provided yet."
  },
  zh: {
    brandMark: "✦",
    homeEyebrow: "模组精选收录",
    homeTitle: "模组列表",
    homeDesc: "收录所有模组与发布历史",
    searchPlaceholder: "按名称、版本、加载器搜索模组…",
    searchAriaLabel: "筛选模组",
    modsCountSingle: "共 1 个模组",
    modsCountPlural: "共 {count} 个模组",
    loadingMods: "正在加载模组列表…",
    viewList: "列表",
    viewGrid: "卡片",
    viewToggleLabel: "显示方式",
    themeToggleLabel: "切换亮色或暗色",
    noMatch: "未找到匹配的模组。",
    noModsYet: "暂无已发布的模组。",
    latestVersion: "最新版本 {version}",
    gameVersion: "游戏 {version}",
    mcVersion: "MC {version}",
    modOverview: "模组概览",
    byAuthor: "作者：{authors}",
    sourceLink: "源码仓库 ↗",
    sectionDescription: "详细介绍",
    sectionDownloads: "版本下载",
    tagLatest: "最新",
    btnDownload: "下载",
    emptyVersions: "暂无可用的发布版本。",
    emptyDescription: "暂无详细介绍。",
    loadingModDetails: "正在加载模组详情…",
    modNotExist: "未找到该模组",
    backToList: "← 返回列表",
    transBadgeMT: "🌐 智能机翻",
    transBadgeOrig: "📄 英文原文",
    transBadgeManual: "✨ 人工校对",
    transHintMT: "已自动将正文翻译为中文",
    transHintOrig: "当前正在浏览未经翻译的英文原文",
    transHintManual: "已展示经过人工校对的中文内容",
    btnShowOriginal: "查看英文原文",
    btnShowTranslation: "切换智能机翻 ↗",
    translating: "正在智能机翻…",
    transFail: "翻译暂不可用，已展示原文。",
    noSummaryAvailable: "暂无模组简介。"
  },
  en: {
    brandMark: "✦",
    homeEyebrow: "MOD COLLECTION",
    homeTitle: "Collection",
    homeDesc: "All my mods",
    searchPlaceholder: "Search by name, version, loader…",
    searchAriaLabel: "Filter mods",
    modsCountSingle: "1 mod",
    modsCountPlural: "{count} mods",
    loadingMods: "Loading mods…",
    viewList: "List",
    viewGrid: "Grid",
    viewToggleLabel: "Display mode",
    themeToggleLabel: "Toggle light or dark theme",
    noMatch: "No matching mods found.",
    noModsYet: "No mods published yet.",
    latestVersion: "Latest {version}",
    gameVersion: "Game {version}",
    mcVersion: "MC {version}",
    modOverview: "MOD OVERVIEW",
    byAuthor: "By: {authors}",
    sourceLink: "Source ↗",
    sectionDescription: "Description",
    sectionDownloads: "Downloads",
    tagLatest: "Latest",
    btnDownload: "Download",
    emptyVersions: "No available versions yet.",
    emptyDescription: "No description provided yet.",
    loadingModDetails: "Loading mod details…",
    modNotExist: "Mod does not exist",
    backToList: "← Back",
    transBadgeMT: "🌐 Machine Translated",
    transBadgeOrig: "📄 Original English",
    transBadgeManual: "✨ Human Verified",
    transHintMT: "Content translated into Chinese",
    transHintOrig: "Viewing original untranslated text",
    transHintManual: "Viewing verified human translation",
    btnShowOriginal: "View Original English",
    btnShowTranslation: "Translate to Chinese ↗",
    translating: "Translating content…",
    transFail: "Translation unavailable, displaying original.",
    noSummaryAvailable: "No description provided yet."
  }
};

const STORAGE_KEY = "modsite_site_lang";
const CACHE_PREFIX = "modsite_mt_cache_";

let cachedGlossary = null;
let cachedOverrides = null;

export async function loadTranslationsData() {
  if (typeof fetch === "undefined") return { glossary: [], overrides: {} };
  try {
    const [glossaryRes, overridesRes] = await Promise.all([
      fetch("./glossary.json", { cache: "no-store" }).catch(() => null),
      fetch("./overrides.json", { cache: "no-store" }).catch(() => null)
    ]);
    if (glossaryRes && glossaryRes.ok) {
      cachedGlossary = await glossaryRes.json();
    }
    if (overridesRes && overridesRes.ok) {
      cachedOverrides = await overridesRes.json();
    }
  } catch (err) {
    console.warn("Failed to load glossary or overrides:", err);
  }
  return { glossary: cachedGlossary || [], overrides: cachedOverrides || {} };
}

export function setGlossaryData(glossary) {
  cachedGlossary = glossary;
}

export function getGlossaryData() {
  return cachedGlossary;
}

export function setOverridesData(overrides) {
  cachedOverrides = overrides;
}

export function getOverridesData() {
  return cachedOverrides;
}

export function getProjectTranslation(project, lang = getCurrentLang(), overrides = cachedOverrides) {
  if (!project) return { name: "", description: "", longDescription: "", hasManual: false };
  if (lang !== "zh") {
    return {
      name: project.name,
      description: project.description,
      longDescription: project.longDescription,
      hasManual: false
    };
  }

  const slug = project.slug;
  const ov = (overrides && overrides[slug]) || {};
  const name_zh = ov.name_zh !== undefined ? ov.name_zh : (project.name_zh || "");
  const description_zh = ov.description_zh !== undefined ? ov.description_zh : (project.description_zh || "");
  const longDescription_zh = ov.longDescription_zh !== undefined ? ov.longDescription_zh : (project.longDescription_zh || "");

  const hasManual = Boolean((name_zh && name_zh.trim()) || (description_zh && description_zh.trim()) || (longDescription_zh && longDescription_zh.trim()));

  return {
    name: (name_zh && name_zh.trim()) ? name_zh.trim() : project.name,
    name_zh,
    description: (description_zh && description_zh.trim()) ? description_zh.trim() : project.description,
    description_zh,
    longDescription: (longDescription_zh && longDescription_zh.trim()) ? longDescription_zh : project.longDescription,
    longDescription_zh,
    hasManual
  };
}

const PROTECTED_TERMS = [
  "Fabric", "Quilt", "Forge", "NeoForge", "Modrinth", "CurseForge",
  "Minecraft", "CarpetMod", "CarpetGUI", "Lucidity", "VisualDust",
  "ItemFlowTracker", "ExplosionVisualizer", "ColorfulCollars",
  "Log4C", "ScheduledTickVisualizer", "PlayerControl", "SimpleEyeLine",
  "Simulatica", "TMWIN", "TinyTooOver", "WaysToDie", "Ryan100c"
];

const PLACEHOLDER_DESC = "This is an example description! Tell everyone what your mod is about!";

export function isPlaceholderDesc(text) {
  if (!text) return true;
  const trimmed = text.trim();
  return !trimmed || trimmed === PLACEHOLDER_DESC;
}

export function getCurrentLang() {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "zh" || saved === "en") return saved;
    }
  } catch {}

  try {
    if (typeof navigator !== "undefined" && navigator.language) {
      if (navigator.language.toLowerCase().startsWith("zh")) return "zh";
    }
  } catch {}

  return "en";
}

export function setLang(lang) {
  const target = lang === "zh" ? "zh" : "en";
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, target);
    }
  } catch {}
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = target === "zh" ? "zh-CN" : "en";
  }
  return target;
}

export function t(key, params = {}, lang = getCurrentLang()) {
  const dict = translations[lang] || translations.en;
  let text = dict[key] !== undefined ? dict[key] : (translations.en[key] !== undefined ? translations.en[key] : key);
  for (const [pKey, pVal] of Object.entries(params)) {
    text = text.replaceAll(`{${pKey}}`, pVal);
  }
  return text;
}

export function updateDomTranslations(lang = getCurrentLang()) {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key, {}, lang);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", t(key, {}, lang));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria-label");
    if (key) el.setAttribute("aria-label", t(key, {}, lang));
  });
}

export function setupLanguageSwitcher(onChange) {
  if (typeof document === "undefined") return;

  const currentLang = getCurrentLang();
  setLang(currentLang);

  const updateButtons = (lang) => {
    document.querySelectorAll(".lang-switch .lang-btn").forEach((btn) => {
      const targetLang = btn.getAttribute("data-lang");
      btn.classList.toggle("active", targetLang === lang);
    });
  };

  updateButtons(currentLang);
  updateDomTranslations(currentLang);

  document.querySelectorAll(".lang-switch .lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const newLang = btn.getAttribute("data-lang");
      if (!newLang || newLang === getCurrentLang()) return;
      setLang(newLang);
      updateButtons(newLang);
      updateDomTranslations(newLang);
      if (typeof onChange === "function") {
        onChange(newLang);
      }
    });
  });
}

function stringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash));
}

function getCachedTranslation(sourceText, targetLang) {
  try {
    if (typeof localStorage !== "undefined") {
      const key = `${CACHE_PREFIX}${targetLang}_${stringHash(sourceText)}`;
      return localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function setCachedTranslation(sourceText, targetLang, translatedText) {
  try {
    if (typeof localStorage !== "undefined") {
      const key = `${CACHE_PREFIX}${targetLang}_${stringHash(sourceText)}`;
      localStorage.setItem(key, translatedText);
    }
  } catch {}
}

export function maskText(text, glossary = cachedGlossary) {
  const placeholders = [];
  let masked = text;

  // 1. Code blocks: ```...```
  masked = masked.replace(/```[\s\S]*?```/g, (match) => {
    const p = `__MC_CODE_${placeholders.length}__`;
    placeholders.push({ p, original: match });
    return p;
  });

  // 2. Inline code: `...`
  masked = masked.replace(/`[^`\n]+`/g, (match) => {
    const p = `__MC_CODE_${placeholders.length}__`;
    placeholders.push({ p, original: match });
    return p;
  });

  // 3. URLs in markdown links [text](url) -> translate text, protect url
  masked = masked.replace(/(\[[^\]]+\]\()([^\)]+)(\))/g, (match, prefix, url, suffix) => {
    const p = `__MC_URL_${placeholders.length}__`;
    placeholders.push({ p, original: url });
    return `${prefix}${p}${suffix}`;
  });

  // 4. Raw URLs: https://...
  masked = masked.replace(/(https?:\/\/[^\s\)\>\]]+)/g, (match) => {
    const p = `__MC_RAWURL_${placeholders.length}__`;
    placeholders.push({ p, original: match });
    return p;
  });

  // 5. Glossary terms (with specified target translation replacement)
  const activeGlossary = glossary && Array.isArray(glossary) ? glossary : cachedGlossary;
  if (activeGlossary && Array.isArray(activeGlossary)) {
    const sorted = [...activeGlossary]
      .filter((item) => item && item.term && item.translation)
      .sort((a, b) => b.term.length - a.term.length);

    sorted.forEach((item) => {
      const termEscaped = item.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const isAlpha = /^[a-zA-Z0-9_\s]+$/.test(item.term);
      const regex = isAlpha ? new RegExp(`\\b${termEscaped}\\b`, "gi") : new RegExp(termEscaped, "gi");
      masked = masked.replace(regex, (match) => {
        const p = `__MC_GLOSS_${placeholders.length}__`;
        placeholders.push({ p, original: match, replacement: item.translation });
        return p;
      });
    });
  }

  // 6. Ecosystem & Mod Protected terms (whole words)
  PROTECTED_TERMS.forEach((term) => {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    masked = masked.replace(regex, (match) => {
      const p = `__MC_TERM_${placeholders.length}__`;
      placeholders.push({ p, original: match });
      return p;
    });
  });

  return { masked, placeholders };
}

export function unmaskText(text, placeholders) {
  let result = text;

  for (let i = placeholders.length - 1; i >= 0; i--) {
    const { p, original, replacement } = placeholders[i];
    const target = replacement !== undefined ? replacement : original;
    const fuzzy = new RegExp(`__\\s*${p.replace(/__/g, "")}\\s*__`, "gi");
    result = result.replace(fuzzy, target);
    result = result.replaceAll(p, target);
  }

  // Repair markdown links if MT converted parentheses to fullwidth: [name]（url） -> [name](url)
  result = result.replace(/\]\s*[（\(]([^\)\uff09]+)[）\)]/g, (match, url) => `](${url.trim()})`);

  return result;
}

export function applyGlossary(text, glossary = cachedGlossary) {
  if (!text) return text;
  let result = text;

  const commonMistranslations = [
    { from: /红石尘埃/g, to: "红石粉" },
    { from: /织物和被子/g, to: "Fabric 和 Quilt" },
    { from: /织物/g, to: "Fabric" },
    { from: /被子/g, to: "Quilt" },
    { from: /假玩家/g, to: "假人" }
  ];

  commonMistranslations.forEach(({ from, to }) => {
    result = result.replace(from, to);
  });

  const activeGlossary = glossary && Array.isArray(glossary) ? glossary : cachedGlossary;
  if (activeGlossary && Array.isArray(activeGlossary)) {
    activeGlossary.forEach((item) => {
      if (item && item.term && item.translation) {
        const termEscaped = item.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const isAlpha = /^[a-zA-Z0-9_\s]+$/.test(item.term);
        const regex = isAlpha ? new RegExp(`\\b${termEscaped}\\b`, "gi") : new RegExp(termEscaped, "gi");
        result = result.replace(regex, item.translation);
      }
    });
  }

  return result;
}

export async function translateText(text, targetLang = "zh", sourceLang = "en", glossary = cachedGlossary) {
  if (!text || !text.trim()) return text;
  if (targetLang === sourceLang) return text;
  if (isPlaceholderDesc(text)) {
    return targetLang === "zh" ? t("noSummaryAvailable", {}, "zh") : t("noSummaryAvailable", {}, "en");
  }

  const cached = getCachedTranslation(text, targetLang);
  if (cached) return cached;

  if (!cachedGlossary && typeof fetch !== "undefined") {
    try {
      await loadTranslationsData();
    } catch {}
  }

  const activeGlossary = glossary || cachedGlossary;
  const { masked, placeholders } = maskText(text, activeGlossary);

  try {
    const toParam = targetLang === "zh" ? "zh-Hans" : targetLang;
    const fromParam = sourceLang === "zh" ? "zh-Hans" : sourceLang;
    const url = `https://edge.microsoft.com/translate/translatetext?from=${fromParam}&to=${toParam}&isEnterpriseClient=false`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([masked])
    });

    if (!res.ok) throw new Error(`MT failed with status ${res.status}`);
    const data = await res.json();
    const rawTrans = data?.[0]?.translations?.[0]?.text;
    if (!rawTrans) throw new Error("Empty translation result");

    const unmasked = unmaskText(rawTrans, placeholders);
    const final = applyGlossary(unmasked, activeGlossary);
    setCachedTranslation(text, targetLang, final);
    return final;
  } catch (err) {
    console.warn("Machine translation error:", err.message);
    return text; // Graceful fallback to original text
  }
}

export async function translateBatch(texts, targetLang = "zh", sourceLang = "en", glossary = cachedGlossary) {
  if (!texts || !texts.length) return [];
  if (targetLang === sourceLang) return [...texts];

  if (!cachedGlossary && typeof fetch !== "undefined") {
    try {
      await loadTranslationsData();
    } catch {}
  }

  const activeGlossary = glossary || cachedGlossary;
  const results = new Array(texts.length);
  const uncachedIndices = [];
  const uncachedMasked = [];
  const uncachedPlaceholders = [];

  for (let i = 0; i < texts.length; i++) {
    const str = texts[i];
    if (!str || !str.trim()) {
      results[i] = str;
      continue;
    }
    if (isPlaceholderDesc(str)) {
      results[i] = targetLang === "zh" ? t("noSummaryAvailable", {}, "zh") : t("noSummaryAvailable", {}, "en");
      continue;
    }

    const cached = getCachedTranslation(str, targetLang);
    if (cached) {
      results[i] = cached;
    } else {
      const { masked, placeholders } = maskText(str, activeGlossary);
      uncachedIndices.push(i);
      uncachedMasked.push(masked);
      uncachedPlaceholders.push(placeholders);
    }
  }

  if (!uncachedIndices.length) return results;

  try {
    const toParam = targetLang === "zh" ? "zh-Hans" : targetLang;
    const fromParam = sourceLang === "zh" ? "zh-Hans" : sourceLang;
    const url = `https://edge.microsoft.com/translate/translatetext?from=${fromParam}&to=${toParam}&isEnterpriseClient=false`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uncachedMasked)
    });

    if (!res.ok) throw new Error(`MT batch failed with status ${res.status}`);
    const data = await res.json();

    uncachedIndices.forEach((origIdx, batchIdx) => {
      const rawTrans = data?.[batchIdx]?.translations?.[0]?.text;
      if (rawTrans) {
        const unmasked = unmaskText(rawTrans, uncachedPlaceholders[batchIdx]);
        const final = applyGlossary(unmasked, activeGlossary);
        setCachedTranslation(texts[origIdx], targetLang, final);
        results[origIdx] = final;
      } else {
        results[origIdx] = texts[origIdx];
      }
    });
  } catch (err) {
    console.warn("Batch machine translation error:", err.message);
    uncachedIndices.forEach((origIdx) => {
      results[origIdx] = texts[origIdx];
    });
  }

  return results;
}
