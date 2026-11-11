// Accroches du bilan santé par coach et contenu du bilan (partagés entre BilanCoach et les fiches coach)
// Accroche unique par coach, alignée sur le positionnement déjà établi sur chaque fiche
export const accroches: Record<string, { titre: string; sousTitre: string }> = {
  'garry-babaud': {
    titre: `Le Bilan Santé, la première étape vers un corps que tu reconnais enfin.`,
    sousTitre: `Avant de parler programme, on parle de toi : ton histoire, ton rythme, ce qui a déjà été essayé.`,
  },
  'nathan-sapin': {
    titre: `Le Bilan Santé, ton premier pas vers un corps plus fort, sans bouleverser ta semaine.`,
    sousTitre: `Un point de départ clair, pensé pour un emploi du temps déjà bien rempli.`,
  },
  'brice-chopin': {
    titre: `Le Bilan Santé, la base solide avant de viser plus loin.`,
    sousTitre: `On reconstruit avant de pousser : c'est tout le principe de la Méthode Empreinte.`,
  },
  'thomas-das-neves': {
    titre: `Le Bilan Santé, le point de départ d'une transformation qui tient dans la durée.`,
    sousTitre: `Un état des lieux complet, pour construire un programme qui te ressemble.`,
  },
  'fabien-rakotoarimanana': {
    titre: `Le Bilan Santé, pour poser les bases avant de passer à l'action.`,
    sousTitre: `Comprendre où tu en êtes vraiment, avant de définir où tu veux aller.`,
  },
  'yanis-trepy-lujien': {
    titre: `Le Bilan Santé, ton premier pas, sans pression, vers une meilleure forme.`,
    sousTitre: `Un temps d'échange simple et concret, pour démarrer du bon pied.`,
  },
  'alexis-fernandez': {
    titre: `Le Bilan Santé, le point de départ concret vers ton objectif.`,
    sousTitre: `Un diagnostic complet de ta condition actuelle, pour un programme qui colle à la réalité.`,
  },
};

export const accrocheDefaut = {
  titre: `Le Bilan Santé, ton premier pas vers ton objectif.`,
  sousTitre: `Un état des lieux complet avant de démarrer un programme sur mesure.`,
};

export const pointsBilan = [
  { icon: '🏋️', label: '30 minutes de coaching', detail: 'une vraie séance avec ton coach, pour voir où tu en es en situation réelle' },
  { icon: '❤️', label: 'Analyse cardio-vasculaire', detail: 'comprendre où en est ton cœur aujourd\'hui' },
  { icon: '🧍', label: 'Analyse posturale', detail: 'repérer les déséquilibres avant qu\'ils ne deviennent des douleurs' },
  { icon: '🌙', label: 'Analyse de tes habitudes de vie', detail: 'sommeil, alimentation, activité : ce qui freine, ce qui aide, sans jugement' },
  { icon: '💬', label: '30 minutes de feedback', detail: 'tes résultats expliqués clairement, sans jargon' },
  { icon: '🎯', label: 'Une proposition d\'accompagnement', detail: 'un programme construit pour toi, pour perdre du poids durablement' },
];
