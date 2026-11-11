// La vente en ligne est-elle ouverte pour ce produit ? (boutique.json : vente.ouverte + domaine Shopify + variantes remplies)
import b from './boutique.json';
export function commandeOuverte(p: any) {
  const ve: any = (b as any).vente || {};
  const s = p?.shopify || {};
  return !!(ve.ouverte && ve.domaine && (s.variante || (s.variantes && Object.values(s.variantes).some(Boolean))));
}
