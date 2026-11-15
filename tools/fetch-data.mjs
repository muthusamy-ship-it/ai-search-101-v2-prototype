// Pulls the published AI Search 101 content from Sanity's public read API (no token, read only)
// into tools/data, for build.mjs. Usage: node tools/fetch-data.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data')
const API = 'https://bict0s25.apicdn.sanity.io/v2024-01-01/data/query/production'
const queries = {
  'articles.json': `*[_type=="article" && !(_id in path("drafts.**")) && defined(slug.current) && defined(cluster->slug.current) && defined(pillar->slug.current) && (count(body)>0 || defined(bodyHtml))]{"slug":slug.current,"p":pillar->slug.current,"c":cluster->slug.current,title,excerpt,answer,readingTime,datePublished,dateModified,toc,"faq":faq[]{question,answer},author,"hero":heroImage{url,alt},"thumb":thumbnailImage{url,alt},tldrHtml,bodyHtml,"body":body[]{...,_type=="image"=>{...,"url":asset->url}},"order":coalesce(order,99),"related":relatedArticles[]->slug.current}`,
  'taxonomy.json': `*[_type=="pillar" && !(_id in path("drafts.**"))]|order(order asc){title,shortLabel,"slug":slug.current,category,summary,order,"clusters":*[_type=="cluster" && !(_id in path("drafts.**")) && references(^._id)]|order(order asc){title,"slug":slug.current,summary,level,order}}`,
}
fs.mkdirSync(OUT, { recursive: true })
for (const [file, q] of Object.entries(queries)) {
  const res = await fetch(`${API}?query=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  fs.writeFileSync(path.join(OUT, file), await res.text())
  console.log('saved', file)
}
