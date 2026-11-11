// Pictogrammes animés des exercices : un personnage dessiné en SVG, animé entre deux positions.
// Vue de profil (le personnage regarde vers la droite) ou de face pour les mouvements latéraux.
// Les membres sont calculés par cinématique inverse : leurs longueurs restent constantes pendant le mouvement.
// Repère : viewBox 0 0 200 150, sol à y = 134.
// Angles en degrés : 0 = vers le bas, 90 = vers la droite, 180 = vers le haut, -90 = vers la gauche.

const LG = { torse: 42, cou: 13, bras: 24, avb: 22, cuisse: 30, tibia: 30, pied: 10 };
const rad = (a) => (a * Math.PI) / 180;
const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const lerp = (a, b, t) => a + (b - a) * t;

// articulation intermédiaire (coude, genou) ; c = +1 tourne dans le sens des aiguilles d'une montre à l'écran
function ik(p, q, a, b, c) {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const d = Math.max(0.5, Math.min(Math.hypot(dx, dy), a + b - 0.01));
  const base = Math.atan2(dy, dx);
  const al = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  const g = base + c * al;
  const j = [p[0] + a * Math.cos(g), p[1] + a * Math.sin(g)];
  const k = Math.hypot(q[0] - j[0], q[1] - j[1]);
  return [j, k > b ? [j[0] + ((q[0] - j[0]) * b) / k, j[1] + ((q[1] - j[1]) * b) / k] : q];
}

// Une position de profil :
// H hanche (ou S épaule, la hanche est alors déduite), t angle du torse (hanche vers épaule), tete inclinaison de la tête
// A cheville (ou Ar relative à la hanche), W main (ou Wt : [le long du torse, vers l'avant] depuis l'épaule)
// A2, W2 : membres du côté éloigné ; cg/cb : côté du genou et du coude ; pf : angle du pied
function squelette(P) {
  const H = P.S ? add(P.S, dir(P.t), -LG.torse) : P.H;
  const S = add(H, dir(P.t), LG.torse), C = add(S, dir(P.t + (P.tete || 0)), LG.cou);
  const main = (W, Wt) => (Wt ? add(add(S, dir(P.t), Wt[0]), dir(P.t - 90), Wt[1]) : W);
  const pied = (A, Ar) => (Ar ? add(H, Ar) : A);
  const jambe = (A, c, pf) => { const [K, Ae] = ik(H, A, LG.cuisse, LG.tibia, c); return { K, A: Ae, T: add(Ae, dir(pf), LG.pied) }; };
  const bras = (W, c, ua, fa) => {
    if (ua != null) { const E = add(S, dir(ua), LG.bras); return { E, W: add(E, dir(fa), LG.avb) }; }
    const [E, We] = ik(S, W, LG.bras, LG.avb, c); return { E, W: We };
  };
  const A1 = pied(P.A, P.Ar), A2 = P.A2 || P.A2r ? pied(P.A2, P.A2r) : A1;
  const W1 = main(P.W, P.Wt), W2 = P.W2 || P.Wt2 ? main(P.W2, P.Wt2) : W1;
  return {
    H, S, C,
    j1: jambe(A1, P.cg ?? -1, P.pf ?? 90), j2: jambe(A2, P.cg2 ?? P.cg ?? -1, P.pf2 ?? P.pf ?? 90),
    b1: bras(W1, P.cb ?? 1, P.ua, P.fa), b2: bras(W2, P.cb2 ?? P.cb ?? 1, P.ua2 ?? P.ua, P.fa2 ?? P.fa),
  };
}

function interp(a, b, t) {
  const o = {};
  for (const k in a) {
    const x = a[k], y = b[k] ?? x;
    o[k] = Array.isArray(x) ? [lerp(x[0], y[0], t), lerp(x[1], y[1], t)] : typeof x === 'number' ? lerp(x, y, t) : x;
  }
  for (const k in b) if (!(k in a)) o[k] = b[k];
  return o;
}

// corps gainé et droit des chevilles aux épaules (planche, pompes, gainage)
const droit = (A, t) => add(A, dir(t), LG.cuisse + LG.tibia);

// ---------------- décors ----------------
const BANC = (x, y, w) => ({ t: 'banc', x, y, w });
const SIEGE = (x, y, w) => ({ t: 'siege', x, y, w });
const DOSSIER = (x1, y1, x2, y2) => ({ t: 'ligne', p: [[x1, y1], [x2, y2]], w: 7 });
const POULIE = (x, y) => ({ t: 'poulie', x, y });
const POTEAU = (x, y) => ({ t: 'poteau', x, y });
const PRESSE = [{ t: 'ligne', p: [[34, 64], [58, 118], [96, 118]], w: 7 }, { t: 'ligne', p: [[96, 118], [96, 134]], w: 4 }];

// ---------------- bibliothèque des mouvements ----------------
// d : départ, f : arrivée ; femme : silhouette avec queue de cheval ; outil : charge en main ; cable : point d'attache
export const MOUVEMENTS = {
  // ---- jambes ----
  'Presse à cuisses': {
    femme: true, decor: PRESSE, outilPied: 'plateau',
    d: { H: [66, 112], t: 204, A: [100, 70], W: [74, 114], cg: -1, cb: 1, pf: 140 },
    f: { H: [66, 112], t: 204, A: [116, 58], W: [74, 114], cg: -1, cb: 1, pf: 140 },
  },
  'Squat gobelet avec un haltère': {
    femme: true, outil: 'haltere-v',
    d: { H: [100, 70], t: 180, A: [102, 130], W: [110, 46], cg: -1, cb: 1 },
    f: { H: [80, 99], t: 154, A: [102, 130], W: [108, 76], cg: -1, cb: 1 },
  },
  'Squat sur banc au poids du corps': {
    decor: [BANC(54, 100, 34)],
    d: { H: [100, 70], t: 180, A: [104, 130], W: [144, 34], cg: -1, cb: -1 },
    f: { H: [80, 96], t: 152, A: [104, 130], W: [142, 66], cg: -1, cb: -1 },
  },
  'Squat à la barre': {
    outil: 'barre-dos',
    d: { H: [100, 70], t: 180, A: [102, 130], Wt: [-4, 6], cg: -1, cb: 1 },
    f: { H: [78, 99], t: 146, A: [102, 130], Wt: [-4, 6], cg: -1, cb: 1 },
  },
  'Fentes marchées avec haltères': {
    femme: true, outil: 'haltere-p',
    d: { H: [96, 72], t: 180, A: [116, 130], A2: [72, 126], W: [98, 116], cg: -1, cg2: -1, pf2: 40, cb: 1 },
    f: { H: [94, 100], t: 180, A: [124, 130], A2: [58, 120], W: [96, 144], cg: -1, cg2: -1, pf2: 30, cb: 1 },
  },
  'Fentes arrière avec haltères': {
    femme: true, outil: 'haltere-p',
    d: { H: [100, 70], t: 180, A: [104, 130], A2: [98, 130], W: [102, 114], cg: -1, cg2: -1, cb: 1 },
    f: { H: [88, 99], t: 172, A: [112, 130], A2: [52, 120], W: [92, 143], cg: -1, cg2: -1, pf2: 30, cb: 1 },
  },
  'Leg extension': {
    decor: [SIEGE(58, 102, 52), DOSSIER(64, 56, 66, 102)], outilPied: 'boudin',
    d: { H: [80, 100], t: 182, A: [114, 130], W: [86, 104], cg: -1, cb: 1, pf: 70 },
    f: { H: [80, 100], t: 182, A: [140, 98], W: [86, 104], cg: -1, cb: 1, pf: 170 },
  },
  'Leg curl assis': {
    femme: true, decor: [SIEGE(58, 102, 52), DOSSIER(64, 56, 66, 102), { t: 'boudin', x: 108, y: 92 }], outilPied: 'boudin-bas',
    d: { H: [80, 100], t: 182, A: [140, 100], W: [86, 104], cg: -1, cb: 1, pf: 170 },
    f: { H: [80, 100], t: 182, A: [104, 128], W: [86, 104], cg: -1, cb: 1, pf: 110 },
  },
  // ---- fessiers et arrière des cuisses ----
  'Pont fessier': {
    femme: true,
    d: { S: [58, 128], t: -90, tete: 0, A: [124, 130], W: [102, 131], cg: -1, cb: -1 },
    f: { S: [58, 128], t: -62, tete: -28, A: [124, 130], W: [102, 131], cg: -1, cb: -1 },
  },
  'Hip thrust': {
    femme: true, decor: [BANC(16, 100, 50)], outil: 'barre',
    d: { S: [64, 98], t: -134, tete: -20, A: [140, 130], W: [96, 116], cg: -1, cb: -1 },
    f: { S: [64, 98], t: -90, tete: -40, A: [140, 130], W: [108, 88], cg: -1, cb: -1 },
  },
  'Soulevé de terre roumain avec haltères': {
    outil: 'haltere-p',
    d: { H: [104, 71], t: 180, A: [108, 130], W: [106, 115], cg: -1, cb: 1 },
    f: { H: [86, 76], t: 112, A: [108, 130], W: [126, 104], cg: -1, cb: 1 },
  },
  'Abduction à la machine': {
    femme: true, vue: 'face', outilGenoux: true,
    d: { hy: 96, tl: 42, ab: 22, ec: -30, lg: 6, cuisse: 12, assis: 1 },
    f: { hy: 96, tl: 42, ab: 22, ec: -30, lg: 42, cuisse: 12, assis: 1 },
  },
  'Kickback fessier à la poulie': {
    femme: true, decor: [POTEAU(150, 30), POULIE(150, 126)], cablePied: [150, 126],
    d: { H: [90, 72], t: 148, A: [96, 130], A2: [92, 130], W: [146, 52], cg: -1, cb: -1 },
    f: { H: [90, 72], t: 148, A: [36, 92], A2: [92, 130], W: [146, 52], cg: 1, cb: -1, pf: 10 },
  },
  'Abduction allongé sur le côté': {
    femme: true,
    d: { H: [100, 126], t: -90, A: [158, 124], A2: [160, 129], W: [100, 121], W2: [46, 112], cg: -1, cb: -1, cb2: -1 },
    f: { H: [100, 126], t: -90, A: [152, 94], A2: [160, 129], W: [100, 121], W2: [46, 112], cg: -1, cb: -1, cb2: -1 },
  },
  // ---- poussée ----
  'Développé machine convergente': {
    decor: [SIEGE(52, 106, 40), DOSSIER(58, 58, 60, 106)], outil: 'poignee',
    d: { H: [70, 104], t: 182, A: [112, 130], W: [92, 66], cg: -1, cb: 1 },
    f: { H: [70, 104], t: 182, A: [112, 130], W: [114, 64], cg: -1, cb: 1 },
  },
  'Pompes sur banc incliné': {
    decor: [BANC(120, 118, 50)],
    d: { H: droit([40, 126], 118), t: 118, A: [40, 126], W: [134, 118], cg: -1, cb: 1, pf: 20 },
    f: { H: droit([40, 126], 106), t: 106, A: [40, 126], W: [134, 118], cg: -1, cb: 1, pf: 20 },
  },
  'Développé couché avec haltères': {
    decor: [BANC(50, 104, 80)], outil: 'haltere-h',
    d: { H: [122, 98], t: -90, A: [150, 130], W: [83, 93], cg: -1, cb: 1 },
    f: { H: [122, 98], t: -90, A: [150, 130], W: [80, 55], cg: -1, cb: 1 },
  },
  'Développé couché à la barre': {
    decor: [BANC(50, 104, 80), { t: 'ligne', p: [[64, 104], [64, 46]], w: 4 }], outil: 'barre',
    d: { H: [122, 98], t: -90, A: [150, 130], W: [86, 88], cg: -1, cb: 1 },
    f: { H: [122, 98], t: -90, A: [150, 130], W: [80, 54], cg: -1, cb: 1 },
  },
  'Développé épaules à la machine': {
    femme: true, decor: [SIEGE(60, 106, 40), DOSSIER(66, 54, 68, 106)], outil: 'poignee',
    d: { H: [80, 104], t: 180, A: [116, 130], W: [92, 58], cg: -1, cb: 1 },
    f: { H: [80, 104], t: 180, A: [116, 130], W: [88, 18], cg: -1, cb: 1 },
  },
  'Développé militaire avec haltères': {
    decor: [SIEGE(60, 106, 40), DOSSIER(66, 54, 68, 106)], outil: 'haltere-h',
    d: { H: [80, 104], t: 180, A: [116, 130], W: [90, 58], cg: -1, cb: 1 },
    f: { H: [80, 104], t: 180, A: [116, 130], W: [86, 16], cg: -1, cb: 1 },
  },
  'Élévations latérales avec haltères': {
    femme: true, vue: 'face', outil: 'haltere-p',
    d: { hy: 72, tl: 42, ab: 8, ec: -6, lg: 5, cuisse: 30 },
    f: { hy: 72, tl: 42, ab: 84, ec: -10, lg: 5, cuisse: 30 },
  },
  // ---- tirage ----
  'Rowing assis à la poulie': {
    femme: true, decor: [SIEGE(48, 110, 40), { t: 'cale', x: 136, y: 96 }, POULIE(178, 104)], outil: 'poignee', cable: [178, 104],
    d: { H: [70, 108], t: 166, A: [128, 112], W: [114, 86], cg: -1, cb: 1, pf: 170 },
    f: { H: [70, 108], t: 182, A: [128, 112], W: [86, 96], cg: -1, cb: 1, pf: 170 },
  },
  'Rowing à la machine, poitrine appuyée': {
    decor: [SIEGE(50, 110, 40), { t: 'ligne', p: [[100, 52], [104, 92]], w: 8 }, { t: 'ligne', p: [[104, 92], [104, 134]], w: 4 }], outil: 'poignee',
    d: { H: [70, 108], t: 158, A: [118, 130], W: [130, 90], cg: -1, cb: 1 },
    f: { H: [70, 108], t: 158, A: [118, 130], W: [96, 80], cg: -1, cb: 1 },
  },
  'Rowing un bras avec haltère': {
    decor: [BANC(34, 100, 92)], outil: 'haltere-p',
    d: { H: [64, 72], t: 100, A: [74, 130], A2: [40, 99], W: [104, 108], W2: [110, 100], cg: -1, cg2: -1, pf2: -90, cb: 1, cb2: 1 },
    f: { H: [64, 72], t: 100, A: [74, 130], A2: [40, 99], W: [90, 78], W2: [110, 100], cg: -1, cg2: -1, pf2: -90, cb: -1, cb2: 1 },
  },
  'Rowing à la barre': {
    outil: 'barre',
    d: { H: [86, 78], t: 115, A: [106, 130], W: [124, 104], cg: -1, cb: 1 },
    f: { H: [86, 78], t: 115, A: [106, 130], W: [104, 82], cg: -1, cb: -1 },
  },
  'Tirage vertical poitrine': {
    femme: true, decor: [SIEGE(76, 100, 36), { t: 'boudin', x: 120, y: 89 }, POULIE(92, 6)], outil: 'poignee', cable: [92, 6],
    d: { H: [94, 98], t: 186, A: [126, 130], W: [88, 14], cg: -1, cb: 1 },
    f: { H: [94, 98], t: 192, A: [126, 130], W: [101, 64], cg: -1, cb: 1 },
  },
  'Tractions assistées': {
    decor: [{ t: 'ligne', p: [[60, 10], [150, 10]], w: 5 }, { t: 'ligne', p: [[150, 10], [150, 134]], w: 5 }],
    d: { H: [98, 102], t: 180, Ar: [-8, 58], W: [106, 11], cg: -1, cb: 1, pf: 60 },
    f: { H: [98, 70], t: 180, Ar: [-8, 58], W: [106, 11], cg: -1, cb: 1, pf: 60 },
  },
  'Face pull à la poulie': {
    decor: [POTEAU(176, 10), POULIE(176, 30)], outil: 'poignee', cable: [176, 30],
    d: { H: [80, 70], t: 184, A: [82, 130], A2: [72, 130], W: [124, 32], cg: -1, cb: 1 },
    f: { H: [80, 70], t: 184, A: [82, 130], A2: [72, 130], W: [96, 18], cg: -1, cb: -1 },
  },
  'Oiseau avec haltères, buste penché': {
    vue: 'face', outil: 'haltere-p',
    d: { hy: 74, tl: 20, ab: 10, ec: 0, lg: 8, cuisse: 30, penche: 1 },
    f: { hy: 74, tl: 20, ab: 78, ec: 0, lg: 8, cuisse: 30, penche: 1 },
  },
  // ---- bras ----
  'Curl avec haltères': {
    femme: true, outil: 'haltere-p',
    d: { H: [100, 70], t: 180, A: [102, 130], ua: 4, fa: 8, cg: -1 },
    f: { H: [100, 70], t: 180, A: [102, 130], ua: 4, fa: 160, cg: -1 },
  },
  'Curl à la poulie basse': {
    decor: [POULIE(150, 126)], outil: 'poignee', cable: [150, 126],
    d: { H: [96, 70], t: 180, A: [98, 130], ua: 4, fa: 14, cg: -1 },
    f: { H: [96, 70], t: 180, A: [98, 130], ua: 4, fa: 160, cg: -1 },
  },
  'Extension à la poulie haute': {
    femme: true, decor: [POTEAU(130, 4), POULIE(130, 6)], outil: 'poignee', cable: [130, 6],
    d: { H: [96, 70], t: 174, A: [98, 130], ua: 8, fa: 150, cg: -1 },
    f: { H: [96, 70], t: 174, A: [98, 130], ua: 8, fa: 14, cg: -1 },
  },
  'Extension triceps avec un haltère à deux mains': {
    decor: [SIEGE(70, 102, 40)], outil: 'haltere-v',
    d: { H: [90, 100], t: 180, A: [124, 130], ua: 172, fa: 330, cg: -1 },
    f: { H: [90, 100], t: 180, A: [124, 130], ua: 172, fa: 180, cg: -1 },
  },
  'Dips sur banc': {
    decor: [BANC(34, 96, 46)],
    d: { S: [76, 52], t: 180, A: [126, 128], W: [76, 96], cg: -1, cb: 1, pf: 160 },
    f: { S: [82, 72], t: 180, A: [126, 128], W: [76, 96], cg: -1, cb: 1, pf: 160 },
  },
  // ---- gainage et abdos ----
  'Planche sur les avant-bras': {
    femme: true,
    d: { H: droit([40, 126], 101), t: 101, A: [40, 126], W: [164, 130], cg: -1, cb: 1, pf: 20 },
    f: { H: droit([40, 126], 99.5), t: 99.5, A: [40, 126], W: [164, 130], cg: -1, cb: 1, pf: 20 },
  },
  'Dead bug': {
    femme: true,
    d: { H: [112, 124], t: -90, tete: 0, A: [142, 94], A2: [142, 94], W: [74, 80], W2: [74, 80], cg: -1, cb: 1, pf: 90 },
    f: { H: [112, 124], t: -90, tete: 0, A: [142, 94], A2: [170, 118], W: [26, 110], W2: [74, 80], cg: -1, cb: 1, pf: 90 },
  },
  'Gainage latéral': {
    d: { H: droit([160, 128], -101), t: -101, A: [160, 128], W: [82, 130], Wt2: [-34, 4], cg: 1, cb: -1, cb2: -1, pf: 180 },
    f: { H: droit([160, 128], -104), t: -104, A: [160, 128], W: [82, 130], Wt2: [-34, 4], cg: 1, cb: -1, cb2: -1, pf: 180 },
  },
  'Crunch à la poulie haute': {
    decor: [POTEAU(150, 2), POULIE(124, 4)], outil: 'poignee', cable: [124, 4],
    d: { H: [92, 96], t: 172, tete: 4, A: [60, 130], Wt: [6, 10], cg: -1, cb: -1, pf: -90 },
    f: { H: [92, 96], t: 128, tete: 8, A: [60, 130], Wt: [6, 10], cg: -1, cb: -1, pf: -90 },
  },
  'Relevés de genoux sur banc': {
    femme: true, decor: [BANC(34, 102, 62)],
    d: { H: [88, 98], t: 202, A: [148, 110], W: [62, 100], cg: -1, cb: 1 },
    f: { H: [88, 98], t: 194, A: [110, 82], W: [62, 100], cg: -1, cb: 1 },
  },
  // ---- mollets ----
  'Mollets à la presse': {
    decor: PRESSE, outilPied: 'plateau',
    d: { H: [66, 112], t: 204, A: [116, 64], W: [74, 114], cg: -1, cb: 1, pf: 120 },
    f: { H: [66, 112], t: 204, A: [116, 64], W: [74, 114], cg: -1, cb: 1, pf: 160 },
  },
  'Montées sur pointes au poids du corps': {
    femme: true, decor: [POTEAU(132, 40)],
    d: { H: [100, 70], t: 180, A: [100, 130], W: [128, 64], cg: -1, cb: 1, pf: 90 },
    f: { H: [100, 62], t: 180, A: [101, 122], W: [128, 60], cg: -1, cb: 1, pf: 50 },
  },
};

// ---------------- dessin ----------------
// Tenue GA : polo bleu GA, jogging bleu nuit, baskets blanches. Peau et cheveux dans la gamme de bleus du site.
const NS = 'http://www.w3.org/2000/svg';
const C = {
  polo: '#2F6FED', poloLoin: '#86A9F0',
  jog: '#13284F', jogLoin: '#5A73A3',
  peau: '#8DB0EE', peauLoin: '#BACEF3',
  cheveux: '#0B1E3D', chaussure: '#FFFFFF', semelle: '#0B1E3D',
  decor: '#5A6785', decorClair: '#8D9BB8', coussin: '#33476E',
  fonte: '#0B1E3D', manche: '#3A4C6B', sol: '#DCE6FB', ombre: '#E3EBFB',
};
function n(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; }
const f1 = (x) => x.toFixed(1);
const pts = (a) => a.map((p) => f1(p[0]) + ',' + f1(p[1])).join(' ');

// segment arrondi et effilé entre deux articulations (rayon ra en A, rb en B)
function capsule(A, B, ra, rb) {
  const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 0.001;
  const ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  const p = (P, r, s) => f1(P[0] + nx * r * s) + ',' + f1(P[1] + ny * r * s);
  return `M${p(A, ra, 1)} L${p(B, rb, 1)} A${f1(rb)},${f1(rb)} 0 0 0 ${p(B, rb, -1)} L${p(A, ra, -1)} A${f1(ra)},${f1(ra)} 0 0 0 ${p(A, ra, 1)}Z`;
}
const forme = (parent, fill) => n('path', { fill }, parent);
// contour lisse et fermé passant au milieu de chaque côté (courbes de Bézier quadratiques)
function lisse(P) {
  const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = 'M' + pts([m(P[P.length - 1], P[0])]);
  P.forEach((p, i) => { d += ' Q' + pts([p]) + ' ' + pts([m(p, P[(i + 1) % P.length])]); });
  return d + 'Z';
}
// silhouette de profil le long du torse : [position de la hanche (0) à l'épaule (1), largeur devant, largeur dans le dos]
const SIL = {
  femme: {
    bas: [[-0.2, 5, 9], [-0.1, 5.8, 12.6], [0.03, 6.2, 13.2], [0.15, 5.8, 10.2], [0.26, 5.2, 6.2]],
    haut: [[0.18, 5.8, 7.2], [0.38, 4.6, 4.8], [0.54, 6.2, 5.4], [0.66, 10.6, 6.2], [0.77, 10.4, 6.6], [0.88, 7.4, 7.2], [1.0, 6, 7.4], [1.08, 3.4, 4.6]],
  },
  homme: {
    bas: [[-0.14, 6, 7.6], [0, 7, 8.4], [0.12, 7, 7.8], [0.24, 7, 7.2]],
    haut: [[0.18, 7.2, 7.4], [0.45, 7.2, 7], [0.68, 8.8, 7.6], [0.84, 8.6, 8.3], [0.97, 7, 8.2], [1.07, 3.8, 4.8]],
  },
};
function silhouette(H, t, L) {
  const u = dir(t), f = dir(t - 90);
  const av = L.map(([k, a]) => add(add(H, u, k * LG.torse), f, a));
  const ar = L.map(([k, , b]) => add(add(H, u, k * LG.torse), f, -b)).reverse();
  return lisse(av.concat(ar));
}
const mi = (A, B, k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k];

function decor(g, d) {
  const sol = 134;
  const pied = (x, y) => n('rect', { x: x - 2, y, width: 4, height: sol - y, rx: 1.5, fill: C.decorClair }, g);
  if (d.t === 'banc') { pied(d.x + 8, d.y + 6); pied(d.x + d.w - 8, d.y + 6); n('rect', { x: d.x + 3, y: sol - 2, width: 10, height: 3, rx: 1.5, fill: C.decor }, g); n('rect', { x: d.x + d.w - 13, y: sol - 2, width: 10, height: 3, rx: 1.5, fill: C.decor }, g); n('rect', { x: d.x, y: d.y, width: d.w, height: 8, rx: 4, fill: C.coussin }, g); }
  if (d.t === 'siege') { pied(d.x + d.w / 2, d.y + 6); n('rect', { x: d.x + d.w / 2 - 9, y: sol - 2, width: 18, height: 3, rx: 1.5, fill: C.decor }, g); n('rect', { x: d.x, y: d.y, width: d.w, height: 8, rx: 4, fill: C.coussin }, g); }
  if (d.t === 'boudin') n('rect', { x: d.x - 8, y: d.y - 4.5, width: 16, height: 9, rx: 4.5, fill: C.coussin }, g);
  if (d.t === 'cale') n('rect', { x: d.x, y: d.y, width: 6, height: sol - d.y, rx: 3, fill: C.coussin }, g);
  if (d.t === 'poulie') { n('circle', { cx: d.x, cy: d.y, r: 4.5, fill: '#fff', stroke: C.decor, 'stroke-width': 2.2 }, g); n('circle', { cx: d.x, cy: d.y, r: 1.2, fill: C.decor }, g); }
  if (d.t === 'poteau') n('rect', { x: d.x - 3, y: d.y, width: 6, height: sol - d.y, rx: 3, fill: C.decor }, g);
  if (d.t === 'ligne') n('polyline', { fill: 'none', stroke: d.w >= 6 ? C.coussin : C.decorClair, 'stroke-width': d.w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', points: pts(d.p) }, g);
}

// charge tenue en main : dessinée une fois autour de (0, 0), déplacée à chaque image
function outil(g, type) {
  const fonte = (x, y, w, h) => n('rect', { x, y, width: w, height: h, rx: Math.min(w, h) / 2.4, fill: C.fonte }, g);
  if (type === 'haltere-h') { n('rect', { x: -10, y: -1.5, width: 20, height: 3, rx: 1.5, fill: C.manche }, g); fonte(-12, -6, 5, 12); fonte(7, -6, 5, 12); }
  if (type === 'haltere-v') { n('rect', { x: -1.5, y: -10, width: 3, height: 20, rx: 1.5, fill: C.manche }, g); fonte(-6, -12, 12, 5); fonte(-6, 7, 12, 5); }
  if (type === 'haltere-p') { n('circle', { r: 6.5, fill: C.fonte }, g); n('circle', { r: 3.6, fill: 'none', stroke: '#2C4A7E', 'stroke-width': 1.2 }, g); }
  if (type === 'barre' || type === 'barre-dos') { n('circle', { r: 12.5, fill: C.fonte }, g); n('circle', { r: 9, fill: 'none', stroke: '#2C4A7E', 'stroke-width': 1.4 }, g); n('circle', { r: 2.6, fill: '#D4E3FA' }, g); }
  if (type === 'poignee') n('rect', { x: -2.6, y: -7.5, width: 5.2, height: 15, rx: 2.6, fill: C.fonte }, g);
  return g;
}
const placer = (g, p, a) => g.setAttribute('transform', `translate(${f1(p[0])} ${f1(p[1])})` + (a != null ? ` rotate(${f1(a)})` : ''));

// tête de profil : visage clair, cheveux courts ou queue de cheval, orientée selon le cou
function tete(parent, femme, couleurPeau) {
  const g = n('g', {}, parent);
  const queue = femme ? forme(g, C.cheveux) : null;
  const crane = n('circle', { r: 9.6, fill: couleurPeau }, g);
  const cheveux = forme(g, C.cheveux);
  const oreille = n('circle', { r: 1.8, fill: '#6F95DA' }, g);
  return (Cc, ta) => {
    const up = dir(ta), av = dir(ta - 90);
    const P = (deg, R) => { const a = rad(deg); return [Cc[0] + R * (Math.cos(a) * up[0] + Math.sin(a) * av[0]), Cc[1] + R * (Math.cos(a) * up[1] + Math.sin(a) * av[1])]; };
    crane.setAttribute('cx', f1(Cc[0])); crane.setAttribute('cy', f1(Cc[1]));
    // calotte : du front jusqu'à la nuque, avec une frange légère
    const o = [P(52, 10.3), P(10, 10.9), P(-40, 10.9), P(-95, 10.6), P(-128, 9.6)];
    const i = [P(-118, 6), P(-70, 3.2), P(10, 6.8), P(48, 8.4)];
    cheveux.setAttribute('d', `M${pts([o[0]])} Q${pts([P(30, 11.6)])} ${pts([o[1]])} Q${pts([P(-15, 12)])} ${pts([o[2]])} Q${pts([P(-70, 12)])} ${pts([o[3]])} L${pts([o[4]])} Q${pts([i[0]])} ${pts([i[1]])} Q${pts([i[2]])} ${pts([i[3]])} Z`);
    const or = P(-62, 1.2); oreille.setAttribute('cx', f1(or[0])); oreille.setAttribute('cy', f1(or[1]));
    if (queue) {
      // queue de cheval : attachée haut derrière le crâne, effilée, qui retombe dans le dos
      const a = P(-62, 9.6), b = P(-112, 8.6), bas = add(add(Cc, up, -17), av, -12), c1 = add(add(Cc, up, 6), av, -20), c2 = add(add(Cc, up, -8), av, -21);
      // la queue de cheval ne traverse jamais le sol (personne allongée)
      const q = (p) => [p[0], Math.min(p[1], 133.5)];
      queue.setAttribute('d', `M${pts([q(a)])} C${pts([q(c1)])} ${pts([q(c2)])} ${pts([q(bas)])} C${pts([q(add(bas, av, 3))])} ${pts([q(add(b, av, -4))])} ${pts([q(b)])} Z`);
    }
  };
}

function profil(svg, M) {
  const ombre = n('ellipse', { rx: 34, ry: 3.2, fill: C.ombre }, svg);
  const gd = n('g', {}, svg); (M.decor || []).forEach((d) => decor(gd, d));
  const cable = M.cable || M.cablePied ? n('line', { stroke: C.decor, 'stroke-width': 1.4 }, svg) : null;
  // côté éloigné (derrière le corps)
  const bL = { haut: forme(svg, C.peauLoin), bas: forme(svg, C.peauLoin), manche: forme(svg, C.poloLoin), main: n('circle', { r: 3.4, fill: C.peauLoin }, svg) };
  const olg = M.outil && !['barre', 'barre-dos'].includes(M.outil) ? outil(n('g', {}, svg), M.outil) : null;
  const jL = { cuisse: forme(svg, C.jogLoin), tibia: forme(svg, C.jogLoin), pied: forme(svg, '#DCE6FB') };
  // corps
  const cou = forme(svg, C.peau);
  const bassin = forme(svg, C.jog);
  const torse = forme(svg, C.polo);
  const col = n('path', { fill: 'none', stroke: '#fff', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.85 }, svg);
  const tt = tete(svg, M.femme, C.peau);
  // côté proche
  const jP = { cuisse: forme(svg, C.jog), tibia: forme(svg, C.jog), pied: forme(svg, C.chaussure), semelle: n('path', { fill: 'none', stroke: C.semelle, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, svg) };
  const op = M.outilPied ? n('g', {}, svg) : null;
  if (op) {
    if (M.outilPied === 'plateau') n('rect', { x: -3, y: -17, width: 6, height: 34, rx: 3, fill: C.decor }, op);
    else n('rect', { x: -4.5, y: -8.5, width: 9, height: 17, rx: 4.5, fill: C.coussin }, op);
  }
  const bP = { haut: forme(svg, C.peau), bas: forme(svg, C.peau), manche: forme(svg, C.polo), main: n('circle', { r: 3.6, fill: C.peau }, svg) };
  const oc = M.outil ? outil(n('g', {}, svg), M.outil) : null;
  const femme = !!M.femme;
  const bras = (b, S, E, W) => {
    b.haut.setAttribute('d', capsule(S, E, 4.4, 3.6));
    b.bas.setAttribute('d', capsule(E, W, 3.5, 2.8));
    b.manche.setAttribute('d', capsule(S, mi(S, E, 0.5), 5.6, 4.8));
    b.main.setAttribute('cx', f1(W[0])); b.main.setAttribute('cy', f1(W[1]));
  };
  const jambe = (j, H, K, A, T, pf) => {
    j.cuisse.setAttribute('d', capsule(H, K, femme ? 8 : 6.8, femme ? 5.2 : 5.2));
    j.tibia.setAttribute('d', capsule(K, A, 5, 3.8));
    // basket : talon un peu en arrière de la cheville, bout arrondi
    const talon = add(A, dir(pf), -2.5), bout = add(A, dir(pf), LG.pied + 1.5);
    j.pied.setAttribute('d', capsule(talon, bout, 3.9, 3.2));
    if (j.semelle) { const bas = dir(pf + 90); j.semelle.setAttribute('d', `M${pts([add(talon, bas, -3.6)])} L${pts([add(bout, bas, -3)])}`); }
  };
  return (t) => {
    const P = interp(M.d, M.f, t), s = squelette(P);
    const ta = P.t + (P.tete || 0);
    ombre.setAttribute('cx', f1((s.j1.A[0] + s.j2.A[0] + s.H[0] + s.S[0]) / 4)); ombre.setAttribute('cy', '134');
    bras(bL, s.S, s.b2.E, s.b2.W);
    jambe(jL, s.H, s.j2.K, s.j2.A, s.j2.T, P.pf2 ?? P.pf ?? 90);
    const cb = add(s.S, dir(ta), 6);
    cou.setAttribute('d', capsule(s.S, cb, 3.4, 3.2));
    // torse : plus large aux épaules qu'à la taille
    const sil = femme ? SIL.femme : SIL.homme;
    torse.setAttribute('d', silhouette(s.H, P.t, sil.haut));
    bassin.setAttribute('d', silhouette(s.H, P.t, sil.bas));
    // petit col du polo
    const av = dir(P.t - 90), c0 = add(s.S, av, 3.5), c1 = add(add(s.S, dir(P.t), 3.2), av, 0.5);
    col.setAttribute('d', `M${pts([c0])} L${pts([c1])}`);
    tt(s.C, ta);
    jambe(jP, s.H, s.j1.K, s.j1.A, s.j1.T, P.pf ?? 90);
    bras(bP, s.S, s.b1.E, s.b1.W);
    if (M.cable) { cable.setAttribute('x1', M.cable[0]); cable.setAttribute('y1', M.cable[1]); cable.setAttribute('x2', f1(s.b1.W[0])); cable.setAttribute('y2', f1(s.b1.W[1])); }
    if (M.cablePied) { cable.setAttribute('x1', M.cablePied[0]); cable.setAttribute('y1', M.cablePied[1]); cable.setAttribute('x2', f1(s.j1.A[0])); cable.setAttribute('y2', f1(s.j1.A[1])); }
    if (oc) placer(oc, M.outil === 'barre-dos' ? add(s.S, dir(P.t - 90), -6) : s.b1.W);
    if (olg) placer(olg, s.b2.W);
    if (op) {
      const pf = P.pf ?? 90, ang = (Math.atan2(s.j1.T[1] - s.j1.A[1], s.j1.T[0] - s.j1.A[0]) * 180) / Math.PI;
      if (M.outilPied === 'plateau') placer(op, add(add(s.j1.A, dir(pf), 6), dir(pf + 90), -5), ang);
      else if (M.outilPied === 'boudin') placer(op, add(s.j1.A, dir(pf - 180), 6.5), ang + 90);
      else placer(op, add(s.j1.A, dir(pf + 90), -7.5), ang + 90);
    }
  };
}

// vue de face : élévations latérales, oiseau, abduction
function face(svg, M) {
  const cx = 100, femme = !!M.femme;
  n('ellipse', { cx, cy: 134, rx: 34, ry: 3.2, fill: C.ombre }, svg);
  if (M.d.assis) { n('rect', { x: cx - 2, y: M.d.hy + 8, width: 4, height: 134 - M.d.hy - 8, rx: 1.5, fill: C.decorClair }, svg); n('rect', { x: cx - 12, y: 132, width: 24, height: 3, rx: 1.5, fill: C.decor }, svg); n('rect', { x: cx - 27, y: M.d.hy + 1, width: 54, height: 8, rx: 4, fill: C.coussin }, svg); }
  const jambes = [0, 1].map(() => ({ cuisse: forme(svg, C.jog), tibia: forme(svg, C.jog), pied: forme(svg, C.chaussure), semelle: n('path', { fill: 'none', stroke: C.semelle, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, svg) }));
  const pads = M.outilGenoux ? [0, 1].map(() => n('rect', { width: 8, height: 15, rx: 4, fill: C.coussin }, svg)) : null;
  const cou = forme(svg, C.peau);
  const bassin = forme(svg, C.jog);
  const torse = forme(svg, C.polo);
  const col = n('path', { fill: 'none', stroke: '#fff', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.85 }, svg);
  const crane = n('ellipse', { rx: 9, ry: 9.8, fill: C.peau }, svg);
  const cheveux = forme(svg, C.cheveux);
  const queue = femme ? forme(svg, C.cheveux) : null;
  const bras = [0, 1].map(() => ({ haut: forme(svg, C.peau), bas: forme(svg, C.peau), manche: forme(svg, C.polo), main: n('circle', { r: 3.6, fill: C.peau }, svg) }));
  const charges = M.outil ? [outil(n('g', {}, svg), M.outil), outil(n('g', {}, svg), M.outil)] : null;
  return (t) => {
    const P = interp(M.d, M.f, t);
    const hy = P.hy, sy = hy - P.tl, epaule = femme ? 12.5 : 14.5;
    // torse en trapèze arrondi
    const L = P.tl;
    // [hauteur depuis l'épaule (0) jusqu'à la hanche (1), demi-largeur]
    const prof = femme
      ? [[-0.1, 6], [0, 13.8], [0.2, 12.2], [0.34, 12.4], [0.5, 9], [0.62, 7.8], [0.78, 10.6], [0.92, 12.6]]
      : [[-0.1, 7], [0, 16.5], [0.22, 15], [0.45, 12.6], [0.7, 11], [0.92, 11]];
    const dte = prof.map(([k, w]) => [cx + w, sy + k * L]), gch = prof.map(([k, w]) => [cx - w, sy + k * L]).reverse();
    torse.setAttribute('d', lisse(dte.concat(gch)));
    col.setAttribute('d', `M${cx - 4},${f1(sy - 4)} L${cx},${f1(sy + 1)} L${cx + 4},${f1(sy - 4)}`);
    const hb = femme ? [[0.8, 9.8], [0.98, 15.4], [1.12, 15.6], [1.26, 10]] : [[0.84, 10.8], [1.0, 11.6], [1.16, 11.6], [1.24, 8]];
    bassin.setAttribute('d', lisse(hb.map(([k, w]) => [cx + w, sy + k * L]).concat(hb.map(([k, w]) => [cx - w, sy + k * L]).reverse())));
    const ty = P.penche ? sy + 3 : sy - 15;
    cou.setAttribute('d', capsule([cx, sy - 2], [cx, ty + 6], 3.4, 3.2));
    crane.setAttribute('cx', cx); crane.setAttribute('cy', f1(ty));
    if (P.penche) cheveux.setAttribute('d', `M${cx - 9.4},${f1(ty - 1)} Q${cx - 9},${f1(ty - 10.5)} ${cx},${f1(ty - 10.8)} Q${cx + 9},${f1(ty - 10.5)} ${cx + 9.4},${f1(ty - 1)} Q${cx},${f1(ty - 5)} ${cx - 9.4},${f1(ty - 1)} Z`);
    else cheveux.setAttribute('d', `M${cx - 9.6},${f1(ty + (femme ? 6 : 1))} Q${cx - 10.5},${f1(ty - 11.5)} ${cx},${f1(ty - 11.2)} Q${cx + 10.5},${f1(ty - 11.5)} ${cx + 9.6},${f1(ty + (femme ? 6 : 1))} L${cx + 7.6},${f1(ty - 2)} Q${cx},${f1(ty - 7.5)} ${cx - 7.6},${f1(ty - 2)} Z`);
    // de face : chignon haut, bien lisible
    if (queue) queue.setAttribute('d', `M${cx - 4.6},${f1(ty - 11)} a4.6,4.4 0 1 1 9.2,0 a4.6,4.4 0 1 1 -9.2,0 Z`);
    if (queue && P.penche) queue.setAttribute('d', '');
    [-1, 1].forEach((sg, i) => {
      const hip = [cx + sg * (femme ? 8.4 : 7), hy + 3];
      let K, A;
      if (P.assis) { K = add(hip, [sg * Math.sin(rad(P.lg)), 0.35], P.cuisse); A = [K[0] + sg * 1.5, 128]; }
      else { const v = [sg * Math.sin(rad(P.lg)), Math.cos(rad(P.lg))]; K = add(hip, v, LG.cuisse); A = add(K, v, LG.tibia - 2); }
      const j = jambes[i];
      j.cuisse.setAttribute('d', capsule(hip, K, femme ? 8.6 : 6.8, 5.2));
      j.tibia.setAttribute('d', capsule(K, A, 5, 3.9));
      const pied = [A[0] + sg * 3.5, A[1] + 3];
      j.pied.setAttribute('d', capsule([A[0] - sg * 1.5, A[1] + 3], pied, 3.8, 3.4));
      j.semelle.setAttribute('d', `M${f1(A[0] - sg * 4)},${f1(A[1] + 6.4)} L${f1(pied[0] + sg * 2)},${f1(A[1] + 6.4)}`);
      if (pads) placer(pads[i], [K[0] + sg * 7 - 4, K[1] - 7.5]);
      const sh = [cx + sg * epaule, sy + 1];
      const E = add(sh, [sg * Math.sin(rad(P.ab)), Math.cos(rad(P.ab))], LG.bras);
      const fa = P.ab + P.ec;
      const W = add(E, [sg * Math.sin(rad(fa)), Math.cos(rad(fa))], LG.avb);
      const b = bras[i];
      b.haut.setAttribute('d', capsule(sh, E, 4.4, 3.6));
      b.bas.setAttribute('d', capsule(E, W, 3.5, 2.8));
      b.manche.setAttribute('d', capsule(sh, mi(sh, E, 0.5), 5.8, 5));
      b.main.setAttribute('cx', f1(W[0])); b.main.setAttribute('cy', f1(W[1]));
      if (charges) placer(charges[i], W);
    });
  };
}

export function creer(svg, nom) {
  const M = MOUVEMENTS[nom]; if (!M) return null;
  svg.setAttribute('viewBox', '0 0 200 150');
  svg.textContent = '';
  n('line', { x1: 14, y1: 135.5, x2: 186, y2: 135.5, stroke: C.sol, 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
  return M.vue === 'face' ? face(svg, M) : profil(svg, M);
}

// une seule boucle d'animation pour toute la page ; seuls les pictogrammes visibles sont redessinés
const actifs = new Map();
let boucleId = 0;
const PERIODE = 3200;
const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => es.forEach((e) => { const a = actifs.get(e.target); if (a) a.vu = e.isIntersecting; })) : null;
function boucle(ts) {
  const x = (ts % PERIODE) / PERIODE;
  // montée et descente fluides, avec un court temps d'arrêt en haut et en bas
  const y = Math.min(1, Math.max(0, ((1 - Math.cos(2 * Math.PI * x)) / 2) * 1.14 - 0.07));
  actifs.forEach((a, svg) => { if (!svg.isConnected) { actifs.delete(svg); io && io.unobserve(svg); } else if (a.vu) a.poser(y); });
  boucleId = actifs.size ? requestAnimationFrame(boucle) : 0;
}
export const aUnPictogramme = (nom) => !!MOUVEMENTS[nom];
export function animer(svg, nom) {
  const poser = creer(svg, nom); if (!poser) return false;
  svg.setAttribute('aria-hidden', 'true');
  const calme = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  poser(1);
  if (calme) return true;
  actifs.set(svg, { poser, vu: !io });
  io && io.observe(svg);
  if (!boucleId) boucleId = requestAnimationFrame(boucle);
  return true;
}
