import { OrderItemRequest } from '../types/orders';

export interface CartCalculationResult {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  itemCount: number;
}

export interface CartCalculationOptions {
  deliveryFee?: number;
  discountAmount?: number;
  discountPercent?: number;
}

/**
 * Calcule les sous-totaux, frais et totaux d'un panier d'articles.
 */
export function calculateCart(
  items: OrderItemRequest[],
  options: CartCalculationOptions = {}
): CartCalculationResult {
  if (!Array.isArray(items)) {
    return { subtotal: 0, deliveryFee: 0, discount: 0, total: 0, itemCount: 0 };
  }

  let subtotal = 0;
  let itemCount = 0;

  for (const item of items) {
    if (!item) continue;
    const qty = Math.max(0, item.quantity || 1);
    const unit = Math.max(0, item.unitPrice || 0);
    subtotal += unit * qty;
    itemCount += qty;
  }

  const deliveryFee = Math.max(0, options.deliveryFee || 0);
  let discount = Math.max(0, options.discountAmount || 0);

  if (options.discountPercent && options.discountPercent > 0) {
    const percentDiscount = (subtotal * Math.min(100, options.discountPercent)) / 100;
    discount = Math.max(discount, percentDiscount);
  }

  // Le rabais ne peut pas dépasser le sous-total
  discount = Math.min(subtotal, discount);
  const total = Math.max(0, subtotal - discount + deliveryFee);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
    itemCount
  };
}

/**
 * Vérifie si un plat contient un ou plusieurs allergènes spécifiés par le client.
 */
export function checkAllergensConflict(
  dishAllergens: string[] = [],
  customerAllergens: string[] = []
): { hasConflict: boolean; conflictingAllergens: string[] } {
  if (!Array.isArray(dishAllergens) || !Array.isArray(customerAllergens)) {
    return { hasConflict: false, conflictingAllergens: [] };
  }

  const customerSet = new Set(
    customerAllergens.map((a) => String(a).toLowerCase().trim())
  );

  const conflicts = dishAllergens
    .map((a) => String(a).trim())
    .filter((a) => customerSet.has(a.toLowerCase()));

  return {
    hasConflict: conflicts.length > 0,
    conflictingAllergens: conflicts
  };
}
