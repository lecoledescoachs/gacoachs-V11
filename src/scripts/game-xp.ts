// Barre d'XP de lecture : la progression de la page, en haut de l'écran (hors blog, qui a déjà la sienne).
if (!document.querySelector('.ar-prog')) {
  const bar = document.createElement('div');
  bar.className = 'g-xp';
  bar.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('i');
  bar.appendChild(fill);
  document.body.appendChild(bar);
  const maj = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    fill.style.width = (max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0) + '%';
  };
  addEventListener('scroll', maj, { passive: true });
  addEventListener('resize', maj);
  maj();
}
