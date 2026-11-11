// Moteur du programme personnalisé : questionnaire -> programme d'entraînement.
// Le choix des exercices est fait par des règles (sécurité : niveau, matériel, zones sensibles).
// Un modèle d'IA (facultatif, voir functions/programme.js) personnalise ensuite le résumé, les conseils et la progression.

export const OBJECTIFS = { 'perte-poids': 'Perdre du poids', 'prise-muscle': 'Prendre du muscle', force: 'Gagner en force', forme: 'Me remettre en forme' };
export const NIVEAUX = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };
export const MATERIELS = { complet: 'Salle complète', machines: 'Machines guidées surtout', minimal: 'Haltères et poids du corps' };
export const LIMITES = { dos: 'dos', genoux: 'genoux', epaules: 'épaules' };
export const ZONES = { equilibre: 'Tout le corps', fessiers: 'Fessiers et jambes', bras: 'Bras et épaules', dos: 'Dos et posture', abdos: 'Abdos et gainage' };
// zone prioritaire : types de mouvements ajoutés tôt dans chaque séance (les jours haut ou bas du corps gardent leur logique)
const PRIO = { fessiers: ['glute', 'hinge'], bras: ['biceps', 'push_v', 'triceps'], dos: ['pull_h', 'rear'], abdos: ['abdos', 'core'] };
const PRIO_HORS = { lower: ['bras', 'dos'], upper: ['fessiers'] };
const LVL = { debutant: 0, intermediaire: 1, avance: 2 };

// Bibliothèque d'exercices : m = matériel compatible, x = zones sensibles à éviter, l = niveau minimum (0 à 2)
const ALL = ['complet', 'machines', 'minimal'];
const LIB = {
  quad: [
    { n: 'Presse à cuisses', c: 'Pieds à largeur d\'épaules, descends sans décoller le bas du dos du dossier.', m: ['complet', 'machines'], x: [], l: 0 },
    { n: 'Squat gobelet avec un haltère', c: 'Haltère contre la poitrine, dos droit, descends en poussant les genoux vers l\'extérieur.', m: ['complet', 'minimal'], x: [], l: 0 },
    { n: 'Squat sur banc au poids du corps', c: 'Assieds-toi sur le banc en contrôlant, puis relève-toi sans élan.', m: ['minimal', 'complet'], x: [], l: 0 },
    { n: 'Squat à la barre', c: 'Barre sur le haut du dos, gainage serré, descends jusqu\'à la parallèle si tu le peux.', m: ['complet'], x: ['dos', 'genoux'], l: 1 },
    { n: 'Fentes marchées avec haltères', c: 'Grand pas, buste droit, genou avant aligné sur le pied.', m: ['complet', 'minimal'], x: ['genoux'], l: 1 },
    { n: 'Leg extension', c: 'Monte sans à-coup et ralentis la descente.', m: ['complet', 'machines'], x: ['genoux'], i: true, l: 0 },
  ],
  hinge: [
    { n: 'Pont fessier', c: 'Pousse dans les talons, serre les fessiers en haut sans cambrer.', m: ALL, x: [], l: 0 },
    { n: 'Leg curl assis', c: 'Contrôle le retour, garde les hanches calées dans le siège.', m: ['complet', 'machines'], x: [], i: true, l: 0 },
    { n: 'Hip thrust', c: 'Haut du dos sur le banc, menton rentré, extension complète des hanches.', m: ['complet'], x: [], l: 1 },
    { n: 'Soulevé de terre roumain avec haltères', c: 'Hanches vers l\'arrière, dos plat, haltères le long des jambes.', m: ['complet', 'minimal'], x: ['dos'], l: 1 },
  ],
  push_h: [
    { n: 'Développé machine convergente', c: 'Omoplates en arrière, pousse sans verrouiller les coudes.', m: ['complet', 'machines'], x: [], l: 0 },
    { n: 'Pompes sur banc incliné', c: 'Corps gainé de la tête aux talons, coudes à 45 degrés.', m: ['complet', 'minimal'], x: [], l: 0 },
    { n: 'Développé couché avec haltères', c: 'Descends jusqu\'à la hauteur de la poitrine, pousse en rapprochant les haltères.', m: ['complet', 'minimal'], x: ['epaules'], l: 1 },
    { n: 'Développé couché à la barre', c: 'Pieds ancrés, omoplates serrées, barre vers le bas de la poitrine.', m: ['complet'], x: ['epaules'], l: 1 },
  ],
  push_v: [
    { n: 'Développé épaules à la machine', c: 'Dos calé, pousse vers le haut sans cambrer.', m: ['complet', 'machines'], x: ['epaules'], l: 0 },
    { n: 'Développé militaire avec haltères', c: 'Gainage du ventre, pousse au-dessus de la tête sans cambrer.', m: ['complet', 'minimal'], x: ['epaules', 'dos'], l: 1 },
    { n: 'Élévations latérales avec haltères', c: 'Légers, coudes légèrement fléchis, monte jusqu\'à l\'épaule.', m: ['complet', 'minimal'], x: ['epaules'], i: true, l: 0 },
  ],
  pull_h: [
    { n: 'Rowing assis à la poulie', c: 'Tire les coudes vers l\'arrière, buste immobile.', m: ['complet', 'machines'], x: [], l: 0 },
    { n: 'Rowing à la machine, poitrine appuyée', c: 'Poitrine calée, tire en serrant les omoplates.', m: ['complet', 'machines'], x: [], l: 0 },
    { n: 'Rowing un bras avec haltère', c: 'Une main sur le banc, dos plat, tire le coude vers la hanche.', m: ['complet', 'minimal'], x: [], l: 0 },
    { n: 'Rowing à la barre', c: 'Buste penché, dos plat, tire la barre vers le nombril.', m: ['complet'], x: ['dos'], l: 1 },
  ],
  pull_v: [
    { n: 'Tirage vertical poitrine', c: 'Tire la barre vers le haut de la poitrine, coudes vers le bas.', m: ['complet', 'machines'], x: [], l: 0 },
    { n: 'Tractions assistées', c: 'Épaules basses, monte le menton au-dessus de la barre.', m: ['complet'], x: ['epaules'], l: 1 },
  ],
  rear: [
    { n: 'Face pull à la poulie', c: 'Tire la corde vers le visage, coudes hauts, épaules basses.', m: ['complet', 'machines'], x: [], i: true, l: 0 },
    { n: 'Oiseau avec haltères, buste penché', c: 'Haltères légers, ouvre les bras sans lever les épaules.', m: ['minimal', 'complet'], x: ['dos'], i: true, l: 0 },
  ],
  biceps: [
    { n: 'Curl avec haltères', c: 'Coudes le long du corps, sans balancer le buste.', m: ALL, x: [], i: true, l: 0 },
    { n: 'Curl à la poulie basse', c: 'Tension continue, ralentis la descente.', m: ['complet', 'machines'], x: [], i: true, l: 0 },
  ],
  triceps: [
    { n: 'Extension à la poulie haute', c: 'Coudes collés, étends complètement les bras.', m: ['complet', 'machines'], x: [], i: true, l: 0 },
    { n: 'Extension triceps avec un haltère à deux mains', c: 'Coudes serrés, descends derrière la tête avec contrôle.', m: ['minimal', 'complet'], x: ['epaules'], i: true, l: 0 },
    { n: 'Dips sur banc', c: 'Descends sans passer sous l\'horizontale des épaules.', m: ['minimal', 'complet'], x: ['epaules'], l: 1 },
  ],
  core: [
    { n: 'Planche sur les avant-bras', c: 'Corps aligné, ventre et fessiers serrés, respire calmement.', m: ALL, x: [], t: true, l: 0 },
    { n: 'Dead bug', c: 'Bas du dos plaqué au sol, bouge bras et jambe opposés lentement.', m: ALL, x: [], t: true, l: 0 },
    { n: 'Gainage latéral', c: 'Corps en ligne, hanche haute, tiens sans te laisser tomber.', m: ALL, x: [], t: true, l: 0 },
  ],
  glute: [
    { n: 'Abduction à la machine', c: 'Dos calé, écarte les genoux en contrôlant, marque une seconde en ouverture.', m: ['complet', 'machines'], x: [], i: true, l: 0 },
    { n: 'Kickback fessier à la poulie', c: 'Buste penché et gainé, pousse le talon vers l\'arrière sans cambrer.', m: ['complet', 'machines'], x: ['dos'], i: true, l: 0 },
    { n: 'Abduction allongé sur le côté', c: 'Corps aligné, monte la jambe tendue sans basculer le bassin vers l\'arrière.', m: ['minimal'], x: [], i: true, l: 0 },
    { n: 'Fentes arrière avec haltères', c: 'Recule d\'un grand pas, buste légèrement penché, pousse dans le talon avant.', m: ['complet', 'minimal'], x: ['genoux'], l: 1 },
  ],
  abdos: [
    { n: 'Crunch à la poulie haute', c: 'À genoux, enroule le buste vers le bassin, hanches immobiles.', m: ['complet', 'machines'], x: ['dos'], i: true, l: 0 },
    { n: 'Relevés de genoux sur banc', c: 'Assis au bord du banc, ramène les genoux vers la poitrine sans élan.', m: ALL, x: [], i: true, l: 0 },
  ],
  calf: [
    { n: 'Mollets à la presse', c: 'Amplitude complète, marque un temps en haut.', m: ['complet', 'machines'], x: [], i: true, l: 0 },
    { n: 'Montées sur pointes au poids du corps', c: 'Monte haut sur les pointes, descends lentement.', m: ['minimal', 'complet'], x: [], i: true, l: 0 },
  ],
};

const SLOTS = {
  full_a: ['quad', 'push_h', 'pull_h', 'hinge', 'core', 'rear', 'biceps', 'calf'],
  full_b: ['hinge', 'push_v', 'pull_v', 'quad', 'core', 'triceps', 'calf', 'core'],
  full_c: ['quad', 'pull_h', 'push_h', 'hinge', 'core', 'push_v', 'biceps', 'calf'],
  upper: ['push_h', 'pull_h', 'push_v', 'pull_v', 'rear', 'biceps', 'triceps', 'core', 'calf'],
  lower: ['quad', 'hinge', 'quad', 'hinge', 'core', 'calf', 'core', 'core'],
};
const NOM_SEANCE = { full_a: 'Corps entier A', full_b: 'Corps entier B', full_c: 'Corps entier C', upper: 'Haut du corps', lower: 'Bas du corps et gainage' };

const ECHAUFFEMENT = {
  haut: ['3 à 5 minutes de rameur ou de vélo à allure facile', '10 rotations des bras vers l\'avant puis 10 vers l\'arrière', '10 rétractions des omoplates (serre-les puis relâche)', '1 série très légère de 12 répétitions sur le premier exercice'],
  bas: ['3 à 5 minutes de vélo ou de marche rapide inclinée', '10 squats au poids du corps, lents et profonds', '10 ponts fessiers', '1 série très légère de 12 répétitions sur le premier exercice'],
  complet: ['3 à 5 minutes de rameur, de vélo ou de marche rapide', '10 squats au poids du corps et 10 rotations des bras', '10 ponts fessiers et 10 rétractions des omoplates', '1 série très légère de 12 répétitions sur le premier exercice'],
};
const RETOUR_CALME = {
  haut: ['Étirement des pectoraux, bras contre un mur : 30 secondes de chaque côté', 'Étirement du dos, bras tendus devant toi en arrondissant le haut du dos : 30 secondes', 'Étirement de l\'épaule, bras croisé devant la poitrine : 30 secondes de chaque côté', '1 minute de respiration lente'],
  bas: ['Étirement des quadriceps, talon vers la fesse : 30 secondes par jambe', 'Étirement des ischio-jambiers, jambe tendue sur un banc : 30 secondes par jambe', 'Étirement des fessiers, cheville posée sur le genou opposé : 30 secondes par côté', 'Étirement des mollets contre un mur : 30 secondes par jambe'],
  complet: ['Étirement des quadriceps : 30 secondes par jambe', 'Étirement des ischio-jambiers : 30 secondes par jambe', 'Étirement des pectoraux contre un mur : 30 secondes par côté', '1 minute de respiration lente'],
};
const TYPE_SEANCE = { full_a: 'complet', full_b: 'complet', full_c: 'complet', upper: 'haut', lower: 'bas' };
const secondesRepos = (r) => { const m = /(\d+)\s*min(?:\s*(\d+))?/.exec(r); if (m) return +m[1] * 60 + (m[2] ? +m[2] : 0); const x = /(\d+)\s*s/.exec(r); return x ? +x[1] : 60; };
// durée réaliste : échauffement 8 min, 40 s d'effort par série, repos complets, 2 min de changement d'exercice, retour au calme 5 min
function dureeSeance(exercices, finisher, express) {
  let sec = (express ? 8 : 13) * 60 + (finisher ? 10 * 60 : 0);
  exercices.forEach((e) => { sec += e.series * 40 + (e.series - 1) * secondesRepos(e.repos) + 120; });
  return Math.round(sec / 60);
}

function planSeances(jours, niveau) {
  if (jours === 2) return ['full_a', 'full_b'];
  if (jours === 3) return niveau === 'debutant' ? ['full_a', 'full_b', 'full_c'] : ['upper', 'lower', 'full_b'];
  return ['upper', 'lower', 'upper', 'lower'];
}

// exercices de remplacement : même type de mouvement, compatibles avec le matériel, le niveau et les zones sensibles
function alternatives(pattern, ctx, nom) {
  return (LIB[pattern] || []).filter((e) => e.n !== nom && e.m.includes(ctx.materiel) && e.l <= LVL[ctx.niveau] && !e.x.some((z) => ctx.limites.includes(z))).map((e) => ({ nom: e.n, conseil: e.c }));
}

function choisir(pattern, ctx, deja) {
  const dispo = (LIB[pattern] || []).filter((e) => e.m.includes(ctx.materiel) && e.l <= LVL[ctx.niveau] && !e.x.some((z) => ctx.limites.includes(z)));
  if (!dispo.length) return null;
  const pool = dispo.filter((e) => !deja.has(e.n));
  if (!pool.length) return null;
  const e = pool[ctx.rot % pool.length];
  ctx.rot += 1;
  return e;
}

function prescription(obj, niveau, isCore, principal) {
  const series = niveau === 'debutant' ? 2 : niveau === 'intermediaire' ? 3 : (principal ? 4 : 3);
  const s = isCore ? Math.max(2, series) : (principal ? series : Math.max(2, series - (niveau === 'avance' ? 1 : 0)));
  if (isCore) return { series: s, reps: '30 à 45 secondes', repos: '45 secondes', effort: 'Tiens la position avec une technique parfaite. Arrête la série si ton dos se creuse.' };
  const T = {
    force: principal ? (niveau === 'debutant' ? ['6 à 8', '2 min'] : ['4 à 6', '2 min 30']) : ['8 à 10', '1 min 30'],
    'prise-muscle': principal ? ['8 à 10', '1 min 30'] : ['10 à 12', '1 min 15'],
    'perte-poids': ['12 à 15', '45 secondes'],
    forme: ['10 à 12', '1 min'],
  }[obj];
  const rir = niveau === 'debutant' ? '3' : '2';
  return { series: s, reps: T[0], repos: T[1], effort: `Semaines 1 et 2 : garde 3 à 4 répétitions en réserve à la fin de chaque série. Ensuite, choisis une charge qui t'en laisse ${rir}. Descends en 2 à 3 secondes, remonte en 1 seconde.` };
}

// ordre des types de mouvements d'une séance, avec la zone prioritaire placée en 3e position
function slotsDe(cle, zone) {
  const base = SLOTS[cle];
  const prio = PRIO[zone] && !(PRIO_HORS[cle] || []).includes(zone) ? PRIO[zone] : [];
  if (!prio.length) return base;
  const restants = base.slice(2);
  prio.forEach((p) => { const k = restants.indexOf(p); if (k >= 0) restants.splice(k, 1); });
  return base.slice(0, 2).concat(prio, restants);
}

export function validerReponses(b) {
  const r = b || {};
  const obj = Object.keys(OBJECTIFS).includes(r.objectif) ? r.objectif : null;
  const niveau = Object.keys(NIVEAUX).includes(r.niveau) ? r.niveau : null;
  const jours = [2, 3, 4].includes(+r.jours) ? +r.jours : null;
  const duree = [30, 45, 60, 75].includes(+r.duree) ? +r.duree : null;
  const zone = Object.keys(ZONES).includes(r.zone) ? r.zone : 'equilibre';
  const phase = Math.min(6, Math.max(1, parseInt(r.phase, 10) || 1));
  const materiel = Object.keys(MATERIELS).includes(r.materiel) ? r.materiel : null;
  const limites = Array.isArray(r.limites) ? [...new Set(r.limites.filter((x) => Object.keys(LIMITES).includes(x)))] : [];
  if (!obj || !niveau || !jours || !duree || !materiel) return null;
  return { objectif: obj, niveau, jours, duree, materiel, limites, zone, phase };
}

export function construireProgramme(rep) {
  const n = rep.duree === 30 ? 4 : rep.duree === 45 ? 5 : rep.duree === 60 ? 6 : 7;
  const express = rep.duree === 30;
  const zone = rep.zone || 'equilibre';
  // phase 2 et suivantes : d'autres exercices du même type, et un débutant passe au volume intermédiaire
  const phase = rep.phase || 1;
  const nivPrescr = phase >= 2 && rep.niveau === 'debutant' ? 'intermediaire' : rep.niveau;
  const ctx = { materiel: rep.materiel, niveau: rep.niveau, limites: rep.limites, rot: 0 };
  const noms = planSeances(rep.jours, rep.niveau);
  const seances = noms.map((cle, idx) => {
    ctx.rot = idx + (phase - 1);
    const deja = new Set();
    const exercices = [];
    slotsDe(cle, zone).forEach((pat) => {
      if (exercices.length >= n) return;
      const e = choisir(pat, ctx, deja);
      if (!e) return;
      deja.add(e.n);
      const principal = exercices.length < 3 && !e.t && !e.i;
      const p = prescription(rep.objectif, nivPrescr, !!e.t, principal);
      if (PRIO[zone] && PRIO[zone].includes(pat) && !e.t && rep.niveau !== 'debutant' && p.series < 4) p.series += 1; // un peu plus de volume sur la zone choisie
      let conseil = e.c;
      if (rep.limites.includes('genoux') && pat === 'quad') conseil += ' Reste dans une amplitude sans douleur.';
      if (rep.limites.includes('dos') && pat === 'hinge') conseil += ' Garde le dos neutre et arrête si une gêne apparaît.';
      exercices.push({ nom: e.n, series: p.series, reps: p.reps, repos: p.repos, effort: p.effort, conseil, alt: alternatives(pat, ctx, e.n) });
    });
    const finisher = rep.objectif === 'perte-poids' && !express;
    // si la séance dépasse la durée choisie, on retire le dernier exercice d'isolation ou de gainage
    while (exercices.length > (express ? 3 : 4) && dureeSeance(exercices, finisher, express) > rep.duree + 5) exercices.pop();
    // toujours trop long (charges lourdes, longs repos) : on retire une série, en partant de la fin de la séance
    for (let k = exercices.length - 1, garde = 0; dureeSeance(exercices, finisher, express) > rep.duree + 5 && garde < 40; garde++) {
      if (exercices[k].series > 2) exercices[k].series -= 1;
      k = k > 0 ? k - 1 : exercices.length - 1;
    }
    const type = TYPE_SEANCE[cle];
    const ech = express ? [ECHAUFFEMENT[type][0].replace('3 à 5 minutes', '3 minutes'), ECHAUFFEMENT[type][1], ECHAUFFEMENT[type][3]] : ECHAUFFEMENT[type];
    const rac = express ? RETOUR_CALME[type].slice(0, 2) : RETOUR_CALME[type];
    const seance = {
      nom: NOM_SEANCE[cle],
      duree: dureeSeance(exercices, finisher, express),
      echauffement: (express ? '5' : '8') + ' minutes pour préparer ton corps : ' + ech.join(', ') + '.',
      echauffementEtapes: ech,
      exercices,
      retourAuCalme: (express ? '3' : '5') + ' minutes pour récupérer : ' + rac.join(', ') + '.',
      retourEtapes: rac,
    };
    if (finisher) seance.finisher = 'Cardio à allure modérée (tu dois pouvoir parler en faisant l\'effort) : vélo, rameur ou tapis incliné. Durée selon ta semaine : voir ton plan sur 8 semaines.';
    return seance;
  });
  const lim = rep.limites.map((z) => LIMITES[z]);
  return {
    titre: (phase >= 2 ? `Phase ${phase} · ` : '') + `Programme ${rep.jours} séances par semaine : ${OBJECTIFS[rep.objectif].toLowerCase()}` + (zone !== 'equilibre' ? `, priorité ${ZONES[zone].toLowerCase()}` : ''),
    resume: (phase >= 2 ? `Phase ${phase} : de nouveaux exercices pour relancer ta progression, en repartant de tes charges actuelles. ` : '') + `${NIVEAUX[rep.niveau]}, ${rep.jours} séances de ${rep.duree} minutes par semaine, ${MATERIELS[rep.materiel].toLowerCase()}.` + (zone !== 'equilibre' ? ` Ta zone prioritaire, ${ZONES[zone].toLowerCase()}, est travaillée tôt dans tes séances, quand tu as le plus d'énergie, avec un peu plus de volume.` : '') + (lim.length ? ` Les exercices tiennent compte de tes zones sensibles : ${lim.join(', ')}.` : ''),
    seances,
    conseils: conseilsDe(rep),
    semaines: semainesDe(rep),
    avant: AVANT,
    lexique: LEXIQUE,
    progression: 'Quand tu réussis toutes les séries en haut de la fourchette de répétitions avec une bonne technique, augmente la charge de 2,5 à 5 % à la séance suivante. À la fin des 8 semaines, passe à la phase suivante depuis ta page programme : de nouveaux exercices, en gardant tes charges.',
    avertissement: 'Ce programme est un point de départ général. Il ne remplace ni un avis médical ni les conseils d\'un coach diplômé. En cas de douleur, de malaise ou de doute, arrête et demande conseil à ton médecin.',
    source: 'modele',
  };
}

const AVANT = [
  'Fais une série d\'essai sur chaque exercice : si tu dépasses facilement le haut de la fourchette, prends plus lourd ; si tu n\'atteins pas le bas, allège.',
  'Garde l\'ordre des exercices : les plus exigeants sont placés en premier, quand tu as le plus d\'énergie.',
  'Respecte les jours de repos de ta semaine type : c\'est pendant le repos que ton corps progresse.',
  'Prends de l\'eau et ton téléphone : le mode séance coche tes séries et chronomètre tes repos.',
  'Si un exercice ne te dit rien, ouvre sa fiche ou demande à un coach de te le montrer avant de charger.',
];
const LEXIQUE = [
  ['Série', 'Un enchaînement de répétitions sans pause. « 3 x 10 » veut dire 3 séries de 10 répétitions.'],
  ['Répétition', 'Un mouvement complet : par exemple, descendre puis remonter une fois au squat.'],
  ['Repos', 'Le temps de pause entre deux séries du même exercice. Respecte-le : il conditionne la série suivante.'],
  ['Répétitions en réserve', 'Le nombre de répétitions que tu pourrais encore faire à la fin d\'une série. C\'est ton repère pour choisir la bonne charge.'],
  ['Fourchette', '« 8 à 10 » : vise au moins 8 répétitions. Quand tu atteins 10 sur toutes les séries, augmente la charge.'],
];

function semainesDe(rep) {
  const cardio = rep.objectif === 'perte-poids' && rep.duree !== 30;
  const debut = rep.niveau === 'debutant';
  const S = [
    { s: 'Semaines 1 et 2', t: 'Apprendre les gestes', d: `Charges légères : garde 3 à 4 répétitions en réserve. Concentre-toi sur la technique et sur l'amplitude.${debut ? ' Si un mouvement te semble difficile, demande à un coach de te le montrer.' : ''}${cardio ? ' Cardio de fin de séance : 10 minutes.' : ''}` },
    { s: 'Semaines 3 et 4', t: 'Trouver tes charges', d: `Augmente jusqu'à garder ${debut ? '3' : '2'} répétitions en réserve. Note tes charges à chaque séance dans le mode séance.${cardio ? ' Cardio de fin de séance : 15 minutes.' : ''}` },
    { s: 'Semaines 5 et 6', t: 'Progresser', d: `Dès que tu fais le haut de la fourchette sur toutes les séries, ajoute 2,5 à 5 % de charge (1 à 2 kg sur les haltères).${rep.objectif === 'force' ? ' Sur les 3 premiers exercices, vise une petite augmentation chaque semaine.' : ''}${cardio ? ' Cardio de fin de séance : 20 minutes.' : ''}` },
    { s: 'Semaine 7', t: 'Accélérer', d: `Sur les 3 premiers exercices, va jusqu'à ${debut ? '2' : '1 à 2'} répétitions en réserve en gardant une technique propre.${cardio ? ' Cardio de fin de séance : 20 minutes.' : ''}` },
    { s: 'Semaine 8', t: 'Récupérer et faire le point', d: 'Garde tes charges mais fais une série de moins sur chaque exercice. En fin de semaine, compare tes charges à celles de la semaine 3, puis passe à la phase suivante : de nouveaux exercices, en gardant tes charges.' },
  ];
  return S;
}

function conseilsDe(rep) {
  const c = ['Suis les répétitions en réserve indiquées dans ton plan sur 8 semaines : la technique passe toujours avant le poids.',
    'Sur les premières séances, fais vérifier ta technique par un coach : il corrige ta position et t\'aide à choisir les bonnes charges.'];
  if (rep.objectif === 'perte-poids') c.push('Les séances tenues chaque semaine comptent plus que l\'intensité : mieux vaut 2 séances régulières que 4 séances puis un arrêt. Les jours sans séance, marche 30 minutes.');
  if (rep.objectif === 'prise-muscle') c.push('Pour progresser, note tes charges et tes répétitions à chaque séance et cherche à faire un peu mieux que la fois précédente.');
  if (rep.objectif === 'force') c.push('Prends tes temps de repos en entier sur les exercices lourds : c\'est ce qui permet de garder une bonne technique.');
  if (rep.objectif === 'forme') c.push('Commence doucement et augmente petit à petit : l\'objectif est de te sentir mieux d\'une semaine à l\'autre. Les jours sans séance, marche 30 minutes.');
  if ((rep.phase || 1) >= 2) c.push('Nouvelle phase : pour les exercices que tu connais déjà, reprends tes charges actuelles. Pour les nouveaux, fais une série d\'essai avant de charger.');
  if (rep.duree === 30) c.push('Séance express : enchaîne les exercices sans traîner entre deux machines et respecte bien les temps de repos.');
  if ((rep.zone || 'equilibre') !== 'equilibre') c.push(`Ta zone prioritaire (${ZONES[rep.zone].toLowerCase()}) est placée tôt dans chaque séance, avec un peu plus de volume. Le reste du corps continue d'être travaillé pour rester équilibré.`);
  if (rep.limites.length) c.push('Tu as signalé une zone sensible : si une douleur apparaît pendant un exercice, arrête-le et parles-en à un coach ou à ton médecin.');
  return c;
}

// ---- Personnalisation par IA (facultative) ----
export function promptIA(rep, prog) {
  const system = 'Tu es un assistant de coaching sportif pour GA Coachs, un réseau de coachs sportifs en salle en France. Tu écris en français, en tutoyant, avec un ton simple et encourageant. Tu ne donnes aucun conseil médical, aucun diagnostic, aucun régime alimentaire. Tu réponds UNIQUEMENT par un objet JSON valide, sans texte autour, de la forme {"resume": string (2 phrases maximum), "conseils": [string, string, string, string] (4 conseils courts, concrets, sur l\'entraînement et la régularité), "progression": string (2 phrases maximum)}. N\'utilise jamais le tiret cadratin.';
  const user = JSON.stringify({
    objectif: OBJECTIFS[rep.objectif], zone_prioritaire: ZONES[rep.zone || 'equilibre'], niveau: NIVEAUX[rep.niveau], seances_par_semaine: rep.jours, duree_minutes: rep.duree, materiel: MATERIELS[rep.materiel],
    zones_sensibles: rep.limites.map((z) => LIMITES[z]),
    seances: prog.seances.map((s) => ({ nom: s.nom, exercices: s.exercices.map((e) => `${e.nom} ${e.series}x${e.reps}`) })),
  });
  return { system, user };
}

const propre = (s, max) => (typeof s === 'string' ? s.replace(/[—–]/g, ',').replace(/[<>]/g, '').trim().slice(0, max) : '');

export function fusionnerIA(prog, texte) {
  try {
    const a = texte.indexOf('{'), z = texte.lastIndexOf('}');
    const j = JSON.parse(texte.slice(a, z + 1));
    const resume = propre(j.resume, 400);
    const conseils = Array.isArray(j.conseils) ? j.conseils.map((x) => propre(x, 220)).filter(Boolean).slice(0, 4) : [];
    const progression = propre(j.progression, 400);
    if (!resume || conseils.length < 3 || !progression) return prog;
    return { ...prog, resume, conseils, progression, source: 'ia' };
  } catch (e) {
    return prog;
  }
}
