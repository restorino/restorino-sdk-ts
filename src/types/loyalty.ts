/**
 * Paliers de fidélité disponibles.
 */
export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

/**
 * Entité fidélité d'un client (`/api/customers/loyalty`).
 *
 * Le backend renvoie une `Map` : `customerId`, `restaurantId`,
 * `nextTierPointsNeeded` et `tierProgressPercentage` n'y figurent pas.
 */
export interface CustomerLoyalty {
  id: string;
  customerId?: string;
  restaurantId?: string;
  totalPoints: number;
  availablePoints: number;
  lifetimePoints: number;
  /** Sérialisé en chaîne libre : `BRONZE | SILVER | GOLD | PLATINUM`. */
  tier: LoyaltyTier | string;
  totalVisits?: number;
  totalSpent?: number;
  currency?: string;
  lastVisit?: string;
  tierConfig?: Record<string, unknown>;
  nextTierPointsNeeded?: number;
  tierProgressPercentage?: number;
}

/**
 * Types de récompenses échangeables (`LoyaltyReward.RewardType`).
 */
export type RewardType = 'DISCOUNT' | 'PERCENTAGE' | 'FREE_ITEM' | 'CASHBACK' | 'CUSTOM';

/**
 * Récompense du catalogue fidélité (`LoyaltyReward`).
 * Le coût s'appelle `pointsRequired` (et non `pointsCost`).
 */
export interface LoyaltyReward {
  id: string;
  restaurantId?: string;
  name: string;
  description?: string;
  pointsRequired: number;
  rewardType: RewardType;
  discountAmount?: number;
  discountPercentage?: number;
  freeProductId?: string;
  minOrderAmount?: number;
  requiredTier?: LoyaltyTier | string;
  maxRedemptionsPerCustomer?: number;
  totalAvailable?: number;
  totalRedeemed?: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  imageUrl?: string;
}

/**
 * Résultat d'un échange de récompense (`LoyaltyService.RedemptionResult`).
 *
 * Il n'existe ni `success`, ni `pointsDeducted`, ni `promoCode` : un HTTP 2xx
 * vaut succès, et la remise est portée par `discountAmount` /
 * `discountPercentage` / `freeProductId`.
 */
export interface RedemptionResult {
  rewardId: string;
  rewardName: string;
  rewardType: RewardType | string;
  discountAmount?: number;
  discountPercentage?: number;
  freeProductId?: string;
  remainingPoints: number;
}

/**
 * Informations de récompense pour avis Google (`GoogleReviewConfigDTO`).
 */
export interface GoogleReviewInfoResponse {
  enabled: boolean;
  pointsAmount: number;
  cooldownDays?: number;
  googlePlaceUrl?: string;
  minRating?: number;
  requirePriorVisit?: boolean;
  maxPointsPerClaim?: number;
}

/**
 * Statut d'éligibilité de réclamation d'avis Google (`GoogleReviewCustomerStatusDTO`).
 */
export interface GoogleReviewStatusResponse {
  enabled: boolean;
  pointsAmount: number;
  cooldownDays?: number;
  googlePlaceUrl?: string;
  canClaim: boolean;
  reasonCannotClaim?: string;
  cooldownDaysRemaining?: number;
  activeClaim?: GoogleReviewClaimDTO | null;
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
