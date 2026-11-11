// Agrégateur : combine les fiches individuelles de src/data/coaches/*.json
// en un seul tableau, pour que le reste du site continue d'importer
// '../data/coaches.json' exactement comme avant, sans rien changer ailleurs.
// Chaque coach a désormais son propre fichier, éditable indépendamment
// (notamment via l'espace admin CMS).
import garry_babaud from './coaches/garry-babaud.json';
import nathan_sapin from './coaches/nathan-sapin.json';
import thomas_das_neves from './coaches/thomas-das-neves.json';
import fabien_rakotoarimanana from './coaches/fabien-rakotoarimanana.json';
import yanis_trepy_lujien from './coaches/yanis-trepy-lujien.json';
import brice_chopin from './coaches/brice-chopin.json';
import alexis_fernandez from './coaches/alexis-fernandez.json';
import { codesBoutique } from './code-boutique.js';

const coaches = [
  garry_babaud,
  nathan_sapin,
  thomas_das_neves,
  fabien_rakotoarimanana,
  yanis_trepy_lujien,
  brice_chopin,
  alexis_fernandez
];

// Tous les coachs du réseau sont inscrits sur tous les objectifs du site (filtres, pages objectifs, quiz).
// On ajoute à la fin de leurs tags et spécialités l'étiquette de chaque objectif qu'ils n'ont pas déjà.
// (Les cartes n'affichent que les 3 premiers tags : l'affichage actuel ne change pas.)
const OBJECTIFS = [
  ['Perte de Poids', 'Perte de Poids en Douceur', 'Perte de gras'],
  ['Renforcement Musculaire', 'Musculation Ciblée', 'Transformation Physique', 'Sculpter & Tonifier'],
  ['Remise en Forme', 'Reprise Sportive', 'Spécial Débutants', 'Sport Plaisir'],
  ['Gestion du Stress', 'Bien-être au Quotidien', 'Sport-Santé'],
  ['Suivi Personnalisé', 'Objectifs Sur Mesure', 'Stratégie Personnalisée', 'Coaching Flexible', 'Accompagnement Bienveillant'],
];
for (const c of coaches) {
  for (const groupe of OBJECTIFS) {
    if (!groupe.some((t) => c.tags.includes(t))) c.tags.push(groupe[0]);
    if (!c.specialites.includes(groupe[0]) && !groupe.some((t) => c.specialites.includes(t))) c.specialites.push(groupe[0]);
  }
}

// Code boutique de chaque coach : celui de sa fiche, sinon créé automatiquement (voir code-boutique.js)
const CODES = codesBoutique(coaches);
for (const c of coaches) c.codeBoutique = CODES.get(c.slug);

// Liste complète (utilisée pour générer les fiches individuelles, le Score Santé
// et le bilan par lien direct ?coach=, pour que même un coach hors réseau reste
// joignable via son propre lien).
export default coaches;

// Réseau officiel uniquement : à utiliser sur toute page qui liste "nos coachs"
// publiquement (Trouver un coach, carte réseau, statistiques, etc.). Un coach
// avec reseauOfficiel: false (test, hors réseau) n'apparaît jamais ici.
export const coachesReseau = coaches.filter((c) => c.reseauOfficiel !== false);
