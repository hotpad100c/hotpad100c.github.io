(() => {
  const media = matchMedia("(prefers-color-scheme: light)");
  const systemTheme = () => (media.matches ? "light" : "dark");
  const stored = () => {
    try {
      return localStorage.getItem("modsite-theme");
    } catch {
      return null;
    }
  };
  const apply = (theme) => {
    document.documentElement.dataset.theme = theme;
  };

  apply(stored() || systemTheme());
  media.addEventListener("change", () => {
    if (!stored()) apply(systemTheme());
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#theme-toggle")?.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      apply(next);
      try {
        // Choosing the system's own theme goes back to following the system.
        if (next === systemTheme()) localStorage.removeItem("modsite-theme");
        else localStorage.setItem("modsite-theme", next);
      } catch {}
    });
  });
})();
