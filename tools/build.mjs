// AI Search 101 v2 prototype generator.
// Reads the public Sanity content (tools/data/*.json, from fetch-data.mjs) and writes a static site:
// hub, every pillar, every cluster and every guide, with the live maximuslabs.ai nav and footer.
// Usage: node tools/build.mjs            (writes into the design-prototype folder)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'tools', 'data')
const CHROME = path.join(ROOT, 'tools', 'chrome')
const LIVE = 'https://www.maximuslabs.ai'
const AVATAR = 'https://cdn.content.maximuslabs.ai/orgs/b1d51db9-8cca-46ac-a11c-e68ef32c3c6e/avatars/fa1c5268-30a6-464c-bafe-47ddb0f74a5f.png'

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')).result
const articlesRaw = read('articles.json')
const taxonomy = read('taxonomy.json')

/* ---------- helpers ---------- */
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// House rule for copy we display in titles and cards: no em or en dashes.
const clean = (s = '') => String(s).replace(/\s*[—–]\s*/g, ': ').replace(/\s+/g, ' ').trim()
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const shortDate = (d) => { if (!d) return ''; const x = new Date(d); return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}` }
const longDate = (d) => { if (!d) return ''; const x = new Date(d); return `${x.getUTCDate()} ${MONTHS_LONG[x.getUTCMonth()]} ${x.getUTCFullYear()}` }
const hm = (m) => { m = Math.round(m || 0); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m` }
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`
const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const pad2 = (n) => String(n).padStart(2, '0')
const img = (u, w = 800) => !u ? '' : u.includes('cdn.sanity.io') ? `${u}${u.includes('?') ? '&' : '?'}w=${w}&auto=format&q=82` : u
const slugify = (t) => (t || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

/* ---------- pillar identity: glass light, live FX background, scene ---------- */
const PILLAR = {
  geo: { light: [88, 0], fx: 'network', code: 'GEO' },
  aeo: { light: [12, 0], fx: 'signal', code: 'AEO' },
  seo: { light: [50, 110], fx: 'horizon', code: 'SEO' },
  'agentic-seo': { light: [0, 100], fx: 'woven', code: 'AGENTS' },
  'agentic-commerce': { light: [100, 100], fx: 'ribbon', code: 'CART' },
  platforms: { light: [50, 0], fx: 'orbits', code: 'AI' },
  technical: { light: [100, 50], fx: 'pixel', code: 'TECH' },
  strategies: { light: [0, 50], fx: 'silk', code: 'PLAY' },
  future: { light: [50, 50], fx: 'stage', code: '2027' },
  glossary: { light: [30, 20], fx: 'glass', code: 'A-Z' },
}
// Each card gets the pillar's light, nudged by its slug so neighbouring cards never look identical.
const lightFor = (pillar, seed) => {
  const [x, y] = (PILLAR[pillar] || PILLAR.geo).light, h = hash(seed || pillar)
  const clamp = (v) => Math.max(-10, Math.min(110, v))
  return [clamp(x + ((h % 31) - 15)), clamp(y + (((h >> 5) % 25) - 12))]
}
const glass = (pillar, seed) => { const [x, y] = lightFor(pillar, seed); return `--gx:${x}%;--gy:${y}%` }

/* ---------- content model ---------- */
const firstBodyImage = (a) => {
  const pt = (a.body || []).find((b) => b._type === 'image' && b.url)
  if (pt) return { url: pt.url, alt: pt.alt }
  const m = (a.bodyHtml || '').match(/<img[^>]+src="([^"]+)"[^>]*?(?:alt="([^"]*)")?/i)
  return m ? { url: m[1], alt: m[2] || '' } : null
}
const articles = articlesRaw.map((a) => ({
  ...a,
  title: clean(a.title),
  excerpt: clean((a.excerpt || '').replace(/^Here's a description within your word limit:\s*/i, '')),
  cover: (a.thumb && a.thumb.url && a.thumb) || (a.hero && a.hero.url && a.hero) || firstBodyImage(a),
  author: a.author && a.author.name ? a.author : { name: 'Krishna Kaanth M', designation: 'CEO', avatarUrl: AVATAR },
}))
const pillars = taxonomy.map((p) => {
  const clusters = p.clusters.map((c) => {
    const list = articles.filter((a) => a.p === p.slug && a.c === c.slug).sort((x, y) => (x.order - y.order) || String(x.datePublished).localeCompare(String(y.datePublished)))
    return { ...c, title: clean(c.title), pillar: p.slug, articles: list, minutes: list.reduce((s, a) => s + (a.readingTime || 0), 0) }
  }).filter((c) => c.articles.length)
  const all = clusters.flatMap((c) => c.articles)
  return { ...p, title: clean(p.title), clusters, articles: all, minutes: all.reduce((s, a) => s + (a.readingTime || 0), 0) }
}).filter((p) => p.articles.length)
pillars.forEach((p, i) => { p.n = i + 1; p.clusters.forEach((c, j) => { c.n = j + 1 }) })
const P = Object.fromEntries(pillars.map((p) => [p.slug, p]))
const C = (ps, cs) => P[ps] && P[ps].clusters.find((c) => c.slug === cs)
const live = pillars.flatMap((p) => p.articles)
const totalMin = live.reduce((s, a) => s + (a.readingTime || 0), 0)
const totalClusters = pillars.reduce((s, p) => s + p.clusters.length, 0)
const newest = [...live].filter((a) => a.datePublished).sort((a, b) => b.datePublished.localeCompare(a.datePublished))

/* ---------- paths ---------- */
const urlOf = { hub: () => '', pillar: (p) => `${p}/`, cluster: (p, c) => `${p}/${c}/`, article: (a) => `${a.p}/${a.c}/${a.slug}/` }

/* ---------- live chrome (exact markup from maximuslabs.ai) ---------- */
const chromeRaw = Object.fromEntries(['nav', 'footer', 'drawer', 'cmdk'].map((k) => [k, fs.readFileSync(path.join(CHROME, `${k}.html`), 'utf8')]))
// Links that point into AI Search 101 open the matching prototype page; every other site link
// (root relative like "/services/geo/" or absolute) opens the real page on maximuslabs.ai.
// Guide bodies (verbatim from Sanity) carry a few maximuslabs.ai links that are dead on the live
// site or redirect into AI Search 101. Found by `node tools/check-links.mjs --external`.
const MOVED = {
  '/generative-engine-optimization/geo-common-mistakes-avoid': '/ai-search-101/geo/common-mistakes/geo-common-mistakes-avoid', // 404 live
  '/generative-engine-optimization/geo-common-mistakes': '/ai-search-101/geo/common-mistakes/geo-common-mistakes-avoid', // 404 live
  '/company/case-studies/e-commerce/nutrition-seo-agentic-commerce-case-study': '/company/case-studies', // 404 live
  '/programmatic-seo': '/ai-search-101/geo/advanced/programmatic-geo-automation', // live redirect
  '/programmatic-seo-guide': '/ai-search-101/geo/advanced/programmatic-geo-automation', // live redirect
}
function fixLinks(h, pre) {
  return h
    .replace(/href="(?:https?:\/\/(?:www\.)?maximuslabs\.ai)?(\/[^"#?]*?)\/?"/g, (m, p) => (MOVED[p] ? `href="${MOVED[p]}/"` : m))
    .replace(/src="https?:\/\/(?:www\.)?maximuslabs\.ai\/logo\.png"/g, `src="${pre}assets/live/logo-mark.svg"`) // 404 live
    .replace(/href="(?:https?:\/\/(?:www\.)?maximuslabs\.ai)?\/ai-search-101\/?([^"#?]*)([^"]*)"/g, (_m, rest, tail) => {
      const r = rest.replace(/\/$/, '')
      if (!r) return `href="${pre || './'}${tail}"`
      const [p, c, a] = r.split('/')
      const ok = a ? live.some((x) => x.p === p && x.c === c && x.slug === a) : c ? !!C(p, c) : !!P[p]
      return ok ? `href="${pre}${r}/${tail}"` : `href="${LIVE}/ai-search-101/${r}${tail}"`
    })
    .replace(/href="\/(?!\/)/g, `href="${LIVE}/`)
}
function chrome(pre) {
  return Object.fromEntries(Object.entries(chromeRaw).map(([k, v]) => [k, fixLinks(v, pre)]))
}

/* ---------- small pieces ---------- */
const arrow = (c = 'currentColor', s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" stroke="${c}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const clock = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 3.2V6l1.8 1.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`
const chev = `<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true"><path d="M2.5 1.5 5 4 2.5 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`
const meter = (level) => { const n = { Beginner: 1, Intermediate: 2, Advanced: 3 }[level]; if (!n) return ''; return `<span class="meter" title="${esc(level)}" aria-label="Difficulty: ${esc(level)}">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>` }
const crumbs = (pre, items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map((it, i) => (i ? chev : '') + (it.href != null ? `<a href="${pre}${it.href}">${esc(it.label)}</a>` : `<span aria-current="page">${esc(it.label)}</span>`)).join('')}</nav>`
const label = (strong, rest) => `<div class="label">${strong ? `<span class="sky">${esc(strong)}</span>` : ''}${strong && rest ? '<i class="dot"></i>' : ''}${rest ? `<span>${esc(rest)}</span>` : ''}</div>`
const sectionHead = (eyebrow, title, sub, extra = '') => `<div class="sec-head reveal"><div class="sec-l"><div class="eyebrow">${esc(eyebrow)}</div><h2 class="h2">${esc(title)}</h2></div><div class="sec-r"><p>${esc(sub)}</p>${extra}</div></div>`

/* ---------- cover: real diagram on pillar lit glass, or the pillar word ---------- */
function cover(a, cls = '') {
  const style = glass(a.p, a.slug)
  if (a.cover && a.cover.url) return `<div class="cover ${cls}" style="${style}" data-light><img class="shot" src="${esc(img(a.cover.url, 900))}" alt="${esc(a.cover.alt || '')}" loading="lazy" decoding="async"></div>`
  return `<div class="cover cover-word ${cls}" style="${style}" data-light><span class="word">${esc(P[a.p] ? P[a.p].shortLabel || PILLAR[a.p].code : 'AI')}</span></div>`
}
const byline = (a, small) => `<div class="byline"><span class="who"><img src="${esc(a.author.avatarUrl || AVATAR)}" alt="" width="28" height="28" loading="lazy"><span>${esc(a.author.name)}</span></span><span class="when">${small ? '' : clock}<b>${a.readingTime || 0} min</b><em>· ${shortDate(a.datePublished)}</em></span></div>`

function articleCard(pre, a, extra = '') {
  const p = P[a.p], c = C(a.p, a.c)
  return `<a class="card a-card reveal ${extra}" href="${pre}${urlOf.article(a)}" data-date="${esc(a.datePublished || '')}" data-order="${a.order}">
  ${cover(a)}
  <div class="body">${label(p.shortLabel || p.title, c ? c.title : '')}<h3>${esc(a.title)}</h3>${a.excerpt ? `<p>${esc(a.excerpt)}</p>` : ''}</div>
  ${byline(a)}
  <span class="read-pill">Read guide ${arrow('#080808', 12)}</span>
</a>`
}

/* ---------- pillar scenes (animated in site.css / site.js) ---------- */
const I = (pre, n) => `${pre}assets/live/icons/${n}-app-icon.png`
const S = (pre, n) => `${pre}assets/live/platforms/${n}.svg`
const scenes = {
  geo: (pre, wide) => `<div class="scene sc-geo${wide ? ' wide' : ''}">
    ${wide ? `<svg class="lines" viewBox="0 0 792 320" preserveAspectRatio="none" aria-hidden="true"><path d="M408 132 C 470 132, 500 76, 560 76"/><path d="M408 150 C 520 150, 590 128, 682 128"/><path d="M408 168 C 470 168, 500 212, 548 222"/><path d="M408 186 C 520 186, 600 262, 668 262"/><path class="hot" d="M408 158 C 500 158, 560 176, 624 176"/></svg>
    <span class="src" style="left:540px;top:56px"><img src="${S(pre, 'reddit')}" alt=""></span><span class="src" style="left:682px;top:108px"><img src="${S(pre, 'linkedin')}" alt=""></span><span class="src" style="left:548px;top:202px"><img src="${S(pre, 'g2')}" alt=""></span><span class="src" style="left:668px;top:242px"><img src="${S(pre, 'youtube')}" alt=""></span>
    <span class="you" style="left:612px;top:150px"><b>YOU</b><span><strong>Cited source</strong><small>4 of 5 engines</small></span></span>` : ''}
    <div class="panel chatgpt"><div class="ph"><img src="${I(pre, 'chatgpt')}" alt=""><b>ChatGPT</b><small>Search</small></div><div class="q">Best AI code review tool for a 50 engineer team?</div><p class="ans" data-type="Lintwise reviews every pull request, learns your team's conventions and plugs straight into GitHub."><strong>Lintwise</strong> <span class="typed">reviews every pull request, learns your team's conventions and plugs straight into GitHub.</span></p><div class="chips"><span><img src="${S(pre, 'reddit')}" alt="">reddit.com</span><span><img src="${S(pre, 'g2')}" alt="">g2.com</span><span class="me">lintwise.dev</span></div></div>
  </div>`,
  aeo: (pre) => `<div class="scene sc-aeo"><div class="panel pplx"><div class="ph"><img src="${I(pre, 'perplexity')}" alt=""><b>Perplexity</b></div><div class="q">What is answer engine optimization?</div><div class="srcs"><span class="on"><i>1</i>lintwise.dev</span><span><i>2</i>wikipedia.org</span><span><i>3</i>reddit.com</span></div><p class="ans">AEO structures your content so answer engines quote it directly as the answer <em>[1]</em>.</p><div class="skel"><i></i><i style="width:70%"></i></div></div></div>`,
  'agentic-commerce': (pre) => `<div class="scene sc-cart"><div class="bubble">Reorder my trail shoes, size 10, under $150</div><div class="panel shop"><div class="ph dark"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 1.5l1.6 4.2 4.4.3-3.4 2.8 1.1 4.3L8 10.7 4.3 13.1l1.1-4.3L2 6l4.4-.3z" fill="#0070E0"/></svg><b>Shopping agent</b><small data-cycle="compared 14 stores|checked 2,140 reviews|price locked at $129">compared 14 stores</small></div><div class="prod"><span class="thumb"><svg width="30" height="30" viewBox="0 0 30 30" fill="none"><path d="M4 19c4 0 6-6 9-6l3 3c2 1 6 1 9 2v4H4z" fill="#0E3A86"/><path d="M4 23h21" stroke="#0070E0" stroke-width="2" stroke-linecap="round"/></svg></span><span class="pt"><b>Trail runner, size 10</b><small><svg width="11" height="11" viewBox="0 0 16 16"><path d="M8 1.5l1.9 4.3 4.6.4-3.5 3 1.1 4.6L8 11.4l-4.1 2.4 1.1-4.6-3.5-3 4.6-.4z" fill="#F5A623"/></svg> 4.8 · 2,140 reviews</small></span><b class="price">$129</b></div><div class="buy"><span class="spin"></span><svg class="ok" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5l2.5 2.5L11 4.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="t1">Buying for you…</span><span class="t2">Ordered by agent · arrives Thu</span></div></div></div>`,
  'agentic-seo': () => `<div class="scene sc-agent"><div class="panel term"><div class="th"><i></i><i></i><i></i><span>research-agent · run 214</span></div><div class="tb"><div class="cmd">&gt; shortlist("SOC 2 tools for startups")</div><div class="step"><span class="st"></span>Read 38 vendor pages</div><div class="step"><span class="st"></span>Checked pricing, G2, docs</div><div class="step"><span class="st"></span>Ranking 3 finalists</div><div class="step"><span class="st"></span>Shortlist sent to buyer</div><div class="bar"><i></i></div><div class="foot"><span class="stepn">step 1 of 4</span><span class="pct">0%</span></div></div></div></div>`,
  seo: (pre) => `<div class="scene sc-seo"><div class="panel serp"><div class="sbox"><img src="${I(pre, 'google')}" alt=""><span>best crm for seed stage startups</span></div><div class="aio"><div class="ah"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 .5C6.4 3.4 8.6 5.6 11.5 6 8.6 6.4 6.4 8.6 6 11.5 5.6 8.6 3.4 6.4.5 6 3.4 5.6 5.6 3.4 6 .5z" fill="#8AB4F8"/></svg>AI Overview</div><i></i><i style="width:82%"></i><div class="ac"><span class="me">your-site.com</span><span>+ 4 sites</span></div></div><div class="res"><small>your-site.com › guides</small><b>The 2026 CRM buyer guide for startups</b><i></i></div><div class="res dim"><i style="width:40%"></i><i class="ln" style="width:70%"></i></div></div></div>`,
  platforms: (pre) => `<div class="scene sc-orbit"><div class="ring r1"></div><div class="ring r2"></div><div class="core"></div><div class="orbit">${['chatgpt', 'gemini', 'claude', 'perplexity', 'copilot', 'meta-ai', 'google', 'grok'].map((n, i) => `<span class="sat" style="--i:${i}"><img src="${I(pre, n)}" alt="${n}"></span>`).join('')}</div></div>`,
  technical: () => `<div class="scene sc-code"><div class="panel code"><div class="tabs"><span class="on" data-tab="robots">robots.txt</span><span data-tab="llms">llms.txt</span></div><pre class="pane robots"><b>User-agent:</b> GPTBot\n<b>Allow:</b> /guides/\n<b>User-agent:</b> PerplexityBot\n<b>Allow:</b> /\n<i># let answer engines read you</i></pre><pre class="pane llms"><b># </b>Lintwise\n<b>&gt; </b>AI code review for teams\n<b>## </b>Docs\n- /docs/setup\n- /pricing</pre></div></div>`,
  strategies: () => `<div class="scene sc-sov"><div class="panel sov"><div class="sh"><span>AI share of voice</span><em>+12 pts</em></div>${[['You', 34, 68, 1], ['Rival A', 22, 44], ['Rival B', 17, 34]].map(([n, v, w, me]) => `<div class="row${me ? ' me' : ''}"><div class="rl"><span>${n}</span><span>${v}%</span></div><div class="track"><i style="--w:${w}%"></i></div></div>`).join('')}</div></div>`,
  future: () => `<div class="scene sc-future"><div class="dots"></div><div class="tl"><div><small>2015</small><span>Links</span></div><div><small>2024</small><span>Answers</span></div><div class="now"><small>2027</small><span class="px">Agents</span></div></div></div>`,
  glossary: () => `<div class="scene sc-future"><div class="dots"></div></div>`,
}

function pillarCard(pre, p, mode) {
  const sc = (scenes[p.slug] || scenes.glossary)(pre, mode === 'featured')
  const href = `${pre}${urlOf.pillar(p.slug)}`
  if (mode === 'area') return `<a class="card area-card reveal" href="${href}"><div class="cover scene-cover" style="${glass(p.slug, p.slug)}" data-light>${sc}</div><div class="body">${label(`${plural(p.clusters.length, 'cluster')} · ${plural(p.articles.length, 'guide')}`)}<h3>${esc(p.title)}</h3><p>${esc(p.summary || '')}</p></div><div class="byline"><span class="when"><b>${hm(p.minutes)} read</b></span><span class="go">Explore ${arrow()}</span></div></a>`
  if (mode === 'featured') return `<a class="card pillar-card featured reveal" href="${href}"><div class="cover scene-cover" style="${glass(p.slug, p.slug)}" data-light>${sc}</div><div class="body two"><div class="bl">${label(`Pillar ${pad2(p.n)}`, 'Start here')}<h3 class="big">${esc(p.title)}</h3><p>${esc(p.summary || '')}</p></div><div class="stats"><div><span>Clusters</span><b class="px" data-count="${p.clusters.length}">${p.clusters.length}</b></div><div><span>Guides</span><b class="px" data-count="${p.articles.length}">${p.articles.length}</b></div><div><span>Reading</span><b class="px">${hm(p.minutes)}</b></div></div></div><div class="byline"><span class="who"><img src="${AVATAR}" alt="" width="28" height="28"><span>Written by <strong>Krishna Kaanth M</strong>, CEO</span></span><span class="go">Explore ${esc(p.shortLabel || p.title)} ${arrow()}</span></div></a>`
  return `<a class="card pillar-card reveal" href="${href}"><div class="cover scene-cover" style="${glass(p.slug, p.slug)}" data-light>${sc}</div><div class="body">${label(`Pillar ${pad2(p.n)}`, `${plural(p.clusters.length, 'cluster')} · ${plural(p.articles.length, 'guide')}`)}<h3>${esc(p.title)}</h3><p>${esc(p.summary || '')}</p></div><div class="byline"><span class="who"><img src="${AVATAR}" alt="" width="28" height="28"><span class="mono">${hm(p.minutes)} read</span></span><span class="go">Explore ${esc(p.shortLabel || '')} ${arrow()}</span></div></a>`
}

function clusterCard(pre, c) {
  const first = c.articles[0]
  return `<a class="card c-card reveal" href="${pre}${urlOf.cluster(c.pillar, c.slug)}">
  ${cover(first, 'short')}
  <div class="body"><div class="row-sb">${label(`Cluster ${pad2(c.n)}`, c.level || '')}${meter(c.level)}</div><h3>${esc(c.title)}</h3><p>${esc(clean(c.summary || ''))}</p>
  <ol class="preview">${c.articles.slice(0, 3).map((a, i) => `<li><span class="n">${pad2(i + 1)}</span><span class="t">${esc(a.title)}</span><span class="m">${a.readingTime || 0}m</span></li>`).join('')}</ol></div>
  <div class="byline"><span class="who"><img src="${AVATAR}" alt="" width="26" height="26"><span class="mono">${plural(c.articles.length, 'guide')} · ${hm(c.minutes)}</span></span><span class="go">Open ${arrow()}</span></div>
</a>`
}

function startWith(pre, list, head = 'Start with these') {
  const mins = list.reduce((s, a) => s + (a.readingTime || 0), 0)
  return `<div class="start-panel reveal"><div class="sp-head"><span class="sky">${esc(head)}</span><span>${plural(list.length, 'guide')} · ${hm(mins)}</span></div>${list.map((a, i) => `<a class="sp-row${i === 0 ? ' first' : ''}" href="${pre}${urlOf.article(a)}">${a.cover ? `<img src="${esc(img(a.cover.url, 240))}" alt="" loading="lazy">` : `<span class="noimg" style="${glass(a.p, a.slug)}"></span>`}<span class="sp-t"><b>${esc(a.title)}</b><small>${i === 0 ? '<em>Start here</em>' : pad2(i + 1) + ' ·'} ${a.readingTime || 0} min</small></span>${arrow()}</a>`).join('')}</div>`
}

/* ---------- page shell ---------- */
function page({ pre, title, desc, body, fx, kind }) {
  const ch = chrome(pre)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc || '')}">
<meta name="robots" content="noindex">
<link rel="icon" href="${pre}assets/live/logo-full.svg">
<link rel="stylesheet" href="${pre}assets/css/live-nav-plan.css">
<link rel="stylesheet" href="${pre}assets/css/live-baselayout.css">
<link rel="stylesheet" href="${pre}assets/css/site.css">
</head>
<body class="v2 k-${kind}" data-root="${pre || './'}"${fx ? ` data-fx="${fx}"` : ''}>
<div class="page">
${ch.nav}
${ch.drawer}
${ch.cmdk}
<div class="toast" id="toast">This page is coming soon.</div>
<div class="proto-flag" role="note">Design prototype · v2 · real content from AI Search 101</div>
<main id="main">
${body}
</main>
<section class="sec is-fluid" id="footer" aria-label="Site footer">${ch.footer}</section>
</div>
<script src="${pre}assets/js/live-baselayout.js" defer></script>
<script src="${pre}assets/js/maximus-fx.js" defer></script>
<script src="${pre}assets/js/site.js" defer></script>
</body>
</html>`
}

/* ---------- Ask the author (article rail + phone inline) and the Book a call page ---------- */
const LINKEDIN = 'https://www.linkedin.com/company/maximus-labs-ai/'
const CAL_LINK = 'krishna-kaanth/exploring-aeo-geo' // the same Cal.com event the live article CTA opens
const authored = articlesRaw.filter((x) => x.author && x.author.name === 'Krishna Kaanth M').length
const proof = (pre) => `<div class="ask-proof"><small>Results with</small><span><img src="${pre}assets/live/clients/explorium.png" alt="Explorium" height="14"><img src="${pre}assets/live/clients/oliv-ai.svg" alt="Oliv AI" height="16"><img src="${pre}assets/live/clients/luca.png" alt="Luca AI" height="14"></span></div>`
const liIcon = (pre) => `<a class="ask-li" href="${LINKEDIN}" target="_blank" rel="noopener" aria-label="MaximusLabs on LinkedIn"><img src="${S(pre, 'linkedin')}" alt="" width="13" height="13"></a>`
function askCard(pre, a, c, mode) {
  const data = `action="${pre}book-a-call/" data-ask data-guide="${esc(a.title)}" data-topic="${esc(c.title)}" data-url="${esc(urlOf.article(a))}"`
  const id = `ask-${mode}`
  const btn = `<button type="submit" class="ask-btn"><span class="t-def">${mode === 'rail' ? 'Book a 15 min chat' : 'Book'}</span><span class="t-q">${mode === 'rail' ? 'Book with my question' : 'Book'}</span>${arrow('currentColor', 12)}</button>`
  if (mode === 'inline') return `<form class="ask ask-inline reveal" ${data}>
    <div class="ai-top"><img src="${AVATAR}" alt="Krishna Kaanth M" width="52" height="52"><span><small>Author perspective · 15 min</small><b>Krishna Kaanth M ${liIcon(pre)}</b><em>CEO, MaximusLabs</em></span></div>
    <label for="${id}" class="ai-hook">Questions about ${esc(c.title)}? Ask one and Krishna answers it on a 15 minute call.</label>
    <div class="ai-field"><input id="${id}" name="q" maxlength="280" autocomplete="off" placeholder="Type your question…">${btn}</div>
  </form>`
  return `<form class="ask ask-rail" ${data}>
  <div class="ask-glass cover" style="${glass(a.p, a.slug + 'ask')}" data-light><span class="ask-lab">Author perspective</span><span class="ask-chip"><i></i>15 min</span><img class="ask-photo" src="${AVATAR}" alt="Krishna Kaanth M" width="64" height="64"></div>
  <div class="ask-body">
    <div class="ask-who"><b>Krishna Kaanth M ${liIcon(pre)}</b><span>CEO, MaximusLabs · ${authored} guides</span></div>
    <p class="ask-quote">“I help brands turn AI search into revenue engines, not vanity metrics.”</p>
    <div class="ask-q"><label for="${id}">Questions about ${esc(c.title)}?</label><textarea id="${id}" name="q" rows="3" maxlength="280" placeholder="Ask KK one question, he answers it on the call…"></textarea>${btn}</div>
    ${proof(pre)}
  </div>
</form>`
}

function bookPage() {
  const pre = '../'
  const body = `
<section class="inner-hero-wrap"><div class="inner-hero book" data-fx-host>
  ${crumbs(pre, [{ label: 'AI Search 101', href: '' }, { label: 'Book a call' }])}
  <div class="book-cols">
    <div class="book-l">
      <div class="chips"><span class="chip-b">15 min call</span><span class="chip-o">With the author</span></div>
      <h1 class="px ih-h1">Talk to the author</h1>
      <p class="ih-sub">15 minutes with Krishna Kaanth M, CEO of MaximusLabs and author of AI Search 101. Bring one question about getting cited in AI search and leave with a clear next step.</p>
      <div class="bq">
        <div class="bq-h"><label for="bq-text">Your question</label><a class="bq-src" data-bq-src hidden href="#"></a></div>
        <textarea id="bq-text" rows="3" maxlength="280" placeholder="What do you want to ask? For example: should we test ChatGPT ads before we have any citations?"></textarea>
        <small>Added to your booking notes, so Krishna sees it before the call. Edit it any time before you pick a slot.</small>
      </div>
      <ol class="book-steps"><li><span class="px">01</span><b>Pick a time</b><em>On the calendar.</em></li><li><span class="px">02</span><b>Bring your question</b><em>It is already in your notes.</em></li><li><span class="px">03</span><b>Get a straight answer</b><em>And the first moves for your brand.</em></li></ol>
      ${proof(pre)}
      <p class="book-alt">Need the full 30 minute GEO strategy call with your category's AI answers? <a href="${LIVE}/contact-us">Book it on maximuslabs.ai</a></p>
    </div>
    <div class="cal-shell reveal">
      <div class="cal-head"><img src="${AVATAR}" alt="" width="36" height="36"><span><b>15 min chat with Krishna</b><small>Video call · your time zone</small></span><em>Cal.com</em></div>
      <div id="cal-inline" class="cal-inline"><div class="cal-loading"><i></i>Loading Krishna's calendar…</div></div>
      <div class="cal-foot">Booking runs on Cal.com, the same calendar the live article button opens. <a href="https://cal.com/${CAL_LINK}" target="_blank" rel="noopener">Open in Cal.com</a></div>
    </div>
  </div>
</div></section>`
  return page({ pre, title: 'Book a call with the author | AI Search 101', desc: '15 minutes with Krishna Kaanth M, author of AI Search 101.', body, fx: 'signal', kind: 'book' })
}

const ctaBand = () =>`<section class="cta-wrap reveal"><div class="cta-card glass-bg"><h2 class="px">Ready to turn AI search into a revenue engine?</h2><p>See how MaximusLabs gets your brand cited and chosen across ChatGPT, Perplexity, Gemini, and Google AI. Book a call for a tailored plan.</p><a class="btn-white" href="${LIVE}/contact-us">Book a call ${arrow('#080808')}</a></div></section>`

/* ---------- L1 hub ---------- */
function hub() {
  const pre = ''
  const core = pillars.filter((p) => (p.category || 'Core Disciplines') === 'Core Disciplines')
  const area = pillars.filter((p) => p.category === 'Explore by area')
  const popular = [...live].sort((a, b) => (b.readingTime || 0) - (a.readingTime || 0)).slice(0, 8)
  const icons = [['chatgpt', 168, 118, 76], ['google', 72, 300, 64], ['claude', 230, 440, 70], ['grok', 96, 560, 56], ['gemini', -238, 104, 72], ['perplexity', -124, 270, 66], ['copilot', -274, 420, 76], ['meta-ai', -134, 548, 60]]
  const suggestions = ['What is GEO?', 'ChatGPT ads', 'AI crawlers', 'Agentic commerce']
  const body = `
<section class="hub-hero-wrap">
  <div class="hub-hero glass-photo" data-fx-host>
    ${icons.map(([n, x, y, s], i) => `<img class="float-ico" src="${I(pre, n)}" alt="" style="${x < 0 ? `right:${-x - s}px` : `left:${x}px`};top:${y}px;width:${s}px;height:${s}px;--d:${(i % 4) * -1.7}s;--k:${i % 2 ? 'driftA' : 'driftB'}" data-depth="${(i % 3) + 1}">`).join('')}
    <div class="hub-hero-in">
      <div class="eyebrow-pill"><i></i>The MaximusLabs library · new guide ${shortDate(newest[0].datePublished)}</div>
      <h1 class="px hub-h1">AI Search 101</h1>
      <p class="hub-sub">Explore the essentials of AI search and learn how to get cited, get found, and turn ChatGPT, Perplexity, Gemini, and Google AI into a revenue engine.</p>
      <div class="search-wrap" data-search>
        <form class="searchbar" action="#" autocomplete="off" role="search">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="6.5" stroke="#080808" stroke-width="1.8"/><path d="M14 14l4 4" stroke="#080808" stroke-width="1.8" stroke-linecap="round"/></svg>
          <input type="search" name="q" placeholder="Search a topic..." aria-label="Search AI Search 101" data-typing='${esc(JSON.stringify(['What is GEO?', 'ChatGPT ads for B2B SaaS', 'How AI crawlers read your site', 'Agentic commerce', 'Query fan-out', 'GEO KPIs']))}'>
          <kbd>/</kbd>
          <button type="submit" aria-label="Search">${arrow('#fff', 16)}</button>
        </form>
        <ul class="search-sugg" hidden></ul>
      </div>
      <div class="try"><span>Try</span>${suggestions.map((s) => `<button type="button" class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    </div>
    <div class="stats-band">
      <div><b class="px" data-count="${live.length}">${live.length}</b><span>Guides, all free</span></div>
      <div><b class="px" data-count="${pillars.length}">${pillars.length}</b><span>Pillars, GEO to agentic commerce</span></div>
      <div><b class="px" data-count="${totalClusters}">${totalClusters}</b><span>Clusters to read in order</span></div>
      <div><b class="px">${Math.round(totalMin / 60)} hrs</b><span>Of reading, by one author</span></div>
    </div>
  </div>
</section>

<section class="vsec"><div class="vrail">
  ${sectionHead(`01 · ${core.length} pillars`, 'Core Disciplines', 'Start with a core discipline. Each is a hub of clusters and guides.')}
  <div class="grid g-core">${core.map((p, i) => pillarCard(pre, p, i === 0 ? 'featured' : '')).join('')}</div>
</div></section>

<section class="vsec bt"><div class="vrail">
  ${sectionHead(`02 · ${area.length} areas`, 'Explore by area', 'Go deeper by platform, technical area, strategy, and what comes next.')}
  <div class="grid g-4">${area.map((p) => pillarCard(pre, p, 'area')).join('')}</div>
</div></section>

<section class="vsec bt"><div class="vrail">
  ${sectionHead('03 · Latest', 'Newest guides', 'Fresh from the MaximusLabs research desk.')}
  <div class="grid g-3">${newest.slice(0, 6).map((a) => articleCard(pre, a)).join('')}</div>
</div></section>

<section class="vsec bt"><div class="vrail">
  ${sectionHead('04 · Reference shelf', 'Most read', 'The guides teams reference most.')}
  <ol class="ranked">${popular.map((a, i) => `<li class="reveal"><a href="${pre}${urlOf.article(a)}"><span class="rk px">${pad2(i + 1)}</span>${a.cover ? `<img src="${esc(img(a.cover.url, 300))}" alt="" loading="lazy">` : `<span class="noimg" style="${glass(a.p, a.slug)}"></span>`}<span class="rt"><b>${esc(a.title)}</b><small>${esc(P[a.p].shortLabel || '')} · ${a.readingTime} min</small></span>${arrow()}</a></li>`).join('')}</ol>
</div></section>
${ctaBand()}`
  return page({ pre, title: 'AI Search 101 | MaximusLabs', desc: 'The AI Search 101 library', body, fx: 'signal', kind: 'hub' })
}

/* ---------- L2 pillar ---------- */
function pillarPage(p) {
  const pre = '../'
  const top5 = p.clusters.flatMap((c) => c.articles).slice(0, 5)
  const body = `
<section class="inner-hero-wrap"><div class="inner-hero" data-fx-host>
  ${crumbs(pre, [{ label: 'AI Search 101', href: '' }, { label: p.shortLabel || p.title }])}
  <div class="ih-cols">
    <div class="ih-l">
      <div class="chips"><span class="chip-b">Pillar ${pad2(p.n)}</span><span class="chip-o">${esc(p.category || 'Core Disciplines')}</span></div>
      <h1 class="px ih-h1">${esc(p.title)}</h1>
      <p class="ih-sub">${esc(p.summary || '')}</p>
      <div class="ih-stats"><div><b class="px" data-count="${p.clusters.length}">${p.clusters.length}</b><span>Clusters</span></div><div><b class="px" data-count="${p.articles.length}">${p.articles.length}</b><span>Guides</span></div><div><b class="px">${hm(p.minutes)}</b><span>Of reading</span></div></div>
    </div>
    ${startWith(pre, top5)}
  </div>
</div></section>
<section class="vsec"><div class="vrail">
  ${sectionHead(`${plural(p.clusters.length, 'cluster')} · ${plural(p.articles.length, 'guide')}`, `Explore ${p.shortLabel || p.title}`, 'Pick a cluster to dive into its guides.')}
  <div class="grid g-3">${p.clusters.map((c) => clusterCard(pre, c)).join('')}</div>
</div></section>
${ctaBand()}`
  return page({ pre, title: `${p.title} | AI Search 101`, desc: p.summary, body, fx: PILLAR[p.slug]?.fx, kind: 'pillar' })
}

/* ---------- L3 cluster ---------- */
function clusterPage(p, c) {
  const pre = '../../'
  const [first, ...rest] = c.articles
  const latest = [...c.articles].sort((a, b) => String(b.datePublished).localeCompare(String(a.datePublished)))[0]
  const body = `
<section class="inner-hero-wrap"><div class="inner-hero" data-fx-host>
  ${crumbs(pre, [{ label: 'AI Search 101', href: '' }, { label: p.shortLabel || p.title, href: urlOf.pillar(p.slug) }, { label: c.title }])}
  <div class="ih-cols">
    <div class="ih-l">
      <div class="chips"><span class="chip-b">Cluster ${pad2(c.n)}</span>${c.level ? `<span class="chip-o">${esc(c.level)} ${meter(c.level)}</span>` : ''}</div>
      <h1 class="px ih-h1">${esc(c.title)}</h1>
      <p class="ih-sub">${esc(clean(c.summary || ''))}</p>
      <div class="ih-stats"><div><b class="px" data-count="${c.articles.length}">${c.articles.length}</b><span>${c.articles.length === 1 ? 'Guide' : 'Guides'}</span></div><div><b class="px">${hm(c.minutes)}</b><span>Of reading</span></div><div><b class="px">${shortDate(latest.datePublished)}</b><span>Last updated</span></div></div>
    </div>
    ${startWith(pre, c.articles.slice(0, 5), c.articles.length > 1 ? 'Read in order' : 'Start here')}
  </div>
  ${c.articles.length > 1 ? `<div class="path reveal"><div class="path-h"><span>Reading path</span><span>${c.minutes} min in total</span></div><div class="path-row">${c.articles.map((a, i) => `<a class="seg" style="flex:${a.readingTime || 1}" href="${pre}${urlOf.article(a)}"><i></i><span>${pad2(i + 1)} · ${esc(a.title.split(':')[0].slice(0, 34))} <em>${a.readingTime}m</em></span></a>`).join('')}</div></div>` : ''}
</div></section>
<section class="vsec"><div class="vrail">
  ${sectionHead(`${plural(c.articles.length, 'guide')} · in reading order`, 'Guides in this cluster', 'Read in order, or jump to what you need.', c.articles.length > 2 ? `<div class="seg-toggle" role="tablist" data-sort><button class="on" data-sort-key="order">In order</button><button data-sort-key="date">Newest</button></div>` : '')}
  <a class="card feat-guide reveal" href="${pre}${urlOf.article(first)}">${cover(first, 'tall')}<div class="fg-body"><div><span class="px fg-n">01</span><h3>${esc(first.title)}</h3><p>${esc(first.excerpt)}</p></div><div class="fg-foot">${byline(first, true)}<span class="btn-blue">Start reading ${arrow('#fff', 12)}</span></div></div><span class="start-tag">Start here</span></a>
  ${rest.length ? `<div class="grid g-4 sortable" data-sortable>${rest.map((a, i) => `<a class="card g-card reveal" href="${pre}${urlOf.article(a)}" data-date="${esc(a.datePublished || '')}" data-order="${i + 2}">${cover(a, 'short')}<div class="body"><span class="px g-n">${pad2(i + 2)}</span><h3>${esc(a.title)}</h3><p>${esc(a.excerpt)}</p></div><div class="byline"><span class="when"><b>${a.readingTime || 0} min</b><em>· ${shortDate(a.datePublished)}</em></span><span class="go">${arrow()}</span></div></a>`).join('')}</div>` : ''}
</div></section>
${ctaBand()}`
  return page({ pre, title: `${c.title} | AI Search 101`, desc: c.summary, body, fx: PILLAR[p.slug]?.fx, kind: 'cluster' })
}

/* ---------- L4 article ---------- */
const TOC_MARKER = /\[toc=([^\]]*)\]/i
const cleanHeadingText = (inner) => inner.replace(/<[^>]+>/g, '').replace(/\s*\[toc=[^\]]*\]\s*/i, ' ').replace(/\s+/g, ' ').trim()
function htmlBody(a) {
  let h = (a.bodyHtml || '')
    .replace(/&lt;\/?(?:li|ul|ol)\s*&gt;/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
  h = h.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (full, inner) => {
    if (/<thead/i.test(inner) || /<caption/i.test(inner)) return full
    const rows = [...inner.replace(/<colgroup[\s\S]*?<\/colgroup>/gi, '').matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((rm) => [...rm[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((x) => x[1].replace(/^\s*<p>([\s\S]*?)<\/p>\s*$/i, '$1').trim()))
    if (rows.length < 2) return full
    const plain = (x) => x.replace(/<[^>]+>/g, '').trim()
    let cap = '', hi = 0
    const filled = rows[0].filter((x) => plain(x))
    if (filled.length === 1 && rows[0].length > 1) { cap = plain(filled[0]); hi = 1 }
    return `<table>${cap ? `<caption>${cap}</caption>` : ''}<thead><tr>${(rows[hi] || []).map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.slice(hi + 1).map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  })
  h = h.replace(/<div class="article-table-wrapper">\s*(<table[\s\S]*?<\/table>)\s*<\/div>/gi, '$1').replace(/(<table[\s\S]*?<\/table>)/gi, '<div class="table-wrap">$1</div>')
  h = h.replace(/(?:<p>)?\s*\[maxview\]([\s\S]*?)\[\/maxview\]\s*(?:<\/p>)?/gi, (_m, t) => `<div class="callout"><span class="co-ic"></span><div><span class="lab">The MaximusLabs view</span><p>${String(t).trim()}</p></div></div>`)
  const toc = []
  let n = 0
  h = h.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_f, attrs, inner) => {
    const display = cleanHeadingText(inner), m = inner.replace(/<[^>]+>/g, '').match(TOC_MARKER)
    const id = slugify(display), lbl = ((m && m[1].trim()) || display).replace(/^(?:Q?\d+[.)]\s+)/, '')
    toc.push({ id, text: lbl }); n++
    // Headings that already carry their own number ("3. Where…") skip the generated one.
    const numbered = /^\s*(?:Q?\d+[.)])\s/.test(display)
    return `<h2 id="${id}" data-n="${numbered ? '' : pad2(n)}"><a class="anchor" href="#${id}" aria-label="Link to section"></a>${inner.replace(/\s*\[toc=[^\]]*\]\s*/gi, ' ').trim()}</h2>`
  })
  h = h.replace(/<img /gi, '<img loading="lazy" decoding="async" ')
  return { html: h, toc }
}
function ptBody(a) {
  const out = [], toc = []
  let list = null, n = 0
  const text = (b) => (b.children || []).map((c) => esc(c.text || '')).join('')
  const close = () => { if (list) { out.push(`</${list}>`); list = null } }
  ;(a.body || []).forEach((b, bi) => {
    if (b._type === 'block' && b.listItem) {
      const tag = b.listItem === 'number' ? 'ol' : 'ul'
      if (list !== tag) { close(); out.push(`<${tag}>`); list = tag }
      out.push(`<li>${text(b)}</li>`); return
    }
    close()
    if (b._type === 'block') {
      const t = text(b)
      if (b.style === 'h2') { const id = slugify((b.children || []).map((c) => c.text).join('')); n++; toc.push({ id, text: (a.toc && a.toc[n - 1]) || t }); out.push(`<h2 id="${id}" data-n="${pad2(n)}"><a class="anchor" href="#${id}" aria-label="Link to section"></a>${t}</h2>`) }
      else if (b.style === 'h3' || b.style === 'h4') out.push(`<${b.style}>${t}</${b.style}>`)
      else if (b.style === 'blockquote') out.push(`<blockquote><p>${t}</p></blockquote>`)
      else if (t.trim()) out.push(`<p>${t}</p>`)
    } else if (b._type === 'image' && b.url) out.push(`<figure><img src="${esc(img(b.url, 1400))}" alt="${esc(b.alt || '')}" loading="lazy"><figcaption>${esc(b.caption || '')}</figcaption></figure>`)
    else if (b._type === 'callout') out.push(`<div class="callout"><span class="co-ic"></span><div><span class="lab">${esc(b.label || 'Note')}</span><p>${esc(b.text || '')}</p></div></div>`)
    else if (b._type === 'table' && b.rows) {
      const rows = b.rows.map((r) => r.cells || []), head = b.hasHeader ? rows.shift() : null
      out.push(`<div class="table-wrap"><table>${b.caption ? `<caption>${esc(b.caption)}</caption>` : ''}${head ? `<thead><tr>${head.map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead>` : ''}<tbody>${rows.map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
    }
  })
  close()
  return { html: out.join('\n'), toc }
}

function articlePage(a) {
  const pre = '../../../'
  const p = P[a.p], c = C(a.p, a.c)
  const built = a.bodyHtml ? htmlBody(a) : ptBody(a)
  const html = fixLinks(built.html, pre), toc = built.toc
  const faq = (a.faq || []).filter((f) => f.question)
  const idx = c.articles.findIndex((x) => x.slug === a.slug)
  const prev = c.articles[idx - 1], next = c.articles[idx + 1]
  const sib = c.articles.filter((x) => x.slug !== a.slug)
  const rel = (a.related || []).map((s) => live.find((x) => x.slug === s)).filter(Boolean)
  const more = [...sib, ...rel.filter((r) => !sib.includes(r)), ...p.articles.filter((x) => x.slug !== a.slug && !sib.includes(x))].slice(0, 3)
  const tldr = (a.tldrHtml || '').replace(/&lt;\/?(?:li|ul|ol)\s*&gt;/gi, '').replace(/\sstyle="[^"]*"/gi, '')
  const hero = a.hero && a.hero.url ? a.hero : null
  const body = `
<div class="read-progress" aria-hidden="true"><i></i></div>
<section class="inner-hero-wrap"><div class="inner-hero art" data-fx-host>
  ${crumbs(pre, [{ label: 'AI Search 101', href: '' }, { label: p.shortLabel || p.title, href: urlOf.pillar(p.slug) }, { label: c.title, href: urlOf.cluster(p.slug, c.slug) }, { label: a.title.length > 46 ? a.title.slice(0, 44).trim() + '…' : a.title }])}
  <div class="art-title">
    <div class="at-l">
      <div class="chips"><span class="chip-b">${esc(c.title)}</span><span class="chip-o">${esc(p.shortLabel || p.title)}</span></div>
      <h1 class="art-h1">${esc(a.title)}</h1>
      ${a.excerpt ? `<p class="ih-sub">${esc(a.excerpt)}</p>` : ''}
    </div>
    <div class="share"><button type="button" class="ic-btn" data-copy aria-label="Copy link"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.5 9.5l3-3M7 4.5l1.2-1.2a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5l-1.2 1.2a2.5 2.5 0 0 1-3.5-3.5L5.5 8" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/></svg></button><a class="ic-btn" target="_blank" rel="noopener" href="${LINKEDIN}" aria-label="MaximusLabs on LinkedIn"><img src="${S(pre, 'linkedin')}" alt="" width="15" height="15"></a></div>
  </div>
  <div class="art-meta">
    <span class="who"><img src="${esc(a.author.avatarUrl || AVATAR)}" alt="" width="44" height="44"><span><b>${esc(a.author.name)}</b><small>${esc(a.author.designation || 'CEO')}, MaximusLabs</small></span></span>
    <span class="vr"></span>
    <span class="mi"><small>Published</small><b>${longDate(a.datePublished)}</b></span>
    <span class="mi"><small>Reading time</small><b>${a.readingTime || 0} minutes</b></span>
    ${a.dateModified ? `<span class="mi"><small>Last updated</small><b>${longDate(a.dateModified)}</b></span>` : ''}
  </div>
  ${hero ? `<figure class="art-heroimg reveal"><img src="${esc(img(hero.url, 1800))}" alt="${esc(hero.alt || '')}"></figure>` : ''}
</div></section>

<div class="m-toc" data-mtoc><button type="button" class="m-toc-bar" aria-expanded="false"><span class="m-n">01/${pad2(toc.length)}</span><span class="m-t">${esc(toc[0] ? toc[0].text : 'On this page')}</span><svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M3 4.5 6 7.5 9 4.5" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg><i class="m-prog"></i></button><ol class="m-list">${toc.map((t, i) => `<li><a href="#${t.id}"><span>${pad2(i + 1)}</span>${esc(t.text)}</a></li>`).join('')}</ol></div>

<section class="art-body"><div class="art-rail">
  <aside class="toc" aria-label="On this page"><div class="toc-in">
    <div class="toc-h"><span>On this page</span><span class="toc-count">1 / ${toc.length}</span></div>
    <div class="toc-prog"><i></i></div>
    <ol>${toc.map((t, i) => `<li><a href="#${t.id}"><span class="n">${pad2(i + 1)}</span><span>${esc(t.text)}</span></a></li>`).join('')}</ol>
    ${faq.length ? `<a class="toc-faq" href="#faq">${plural(faq.length, 'question')} answered</a>` : ''}
  </div></aside>
  <article class="prose">
    ${a.answer ? `<div class="answer reveal"><div class="lab"><svg width="14" height="14" viewBox="0 0 12 12"><path d="M6 .5C6.4 3.4 8.6 5.6 11.5 6 8.6 6.4 6.4 8.6 6 11.5 5.6 8.6 3.4 6.4.5 6 3.4 5.6 5.6 3.4 6 .5z" fill="#449AFB"/></svg>The short answer</div><p>${esc(a.answer)}</p></div>` : ''}
    ${tldr.trim() ? `<div class="tldr reveal"><div class="px">TL;DR</div>${tldr}</div>` : ''}
    ${html}
    ${faq.length ? `<section class="faq" id="faq"><div class="faq-h"><h2>Questions, answered</h2><span>${plural(faq.length, 'question')}</span></div>${faq.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary><span>${esc(f.question)}</span><i></i></summary><p>${esc(f.answer || '')}</p></details>`).join('')}</section>` : ''}
    ${askCard(pre, a, c, 'inline')}
    <div class="author-box"><img src="${esc(a.author.avatarUrl || AVATAR)}" alt="" width="72" height="72"><div><small>Written by</small><b>${esc(a.author.name)}</b><span>${esc(a.author.designation || 'CEO')}, MaximusLabs</span>${a.author.bio ? `<p>${esc(a.author.bio)}</p>` : ''}</div></div>
  </article>
  <aside class="author-rail">${askCard(pre, a, c, 'rail')}</aside>
</div></section>

<section class="vsec bt"><div class="vrail">
  <div class="sec-head reveal"><div class="sec-l"><div class="eyebrow">Keep reading</div><h2 class="h2 sm">Discover more in ${esc(c.title)}</h2></div><div class="sec-r"><a class="btn-ghost" href="${pre}${urlOf.cluster(p.slug, c.slug)}">All ${esc(c.title)} guides ${arrow()}</a></div></div>
  <div class="grid g-3">${more.map((x) => articleCard(pre, x)).join('')}</div>
  ${prev || next ? `<div class="prevnext">${prev ? `<a class="pn" href="${pre}${urlOf.article(prev)}"><span class="pn-ic">${arrow()}</span><span><small>Previous guide</small><b>${esc(prev.title)}</b></span></a>` : '<span></span>'}${next ? `<a class="pn next" href="${pre}${urlOf.article(next)}"><span><small>Next guide</small><b>${esc(next.title)}</b></span><span class="pn-ic">${arrow()}</span></a>` : '<span></span>'}</div>` : ''}
</div></section>
${ctaBand()}`
  return page({ pre, title: `${a.title} | AI Search 101`, desc: a.excerpt, body, fx: 'signal', kind: 'article' })
}

/* ---------- write ---------- */
const write = (rel, html) => { const f = path.join(ROOT, rel, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html) }
write('', hub())
write('book-a-call', bookPage())
let n = 2
for (const p of pillars) {
  write(p.slug, pillarPage(p)); n++
  for (const c of p.clusters) {
    write(`${p.slug}/${c.slug}`, clusterPage(p, c)); n++
    for (const a of c.articles) { write(`${p.slug}/${c.slug}/${a.slug}`, articlePage(a)); n++ }
  }
}
// Search index for the hub search and the nav search dialog.
const index = [
  ...pillars.map((p) => ({ t: p.title, u: urlOf.pillar(p.slug), k: 'Pillar', s: p.summary || '' })),
  ...pillars.flatMap((p) => p.clusters.map((c) => ({ t: c.title, u: urlOf.cluster(p.slug, c.slug), k: 'Cluster', s: clean(c.summary || '') }))),
  ...live.map((a) => ({ t: a.title, u: urlOf.article(a), k: 'Guide', s: a.excerpt || '', m: a.readingTime })),
]
fs.writeFileSync(path.join(ROOT, 'assets', 'search.json'), JSON.stringify(index))
fs.writeFileSync(path.join(ROOT, '.nojekyll'), '')
console.log(`wrote ${n} pages, ${index.length} search entries, ${live.length} guides, ${totalMin} min`)
