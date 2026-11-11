// Configuration centralisée du suivi d'audience et des conversions.
//
// Laisse un champ vide ("") tant que l'identifiant correspondant n'est pas fourni :
// le composant Analytics.astro ne charge alors rien pour ce service, plutôt que
// d'envoyer des requêtes cassées avec un identifiant inventé.
//
// GA4_MEASUREMENT_ID : Google Analytics → Administration → Flux de données → ton site.
//   Format : "G-XXXXXXXXXX"
export const GA4_MEASUREMENT_ID = 'G-N1SMJ8XBF6';

// PLAUSIBLE_DOMAIN : le domaine exact tel qu'ajouté dans ton compte Plausible.
//   Généralement : "gacoachs.fr"
export const PLAUSIBLE_DOMAIN = '';
