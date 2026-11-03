/**
 * Type de commande envoyé à l'API.
 * Le backend valide `^(delivery|takeout|dine-in)$` : les anciennes valeurs
 * `TAKEAWAY` / `DINE_IN` étaient rejetées par un HTTP 400.
 */
export type DeliveryMethod = 'delivery' | 'takeout' | 'dine-in';

/**
 * Type de commande tel que sérialisé dans les réponses (`DELIVERY|TAKEOUT|DINE_IN`).
 */
export type OrderType = 'DELIVERY' | 'TAKEOUT' | 'DINE_IN';

/**
 * Moyens de paiement acceptés (`^(card|cash|paypal|stripe|mobile)$`).
 */
export type PaymentMethod = 'card' | 'cash' | 'paypal' | 'stripe' | 'mobile';

/**
 * Coordonnées de livraison du client (`CustomerLocation` backend).
 */
export interface CustomerLocation {
  /** Obligatoire dès que `customerLocation` est fourni. */
  latitude: number;
  longitude: number;
  /** Alternative aux coordonnées : une adresse non vide suffit pour livrer. */
  address?: string;
  city?: string;
  postalCode?: string;
}

export interface OrderItemSupplement {
  supplementId: string;
  supplementName: string;
  price: number;
  quantity: number;
}

export interface OrderItemGarnish {
  garnishId: string;
  garnishName: string;
  price: number;
}

/**
 * Article sélectionné dans le panier (`VitrineOrderItemRequest`).
 *
 * `totalPrice` est `@NotNull` côté backend : sans lui toute commande est
 * rejetée. Les prix restent revalidés côté serveur (`validateOrderTotals`).
 */
export interface OrderItemRequest {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  /** `unitPrice * quantity` + suppléments + garniture. */
  totalPrice: number;
  categoryId?: string;
  categoryName?: string;
  specialInstructions?: string;
  supplements?: OrderItemSupplement[];
  garnish?: OrderItemGarnish;
}

/**
 * Requête complète de passage de commande publique (`VitrineOrderRequest`).
 */
export interface VitrineOrderRequest {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  items: OrderItemRequest[];
  /** Requis pour `delivery` sans coordonnées GPS utilisables. */
  customerLocation?: CustomerLocation;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  preferredDeliveryTime?: string;
  tableNumber?: string;
  tableToken?: string;
  paymentToken?: string;
  promoCode?: string;
  pointsToRedeem?: number;
  orderNotes?: string;
  marketingConsent?: boolean;
  subtotal?: number;
  tax?: number;
  deliveryFee?: number;
  discount?: number;
  total?: number;
  recoveryToken?: string;
  /** Champ anti-spam : doit rester vide. */
  website?: string;
  formTimestamp?: number;
  /** Transmis en en-tête `Idempotency-Key`, jamais dans le corps. */
  idempotencyKey?: string;
}

/**
 * Détail d'un article dans la réponse de commande.
 */
export interface OrderItemResponse {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
}

/**
 * Statuts d'une commande (`OrderStatus` backend).
 */
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUSED'
  | 'REFUNDED'
  | 'PENDING_VERIFICATION';

/**
 * Réponse retournée après création ou lecture d'une commande (`OrderResponse`).
 *
 * Les montants sont `subtotal`, `tax`, `deliveryFee`, `total` : le backend
 * n'expose ni `totalAmount` ni `subtotalAmount`.
 */
export interface OrderResponse {
  id: string;
  restaurantId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress?: string;
  tableNumber?: string;
  items: OrderItemResponse[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  orderType: OrderType;
  deliveryMethod?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  cancellationReason?: string;
  trackingUrl?: string;
  estimatedTime?: number;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  source?: string;
  createdAt: string;
  updatedAt?: string;
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
 * Suivi en temps réel de commande (`TrackOrderResponse`).
 */
export interface OrderTrackingResponse {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  statusDescription?: string;
  orderTime?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  totalAmount?: number;
  deliveryMethod?: string;
  deliveryAddress?: string;
  canBeCancelled?: boolean;
  restaurant?: { name: string; phone?: string; address?: string };
  progress?: Array<{ step: string; description?: string; timestamp?: string; completed?: boolean }>;
  deliveryTracking?: {
    driverName?: string;
    driverPhone?: string;
    currentLatitude?: number;
    currentLongitude?: number;
    etaMinutes?: number;
  };
  contactInfo?: { restaurantPhone?: string; supportEmail?: string; supportPhone?: string };
}

/**
 * Requête d'estimation de livraison (`EstimateDeliveryRequest`).
 */
export interface EstimateDeliveryRequest {
  latitude: number;
  longitude: number;
  /** 10 à 500 caractères, `@NotBlank` côté backend. */
  address: string;
  /** Format `HH:mm`. */
  preferredTime?: string;
  orderValue?: number;
}

/**
 * Estimation de livraison (`EstimateDeliveryResponse`).
 */
export interface DeliveryEstimateResponse {
  estimatedDeliveryMinutes: number;
  estimatedDeliveryTime?: string;
  distanceKm?: number;
  deliveryFee: number;
  withinDeliveryZone: boolean;
  minimumOrderValue?: number;
  freeDeliveryApplies?: boolean;
  nextAvailableSlot?: string;
  additionalInfo?: string;
}

/**
 * Requête de création d'une réservation de table (`CreateReservationRequest`).
 */
export interface CreateReservationRequest {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  /** 1 à 50 convives. */
  numberOfGuests: number;
  /** Date-heure ISO 8601 dans le futur, ex. `2026-12-24T20:30:00`. */
  reservationDate: string;
  specialRequests?: string;
  tableId?: string;
  tableNumber?: string;
  customerLatitude?: number;
  customerLongitude?: number;
  customerGpsAccuracyMeters?: number;
  /** Champ anti-spam : doit rester vide. */
  website?: string;
  formTimestamp?: number;
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

/**
 * Réponse de réservation (`ReservationResponse`).
 */
export interface ReservationResponse {
  id: string;
  reservationNumber: string;
  restaurantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  numberOfGuests: number;
  reservationDate: string;
  status: ReservationStatus;
  specialRequests?: string;
  tableId?: string;
  tableNumber?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
  customerLatitude?: number;
  customerLongitude?: number;
  customerDistanceMeters?: number;
  gpsVerifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
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
