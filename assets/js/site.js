/* AI Search 101 v2 prototype interactions. No dependencies; MaxFX is the live site's own FX library. */
(() => {
  const root = document.body.dataset.root || './'
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const $ = (s, el = document) => el.querySelector(s)
  const $$ = (s, el = document) => [...el.querySelectorAll(s)]
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  /* 1. Scroll reveal, staggered per row (same curve as the homepage). */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return
    const el = e.target, sibs = el.parentElement ? [...el.parentElement.children].filter((x) => x.classList.contains('reveal')) : []
    const i = Math.max(0, sibs.indexOf(el))
    el.style.transitionDelay = `${Math.min(i, 6) * 60}ms`
    el.classList.add('in'); io.unobserve(el)
    setTimeout(() => (el.style.transitionDelay = ''), 900)
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
  $$('.reveal').forEach((el) => (reduce ? el.classList.add('in') : io.observe(el)))

  /* 2. Glass light follows the pointer (two CSS variables, rAF throttled). */
  if (!reduce) $$('[data-light]').forEach((cov) => {
    const card = cov.closest('.card, .ask') || cov
    const base = { x: getComputedStyle(cov).getPropertyValue('--gx'), y: getComputedStyle(cov).getPropertyValue('--gy') }
    let raf = 0, tx = 0, ty = 0
    card.addEventListener('pointermove', (e) => {
      const r = cov.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width) * 100; ty = ((e.clientY - r.top) / r.height) * 100
      if (!raf) raf = requestAnimationFrame(() => { cov.style.setProperty('--gx', `${tx.toFixed(1)}%`); cov.style.setProperty('--gy', `${Math.max(-10, ty).toFixed(1)}%`); raf = 0 })
    })
    card.addEventListener('pointerleave', () => { cov.style.setProperty('--gx', base.x); cov.style.setProperty('--gy', base.y) })
  })

  /* 3. Hero backgrounds from the live MaxFX library (one WebGL canvas per page, paused off screen). */
  addEventListener('load', () => {
    const host = $('[data-fx-host]'), fx = document.body.dataset.fx
    if (!host || !fx || !window.MaxFX) return
    const isHub = document.body.classList.contains('k-hub')
    window.MaxFX.mount(host, fx, isHub
      ? { intensity: 0.55, mask: 'none', tone: 'light', gain: 1.2, strength: 1, pointerEl: host, boostEl: $('.searchbar', host) }
      : { intensity: document.body.classList.contains('k-article') ? 0.3 : document.body.classList.contains('k-book') ? 0.4 : 0.7, mask: 'side', focus: [0.7, 0.12], pointerEl: host })
  })

  /* 9. Ask the author: a typed question travels to the Book a call page (session only, never in the URL). */
  $$('[data-ask]').forEach((form) => {
    const field = $('textarea, input[name="q"]', form)
    const sync = () => form.classList.toggle('has-q', !!field.value.trim())
    field.addEventListener('input', sync)
    field.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || field.tagName === 'INPUT')) { e.preventDefault(); form.requestSubmit() } })
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      try { sessionStorage.setItem('v2-ask', JSON.stringify({ q: field.value.trim().slice(0, 280), guide: form.dataset.guide, topic: form.dataset.topic, url: form.dataset.url })) } catch (_) {}
      location.href = form.getAttribute('action')
    })
  })

  /* 10. Book a call: the real Cal.com event used by the live article CTA, rendered inline in dark. */
  const calEl = $('#cal-inline')
  if (calEl) {
    let ctx = {}
    try { ctx = JSON.parse(sessionStorage.getItem('v2-ask') || '{}') } catch (_) {}
    const qa = $('#bq-text'), src = $('[data-bq-src]')
    if (ctx.q) qa.value = ctx.q
    if (ctx.guide && ctx.url) { src.textContent = `From: ${ctx.guide}`; src.href = root + ctx.url; src.hidden = false }
    ;(function (C, A, L) { const p = function (a, ar) { a.q.push(ar) }; const d = C.document; C.Cal = C.Cal || function () { const cal = C.Cal; const ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true } if (ar[0] === L) { const api = function () { p(api, arguments) }; const ns = ar[1]; api.q = api.q || []; if (typeof ns === 'string') { cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ['initNamespace', ns]) } else p(cal, ar); return } p(cal, ar) } })(window, 'https://app.cal.com/embed/embed.js', 'init')
    const NS = 'exploring-aeo-geo', Cal = window.Cal
    Cal('init', NS, { origin: 'https://app.cal.com' })
    Cal.ns[NS]('ui', { theme: 'dark', cssVarsPerTheme: { dark: { 'cal-brand': '#449afb' }, light: { 'cal-brand': '#013087' } }, hideEventTypeDetails: false, layout: 'month_view' })
    const render = () => {
      const notes = [qa.value.trim(), ctx.guide ? `(Reading: ${ctx.guide})` : ''].filter(Boolean).join(' ')
      calEl.innerHTML = ''
      Cal.ns[NS]('inline', { elementOrSelector: '#cal-inline', calLink: 'krishna-kaanth/exploring-aeo-geo', config: Object.assign({ layout: 'month_view', theme: 'dark' }, notes ? { notes } : {}) })
    }
    render()
    qa.addEventListener('change', render)
  }

  /* 4. Hub: icons drift and lean away from the pointer; stats count up. */
  const hubHero = $('.hub-hero')
  if (hubHero && !reduce) {
    const icons = $$('.float-ico', hubHero)
    hubHero.addEventListener('pointermove', (e) => {
      const r = hubHero.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5
      icons.forEach((ic) => { const d = +ic.dataset.depth || 1; ic.style.setProperty('--px', (-nx * 14 * d).toFixed(1)); ic.style.setProperty('--py', (-ny * 10 * d).toFixed(1)) })
    })
    hubHero.addEventListener('pointerleave', () => icons.forEach((ic) => { ic.style.setProperty('--px', 0); ic.style.setProperty('--py', 0) }))
  }
  const counted = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return
    const el = e.target, end = +el.dataset.count; counted.unobserve(el)
    if (reduce || !end) return
    const t0 = performance.now(), dur = 1100
    const step = (now) => { const k = Math.min(1, (now - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3))); el.textContent = v; if (k < 1) requestAnimationFrame(step) }
    requestAnimationFrame(step)
  }), { threshold: 0.4 })
  $$('[data-count]').forEach((el) => counted.observe(el))

  /* 5. Search: live suggestions from the real index, typing placeholder, "/" to focus. */
  let index = null
  const loadIndex = () => index ? Promise.resolve(index) : fetch(`${root}assets/search.json`).then((r) => r.json()).then((d) => (index = d))
  const score = (it, q) => { const t = it.t.toLowerCase(), s = (it.s || '').toLowerCase(); if (t.startsWith(q)) return 3; if (t.includes(q)) return 2; return q.split(/\s+/).every((w) => t.includes(w) || s.includes(w)) ? 1 : 0 }
  const results = (q) => loadIndex().then((d) => { q = q.trim().toLowerCase(); if (!q) return []; return d.map((it) => [score(it, q), it]).filter(([s]) => s).sort((a, b) => b[0] - a[0] || (a[1].k === 'Guide') - (b[1].k === 'Guide')).slice(0, 7).map(([, it]) => it) })
  $$('[data-search]').forEach((wrap) => {
    const input = $('input', wrap), list = $('.search-sugg', wrap), form = $('form', wrap)
    let active = -1, items = []
    const render = (q) => results(q).then((r) => {
      items = r; active = -1
      if (!q.trim()) { list.hidden = true; return }
      list.innerHTML = r.length ? r.map((it, i) => `<li><a href="${root}${it.u}" data-i="${i}"><span class="k">${it.k}</span><span class="t">${esc(it.t)}</span></a></li>`).join('') : '<li class="empty">No guides match yet. Try GEO, ChatGPT or crawlers.</li>'
      list.hidden = false
    })
    input.addEventListener('input', () => render(input.value))
    input.addEventListener('focus', () => { loadIndex(); if (input.value) render(input.value) })
    input.addEventListener('keydown', (e) => {
      const links = $$('a', list)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length; links.forEach((l, i) => l.classList.toggle('on', i === active)) }
      if (e.key === 'Escape') list.hidden = true
    })
    form.addEventListener('submit', (e) => { e.preventDefault(); const go = items[Math.max(0, active)]; if (go) location.href = `${root}${go.u}` })
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) list.hidden = true })
    $$('[data-q]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.q; input.focus(); render(input.value) }))
    // Typing placeholder that cycles through real guide topics.
    const phrases = JSON.parse(input.dataset.typing || '[]')
    if (phrases.length && !reduce) {
      let pi = 0, ci = 0, del = false, base = input.placeholder
      const tick = () => {
        if (document.activeElement === input || input.value) { input.placeholder = base; return setTimeout(tick, 1200) }
        const p = phrases[pi]; ci += del ? -1 : 1; input.placeholder = p.slice(0, ci) + (ci % 2 ? '|' : ' ')
        if (!del && ci >= p.length) { del = true; return setTimeout(tick, 1600) }
        if (del && ci <= 0) { del = false; pi = (pi + 1) % phrases.length }
        setTimeout(tick, del ? 30 : 70)
      }
      setTimeout(tick, 1400)
    }
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { const i = $('[data-search] input'); if (i) { e.preventDefault(); i.focus() } }
  })
  // The live nav's search dialog: fill its list with AI Search 101 results as you type.
  const cmdIn = $('#cmdkInput'), cmdList = $('#cmdkList')
  if (cmdIn && cmdList) cmdIn.addEventListener('input', () => setTimeout(() => results(cmdIn.value).then((r) => {
    if (!cmdIn.value.trim() || !r.length) return
    cmdList.insertAdjacentHTML('afterbegin', `<div class="v2-cmd">${r.map((it) => `<a class="v2-cmd-row" href="${root}${it.u}"><span>${it.k}</span>${esc(it.t)}</a>`).join('')}</div>`)
    $$('.v2-cmd', cmdList).slice(1).forEach((x) => x.remove())
  }), 30))

  /* 6. Pillar scenes: small loops that only run while on screen. */
  const onScreen = (el, start) => { let on = false, t; new IntersectionObserver(([e]) => { if (e.isIntersecting && !on) { on = true; t = start() } else if (!e.isIntersecting && on) { on = false; clearInterval(t) } }, { threshold: 0.3 }).observe(el) }
  if (!reduce) {
    $$('.sc-geo .ans').forEach((p) => onScreen(p, () => {
      const span = $('.typed', p), full = span.textContent; let i = 0
      return setInterval(() => { i = (i + 3) % (full.length + 40); span.textContent = full.slice(0, Math.min(i, full.length)) }, 60)
    }))
    $$('.sc-cart').forEach((sc) => onScreen(sc, () => {
      const buy = $('.buy', sc), small = $('[data-cycle]', sc), msgs = small.dataset.cycle.split('|'); let k = 0
      return setInterval(() => { k++; small.textContent = msgs[k % msgs.length]; buy.classList.toggle('done', k % 4 === 3) }, 1400)
    }))
    $$('.sc-agent').forEach((sc) => onScreen(sc, () => {
      const steps = $$('.step', sc), bar = $('.bar i', sc), n = $('.stepn', sc), pct = $('.pct', sc); let k = 0
      const draw = () => { steps.forEach((s, i) => { s.classList.toggle('done', i < k); s.classList.toggle('on', i === k) }); const p = Math.round((k / steps.length) * 100); bar.style.setProperty('--w', p + '%'); n.textContent = `step ${Math.min(k + 1, steps.length)} of ${steps.length}`; pct.textContent = p + '%' }
      draw(); return setInterval(() => { k = (k + 1) % (steps.length + 2); draw() }, 1100)
    }))
    $$('.sc-code .code').forEach((c) => onScreen(c, () => setInterval(() => { c.classList.toggle('show-llms'); $$('.tabs span', c).forEach((t) => t.classList.toggle('on')) }, 3200)))
  }
  const bars = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); bars.unobserve(e.target) } }), { threshold: 0.4 })
  $$('.sov, .path').forEach((el) => bars.observe(el))

  /* 7. Cluster: In order / Newest toggle. */
  $$('[data-sort]').forEach((tg) => tg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return
    $$('button', tg).forEach((x) => x.classList.toggle('on', x === b))
    const grid = $('[data-sortable]'); if (!grid) return
    const cards = [...grid.children], key = b.dataset.sortKey
    cards.sort((a, c) => key === 'date' ? (c.dataset.date || '').localeCompare(a.dataset.date || '') : (+a.dataset.order) - (+c.dataset.order)).forEach((c) => grid.appendChild(c))
  }))

  /* 8. Article: contents tracking, reading progress, phone contents bar, copy link. */
  const heads = $$('.prose h2[id]')
  if (heads.length) {
    const links = $$('.toc li a'), mlinks = $$('.m-list a'), count = $('.toc-count'), mN = $('.m-n'), mT = $('.m-t')
    const prog = [$('.read-progress'), $('.toc-prog'), $('.m-prog')].filter(Boolean), prose = $('.prose')
    let cur = -1
    const update = () => {
      const y = scrollY + innerHeight * 0.32; let i = 0
      heads.forEach((h, k) => { if (h.offsetTop <= y) i = k })
      if (i !== cur) {
        cur = i
        links.forEach((l, k) => { l.classList.toggle('on', k === i); l.classList.toggle('done', k < i) })
        mlinks.forEach((l, k) => l.classList.toggle('on', k === i))
        if (count) count.textContent = `${i + 1} / ${heads.length}`
        if (mN) mN.textContent = `${String(i + 1).padStart(2, '0')}/${String(heads.length).padStart(2, '0')}`
        if (mT && links[i]) mT.textContent = links[i].textContent.replace(/^\d+/, '').trim()
      }
      const top = prose.offsetTop, h = prose.offsetHeight - innerHeight * 0.6
      const p = Math.max(0, Math.min(1, (scrollY - top + 200) / h))
      prog.forEach((el) => el.style.setProperty('--p', p.toFixed(3)))
    }
    addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update()
    const mt = $('[data-mtoc]')
    if (mt) { $('.m-toc-bar', mt).addEventListener('click', () => { mt.classList.toggle('open'); $('.m-toc-bar', mt).setAttribute('aria-expanded', mt.classList.contains('open')) }); $$('.m-list a', mt).forEach((a) => a.addEventListener('click', () => mt.classList.remove('open'))) }
  }
  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => { navigator.clipboard && navigator.clipboard.writeText(location.href); b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 1400) }))
})()
