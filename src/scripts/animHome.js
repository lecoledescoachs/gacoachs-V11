// Animations de la page d'accueil : tout apparaît en suivant le défilement.
// Les éléments portent data-a (up, pop, left, right, zoom, words, flip, deal, ring, charge, gauge) ;
// ceux qui n'en ont pas reçoivent une animation automatiquement (titres, textes, cartes des grilles).
// Désactivé si le visiteur demande moins de mouvement (la classe anim-on n'est alors jamais posée).
export function initAnimHome() {
  const root = document.documentElement;
  if (!root.classList.contains('anim-on')) return;
  if (window.__animInit) return;
  window.__animInit = true;
  const home = document.querySelector('main');
  if (!home || !('IntersectionObserver' in window)) { root.classList.remove('anim-on'); return; }
  window.__animOk = true;
  const sl = (l) => Array.prototype.slice.call(l);
  const plusOf = (el) => parseInt(el.getAttribute('data-plus') || '0', 10);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  // zones qui ont leur propre mise en scène : on n'y touche pas
  const VALEURS = /^(up|pop|left|right|tilt|zoom|words|flip|deal|ring|charge|gauge)$/;
  const EXCLUS = '#fan, #quiz, .bcz, #bga-vit, .marquee, form, [data-hero] .fan-wrap, .mini-carte, .leaflet-container, [role=application], dialog, [aria-live], .tf-console';
  const grand = (el) => el.getBoundingClientRect().height > innerHeight * 1.4;

  // ----- titres : un mot après l'autre (si le titre n'a que du texte) -----
  function mots(el) {
    if (el.querySelector('.w')) return true;
    if (el.children.length) return false;
    const words = [];
    el.textContent.trim().split(/\s+/).forEach((w) => {
      const n = words.length;
      if (n && (/^[:;?!»]+$/.test(w) || words[n - 1] === '«')) words[n - 1] += ' ' + w; else words.push(w);
    });
    el.textContent = '';
    words.forEach((w, i) => {
      const o = document.createElement('span'), s = document.createElement('span');
      o.className = 'w'; s.textContent = w; s.style.setProperty('--i', String(i));
      o.appendChild(s); el.appendChild(o);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return true;
  }

  // ----- en-têtes de page sans mise en scène : ils reçoivent la cascade de l'accueil -----
  sl(home.querySelectorAll('.phero')).forEach((h) => {
    if (h.hasAttribute('data-hero') || h.querySelector('[data-a]')) return;
    h.setAttribute('data-hero', '');
    sl(h.querySelectorAll('.eyebrow')).forEach((e) => { if (!e.closest(EXCLUS.replace('[data-hero] .fan-wrap, ', ''))) e.setAttribute('data-a', 'pop'); });
    sl(h.querySelectorAll('h1')).forEach((t) => t.setAttribute('data-a', mots(t) ? 'words' : 'up'));
    sl(h.querySelectorAll('p, .btn, .phero-solo > div, .chips, ul')).forEach((n) => { if (!n.closest('[data-a]') && !n.closest('form, nav, .crumbs')) n.setAttribute('data-a', 'up'); });
    sl(h.querySelectorAll('img, picture, figure, .phero-visual, .hero-visual')).forEach((n) => { if (!n.closest('[data-a]')) n.setAttribute('data-a', 'zoom'); });
  });
  // les éclairs de fond se chargent partout comme sur l'accueil
  sl(home.querySelectorAll('.lightning-bg')).forEach((l) => { if (!l.hasAttribute('data-a')) l.setAttribute('data-a', 'charge'); });

  // ----- étiquetage automatique de ce qui n'a pas encore d'animation -----
  const libre = (el) => !el.hasAttribute('data-a') && !el.hasAttribute('data-group') && !el.closest('[data-a]') && !el.closest(EXCLUS) && !grand(el);
  sl(home.querySelectorAll('section')).forEach((sec) => {
    if (sec.matches('[data-hero], .partners')) return;
    sl(sec.querySelectorAll('.eyebrow')).forEach((e) => { if (libre(e)) e.setAttribute('data-a', 'pop'); });
    sl(sec.querySelectorAll('h2')).forEach((h) => { if (libre(h)) h.setAttribute('data-a', mots(h) ? 'words' : 'up'); });
    sl(sec.querySelectorAll('.lead-p, .lead, .sec-lead, .inner > p, .container > p')).forEach((p) => { if (libre(p)) p.setAttribute('data-a', 'up'); });
    // cartes des grilles : elles arrivent l'une après l'autre
    sl(sec.querySelectorAll('*')).forEach((g) => {
      if (g.closest(EXCLUS) || g.closest('[data-a]') && g !== g.closest('[data-a]')) return;
      const cs = getComputedStyle(g);
      if (cs.display !== 'grid' || g.children.length < 2) return;
      const donne = g.children.length >= 3 && g.children.length <= 8 && !window.__dealDone;
      sl(g.children).forEach((c) => { if (libre(c) && c.tagName !== 'SCRIPT') c.setAttribute('data-a', donne && /(^|\s)(tile|card|cg)(\s|$)/.test(c.className) ? 'deal' : 'up'); });
      if (donne) window.__dealDone = true;
    });
    // blocs seuls dans la colonne
    sl(sec.querySelectorAll('.inner > div, .inner > ul, .inner > a, .container > div, .container > ul')).forEach((b) => { if (libre(b)) b.setAttribute('data-a', 'up'); });
  });
  sl(home.querySelectorAll('section:not([data-hero]) img')).forEach((im) => {
    if (libre(im) && im.getBoundingClientRect().width > 240 && !im.closest('.cg, .tile')) im.setAttribute('data-a', 'zoom');
  });
  // la frise du bilan se trace quand elle apparaît
  sl(home.querySelectorAll('.bx-hour, .bx-halves')).forEach((b) => { if (libre(b)) b.setAttribute('data-a', 'up'); });

  // ----- compteurs, distribution des cartes -----
  function compter(el, d) {
    const to = parseInt(el.getAttribute('data-count'), 10);
    if (!isFinite(to)) return;
    const fin = el.textContent;
    let t0 = 0; el.textContent = '0';
    setTimeout(() => {
      const tick = (now) => {
        if (!t0) t0 = now;
        const p = Math.min(1, (now - t0) / 1300);
        el.textContent = p < 1 ? String(Math.round(to * (1 - Math.pow(1 - p, 3)))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : fin;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, d);
  }
  function distribuer(el, d) {
    if (!el.animate) return;
    const g = el.parentElement.getBoundingClientRect(), r = el.getBoundingClientRect();
    const dx = clamp(g.left + g.width / 2 - (r.left + r.width / 2), -420, 420);
    const dy = clamp(g.top + g.height / 2 - (r.top + r.height / 2), -240, 240);
    const rot = rand(-10, 10);
    el.animate([
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg) scale(.55)', opacity: 0 },
      { transform: 'translate(' + dx * 0.08 + 'px,' + dy * 0.08 + 'px) rotate(' + -rot * 0.15 + 'deg) scale(1.03)', opacity: 1, offset: 0.72 },
      { transform: 'none', opacity: 1 },
    ], { duration: 900, delay: d, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  }
  function reveler(el, d) {
    el.style.setProperty('--d', Math.round(d) + 'ms');
    if (el.getAttribute('data-a') === 'deal') distribuer(el, d);
    el.classList.add('is-in');
    sl(el.querySelectorAll('[data-count]')).forEach((n) => { if (n.closest('[data-a]') === el) compter(n, d + plusOf(n)); });
    sl(el.querySelectorAll('[data-a]')).forEach((k) => { if (VALEURS.test(k.getAttribute('data-a')) && k.parentElement.closest('[data-a]') === el) reveler(k, d + plusOf(k)); });
  }
  const io = new IntersectionObserver((entries) => {
    const lot = entries.filter((e) => e.isIntersecting).map((e) => e.target);
    lot.sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return (Math.round(ra.top) - Math.round(rb.top)) || (ra.left - rb.left); });
    lot.forEach((el, i) => {
      io.unobserve(el); attente.delete(el);
      const d = Math.min(i * 95, 760) + plusOf(el);
      if (el.hasAttribute('data-group')) {
        let j = 0;
        sl(el.querySelectorAll('[data-a]')).forEach((k) => { if (!k.parentElement.closest('[data-a]')) reveler(k, d + j++ * 85); });
      } else reveler(el, d);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  const attente = new Set();
  const suivre = (n) => { attente.add(n); io.observe(n); };
  sl(home.querySelectorAll('[data-group]')).forEach(suivre);
  sl(home.querySelectorAll('[data-a]')).forEach((n) => {
    if (!VALEURS.test(n.getAttribute('data-a')) || n.closest('[data-group]') || n.parentElement.closest('[data-a]')) return;
    suivre(n);
  });
  // filet de sécurité : tout ce que le visiteur a déjà dépassé en défilant vite est révélé
  let tic = 0;
  window.addEventListener('scroll', () => {
    if (tic) return;
    tic = window.setTimeout(() => {
      tic = 0;
      attente.forEach((n) => {
        if (n.classList.contains('is-in')) { attente.delete(n); return; }
        if (n.getBoundingClientRect().bottom < innerHeight * 0.94) { io.unobserve(n); attente.delete(n); reveler(n, 0); }
      });
    }, 250);
  }, { passive: true });
  // l'en-tête de la page arrive tout de suite, en cascade
  let j = 0;
  sl(home.querySelectorAll('[data-hero] [data-a]')).forEach((n) => {
    if (n.parentElement.closest('[data-a]')) return;
    io.unobserve(n); reveler(n, 60 + j++ * 110);
  });
}
