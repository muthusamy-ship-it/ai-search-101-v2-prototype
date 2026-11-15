// SEO check for the built prototype. Opens every index.html and verifies the head tags and the
// schema.org graph. Errors fail the run; warnings are listed for review.
// Usage: node tools/check-seo.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://www.maximuslabs.ai/ai-search-101'
const pages = []
;(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    if (d === ROOT && ['tools', 'assets', '.claude', '.git', 'node_modules'].includes(f)) continue
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (f === 'index.html') pages.push(p)
  }
})(ROOT)

const decode = (s = '') => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const meta = (h, attr, key) => { const m = h.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`)); return m ? decode(m[1]) : null }
const errors = [], warnings = [], seenTitle = new Map(), seenDesc = new Map(), seenCanon = new Map()
const counts = { pages: 0, schemaNodes: 0, faqPages: 0, types: {} }
const err = (rel, msg) => errors.push(`${rel} | ${msg}`)
const warn = (rel, msg) => warnings.push(`${rel} | ${msg}`)
const DASH = /[–—]/

// Every page's canonical, so cross page references (a guide pointing at its cluster) can be checked.
const allCanon = new Set(pages.map((p) => {
  const rel = path.relative(ROOT, path.dirname(p)).replace(/\\/g, '/')
  return rel ? `${SITE}/${rel}` : SITE
}))

for (const file of pages) {
  counts.pages++
  const h = fs.readFileSync(file, 'utf8')
  const rel = path.relative(ROOT, path.dirname(file)).replace(/\\/g, '/') || '(hub)'
  const kind = (h.match(/<body class="v2 k-(\w+)"/) || [])[1]
  const expectCanon = rel === '(hub)' ? SITE : `${SITE}/${rel}`

  const titles = [...h.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]))
  if (titles.length !== 1) err(rel, `${titles.length} title tags`)
  const title = titles[0] || ''
  if (!title) err(rel, 'empty title')
  else if (title.length > 70) err(rel, `title ${title.length} chars: ${title}`)
  else if (title.length > 60) warn(rel, `title ${title.length} chars: ${title}`)
  else if (title.length < 25) warn(rel, `title only ${title.length} chars: ${title}`)

  const desc = meta(h, 'name', 'description')
  if (!desc) err(rel, 'missing meta description')
  else if (desc.length > 165) err(rel, `description ${desc.length} chars`)
  else if (desc.length < 70) err(rel, `description only ${desc.length} chars: ${desc}`)
  else if (desc.length < 120) warn(rel, `description ${desc.length} chars: ${desc}`)

  for (const [label, v] of [['title', title], ['description', desc], ['og:title', meta(h, 'property', 'og:title')]]) if (v && DASH.test(v)) err(rel, `long dash in ${label}`)
  if (title) seenTitle.set(title, [...(seenTitle.get(title) || []), rel])
  if (desc) seenDesc.set(desc, [...(seenDesc.get(desc) || []), rel])

  const canon = (h.match(/<link rel="canonical" href="([^"]+)">/) || [])[1]
  if (!canon) err(rel, 'missing canonical')
  else {
    if (canon !== expectCanon) err(rel, `canonical ${canon} should be ${expectCanon}`)
    seenCanon.set(canon, [...(seenCanon.get(canon) || []), rel])
  }
  if (!meta(h, 'name', 'robots')) err(rel, 'missing robots meta')
  for (const k of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:site_name']) if (!meta(h, 'property', k)) err(rel, `missing ${k}`)
  for (const k of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) if (!meta(h, 'name', k)) err(rel, `missing ${k}`)
  if (meta(h, 'property', 'og:url') !== canon) err(rel, 'og:url differs from canonical')
  if (!/^https:\/\//.test(meta(h, 'property', 'og:image') || '')) err(rel, 'og:image is not an absolute https URL')
  if (kind === 'article' && meta(h, 'property', 'og:type') !== 'article') err(rel, 'guide og:type should be article')

  const h1 = (h.match(/<h1[\s>]/g) || []).length
  if (h1 !== 1) err(rel, `${h1} h1 headings`)
  const noAlt = [...h.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/g)].length
  if (noAlt) warn(rel, `${noAlt} images without alt`)

  // schema.org
  const blocks = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  if (!blocks.length) { err(rel, 'no JSON-LD'); continue }
  let graph = []
  for (const b of blocks) {
    try { const j = JSON.parse(b[1]); graph.push(...(j['@graph'] || [j])) } catch (e) { err(rel, `JSON-LD does not parse: ${e.message}`) }
  }
  counts.schemaNodes += graph.length
  const types = graph.map((n) => [].concat(n['@type'])).flat()
  types.forEach((t) => { counts.types[t] = (counts.types[t] || 0) + 1 })
  const need = { hub: ['CollectionPage', 'ItemList'], pillar: ['CollectionPage', 'ItemList'], cluster: ['CollectionPage', 'ItemList'], article: ['WebPage', 'Article', 'Person'], book: ['ContactPage', 'Person'] }[kind] || []
  for (const t of ['Organization', 'WebSite', 'BreadcrumbList', ...need]) if (!types.includes(t)) err(rel, `schema missing ${t}`)
  const ids = new Set(graph.map((n) => n['@id']).filter(Boolean))
  if (ids.size !== graph.filter((n) => n['@id']).length) err(rel, 'duplicate @id in graph')
  // every {"@id": ...} reference must resolve in this graph, or point at another page's #webpage
  const refs = []
  ;(function collect(v) {
    if (Array.isArray(v)) return v.forEach(collect)
    if (v && typeof v === 'object') { if (Object.keys(v).length === 1 && v['@id']) refs.push(v['@id']); else Object.values(v).forEach(collect) }
  })(graph)
  for (const r of refs) if (!ids.has(r) && !(r.endsWith('#webpage') && allCanon.has(r.replace(/#webpage$/, '')))) err(rel, `unresolved @id ${r}`)
  const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList')
  if (crumbs) {
    const items = crumbs.itemListElement || []
    if (items.at(-1)?.item !== canon) err(rel, 'last breadcrumb is not the canonical URL')
    items.forEach((it, i) => { if (it.position !== i + 1 || !it.name || !it.item) err(rel, `breadcrumb item ${i + 1} incomplete`) })
  }
  const art = graph.find((n) => n['@type'] === 'Article')
  if (art) {
    for (const k of ['headline', 'description', 'image', 'datePublished', 'dateModified', 'author', 'publisher']) if (!art[k]) (k === 'image' ? warn : err)(rel, `Article missing ${k}`)
    if (art.headline && art.headline.length > 110) err(rel, 'Article headline over 110 chars')
    if (art.datePublished && art.dateModified && art.dateModified < art.datePublished) err(rel, 'dateModified before datePublished')
  }
  const visibleFaq = (h.match(/<section class="faq" id="faq">([\s\S]*?)<\/section>/) || [])[1]
  const faqNode = graph.find((n) => n['@type'] === 'FAQPage')
  const visibleQ = visibleFaq ? (visibleFaq.match(/<details/g) || []).length : 0
  if (faqNode) {
    counts.faqPages++
    if ((faqNode.mainEntity || []).length !== visibleQ) err(rel, `FAQPage has ${faqNode.mainEntity.length} questions, page shows ${visibleQ}`)
    if ((faqNode.mainEntity || []).some((q) => !q.name || !q.acceptedAnswer?.text)) err(rel, 'FAQ question without an answer')
  } else if (visibleQ) err(rel, 'page shows FAQs but has no FAQPage schema')
  const list = graph.find((n) => n['@type'] === 'ItemList')
  if (list) for (const it of list.itemListElement || []) if (!allCanon.has(it.url)) err(rel, `ItemList links to a page that is not built: ${it.url}`)
}

for (const [map, label] of [[seenTitle, 'title'], [seenDesc, 'description'], [seenCanon, 'canonical']]) {
  for (const [v, where] of map) if (where.length > 1) (label === 'canonical' ? err : warn)(where.join(', '), `same ${label} on ${where.length} pages: ${v.slice(0, 80)}`)
}

console.log(`pages: ${counts.pages}, schema nodes: ${counts.schemaNodes}, pages with FAQ schema: ${counts.faqPages}`)
console.log('schema types:', Object.entries(counts.types).map(([k, v]) => `${k} ${v}`).join(', '))
console.log(`errors: ${errors.length}, warnings: ${warnings.length}`)
errors.slice(0, 60).forEach((e) => console.log('  ERROR', e))
warnings.slice(0, 60).forEach((w) => console.log('  WARN ', w))
if (warnings.length > 60) console.log(`  ... ${warnings.length - 60} more warnings`)
process.exitCode = errors.length ? 1 : 0
