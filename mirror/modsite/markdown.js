import { marked } from "./vendor/marked.esm.js";
import DOMPurify from "./vendor/purify.es.mjs";

const escapeHtml = (str = "") =>
  str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));

const safeUrl = (value = "") => {
  try {
    const base = typeof location !== "undefined" ? location.href : "https://example.com";
    const url = new URL(value, base);
    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
      return url.href;
    }
    if (/^(?:\/|\.\/|\.\.\/|#)/.test(value)) {
      return value;
    }
    return "#";
  } catch {
    return /^(?:\/|\.\/|\.\.\/|#)/.test(value) ? value : "#";
  }
};

const customRenderer = {
  link({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    const targetHref = safeUrl(href);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<a href="${targetHref}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
  },
  image({ href, title, text }) {
    const targetHref = safeUrl(href);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${targetHref}" alt="${escapeHtml(text || "")}" loading="lazy"${titleAttr}>`;
  }
};

marked.use({
  gfm: true,
  breaks: true,
  renderer: customRenderer
});

export const parseMarkdownToHtml = (markdown = "") => {
  const rawHtml = marked.parse(markdown || "");
  if (DOMPurify && DOMPurify.isSupported && typeof DOMPurify.sanitize === "function") {
    return DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target", "rel", "loading"]
    });
  }
  return rawHtml;
};

export const renderMarkdown = (markdown = "") => {
  const html = parseMarkdownToHtml(markdown);
  if (typeof document !== "undefined" && document.createElement) {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content;
  }
  return html;
};
