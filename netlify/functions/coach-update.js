// Mise à jour depuis l'espace coach (POST, connecté) :
//   { action: 'statut', coach, leadId, statut, note, relance }  : suivi d'un contact
//   { action: 'objectif', coach, testsPresentiel, bilans }       : objectifs du mois
// Un coach ne peut modifier que son propre espace ; un admin peut modifier tous les espaces.
import { STATUTS, coachBySlug, json, readBody, whoIs, storeFor } from '../lib/espace.js';

const entier = (v) => Math.max(0, Math.min(500, parseInt(v, 10) || 0));

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Méthode non autorisée.' });
  const qui = whoIs(context);
  if (qui.error) return qui.error;
  const b = readBody(event);
  const coach = coachBySlug(b.coach);
  if (!coach) return json(400, { error: 'Coach inconnu.' });
  if (!qui.isAdmin && (!qui.coach || qui.coach.slug !== coach.slug)) return json(403, { error: "Tu ne peux modifier que ton propre espace." });
  const store = storeFor(event);

  if (b.action === 'statut') {
    const leadId = String(b.leadId || '');
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(leadId)) return json(400, { error: 'Contact inconnu.' });
    if (!STATUTS.includes(b.statut)) return json(400, { error: 'Statut inconnu.' });
    const relance = /^\d{4}-\d{2}-\d{2}$/.test(b.relance || '') ? b.relance : '';
    const valeur = { statut: b.statut, note: String(b.note || '').slice(0, 1000), relance, maj: new Date().toISOString(), par: qui.email };
    await store.setJSON(`st/${coach.slug}/${leadId}`, valeur);
    return json(200, { ok: true, ...valeur });
  }

  if (b.action === 'objectif') {
    const valeur = { testsPresentiel: entier(b.testsPresentiel), bilans: entier(b.bilans) };
    await store.setJSON(`obj/${coach.slug}`, valeur);
    return json(200, { ok: true, objectif: valeur });
  }

  return json(400, { error: 'Action inconnue.' });
};
