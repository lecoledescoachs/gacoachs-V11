// llms-full.txt : version longue pour les moteurs de réponse, avec le résumé et les points clés de chaque article.
import type { APIRoute } from 'astro';
import articles from '../data/articles.json';
import { GET as base } from './llms.txt.ts';

export const GET: APIRoute = async (ctx) => {
  const head = await (await (base as any)(ctx)).text();
  const L: string[] = [head, '## Articles du blog', ''];
  for (const a of [...(articles as any[])].sort((x, y) => String(y.datePublication).localeCompare(String(x.datePublication)))) {
    L.push(`### [${a.titre}](https://gacoachs.fr/blog/${a.slug}/)`);
    L.push(a.extrait);
    const bref = Array.isArray(a.enBref) ? a.enBref : [];
    for (const b of bref) L.push(`- ${b}`);
    for (const f of (a.faq || []).slice(0, 3)) L.push(`- Q : ${f.q} R : ${f.r}`);
    L.push('');
  }
  return new Response(L.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
