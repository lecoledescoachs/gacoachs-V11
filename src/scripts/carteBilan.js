// Carte Bilan Santé, version jeu (BilanCarte.astro).
// - arrivée : la carte tombe sur la page en faisant un tour sur elle-même (on voit qu'elle a un verso) ;
// - recto : la carte papier, qui s'incline avec un reflet sous la souris ; un clic, un appui, un glisser
//   ou le bouton « Remplir ma carte » la retourne (elle se soulève, montre sa tranche, son ombre s'étire) ;
// - verso : 5 niveaux (objectif, salle, dispos, contact, coach), une question par écran, barre d'XP,
//   « +20 XP » à chaque réponse, petites vibrations sur mobile ;
// - finale : la carte revient sur son recto, se plie et tombe dans l'urne, « A VOTÉ ! », confettis,
//   puis la tête du coach apparaît avec la salle validée ; la demande part pendant l'animation.
// Le même fichier est intégré au prototype : pas de barre oblique inversée dans ce fichier.
export function initCarteBilan(root, opts) {
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  const o = opts || {};
  const sl = (l) => Array.prototype.slice.call(l);
  const zone = root.closest('.bcz') || root.parentNode;
  const inner = root.querySelector('.bcard-in');
  const front = root.querySelector('.bcard-front');
  const back = root.querySelector('.bcard-back');
  const form = root.querySelector('form');
  if (!inner || !front || !back || !form) return;
  const btnGo = zone.querySelector('.bcz-go');
  const btnBack = zone.querySelector('.bcz-back');
  const levels = sl(form.querySelectorAll('.bg-lv'));
  const nN = form.querySelector('.bg-n');
  const niv = form.querySelector('.bg-niv');
  const live = form.querySelector('.bg-live');
  const xpv = form.querySelector('.bg-xpv');
  const btnPrev = form.querySelector('.bg-prev');
  const btnVote = form.querySelector('.bg-vote');
  const hidObj = form.querySelector('.bg-objectif');
  const hidCren = form.querySelector('.bg-creneau');
  const selSalle = form.querySelector('[name="salle"]');
  const selCoach = form.querySelector('[name="coach"]');
  const champs = sl(form.querySelectorAll('.bc-line input'));
  const persos = sl(form.querySelectorAll('.bg-perso'));
  const finAv = root.querySelector('.bg-fin-av');
  const finT = root.querySelector('.bg-fin-t');
  const finSalle = root.querySelector('.bg-fin-salle');
  const badge = form.querySelector('.bg-salle-ok');
  const badgeN = form.querySelector('.bg-salle-n');
  const red = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fin = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const now = () => performance.now();
  const easeIO = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const easeOut = (p) => 1 - Math.pow(1 - p, 4);

  // angle (0 = recto, 180 = verso), élévation (0 à 1), inclinaison qui suit la souris, arrivée
  let th = 0, lift = 0, rx = 0, ry = 0, rxT = 0, ryT = 0, dy = 0, op = 1, choc = 0;
  let anim = null, raf = 0, drag = null, verso = false, envoi = false;
  // le jeu
  let lv = 0, xp = 0, salleImposee = false;
  const gagnes = {};

  // ---------- rendu de la carte ----------
  function rendre() {
    const k = verso ? 0 : 1; // pas d'inclinaison sur le verso : la carte reste immobile pendant qu'on joue
    const a = th + ry * k;
    inner.style.transform = 'translate3d(0,' + (dy - lift * 16).toFixed(2) + 'px,' + (lift * 55).toFixed(1) + 'px) rotateX(' + (rx * k + lift * 7).toFixed(2) + 'deg) rotateY(' + a.toFixed(2) + 'deg) rotateZ(' + (lift * -2.5).toFixed(2) + 'deg) scale(' + (1 - choc * 0.035).toFixed(4) + ')';
    root.style.opacity = String(op); // jamais sur .bcard-in : une opacité aplatirait la 3D (le recto se verrait à l'envers)
    const c = Math.abs(Math.cos((a * Math.PI) / 180));
    root.style.setProperty('--shw', Math.max(0.06, c).toFixed(3));
    root.style.setProperty('--shy', (14 + lift * 30 + dy * 0.4).toFixed(1) + 'px');
    root.style.setProperty('--shb', (16 + lift * 24).toFixed(1) + 'px');
    root.style.setProperty('--sho', ((0.85 - lift * 0.4) * op).toFixed(3));
    const r = ((a % 360) + 360) % 360;
    const vue = r > 90 && r < 270 ? 'verso' : 'recto';
    if (root.dataset.vue !== vue) root.dataset.vue = vue;
  }
  function frame(t) {
    raf = 0;
    let bouge = !!drag;
    if (anim) {
      const p = anim.dur ? Math.min(1, (t - anim.t0) / anim.dur) : 1;
      th = anim.from + (anim.to - anim.from) * (anim.e || easeIO)(p);
      if (anim.entree) {
        const q = 1 - easeOut(p);
        dy = -q * 70; op = Math.min(1, p * 3.5); lift = q * 0.9; rxT = q * 22;
      } else {
        lift = (anim.l0 || 0) * (1 - p) + Math.sin(Math.PI * p) * (anim.haut === undefined ? 1 : anim.haut);
      }
      if (p >= 1) {
        th = anim.to; lift = 0; dy = 0; op = 1;
        const f = anim.fin; anim = null;
        if (f) f();
      }
      bouge = true;
    }
    if (choc > 0.001) { choc *= 0.82; bouge = true; } else choc = 0;
    if (Math.abs(rx - rxT) > 0.02 || Math.abs(ry - ryT) > 0.02) {
      rx += (rxT - rx) * 0.14; ry += (ryT - ry) * 0.14; bouge = true;
    }
    rendre();
    if (bouge || anim) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  // ---------- retournement ----------
  function retourner(versVerso, sens, dur, apres, clavier) {
    verso = versVerso;
    root.classList.toggle('is-verso', versVerso);
    zone.classList.toggle('is-verso', versVerso);
    front.inert = versVerso;
    back.inert = !versVerso;
    rxT = 0; ryT = 0;
    const base = Math.round(th / 180) * 180;
    const to = base + 180 * (sens || 1);
    if (red) { th = to; lift = 0; rendre(); if (apres) apres(); }
    else { anim = { from: th, to: to, t0: now(), dur: dur || 980, l0: lift, fin: apres }; kick(); }
    // au clavier, le focus suit la carte ; à la souris ou au doigt, on ne fait pas sortir le clavier du téléphone
    if (!envoi && (clavier || !versVerso)) {
      setTimeout(() => {
        const cible = versVerso ? premierControle(levels[lv]) : btnGo;
        if (cible) { try { cible.focus({ preventScroll: true }); } catch (x) { /* rien */ } }
      }, red ? 0 : 560);
    }
  }
  if (btnGo) btnGo.addEventListener('click', (e) => { if (!verso && !envoi) retourner(true, 1, 0, null, e.detail === 0); });
  if (btnBack) btnBack.addEventListener('click', () => { if (verso && !envoi) retourner(false, 1); });

  // ---------- recto : clic, appui ou glisser pour retourner ; inclinaison et reflet à la souris ----------
  root.addEventListener('pointerdown', (e) => {
    if (verso || envoi || anim || e.button > 0) return;
    drag = { x0: e.clientX, th0: th, w: Math.max(200, root.clientWidth), lx: e.clientX, lt: now(), v: 0, id: e.pointerId, capt: false };
    rxT = 0; ryT = 0;
    kick();
  });
  root.addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x0;
      if (!drag.capt && Math.abs(dx) > 6) {
        drag.capt = true;
        try { root.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
      }
      const t = now();
      drag.v = 0.7 * drag.v + 0.3 * ((e.clientX - drag.lx) / Math.max(8, t - drag.lt));
      drag.lx = e.clientX; drag.lt = t;
      if (drag.capt) {
        th = drag.th0 + (dx / drag.w) * 200;
        lift = Math.min(0.7, Math.abs(dx) / drag.w);
        kick();
      }
      return;
    }
    if (!fin || verso || envoi || red) return;
    const r = root.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    ryT = x * 16; rxT = -y * 11;
    root.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
    root.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
    root.style.setProperty('--go', '1');
    kick();
  });
  root.addEventListener('pointerleave', () => {
    if (drag) return;
    rxT = 0; ryT = 0;
    root.style.setProperty('--go', '.45');
    kick();
  });
  function lacher(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag, delta = th - d.th0;
    drag = null;
    if (!d.capt) { // simple clic ou appui sur la carte : on la retourne
      if (e && e.type === 'pointerup') retourner(true, 1);
      return;
    }
    const vite = Math.abs(d.v) > 0.5;
    if (Math.abs(delta) > 65 || vite) retourner(true, (vite ? d.v : delta) < 0 ? -1 : 1, 760);
    else { anim = { from: th, to: d.th0, t0: now(), dur: 520, e: easeOut, l0: lift, haut: 0 }; kick(); }
  }
  root.addEventListener('pointerup', lacher);
  root.addEventListener('pointercancel', lacher);
  root.addEventListener('lostpointercapture', lacher);
  front.addEventListener('dragstart', (e) => e.preventDefault());

  // ---------- le jeu : niveaux, XP ----------
  const vib = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (x) { /* rien */ } };
  const niveau = (nom) => levels.findIndex((l) => l.dataset.lv === nom);
  const presse = (b) => b.getAttribute('aria-pressed') === 'true';
  function premierControle(l) { return l && l.querySelector('input:not([type="hidden"]):not([type="radio"]), button:not([disabled]):not([hidden])'); }
  function majXP() {
    root.style.setProperty('--xp', xp + '%');
    if (xpv) xpv.textContent = String(xp);
  }
  function popXP(el) {
    if (!el || red) return;
    const r = el.getBoundingClientRect(), c = root.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'bg-pts';
    s.textContent = '+20 XP';
    s.style.left = (r.left + r.width / 2 - c.left).toFixed(0) + 'px';
    s.style.top = (r.top - c.top).toFixed(0) + 'px';
    root.appendChild(s);
    setTimeout(() => s.remove(), 950);
  }
  function gagner(n, el) {
    if (gagnes[n]) return;
    gagnes[n] = 1;
    xp = Math.min(100, xp + 20);
    majXP(); popXP(el); vib(12);
  }
  function allerNiveau(n, focus) {
    const avant = lv;
    lv = Math.max(0, Math.min(levels.length - 1, n));
    levels.forEach((l, i) => {
      l.classList.toggle('is-on', i === lv);
      l.classList.toggle('is-avant', i < lv);
      l.inert = i !== lv;
    });
    if (nN) nN.textContent = String(lv + 1);
    if (niv && lv !== avant) { niv.classList.remove('is-up'); void niv.offsetWidth; niv.classList.add('is-up'); }
    if (live) live.textContent = 'Niveau ' + (lv + 1) + ' sur ' + levels.length;
    if (btnPrev) btnPrev.hidden = lv === 0;
    if (focus) {
      setTimeout(() => {
        const f = premierControle(levels[lv]);
        if (f) { try { f.focus({ preventScroll: true }); } catch (x) { /* rien */ } }
      }, red ? 0 : 350);
    }
  }
  function suivant() {
    let n = lv + 1;
    if (levels[n] && levels[n].dataset.lv === 'salle' && salleImposee) { gagner('salle', null); n++; }
    allerNiveau(n, true);
  }
  if (btnPrev) btnPrev.addEventListener('click', () => {
    let n = lv - 1;
    if (levels[n] && levels[n].dataset.lv === 'salle' && salleImposee) n--;
    allerNiveau(Math.max(0, n), true);
  });

  // Niveau 1 : l'objectif (une touche suffit)
  const lvObj = levels[niveau('objectif')];
  const tObj = lvObj ? sl(lvObj.querySelectorAll('.bg-tile')) : [];
  tObj.forEach((b) => b.addEventListener('click', () => {
    tObj.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (hidObj) hidObj.value = b.dataset.v;
    gagner('objectif', b);
    setTimeout(suivant, red ? 0 : 420);
  }));

  // Niveau 2 : la salle (validée), qui choisit aussi l'équipe de coachs du niveau 5
  const lvSalle = levels[niveau('salle')];
  const tSalle = lvSalle ? sl(lvSalle.querySelectorAll('.bg-tile')) : [];
  function choisirSalle(v) {
    tSalle.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    if (selSalle) selSalle.value = v;
    persos.forEach((p) => { if (!p.classList.contains('is-any')) p.hidden = !!v && p.dataset.salle !== v; });
    const cur = persos.find(presse);
    if (cur && cur.hidden) { cur.setAttribute('aria-pressed', 'false'); if (selCoach) selCoach.value = ''; }
    if (badge) badge.hidden = !v;
    if (badgeN) badgeN.textContent = v;
    const equipe = persos.filter((p) => !p.hidden && !p.classList.contains('is-any'));
    if (equipe.length === 1 && !persos.some(presse)) choisirCoach(equipe[0], false);
    majVote();
  }
  tSalle.forEach((b) => b.addEventListener('click', () => {
    choisirSalle(b.dataset.v);
    gagner('salle', b);
    setTimeout(suivant, red ? 0 : 420);
  }));

  // Niveau 3 : les dispos (plusieurs choix possibles)
  const lvDispo = levels[niveau('dispo')];
  const cDispo = lvDispo ? sl(lvDispo.querySelectorAll('.bg-tile')) : [];
  const okDispo = lvDispo && lvDispo.querySelector('.bg-ok');
  cDispo.forEach((b) => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', String(!presse(b)));
    const choix = cDispo.filter(presse).map((x) => x.dataset.v);
    if (hidCren) hidCren.value = choix.join(', ');
    if (okDispo) okDispo.disabled = !choix.length;
    vib(8);
  }));
  if (okDispo) okDispo.addEventListener('click', () => { gagner('dispo', okDispo); suivant(); });

  // Niveau 4 : prénom et téléphone (obligatoires), mail facultatif
  const lvContact = levels[niveau('contact')];
  const okContact = lvContact && lvContact.querySelector('.bg-ok');
  const MESSAGES = { prenom: 'Indique ton prénom.', telephone: 'Indique ton numéro de téléphone (10 chiffres).', email: 'Ce mail ne semble pas valide.' };
  function invalide(c) {
    if (c.required && c.value.trim() === '') c.value = '';
    c.setCustomValidity('');
    let ok = c.checkValidity();
    if (ok && c.name === 'telephone') { // 10 à 15 chiffres, espaces, points, tirets, parenthèses et + acceptés
      const v = c.value.trim(), n = v.replace(/[^0-9]/g, '').length;
      ok = /^[0-9 +.()-]+$/.test(v) && n >= 10 && n <= 15;
    }
    if (ok) return false;
    c.setCustomValidity(MESSAGES[c.name] || '');
    return true;
  }
  function valideContact(montrer) {
    for (let j = 0; j < champs.length; j++) {
      const c = champs[j];
      if (invalide(c)) {
        if (montrer) {
          const l = c.closest('.bc-line');
          if (l) { l.classList.remove('bc-bad'); void l.offsetWidth; l.classList.add('bc-bad'); }
          try { c.focus({ preventScroll: true }); c.reportValidity(); } catch (x) { /* rien */ }
          vib([30, 40, 30]);
        }
        return false;
      }
    }
    return true;
  }
  function contactOk() {
    if (!valideContact(true)) return;
    gagner('contact', okContact);
    suivant();
  }
  if (okContact) okContact.addEventListener('click', contactOk);
  champs.forEach((c, i) => {
    c.style.setProperty('--k', String(i));
    c.addEventListener('input', () => { c.setCustomValidity(''); const l = c.closest('.bc-line'); if (l) l.classList.remove('bc-bad'); });
    c.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const n = champs[i + 1];
      if (n) n.focus(); else contactOk();
    });
  });

  // Niveau 5 : le coach, choisi comme un personnage, parmi l'équipe de la salle validée
  function majVote() { if (btnVote) btnVote.disabled = !persos.some((p) => presse(p) && !p.hidden); }
  function choisirCoach(p, effet) {
    persos.forEach((x) => x.setAttribute('aria-pressed', String(x === p)));
    if (selCoach) selCoach.value = p.dataset.v || '';
    if (effet !== false) vib(12);
    majVote();
  }
  persos.forEach((p) => p.addEventListener('click', () => choisirCoach(p)));

  // Page /bilan (et prototype) : le coach choisi sur la page avant la carte est repris, avec sa salle.
  // La page écrit les listes cachées puis envoie un événement « change » ; le jeu, lui, les écrit sans événement.
  function preReglage() {
    if (envoi) return;
    const s = selSalle ? selSalle.value : '';
    const c = selCoach ? selCoach.value : '';
    salleImposee = !!s;
    persos.forEach((x) => x.setAttribute('aria-pressed', 'false'));
    choisirSalle(s);
    const p = c && persos.find((x) => x.dataset.v === c);
    if (p) choisirCoach(p, false);
    if (salleImposee && levels[lv] && levels[lv].dataset.lv === 'salle') suivant();
  }
  if (selCoach) selCoach.addEventListener('change', preReglage);
  if (selSalle) selSalle.addEventListener('change', preReglage);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (envoi || !verso) return;
    const nom = levels[lv] && levels[lv].dataset.lv;
    if (nom === 'contact') { contactOk(); return; }
    if (nom !== 'coach' || !btnVote || btnVote.disabled) return;
    if (!valideContact(false)) {
      allerNiveau(niveau('contact'), false);
      setTimeout(() => valideContact(true), red ? 0 : 420);
      return;
    }
    // la barre d'XP se remplit à 100 %, puis la carte part dans l'urne
    envoi = true;
    zone.classList.add('is-sent');
    gagner('coach', btnVote);
    setTimeout(voter, red ? 0 : 650);
  });

  // ---------- finale : l'urne, « A VOTÉ ! », puis le coach ----------
  function envoyerFond() {
    try {
      const corps = new URLSearchParams(new FormData(form)).toString();
      return fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps }).then((r) => r.ok).catch(() => false);
    } catch (x) { return Promise.resolve(false); }
  }
  function prenomCoach() { const p = persos.find((x) => presse(x) && !x.classList.contains('is-any')); return p ? p.dataset.prenom : ''; }
  function partir(req) {
    if (o.envoyer) { o.envoyer(form); return; }
    const aller = (ok) => { if (ok) location.href = (form.getAttribute('action') || '/merci-bilan-demande/') + (prenomCoach() ? '?coach=' + encodeURIComponent(prenomCoach()) : ''); else form.submit(); };
    if (req) req.then(aller); else form.submit();
  }
  function afficherCoach() {
    // la zone d'annonce est rendue visible avant d'être remplie, pour que les lecteurs d'écran la lisent
    root.classList.add('is-fin');
    setTimeout(remplirFin, 60);
  }
  function remplirFin() {
    const p = persos.find((x) => presse(x) && !x.classList.contains('is-any'));
    const prenom = ((form.querySelector('[name="prenom"]') || {}).value || '').trim();
    const tete = (x) => { const im = document.createElement('img'); im.src = x.querySelector('img').src; im.alt = ''; return im; };
    if (finAv) {
      finAv.textContent = '';
      if (p) finAv.appendChild(tete(p));
      else {
        const equipe = persos.filter((x) => !x.hidden && !x.classList.contains('is-any')).slice(0, 3);
        if (equipe.length) equipe.forEach((x) => finAv.appendChild(tete(x)));
        else { const q = document.createElement('span'); q.className = 'bg-any'; q.textContent = '?'; finAv.appendChild(q); }
      }
    }
    if (finT) finT.textContent = (prenom ? prenom + ', ' : '') + (p ? p.dataset.prenom + ' te rappelle très vite.' : 'ton coach te rappelle très vite.');
    if (finSalle) finSalle.textContent = selSalle && selSalle.value ? selSalle.value + ' validée' : 'Demande validée';
  }
  function voter() {
    const req = o.envoyer ? null : envoyerFond();
    vib([15, 30, 15]);
    if (red) {
      retourner(false, 1);
      root.classList.add('is-vote');
      afficherCoach();
      setTimeout(() => partir(req), 2500);
      return;
    }
    retourner(false, 1, 750, () => {
      root.classList.add('is-vote');
      setTimeout(() => vib([30, 50, 90]), 1550);
      setTimeout(afficherCoach, 2750);
      setTimeout(() => partir(req), 5600);
    });
  }

  // ---------- arrivée quand la carte entre à l'écran ----------
  allerNiveau(0, false);
  majXP();
  function arrivee() {
    if (red) { op = 1; rendre(); root.classList.add('is-ready'); return; }
    th = -360; op = 0;
    anim = { from: -360, to: 0, t0: now(), dur: 1500, e: easeOut, entree: true, fin: () => { rxT = 0; root.classList.add('is-ready'); } };
    kick();
  }
  if ('IntersectionObserver' in window && !red) {
    op = 0; rendre();
    const io = new IntersectionObserver((es) => {
      if (es.some((x) => x.isIntersecting)) { io.disconnect(); arrivee(); }
    }, { threshold: 0.35 });
    io.observe(root);
  } else arrivee();
}
