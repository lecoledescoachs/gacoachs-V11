// Après le build : ajoute le balisage FAQPage aux pages qui affichent une FAQ (details.faq-item) sans l'avoir déjà.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const decode = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

export default function faqSchema() {
  return {
    name: 'faq-schema',
    hooks: {
      'astro:build:done': ({ dir }) => {
        let n = 0;
        for (const f of walk(fileURLToPath(dir))) {
          let s = fs.readFileSync(f, 'utf8');
          if (s.includes('FAQPage') || /name="robots" content="[^"]*noindex/.test(s)) continue;
          const items = [...s.matchAll(/<details class="faq-item"[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)]
            .map((m) => ({ q: decode(m[1]), a: decode(m[2]) }))
            .filter((x) => x.q && x.a);
          if (items.length < 2) continue;
          const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) };
          s = s.replace('</head>', `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script></head>`);
          fs.writeFileSync(f, s);
          n++;
        }
        console.log(`[faq-schema] FAQPage ajouté sur ${n} page(s)`);
      },
    },
  };
}
