// Comptage du Score Santé et de l'agenda, sans passer par les formulaires Netlify (qui ont un quota mensuel).
// POST { type: 'scan'|'test'|'agenda'|'bilan', coach, source: 'lien'|'presentiel'|'site'|'agenda', score }
import { TYPES, SOURCES, coachBySlug, json, readBody, storeFor, ajouterEvenement } from '../lib/espace.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Méthode non autorisée.' });
  const b = readBody(event);
  const type = TYPES.includes(b.type) ? b.type : null;
  const coach = b.coach && coachBySlug(b.coach) ? b.coach : 'sans-coach';
  const source = SOURCES.includes(b.source) ? b.source : coach === 'sans-coach' ? 'site' : 'lien';
  const score = type === 'test' && Number.isInteger(b.score) && b.score >= 0 && b.score <= 100 ? b.score : 'x';
  if (!type) return json(400, { error: 'Type inconnu.' });
  if (type === 'test' && score === 'x') return json(400, { error: 'Score manquant.' });
  try {
    await ajouterEvenement(storeFor(event), { type, coach, source, score });
    return { statusCode: 204, body: '' };
  } catch (err) {
    return json(500, { error: 'Enregistrement impossible.' });
  }
};
