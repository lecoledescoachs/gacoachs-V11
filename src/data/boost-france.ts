// Données communes aux pages BOOST par région : obésité adulte par région (OFÉO 2024, Ligue contre l'obésité / Odoxa)
import regions from './boost-regions.json';
import gamme from './boost-gamme.json';
export const OB: Record<string, number> = { 'Hauts-de-France': 22.2, 'Centre-Val de Loire': 21.6, 'Normandie': 20.2, 'Nouvelle-Aquitaine': 19.8, 'Grand Est': 19.2, 'Bretagne': 17.8, 'Pays de la Loire': 17.7, 'Bourgogne-Franche-Comté': 17.4, "Provence-Alpes-Côte d'Azur": 16.8, 'Auvergne-Rhône-Alpes': 16.7, 'Île-de-France': 15.6, 'Occitanie': 15.5 };
export const OB_FRANCE = 18.1;
export const OB_SOURCE = { nom: "OFÉO 2024, Ligue contre l'obésité", url: 'https://www.gazettelabo.fr/diagnostic/385Obesite-France-OFEO-2024.html' };
export const RANG = Object.keys(OB).sort((a, b) => OB[b] - OB[a]);
export const pct = (n: number) => n.toFixed(1).replace('.', ',') + ' %';
export const REGIONS = regions as any[];
export const GAMME = gamme as any[];
export const regionBySlug = (s: string) => REGIONS.find((r) => r.slug === s);
// Offres spécialisées rattachées à la gamme BOOST (affichées sur le hub et les pages régions)
export const SPECIALES = [
  { k: 'BOOST SCÈNE', t: 'Préparer un artiste avant un concert ou un show', href: '/services-sur-mesure/coach-sportif-preparation-scene/' },
  { k: 'BOOST TOURNÉE', t: 'Un coach qui suit l\'artiste pendant la tournée', href: '/services-sur-mesure/coach-sportif-tournee-artistes/' },
  { k: 'BOOST PRIVÉ', t: 'Personnalités, sportifs, dirigeants, élus', href: '/services-sur-mesure/coach-sportif-vip/' },
  { k: 'BOOST COMMUNICATION', t: 'Vidéos UGC et coach visage de marque', href: '/coach-sportif-campagne-sport-sante/' },
  { k: 'Échauffement de courses', t: 'Marches, courses, semi-marathons, trails', href: '/coach-sportif-echauffement-course/' },
  { k: 'Conférences', t: 'Séminaires, salons, semaines QVCT', href: '/conferences/' },
  { k: 'Espace médias', t: 'TV, radio, presse, marques', href: '/medias/' },
];
