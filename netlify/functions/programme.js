// POST { objectif, niveau, jours, duree, materiel, limites[] } -> { programme }
// Les exercices sont choisis par des règles. Si ANTHROPIC_API_KEY est définie, un modèle d'IA personnalise
// le résumé, les conseils et la progression (10 appels par jour et par visiteur au maximum, délai de 8 secondes).
import { createHash } from 'node:crypto';
import { connectLambda, getStore } from '@netlify/blobs';
import { validerReponses, construireProgramme, promptIA, fusionnerIA } from '../lib/programme.js';

const rep = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const LIMITE_JOUR = 10;
// Plafond global : au-delà, le programme est construit par les règles seules, sans appel à l'IA (facture maîtrisée).
const LIMITE_GLOBALE_JOUR = 300;

async function autorise(event) {
  try {
    connectLambda(event);
    const store = getStore({ name: 'ga-programme', consistency: 'strong' });
    const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'inconnu';
    const cle = 'rl/' + new Date().toISOString().slice(0, 10) + '/' + createHash('sha256').update(ip).digest('hex').slice(0, 16);
    const n = parseInt((await store.get(cle)) || '0', 10);
    if (n >= LIMITE_JOUR) return false;
    const cleGlobale = 'rl/' + new Date().toISOString().slice(0, 10) + '/total';
    const total = parseInt((await store.get(cleGlobale)) || '0', 10);
    if (total >= LIMITE_GLOBALE_JOUR) return false;
    await store.set(cle, String(n + 1));
    await store.set(cleGlobale, String(total + 1));
    return true;
  } catch (e) {
    return false;
  }
}

async function appelIA(rep_, prog) {
  const { system, user } = promptIA(rep_, prog);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 700, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!r.ok) return prog;
    const d = await r.json();
    const texte = (d.content || []).map((x) => x.text || '').join('');
    return fusionnerIA(prog, texte);
  } catch (e) {
    return prog;
  } finally {
    clearTimeout(t);
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return rep(405, { error: 'Méthode non autorisée.' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return rep(400, { error: 'Requête invalide.' }); }
  const r = validerReponses(body);
  if (!r) return rep(400, { error: 'Réponses incomplètes.' });
  let prog = construireProgramme(r);
  if (process.env.ANTHROPIC_API_KEY && (await autorise(event))) prog = await appelIA(r, prog);
  return rep(200, { programme: prog });
};
