/**
 * Paliers de fidélité disponibles.
 */
export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

/**
 * Entité fidélité d'un client.
 */
export interface CustomerLoyalty {
  id: string;
  customerId: string;
  restaurantId: string;
  totalPoints: number;
  availablePoints: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  nextTierPointsNeeded?: number;
  tierProgressPercentage?: number;
}

/**
 * Types de récompenses échangeables.
 */
export type RewardType = 'DISCOUNT_FIXED' | 'DISCOUNT_PERCENT' | 'FREE_PRODUCT' | 'FREE_BEVERAGE' | 'GIFT';

/**
 * Récompense du catalogue fidélité.
 */
export interface LoyaltyReward {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  rewardType: RewardType;
  discountValue?: number;
  productId?: string;
  productName?: string;
  isActive: boolean;
  imageUrl?: string;
}

/**
 * Résultat d'un échange de récompense.
 */
export interface RedemptionResult {
  success: boolean;
  rewardId: string;
  rewardName: string;
  pointsDeducted: number;
  remainingPoints: number;
  promoCode?: string;
}

/**
 * Informations de récompense pour avis Google.
 */
export interface GoogleReviewInfoResponse {
  googleReviewUrl: string;
  rewardPoints: number;
  enabled: boolean;
  instructions?: string;
}

/**
 * Statut d'éligibilité de réclamation d'avis Google pour le client.
 */
export interface GoogleReviewStatusResponse {
  canClaim: boolean;
  hasPendingClaim: boolean;
  alreadyRewarded: boolean;
  lastClaimDate?: string;
}

/**
 * Requête pour réclamer des points suite à un avis Google.
 */
export interface GoogleReviewClaimRequest {
  reviewerName: string;
  rating: number; // 1 à 5
  reviewComment?: string;
  proofImageUrl?: string;
  // Compatibilité alias
  googleReviewerName?: string;
  starRating?: number;
  commentSnippet?: string;
}

/**
 * DTO de réclamation d'avis Google.
 */
export interface GoogleReviewClaimDTO {
  id: string;
  customerId: string;
  restaurantId: string;
  reviewerName: string;
  rating: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  pointsAwarded?: number;
  proofImageUrl?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Réponse d'upload d'une preuve de capture d'écran d'avis Google.
 */
export interface UploadReviewProofResponse {
  url: string;
}
