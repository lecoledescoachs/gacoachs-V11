// Badge de niveau (1 à 5) sur les cartes de coachs et en tête des fiches : même repère partout.
const brut = document.getElementById('coach-niveaux')?.textContent;
const niveaux: Record<string, number> = brut ? JSON.parse(brut) : {};
const slugDe = (href: string | null) => {
  const m = (href || '').match(/^\/(?:coachs|coach-sportif-[^/]+)\/([^/]+)\/?$/);
  return m ? m[1] : '';
};
function badge(n: number, grand = false) {
  const b = document.createElement('span');
  b.className = 'lv-badge' + (grand ? ' lv-badge--l' : '');
  b.setAttribute('role', 'img');
  b.setAttribute('aria-label', `Niveau ${n} sur 5`);
  let pips = '';
  for (let i = 1; i <= 5; i++) pips += `<i class="${i <= n ? 'on' : ''}"></i>`;
  b.innerHTML = `<b>NIV. ${n}</b><span class="lv-pips" aria-hidden="true">${pips}</span>`;
  return b;
}
document.querySelectorAll<HTMLAnchorElement>('a.cg, a.ga-cg').forEach((a) => {
  const n = niveaux[slugDe(a.getAttribute('href'))];
  const photo = a.querySelector('.cg-photo, .ga-cg__photo');
  if (n && photo && !photo.querySelector('.lv-badge')) photo.appendChild(badge(n));
});
const m = location.pathname.match(/^\/(?:coachs|coach-sportif-[^/]+)\/([^/]+)\/?$/);
const h1 = document.querySelector('main h1');
if (m && niveaux[m[1]] && h1 && !document.querySelector('main h1 + .lv-badge')) h1.insertAdjacentElement('afterend', badge(niveaux[m[1]], true));
