import { OrderStatus } from './orders';

/**
 * Article d'une commande telle que renvoyée par l'espace client.
 * Ce DTO nomme le prix unitaire `price` (et non `unitPrice`).
 */
export interface CustomerOrderItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
  specialInstructions?: string;
}

/**
 * Commande de l'historique client (`GET /api/customers/orders`).
 * Le backend renvoie `total`, `subtotal`, `tax`, `deliveryFee` — il n'existe
 * ni `totalAmount` ni `restaurantId` dans ce payload.
 */
export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  status: OrderStatus;
  orderType: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  currency: string;
  createdAt: string;
  updatedAt?: string;
  items: CustomerOrderItem[];
}

/**
 * Requête de mise à jour du profil client.
 *
 * Le backend ne lit que `firstName`, `lastName` et `phone` : `avatar` y était
 * silencieusement ignoré (succès affiché, donnée non persistée).
 */
export interface UpdateCustomerProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Requête pour noter une commande client.
 */
export interface OrderRatingRequest {
  foodQualityRating: number;   // 1 à 5
  deliverySpeedRating: number; // 1 à 5
  serviceRating: number;       // 1 à 5
  reviewText?: string;
}

/**
 * DTO d'évaluation d'une commande (`OrderRatingDTO`).
 * La note globale s'appelle `overallRating`, pas `averageRating`.
 */
export interface OrderRatingDTO {
  id: string;
  orderId: string;
  customerId: string;
  restaurantId: string;
  foodQualityRating: number;
  deliverySpeedRating: number;
  serviceRating: number;
  overallRating: number;
  reviewText?: string;
  restaurantResponse?: string;
  respondedAt?: string;
  isPublic?: boolean;
  isApproved?: boolean;
  helpfulCount?: number;
  createdAt: string;
}

/**
 * Réponse contenant le code et le lien de parrainage.
 */
export interface ReferralCodeResponse {
  referralCode: string;
  shareUrl: string;
}

/**
 * Historique des parrainages d'un client (`ReferralTracking`).
 */
export type ReferralStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface ReferralTrackingItem {
  id: string;
  referralCode: string;
  status: ReferralStatus;
  referrerCustomerId?: string;
  referredCustomerId?: string;
  /** Points crédités au parrain. */
  referrerRewardPoints?: number;
  /** Points crédités au filleul. */
  referredRewardPoints?: number;
  createdAt?: string;
  completedAt?: string;
}

/**
 * Synthèse du tableau de bord de parrainage.
 */
export interface ReferralDashboardResponse {
  referrals: ReferralTrackingItem[];
  totalReferrals?: number;
  completedReferrals?: number;
  pendingReferrals?: number;
  completedCount?: number;
  pendingCount?: number;
}

/**
 * Notification in-app reçue par un client (`NotificationInboxItemResponse`).
 */
export interface CustomerNotification {
  id: string;
  orderId?: string;
  title: string;
  message: string;
  /** Le backend sérialise ce champ `notificationType` (et non `type`). */
  notificationType: string;
  /** Sérialisé `isRead` (et non `read`). */
  isRead: boolean;
  actionButtonText?: string;
  actionButtonUrl?: string;
  sentAt?: string;
  createdAt: string;
}

/**
 * Requête de soumission d'un témoignage (`TestimonialRequest`).
 * Le corps de l'avis s'appelle `content` (10 à 1000 caractères).
 */
export interface CreateTestimonialRequest {
  rating: number;
  content: string;
}

/**
 * Réponse pour un témoignage (`TestimonialResponse`).
 */
export interface TestimonialResponse {
  id: string;
  restaurantId: string;
  customerId?: string;
  customerName: string;
  content: string;
  rating: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approvedAt?: string;
  pointsAwarded?: number;
}

/**
 * Résultat de validation d'un code promotionnel.
 */
export interface PromoValidationResponse {
  valid: boolean;
  discount: number;
  message?: string;
  promoId?: string;
}
