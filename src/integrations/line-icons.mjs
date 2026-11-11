// Après le build : remplace les emojis du texte de chaque page par des icônes en trait (lucide, ISC).
// Un seul jeu d'icônes, même taille, même trait, couleur du texte. Le <head>, les attributs, les scripts et les <option> ne sont pas touchés.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICONS = JSON.parse(fs.readFileSync(new URL('./line-icons.json', import.meta.url), 'utf8'));
const EMOJI = /(?:[\u{1F300}-\u{1FAFF}☀-➿⭐⬆✅❌✨❤]️?(?:‍[\u{1F300}-\u{1FAFF}☀-➿❤]️?)*)/gu;
// symboles typographiques gardés tels quels : étoiles de notation, coches, croix, flèches
const KEEP = new Set(['★', '✓', '✕', '❚', '➤', '✔', '✖', '☆']);
const SKIP = /<(script|style|svg|title|option|textarea|noscript|select)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->|<[^>]+>/gi;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

export default function lineIcons() {
  return {
    name: 'line-icons',
    hooks: {
      'astro:build:done': ({ dir }) => {
        let pages = 0, done = 0;
        const left = {};
        for (const f of walk(fileURLToPath(dir))) {
          const html = fs.readFileSync(f, 'utf8');
          const i = html.indexOf('<body');
          if (i < 0) continue;
          const head = html.slice(0, i), body = html.slice(i);
          let changed = false;
          let out = '', last = 0;
          const conv = (text) => text.replace(EMOJI, (e) => {
            if (KEEP.has(e)) return e;
            const g = ICONS[e.replace(/\uFE0F/g, '')];
            if (!g) { const k = e.replace(/\uFE0F/g, ''); left[k] = (left[k] || 0) + 1; return e; }
            changed = true; done++;
            return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${g}</svg>`;
          });
          for (const m of body.matchAll(SKIP)) {
            out += conv(body.slice(last, m.index)) + m[0];
            last = m.index + m[0].length;
          }
          out += conv(body.slice(last));
          if (changed) { fs.writeFileSync(f, head + out); pages++; }
        }
        console.log(`[line-icons] ${done} emoji remplacés sur ${pages} page(s)`);
        const rest = Object.entries(left).sort((a, b) => b[1] - a[1]);
        if (rest.length) console.log('[line-icons] non remplacés :', rest.map(([k, v]) => `${k}${v}`).join(' '));
      },
    },
  };
}
