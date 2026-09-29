import { CustomerDto } from './auth';

/**
 * Requête de mise à jour du profil client.
 */
export interface UpdateCustomerProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
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
 * DTO d'évaluation d'une commande.
 */
export interface OrderRatingDTO {
  id: string;
  orderId: string;
  customerId: string;
  foodQualityRating: number;
  deliverySpeedRating: number;
  serviceRating: number;
  averageRating: number;
  reviewText?: string;
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
 * Historique des parrainages d'un client.
 */
export interface ReferralTrackingItem {
  id: string;
  refereeEmail: string;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  rewardPointsEarned: number;
  createdAt: string;
  completedAt?: string;
}

/**
 * Synthèse du tableau de bord de parrainage.
 */
export interface ReferralDashboardResponse {
  referrals: ReferralTrackingItem[];
  completedCount: number;
  pendingCount: number;
}

/**
 * Notification in-app reçue par un client.
 */
export interface CustomerNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

/**
 * Requête de soumission d'un témoignage.
 */
export interface CreateTestimonialRequest {
  rating: number;
  comment: string;
  authorName?: string;
}

/**
 * Réponse pour un témoignage.
 */
export interface TestimonialResponse {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  verifiedPurchase?: boolean;
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
