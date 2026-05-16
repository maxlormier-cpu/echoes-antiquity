import { mkdir, readdir, readFile, rm, writeFile, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content");
const articleDir = path.join(contentDir, "articles");
const publicDir = path.join(root, "public");
const distDir = path.join(root, "dist");
const socialOnly = process.argv.includes("--social-only");
const watch = process.argv.includes("--watch");
const timelineStart = -3200;
const timelineEnd = 476;
const articleTimelineYears = {
  "aspasia-miletus-athens": -440,
  "caligula-drusilla-obsession-power-deification": 38,
  "death-of-ulysses-telegonos-greek-mythology": -1180,
  "enheduanna-first-named-author": -2300,
  "greek-trojan-founding-myths-ancient-rome": -753,
  "hammurabi-babylon-law": -1750,
  "hannibal-crossing-alps-carthage-rome": -218,
  "hapi-nile-sacred-breath-water-ancient-egypt": -2500,
  "kings-peace-antalcidas-387-386-bc": -386,
  "lilith-first-woman-bible-adam": -600,
  "minotaur-labyrinth-knossos-myth-archaeology": -1600,
  "ninth-legion-ix-hispana-disappearance-britain": 120,
  "osiris-isis-set-horus-resurrection-myth": -2400,
  "parmenion-alexander-general": -330,
  "pausanias-travel-writer-ancient-greece": 160,
  "penelope-faithful-waiting": -700,
  "sol-invictus-december-25": 274,
  "spartacus-slave-revolt-last-battle-rome": -71,
  "thermopylae-leonidas-300-spartans-480-bc": -480,
  "wenamun-egypt-byblos-cedar-odyssey": -1070
};
const timelinePeriods = [
  { slug: "first-cities", label: "First Cities", start: -3200, end: -2000, description: "Writing, divine kingship, early Egypt, and the urban worlds of the ancient Near East." },
  { slug: "bronze-age-kingdoms", label: "Bronze Age Kingdoms", start: -2000, end: -1200, description: "Palaces, law codes, Minoan Crete, and the heroic memories of the Bronze Age." },
  { slug: "collapse-and-iron-age", label: "Collapse & Iron Age", start: -1200, end: -800, description: "After the Bronze Age collapse, old empires weaken and new powers learn to negotiate." },
  { slug: "archaic-mediterranean", label: "Archaic Mediterranean", start: -800, end: -500, description: "Greek epic, early Rome, biblical traditions, and the reshaping of Mediterranean memory." },
  { slug: "classical-age", label: "Classical Age", start: -500, end: -323, description: "Persian wars, Athenian politics, Greek diplomacy, and the rise of Macedonia." },
  { slug: "hellenistic-roman-republic", label: "Hellenistic & Republic", start: -323, end: -27, description: "From Alexander's successors to Rome's Republican crises and Mediterranean conquest." },
  { slug: "roman-empire", label: "Roman Empire", start: -27, end: 235, description: "Imperial Rome, provincial frontiers, Greek memory under Roman power, and court politics." },
  { slug: "late-antiquity", label: "Late Antiquity", start: 235, end: 476, description: "Religious transformation, imperial crisis, and the symbolic twilight of the western empire." }
];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseValue(raw) {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return value.replace(/^["']|["']$/g, "");
}

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return [{}, source];
  const data = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    data[line.slice(0, separator).trim()] = parseValue(line.slice(separator + 1));
  }
  return [data, match[2].trim()];
}

function isAbsoluteUrl(value = "") {
  return /^https?:\/\//i.test(value);
}

function imageSrc(value = "") {
  if (!value) return "";
  return isAbsoluteUrl(value) ? value : `/${value.replace(/^\//, "")}`;
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="nofollow noopener noreferrer" target="_blank">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  const headings = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = trimmed.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugify(text);
      if (level === 2) headings.push({ id, text });
      html.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\((\S+)(?:\s+"([^"]+)")?\)$/);
    if (image) {
      flushParagraph();
      flushList();
      const [, alt, src, caption] = image;
      html.push(`<figure class="article-figure">
        <a class="image-zoom" href="${escapeHtml(imageSrc(src))}">
          <img src="${escapeHtml(imageSrc(src))}" alt="${escapeHtml(alt)}" loading="lazy">
        </a>
        ${caption ? `<figcaption>${inlineMarkdown(caption)}</figcaption>` : ""}
      </figure>`);
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2));
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return { html: html.join("\n"), headings };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00Z`));
}

function formatHistoricalYear(year) {
  if (!Number.isFinite(year)) return "";
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

function timelinePercent(year) {
  return ((year - timelineStart) / (timelineEnd - timelineStart)) * 100;
}

function periodRoute(period) {
  return `timeline/${period.slug}/`;
}

function readingTime(markdown) {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

async function loadSite() {
  return JSON.parse(await readFile(path.join(contentDir, "site.json"), "utf8"));
}

async function loadArticles() {
  const files = (await readdir(articleDir)).filter((file) => file.endsWith(".md") && !file.startsWith("_"));
  const articles = [];
  for (const file of files) {
    const raw = await readFile(path.join(articleDir, file), "utf8");
    const [meta, body] = parseFrontmatter(raw);
    const slug = meta.slug || file.replace(/\.md$/, "");
    const timelineYear = Number(meta.timelineYear ?? articleTimelineYears[slug]);
    const rendered = markdownToHtml(body);
    articles.push({
      ...meta,
      slug,
      timelineYear: Number.isFinite(timelineYear) ? timelineYear : null,
      body,
      html: rendered.html,
      headings: rendered.headings,
      readingMinutes: meta.readingMinutes || readingTime(body)
    });
  }
  return articles.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function absoluteUrl(site, route = "") {
  if (isAbsoluteUrl(route)) return route;
  return `${site.url.replace(/\/$/, "")}/${route.replace(/^\//, "")}`;
}

function renderHeaderMenu(articles) {
  const groups = [...Map.groupBy(articles, (article) => article.category).entries()].sort(([a], [b]) => a.localeCompare(b));
  return `<nav class="drawer-menu" id="site-menu" aria-label="Civilization archive" hidden>
    <div class="drawer-menu-head">
      <strong>Civilizations</strong>
      <span>${articles.length} essays</span>
    </div>
    <div class="drawer-civilizations">
      ${groups.map(([topic, items]) => {
        const periods = [...new Set(items.map((article) => article.period))].sort();
        return `<a class="drawer-civilization" href="/topics/${slugify(topic)}/">
          <span class="drawer-civilization-title">${escapeHtml(topic)}</span>
          <span class="drawer-civilization-meta">${items.length} article${items.length > 1 ? "s" : ""}</span>
          <span class="drawer-civilization-periods">${periods.map((period) => escapeHtml(period)).join(" · ")}</span>
        </a>`;
      }).join("")}
    </div>
    <a class="drawer-all-topics" href="/topics/">Browse all civilizations</a>
  </nav>`;
}

function renderTimelineNav() {
  return `<nav class="site-timeline" aria-label="Chronological timeline from 3200 BCE to 476 CE">
    <div class="timeline-scale">
      <span>${formatHistoricalYear(timelineStart)}</span>
      <strong>Explore by period</strong>
      <span>${formatHistoricalYear(timelineEnd)}</span>
    </div>
    <div class="timeline-track">
      ${timelinePeriods.map((period) => {
        const span = ((period.end - period.start) / (timelineEnd - timelineStart)) * 100;
        const midpoint = Math.round((period.start + period.end) / 2);
        return `<a class="timeline-segment" href="/${periodRoute(period)}" style="--span:${span.toFixed(3)}" title="${escapeHtml(`${period.label}: ${formatHistoricalYear(period.start)} - ${formatHistoricalYear(period.end)}`)}">
          <span>${escapeHtml(period.label)}</span>
          <small>${formatHistoricalYear(midpoint)}</small>
        </a>`;
      }).join("")}
    </div>
  </nav>`;
}

function layout(site, page) {
  const title = page.title === site.name ? site.name : `${page.title} | ${site.name}`;
  const description = page.description || site.description;
  const image = page.image ? absoluteUrl(site, page.image) : "";
  return `<!doctype html>
<html lang="${escapeHtml(site.language || "en")}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="google-site-verification" content="XMJF9tTfLXkHZKFZ2GnaWsmC5vsu3knQ_q9CUDMfRLM">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${page.type || "website"}">
  <meta property="og:url" content="${escapeHtml(absoluteUrl(site, page.route || ""))}">
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${escapeHtml(absoluteUrl(site, page.route || ""))}">
  <link rel="alternate" type="application/rss+xml" href="/rss.xml" title="${escapeHtml(site.name)}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" href="/styles.css">
  <script src="/app.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="header-main">
      <div class="header-left">
        <button class="menu-toggle" type="button" aria-label="Open archive folders" aria-expanded="false" aria-controls="site-menu">
          <span></span><span></span><span></span>
        </button>
        <a class="brand" href="/">
          <span class="brand-mark" aria-hidden="true">EA</span>
          <span><strong>${escapeHtml(site.name)}</strong><small>${escapeHtml(site.tagline)}</small></span>
        </a>
      </div>
      <nav class="top-nav" aria-label="Primary">
        <a href="/timeline/">Timeline</a>
        <a href="/author/">Author</a>
        <a href="/topics/">Topics</a>
        <a href="/popular/">Most Read</a>
        <a href="mailto:${escapeHtml(site.email)}">Contact</a>
      </nav>
    </div>
    ${page.menu || ""}
    ${renderTimelineNav()}
  </header>
  <main id="main">${page.body}</main>
  <footer class="site-footer">
    <div>
      <strong>${escapeHtml(site.name)}</strong>
      <p>${escapeHtml(site.description)}</p>
    </div>
    <div class="footer-links">
      <a href="/sitemap.xml">Sitemap</a>
      <a href="mailto:${escapeHtml(site.email)}">Contact</a>
    </div>
  </footer>
</body>
</html>`;
}

function articleCard(article, variant = "standard") {
  const searchText = [article.title, article.excerpt, article.category, article.period, article.region, ...(article.tags || [])].join(" ");
  return `<article class="article-card ${variant}" data-search="${escapeHtml(searchText.toLowerCase())}">
    <a class="card-media" href="/articles/${article.slug}/" aria-label="${escapeHtml(article.title)}">
      <img src="${escapeHtml(imageSrc(article.heroImage))}" alt="${escapeHtml(article.heroAlt || "")}" loading="lazy">
    </a>
    <div class="card-copy">
      <p class="eyebrow">${escapeHtml(article.category)} / ${escapeHtml(article.period)}</p>
      <h3><a href="/articles/${article.slug}/">${escapeHtml(article.title)}</a></h3>
      <p>${escapeHtml(article.excerpt)}</p>
      <div class="meta-row">
        <span>${formatDate(article.date)}</span>
        <span>${article.readingMinutes} min read</span>
      </div>
    </div>
  </article>`;
}

function timelineCard(article, period) {
  const distance = period ? timelineDistance(article, period) : 0;
  return `<article class="article-card timeline-card" data-search="${escapeHtml([article.title, article.excerpt, article.category, article.period, article.region, ...(article.tags || [])].join(" ").toLowerCase())}">
    <a class="card-media" href="/articles/${article.slug}/" aria-label="${escapeHtml(article.title)}">
      <img src="${escapeHtml(imageSrc(article.heroImage))}" alt="${escapeHtml(article.heroAlt || "")}" loading="lazy">
    </a>
    <div class="card-copy">
      <p class="eyebrow">${escapeHtml(article.category)} / ${escapeHtml(formatHistoricalYear(article.timelineYear))}</p>
      <h3><a href="/articles/${article.slug}/">${escapeHtml(article.title)}</a></h3>
      <p>${escapeHtml(article.excerpt)}</p>
      <div class="meta-row">
        <span>${escapeHtml(article.period)}</span>
        ${period ? `<span>${distance === 0 ? "Inside this period" : `${distance} years from this period`}</span>` : ""}
      </div>
    </div>
  </article>`;
}

function topicPills(articles) {
  const topics = [...new Set(articles.map((article) => article.category))].sort();
  return topics.map((topic) => `<a class="pill" href="/topics/${slugify(topic)}/">${escapeHtml(topic)}</a>`).join("");
}

function timelineArticles(articles) {
  return articles.filter((article) => Number.isFinite(article.timelineYear));
}

function timelineDistance(article, period) {
  if (!Number.isFinite(article.timelineYear)) return Number.POSITIVE_INFINITY;
  if (article.timelineYear >= period.start && article.timelineYear <= period.end) return 0;
  return Math.min(Math.abs(article.timelineYear - period.start), Math.abs(article.timelineYear - period.end));
}

function rankTimelineArticles(articles, period) {
  const midpoint = (period.start + period.end) / 2;
  return timelineArticles(articles)
    .sort((a, b) => timelineDistance(a, period) - timelineDistance(b, period) || Math.abs(a.timelineYear - midpoint) - Math.abs(b.timelineYear - midpoint) || a.title.localeCompare(b.title));
}

function randomHomeArticles(articles, excludedSlugs) {
  return articles
    .filter((article) => !excludedSlugs.has(article.slug))
    .map((article) => ({ article, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, 5)
    .map(({ article }) => article);
}

function renderHomeSlider(articles, featured) {
  const latest = articles[0];
  const selected = [];
  const seen = new Set();
  const push = (article, label) => {
    if (!article || seen.has(article.slug)) return;
    seen.add(article.slug);
    selected.push({ article, label });
  };

  push(latest, latest?.slug === featured?.slug ? "Latest Article / Featured" : "Latest Article");
  push(featured, "Featured");
  for (const article of randomHomeArticles(articles, seen)) push(article, "Article to Discover");

  return `<section class="hero-slider" data-home-slider aria-label="Featured articles">
    ${selected.map(({ article, label }, index) => `<a class="hero-slide${index === 0 ? " is-active" : ""}" href="/articles/${article.slug}/" data-home-slide>
      <img src="${escapeHtml(imageSrc(article.heroImage))}" alt="${escapeHtml(article.heroAlt || "")}">
      <span class="slide-badge">${escapeHtml(label)}</span>
      <strong>${escapeHtml(article.title)}</strong>
    </a>`).join("")}
    <div class="slider-controls" aria-label="Choose an article">
      ${selected.map((_, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-slide-button="${index}" aria-label="Show article ${index + 1}"></button>`).join("")}
    </div>
  </section>`;
}

function renderHome(site, articles) {
  const featured = articles.find((article) => article.featured) || articles[0];
  const latest = articles.filter((article) => article.slug !== featured.slug).slice(0, 6);
  const body = `
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Ancient worlds, modern reading</p>
      <h1>${escapeHtml(site.name)}</h1>
      <p>${escapeHtml(site.description)}</p>
      <div class="hero-actions">
        <a class="button primary" href="/articles/${featured.slug}/">Read the feature</a>
        <a class="button secondary" href="/topics/">Explore topics</a>
      </div>
    </div>
    ${renderHomeSlider(articles, featured)}
  </section>
  <section class="topic-band" aria-label="Topics">
    ${topicPills(articles)}
  </section>
  <section class="section-heading">
    <div>
      <p class="eyebrow">Latest essays</p>
      <h2>Structured for discovery, built for reading</h2>
    </div>
    <label class="search-box">
      <span>Search</span>
      <input type="search" id="article-search" placeholder="Rome, Sappho, Babylon...">
    </label>
  </section>
  <section class="article-grid" id="article-grid">
    ${latest.map((article) => articleCard(article)).join("\n")}
  </section>
  <script type="application/json" id="article-data">${JSON.stringify(articles.map(({ title, excerpt, category, period, slug }) => ({ title, excerpt, category, period, slug })))}</script>`;
  return layout(site, { title: site.name, route: "", description: site.description, menu: renderHeaderMenu(articles), body });
}

function renderAuthor(site, articles) {
  const body = `<section class="page-hero compact author-hero">
    <p class="eyebrow">Author</p>
    <h1>History, Ancient Culture, and archaeology</h1>
    <p>I am a professor of History and Ancient Culture in Paris, after studying archaeology between Paris and the Oriental Institute of Chicago.</p>
  </section>
  <section class="author-page">
    <div class="author-copy">
      <p>With Echoes of Antiquity, I want to help readers discover or rediscover subjects that fascinate me: forgotten figures, unusual episodes, and ancient questions that still speak to our world.</p>
      <p>The site is built as a space for curiosity, narrative history, and ancient memory, with attention to the civilizations, myths, objects, and people that still deserve to be seen again.</p>
    </div>
  </section>`;
  return layout(site, { title: "Author", route: "author/", description: "About the author of Echoes of Antiquity.", menu: renderHeaderMenu(articles), body });
}

function popularData(articles) {
  return articles.map((article, index) => ({
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    period: article.period,
    date: article.date,
    readingMinutes: article.readingMinutes,
    image: imageSrc(article.heroImage),
    heroAlt: article.heroAlt || "",
    url: `/articles/${article.slug}/`,
    baseScore: articles.length - index
  }));
}

function popularRow(article, index) {
  return `<li class="popular-item">
    <span class="popular-rank">${index + 1}</span>
    <a class="popular-thumb" href="/articles/${article.slug}/">
      <img src="${escapeHtml(imageSrc(article.heroImage))}" alt="${escapeHtml(article.heroAlt || "")}" loading="lazy">
    </a>
    <div>
      <p class="eyebrow">${escapeHtml(article.category)} / ${escapeHtml(article.period)}</p>
      <h3><a href="/articles/${article.slug}/">${escapeHtml(article.title)}</a></h3>
      <p>${escapeHtml(article.excerpt)}</p>
      <div class="meta-row"><span>${formatDate(article.date)}</span><span>${article.readingMinutes} min read</span></div>
    </div>
  </li>`;
}

function renderPopular(site, articles) {
  const fallback = articles.slice(0, 5);
  const body = `<section class="page-hero compact">
    <p class="eyebrow">Most Read</p>
    <h1>The articles readers return to most</h1>
    <p>A ranking of the five most-read essays, filtered by time period.</p>
  </section>
  <section class="popular-section">
    <div class="popular-controls" role="tablist" aria-label="Ranking period">
      <button class="is-active" type="button" data-popular-range="all">All time</button>
      <button type="button" data-popular-range="today">Today</button>
      <button type="button" data-popular-range="week">This week</button>
      <button type="button" data-popular-range="year">This year</button>
    </div>
    <p class="popular-note" id="popular-note">Initial ranking shown until this browser records its first article views.</p>
    <ol class="popular-list" id="popular-list">
      ${fallback.map((article, index) => popularRow(article, index)).join("")}
    </ol>
  </section>
  <script type="application/json" id="popular-data">${JSON.stringify(popularData(articles))}</script>`;
  return layout(site, { title: "Most Read", route: "popular/", description: "Ranking of the most-read articles on Echoes of Antiquity.", menu: renderHeaderMenu(articles), body });
}

function renderTopics(site, articles) {
  const groups = Map.groupBy(articles, (article) => article.category);
  const body = `<section class="page-hero compact">
    <p class="eyebrow">Topics</p>
    <h1>Browse by civilization and theme</h1>
    <p>Each topic page is generated automatically from article metadata.</p>
  </section>
  <section class="topic-list">
    ${[...groups.entries()].sort().map(([topic, items]) => `<a class="topic-row" href="/topics/${slugify(topic)}/"><span>${escapeHtml(topic)}</span><strong>${items.length}</strong></a>`).join("")}
  </section>`;
  return layout(site, { title: "Topics", route: "topics/", description: "Browse Echoes of Antiquity by topic.", menu: renderHeaderMenu(articles), body });
}

function renderTimeline(site, articles) {
  const ordered = timelineArticles(articles).sort((a, b) => a.timelineYear - b.timelineYear);
  const body = `<section class="page-hero compact timeline-hero">
    <p class="eyebrow">Chronological explorer</p>
    <h1>From 3200 BCE to 476 CE</h1>
    <p>Click a period on the timeline to surface the essays closest to that historical moment.</p>
  </section>
  <section class="timeline-browser" aria-label="Timeline periods">
    ${timelinePeriods.map((period) => `<a class="timeline-period-row" href="/${periodRoute(period)}">
      <span>
        <strong>${escapeHtml(period.label)}</strong>
        <em>${formatHistoricalYear(period.start)} - ${formatHistoricalYear(period.end)}</em>
      </span>
      <small>${escapeHtml(period.description)}</small>
    </a>`).join("")}
  </section>
  <section class="timeline-list">
    <div class="section-heading"><div><p class="eyebrow">All dated essays</p><h2>Articles in chronological order</h2></div></div>
    <div class="timeline-rows">
      ${ordered.map((article) => `<a class="timeline-article-row" href="/articles/${article.slug}/">
        <time>${formatHistoricalYear(article.timelineYear)}</time>
        <span><strong>${escapeHtml(article.title)}</strong><small>${escapeHtml(article.category)} / ${escapeHtml(article.period)}</small></span>
      </a>`).join("")}
    </div>
  </section>`;
  return layout(site, { title: "Timeline", route: "timeline/", description: "Browse Echoes of Antiquity through a clickable ancient timeline from 3200 BCE to 476 CE.", menu: renderHeaderMenu(articles), body });
}

function renderTimelinePeriod(site, period, articles) {
  const ranked = rankTimelineArticles(articles, period).slice(0, 9);
  const body = `<section class="page-hero compact timeline-hero">
    <p class="eyebrow">Timeline selection</p>
    <h1>${escapeHtml(period.label)}</h1>
    <p>${formatHistoricalYear(period.start)} - ${formatHistoricalYear(period.end)}. ${escapeHtml(period.description)}</p>
  </section>
  <section class="section-heading">
    <div>
      <p class="eyebrow">Closest essays</p>
      <h2>Articles nearest to this period</h2>
    </div>
    <a class="button secondary" href="/timeline/">Full timeline</a>
  </section>
  <section class="article-grid">${ranked.map((article) => timelineCard(article, period)).join("\n")}</section>`;
  return layout(site, {
    title: `${period.label} Timeline`,
    route: periodRoute(period),
    description: `Articles closest to ${period.label}, ${formatHistoricalYear(period.start)} to ${formatHistoricalYear(period.end)}.`,
    menu: renderHeaderMenu(articles),
    body
  });
}

function renderTopic(site, topic, articles, allArticles = articles) {
  const body = `<section class="page-hero compact">
    <p class="eyebrow">Topic</p>
    <h1>${escapeHtml(topic)}</h1>
    <p>${articles.length} article${articles.length > 1 ? "s" : ""} in this collection.</p>
  </section>
  <section class="article-grid">${articles.map((article) => articleCard(article)).join("\n")}</section>`;
  return layout(site, { title: topic, route: `topics/${slugify(topic)}/`, description: `${topic} articles from Echoes of Antiquity.`, menu: renderHeaderMenu(allArticles), body });
}

function adBlock(site, slotName) {
  if (!site.adsense?.enabled || !site.adsense?.[slotName]) return "";
  return `<div class="ad-slot"><ins class="adsbygoogle" data-ad-client="${escapeHtml(site.adsense.client)}" data-ad-slot="${escapeHtml(site.adsense[slotName])}"></ins></div>`;
}

function renderSharePanel(site, article) {
  const articleUrl = absoluteUrl(site, `articles/${article.slug}/`);
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(article.title);
  return `<div class="share-panel" aria-label="Share this article">
          <span class="share-panel-label">Share this article</span>
          <div class="share-links">
            <a class="share-link share-link-x" href="https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" rel="noopener noreferrer" aria-label="Share on X">X</a>
            <a class="share-link share-link-instagram" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Open Instagram to share this article">Instagram</a>
            <a class="share-link share-link-facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">Facebook</a>
          </div>
        </div>`;
}

function renderArticle(site, article, articles) {
  const related = articles
    .filter((item) => item.slug !== article.slug && (item.category === article.category || item.period === article.period))
    .slice(0, 3);
  const toc = article.headings.length
    ? `<aside class="toc"><strong>In this essay</strong>${article.headings.map((heading) => `<a href="#${heading.id}">${escapeHtml(heading.text)}</a>`).join("")}</aside>`
    : "";
  const body = `<article class="article-shell" data-article-slug="${escapeHtml(article.slug)}">
    <header class="article-hero">
      <div>
        <p class="eyebrow">${escapeHtml(article.category)} / ${escapeHtml(article.period)} / ${escapeHtml(article.region)}</p>
        <h1>${escapeHtml(article.title)}</h1>
        ${renderSharePanel(site, article)}
        <p>${escapeHtml(article.excerpt)}</p>
        <div class="meta-row"><span>${formatDate(article.date)}</span><span>${article.readingMinutes} min read</span></div>
      </div>
      <a class="image-zoom article-hero-image" href="${escapeHtml(imageSrc(article.heroImage))}">
        <img src="${escapeHtml(imageSrc(article.heroImage))}" alt="${escapeHtml(article.heroAlt || "")}">
      </a>
    </header>
    ${adBlock(site, "articleTopSlot")}
    <div class="article-layout">
      ${toc}
      <div class="article-content">${article.html}</div>
    </div>
    ${adBlock(site, "articleMidSlot")}
  </article>
  <section class="related">
    <div class="section-heading"><div><p class="eyebrow">Keep reading</p><h2>Related essays</h2></div></div>
    <div class="article-grid">${related.map((item) => articleCard(item)).join("\n")}</div>
  </section>`;
  return layout(site, {
    title: article.title,
    route: `articles/${article.slug}/`,
    description: article.excerpt,
    image: article.heroImage,
    type: "article",
    menu: renderHeaderMenu(articles),
    body
  });
}

function renderRss(site, articles) {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${escapeHtml(site.name)}</title>
  <link>${escapeHtml(site.url)}</link>
  <description>${escapeHtml(site.description)}</description>
  ${articles.map((article) => `<item>
    <title>${escapeHtml(article.title)}</title>
    <link>${escapeHtml(absoluteUrl(site, `articles/${article.slug}/`))}</link>
    <guid>${escapeHtml(absoluteUrl(site, `articles/${article.slug}/`))}</guid>
    <pubDate>${new Date(`${article.date}T12:00:00Z`).toUTCString()}</pubDate>
    <description>${escapeHtml(article.excerpt)}</description>
  </item>`).join("\n")}
</channel>
</rss>`;
}

function renderSitemap(site, articles) {
  const topicRoutes = [...new Set(articles.map((article) => article.category))].map((topic) => `topics/${slugify(topic)}/`);
  const timelineRoutes = ["timeline/", ...timelinePeriods.map((period) => periodRoute(period))];
  const routes = ["", "author/", "topics/", "popular/", ...timelineRoutes, ...topicRoutes, ...articles.map((article) => `articles/${article.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url><loc>${escapeHtml(absoluteUrl(site, route))}</loc></url>`).join("\n")}
</urlset>`;
}

function socialTeaser(site, article) {
  const url = absoluteUrl(site, `articles/${article.slug}/`);
  return `X / Threads
${article.title}
${article.excerpt}
${url}

Facebook
${article.title}

${article.excerpt}

Read it here: ${url}

LinkedIn
New on ${site.name}: ${article.title}

A concise historical essay on ${article.category.toLowerCase()}, ${article.period.toLowerCase()}, and why this story still matters.

${url}`;
}

async function writeSocial(site, articles) {
  const socialDir = path.join(distDir, "social");
  await mkdir(socialDir, { recursive: true });
  for (const article of articles) {
    await writeFile(path.join(socialDir, `${article.slug}.txt`), socialTeaser(site, article));
  }
}

async function build() {
  const site = await loadSite();
  const articles = await loadArticles();
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  if (!socialOnly) {
    await cp(publicDir, distDir, { recursive: true });
    await writeFile(path.join(distDir, "index.html"), renderHome(site, articles));
    await mkdir(path.join(distDir, "author"), { recursive: true });
    await writeFile(path.join(distDir, "author", "index.html"), renderAuthor(site, articles));
    await mkdir(path.join(distDir, "topics"), { recursive: true });
    await writeFile(path.join(distDir, "topics", "index.html"), renderTopics(site, articles));
    await mkdir(path.join(distDir, "popular"), { recursive: true });
    await writeFile(path.join(distDir, "popular", "index.html"), renderPopular(site, articles));
    await mkdir(path.join(distDir, "timeline"), { recursive: true });
    await writeFile(path.join(distDir, "timeline", "index.html"), renderTimeline(site, articles));
    for (const period of timelinePeriods) {
      const out = path.join(distDir, "timeline", period.slug);
      await mkdir(out, { recursive: true });
      await writeFile(path.join(out, "index.html"), renderTimelinePeriod(site, period, articles));
    }
    const groups = Map.groupBy(articles, (article) => article.category);
    for (const [topic, items] of groups) {
      const out = path.join(distDir, "topics", slugify(topic));
      await mkdir(out, { recursive: true });
      await writeFile(path.join(out, "index.html"), renderTopic(site, topic, items, articles));
    }
    for (const article of articles) {
      const out = path.join(distDir, "articles", article.slug);
      await mkdir(out, { recursive: true });
      await writeFile(path.join(out, "index.html"), renderArticle(site, article, articles));
    }
    await writeFile(path.join(distDir, "rss.xml"), renderRss(site, articles));
    await writeFile(path.join(distDir, "sitemap.xml"), renderSitemap(site, articles));
    await writeFile(path.join(distDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl(site, "sitemap.xml")}\n`);
  }
  await writeSocial(site, articles);
  console.log(`Built ${articles.length} articles in ${path.relative(root, distDir)}`);
}

await build();

if (watch) {
  const { watch: fsWatch } = await import("node:fs");
  console.log("Watching content and public files...");
  for (const dir of [contentDir, publicDir]) {
    fsWatch(dir, { recursive: true }, async () => {
      try {
        await build();
      } catch (error) {
        console.error(error);
      }
    });
  }
}
