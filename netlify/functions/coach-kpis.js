// KPI de l'espace coach. GET ?jours=7|30|90
// Un coach reçoit ses propres chiffres ; un admin (ADMIN_EMAILS) reçoit ceux de chaque coach et les totaux du réseau.
import { COACHES, PERIODES, json, whoIs, storeFor, lireContacts, kpisCoach, totauxReseau } from '../lib/espace.js';

export const handler = async (event, context) => {
  const qui = whoIs(context);
  if (qui.error) return qui.error;
  const demande = parseInt((event.queryStringParameters || {}).jours, 10);
  const periode = PERIODES.includes(demande) ? demande : 30;
  try {
    const store = storeFor(event);
    const contacts = await lireContacts();
    if (qui.isAdmin) {
      const coachs = (await Promise.all(COACHES.map((c) => kpisCoach(store, c, periode, contacts)))).sort((a, b) => b.kpis.tests - a.kpis.tests);
      return json(200, { admin: true, periode, totaux: totauxReseau(coachs), coachs });
    }
    return json(200, { admin: false, periode, coach: await kpisCoach(store, qui.coach, periode, contacts) });
  } catch (err) {
    return json(500, { error: err.message || 'Erreur inconnue.' });
  }
};
