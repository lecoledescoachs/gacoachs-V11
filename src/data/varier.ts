// Outils pour que chaque page locale ait son propre texte, à partir de données réelles uniquement
// (INSEE, coordonnées GPS, données du site). Les variantes de formulation sont choisies de façon stable
// à partir de l'adresse de la page : une même page affiche toujours le même texte.
import villesCoords from './villes-coordonnees.json';
import villesInsee from './villes-insee.json';

export function graine(cle: string) {
  return [...cle].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}
// mélange les bits pour que deux adresses proches donnent des ordres bien différents
function melange(n: number) {
  let h = n >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}
export function choisir<T>(cle: string, liste: T[], decal = 0): T {
  return liste[(graine(cle) + decal * 7919) % liste.length];
}
// sous-ensemble stable de n éléments, dans un ordre propre à la page
export function sousEnsemble<T>(cle: string, liste: T[], n: number): T[] {
  return liste
    .map((x, i) => ({ x, k: melange(graine(cle + ':' + i)) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((o) => o.x);
}

const rad = (d: number) => (d * Math.PI) / 180;
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
// direction de b vue depuis a, en 8 points cardinaux
export function direction(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dy = b.lat - a.lat, dx = (b.lng - a.lng) * Math.cos(rad(a.lat));
  const ang = (Math.atan2(dx, dy) * 180) / Math.PI;
  return ['au nord', 'au nord-est', "à l'est", 'au sud-est', 'au sud', 'au sud-ouest', "à l'ouest", 'au nord-ouest'][Math.round(((ang + 360) % 360) / 45) % 8];
}

const fmtPop = (n: number) => (n >= 1000 ? (Math.round(n / 100) * 100).toLocaleString('fr-FR') : String(n));
export function categorie(pop?: number) {
  if (!pop) return null;
  if (pop < 1000) return 'un petit village';
  if (pop < 3000) return 'un village';
  if (pop < 10000) return 'une petite ville';
  if (pop < 50000) return 'une ville';
  return 'une grande ville';
}

// Portrait de la commune en une ou deux phrases : taille (INSEE), position par rapport à Orléans, Sologne ou département
export function portraitCommune(ville: { slug: string; nom: string; sologne?: boolean; departement?: string }) {
  const insee = (villesInsee as any)[ville.slug] as { population: number; codesPostaux: string[] } | undefined;
  const c = (villesCoords as any)[ville.slug], o = (villesCoords as any)['orleans'];
  const cat = categorie(insee?.population);
  const morceaux: string[] = [];
  if (ville.slug !== 'orleans' && c && o) {
    const km = Math.round(distanceKm(o, c));
    if (km >= 1) morceaux.push(`à ${km} km ${direction(o, c).replace(/^au /, 'au ').replace(/^à l'/, "à l'")} d'Orléans`);
  }
  if (ville.sologne) morceaux.push('aux portes de la Sologne');
  if (ville.departement) morceaux.push(`dans le ${ville.departement}`);
  const base = cat && insee ? `${ville.nom} est ${cat} d'environ ${fmtPop(insee.population)} habitants (INSEE)` : `${ville.nom}`;
  return morceaux.length ? `${base}, ${morceaux.join(', ')}.` : insee ? `${base}.` : '';
}
