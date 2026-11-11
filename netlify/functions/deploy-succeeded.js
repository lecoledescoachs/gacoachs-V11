// IndexNow : après chaque mise en ligne en production, on signale toutes les URL du sitemap
// à Bing (et aux moteurs partenaires d'IndexNow) pour qu'ils les recrawlent sans attendre.
// La clé est publiée dans /6169f76680a082c4b63907a59e62d1da.txt (obligatoire pour IndexNow).
const KEY = '6169f76680a082c4b63907a59e62d1da';
const HOST = 'gacoachs.fr';

export const handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || '{}').payload || {};
    if (payload.context && payload.context !== 'production') return { statusCode: 200, body: 'ignoré (pas la production)' };
    const xml = await (await fetch(`https://${HOST}/sitemap-0.xml`)).text();
    const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).slice(0, 10000);
    if (!urlList.length) return { statusCode: 200, body: 'sitemap vide' };
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
    });
    console.log(`[indexnow] ${urlList.length} URL envoyées, réponse ${res.status}`);
    return { statusCode: 200, body: `IndexNow : ${urlList.length} URL, ${res.status}` };
  } catch (e) {
    console.error('[indexnow] échec', e);
    return { statusCode: 200, body: 'IndexNow en échec (sans impact sur le site)' };
  }
};
