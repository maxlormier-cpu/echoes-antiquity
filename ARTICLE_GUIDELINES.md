# Article Guidelines for Echoes of Antiquity

These guidelines define the preferred article format for new essays and future cleanups.

## Frontmatter

Each article should include:

- `title`: visible article title.
- `seoTitle`: search title used in the document head.
- `description`: meta description used in the document head, Open Graph, Twitter Card, and JSON-LD.
- `date`: publication sorting date.
- `datePublished`: original publication date.
- `dateModified`: latest meaningful update date.
- `author`: author name.
- `category`: broad civilization or theme.
- `period`: historical period.
- `region`: geographical focus.
- `timelineYear`: historical anchor year for the timeline.
- `excerpt`: visible article summary.
- `heroImage`: path under `public/`, written without the leading slash.
- `heroAlt`: descriptive alt text.
- `heroCaption`: visible caption for the hero image.
- `tags`: article keywords.
- `featured`: whether the article can be used as a featured article.

## Recommended Article Structure

Use this order when the article supports it:

1. Short opening lead.
2. `## Key answer`
3. `## Why it matters`
4. `## At a glance`
5. `[[toc]]`
6. Main narrative H2 sections.
7. Optional `## Historical debate`
8. `## What the sources say`
9. `## Further reading on Echoes of Antiquity`
10. `## Sources and Historical Landmarks`

The `[[toc]]` marker is replaced by the generator with an article table of contents based only on H2 headings. Introductory H2 blocks such as `Key answer`, `Why it matters`, and `At a glance` are excluded from that generated table.

## Blocks

### Key Answer

Keep it between 3 and 5 sentences. It should directly answer the main historical question of the article.

### Why It Matters

Keep it between 2 and 4 sentences. Explain why the subject matters historically, especially for power, memory, myth, religion, sources, culture, or legacy.

### At a Glance

Use a Markdown table:

```markdown
| Field | Details |
| --- | --- |
| Period | ... |
| Place | ... |
| Main figures | ... |
| Main sources | ... |
| Historical issue | ... |
| Legacy | ... |
```

Only include fields supported by the article.

## Images

Use Markdown images for internal article images:

```markdown
![Descriptive alt text](assets/articles/image-name.webp "Visible caption text.")
```

The generator renders these as responsive figures with real captions. Do not present illustrations as documentary evidence when they are interpretive or AI-generated.

## Author Bio

Do not copy an author bio inside each article. Author profiles live in `content/authors.json`, and the article template renders a reusable author biography automatically from the article author metadata.

## SEO Output

The article template should generate:

- meta description from `description`, falling back to `excerpt`;
- canonical URL;
- Open Graph title, description, image, and URL;
- Twitter Card metadata;
- BlogPosting JSON-LD;
- publication and modification dates.

## Cleanup Rule

Before applying structural cleanup to all articles, test the system on one article and wait for validation.

## Trust Pages

The site should keep these generated trust pages:

- `/about/`
- `/editorial-method/`
- `/sources-policy/`

They document the author, educational purpose, editorial method, source handling, uncertainty, and the illustrative status of AI-generated images.
