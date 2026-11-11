// Effets « wow » du site : réseau neuronal animé dans les zones sombres et l'en-tête de l'accueil,
// curseur lumineux, cartes éclairées et inclinées en 3D, boutons magnétiques avec reflet,
// textes courts qui se décodent, chiffres qui défilent, images qui se dévoilent, barre de progression,
// en-tête en verre dépoli. Tout est décoratif : rien ne change dans le contenu lu par les lecteurs d'écran,
// rien ne bouge si le visiteur demande moins de mouvement, et les effets de survol ne s'activent qu'avec une souris.
// Aucun élément n'est ajouté dans les cartes ou les boutons : les lumières passent par des couches de fond
// posées en style en ligne puis retirées, pour ne jamais décaler la mise en page.
export function initWow() {
  if (window.__wowInit) return;
  window.__wowInit = true;
  const html = document.documentElement;
  const main = document.querySelector('main');
  if (!main || !window.requestAnimationFrame) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (/^\/(espace-coach|admin)/.test(location.pathname)) return;
  const souris = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const suivi = false; // aucun effet ne suit la souris (choix de Garry)
  html.classList.add('wow-on');
  if (suivi) html.classList.add('wow-souris');

  const sl = (l) => Array.prototype.slice.call(l);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const EXCLUS = '.bcz, #fan, .fan-wrap, .marquee, .partners, .site-header, .sticky-cta, [class*="ep-bubble"], [data-wow="off"]';
  const BOUTONS = '.btn, .btn-final, .btn-white, .btn-out, .btn-glass, .btn-shuffle, .header-cta, .lb-btn, .bcz-go';

  // ---------- une seule boucle d'animation pour tous les effets ----------
  const taches = new Set();
  let raf = 0;
  const boucle = (t) => {
    raf = 0;
    taches.forEach((f) => { if (f(t) === false) taches.delete(f); });
    if (taches.size) raf = requestAnimationFrame(boucle);
  };
  const lancer = (f) => { taches.add(f); if (!raf) raf = requestAnimationFrame(boucle); };

  // ---------- fond clair ou sombre sous un élément ----------
  function lum(c) {
    const m = String(c).match(/[0-9.]+/g);
    if (!m || m.length < 3) return null;
    if (m.length > 3 && +m[3] < 0.5) return null;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(+m[0]) + 0.7152 * f(+m[1]) + 0.0722 * f(+m[2]);
  }
  const memoSombre = new WeakMap();
  function sombre(el) {
    let e = el;
    while (e && e.nodeType === 1) {
      if (memoSombre.has(e)) return memoSombre.get(e);
      const l = lum(getComputedStyle(e).backgroundColor);
      if (l !== null) { memoSombre.set(e, l < 0.2); return l < 0.2; }
      e = e.parentElement;
    }
    return false;
  }

  // ---------- couches de lumière posées sur le fond d'un élément (sans toucher à son contenu) ----------
  const couches = new Map();
  const LISTES = ['backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'backgroundOrigin', 'backgroundClip'];
  function couche(el, nom, valeur) {
    let c = couches.get(el);
    if (!c) {
      if (valeur == null) return;
      const cs = getComputedStyle(el);
      c = { avant: { backgroundImage: el.style.backgroundImage }, img: cs.backgroundImage, listes: {}, actives: new Map() };
      LISTES.forEach((p) => { c.avant[p] = el.style[p]; c.listes[p] = cs[p]; });
      couches.set(el, c);
    }
    if (valeur == null) c.actives.delete(nom); else c.actives.set(nom, valeur);
    if (!c.actives.size) {
      Object.keys(c.avant).forEach((p) => { el.style[p] = c.avant[p]; });
      couches.delete(el);
      return;
    }
    const nos = Array.from(c.actives.values());
    const avecImg = c.img && c.img !== 'none';
    el.style.backgroundImage = nos.join(', ') + (avecImg ? ', ' + c.img : '');
    const clip = String(c.listes.backgroundClip).split(',')[0].trim() || 'border-box';
    const def = { backgroundSize: '100% 100%', backgroundPosition: '0% 0%', backgroundRepeat: 'no-repeat', backgroundOrigin: 'border-box', backgroundClip: clip };
    LISTES.forEach((p) => {
      const v = nos.map(() => def[p]).join(', ');
      el.style[p] = avecImg ? v + ', ' + c.listes[p] : v;
    });
  }

  // ---------- barre de progression et en-tête en verre au défilement ----------
  const barre = document.createElement('div');
  barre.className = 'wow-progress';
  barre.setAttribute('aria-hidden', 'true');
  document.body.appendChild(barre);
  const barreJs = !(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
  let attenteScroll = false;
  const majScroll = () => {
    attenteScroll = false;
    const y = window.scrollY;
    html.classList.toggle('wow-scrolled', y > 12);
    if (barreJs) {
      const h = document.documentElement.scrollHeight - innerHeight;
      barre.style.transform = 'scaleX(' + (h > 0 ? clamp(y / h, 0, 1) : 0).toFixed(4) + ')';
    }
  };
  addEventListener('scroll', () => { if (!attenteScroll) { attenteScroll = true; requestAnimationFrame(majScroll); } }, { passive: true });
  majScroll();

  // ---------- curseur lumineux (désactivé) ----------
  if (suivi) {
    const aura = document.createElement('div');
    aura.className = 'wow-aura';
    const anneau = document.createElement('div');
    anneau.className = 'wow-cursor';
    [aura, anneau].forEach((n) => { n.setAttribute('aria-hidden', 'true'); document.body.appendChild(n); });
    let mx = 0, my = 0, ax = 0, ay = 0, present = false, suit = false;
    const suivre = () => {
      ax += (mx - ax) * 0.24; ay += (my - ay) * 0.24;
      anneau.style.transform = 'translate3d(' + ax.toFixed(1) + 'px,' + ay.toFixed(1) + 'px,0)';
      aura.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      const encore = Math.abs(mx - ax) + Math.abs(my - ay) > 0.3;
      if (!encore) suit = false;
      return encore;
    };
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!present) { present = true; ax = mx; ay = my; html.classList.add('wow-cur-in'); }
      if (!suit) { suit = true; lancer(suivre); }
    }, { passive: true });
    document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) { present = false; html.classList.remove('wow-cur-in'); } });
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      anneau.classList.toggle('is-link', !!t.closest('a, button, [role="button"], summary, label, select'));
      anneau.classList.toggle('is-off', !!t.closest('input, textarea, [contenteditable="true"], iframe'));
      const s = sombre(t);
      anneau.classList.toggle('is-dark', s);
      aura.classList.toggle('is-dark', s);
    }, { passive: true });
    addEventListener('pointerdown', () => anneau.classList.add('is-down'), { passive: true });
    addEventListener('pointerup', () => anneau.classList.remove('is-down'), { passive: true });
  }

  // ---------- état animé des boutons (aimant) et des cartes (lumière, inclinaison 3D) ----------
  const etats = new Map();
  const perspectives = new Map();
  function etat(el) {
    let s = etats.get(el);
    if (!s) { s = { el, x: 0, y: 0, tx: 0, ty: 0, rx: 0, ry: 0, rxT: 0, ryT: 0, z: 1, zT: 1, a: 0, aT: 0, mx: 0, my: 0 }; etats.set(el, s); }
    return s;
  }
  function liberer(s) {
    const el = s.el;
    if (s.aimant) el.style.translate = '';
    if (s.incline) { el.style.rotate = ''; el.style.scale = ''; }
    if (s.lumiere) {
      couche(el, 'spot', null);
      el.classList.remove('wow-glow');
      ['--wow-a', '--wow-mx', '--wow-my', '--wow-bw', '--wow-in'].forEach((p) => el.style.removeProperty(p));
      if (s.posRel) el.style.position = '';
    }
    if (s.parent) {
      const p = s.parent, n = (perspectives.get(p) || 1) - 1;
      if (n <= 0) { perspectives.delete(p); p.style.perspective = s.pAvant; p.style.perspectiveOrigin = s.poAvant; }
      else perspectives.set(p, n);
    }
  }
  function animerEtats() {
    etats.forEach((s, el) => {
      const k = 0.17;
      s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k;
      s.rx += (s.rxT - s.rx) * k; s.ry += (s.ryT - s.ry) * k;
      s.z += (s.zT - s.z) * k; s.a += (s.aT - s.a) * 0.2;
      if (s.aimant) el.style.translate = s.x.toFixed(2) + 'px ' + s.y.toFixed(2) + 'px';
      if (s.incline) {
        const ang = Math.hypot(s.rx, s.ry);
        el.style.rotate = ang < 0.02 ? '' : (s.rx / ang).toFixed(4) + ' ' + (s.ry / ang).toFixed(4) + ' 0 ' + ang.toFixed(3) + 'deg';
        el.style.scale = s.z.toFixed(4);
      }
      if (s.lumiere) {
        el.style.setProperty('--wow-a', s.a.toFixed(3));
        el.style.setProperty('--wow-mx', s.mx.toFixed(1) + 'px');
        el.style.setProperty('--wow-my', s.my.toFixed(1) + 'px');
      }
      const reste = Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) + Math.abs(s.rxT - s.rx) + Math.abs(s.ryT - s.ry) + Math.abs(s.zT - s.z) * 40 + Math.abs(s.aT - s.a);
      if (!s.dedans && reste < 0.02 && !s.tx && !s.ty && !s.aT) { liberer(s); etats.delete(el); }
    });
    return etats.size > 0;
  }

  // boutons : aimant + reflet au survol
  const interditAimant = new WeakSet();
  function trouverBouton(t) {
    const b = t.closest(BOUTONS);
    if (!b || interditAimant.has(b)) return null;
    if (b.closest('#fan, .marquee, [data-wow="off"]')) { interditAimant.add(b); return null; }
    if (!etats.has(b)) {
      const tr = getComputedStyle(b).translate;
      if (tr && tr !== 'none' && tr !== '0px') { interditAimant.add(b); return null; }
    }
    return b;
  }
  function reflet(b) {
    const cs = getComputedStyle(b);
    const l = lum(cs.backgroundColor);
    if (l === null || l > 0.25 || (cs.backgroundImage !== 'none' && !couches.has(b))) return;
    const t0 = performance.now();
    lancer((t) => {
      const p = (t - t0) / 700;
      if (p >= 1) { couche(b, 'reflet', null); return false; }
      const x = -25 + p * 150;
      couche(b, 'reflet', 'linear-gradient(105deg, transparent ' + (x - 16).toFixed(1) + '%, rgba(255,255,255,0.34) ' + x.toFixed(1) + '%, transparent ' + (x + 16).toFixed(1) + '%)');
      return true;
    });
  }
  // cartes : tout bloc arrondi avec un fond ou une bordure, de taille raisonnable
  const verdicts = new WeakMap();
  const PAS_CARTE = /^(MAIN|SECTION|BODY|HTML|FORM|INPUT|TEXTAREA|SELECT|IMG|VIDEO|IFRAME|CANVAS|BUTTON|SUMMARY|svg|path)$/;
  function estCarte(e) {
    if (verdicts.has(e)) return verdicts.get(e);
    let ok = false;
    if (!PAS_CARTE.test(e.tagName) && !e.matches(BOUTONS) && !e.closest(EXCLUS + ', form, dialog')) {
      const cs = getComputedStyle(e);
      const rad = cs.borderTopLeftRadius;
      const r = e.getBoundingClientRect();
      const fond = lum(cs.backgroundColor) !== null || (cs.backgroundImage !== 'none' && !/url\(/.test(cs.backgroundImage));
      const bord = parseFloat(cs.borderTopWidth) > 0 && lum(cs.borderTopColor) !== null;
      ok = (fond || bord) && parseFloat(rad) >= 10 && rad.indexOf('%') < 0 && !/inline|contents|table-cell/.test(cs.display) &&
        r.width >= 140 && r.height >= 80 && r.width <= innerWidth * 0.86 && r.height <= 900;
    }
    verdicts.set(e, ok);
    return ok;
  }
  function trouverCarte(t) {
    let e = t, n = 0;
    while (e && e !== main && e.nodeType === 1 && n < 9) {
      if (estCarte(e)) return e;
      e = e.parentElement; n++;
    }
    return null;
  }
  function peutIncliner(c) {
    const cs = getComputedStyle(c), r = c.getBoundingClientRect(), p = c.parentElement;
    if (!p || r.height > 560 || r.width > 680 || c.tagName === 'DETAILS') return false;
    if (cs.rotate && cs.rotate !== 'none') return false;
    if (c.querySelector('input, select, textarea, iframe, video, details, canvas') || c.closest('.cg, [data-a="flip"]')) return false;
    const ps = getComputedStyle(p);
    if (ps.display === 'contents') return false;
    if (!perspectives.has(p) && ps.perspective !== 'none') return false;
    if (ps.position === 'static') {
      const absolus = sl(p.children).some((k) => k !== c && /absolute|fixed/.test(getComputedStyle(k).position)) ||
        ['::before', '::after'].some((ps2) => { const x = getComputedStyle(p, ps2); return x.content !== 'none' && /absolute|fixed/.test(x.position); });
      if (absolus) return false;
    }
    return true;
  }
  function entrerCarte(c) {
    const s = etat(c);
    s.dedans = true;
    if (!s.pret) {
      s.pret = true;
      const cs = getComputedStyle(c);
      const fonce = sombre(c);
      s.lumiere = true;
      couche(c, 'spot', 'radial-gradient(440px circle at var(--wow-mx, -999px) var(--wow-my, -999px), ' + (fonce ? 'rgba(120,180,255,calc(var(--wow-a, 0) * 0.18))' : 'rgba(47,111,237,calc(var(--wow-a, 0) * 0.09))') + ', transparent 72%)');
      if (getComputedStyle(c, '::after').content === 'none') {
        let pos = cs.position !== 'static';
        if (!pos && !sl(c.querySelectorAll('*')).slice(0, 250).some((k) => /absolute|fixed/.test(getComputedStyle(k).position))) {
          c.style.position = 'relative'; s.posRel = true; pos = true;
        }
        if (pos) {
          const bw = Math.max(parseFloat(cs.borderTopWidth) || 0, 1.5);
          const coupe = cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
          c.style.setProperty('--wow-bw', bw + 'px');
          c.style.setProperty('--wow-in', coupe ? '0px' : -(parseFloat(cs.borderTopWidth) || 0) + 'px');
          c.classList.add('wow-glow');
          if (fonce) c.classList.add('wow-glow-dark');
        }
      }
      if (peutIncliner(c)) {
        s.incline = true;
        const p = c.parentElement;
        s.parent = p;
        const n = perspectives.get(p) || 0;
        if (!n) { s.pAvant = p.style.perspective; s.poAvant = p.style.perspectiveOrigin; } else {
          const autre = Array.from(etats.values()).find((o) => o.parent === p && o !== s);
          s.pAvant = autre ? autre.pAvant : ''; s.poAvant = autre ? autre.poAvant : '';
        }
        perspectives.set(p, n + 1);
        p.style.perspective = '1100px';
      }
    }
    if (s.incline) {
      const pr = s.parent.getBoundingClientRect(), cr = c.getBoundingClientRect();
      s.parent.style.perspectiveOrigin = (cr.left + cr.width / 2 - pr.left).toFixed(0) + 'px ' + (cr.top + cr.height / 2 - pr.top).toFixed(0) + 'px';
    }
    s.aT = 1;
    s.zT = s.incline ? 1.018 : 1;
    lancer(animerEtats);
  }
  function bougerCarte(c, e) {
    const s = etats.get(c);
    if (!s) return;
    const r = c.getBoundingClientRect();
    s.mx = e.clientX - r.left; s.my = e.clientY - r.top;
    if (s.incline) {
      const max = clamp(1500 / Math.max(r.width, r.height), 3, 8);
      s.ryT = (clamp(s.mx / r.width, 0, 1) * 2 - 1) * max;
      s.rxT = -(clamp(s.my / r.height, 0, 1) * 2 - 1) * max;
    }
    lancer(animerEtats);
  }
  function quitterCarte(c) {
    const s = etats.get(c);
    if (!s) return;
    s.dedans = false; s.aT = 0; s.rxT = 0; s.ryT = 0; s.zT = 1;
    lancer(animerEtats);
  }
  function entrerBouton(b) {
    const s = etat(b);
    s.dedans = true; s.aimant = true;
    reflet(b);
  }
  function bougerBouton(b, e) {
    const s = etats.get(b);
    if (!s) return;
    const r = b.getBoundingClientRect();
    s.tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1) * Math.min(9, r.width * 0.06);
    s.ty = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1) * Math.min(6, r.height * 0.13);
    lancer(animerEtats);
  }
  function quitterBouton(b) {
    const s = etats.get(b);
    if (!s) return;
    s.dedans = false; s.tx = 0; s.ty = 0;
    lancer(animerEtats);
  }
  if (suivi) {
    let bouton = null, carte = null, dx = -1, dy = -1;
    const viser = (t, e) => {
      const b = t && t.closest ? trouverBouton(t) : null;
      if (b !== bouton) { if (bouton) quitterBouton(bouton); bouton = b; if (b) entrerBouton(b); }
      if (b && e) bougerBouton(b, e);
      const c = t && t.closest ? trouverCarte(t) : null;
      if (c !== carte) { if (carte) quitterCarte(carte); carte = c; if (c) entrerCarte(c); }
      if (c && e) bougerCarte(c, e);
    };
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      dx = e.clientX; dy = e.clientY;
      viser(e.target, e);
    }, { passive: true });
    document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) viser(null, null); });
    let attente = false;
    addEventListener('scroll', () => {
      if (attente || dx < 0 || (!bouton && !carte)) return;
      attente = true;
      setTimeout(() => { attente = false; viser(document.elementFromPoint(dx, dy), null); }, 120);
    }, { passive: true });
  }

  // ---------- réseau neuronal animé (zones sombres à éclairs et en-tête de l'accueil) ----------
  const sprites = {};
  function sprite(fonce) {
    const cle = fonce ? 'f' : 'c';
    if (sprites[cle]) return sprites[cle];
    const s = document.createElement('canvas');
    s.width = s.height = 64;
    const g = s.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (fonce) {
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(170,215,255,0.95)');
      gr.addColorStop(0.42, 'rgba(87,168,255,0.38)'); gr.addColorStop(1, 'rgba(47,111,237,0)');
    } else {
      gr.addColorStop(0, 'rgba(47,111,237,0.95)'); gr.addColorStop(0.22, 'rgba(47,111,237,0.5)');
      gr.addColorStop(1, 'rgba(87,168,255,0)');
    }
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    sprites[cle] = s;
    return s;
  }
  function creerReseau(hote) {
    const fonce = sombre(hote);
    const cv = document.createElement('canvas');
    cv.className = 'wow-net' + (fonce ? '' : ' is-light');
    cv.setAttribute('aria-hidden', 'true');
    const fond = sl(hote.children).find((k) => k.matches('.lightning-bg, .final-bg'));
    hote.classList.add('wow-host');
    if (fond) { fond.classList.add('wow-bg'); fond.after(cv); } else hote.insertBefore(cv, hote.firstChild);
    const ctx = cv.getContext('2d');
    if (!ctx) return { voir() {} };
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    // sur mobile, le texte occupe toute la largeur : réseau plus discret pour garder la lecture confortable
    const C = fonce
      ? { l: '120,178,255', la: souris ? 0.32 : 0.2, n: souris ? 'rgba(190,220,255,0.9)' : 'rgba(190,220,255,0.6)', c: 0.6, tr: souris ? 0.8 : 0.55, flash: souris ? 24 : 14 }
      : { l: '47,111,237', la: souris ? 0.3 : 0.18, n: 'rgba(47,111,237,0.66)', c: 0.5, tr: 0.6, flash: 12 };
    const lueur = sprite(fonce);
    const D = souris ? 150 : 115, R = 200;
    let W = 0, H = 0, vis = false, tourne = false, dedans = false, px = 0, py = 0, prochain = 0, image = 0;
    const N = [], P = [];
    let aurore = null;
    // sur fond clair, le réseau s'efface derrière les textes pour ne jamais gêner la lecture
    let zone = null;
    function mesurerZone() {
      if (fonce) return;
      const hr = hote.getBoundingClientRect();
      const z = [];
      sl(hote.children).forEach((e) => {
        if (e.tagName === 'CANVAS' || e.matches('#fan, .fan-wrap, [aria-hidden="true"]') || e.querySelector('#fan, .card, img')) return;
        const q = e.getBoundingClientRect();
        if (!q.width || !q.height) return;
        z.push({ l: q.left - hr.left - 12, t: q.top - hr.top - 12, r: q.right - hr.left + 12, b: q.bottom - hr.top + 12 });
      });
      zone = z.length ? z : null;
    }
    const efface = (x, y) => {
      if (!zone) return 1;
      let d = 1e9;
      for (const q of zone) {
        const dx = Math.max(q.l - x, 0, x - q.r), dy = Math.max(q.t - y, 0, y - q.b);
        d = Math.min(d, Math.hypot(dx, dy));
        if (!d) break;
      }
      return clamp(d / 110, 0.08, 1);
    };
    function taille() {
      const r = hote.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.max(1, Math.round(W * dpr));
      cv.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = clamp(Math.round((W * H) / (souris ? 9500 : 15000)), 20, souris ? 120 : 44);
      while (N.length < n) N.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.32, vy: (Math.random() - 0.5) * 0.32, r: 0.8 + Math.random() * 1.6, f: 0, v: [] });
      N.length = n;
      N.forEach((k) => { if (k.x > W) k.x = Math.random() * W; if (k.y > H) k.y = Math.random() * H; });
      mesurerZone();
    }
    taille();
    if (window.ResizeObserver) new ResizeObserver(() => taille()).observe(hote);
    if (!fonce) { setTimeout(mesurerZone, 1500); if (document.fonts && document.fonts.ready) document.fonts.ready.then(mesurerZone); }
    const impulsion = (a, b) => { if (P.length < 16) P.push({ a, b, t: 0, d: 0.011 + Math.random() * 0.013 }); };
    const voisin = (i, sauf) => {
      const v = N[i] ? N[i].v.filter((j) => j !== sauf) : [];
      return v.length ? v[(Math.random() * v.length) | 0] : null;
    };
    function dessiner(t) {
      if (!vis) { tourne = false; return false; }
      if (!souris && (image++ & 1)) return true;
      ctx.clearRect(0, 0, W, H);
      if (!fonce && souris) {
        // aurore bleue qui dérive lentement, calculée en petit puis agrandie (léger pour le processeur)
        if (!aurore) { aurore = document.createElement('canvas'); aurore.width = 96; aurore.height = 64; }
        if (!(image++ % 3)) {
          const a = aurore.getContext('2d'), s = t / 1000, aw = aurore.width, ah = aurore.height;
          a.clearRect(0, 0, aw, ah);
          const nappes = [
            [0.16 + 0.08 * Math.sin(s * 0.21), 0.34 + 0.12 * Math.cos(s * 0.17), '47,111,237', 0.085],
            [0.84 + 0.07 * Math.cos(s * 0.19), 0.30 + 0.14 * Math.sin(s * 0.23), '87,168,255', 0.12],
            [0.5 + 0.22 * Math.sin(s * 0.13), 0.92 + 0.05 * Math.cos(s * 0.29), '0,55,182', 0.06],
          ];
          for (const [nx, ny, col, al] of nappes) {
            const x = nx * aw, y = ny * ah, rr = Math.max(aw, ah) * 0.34;
            const g = a.createRadialGradient(x, y, 0, x, y, rr);
            g.addColorStop(0, 'rgba(' + col + ',' + al + ')');
            g.addColorStop(1, 'rgba(' + col + ',0)');
            a.fillStyle = g;
            a.fillRect(0, 0, aw, ah);
          }
        }
        ctx.drawImage(aurore, 0, 0, W, H);
      }
      for (const k of N) {
        k.x += k.vx; k.y += k.vy;
        if (k.x < 0 || k.x > W) k.vx *= -1;
        if (k.y < 0 || k.y > H) k.vy *= -1;
        if (dedans) {
          const dx = px - k.x, dy = py - k.y, d = Math.hypot(dx, dy);
          if (d < R && d > 0.5) { const f = ((d - 80) / R) * 0.9; k.x += (dx / d) * f; k.y += (dy / d) * f; }
        }
        k.v.length = 0;
      }
      const D2 = D * D;
      ctx.lineWidth = 1;
      for (let i = 0; i < N.length; i++) {
        const a = N[i];
        for (let j = i + 1; j < N.length; j++) {
          const b = N[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < D2) {
            a.v.push(j); b.v.push(i);
            const al = (1 - Math.sqrt(d2) / D) * C.la * (zone ? efface((a.x + b.x) / 2, (a.y + b.y) / 2) : 1);
            if (al < 0.004) continue;
            ctx.strokeStyle = 'rgba(' + C.l + ',' + al.toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      if (dedans) {
        for (const k of N) {
          const d = Math.hypot(px - k.x, py - k.y);
          if (d < R) {
            ctx.strokeStyle = 'rgba(' + C.l + ',' + ((1 - d / R) * C.c * (zone ? Math.max(0.35, efface(k.x, k.y)) : 1)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(k.x, k.y); ctx.stroke();
          }
        }
        ctx.globalAlpha = fonce ? 0.55 : 0.35;
        ctx.drawImage(lueur, px - 46, py - 46, 92, 92);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = C.n;
      if (zone) {
        for (const k of N) { ctx.globalAlpha = efface(k.x, k.y); ctx.beginPath(); ctx.arc(k.x, k.y, k.r + 0.4, 0, 6.2832); ctx.fill(); }
        ctx.globalAlpha = 1;
      } else {
        ctx.beginPath();
        for (const k of N) { ctx.moveTo(k.x + k.r, k.y); ctx.arc(k.x, k.y, k.r, 0, 6.2832); }
        ctx.fill();
      }
      for (const k of N) {
        if (k.f > 0.01) {
          const s = 6 + C.flash * k.f;
          ctx.globalAlpha = fonce ? k.f : k.f * 0.55 * efface(k.x, k.y);
          ctx.drawImage(lueur, k.x - s, k.y - s, s * 2, s * 2);
          k.f *= 0.94;
        }
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.6;
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i], a = N[p.a], b = N[p.b];
        if (!a || !b) { P.splice(i, 1); continue; }
        p.t += p.d;
        const x = a.x + (b.x - a.x) * Math.min(1, p.t), y = a.y + (b.y - a.y) * Math.min(1, p.t);
        const q = Math.max(0, p.t - 0.4);
        const fe = zone ? efface(x, y) : 1;
        ctx.strokeStyle = 'rgba(' + C.l + ',' + (C.tr * fe).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(a.x + (b.x - a.x) * q, a.y + (b.y - a.y) * q); ctx.lineTo(x, y); ctx.stroke();
        ctx.globalAlpha = fe;
        ctx.drawImage(lueur, x - 13, y - 13, 26, 26);
        ctx.globalAlpha = 1;
        if (p.t >= 1) {
          P.splice(i, 1);
          b.f = 1;
          if (Math.random() < 0.62) { const c = voisin(p.b, p.a); if (c != null) impulsion(p.b, c); }
        }
      }
      if (t > prochain && N.length) {
        prochain = t + (fonce ? 220 : 380) + Math.random() * 380;
        const i = (Math.random() * N.length) | 0, c = voisin(i, -1);
        if (c != null) { impulsion(i, c); N[i].f = 0.8; }
      }
      return true;
    }
    if (suivi) hote.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = hote.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top; dedans = true;
      hote.style.setProperty('--wow-px', (clamp(px / W, 0, 1) * 2 - 1).toFixed(3));
      hote.style.setProperty('--wow-py', (clamp(py / H, 0, 1) * 2 - 1).toFixed(3));
    }, { passive: true });
    if (suivi) hote.addEventListener('pointerleave', () => {
      dedans = false;
      hote.style.setProperty('--wow-px', '0');
      hote.style.setProperty('--wow-py', '0');
    });
    return {
      voir(v) {
        vis = v;
        if (v && !tourne) { tourne = true; cv.classList.add('is-on'); lancer(dessiner); }
      },
    };
  }
  const hotes = new Set();
  sl(main.querySelectorAll('.lightning-bg, .final-bg')).forEach((bg) => {
    const h = bg.parentElement;
    if (h && h !== main && !h.closest(EXCLUS)) hotes.add(h);
  });
  const heroAccueil = main.querySelector('[data-hero]');
  if (heroAccueil) hotes.add(heroAccueil);
  const reseaux = new WeakMap();
  if (window.IntersectionObserver) {
    const io = new IntersectionObserver((entrees) => entrees.forEach((en) => {
      let r = reseaux.get(en.target);
      if (en.isIntersecting && !r) {
        if (en.target.getBoundingClientRect().width < innerWidth * 0.6) return;
        r = creerReseau(en.target);
        reseaux.set(en.target, r);
      }
      if (r) r.voir(en.isIntersecting);
    }), { rootMargin: '120px 0px' });
    const demarrer = () => hotes.forEach((h) => io.observe(h));
    if ('requestIdleCallback' in window) window.requestIdleCallback(demarrer, { timeout: 1200 });
    else setTimeout(demarrer, 500);
  }

  // anneau lumineux autour du bouton principal des en-têtes
  hotes.forEach((h) => {
    if (!h.matches('[data-hero], .phero')) return;
    const b = h.querySelector('.btn-primary, .btn--primary');
    if (!b || getComputedStyle(b, '::before').content !== 'none') return;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.classList.add('wow-ring');
  });

  // ---------- textes courts qui se décodent (étiquettes au-dessus des titres) ----------
  const MAJ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', MIN = 'abcdefghijklmnopqrstuvwxyz', CHI = '0123456789';
  const lettre = /[A-Za-z0-9À-ÖØ-öø-ÿ]/;
  function decoder(el) {
    if (el.dataset.wowDec || el.children.length) return;
    const fin = el.textContent;
    if (!fin.trim() || fin.length > 64) return;
    el.dataset.wowDec = '1';
    const r = el.getBoundingClientRect();
    const avant = { width: el.style.width, height: el.style.height, overflow: el.style.overflow };
    el.style.width = r.width + 'px'; el.style.height = r.height + 'px'; el.style.overflow = 'hidden';
    const lu = document.createElement('span');
    lu.className = 'wow-sr';
    lu.textContent = fin;
    const vu = document.createElement('span');
    vu.setAttribute('aria-hidden', 'true');
    el.textContent = '';
    el.appendChild(lu); el.appendChild(vu);
    const t0 = performance.now(), dur = 480 + fin.length * 20;
    let derniere = 0;
    lancer((t) => {
      const p = Math.min(1, (t - t0) / dur);
      if (p < 1 && t - derniere < 45) return true;
      derniere = t;
      let s = '';
      for (let i = 0; i < fin.length; i++) {
        const c = fin[i];
        if (i < p * fin.length * 1.2 - 2 || !lettre.test(c)) s += c;
        else {
          const set = CHI.indexOf(c) >= 0 ? CHI : c === c.toUpperCase() ? MAJ : MIN;
          s += set[(Math.random() * set.length) | 0];
        }
      }
      vu.textContent = s;
      if (p >= 1) {
        el.textContent = fin;
        el.style.width = avant.width; el.style.height = avant.height; el.style.overflow = avant.overflow;
        return false;
      }
      return true;
    });
  }

  // ---------- grands chiffres qui défilent jusqu'à leur valeur ----------
  function compter(el) {
    const fin = el.textContent;
    const to = parseInt(fin.trim(), 10);
    if (!isFinite(to) || to < 2) return;
    el.dataset.wowNum = '1';
    const t0 = performance.now(), dur = 900 + Math.min(700, to * 6);
    el.textContent = '0';
    lancer((t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = p >= 1 ? fin : String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      return p < 1;
    });
  }
  const chiffres = [];
  sl(main.querySelectorAll('b, strong, span, p, div, dt, dd, em')).forEach((el) => {
    if (el.children.length || !/^[1-9][0-9]{0,2}$/.test(el.textContent.trim())) return;
    if (el.closest(EXCLUS + ', a, button, form, [data-count], [data-wow-num]')) return;
    if (parseFloat(getComputedStyle(el).fontSize) < 24) return;
    chiffres.push(el);
  });

  if (window.IntersectionObserver) {
    const ioTxt = new IntersectionObserver((entrees) => entrees.forEach((en) => {
      if (!en.isIntersecting) return;
      ioTxt.unobserve(en.target);
      const el = en.target;
      if (el.dataset.wowCible === 'num') compter(el);
      else setTimeout(() => decoder(el), 160);
    }), { threshold: 0.85 });
    sl(main.querySelectorAll('.eyebrow, .pill, .kicker')).forEach((el) => {
      if (el.closest(EXCLUS) || el.children.length) return;
      ioTxt.observe(el);
    });
    chiffres.forEach((el) => {
      // un chiffre déjà à l'écran au chargement ne repart pas de zéro
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) return;
      el.dataset.wowCible = 'num';
      ioTxt.observe(el);
    });
  }

  // ---------- images qui se dévoilent au défilement (navigateurs compatibles) ----------
  if (window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')) {
    const marquer = (im) => {
      if (im.classList.contains('wow-img') || im.classList.contains('wow-img2') || im.closest(EXCLUS + ', .logo, [aria-hidden="true"]')) return;
      const r = im.getBoundingClientRect();
      if (r.width < 200 || r.height < 140) return;
      const cs = getComputedStyle(im);
      if (cs.borderTopLeftRadius.indexOf('%') >= 0 && parseFloat(cs.borderTopLeftRadius) >= 30) return;
      im.classList.add(cs.boxShadow !== 'none' ? 'wow-img2' : 'wow-img');
    };
    sl(main.querySelectorAll('img')).forEach((im) => {
      if (im.complete) marquer(im); else im.addEventListener('load', () => marquer(im), { once: true });
    });
  }
}
