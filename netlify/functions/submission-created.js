// Déclenchée par Netlify à chaque réponse de formulaire validée.
// Prévient le coach par email dès qu'un client laisse ses coordonnées (Score Santé) ou demande un bilan.
// Sans email renseigné dans la fiche du coach, l'alerte part vers les admins (ADMIN_EMAILS).
import { SITE_URL, coachFrom, coachBySlug, adminEmails, envoyerEmail, esc } from '../lib/espace.js';
import salles from '../../src/data/salles.json' with { type: 'json' };
import { validerReponses, construireProgramme, OBJECTIFS, ZONES, NIVEAUX } from '../lib/programme.js';

function telInternational(t) {
  const d = String(t || '').replace(/[^\d+]/g, '');
  if (/^0\d{9}$/.test(d)) return '33' + d.slice(1);
  return d.replace(/^\+/, '');
}


// Programme personnalisé envoyé par email : le programme est reconstruit ici à partir des réponses
// (jamais à partir d'un contenu envoyé par le navigateur), puis envoyé au visiteur. Les admins sont prévenus.
async function envoyerProgramme(d) {
  const email = String(d.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return;
  const rep = validerReponses({ objectif: d.objectif, niveau: d.niveau, jours: d.jours, duree: d.duree, materiel: d.materiel, zone: d.zone, limites: String(d.limites || '').split(',').filter(Boolean) });
  if (!rep) return;
  const p = construireProgramme(rep);
  const prenom = esc(String(d.prenom || '').slice(0, 40));
  // lien personnel pour retrouver le programme (jeton créé par la page, vérifié ici avant d'être mis dans l'email)
  const suivi = String(d.suivi || '');
  const salle = salles.find((x) => x.slug === String(d.salle || '')) || null;
  const coachSalle = salle ? coachBySlug(salle.coachs[0]) : null;
  const lien = `${SITE_URL}/mon-programme/` + (suivi && suivi.length <= 6000 && /^[A-Za-z0-9_-]+$/.test(suivi) ? `?suivi=${suivi}` : '');
  const bleu = '#2F6FED', nuit = '#0B1E3D', gris = '#5A6785';
  const seances = p.seances.map((s, i) => `
    <h3 style="margin:24px 0 6px;font-size:18px;color:${nuit}">Séance ${i + 1} : ${esc(s.nom)}</h3>
    <p style="margin:0 0 2px;color:${gris};font-size:14px"><b style="color:${nuit}">Échauffement (${s.duree} minutes au total pour la séance)</b></p>
    <ul style="margin:0 0 8px;padding-left:20px;color:${gris};font-size:14px">${(s.echauffementEtapes || [s.echauffement]).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    ${s.exercices[0] && s.exercices[0].effort ? `<p style="margin:0 0 8px;padding:8px 12px;background:#EEF4FF;border-radius:10px;color:${nuit};font-size:13px"><b>La bonne charge.</b> ${esc(s.exercices[0].effort)}</p>` : ''}
    <table style="border-collapse:collapse;width:100%;font-size:14px">${s.exercices.map((e, k) => `
      <tr><td style="padding:8px 6px;border-top:1px solid #E1E8FA;vertical-align:top;width:22px;color:${bleu};font-weight:bold">${k + 1}</td>
      <td style="padding:8px 6px;border-top:1px solid #E1E8FA"><b style="color:${nuit}">${esc(e.nom)}</b><br><span style="color:${bleu};font-weight:bold">${e.series} x ${esc(e.reps)} · repos ${esc(e.repos)}</span><br><span style="color:${gris}">${esc(e.conseil)}</span></td></tr>`).join('')}
    </table>
    ${s.finisher ? `<p style="margin:8px 0 0;color:${gris};font-size:14px"><b style="color:${nuit}">Pour finir.</b> ${esc(s.finisher)}</p>` : ''}
    <p style="margin:10px 0 2px;color:${gris};font-size:14px"><b style="color:${nuit}">Retour au calme</b></p>
    <ul style="margin:0;padding-left:20px;color:${gris};font-size:14px">${(s.retourEtapes || [s.retourAuCalme]).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`).join('');
  const liste = (a) => `<ul style="margin:0;padding-left:20px;color:${gris};font-size:14px">${(a || []).map((c) => `<li style="margin:4px 0">${esc(c)}</li>`).join('')}</ul>`;
  const plan = (p.semaines || []).map((w) => `<tr><td style="padding:8px 10px;border-left:4px solid ${bleu};background:#F4F8FF;font-size:14px"><span style="font-size:11px;font-weight:bold;color:#0037B6;text-transform:uppercase">${esc(w.s)}</span><br><b>${esc(w.t)}</b><br><span style="color:${gris}">${esc(w.d)}</span></td></tr><tr><td style="height:6px"></td></tr>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;color:${nuit};max-width:600px">
    <h2 style="margin:0 0 6px">Ton programme, ${prenom || 'le voici'} 💪</h2>
    <p style="margin:0 0 4px;font-size:16px"><b>${esc(p.titre)}</b></p>
    <p style="margin:0 0 14px;color:${gris}">${esc(p.resume)}</p>
    <p style="margin:0 0 6px"><a href="${lien}" style="background:${bleu};color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:bold">Ouvrir mon programme et le mode séance</a></p>
    <p style="margin:0 0 18px;color:${gris};font-size:13px">Ce lien est personnel : il retrouve ton programme et tes charges sur n'importe quel téléphone. Garde cet email.</p>
    <h3 style="margin:22px 0 6px;font-size:17px">Avant ta première séance</h3>
    ${liste(p.avant)}
    ${seances}
    <h3 style="margin:26px 0 6px;font-size:17px">Ton plan sur 8 semaines</h3>
    <p style="margin:0 0 8px;color:${gris};font-size:14px">Les mêmes séances pendant 8 semaines : seule l'intensité évolue.</p>
    <table style="border-collapse:collapse;width:100%">${plan}</table>
    <h3 style="margin:26px 0 6px;font-size:17px">Conseils pour bien démarrer</h3>
    <ul style="margin:0;padding-left:20px;color:${gris};font-size:14px">${p.conseils.map((c) => `<li style="margin:4px 0">${esc(c)}</li>`).join('')}</ul>
    <h3 style="margin:20px 0 6px;font-size:17px">Pour progresser</h3>
    <p style="margin:0;color:${gris};font-size:14px">${esc(p.progression)}</p>
    <h3 style="margin:20px 0 6px;font-size:17px">Les mots à connaître</h3>
    ${liste((p.lexique || []).map(([m, d]) => m + ' : ' + d))}
    <div style="margin:24px 0 0;padding:18px;border-radius:16px;background:${nuit};color:#fff">
      <p style="margin:0 0 6px;font-size:17px;font-weight:bold">${coachSalle ? esc(coachSalle.prenom) + ', ton coach GA à ' + esc(salle.nom) : 'Tu veux être sûr de bien faire ?'}</p>
      <p style="margin:0 0 14px;color:#D6E4FF;font-size:14px">${coachSalle ? 'Il' : 'Un coach GA'} te montre chaque mouvement${coachSalle ? '' : ' dans ta salle Basic-Fit'}, corrige ta technique et ajuste tes charges.</p>
      <a href="${SITE_URL}/score-sante/${coachSalle ? '?coach=' + coachSalle.slug : ''}" style="background:${bleu};color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:bold">Faire mon Score Santé</a>
    </div>
    <p style="margin:20px 0 0;color:${gris};font-size:12px">${esc(p.avertissement)}</p>
    <p style="margin:16px 0 0;color:${gris};font-size:12px">Tu reçois cet email parce que tu as demandé ton programme sur gacoachs.fr.</p>
  </div>`;
  try { await envoyerEmail({ to: [{ email, name: String(d.prenom || '').slice(0, 40) }], subject: 'Ton programme de musculation GA Coachs', html }); } catch (e) { /* rien */ }
  const veut = d.recontact === 'oui';
  // demande de contact avec une salle connue : les coachs de cette salle sont prévenus directement
  if (veut && salle) {
    const coachs = salle.coachs.map((c) => coachBySlug(c)).filter((c) => c && c.email);
    if (coachs.length) {
      const html = `<div style="font-family:Arial,sans-serif;color:${nuit};max-width:560px">
    <h2 style="margin:0 0 12px">Une personne de ta salle veut être accompagnée</h2>
    <p>${prenom || 'Un visiteur'} (${esc(email)}) a créé son programme sur gacoachs.fr et souhaite qu'un coach GA de <b>${esc(salle.nom)}</b> le recontacte.</p>
    <p>Son programme : ${esc(OBJECTIFS[rep.objectif] || '')}${rep.zone !== 'equilibre' ? ', priorité ' + esc(ZONES[rep.zone].toLowerCase()) : ''}, ${rep.jours} séances de ${rep.duree} min, niveau ${esc(NIVEAUX[rep.niveau] || '')}${rep.limites.length ? ', zones sensibles : ' + esc(rep.limites.join(', ')) : ''}.</p>
    <p>Pense à le recontacter sous 48 h.</p>
  </div>`;
      try { await envoyerEmail({ to: coachs.map((c) => ({ email: c.email, name: `${c.prenom} ${c.nom}` })), subject: `Programme : ${d.prenom || 'un visiteur'} demande un rappel (${salle.nom})`, html }); } catch (e) { /* rien */ }
    }
  }
  const admin = `<div style="font-family:Arial,sans-serif;color:${nuit};max-width:560px">
    <h2 style="margin:0 0 12px">Nouveau programme envoyé${veut ? ' : demande de contact' : ''}</h2>
    <p>${prenom || 'Un visiteur'} (${esc(email)}) a reçu son programme${salle ? ' (' + esc(salle.nom) + ')' : ''} : ${esc(OBJECTIFS[rep.objectif] || '')}${rep.zone !== 'equilibre' ? ', priorité ' + esc(ZONES[rep.zone].toLowerCase()) : ''}, ${rep.jours} séances de ${rep.duree} min.</p>
    <p>${veut ? '<b>Cette personne souhaite être recontactée par un coach GA.</b>' : 'Pas de demande de contact.'}</p>
  </div>`;
  try { await envoyerEmail({ to: adminEmails().map((e) => ({ email: e })), subject: `Programme envoyé : ${d.prenom || 'un visiteur'}${veut ? ' (à recontacter)' : ''}`, html: admin }); } catch (e) { /* rien */ }
}

export const handler = async (event) => {
  let payload = {};
  try { payload = JSON.parse(event.body || '{}').payload || {}; } catch (e) { return { statusCode: 200, body: '' }; }
  const form = payload.form_name;
  const d = payload.data || {};
  if (form === 'programme-email') { await envoyerProgramme(d); return { statusCode: 200, body: '' }; }
  if (form === 'course') {
    const L = [['Organisation', d.structure], ['Course', d.course], ['Date', d.date || 'non précisée'], ['Lieu', d.lieu], ['Distances', d.distances || 'non précisées'], ['Participants', d.participants || 'non précisé'], ['Besoin', d.besoin], ['Contact', d.nom], ['Email', d.email], ['Téléphone', d.telephone || 'non renseigné'], ['Précisions', d.message]];
    const html = `<div style="font-family:Arial,sans-serif;color:#0B1E3D;max-width:560px"><h2 style="margin:0 0 12px">Nouvelle demande : échauffement de course</h2><p>À rappeler sous 48 h ouvrées.</p><table style="border-collapse:collapse;width:100%">${L.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#5b6b85;border-bottom:1px solid #eaf1ff">${k}</td><td style="padding:6px 10px;font-weight:bold;border-bottom:1px solid #eaf1ff">${esc(v || '')}</td></tr>`).join('')}</table></div>`;
    try { await envoyerEmail({ to: adminEmails().map((email) => ({ email })), subject: `Échauffement de course : ${d.course || 'une course'} (${d.lieu || ''})`, html }); } catch (e) { /* rien */ }
    return { statusCode: 200, body: '' };
  }
  if (form === 'mannequins') {
    const L = [['Profil', d.profil], ['Occasion', d.occasion], ['Offre', d.offre], ['Date', d.date || 'non précisée'], ['Ville', d.lieu], ['Contact', d.nom], ['Email', d.email], ['Téléphone', d.telephone || 'non renseigné'], ['Précisions', d.message]];
    const html = `<div style="font-family:Arial,sans-serif;color:#0B1E3D;max-width:560px"><h2 style="margin:0 0 12px">Nouvelle demande BOOST MANNEQUIN</h2><p>À rappeler sous 48 h ouvrées.</p><table style="border-collapse:collapse;width:100%">${L.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#5b6b85;border-bottom:1px solid #eaf1ff">${k}</td><td style="padding:6px 10px;font-weight:bold;border-bottom:1px solid #eaf1ff">${esc(v || '')}</td></tr>`).join('')}</table></div>`;
    try { await envoyerEmail({ to: adminEmails().map((email) => ({ email })), subject: `BOOST MANNEQUIN : ${d.profil || 'une demande'} (${d.occasion || ''})`, html }); } catch (e) { /* rien */ }
    return { statusCode: 200, body: '' };
  }
  if (form === 'carte-cadeau') {
    const montant = String(d.montant || '').replace(/[^\d.,]/g, '').slice(0, 8);
    const L = [['Montant', montant ? montant + ' €' : 'non précisé'], ['Offre par', d.acheteur], ['Email de l\'acheteur', d.email], ['Téléphone', d.telephone || 'non renseigné'], ['Pour', d.beneficiaire], ['Ville ou salle', d.ville || 'non précisée'], ['Envoi', d.envoi || 'non précisé'], ['Date d\'envoi', d.date_envoi || 'dès que possible'], ['Message', d.message || '']];
    const html = `<div style="font-family:Arial,sans-serif;color:#0B1E3D;max-width:560px"><h2 style="margin:0 0 12px">Nouvelle carte cadeau</h2><p>À traiter sous 48 h ouvrées : envoyer le lien de paiement ou la facture, puis la carte cadeau.</p><table style="border-collapse:collapse;width:100%">${L.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#5b6b85;border-bottom:1px solid #eaf1ff">${k}</td><td style="padding:6px 10px;font-weight:bold;border-bottom:1px solid #eaf1ff">${esc(v || '')}</td></tr>`).join('')}</table></div>`;
    try { await envoyerEmail({ to: adminEmails().map((email) => ({ email })), subject: `Carte cadeau ${montant ? montant + ' €' : ''} : ${d.acheteur || 'une demande'}`, html }); } catch (e) { /* rien */ }
    return { statusCode: 200, body: '' };
  }
  if (form === 'communication') {
    const L = [['Organisme', d.structure], ['Type', d.type_org], ['Contact', d.nom], ['Email', d.email], ['Téléphone', d.telephone || 'non renseigné'], ['Besoin', d.besoin], ['Public visé', d.public || 'non précisé'], ['Calendrier', d.echeance || 'non précisé'], ['Page ou marché', d.marche || 'boost-communication'], ['Projet', d.message]];
    const html = `<div style="font-family:Arial,sans-serif;color:#0B1E3D;max-width:560px"><h2 style="margin:0 0 12px">Nouvelle demande BOOST COMMUNICATION</h2><p>Campagne sport-santé : à rappeler sous 48 h ouvrées.</p><table style="border-collapse:collapse;width:100%">${L.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#5b6b85;border-bottom:1px solid #eaf1ff">${k}</td><td style="padding:6px 10px;font-weight:bold;border-bottom:1px solid #eaf1ff">${esc(v || '')}</td></tr>`).join('')}</table></div>`;
    try { await envoyerEmail({ to: adminEmails().map((email) => ({ email })), subject: `BOOST COMMUNICATION : ${d.structure || 'un organisme'} (${d.type_org || ''})`, html }); } catch (e) { /* rien */ }
    return { statusCode: 200, body: '' };
  }
  if (form === 'medias') {
    const L = [['Média / marque', d.structure], ['Contact', d.nom], ['Email', d.email], ['Téléphone', d.telephone || 'non renseigné'], ['Type de demande', d.type], ['Sujet', d.sujet], ['Échéance', d.echeance || 'non précisée'], ['Précisions', d.message]];
    const html = `<div style="font-family:Arial,sans-serif;color:#0B1E3D;max-width:560px"><h2 style="margin:0 0 12px">Nouvelle demande médias</h2><p>À traiter vite : vérifier l'échéance.</p><table style="border-collapse:collapse;width:100%">${L.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#5b6b85;border-bottom:1px solid #eaf1ff">${k}</td><td style="padding:6px 10px;font-weight:bold;border-bottom:1px solid #eaf1ff">${esc(v || '')}</td></tr>`).join('')}</table></div>`;
    try { await envoyerEmail({ to: adminEmails().map((email) => ({ email })), subject: `Demande médias : ${d.structure || 'un média'} (${d.type || 'demande'})`, html }); } catch (e) { /* rien */ }
    return { statusCode: 200, body: '' };
  }
  if (form === 'conference') {
    const L = [['Structure / événement', d.structure], ['Contact', d.nom], ['Email', d.email], ['Téléphone', d.telephone || 'non renseigné'], ['Thème', d.theme], ['Détails', d.message]];
    const html = `<div style="font-family:Arial,sans-serif;color:#0B1E3D;max-width:560px"><h2 style="margin:0 0 12px">Nouvelle demande de conférence</h2><p>À rappeler sous 48 h ouvrées.</p><table style="border-collapse:collapse;width:100%">${L.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#5b6b85;border-bottom:1px solid #eaf1ff">${k}</td><td style="padding:6px 10px;font-weight:bold;border-bottom:1px solid #eaf1ff">${esc(v || '')}</td></tr>`).join('')}</table></div>`;
    try { await envoyerEmail({ to: adminEmails().map((email) => ({ email })), subject: `Demande de conférence : ${d.structure || 'un événement'}`, html }); } catch (e) { /* rien */ }
    return { statusCode: 200, body: '' };
  }
  if (form === 'tournee') {
    const L = [['Programme', d.programme || 'non précisé'], ['Vous êtes', d.profil], ['Contact', d.nom], ['Email', d.email], ['Téléphone', d.telephone || 'non renseigné'], ['Nom ou projet', d.artiste || 'non précisé'], ['Domaine ou type de show', d.show], ['Dates, villes ou rythme', d.dates], ['Échéance ou première date', d.premiere || 'non précisée'], ['Formule souhaitée', d.formule], ['Langue', d.langue || 'Français'], ['Disponibilités pour le bilan', d.dispo || 'non précisées'], ['Message', d.message]];
    const html = `<div style="font-family:Arial,sans-serif;color:#0B1E3D;max-width:560px"><h2 style="margin:0 0 12px">Nouvelle demande : ${esc(d.programme || 'BOOST SCÈNE / TOURNÉE')}</h2><p>Bilan offert de 30 minutes à caler sous 48 h ouvrées.</p><table style="border-collapse:collapse;width:100%">${L.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#5b6b85;border-bottom:1px solid #eaf1ff">${k}</td><td style="padding:6px 10px;font-weight:bold;border-bottom:1px solid #eaf1ff">${esc(v || '')}</td></tr>`).join('')}</table></div>`;
    try { await envoyerEmail({ to: adminEmails().map((email) => ({ email })), subject: `${d.programme || 'BOOST SCÈNE / TOURNÉE'} : ${d.artiste || d.nom || 'nouvelle demande'}`, html }); } catch (e) { /* rien */ }
    return { statusCode: 200, body: '' };
  }
  if (form === 'boost-region') {
    const L = [['Programme', d.programme], ['Structure', d.structure], ['Contact', `${d.prenom || ''} ${d.nom || ''}`], ['Email', d.email], ['Téléphone', d.telephone || 'non renseigné'], ['Région', d.region], ['Département', d.departement], ['Ville', d.ville], ['Projet', d.message]];
    const html = `<div style="font-family:Arial,sans-serif;color:#0B1E3D;max-width:560px"><h2 style="margin:0 0 12px">Nouvelle demande BOOST : ${esc(d.region || '')}</h2><p>À rappeler sous 48 h ouvrées.</p><table style="border-collapse:collapse;width:100%">${L.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#5b6b85;border-bottom:1px solid #eaf1ff">${k}</td><td style="padding:6px 10px;font-weight:bold;border-bottom:1px solid #eaf1ff">${esc(v || '')}</td></tr>`).join('')}</table></div>`;
    try { await envoyerEmail({ to: adminEmails().map((email) => ({ email })), subject: `Demande BOOST ${d.region || ''} : ${d.structure || 'une structure'}`, html }); } catch (e) { /* rien */ }
    return { statusCode: 200, body: '' };
  }
  if (!['score-sante-lead', 'bilan-fallback'].includes(form)) return { statusCode: 200, body: '' };
  if (form === 'score-sante-lead' && !d.email) return { statusCode: 200, body: '' };

  const coach = coachFrom(d.coach);
  const pourCoach = coach && coach.email;
  const to = pourCoach ? [{ email: coach.email, name: `${coach.prenom} ${coach.nom}` }] : adminEmails().map((email) => ({ email }));
  const prenom = esc(d.prenom || 'Un client');
  const bilan = form === 'bilan-fallback';
  const tel = telInternational(d.telephone);
  const subject = bilan
    ? `Nouvelle demande de bilan : ${d.prenom || 'un client'}`
    : `Nouveau contact Score Santé : ${d.prenom || 'un client'} (${d.score || '?'}/100)`;
  const lignes = [
    ['Prénom', `${prenom}${d.nom ? ' ' + esc(d.nom) : ''}`],
    ...(d.email ? [['Email', esc(d.email)]] : []),
    ['Téléphone', esc(d.telephone || 'non renseigné')],
    ...(bilan ? [['Objectif', esc(d.objectif || '')], ['Salle', esc(d.salle || 'à définir')], ['Créneau souhaité', esc(d.creneau || '')], ['Contact par', esc(d.contact_par || '')]] : [['Score Santé', `${esc(d.score)}/100`], ['Âge réel', d.age ? `${esc(d.age)} ans` : 'non renseigné'], ['Âge métabolique estimé', d.age_metabolique ? `${esc(d.age_metabolique)} ans` : ''], ['Origine', d.source === 'presentiel' ? 'Test en présentiel' : d.source === 'site' ? 'Site' : 'Ton lien']]),
    ...(coach && !pourCoach ? [['Coach', esc(`${coach.prenom} ${coach.nom}`)]] : []),
  ];
  const html = `<div style="font-family:Arial,sans-serif;color:#0B1E3D;max-width:560px">
    <h2 style="margin:0 0 12px">${bilan ? 'Nouvelle demande de bilan' : 'Nouveau contact Score Santé'}</h2>
    <p>${bilan ? 'Une personne demande à être recontactée pour son bilan santé.' : 'Une personne vient de laisser ses coordonnées après son Score Santé.'} Pense à la rappeler sous 48 h.</p>
    <table style="border-collapse:collapse;width:100%">${lignes.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#5b6b85;border-bottom:1px solid #eaf1ff">${k}</td><td style="padding:6px 10px;font-weight:bold;border-bottom:1px solid #eaf1ff">${v}</td></tr>`).join('')}</table>
    <p style="margin-top:18px">
      ${tel ? `<a href="https://wa.me/${tel}" style="background:#2F6FED;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:bold">Écrire sur WhatsApp</a> ` : ''}
      <a href="${SITE_URL}/espace-coach/" style="color:#0037B6;font-weight:bold">Ouvrir mon espace coach</a>
    </p>
  </div>`;
  try { await envoyerEmail({ to, subject, html }); } catch (e) { /* l'envoi ne doit jamais bloquer la réception du formulaire */ }
  return { statusCode: 200, body: '' };
};
