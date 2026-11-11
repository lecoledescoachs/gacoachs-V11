// Indicateur de position sous les carrousels mobiles (points), créé seulement sur téléphone.
const SEL = '.ex-grid,.rj-avs,.guides,.eh-guides,.m-rail';
function init() {
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  document.querySelectorAll(SEL).forEach((rail) => {
    const n = rail.children.length;
    if (n < 2 || rail.dataset.hint || rail.scrollWidth <= rail.clientWidth + 4) return;
    rail.dataset.hint = '1';
    // accessible au clavier : la zone qui défile peut recevoir le focus
    if (!rail.hasAttribute('tabindex')) rail.tabIndex = 0;
    if (!rail.getAttribute('aria-label')) { if (!/^(UL|OL)$/.test(rail.tagName)) rail.setAttribute('role', 'region'); rail.setAttribute('aria-label', 'Liste à faire défiler'); }
    const hint = document.createElement('div');
    hint.className = 'm-rail-hint';
    hint.setAttribute('aria-hidden', 'true');
    const dots = [];
    for (let i = 0; i < n; i++) { const d = document.createElement('i'); hint.appendChild(d); dots.push(d); }
    rail.insertAdjacentElement('afterend', hint);
    let raf = 0;
    const maj = () => {
      raf = 0;
      const first = rail.children[0];
      const pas = (rail.children[1]?.offsetLeft ?? 0) - first.offsetLeft || rail.clientWidth;
      let k = Math.round(rail.scrollLeft / pas);
      if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4) k = n - 1;
      dots.forEach((d, i) => d.classList.toggle('on', i === Math.min(k, n - 1)));
    };
    rail.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(maj); }, { passive: true });
    maj();

    // Défilement automatique : toutes les 3,5 s, seulement quand le carrousel est à l'écran.
    // Il s'arrête dès que la personne touche le carrousel, et ne démarre pas si « réduire les animations » est activé.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0, visible = false, arrete = false;
    const pause = document.createElement('button');
    pause.type = 'button';
    pause.className = 'm-rail-pause';
    pause.setAttribute('aria-label', 'Mettre en pause le défilement automatique');
    pause.textContent = '❚❚';
    hint.removeAttribute('aria-hidden');
    dots.forEach((d) => d.setAttribute('aria-hidden', 'true'));
    hint.appendChild(pause);
    const suivant = () => {
      const pas = (rail.children[1]?.offsetLeft ?? 0) - rail.children[0].offsetLeft || rail.clientWidth;
      const fin = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
      rail.scrollTo({ left: fin ? 0 : rail.scrollLeft + pas, behavior: 'smooth' });
    };
    const demarrer = () => { if (!timer && visible && !arrete) timer = window.setInterval(suivant, 3500); };
    const stopper = () => { window.clearInterval(timer); timer = 0; };
    const arreter = () => {
      arrete = true; stopper();
      pause.textContent = '▶'; pause.setAttribute('aria-label', 'Relancer le défilement automatique');
    };
    pause.addEventListener('click', () => {
      if (arrete) { arrete = false; pause.textContent = '❚❚'; pause.setAttribute('aria-label', 'Mettre en pause le défilement automatique'); demarrer(); }
      else arreter();
    });
    ['touchstart', 'pointerdown', 'wheel', 'focusin'].forEach((ev) => rail.addEventListener(ev, arreter, { passive: true }));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? demarrer() : stopper(); }, { threshold: 0.5 }).observe(rail);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

// Longues listes de liens (villes, guides) : on n'affiche que les premiers sur téléphone, avec un bouton « Voir tout »
function replier() {
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  document.querySelectorAll('.chips-row, .sp-villes, .guides-plus, .m-replier').forEach((liste) => {
    const items = [...liste.children].filter((c) => c.tagName !== 'BUTTON');
    const garder = liste.classList.contains('guides-plus') ? 5 : 8;
    if (items.length <= garder + 2 || liste.dataset.replie) return;
    liste.dataset.replie = '1';
    items.slice(garder).forEach((c) => c.classList.add('m-cache'));
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.className = 'm-voir-tout';
    bt.setAttribute('aria-expanded', 'false');
    bt.textContent = `Voir les ${items.length - garder} autres`;
    bt.addEventListener('click', () => {
      items.forEach((c) => c.classList.remove('m-cache'));
      bt.remove();
    });
    liste.insertAdjacentElement('afterend', bt);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', replier); else replier();

// Longs paragraphs : 5 lignes puis « Lire la suite » (hors articles de blog et questions fréquentes)
function lireLaSuite() {
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  const cibles = [...document.querySelectorAll('.rb .ch .ch-acc, .proto p, .rb p, main .section p')].filter((p) =>
    !p.dataset.suite && !p.closest('article, .prose, details, .faq, .faq-list, form, footer, .cookie-banner') &&
    (p.matches('.ch-acc') || p.textContent.trim().length > 420));
  cibles.forEach((p) => {
    p.dataset.suite = '1';
    p.classList.add('m-clamp');
    if (p.scrollHeight <= p.clientHeight + 4) { p.classList.remove('m-clamp'); return; }
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.className = 'm-suite';
    bt.textContent = 'Lire la suite';
    bt.setAttribute('aria-expanded', 'false');
    bt.addEventListener('click', () => {
      const ouvert = p.classList.toggle('is-open');
      bt.textContent = ouvert ? 'Réduire' : 'Lire la suite';
      bt.setAttribute('aria-expanded', String(ouvert));
    });
    p.insertAdjacentElement('afterend', bt);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lireLaSuite); else lireLaSuite();

// Tableaux comparatifs : sur téléphone, une carte par colonne (formule) au lieu d'un tableau à faire défiler
function tableauxEnCartes() {
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  document.querySelectorAll('.tbl-wrap table, table.m-cartes').forEach((tb) => {
    if (tb.dataset.cartes) return;
    const rows = [...tb.rows];
    if (rows.length < 2 || rows[0].cells.length < 3) return;
    tb.dataset.cartes = '1';
    const tete = [...rows[0].cells].map((c) => c.textContent.trim());
    const bloc = document.createElement('div');
    bloc.className = 'm-tcartes';
    for (let col = 1; col < tete.length; col++) {
      const carte = document.createElement('div');
      carte.className = 'm-tcarte';
      const h = document.createElement('p');
      h.className = 'm-tcarte__t';
      h.textContent = tete[col];
      carte.appendChild(h);
      const dl = document.createElement('dl');
      rows.slice(1).forEach((r) => {
        if (!r.cells[col]) return;
        const dt = document.createElement('dt'); dt.textContent = r.cells[0].textContent.trim();
        const dd = document.createElement('dd'); dd.innerHTML = r.cells[col].innerHTML;
        dl.append(dt, dd);
      });
      carte.appendChild(dl);
      bloc.appendChild(carte);
    }
    const wrap = tb.closest('.tbl-wrap') || tb;
    wrap.insertAdjacentElement('beforebegin', bloc);
    wrap.classList.add('m-cache-tableau');
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tableauxEnCartes); else tableauxEnCartes();

// Page Rejoindre : sections très longues repliées sur téléphone (≈ 2 écrans visibles, bouton pour tout lire)
function sectionsRepliees() {
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  if (!/^\/(rejoindre|coach-sportif-a-domicile\/devenir-coach)\/?$/.test(location.pathname)) return;
  document.querySelectorAll('main section.sec, .proto section.sec').forEach((sec) => {
    const inner = sec.querySelector(':scope > .inner');
    if (!inner || sec.dataset.repli || sec.id === 'candidature' || sec.id === 'simulateur' || sec.querySelector('form, details')) return;
    if (inner.scrollHeight < 1300) return;
    sec.dataset.repli = '1';
    inner.classList.add('m-sec-clamp');
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.className = 'm-sec-btn';
    bt.setAttribute('aria-expanded', 'false');
    bt.textContent = 'Voir toute la section';
    bt.addEventListener('click', () => {
      const ouvert = inner.classList.toggle('is-open');
      bt.textContent = ouvert ? 'Réduire' : 'Voir toute la section';
      bt.setAttribute('aria-expanded', String(ouvert));
    });
    inner.insertAdjacentElement('afterend', bt);
  });
}
if (document.readyState === 'complete') sectionsRepliees(); else window.addEventListener('load', sectionsRepliees);
