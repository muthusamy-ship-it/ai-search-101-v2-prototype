# AI Search 101 v2 design prototype

A static, clickable build of the v2 redesign of maximuslabs.ai/ai-search-101, made from the Paper file "Orderly moon" (pages 04, 05 and 06).

It is a design prototype only. It is not the production app, it does not write anywhere, and it is set to `noindex`.

## What is in it

- **Every page:** the hub, all 9 pillars, all 56 clusters and all 136 guides, built from the real published content (Sanity public read API, read only).
- **Live chrome:** the exact nav, phone menu, search dialog and footer markup and styles from maximuslabs.ai.
- **Hero backgrounds:** from the live site's own MaxFX library, one effect per pillar:

  | Pillar | Effect |
  |---|---|
  | Hub | signal dot field |
  | GEO | citation network |
  | AEO | signal |
  | SEO | horizon |
  | Agentic SEO | woven grid |
  | Agentic Commerce | light ribbon |
  | Platforms | eight orbits |
  | Technical | pixel bloom |
  | Strategies | silk wave |
  | Future | stage light |

- **Card covers:** the first real diagram inside each guide, floated on pillar lit glass. 131 of 136 guides have one; the other 5 show the pillar name in pixel type.

## Motion

- **Scroll:** cards fade up 14px, staggered by 60ms, on the homepage's curve.
- **Cover light:** the glass highlight follows the pointer (two CSS variables, throttled with requestAnimationFrame). The diagram lifts 6px and a "Read guide" pill fades in.
- **Pillar scenes:** each loops only while it is on screen:
  - citation lines flow
  - the answer types itself
  - the agent ticks off its steps
  - the checkout completes
  - the orbits turn
  - the bars grow
  - robots.txt and llms.txt swap
- **Hub hero:**
  - the app icons drift and lean away from the cursor
  - the stats count up
  - the search placeholder types real guide topics
  - "/" focuses the search box
- **Article:**
  - a reading progress line
  - the contents list follows your scroll
  - on phones, a sticky contents bar opens into a sheet
- **Reduced motion:** visitors who ask for reduced motion get still frames everywhere.

## Ask the author and Book a call

- **Ask the author card:** on every guide, the right rail (or an inline card on phones) shows Krishna's card with a question tied to the guide's cluster.
- **Typing a question:** the reader can type one question. It goes to `/book-a-call/` in session storage, never in the URL.
- **Booking page:** the Book a call page embeds the real Cal.com event the live article button opens (`krishna-kaanth/exploring-aeo-geo`) and puts the question into the booking notes.
- **LinkedIn:** every LinkedIn link goes to https://www.linkedin.com/company/maximus-labs-ai/.

## SEO and schema

Every page has a full set of search and sharing tags, built from the same Sanity fields the live app reads.

- **Title:** the guide's SEO meta title from Sanity, kept near 60 characters. "| MaximusLabs" is added only when it still fits. Topic pages read "<topic> Guides | AI Search 101", so they never share a title with one of their guides.
- **Meta description:** the Sanity meta description, or the summary. Short ones (under 120 characters) get one extra factual line, such as the guide count or reading time. Long ones end at a sentence.
- **Canonical:** the production address on maximuslabs.ai, for example `https://www.maximuslabs.ai/ai-search-101/geo/fundamentals/query-fan-out`.
- **Sharing:** Open Graph and X card tags, with the guide's diagram as the image (the brand image when a guide has none). Guides also carry their dates, author, section and tags.
- **Robots:** the prototype says `noindex, follow`, so GitHub Pages never competes with maximuslabs.ai. Production should use `ROBOTS_LIVE` from `tools/build.mjs`: `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`.

Each page has one JSON-LD graph. The nodes link to each other by `@id`:

| Page | Schema |
|---|---|
| Hub | Organization, WebSite, CollectionPage, ItemList of pillars, BreadcrumbList |
| Pillar | Organization, WebSite, CollectionPage, ItemList of topics, ImageObject, BreadcrumbList |
| Topic | Organization, WebSite, CollectionPage, ItemList of guides in order, ImageObject, BreadcrumbList |
| Guide | Organization, WebSite, WebPage, Article (headline, image, dates, author, word count, reading time), Person (author), ImageObject, FAQPage (the same questions shown on the page), BreadcrumbList |
| Book a call | Organization, WebSite, ContactPage, Person, BreadcrumbList |

The live site today has only a basic Article and an FAQ block on guides, and no schema on hub, pillar or topic pages.

`node tools/check-seo.mjs` checks every page. It fails on:

- a missing or duplicate tag, or a canonical that is not the page's own production address;
- more than one H1;
- schema that does not parse, or a missing schema type;
- an `@id` that points nowhere, or a breadcrumb that does not end on the page;
- FAQ schema that does not match the questions on the page;
- a long dash in a title or description.

It warns on titles over 60 characters and descriptions under 120.

**Content fixes for Sanity** (the prototype works around them, the live site does not):

- **Two meta titles are long questions** (75 and 79 characters). Suggested titles are in `TITLE_SUGGESTIONS` in `tools/build.mjs`:
  - aeo-platforms-beyond-chatgpt-perplexity
  - aeo-query-types-answer-engines-prioritize
- **Seven meta titles run 61 to 67 characters**, so Google may cut the end. `check-seo.mjs` lists them.
- **Two meta descriptions run past 160 characters:**
  - what-is-aeo
  - google-ai-contribution-pilot
- **Five guides have a modified date before their publish date.** All are in strategies/content:
  - how-to-create-a-content-calendar
  - outsource-content-writing-vs-in-house-writers
  - fintech-marketing-strategy
  - evergreen-content
  - saas-marketing-funnel
- **Five guides have no cover image,** so they share the brand image:
  - aeo-platforms-beyond-chatgpt-perplexity
  - aeo-vs-seo-differences
  - aeo-query-types-answer-engines-prioritize
  - the-evolution-of-ai-search…
  - amazon-rufus-best-practices…
- **Three scraped titles end with their source site,** such as "- weareiowa.com". Search titles drop it, but the H1 still shows it.

## Link check

`node tools/check-links.mjs` checks every internal link, anchor, image, stylesheet and script on every page. Add `--external` to also test every outside URL and record where maximuslabs.ai links land.

Guide bodies link to maximuslabs.ai with site-relative paths (for example `/services/geo/`). The build points AI Search 101 links at the matching prototype page and every other link at the live site.

## Run it

```bash
node tools/fetch-data.mjs   # refresh content (optional)
node tools/build.mjs        # writes every page into this folder
npx serve .                 # or any static server
```

## Known gaps

- **New design suggestions:** the Ask the author card, the Book a call page, the "In order / Newest" switch on clusters and the reading path bar are new. The author quote and the "124 guides" count are not fields in Sanity today.
- **Dead links in guide text:** 25 outside links in guide bodies are dead on the live site too. [DEAD-LINKS.md](DEAD-LINKS.md) lists each one with its guide.
- **Guide text is verbatim:** guide bodies are shown as stored in Sanity, including any dashes in the original copy. Titles and card text drop dashes.
