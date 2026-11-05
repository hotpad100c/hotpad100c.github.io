import { renderMarkdown } from "./markdown.js";
import { t, getCurrentLang, setupLanguageSwitcher, translateText, isPlaceholderDesc, getProjectTranslation, loadTranslationsData } from "./i18n.js";

const root = document.querySelector("#mod-page");

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const formatBytes = (bytes) => (bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`);

const icon = (project) => {
  if (!project.icon) return element("span", "project-icon project-icon--fallback project-icon--large", project.name.slice(0, 1));
  const image = element("img", "project-icon project-icon--large");
  image.src = project.icon;
  image.alt = "";
  return image;
};

const renderFile = (file, lang) => {
  const item = element("li", "download-file");
  const info = element("div");
  info.append(element("strong", "", file.name));
  const hashStr = file.sha256
    ? ` · SHA-256 ${file.sha256.slice(0, 12)}…`
    : (file.sha512 ? ` · SHA-512 ${file.sha512.slice(0, 12)}…` : "");
  info.append(element("span", "download-file__meta", `${formatBytes(file.size)}${hashStr}`));

  const link = element("a", "download", t("btnDownload", {}, lang));
  link.href = file.url;
  link.setAttribute("download", "");
  item.append(info, link);
  return item;
};

const renderRelease = (release, latest, lang) => {
  const details = element("details", "release");
  details.open = latest;
  const summary = element("summary");
  summary.append(element("strong", "", `v${release.version}`));

  const releaseDate = release.publishedAt || release.releasedAt;
  if (releaseDate) {
    const locale = lang === "zh" ? "zh-CN" : "en-US";
    summary.append(element("span", "release__date", new Date(releaseDate).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })));
  }

  if (latest) summary.append(element("span", "tag tag--accent", t("tagLatest", {}, lang)));
  details.append(summary);

  const body = element("div", "release__body");
  const tags = element("div", "tags");
  const gameList = release.gameVersions || release.game || [];
  [...gameList.map((version) => t("mcVersion", { version }, lang)), ...(release.loaders || [])].forEach((value) => tags.append(element("span", "tag", value)));
  if (tags.childElementCount) body.append(tags);

  if (release.notes) body.append(element("p", "release__notes", release.notes));
  const files = element("ul", "download-files");
  (release.files || []).forEach((file) => files.append(renderFile(file, lang)));
  body.append(files);
  details.append(body);
  return details;
};

let currentProject = null;
let showOriginalContent = false;
const translatedMarkdownCache = new Map();
const translatedSummaryCache = new Map();

const renderProject = (project) => {
  if (!project) return;
  currentProject = project;
  const lang = getCurrentLang();
  const trans = getProjectTranslation(project, lang);

  const pageTitleName = lang === "zh" && trans.name_zh ? trans.name_zh : project.name;
  document.title = `${pageTitleName} · ${document.querySelector("#site-name").textContent}`;
  root.replaceChildren();

  const banner = element("section", "mod-banner");
  if (project.banner) {
    const image = element("img", "mod-banner__image");
    image.src = project.banner;
    image.alt = "";
    banner.append(image);
  } else {
    banner.classList.add("placeholder-banner");
  }

  const bannerContent = element("div", "mod-banner__content");
  bannerContent.append(icon(project));

  const heading = element("div");
  heading.append(element("p", "eyebrow", t("modOverview", {}, lang)));
  heading.append(element("h1", "", pageTitleName));

  const metaRow = element("div", "mod-banner__meta");
  if (project.authors && project.authors.length) {
    metaRow.append(element("span", "mod-banner__authors", t("byAuthor", { authors: project.authors.join(", ") }, lang)));
  }
  if (project.source) {
    const sourceLink = element("a", "mod-banner__source", t("sourceLink", {}, lang));
    sourceLink.href = project.source;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
    metaRow.append(sourceLink);
  }
  if (metaRow.childElementCount) heading.append(metaRow);

  const baseSummary = project.description;
  if (baseSummary || trans.description_zh) {
    let summaryText = baseSummary;
    if (lang === "zh" && trans.description_zh && !showOriginalContent) {
      summaryText = trans.description_zh;
    } else if (isPlaceholderDesc(summaryText)) {
      summaryText = t("noSummaryAvailable", {}, lang);
    }
    const summaryP = element("p", "mod-banner__summary", summaryText);
    heading.append(summaryP);

    if (lang === "zh" && !showOriginalContent && !trans.description_zh && !isPlaceholderDesc(project.description)) {
      if (translatedSummaryCache.has(project.slug)) {
        summaryP.textContent = translatedSummaryCache.get(project.slug);
      } else {
        translateText(project.description, "zh", "en").then((res) => {
          if (res) {
            translatedSummaryCache.set(project.slug, res);
            if (getCurrentLang() === "zh" && !showOriginalContent) {
              summaryP.textContent = res;
            }
          }
        });
      }
    }
  }

  bannerContent.append(heading);
  banner.append(bannerContent);
  root.append(banner);

  const layout = element("div", "mod-layout");
  const article = element("article", "mod-introduction");
  article.append(element("h2", "", t("sectionDescription", {}, lang)));

  // Machine / Manual Translation Toolbar
  const transBar = element("div", "content-trans-bar");
  const transInfo = element("div", "content-trans-info");

  const hasManualDoc = Boolean(trans.longDescription_zh && trans.longDescription_zh.trim());
  const isTranslatedActive = (lang === "zh" && !showOriginalContent) || (lang === "en" && showOriginalContent);

  let badgeText = t("transBadgeOrig", {}, lang);
  let badgeClass = "content-trans-badge is-original";
  let hintText = t("transHintOrig", {}, lang);

  if (isTranslatedActive) {
    if (hasManualDoc) {
      badgeText = t("transBadgeManual", {}, lang);
      badgeClass = "content-trans-badge is-manual";
      hintText = t("transHintManual", {}, lang);
    } else {
      badgeText = t("transBadgeMT", {}, lang);
      badgeClass = "content-trans-badge";
      hintText = t("transHintMT", {}, lang);
    }
  }

  const transBadge = element("span", badgeClass, badgeText);
  const transHint = element("span", "content-trans-hint", hintText);
  transInfo.append(transBadge, transHint);

  const toggleBtn = element(
    "button",
    "btn-toggle-trans",
    isTranslatedActive ? t("btnShowOriginal", {}, lang) : t("btnShowTranslation", {}, lang)
  );
  toggleBtn.type = "button";

  transBar.append(transInfo, toggleBtn);
  article.append(transBar);

  const descriptionBox = element("div", "long-description");
  const rawContent = project.longDescription || project.description || "";

  if (isPlaceholderDesc(rawContent) && !hasManualDoc) {
    descriptionBox.append(element("p", "empty", t("emptyDescription", {}, lang)));
    transBar.style.display = "none";
  } else if (!isTranslatedActive) {
    descriptionBox.append(renderMarkdown(rawContent));
  } else if (hasManualDoc) {
    // Show verified manual translation
    descriptionBox.append(renderMarkdown(trans.longDescription_zh));
  } else {
    // Show machine translated content
    if (translatedMarkdownCache.has(project.slug)) {
      descriptionBox.append(renderMarkdown(translatedMarkdownCache.get(project.slug)));
    } else {
      const loadingP = element("p", "loading", t("translating", {}, lang));
      descriptionBox.append(loadingP);
      toggleBtn.disabled = true;

      translateText(rawContent, "zh", "en").then((translated) => {
        toggleBtn.disabled = false;
        translatedMarkdownCache.set(project.slug, translated);
        descriptionBox.replaceChildren(renderMarkdown(translated));
      }).catch(() => {
        toggleBtn.disabled = false;
        descriptionBox.replaceChildren(renderMarkdown(rawContent));
      });
    }
  }

  toggleBtn.addEventListener("click", () => {
    showOriginalContent = !showOriginalContent;
    renderProject(project);
  });

  article.append(descriptionBox);
  layout.append(article);

  const aside = element("aside", "download-panel");
  aside.append(element("h2", "", t("sectionDownloads", {}, lang)));
  if (!project.releases || !project.releases.length) {
    aside.append(element("p", "empty", t("emptyVersions", {}, lang)));
  } else {
    project.releases.forEach((release, index) => aside.append(renderRelease(release, index === 0, lang)));
  }
  layout.append(aside);
  root.append(layout);
};

try {
  setupLanguageSwitcher(() => {
    showOriginalContent = false;
    renderProject(currentProject);
  });

  const [configResponse, catalogResponse] = await Promise.all([
    fetch("./config.json", { cache: "no-store" }),
    fetch("./catalog.json", { cache: "no-store" }),
    loadTranslationsData().catch(() => null)
  ]);
  if (!configResponse.ok || !catalogResponse.ok) throw new Error("Unable to load site data");
  const [config, catalog] = await Promise.all([configResponse.json(), catalogResponse.json()]);

  document.querySelector("#site-name").textContent = config.siteName;
  const project = catalog.projects.find((item) => item.slug === new URLSearchParams(location.search).get("project"));
  if (!project) throw new Error(t("modNotExist"));
  renderProject(project);
} catch (error) {
  root.replaceChildren(element("p", "error", `${error.message}.`));
}

