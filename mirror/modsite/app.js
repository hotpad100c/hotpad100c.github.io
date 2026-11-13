import { t, getCurrentLang, setupLanguageSwitcher, translateBatch, isPlaceholderDesc, getProjectTranslation, loadTranslationsData } from "./i18n.js";

const projectsRoot = document.querySelector("#projects");
const search = document.querySelector("#search");
const count = document.querySelector("#project-count");
const viewButtons = [...document.querySelectorAll(".view-btn")];

const readView = () => {
  try {
    return localStorage.getItem("modsite-view") === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
};

const applyView = (view) => {
  projectsRoot.classList.toggle("mod-grid--list", view === "list");
  viewButtons.forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
};

applyView(readView());
viewButtons.forEach((button) => button.addEventListener("click", () => {
  applyView(button.dataset.view);
  try {
    localStorage.setItem("modsite-view", button.dataset.view);
  } catch {}
}));

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const tag = (text) => element("span", "tag", text);

const cardImage = (project) => {
  if (!project.banner) return element("div", "mod-card__banner placeholder-banner");
  const image = element("img", "mod-card__banner");
  image.src = project.banner;
  image.alt = "";
  image.loading = "lazy";
  return image;
};

const projectIcon = (project) => {
  if (!project.icon) return element("span", "project-icon project-icon--fallback", project.name.slice(0, 1));
  const image = element("img", "project-icon");
  image.src = project.icon;
  image.alt = "";
  image.loading = "lazy";
  return image;
};

const translatedDescriptions = new Map();

const renderProject = (project, lang) => {
  const link = element("a", "mod-card");
  link.href = `mod.html?project=${encodeURIComponent(project.slug)}`;
  link.append(cardImage(project));

  const body = element("div", "mod-card__body");
  const heading = element("div", "mod-card__heading");
  heading.append(projectIcon(project));

  const text = element("div");
  const trans = getProjectTranslation(project, lang);
  const displayName = lang === "zh" && trans.name_zh ? trans.name_zh : project.name;
  text.append(element("h2", "", displayName));

  const latest = project.releases[0];
  if (latest) {
    text.append(element("p", "mod-card__version", t("latestVersion", { version: latest.version }, lang)));
  }
  heading.append(text);
  body.append(heading);

  const baseDesc = project.description;
  if (baseDesc || trans.description_zh) {
    let descText = baseDesc;
    if (lang === "zh" && trans.description_zh) {
      descText = trans.description_zh;
    } else if (isPlaceholderDesc(descText)) {
      descText = t("noSummaryAvailable", {}, lang);
    } else if (lang === "zh" && translatedDescriptions.has(project.slug)) {
      descText = translatedDescriptions.get(project.slug);
    }
    const descEl = element("p", "mod-card__description", descText);
    descEl.dataset.slug = project.slug;
    body.append(descEl);
  }

  const meta = element("div", "tags");
  if (latest) {
    latest.gameVersions.forEach((version, index) => {
      const node = tag(t("gameVersion", { version }, lang));
      if (index >= 2) node.classList.add("tag--extra");
      meta.append(node);
    });
    if (latest.gameVersions.length > 2) meta.append(element("span", "tag tag--more", `+${latest.gameVersions.length - 2}`));
    latest.loaders.forEach((value) => meta.append(tag(value)));
  }
  if (meta.childElementCount) body.append(meta);
  link.append(body);
  return link;
};

const searchableText = (project) =>
  [project.name, project.name_zh, project.description, project.description_zh, ...project.releases.flatMap((release) => [release.version, ...release.gameVersions, ...release.loaders])].filter(Boolean).join(" ").toLocaleLowerCase();

let allProjects = [];

const render = (projects, query = "") => {
  const lang = getCurrentLang();
  search.placeholder = t("searchPlaceholder", {}, lang);

  const needle = query.trim().toLocaleLowerCase();
  const visible = needle ? projects.filter((project) => searchableText(project).includes(needle)) : projects;
  projectsRoot.replaceChildren();

  count.textContent = visible.length === 1 ? t("modsCountSingle", {}, lang) : t("modsCountPlural", { count: visible.length }, lang);

  if (!visible.length) {
    return projectsRoot.append(element("p", "empty", t(projects.length ? "noMatch" : "noModsYet", {}, lang)));
  }

  visible.forEach((project) => projectsRoot.append(renderProject(project, lang)));

  // Batch translate descriptions into Chinese if needed
  if (lang === "zh") {
    const toTranslate = visible.filter((p) => {
      const trans = getProjectTranslation(p, "zh");
      if (trans.description_zh) return false;
      return p.description && !isPlaceholderDesc(p.description) && !translatedDescriptions.has(p.slug);
    });
    if (toTranslate.length) {
      translateBatch(toTranslate.map((p) => p.description), "zh", "en").then((translations) => {
        if (getCurrentLang() !== "zh") return;
        toTranslate.forEach((proj, idx) => {
          if (translations[idx]) {
            translatedDescriptions.set(proj.slug, translations[idx]);
            const el = projectsRoot.querySelector(`.mod-card__description[data-slug="${proj.slug}"]`);
            if (el) el.textContent = translations[idx];
          }
        });
      });
    }
  }
};

try {
  setupLanguageSwitcher(() => {
    render(allProjects, search.value);
  });

  const [configResponse, catalogResponse] = await Promise.all([
    fetch("./config.json", { cache: "no-store" }),
    fetch("./catalog.json", { cache: "no-store" }),
    loadTranslationsData().catch(() => null)
  ]);
  if (!configResponse.ok || !catalogResponse.ok) throw new Error("Unable to load site data");
  const [config, catalog] = await Promise.all([configResponse.json(), catalogResponse.json()]);

  allProjects = catalog.projects;
  document.title = config.siteName;
  document.querySelector("#site-name").textContent = config.siteName;

  render(allProjects);
  search.addEventListener("input", () => render(allProjects, search.value));
} catch (error) {
  projectsRoot.replaceChildren(element("p", "error", `${error.message}. Please try again later.`));
}
