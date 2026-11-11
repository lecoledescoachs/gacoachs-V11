# GA Coachs — gacoachs.fr

V1 du site GA Coachs, réseau de coachs sportifs partenaire officiel de Basic-Fit depuis 2018.
Stack : Astro + HTML sémantique + CSS + JS minimal. Déploiement cible : Netlify.

## 1. Installation

```
npm install
```

## 2. Lancement local

```
npm run dev
```
Le site est servi sur http://localhost:4321

## 3. Build

```
npm run build
```
Génère le site statique dans `dist/`.

## 4. Déploiement Netlify

- Connecter le repo à Netlify (ou `netlify deploy`)
- Build command : `npm run build`
- Publish directory : `dist`
- Domaine cible : `gacoachs.fr`
- La config est déjà présente dans `netlify.toml`

## 5. Activer les notifications email des formulaires (Netlify Forms)

Le site a 3 formulaires (`contact`, `entreprise-lead`, `boost-lead`), tous en `data-netlify="true"`
et redirigés vers `/merci/` après envoi. Netlify les détecte automatiquement au build, mais l'envoi
d'un email à chaque réponse se configure dans le dashboard (pas possible via le code) :

1. Sur app.netlify.com, ouvrir le site → onglet **Forms**
2. Pour chaque formulaire (contact / entreprise-lead / boost-lead) → **Settings and usage** → **Form notifications**
3. **Add notification** → **Email notification**
4. Renseigner `ga.coachs@gmail.com` comme destinataire
5. Répéter pour les 3 formulaires

Sans cette étape, les réponses arrivent bien dans l'onglet Forms de Netlify mais aucun email n'est envoyé.

## 6. Accélérer l'indexation Google (à faire après déploiement)

Le sitemap est généré automatiquement (`https://gacoachs.fr/sitemap-index.xml`), mais Google ne le découvre
vite que si on le lui soumet :

1. Créer/ouvrir la propriété du domaine sur [Google Search Console](https://search.google.com/search-console)
2. Vérifier la propriété du domaine gacoachs.fr
3. Menu **Sitemaps** → coller `sitemap-index.xml` → **Envoyer**
4. Optionnel mais utile pour les pages clés (homepage, BOOST Entreprise) : **Inspection de l'URL** → **Demander une indexation**

## Structure des données

Toutes les données modifiables sans toucher au design sont dans `src/data/` :
- `coaches.json` — coachs du réseau
- `salles.json` — salles Basic-Fit partenaires
- `expertises.json` — les 6 univers d'expertise
- `villes.json` — pages SEO locales
- `temoignages.json` — témoignages (vide, à remplir avec de vrais avis uniquement)

## Contenus réels à fournir avant mise en production

- [ ] Vraies photos et fiches complètes des coachs (`src/data/coaches.json`)
- [ ] Présentation réelle de chaque salle (`src/data/salles.json`)
- [ ] Texte réel de la page À propos / histoire du fondateur
- [ ] Vrais témoignages clients (aucun avis n'a été inventé)
- [ ] Mentions légales complètes (SIRET, hébergeur, directeur de publication)
- [ ] Politique de confidentialité complète
- [ ] Coordonnées de contact réelles + branchement du formulaire de contact (ex. Netlify Forms)
- [ ] Logo définitif (actuellement un favicon/logo texte simple)
- [ ] Éventuelle carte interactive réelle des salles (V1 utilise une carte-réseau schématique)

## Prévu pour plus tard (ne pas construire en V1)

Architecture pensée pour accueillir sans refonte : GA Diagnostic et scores (Santé, Nutrition, Forme, etc.), GA Cards, Passeport GA, grades/niveaux coachs (Recrue → Élite), XP, Coach du mois, GA Awards, Hall of Fame, espace membre, paiement.
