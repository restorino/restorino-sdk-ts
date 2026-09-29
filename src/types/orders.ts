/**
 * Types de commande.
 */
export type OrderType = 'DELIVERY' | 'TAKEAWAY' | 'DINE_IN';

/**
 * Moyens de paiement acceptés.
 */
export type PaymentMethod = 'CASH' | 'CARD_ONLINE' | 'CARD_ON_DELIVERY' | 'MEAL_VOUCHER';

/**
 * Coordonnées de livraison du client.
 */
export interface CustomerLocation {
  street: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  floor?: string;
  doorCode?: string;
  instructions?: string;
}

/**
 * Article sélectionné dans le panier.
 */
export interface OrderItemRequest {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  selectedSize?: string;
  supplementIds?: string[];
  garnishIds?: string[];
  specialInstructions?: string;
}

/**
 * Requête complète de passage de commande publique.
 */
export interface VitrineOrderRequest {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderType: OrderType;
  deliveryLocation?: CustomerLocation;
  tableNumber?: string;
  paymentMethod: PaymentMethod;
  items: OrderItemRequest[];
  promoCode?: string;
  notes?: string;
}

/**
 * Détail d'un article dans la réponse de commande.
 */
export interface OrderItemResponse {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Statuts d'une commande.
 */
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

/**
 * Réponse retournée après création d'une commande.
 */
export interface OrderResponse {
  id: string;
  orderNumber: string;
  restaurantId: string;
  status: OrderStatus;
  orderType: OrderType;
  totalAmount: number;
  subtotalAmount: number;
  deliveryFee: number;
  discountAmount: number;
  currency: string;
  trackingToken: string;
  trackingUrl: string;
  estimatedDeliveryTime?: string;
  createdAt: string;
  items: OrderItemResponse[];
}

/**
 * Paramètres d'accès sécurisé pour le suivi d'une commande sans compte.
 * Double facteur anti-IDOR imposé par le backend : email + téléphone du client.
 */
export interface OrderTrackingVerification {
  customerEmail: string;
  customerPhone: string;
}

/**
 * Paramètres pour l'annulation d'une commande publique.
 */
export interface CancelOrderRequest {
  customerEmail: string;
  customerPhone: string;
  reason?: string;
}

/**
 * Paramètres d'accès sécurisé pour le suivi d'une réservation de table.
 */
export interface ReservationTrackingVerification {
  customerEmail: string;
  customerPhone: string;
}

/**
 * Paramètres pour l'annulation d'une réservation de table.
 */
export interface CancelReservationRequest {
  customerEmail: string;
  customerPhone: string;
  reason?: string;
}

/**
 * Suivi en temps réel de commande.
 */
export interface OrderTrackingResponse {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  estimatedReadyTime?: string;
  estimatedDeliveryTime?: string;
  isDelivered: boolean;
  trackingNumber?: string;
  deliveryDriverName?: string;
  driverPhone?: string;
}

/**
 * Estimation de livraison.
 */
export interface DeliveryEstimateResponse {
  deliveryFee: number;
  estimatedMinutes: number;
  isDeliverable: boolean;
  message?: string;
}

/**
 * Requête de création d'une réservation de table.
 */
export interface CreateReservationRequest {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reservationDate: string; // YYYY-MM-DD
  reservationTime: string; // HH:mm
  partySize: number;
  specialRequests?: string;
}

/**
 * Réponse de réservation.
 */
export interface ReservationResponse {
  id: string;
  reservationNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  createdAt: string;
}

/**
 * Paramètres publics d'un restaurant (taxe, couleurs, devise).
 */
export interface PublicRestaurantSettingsResponse {
  id: string;
  name: string;
  taxRate: number;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  currency: string;
  acceptingOrders: boolean;
}
