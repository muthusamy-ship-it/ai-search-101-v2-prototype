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
