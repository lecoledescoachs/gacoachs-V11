// Outils partagés par les fonctions de l'espace coach : coachs, stockage (Netlify Blobs),
// réponses des formulaires Netlify, calcul des KPI et envoi d'emails (Brevo).
//
// Variables d'environnement (Netlify > Site configuration > Environment variables) :
//   - NETLIFY_API_TOKEN, NETLIFY_SITE_ID : lecture des formulaires (contacts, demandes de bilan)
//   - ADMIN_EMAILS : emails ayant accès à tout le réseau (séparés par des virgules)
//   - BREVO_API_KEY, BREVO_SENDER_EMAIL (expéditeur validé dans Brevo), BREVO_SENDER_NAME (facultatif)
import { connectLambda, getStore } from '@netlify/blobs';
import garry from '../../src/data/coaches/garry-babaud.json' with { type: 'json' };
import nathan from '../../src/data/coaches/nathan-sapin.json' with { type: 'json' };
import thomas from '../../src/data/coaches/thomas-das-neves.json' with { type: 'json' };
import fabien from '../../src/data/coaches/fabien-rakotoarimanana.json' with { type: 'json' };
import yanis from '../../src/data/coaches/yanis-trepy-lujien.json' with { type: 'json' };
import brice from '../../src/data/coaches/brice-chopin.json' with { type: 'json' };
import alexis from '../../src/data/coaches/alexis-fernandez.json' with { type: 'json' };
import salles from '../../src/data/salles.json' with { type: 'json' };
import { codesBoutique } from '../../src/data/code-boutique.js';

export const COACHES = [garry, nathan, thomas, fabien, yanis, brice, alexis];
// code boutique de chaque coach : celui de sa fiche, sinon créé automatiquement
const CODES = codesBoutique(COACHES);
for (const c of COACHES) c.codeBoutique = CODES.get(c.slug);
export const SITE_URL = 'https://gacoachs.fr';
export const STATUTS = ['a-appeler', 'appele', 'bilan-reserve', 'client', 'pas-interesse'];
export const PERIODES = [7, 30, 90];
const NETLIFY_API = 'https://api.netlify.com/api/v1';
const RETARD_MS = 48 * 3600 * 1000; // un contact non rappelé après 48 h passe en alerte

export const coachBySlug = (slug) => COACHES.find((c) => c.slug === slug) || null;
// Le formulaire de bilan envoie le nom complet du coach (« Nathan Sapin »), le Score Santé son identifiant.
export const coachFrom = (v) => {
  const t = String(v || '').trim().toLowerCase();
  return COACHES.find((c) => c.slug === t || `${c.prenom} ${c.nom}`.toLowerCase() === t) || null;
};
export const salleNom = (c) => (salles.find((s) => s.slug === c.salleSlug) || {}).nom || '';
export const adminEmails = () => (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

// ---------- Stockage ----------
export function storeFor(event) {
  if (event && event.blobs) connectLambda(event);
  return getStore({ name: 'ga-espace', consistency: 'strong' });
}

// ---------- Réponses HTTP ----------
export const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

export function readBody(event) {
  if (!event || !event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

// Qui est connecté ? Un admin (ADMIN_EMAILS) ou un coach (email de sa fiche).
export function whoIs(context) {
  const user = context && context.clientContext && context.clientContext.user;
  if (!user || !user.email) return { error: json(401, { error: 'Non authentifié.' }) };
  const email = user.email.toLowerCase();
  const isAdmin = adminEmails().includes(email);
  const coach = COACHES.find((c) => (c.email || '').toLowerCase() === email) || null;
  if (!isAdmin && !coach) {
    return { error: json(403, { error: "Ton email de connexion n'est associé à aucune fiche coach. Contacte Garry pour faire le lien." }) };
  }
  return { isAdmin, coach, email };
}

// ---------- Dates (heure de Paris) ----------
export const jourParis = (date) => new Date(date).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
export function joursAvant(n, depuis = Date.now()) {
  const [y, m, d] = jourParis(depuis).split('-').map(Number);
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10));
  return out;
}

// ---------- Événements (scans, tests, agenda, bilans), un blob par événement ----------
// Clé : ev/<coach>/<AAAA-MM-JJ>/<type>.<source>.<score>.<id>  (tout est lisible sans ouvrir le blob)
export const TYPES = ['scan', 'test', 'agenda', 'bilan'];
export const SOURCES = ['lien', 'presentiel', 'site', 'agenda'];

export async function ajouterEvenement(store, { type, coach, source, score }) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const key = `ev/${coach}/${jourParis(Date.now())}/${type}.${source}.${score}.${id}`;
  await store.set(key, '1');
  return key;
}

export async function lireEvenements(store, coach) {
  const { blobs } = await store.list({ prefix: `ev/${coach}/` });
  return blobs
    .map((b) => {
      const [, , jour, nom] = b.key.split('/');
      const [type, source, score] = (nom || '').split('.');
      return { key: b.key, jour, type, source, score: score === 'x' ? null : parseInt(score, 10) };
    })
    .filter((e) => e.jour && TYPES.includes(e.type));
}

// ---------- Formulaires Netlify (contacts et demandes de bilan) ----------
export async function getFormSubmissions(formName) {
  const token = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  if (!token || !siteId) throw new Error("Configuration manquante : NETLIFY_API_TOKEN et/ou NETLIFY_SITE_ID ne sont pas définis dans les variables d'environnement Netlify.");
  const formsRes = await fetch(`${NETLIFY_API}/sites/${siteId}/forms`, { headers: { Authorization: `Bearer ${token}` } });
  if (!formsRes.ok) throw new Error(`Impossible de lister les formulaires (${formsRes.status})`);
  const form = (await formsRes.json()).find((f) => f.name === formName);
  if (!form) return [];
  let all = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${NETLIFY_API}/forms/${form.id}/submissions?per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Impossible de lister les réponses (${res.status})`);
    const batch = await res.json();
    all = all.concat(batch);
    if (batch.length < 100) break;
  }
  return all;
}

export async function lireContacts() {
  const [scores, bilans] = await Promise.all([getFormSubmissions('score-sante-lead'), getFormSubmissions('bilan-fallback')]);
  const contacts = [];
  scores.forEach((s) => {
    const d = s.data || {};
    if (!d.email) return; // les anciennes réponses silencieuses (sans coordonnées) ne sont pas des contacts
    const c = coachFrom(d.coach);
    contacts.push({ id: String(s.id), type: 'score', coach: c ? c.slug : '', prenom: d.prenom || '', nom: '', email: d.email || '', telephone: d.telephone || '',
      score: d.score || '', age: d.age || '', ageMetabolique: d.age_metabolique || '', source: d.source === 'presentiel' || d.source === 'site' ? d.source : 'lien',
      consentement: d.consentement || '', date: s.created_at });
  });
  bilans.forEach((s) => {
    const d = s.data || {};
    const c = coachFrom(d.coach);
    contacts.push({ id: String(s.id), type: 'bilan', coach: c ? c.slug : '', prenom: d.prenom || '', nom: d.nom || '', email: d.email || '', telephone: d.telephone || '',
      score: '', age: '', ageMetabolique: '', source: 'bilan', objectif: d.objectif || '', creneau: d.creneau || '', date: s.created_at });
  });
  return contacts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function lireStatuts(store, coach) {
  const { blobs } = await store.list({ prefix: `st/${coach}/` });
  const entries = await Promise.all(blobs.map(async (b) => [b.key.split('/').pop(), await store.get(b.key, { type: 'json' })]));
  return Object.fromEntries(entries.filter((e) => e[1]));
}

export async function lireObjectif(store, coach) {
  return (await store.get(`obj/${coach}`, { type: 'json' })) || { testsPresentiel: 0, bilans: 0 };
}

// ---------- Calcul des KPI d'un coach sur une période, avec la période précédente ----------
function compter(events, jours, contacts, statuts) {
  const set = new Set(jours);
  const ev = events.filter((e) => set.has(e.jour));
  const tests = ev.filter((e) => e.type === 'test');
  const testsPresentiel = tests.filter((e) => e.source === 'presentiel');
  const testsLien = tests.filter((e) => e.source === 'lien');
  const scans = ev.filter((e) => e.type === 'scan').length;
  const scores = tests.map((e) => e.score).filter((n) => Number.isInteger(n));
  const cts = contacts.filter((c) => set.has(jourParis(c.date)));
  const clients = Object.values(statuts).filter((s) => s.statut === 'client' && s.maj && set.has(jourParis(s.maj))).length;
  return {
    scans,
    tests: tests.length,
    testsPresentiel: testsPresentiel.length,
    testsLien: testsLien.length,
    contacts: cts.filter((c) => c.type === 'score').length,
    passage: scans ? Math.round((testsLien.length / scans) * 100) : null,
    scoreMoyen: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    bilans: cts.filter((c) => c.type === 'bilan').length + ev.filter((e) => e.type === 'bilan').length,
    agenda: ev.filter((e) => e.type === 'agenda').length,
    clients,
  };
}

export async function kpisCoach(store, coach, periode, tousContacts) {
  const slug = coach.slug;
  const [events, statuts, objectif] = await Promise.all([lireEvenements(store, slug), lireStatuts(store, slug), lireObjectif(store, slug)]);
  const contacts = tousContacts.filter((c) => c.coach === slug);
  const deux = joursAvant(periode * 2);
  const actuels = deux.slice(periode);
  const precedents = deux.slice(0, periode);
  const maintenant = Date.now();

  const listeContacts = contacts.map((c) => {
    const st = statuts[c.id] || {};
    const statut = STATUTS.includes(st.statut) ? st.statut : 'a-appeler';
    return { ...c, statut, note: st.note || '', relance: st.relance || '', maj: st.maj || '',
      enRetard: statut === 'a-appeler' && maintenant - new Date(c.date).getTime() > RETARD_MS };
  });

  // Mois en cours, pour la jauge d'objectif
  const debutMois = jourParis(maintenant).slice(0, 8) + '01';
  const joursMois = joursAvant(31).filter((j) => j >= debutMois);
  const mois = compter(events, joursMois, contacts, statuts);

  const jours = actuels;
  const parJour = (filtre) => jours.map((j) => events.filter((e) => e.jour === j && filtre(e)).length);
  return {
    slug,
    prenom: coach.prenom,
    codeBoutique: coach.codeBoutique || '',
    nom: `${coach.prenom} ${coach.nom}`,
    photo: coach.photo || '',
    salle: salleNom(coach),
    avis: coach.avisGoogle && coach.avisGoogle.nombreAvis ? { nombre: coach.avisGoogle.nombreAvis, note: coach.avisGoogle.note, url: coach.avisGoogle.url || '' } : null,
    periode,
    kpis: compter(events, actuels, contacts, statuts),
    precedent: compter(events, precedents, contacts, statuts),
    activite: {
      jours,
      scans: parJour((e) => e.type === 'scan'),
      testsLien: parJour((e) => e.type === 'test' && e.source !== 'presentiel'),
      testsPresentiel: parJour((e) => e.type === 'test' && e.source === 'presentiel'),
    },
    mois: { testsPresentiel: mois.testsPresentiel, bilans: mois.bilans },
    objectif,
    entonnoir: {
      contacts: listeContacts.length,
      appeles: listeContacts.filter((c) => c.statut !== 'a-appeler').length,
      bilans: listeContacts.filter((c) => c.statut === 'bilan-reserve' || c.statut === 'client').length,
      clients: listeContacts.filter((c) => c.statut === 'client').length,
    },
    alertes: listeContacts.filter((c) => c.enRetard).length,
    contacts: listeContacts,
  };
}

export function totauxReseau(parCoach) {
  const somme = (obj, k) => parCoach.reduce((s, c) => s + (c[obj][k] || 0), 0);
  const bloc = (obj) => {
    const tests = somme(obj, 'tests');
    const pts = parCoach.reduce((s, c) => s + (c[obj].scoreMoyen || 0) * c[obj].tests, 0);
    return { scans: somme(obj, 'scans'), tests, testsPresentiel: somme(obj, 'testsPresentiel'), contacts: somme(obj, 'contacts'),
      bilans: somme(obj, 'bilans'), clients: somme(obj, 'clients'), scoreMoyen: tests ? Math.round(pts / tests) : null };
  };
  return { kpis: bloc('kpis'), precedent: bloc('precedent'), alertes: parCoach.reduce((s, c) => s + c.alertes, 0) };
}

// ---------- Emails (Brevo) ----------
export async function envoyerEmail({ to, subject, html }) {
  const key = process.env.BREVO_API_KEY;
  const sender = process.env.BREVO_SENDER_EMAIL;
  const dest = (to || []).filter((t) => t && t.email);
  if (!key || !sender || !dest.length) return false;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: { email: sender, name: process.env.BREVO_SENDER_NAME || 'GA Coachs' }, to: dest, subject, htmlContent: html }),
  });
  return res.ok;
}

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
