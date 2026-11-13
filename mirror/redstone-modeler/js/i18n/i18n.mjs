import { en } from "./en.mjs?v=462b4e5";
import { zh_cn } from "./zh_cn.mjs?v=462b4e5";

/** Languages of the interface. To add one: write a dictionary like zh_cn.mjs and list it here. */
export const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "zh-CN", name: "简体中文" },
];

const dictionaries = { "en": en, "zh-CN": zh_cn };
let current = "en";

/**
 * The language to use for a setting.
 * @param {string} setting `auto` or a code from LANGUAGES
 * @param {readonly string[]} [preferred] Languages of the browser, most wanted first
 * @returns {string} A code from LANGUAGES
 */
export function resolve_language(setting, preferred = globalThis.navigator?.languages ?? []) {
    if (setting in dictionaries) {
        return setting;
    }
    for (const language of preferred) {
        const lower = language.toLowerCase();
        if (lower.startsWith("zh")) {
            return "zh-CN";
        }
        if (lower.startsWith("en")) {
            return "en";
        }
    }
    return "en";
}

export function language() {
    return current;
}

/**
 * Switches the language and translates the page. Parts that are drawn by code have to be drawn again by their owners.
 * @param {string} code A code from LANGUAGES
 */
export function set_language(code) {
    current = code in dictionaries ? code : "en";
    if (typeof document !== "undefined") {
        document.documentElement.lang = current;
        apply();
    }
}

/**
 * Translates a key. Missing keys fall back to English, then to the key itself.
 * @param {string} key
 * @param {Record<string, string|number>} [vars] Values for `{name}` placeholders
 */
export function t(key, vars) {
    const text = dictionaries[current][key] ?? en[key] ?? key;
    return vars ? text.replace(/\{(\w+)\}/g, (match, name) => name in vars ? String(vars[name]) : match) : text;
}

/**
 * Like `t` for texts that depend on a count: uses `key.one` for 1 where the language has it, else `key.other`.
 * @param {string} key
 * @param {number} count
 * @param {Record<string, string|number>} [vars]
 */
export function tn(key, count, vars) {
    const one = `${key}.one`;
    const chosen = count === 1 && one in dictionaries[current] ? one : `${key}.other`;
    return t(chosen, { count, ...vars });
}

/**
 * Translates the elements of the page that carry `data-i18n` (text), `data-i18n-title` or `data-i18n-placeholder`.
 * @param {ParentNode} [root]
 */
export function apply(root = document) {
    for (const element of root.querySelectorAll("[data-i18n]")) {
        element.textContent = t(element.dataset.i18n);
    }
    for (const element of root.querySelectorAll("[data-i18n-title]")) {
        element.title = t(element.dataset.i18nTitle);
    }
    for (const element of root.querySelectorAll("[data-i18n-placeholder]")) {
        element.placeholder = t(element.dataset.i18nPlaceholder);
    }
}
