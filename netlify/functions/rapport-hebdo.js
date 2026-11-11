// Rapport hebdomadaire envoyé aux admins (ADMIN_EMAILS) chaque lundi matin (voir netlify.toml).
// Chiffres des 7 derniers jours par coach, contacts en attente, et nettoyage des événements de plus de 400 jours.
import { COACHES, SITE_URL, adminEmails, storeFor, lireContacts, kpisCoach, totauxReseau, envoyerEmail, esc, joursAvant } from '../lib/espace.js';

const pl = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export const handler = async (event) => {
  const store = storeFor(event);
  const contacts = await lireContacts();
  const coachs = (await Promise.all(COACHES.map((c) => kpisCoach(store, c, 7, contacts)))).sort((a, b) => b.kpis.tests - a.kpis.tests);
  const t = totauxReseau(coachs);
  const cell = 'padding:6px 8px;border-bottom:1px solid #eaf1ff;text-align:center';
  const rows = coachs.map((c) => `<tr><td style="${cell};text-align:left;font-weight:bold">${esc(c.nom)}</td><td style="${cell}">${c.kpis.scans}</td><td style="${cell}">${c.kpis.tests}</td><td style="${cell}">${c.kpis.testsPresentiel}</td><td style="${cell}">${c.kpis.contacts}</td><td style="${cell}">${c.kpis.bilans}</td><td style="${cell}">${c.kpis.clients}</td><td style="${cell};${c.alertes ? 'color:#0037B6;font-weight:bold' : ''}">${c.alertes}</td></tr>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;color:#0B1E3D;max-width:680px">
    <h2 style="margin:0 0 6px">Le réseau GA Coachs cette semaine</h2>
    <p style="margin:0 0 14px;color:#5b6b85">7 derniers jours : ${pl(t.kpis.tests, 'test')} (dont ${t.kpis.testsPresentiel} en présentiel), ${pl(t.kpis.contacts, 'contact')}, ${pl(t.kpis.bilans, 'bilan')}, ${pl(t.kpis.clients, 'client')}. ${t.alertes ? `<b>${t.alertes} contact(s) attendent un appel depuis plus de 48 h.</b>` : 'Aucun contact en attente.'}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="background:#EAF1FF"><th style="${cell};text-align:left">Coach</th><th style="${cell}">Scans</th><th style="${cell}">Tests</th><th style="${cell}">Présentiel</th><th style="${cell}">Contacts</th><th style="${cell}">Bilans</th><th style="${cell}">Clients</th><th style="${cell}">En attente</th></tr>${rows}</table>
    <p style="margin-top:18px"><a href="${SITE_URL}/espace-coach/" style="background:#2F6FED;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:bold">Ouvrir la vue réseau</a></p>
  </div>`;
  await envoyerEmail({ to: adminEmails().map((email) => ({ email })), subject: `GA Coachs : le rapport de la semaine (${pl(t.kpis.tests, 'test')}, ${pl(t.kpis.contacts, 'contact')})`, html });

  // Nettoyage : les événements de plus de 400 jours ne servent plus aux statistiques.
  const limite = joursAvant(400)[0];
  for (const slug of [...COACHES.map((c) => c.slug), 'sans-coach']) {
    const { blobs } = await store.list({ prefix: `ev/${slug}/` });
    await Promise.all(blobs.filter((b) => b.key.split('/')[2] < limite).map((b) => store.delete(b.key)));
  }
  return { statusCode: 200, body: '' };
};
