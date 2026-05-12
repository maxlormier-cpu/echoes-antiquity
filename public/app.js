const search = document.querySelector("#article-search");
const grid = document.querySelector("#article-grid");
const source = document.querySelector("#article-data");
const menuToggle = document.querySelector(".menu-toggle");
const siteMenu = document.querySelector("#site-menu");
const sharePanel = document.querySelector(".share-panel");
const homeSlider = document.querySelector("[data-home-slider]");
const articleShell = document.querySelector("[data-article-slug]");
const popularData = document.querySelector("#popular-data");
const popularList = document.querySelector("#popular-list");
const popularNote = document.querySelector("#popular-note");
const popularControls = document.querySelector(".popular-controls");
const viewsKey = "eaArticleViews";
const lastViewKey = "eaLastArticleView";

if (sharePanel) {
  const currentUrl = window.location.href.split("#")[0];
  const articleTitle = document.querySelector("h1")?.textContent?.trim() || document.title;
  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(articleTitle);

  sharePanel.querySelector(".share-link-x")?.setAttribute("href", `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`);
  sharePanel.querySelector(".share-link-facebook")?.setAttribute("href", `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
}

function readJsonStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Reading statistics are optional; the site stays usable if storage is blocked.
  }
}

function escapeHtmlClient(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

if (homeSlider) {
  const slides = [...homeSlider.querySelectorAll("[data-home-slide]")];
  const buttons = [...homeSlider.querySelectorAll("[data-slide-button]")];
  let activeSlide = 0;
  let sliderTimer;

  const showSlide = (index) => {
    if (!slides.length) return;
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === activeSlide);
    });
    buttons.forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === activeSlide);
    });
  };

  const startSlider = () => {
    window.clearInterval(sliderTimer);
    sliderTimer = window.setInterval(() => showSlide(activeSlide + 1), 7000);
  };

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      showSlide(index);
      startSlider();
    });
  });

  startSlider();
}

if (articleShell) {
  const slug = articleShell.dataset.articleSlug;
  const now = Date.now();
  const lastViews = readJsonStorage(lastViewKey, {});

  if (!lastViews[slug] || now - lastViews[slug] > 30 * 60 * 1000) {
    const views = readJsonStorage(viewsKey, {});
    views[slug] = [...(views[slug] || []), now].slice(-1000);
    lastViews[slug] = now;
    writeJsonStorage(viewsKey, views);
    writeJsonStorage(lastViewKey, lastViews);
  }
}

function rangeCutoff(range) {
  const now = new Date();
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (range === "week") return Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (range === "year") return new Date(now.getFullYear(), 0, 1).getTime();
  return 0;
}

function countViews(events, range) {
  const cutoff = rangeCutoff(range);
  return (events || []).filter((timestamp) => timestamp >= cutoff).length;
}

function renderPopular(range = "all") {
  if (!popularData || !popularList) return;
  let articles = [];
  try {
    articles = JSON.parse(popularData.textContent || "[]");
  } catch {
    return;
  }

  const views = readJsonStorage(viewsKey, {});
  const ranked = articles.map((article) => ({
    ...article,
    views: countViews(views[article.slug], range)
  }));
  const hasViews = ranked.some((article) => article.views > 0);
  const top = ranked
    .sort((a, b) => (hasViews ? b.views - a.views : b.baseScore - a.baseScore) || new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  popularList.innerHTML = top.map((article, index) => `<li class="popular-item">
    <span class="popular-rank">${index + 1}</span>
    <a class="popular-thumb" href="${escapeHtmlClient(article.url)}">
      <img src="${escapeHtmlClient(article.image)}" alt="${escapeHtmlClient(article.heroAlt || "")}" loading="lazy">
    </a>
    <div>
      <p class="eyebrow">${escapeHtmlClient(article.category)} / ${escapeHtmlClient(article.period)}</p>
      <h3><a href="${escapeHtmlClient(article.url)}">${escapeHtmlClient(article.title)}</a></h3>
      <p>${escapeHtmlClient(article.excerpt)}</p>
      <div class="meta-row"><span>${hasViews ? `${article.views} read${article.views > 1 ? "s" : ""}` : "Initial ranking"}</span><span>${article.readingMinutes} min read</span></div>
    </div>
  </li>`).join("");

  if (popularNote) {
    popularNote.textContent = hasViews
      ? "Ranking calculated from article views recorded on this browser."
      : "Initial ranking shown until this browser records its first article views.";
  }
}

if (popularControls && popularList) {
  popularControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-popular-range]");
    if (!button) return;
    popularControls.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
    renderPopular(button.dataset.popularRange);
  });
  renderPopular("all");
}

if (menuToggle && siteMenu) {
  const setMenu = (open) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    siteMenu.hidden = !open;
    document.body.classList.toggle("menu-open", open);
  };

  menuToggle.addEventListener("click", () => {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (event) => {
    if (!siteMenu.hidden && !siteMenu.contains(event.target) && !menuToggle.contains(event.target)) {
      setMenu(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });
}

document.addEventListener("click", (event) => {
  const link = event.target.closest(".image-zoom");
  if (!link) return;

  event.preventDefault();
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close enlarged image">×</button>
    <img src="${link.href}" alt="${link.querySelector("img")?.alt || ""}">
  `;
  document.body.append(overlay);
  document.body.classList.add("lightbox-open");

  const close = () => {
    overlay.remove();
    document.body.classList.remove("lightbox-open");
    document.removeEventListener("keydown", onKeydown);
  };

  const onKeydown = (keyEvent) => {
    if (keyEvent.key === "Escape") close();
  };

  overlay.addEventListener("click", (clickEvent) => {
    if (clickEvent.target === overlay || clickEvent.target.classList.contains("lightbox-close")) close();
  });
  document.addEventListener("keydown", onKeydown);
});

if (search && grid && source) {
  const cards = [...grid.querySelectorAll(".article-card")];

  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    cards.forEach((card) => {
      card.hidden = query && !card.dataset.search.includes(query);
    });
  });
}
