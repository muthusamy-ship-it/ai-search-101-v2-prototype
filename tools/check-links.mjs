// Link check for the built prototype. Opens every index.html, then verifies every href and src:
// internal pages and files exist, in-page #anchors exist, and every external URL answers (following
// redirects, recording where it lands). Usage: node tools/check-links.mjs [--external]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const checkExternal = process.argv.includes('--external')
const pages = []
;(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    if (d === ROOT && ['tools', 'assets', '.claude', '.git', 'node_modules'].includes(f)) continue
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (f === 'index.html') pages.push(p)
  }
})(ROOT)

const idsCache = new Map()
const idsOf = (file) => {
  if (!idsCache.has(file)) idsCache.set(file, new Set([...fs.readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])))
  return idsCache.get(file)
}
const problems = [], external = new Map()
let refs = 0
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8'), dir = path.dirname(page)
  const rel = path.relative(ROOT, page).replace(/\\/g, '/')
  for (const m of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const url = m[2].replace(/&amp;/g, '&')
    if (!url || /^(mailto:|tel:|javascript:|data:)/.test(url)) continue
    refs++
    if (/^https?:\/\//.test(url)) { if (!external.has(url)) external.set(url, new Set()); external.get(url).add(rel); continue }
    if (url.startsWith('#')) { if (url.length > 1 && !idsOf(page).has(decodeURIComponent(url.slice(1)))) problems.push([rel, url, 'missing anchor']); continue }
    const [p0, hash] = url.split('#'), clean = p0.split('?')[0]
    let target = path.resolve(dir, clean)
    if (clean.endsWith('/') || clean === '' || clean === '.' || clean === './') target = path.join(target, 'index.html')
    if (!fs.existsSync(target)) { problems.push([rel, url, 'missing file']); continue }
    if (hash && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(hash))) problems.push([rel, url, 'missing anchor on target'])
  }
}
console.log(`pages: ${pages.length}, references checked: ${refs}, internal problems: ${problems.length}`)
problems.slice(0, 40).forEach((p) => console.log('  INTERNAL', p.join(' | ')))

if (checkExternal) {
  const urls = [...external.keys()], results = []
  const probe = async (u) => {
    for (const method of ['HEAD', 'GET']) {
      try {
        const r = await fetch(u, { method, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (link check)' }, signal: AbortSignal.timeout(20000) })
        if (method === 'HEAD' && (r.status === 405 || r.status === 403 || r.status >= 500)) continue
        return { u, status: r.status, final: r.url }
      } catch (e) { if (method === 'GET') return { u, status: 'ERR ' + (e.cause?.code || e.name), final: '' } }
    }
  }
  for (let i = 0; i < urls.length; i += 10) results.push(...(await Promise.all(urls.slice(i, i + 10).map(probe))))
  const bad = results.filter((r) => !(r.status >= 200 && r.status < 400))
  const moved = results.filter((r) => r.status >= 200 && r.status < 400 && r.final && r.final.replace(/\/$/, '') !== r.u.replace(/\/$/, ''))
  console.log(`external URLs: ${urls.length}, ok: ${results.length - bad.length}, not ok: ${bad.length}, redirected: ${moved.length}`)
  bad.forEach((r) => console.log('  EXTERNAL', r.status, r.u, '| on', [...external.get(r.u)].slice(0, 2).join(', '), external.get(r.u).size > 2 ? `+${external.get(r.u).size - 2} more` : ''))
  moved.filter((r) => r.u.includes('maximuslabs.ai')).forEach((r) => console.log('  REDIRECT', r.u, '->', r.final))
  fs.writeFileSync(path.join(ROOT, 'tools', 'link-report.json'), JSON.stringify(results, null, 1))
}
