// Interactions des pages structures reprises du prototype : simulateur, quiz de qualification,
// formulaires Netlify et ligne de méthode qui se remplit à la lecture.
const dataEl = document.getElementById('ps-data');
const D: any = dataEl ? JSON.parse(dataEl.textContent || '{}') : {};
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

// --- calculs des simulateurs (mêmes règles que le prototype) ---
const CALC: Record<string, (T: any) => (s: any) => any> = {
  ehpad: (T) => (s) => {
    const p = Math.max(1, Math.round((s.res * s.part) / 100)), g = Math.ceil(p / T.groupe), col = g * s.freq * T.semaines, cout = col * T.collective + s.ind * T.individuelle;
    const reco = col <= 4 && s.ind === 0 ? 'EHPAD ESSENTIEL' : col <= 8 && s.ind <= 2 ? 'EHPAD ACTIF' : 'EHPAD RÉSIDENCE (sur devis)';
    return { main: cout, sub: `Soit environ ${fr(cout / p)} € par résident participant et par mois.`,
      list: [`${p} résidents participants`, `${g} ${g > 1 ? 'groupes' : 'groupe'} de ${T.groupe} résidents maximum`, `${col} séance${col > 1 ? 's' : ''} collective${col > 1 ? 's' : ''} par mois${s.ind ? `, ${s.ind} individuelles` : ''}`], reco };
  },
  asso: (T) => (s) => {
    const mens = s.cren * T.creneau + T.forfait, saison = mens * s.mois, par = saison / s.adh, pct = (par / s.cot) * 100;
    const pc = pct < 1 ? 'moins de 1 %' : (Math.round(pct * 10) / 10).toLocaleString('fr-FR') + ' %';
    return { main: mens, sub: `Soit ${fr(saison)} € sur la saison.`,
      list: [`Environ ${(Math.round(par * 10) / 10).toLocaleString('fr-FR')} € par adhérent et par saison`, `Soit ${pc} de la cotisation moyenne`, `Pour tout financer : ${Math.ceil(par)} € de cotisation en plus`],
      reco: s.cren === 2 ? 'ASSO ESSENTIEL' : s.cren === 4 ? 'ASSO SAISON' : 'ASSO CLUB COMPLET (sur devis)' };
  },
};
let resumeSimu = '';
const os = document.querySelector<HTMLElement>('[data-os]');
if (os && D.kind && CALC[D.kind] && D.tarifs) {
  const calc = CALC[D.kind](D.tarifs);
  const q = (k: string) => os.querySelector<HTMLElement>(`[data-or="${k}"]`)!;
  let last = '';
  const upd = () => {
    const st: any = {};
    os.querySelectorAll<HTMLElement>('[data-oc]').forEach((el) => {
      const id = el.dataset.oc!;
      if (el instanceof HTMLInputElement) {
        st[id] = +el.value; el.style.setProperty('--p', (((+el.value - +el.min) / (+el.max - +el.min)) * 100) + '%');
        const v = os.querySelector(`[data-ov="${id}"]`); if (v) v.textContent = fr(+el.value);
      } else st[id] = +(el.querySelector('[aria-checked="true"]') as HTMLElement).dataset.v!;
    });
    const r = calc(st), main = q('main'), txt = fr(r.main);
    main.textContent = txt;
    if (txt !== last && !reduce) { main.classList.remove('bump'); void main.offsetWidth; main.classList.add('bump'); }
    last = txt;
    q('sub').textContent = r.sub; q('list').innerHTML = r.list.map((x: string) => `<li>${esc(x)}</li>`).join(''); q('reco').textContent = r.reco;
    resumeSimu = `${txt} € par mois · ${r.list.join(' · ')} · formule proche : ${r.reco}`;
  };
  os.addEventListener('input', upd);
  os.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.os-chip'); if (!b) return;
    b.parentElement!.querySelectorAll('.os-chip').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    upd();
  });
  upd();
}

// --- quiz de qualification ---
const card = document.querySelector<HTMLElement>('.eq-card');
if (card && D.quiz) {
  const Q = D.quiz;
  const g = (k: string) => card.querySelector<HTMLElement>(`[data-eq="${k}"]`)!;
  const step = g('step'), bar = g('bar'), res = g('res'), form = g('form') as HTMLFormElement;
  const K = Q.cles || { profil: 'priorite', format: 'autonomie', rythme: 'rythme' };
  let ans: Record<string, string> = {}, cur = 0;
  const show = (i: number, focus = false) => {
    cur = i; res.hidden = true; const qq = Q.questions[i];
    bar.style.width = (i / Q.questions.length) * 100 + '%';
    step.innerHTML = `<div class="eq-q"><span class="eq-n">Question ${i + 1} sur ${Q.questions.length}</span><h3 tabindex="-1">${esc(qq.q)}</h3><div class="eq-opts">` +
      qq.options.map((o: any, j: number) => `<button type="button" class="eq-opt" data-v="${esc(o.v)}"><span class="eq-l">${String.fromCharCode(65 + j)}</span><span class="eq-t"><b>${esc(o.l)}</b><small>${esc(o.d)}</small></span></button>`).join('') +
      '</div>' + (i ? '<button type="button" class="eq-back" data-back>← Retour</button>' : '') + '</div>';
    if (focus) step.querySelector<HTMLElement>('h3')?.focus();
  };
  const finish = () => {
    step.innerHTML = ''; bar.style.width = '100%';
    const p = Q.profils[ans[K.profil]] || { nom: '', texte: '' };
    g('nom').textContent = p.nom; g('txt').textContent = p.texte;
    g('fmt').textContent = Q.formats[ans[K.format]] || ''; g('ryt').textContent = Q.rythmes[ans[K.rythme]] || '';
    const set = (n: string, v: string) => { const i = form.querySelector<HTMLInputElement>(`input[name="${n}"]`); if (i) i.value = v; };
    set('profil', p.nom); Object.keys(ans).forEach((k) => set(k, ans[k]));
    res.hidden = false;
    g('nom').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  };
  step.addEventListener('click', (e) => {
    const t = e.target as HTMLElement, o = t.closest<HTMLElement>('.eq-opt');
    if (o) { o.classList.add('on'); ans[Q.questions[cur].id] = o.dataset.v!; setTimeout(() => (cur + 1 < Q.questions.length ? show(cur + 1, true) : finish()), 240); return; }
    if (t.closest('[data-back]')) show(cur - 1, true);
  });
  g('redo')?.addEventListener('click', () => { ans = {}; show(0, true); });
  form.addEventListener('submit', () => { const s = form.querySelector<HTMLInputElement>('input[name="simulation"]'); if (s && resumeSimu) s.value = resumeSimu; });
  show(0);
}

// --- services sur mesure : type de structure pré-choisi depuis une page segment ---
const pour = new URLSearchParams(location.search).get('pour');
if (pour) {
  const opt = document.querySelector<HTMLOptionElement>(`option[data-cle="${CSS.escape(pour)}"]`);
  if (opt) opt.selected = true;
  if (pour === 'tournee') {
    const b = document.querySelector<HTMLOptionElement>('select[name="besoin"] option[value="Un coach pour une tournée"]');
    if (b) b.selected = true;
  }
}

// --- brief du configurateur : recopié dans le message du formulaire sur mesure ---
const briefTxt = new URLSearchParams(location.search).get('brief');
if (briefTxt) {
  const ta = document.querySelector<HTMLTextAreaElement>('form[data-sm="form"] textarea[name="message"]');
  if (ta && !ta.value) ta.value = briefTxt.slice(0, 900);
}

// --- ligne de méthode qui se remplit à la lecture ---
const wraps = document.querySelectorAll<HTMLElement>('.proto .method-wrap');
if (wraps.length) {
  let tick = false;
  const up = () => {
    tick = false; const mark = window.innerHeight * 0.62;
    wraps.forEach((w) => {
      const r = w.getBoundingClientRect(), fill = w.querySelector<HTMLElement>('.method-line i');
      if (fill) fill.style.transform = `scaleY(${Math.min(1, Math.max(0, (mark - r.top) / Math.max(1, r.height))).toFixed(3)})`;
      w.querySelectorAll('li').forEach((li) => li.classList.toggle('is-on', li.getBoundingClientRect().top + 40 < mark));
    });
  };
  if (reduce) wraps.forEach((w) => { const f = w.querySelector<HTMLElement>('.method-line i'); if (f) f.style.transform = 'none'; w.querySelectorAll('li').forEach((li) => li.classList.add('is-on')); });
  else { window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(up); } }, { passive: true }); up(); }
}
