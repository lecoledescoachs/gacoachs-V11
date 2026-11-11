// Codes boutique des coachs (commission sur les ventes faites avec leur code).
// Règle : un code déjà enregistré dans la fiche (champ codeBoutique) ne change jamais.
// Un nouveau coach sans code en reçoit un automatiquement : son prénom en majuscules, sans accents.
// Si ce prénom est déjà pris : prénom + initiale du nom (NATHANS), puis prénom + 2 lettres, puis un chiffre.
// Fichier sans dépendance : utilisé par le site (Astro) et par les fonctions Netlify.

const propre = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function codesBoutique(coaches) {
  const codes = new Map();
  const pris = new Set();
  // 1. codes déjà enregistrés : prioritaires et figés
  for (const c of coaches) {
    const code = propre(c.codeBoutique);
    if (code && !pris.has(code)) { codes.set(c.slug, code); pris.add(code); }
  }
  // 2. coachs sans code : génération automatique, dans un ordre stable (identifiant)
  const restants = coaches.filter((c) => !codes.has(c.slug)).sort((a, b) => String(a.slug).localeCompare(String(b.slug)));
  for (const c of restants) {
    const p = propre(c.prenom) || propre(String(c.slug).split('-')[0]) || 'COACH';
    const n = propre(c.nom);
    const essais = [p, p + n.slice(0, 1), p + n.slice(0, 2), p + n];
    let code = essais.find((e) => e && !pris.has(e));
    for (let i = 2; !code; i++) if (!pris.has(p + i)) code = p + i;
    codes.set(c.slug, code);
    pris.add(code);
  }
  return codes;
}

export const codeBoutique = (coaches, slug) => codesBoutique(coaches).get(slug) || '';
