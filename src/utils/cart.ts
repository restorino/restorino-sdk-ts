import { OrderItemRequest } from '../types/orders';

export interface CartCalculationResult {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  itemCount: number;
  /** Le panier satisfait-il le minimum de commande (livraison / à emporter) ? */
  meetsMinimumOrder: boolean;
}

export interface CartCalculationOptions {
  deliveryFee?: number;
  discountAmount?: number;
  discountPercent?: number;
  /** Plafond du rabais en pourcentage (équivalent `maxDiscountAmount` backend). */
  maxDiscountAmount?: number;
  /** Taux de TVA en pourcentage (ex. 10 pour 10 %). */
  taxRate?: number;
  /** `restaurant_settings.minimumOrderAmount`. */
  minimumOrderAmount?: number;
  /** `restaurant_settings.freeDeliveryThreshold`. */
  freeDeliveryThreshold?: number;
  /**
   * Le minimum de commande ne s'applique qu'à la livraison et au à-emporter
   * (le backend l'ignore pour le sur-place) : passer `false` en dine-in.
   * Défaut: true.
   */
  enforceMinimumOrder?: boolean;
}

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Calcule les sous-totaux, frais et totaux d'un panier d'articles.
 *
 * Reproduit la formule serveur (`OrderService.createVitrineOrder` + `Order.calculateTotal`) :
 * `total = subtotal + tax + deliveryFee − discount`.
 *
 * ⚠️ Ce calcul est une **estimation d'affichage** : le backend reste
 * autoritaire et rejette toute commande dont le total s'écarte de plus de 0,01 €.
 * Ne jamais envoyer `total`/`tax` au serveur comme valeur de référence.
 */
export function calculateCart(
  items: OrderItemRequest[],
  options: CartCalculationOptions = {}
): CartCalculationResult {
  if (!Array.isArray(items)) {
    return { subtotal: 0, tax: 0, deliveryFee: 0, discount: 0, total: 0, itemCount: 0, meetsMinimumOrder: true };
  }

  let subtotal = 0;
  let itemCount = 0;

  for (const item of items) {
    if (!item) continue;
    const qty = Math.max(0, item.quantity || 1);
    const unit = Math.max(0, item.unitPrice || 0);
    // `totalPrice` inclut déjà suppléments, garniture et quantité : l'ignorer
    // faisait diverger le panier dès qu'un extra était sélectionné.
    const lineTotal = typeof item.totalPrice === 'number' && item.totalPrice > 0
      ? item.totalPrice
      : unit * qty;
    subtotal += lineTotal;
    itemCount += qty;
  }

  subtotal = roundMoney(Math.max(0, subtotal));

  const tax = roundMoney(subtotal * (Math.max(0, options.taxRate || 0) / 100));

  let deliveryFee = Math.max(0, options.deliveryFee || 0);
  if (options.freeDeliveryThreshold !== undefined && subtotal >= options.freeDeliveryThreshold) {
    deliveryFee = 0;
  }
  deliveryFee = roundMoney(deliveryFee);

  let discount = Math.max(0, options.discountAmount || 0);
  if (options.discountPercent && options.discountPercent > 0) {
    const percentDiscount = (subtotal * Math.min(100, options.discountPercent)) / 100;
    const cap = options.maxDiscountAmount ?? percentDiscount;
    discount += Math.min(percentDiscount, Math.max(0, cap));
  }
  // Le rabais ne peut pas dépasser le sous-total.
  discount = roundMoney(Math.min(subtotal, discount));

  const total = roundMoney(Math.max(0, subtotal - discount + tax + deliveryFee));

  const minimum = Math.max(0, options.minimumOrderAmount || 0);
  const meetsMinimumOrder = options.enforceMinimumOrder === false || subtotal >= minimum;

  return { subtotal, tax, deliveryFee, discount, total, itemCount, meetsMinimumOrder };
}

/**
 * Vérifie si un plat contient un ou plusieurs allergènes spécifiés par le client.
 *
 * Accepte une chaîne (le backend sérialise `allergenInfo` comme un `String` :
 * allergènes séparés par des virgules) ou un tableau.
 */
export function checkAllergensConflict(
  dishAllergens: string[] | string = [],
  customerAllergens: string[] = []
): { hasConflict: boolean; conflictingAllergens: string[] } {
  const dishList = normalizeAllergens(dishAllergens);
  const customerList = normalizeAllergens(customerAllergens);

  if (dishList.length === 0 || customerList.length === 0) {
    return { hasConflict: false, conflictingAllergens: [] };
  }

  const customerSet = new Set(customerList.map((a) => a.toLowerCase()));
  const conflicts = dishList.filter((a) => customerSet.has(a.toLowerCase()));

  return {
    hasConflict: conflicts.length > 0,
    conflictingAllergens: conflicts
  };
}

function normalizeAllergens(value: string[] | string): string[] {
  if (Array.isArray(value)) {
    return value.map((a) => String(a).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[,;|]/).map((a) => a.trim()).filter(Boolean);
  }
  return [];
}
