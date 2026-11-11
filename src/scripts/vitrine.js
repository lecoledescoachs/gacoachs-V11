// Showroom « Le bleu GA » : deux mannequins (homme, femme) en tenue GA.
// - apparition : le showroom s'allume et les mannequins se matérialisent (balayage lumineux) ;
// - rotation à la souris, au doigt (glisser ou appuyer) ou au clavier, avec élan et aimantation :
//   avec 4 vues (face, profil, dos, profil), fondu entre vues voisines à largeur de silhouette égale ;
//   avec 2 vues (face, dos), la face pivote jusqu'au profil puis laisse place au dos ;
// - « Voir le dos » retourne les deux mannequins, les boutons de tenue changent le bas au laser ;
// - relief qui suit la souris, points de zoom avec loupe sur les détails ;
// - sans action du visiteur, les mannequins se retournent à tour de rôle (sauf animation réduite).
export function initVitrine(root) {
  if (!root || root.dataset.ready) return;
  const standsEl = Array.prototype.slice.call(root.querySelectorAll('.sw-stand'));
  if (!standsEl.length) return;
  root.dataset.ready = '1';
  root.classList.add('js-on');
  const red = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fin = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const now = () => performance.now();
  const easeIO = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const scene = root.querySelector('.sw-scene');
  const loupe = root.querySelector('.sw-loupe');
  const flipBtn = root.querySelector('[data-flip]');

  let visible = false, seen = false, raf = 0, last = 0, timer = 0, lastUser = -1e9, nextAuto = 0, tour = 0;
  let px = 0, py = 0, pxT = 0, pyT = 0, hotOuvert = null, demoFaite = false;

  const S = standsEl.map((st) => {
    const vues = Array.prototype.slice.call(st.querySelectorAll('.sw-face')).map((el) => ({ el, id: el.dataset.id || 'face', a: Number(el.dataset.a) || 0, w: Number(el.dataset.w) || 1 }));
    vues.sort((x, y) => x.a - y.a);
    const multi = vues.length > 2;
    return { st, turn: st.querySelector('.sw-turn'), vues, multi, pas: multi ? 360 / vues.length : 180, theta: 0, vel: 0, drag: false, anim: null, downX: 0, downT: 0, lastX: 0, lastT: 0, moved: 0 };
  });
  const mod = (a) => ((a % 360) + 360) % 360;
  const lisse = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const prochaine = (s, sens) => Math.round(s.theta / s.pas) * s.pas + sens * s.pas;
  const duree = (s) => (s.multi ? 820 : 1000);
  function vueA(s, theta) { // vue la plus proche d'un angle donné
    const r = mod(theta);
    if (s.multi) return s.vues[Math.round(r / s.pas) % s.vues.length].id;
    return Math.abs(r - 180) < 90 ? 'dos' : 'face';
  }

  // ---------- rendu d'un mannequin selon son angle ----------
  function poser(el, t, sc, o, b) {
    el.style.setProperty('--t', t.toFixed(2) + 'deg');
    el.style.setProperty('--s', sc.toFixed(3));
    el.style.setProperty('--o', o.toFixed(3));
    el.style.setProperty('--b', b.toFixed(2) + 'px');
    el.style.setProperty('--sx', (50 + t * 1.6).toFixed(1) + '%');
    el.style.visibility = o > 0.005 ? 'visible' : 'hidden';
  }
  function rendre(s) {
    const r = mod(s.theta);
    if (s.multi) {
      // entre deux vues voisines A et B : les deux silhouettes prennent la même largeur ; B apparaît
      // par-dessus A, puis A s'efface (jamais de mannequin transparent au milieu du mouvement)
      const n = s.vues.length, q = r / s.pas, k = Math.floor(q) % n, p = q - Math.floor(q);
      const A = s.vues[k], B = s.vues[(k + 1) % n];
      const bump = Math.sin(Math.PI * p);
      const ww = A.w + (B.w - A.w) * lisse(0, 1, p);
      s.vues.forEach((v) => {
        if (v === A) { poser(v.el, p * 26, (ww / A.w) * (1 - 0.04 * bump), 1 - lisse(0.5, 0.68, p), bump * 1.8); v.el.style.zIndex = '1'; }
        else if (v === B) { poser(v.el, -(1 - p) * 26, (ww / B.w) * (1 - 0.04 * bump), lisse(0.34, 0.54, p), bump * 1.8); v.el.style.zIndex = '2'; }
        else { poser(v.el, 0, 1, 0, 0); v.el.style.zIndex = '0'; }
      });
    } else {
      const aF = r <= 180 ? r : r - 360;
      const aB = r - 180;
      s.vues.forEach((v) => {
        const a = v.id === 'dos' ? aB : aF;
        const ab = Math.abs(a);
        const o = ab <= 74 ? 1 : ab >= 106 ? 0 : 1 - (ab - 74) / 32; // fondu face / dos autour du profil
        const bump = Math.max(0, 1 - Math.abs(ab - 90) / 22); // effet de vitesse au passage du profil
        const t = Math.max(-90, Math.min(90, a)) * 0.4; // inclinaison 3D visible
        poser(v.el, t, 1 - 0.12 * bump, o, bump * 1.8);
      });
    }
    const vue = vueA(s, s.theta);
    if (s.st.dataset.vue !== vue) {
      s.st.dataset.vue = vue;
      if (vue !== 'face' && hotOuvert && s.st.contains(hotOuvert)) fermer();
      majFlip();
    }
  }
  function rendreTout() {
    S.forEach(rendre);
    if (scene) { scene.style.setProperty('--px', px.toFixed(3)); scene.style.setProperty('--py', py.toFixed(3)); }
  }
  function majFlip() {
    const dos = S.every((s) => s.st.dataset.vue === 'dos');
    root.classList.toggle('is-dos', dos);
    if (flipBtn) flipBtn.setAttribute('aria-pressed', String(dos));
  }

  // ---------- animations ----------
  function go(s, to, dur, e) {
    s.anim = { from: s.theta, to, t0: now(), dur: red ? 0 : dur, e: e || easeIO };
    kick();
  }
  const aimanter = (s) => go(s, Math.round(s.theta / s.pas) * s.pas, 560, easeOut);
  function vers(s, vue, dur) {
    const base = Math.round(s.theta / 360) * 360;
    go(s, vue === 'face' ? base : s.theta >= base ? base + 180 : base - 180, dur || 1100);
  }
  function frame(t) {
    raf = 0;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    let bouge = false;
    S.forEach((s) => {
      if (s.anim) {
        const p = s.anim.dur ? Math.min(1, (t - s.anim.t0) / s.anim.dur) : 1;
        s.theta = s.anim.from + (s.anim.to - s.anim.from) * s.anim.e(p);
        if (p >= 1) s.anim = null;
        bouge = true;
      } else if (!s.drag && Math.abs(s.vel) >= 60) { // élan après un lancer
        s.theta += s.vel * dt;
        s.vel *= Math.exp(-dt * 3.2);
        if (Math.abs(s.vel) < 60) { s.vel = 0; aimanter(s); }
        bouge = true;
      }
      if (s.drag) bouge = true;
    });
    if (Math.abs(px - pxT) > 0.002 || Math.abs(py - pyT) > 0.002) {
      const k = Math.min(1, dt * 6);
      px += (pxT - px) * k; py += (pyT - py) * k;
      bouge = true;
    }
    rendreTout();
    if (visible && bouge) raf = requestAnimationFrame(frame);
    else planifier();
  }
  function kick() {
    if (!raf && visible) { last = now(); raf = requestAnimationFrame(frame); }
  }
  // Rotation automatique, un mannequin à la fois : avec 4 vues, un tour complet par étapes (face, profil,
  // dos, profil, face) ; avec 2 vues, un retournement.
  let autoS = null, autoReste = 0;
  function planifier() {
    clearTimeout(timer);
    if (red || !visible || document.hidden || !root.classList.contains('is-ready')) return;
    const wait = Math.max(nextAuto, lastUser + 7000) - now();
    timer = setTimeout(() => {
      const occupe = S.some((s) => s.drag || s.anim || Math.abs(s.vel) >= 60);
      if (!visible || occupe || hotOuvert || now() - lastUser < 7000) { planifier(); return; }
      if (!autoS || autoReste <= 0) { autoS = S[tour % S.length]; tour++; autoReste = autoS.multi ? autoS.vues.length : 1; }
      const s = autoS;
      autoReste--;
      const dest = prochaine(s, 1);
      const dur = s.multi ? 900 : 1500;
      go(s, dest, dur);
      nextAuto = now() + dur + (autoReste > 0 ? 700 : vueA(s, dest) === 'face' ? 2600 : 2200);
    }, Math.max(60, wait));
  }
  const action = () => { lastUser = now(); autoReste = 0; };

  // ---------- glisser / appuyer sur un mannequin ----------
  // Le mannequin visé est repéré par sa position à l'écran : dans une scène en 3D qui bouge avec la souris,
  // le navigateur peut attribuer le clic au fond de la scène.
  let tenu = null;
  function pointSous(x, y) { // point de zoom visible sous le pointeur (même repérage par position)
    let h = null;
    root.querySelectorAll('.sw-stand[data-vue="face"] .sw-hot').forEach((b) => {
      const r = b.getBoundingClientRect();
      if (r.width && x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4) h = b;
    });
    return h;
  }
  function sousLeDoigt(x, y) {
    let best = null, bd = 1e9;
    S.forEach((s) => {
      const r = s.st.getBoundingClientRect();
      if (x < r.left - 14 || x > r.right + 14 || y < r.top - 24 || y > r.bottom + 30) return;
      const d = Math.abs(x - (r.left + r.width / 2));
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }
  if (scene) {
    scene.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || (e.target.closest && e.target.closest('.sw-hot')) || pointSous(e.clientX, e.clientY)) return;
      const s = sousLeDoigt(e.clientX, e.clientY);
      if (!s) return;
      tenu = s;
      s.drag = true; s.anim = null; s.vel = 0; s.moved = 0;
      s.downX = s.lastX = e.clientX; s.downT = s.lastT = now(); action();
      try { scene.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
      root.classList.add('is-drag');
      fermer();
      kick();
    });
    scene.addEventListener('pointermove', (e) => {
      const s = tenu;
      if (!s || !s.drag) return;
      const t = now(), dx = e.clientX - s.lastX;
      const d = (dx / Math.max(140, s.turn.clientWidth)) * 190;
      s.theta += d; s.moved += Math.abs(dx);
      s.vel = 0.75 * s.vel + 0.25 * (d / Math.max(0.008, (t - s.lastT) / 1000));
      s.lastX = e.clientX; s.lastT = t; action();
      kick();
    });
    const lacher = (e) => {
      const s = tenu;
      if (!s || !s.drag) return;
      tenu = null;
      s.drag = false;
      root.classList.remove('is-drag');
      action();
      if (now() - s.lastT > 90) s.vel = 0;
      if (s.moved < 6 && now() - s.downT < 400 && e && e.type === 'pointerup') { s.vel = 0; go(s, prochaine(s, 1), duree(s)); }
      else if (Math.abs(s.vel) < 60) aimanter(s);
      kick();
    };
    scene.addEventListener('pointerup', lacher);
    scene.addEventListener('pointercancel', lacher);
    scene.addEventListener('lostpointercapture', lacher);
    scene.addEventListener('dragstart', (e) => e.preventDefault());
    // clic attribué au fond de la scène alors qu'il vise un point de zoom : on le transmet au point
    scene.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('.sw-hot')) return;
      const h = pointSous(e.clientX, e.clientY);
      if (h) { e.stopPropagation(); h.click(); }
    });
  }

  // ---------- clavier sur chaque mannequin ----------
  S.forEach((s) => {
    const turn = s.turn;
    turn.addEventListener('keydown', (e) => {
      if (e.target !== turn) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') go(s, prochaine(s, 1), duree(s));
      else if (e.key === 'ArrowLeft') go(s, prochaine(s, -1), duree(s));
      else return;
      e.preventDefault(); action(); fermer();
    });
  });

  // ---------- relief qui suit la souris ----------
  if (fin && !red && scene) {
    root.addEventListener('pointermove', (e) => {
      const r = root.getBoundingClientRect();
      pxT = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pyT = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    });
    root.addEventListener('pointerleave', () => { pxT = 0; pyT = 0; kick(); });
  }

  // ---------- boutons ----------
  if (flipBtn) flipBtn.addEventListener('click', () => {
    action(); fermer();
    const versDos = !S.every((s) => s.st.dataset.vue === 'dos');
    S.forEach((s, i) => setTimeout(() => vers(s, versDos ? 'dos' : 'face', 1200), red ? 0 : i * 140));
  });
  root.querySelectorAll('[data-tenue-btn]').forEach((b) => b.addEventListener('click', () => {
    const t = b.getAttribute('data-tenue-btn');
    if (root.dataset.tenue === t) return;
    action(); fermer();
    root.dataset.tenue = t;
    root.querySelectorAll('[data-tenue-btn]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    S.forEach((s, i) => setTimeout(() => changerTenue(s, t), red ? 0 : i * 160));
  }));
  function changerTenue(s, t) {
    s.st.querySelectorAll('.sw-face').forEach((f) => {
      const nouv = f.querySelector('.sw-img[data-tenue="' + t + '"]');
      const anc = f.querySelector('.sw-img.on:not([data-tenue="' + t + '"])');
      if (!nouv || nouv === anc) return;
      if (red) {
        if (anc) anc.classList.remove('on');
        nouv.classList.add('on');
        majImg(f);
        return;
      }
      nouv.classList.remove('is-in'); void nouv.offsetWidth;
      nouv.classList.add('on', 'is-in');
      f.classList.remove('is-scan'); void f.offsetWidth; f.classList.add('is-scan');
      setTimeout(() => {
        if (anc && root.dataset.tenue === t) anc.classList.remove('on');
        nouv.classList.remove('is-in');
        f.classList.remove('is-scan');
        majImg(f);
      }, 980);
    });
  }
  function majImg(f) { // reflet et brillance suivent la photo affichée
    const actif = f.querySelector('.sw-img[data-tenue="' + root.dataset.tenue + '"]') || f.querySelector('.sw-img.on');
    if (actif) f.style.setProperty('--img', 'url("' + actif.getAttribute('src') + '")');
  }

  // ---------- points de zoom et loupe ----------
  const limg = loupe && loupe.querySelector('img');
  const ltit = loupe && loupe.querySelector('b');
  const lsous = loupe && loupe.querySelector('small');
  function ouvrir(btn) {
    if (!loupe || !scene) return;
    if (hotOuvert && hotOuvert !== btn) hotOuvert.setAttribute('aria-expanded', 'false');
    hotOuvert = btn;
    btn.setAttribute('aria-expanded', 'true');
    if (limg.getAttribute('src') !== btn.dataset.img) limg.setAttribute('src', btn.dataset.img);
    ltit.textContent = btn.dataset.titre || '';
    lsous.textContent = btn.dataset.sous || '';
    // placement : à côté du point, côté où il y a de la place, sans sortir du showroom
    const sr = scene.getBoundingClientRect(), br = btn.getBoundingClientRect();
    loupe.style.setProperty('--lx', '0px'); loupe.style.setProperty('--ly', '0px');
    const lw = loupe.offsetWidth, lh = loupe.offsetHeight;
    const cx = br.left + br.width / 2 - sr.left, cy = br.top + br.height / 2 - sr.top;
    const droite = cx + 22 + lw <= sr.width - 8 || cx < sr.width / 2;
    let x = droite ? cx + 22 : cx - 22 - lw;
    x = Math.max(8, Math.min(sr.width - lw - 8, x));
    const y = Math.max(8, Math.min(sr.height - lh - 8, cy - lh / 2));
    loupe.style.setProperty('--lo', droite ? 'left' : 'right');
    loupe.style.setProperty('--lx', x.toFixed(0) + 'px');
    loupe.style.setProperty('--ly', y.toFixed(0) + 'px');
    loupe.classList.add('on');
  }
  function fermer() {
    if (hotOuvert) hotOuvert.setAttribute('aria-expanded', 'false');
    hotOuvert = null;
    if (loupe) loupe.classList.remove('on');
  }
  root.querySelectorAll('.sw-hot').forEach((b) => {
    let parPointeur = false, parSurvol = false;
    b.addEventListener('pointerdown', () => { parPointeur = true; });
    b.addEventListener('click', (e) => {
      e.stopPropagation(); action(); parPointeur = false;
      if (hotOuvert === b && !parSurvol) fermer(); else { parSurvol = false; ouvrir(b); }
    });
    b.addEventListener('focus', () => { if (parPointeur) return; action(); ouvrir(b); });
    b.addEventListener('blur', () => { parPointeur = false; if (hotOuvert === b && !parSurvol) fermer(); });
    if (fin) {
      b.addEventListener('mouseenter', () => { action(); parSurvol = true; ouvrir(b); });
      b.addEventListener('mouseleave', () => { if (hotOuvert === b && parSurvol) fermer(); parSurvol = false; });
    }
  });
  document.addEventListener('click', (e) => { if (hotOuvert && !(e.target.closest && e.target.closest('.sw-hot'))) fermer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermer(); });

  // ---------- apparition (quand le showroom arrive à l'écran) ----------
  function charger() {
    root.querySelectorAll('.sw-img').forEach((img) => { img.loading = 'eager'; });
    if (limg) limg.loading = 'eager';
    root.querySelectorAll('.sw-face').forEach(majImg);
    root.classList.add('has-img');
  }
  function demarrer() {
    const imgs = Array.prototype.slice.call(root.querySelectorAll('.sw-img.on'));
    const prets = Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve())));
    const delai = new Promise((r) => setTimeout(r, 1600));
    Promise.race([prets, delai]).then(() => {
      root.classList.add('is-on');
      if (red) {
        S.forEach((s) => s.st.classList.add('is-up'));
        root.classList.add('is-ready');
        return;
      }
      S.forEach((s, i) => setTimeout(() => {
        s.st.classList.add('is-up', 'is-rise');
        setTimeout(() => s.st.classList.remove('is-rise'), 1250);
      }, 450 + i * 300));
      setTimeout(() => {
        root.classList.add('is-ready');
        nextAuto = now() + 3800;
        planifier();
        // petite démonstration du zoom, une seule fois, si personne n'a encore touché au showroom
        setTimeout(() => {
          if (demoFaite || now() - lastUser < 4000 || !visible) return;
          demoFaite = true;
          const b = root.querySelector('.sw-stand .sw-face.is-face .sw-hot[data-tenue="' + root.dataset.tenue + '"]');
          if (b) { ouvrir(b); setTimeout(() => { if (hotOuvert === b) fermer(); }, 2600); }
        }, 900);
      }, 1700);
    });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      visible = es.some((x) => x.isIntersecting);
      if (visible && !seen) { seen = true; charger(); demarrer(); }
      if (visible) { rendreTout(); planifier(); } else { clearTimeout(timer); fermer(); }
    }, { threshold: 0.25 }).observe(root);
  } else {
    visible = true; seen = true; charger();
    root.classList.add('is-on', 'is-ready');
    S.forEach((s) => s.st.classList.add('is-up'));
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else planifier(); });
  window.addEventListener('resize', () => { if (hotOuvert) ouvrir(hotOuvert); });
  rendreTout();
}
