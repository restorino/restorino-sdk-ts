/**
 * Restorino TypeScript SDK - Standalone Single-File Bundle
 * Idéal pour Lovable.dev, v0, Bolt, Next.js, Vite & React.
 * 
 * Contient l'intégralité des types, modules et le RestorinoClient unifié.
 * 
 * @version 1.0.0
 * @license MIT
 */

// ==========================================
// SOURCE: types/common.ts
// ==========================================

/**
 * Options de configuration du client Restorino.
 */
export interface RestorinoClientConfig {
  /**
   * URL de base de l'API Restorino (ex: 'https://api.restorino.com' ou 'http://localhost:8080').
   */
  baseUrl: string;

  /**
   * Identifiant UUID du restaurant ou slug sous-domaine par défaut.
   */
  restaurantId?: string;

  /**
   * Identifiant UUID du tenant SaaS.
   */
  tenantId?: string;

  /**
   * Périmètre d'appels autorisés.
   *
   * - `'storefront'` (défaut) : uniquement `/api/public/**`,
   *   `/api/auth/customers/**`, `/api/customers/**`,
   *   `/api/notifications/customers/**` et les lectures publiques de la vitrine.
   *   Toute autre route lève `OUT_OF_SCOPE_ENDPOINT` avant l'appel réseau.
   * - `'all'` : échappatoire réservée aux outils internes, jamais à un storefront.
   */
  scope?: 'storefront' | 'all';

  /**
   * Mécanisme de stockage du token JWT client ('localStorage', 'sessionStorage', ou 'memory').
   *
   * Défaut: 'memory'. Un refresh token persisté en `localStorage` est lisible
   * par tout XSS, ce qui annule la protection des cookies HttpOnly du backend.
   * Ne demandez un stockage navigateur que si vous acceptez ce risque.
   */
  storageType?: 'localStorage' | 'sessionStorage' | 'memory';

  /**
   * Clé de stockage personnalisée pour le token JWT.
   * Défaut: 'restorino_customer_token'.
   */
  tokenStorageKey?: string;

  /**
   * Clé de stockage personnalisée pour le refresh token.
   * Défaut: 'restorino_customer_refresh_token'.
   */
  refreshTokenStorageKey?: string;

  /**
   * Tentative automatique de rafraîchissement du token lors d'une erreur 401 si un refresh token existe.
   * Défaut: true.
   */
  autoRefreshToken?: boolean;

  /**
   * Callback déclenché si le renouvellement du refresh token échoue.
   */
  onRefreshTokenFailed?: () => void;

  /**
   * Fonction hook déclenchée lorsqu'une requête échoue avec un code HTTP 401 (Session expirée).
   */
  onTokenExpired?: () => void;

  /**
   * Délai d'attente maximal en millisecondes pour chaque requête HTTP (défaut: 30000ms = 30s).
   * Mettre à 0 pour désactiver le timeout.
   */
  timeoutMs?: number;

  /**
   * Nombre de tentatives de réessai automatique (retry) sur les requêtes idempotentes (GET)
   * ou en cas d'erreur réseau / serveur transitoire (502, 503, 504, 429).
   * Défaut: 0 (désactivé).
   */
  retries?: number;

  /**
   * Délai initial de réessai en millisecondes avec backoff exponentiel.
   * Défaut: 300ms.
   */
  retryDelayMs?: number;

  /**
   * Mode d'envoi des cookies/identifiants pour fetch ('omit', 'same-origin', ou 'include').
   *
   * Défaut: 'include'. Le backend Restorino authentifie les clients par cookies
   * HttpOnly (`customer_token`), pas par en-tête `Authorization` : la valeur
   * 'omit' rend toute la surface client inutilisable.
   */
  credentials?: RequestCredentials;

  /**
   * Envoie le double-submit CSRF (`XSRF-TOKEN` cookie → `X-XSRF-TOKEN` header)
   * sur les requêtes mutantes. Défaut: true.
   */
  csrf?: boolean;

  /**
   * Identifiant d'appareil opaque et stable (`X-Device-Fingerprint`).
   *
   * S'il est omis, le SDK en génère un avec un CSPRNG et le persiste dans
   * `localStorage` **indépendamment de `storageType`** : le backend révoque
   * toute la famille de refresh tokens si l'empreinte change, donc sa stabilité
   * primer sur l'effacement. Sans CSPRNG, aucun en-tête n'est envoyé et le
   * backend retombe sur IP + User-Agent.
   */
  deviceFingerprint?: string;

  /**
   * Clé de stockage de l'identifiant d'appareil.
   * Défaut: 'restorino_device_fingerprint'.
   */
  deviceFingerprintStorageKey?: string;

  /**
   * Headers HTTP additionnels envoyés avec chaque requête.
   */
  defaultHeaders?: Record<string, string>;

  /**
   * Hook d'observation appelé avant chaque requête.
   *
   * Ne reçoit que la méthode et le chemin déclaré : ni en-têtes (jetons), ni
   * query string (qui peut transporter un jeton de suivi) ne sont exposés.
   * Les erreurs du hook sont ignorées et n'affectent jamais la requête.
   */
  onRequest?: (event: RestorinoRequestEvent) => void;

  /**
   * Hook d'observation appelé après chaque réponse HTTP (y compris 4xx/5xx).
   * `requestId` correspond à l'en-tête `x-request-id` du backend.
   */
  onResponse?: (event: RestorinoResponseEvent) => void;
}

/**
 * Événement de requête exposé à `onRequest` (sans donnée sensible).
 */
export interface RestorinoRequestEvent {
  method: string;
  /** Chemin déclaré par le SDK, sans query string. */
  path: string;
}

/**
 * Événement de réponse exposé à `onResponse`.
 */
export interface RestorinoResponseEvent extends RestorinoRequestEvent {
  status: number;
  durationMs: number;
  requestId?: string;
}

/**
 * Structure standard d'une réponse paginée Spring Boot Data.
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/**
 * Erreur API standard renvoyée par le backend Restorino.
 */
export interface ApiError {
  status: number;
  error: string;
  message: string;
  field?: string;
  path?: string;
  timestamp?: string;
}

/**
 * Réponse générique avec message.
 */
export interface MessageResponse {
  message: string;
  success?: boolean;
}

// ==========================================
// SOURCE: types/auth.ts
// ==========================================

/**
 * Requête de connexion client.
 */
export interface CustomerLoginRequest {
  email: string;
  password: string;
  /** Requis par le backend ; à défaut la valeur de `config.restaurantId` est utilisée. */
  restaurantId?: string;
  captchaToken?: string;
}

/**
 * Requête d'inscription d'un nouveau compte client.
 *
 * `firstName`, `lastName` et `phone` sont `@NotBlank` côté backend : les
 * marquer optionnels ne faisait que déplacer l'erreur du compilateur vers un
 * HTTP 400 à l'exécution.
 */
export interface CustomerRegisterRequest {
  email: string;
  /** Minimum 8 caractères (contrainte backend). */
  password: string;
  /** 2 à 100 caractères. */
  firstName: string;
  /** 2 à 100 caractères. */
  lastName: string;
  /** Format `^[+0-9][0-9 .\-()]{5,19}$`. */
  phone: string;
  restaurantId?: string;
  referralCode?: string;
  captchaToken?: string;
}

/**
 * Requête d'authentification client via Google Sign-In.
 */
export interface CustomerGoogleAuthRequest {
  googleToken: string;
  restaurantId?: string;
}

/**
 * Informations de fidélité synthétiques retournées lors de la connexion.
 */
export interface CustomerLoyaltySummary {
  totalPoints: number;
  availablePoints: number;
  /** `BRONZE | SILVER | GOLD | PLATINUM` (sérialisé en chaîne par le backend). */
  tier: string;
  totalVisits?: number;
}

/**
 * DTO du profil client.
 */
export interface CustomerDto {
  id: string;
  restaurantId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  avatar?: string;
  createdAt: string;
}

/**
 * Réponse d'authentification client (Login / Register / Google).
 *
 * En mode cookies (défaut), le backend place les jetons dans des cookies
 * HttpOnly et renvoie `token`/`refreshToken` à `null` — ces champs sont donc
 * optionnels. Ne jamais supposer leur présence pour décider si la session est
 * ouverte : la source de vérité est le cookie, et `getMe()` pour le profil.
 */
export interface CustomerAuthResponse {
  customer: CustomerDto;
  token?: string | null;
  refreshToken?: string | null;
  expiresAt?: string;
  loyalty?: CustomerLoyaltySummary;
}

/**
 * Réponse de rafraîchissement de token.
 *
 * Le backend répond `{ success: true, message }` et renouvelle via le cookie
 * `customer_refresh_token` : aucun token n'est renvoyé dans le corps.
 */
export interface CustomerRefreshTokenResponse {
  success?: boolean;
  message?: string;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * Requête de modification de mot de passe.
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  /** Minimum 8 caractères (contrainte backend). */
  newPassword: string;
  /** Doit être identique à `newPassword` (`@NotBlank` côté backend). */
  confirmPassword: string;
}

/**
 * Requête de demande de réinitialisation de mot de passe.
 */
export interface PasswordResetRequest {
  email: string;
  restaurantId: string;
}

/**
 * Requête de confirmation de réinitialisation de mot de passe.
 *
 * Le champ s'appelle `resetCode` côté backend (et doit contenir 6 chiffres) :
 * l'ancien `code` provoquait un HTTP 400 systématique.
 */
export interface PasswordResetConfirmRequest {
  email: string;
  /** Code OTP à 6 chiffres. */
  resetCode: string;
  /** Minimum 8 caractères (contrainte backend). */
  newPassword: string;
  restaurantId?: string;
}

// ==========================================
// SOURCE: types/customer.ts
// ==========================================

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

// ==========================================
// SOURCE: types/loyalty.ts
// ==========================================

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

// ==========================================
// SOURCE: types/vitrine.ts
// ==========================================

/**
 * Informations publiques de vitrine d'un restaurant (`PublicVitrineResponse`).
 *
 * La clé d'identité est `restaurantId` : il n'existe pas de champ `id`.
 */
export interface PublicVitrineResponse {
  restaurantId: string;
  name: string;
  description?: string;
  /** Chaîne unique (ex. « Italien »), pas un tableau. */
  cuisineType?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  galleryImages?: string[];
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  location?: { latitude: number; longitude: number; address?: string; city?: string; postalCode?: string };
  menu?: PublicCategory[];
  /** `delivery | takeout | dine-in` (valeurs serveur). */
  deliveryMethods?: string[];
  minimumOrderAmount?: number;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  estimatedDeliveryMinutes?: number;
  preparationTimeMinutes?: number;
  isOpen?: boolean;
  acceptingOrders?: boolean;
  openingHours?: Record<string, string>;
  specialHours?: string[];
  averageRating?: number;
  totalReviews?: number;
  priceRange?: number;
  canDeliverToCustomer?: boolean;
  distanceFromCustomer?: number;
  deliveryTimeToCustomer?: number;
  deliveryFeeToCustomer?: number;
  urlSlug?: string;
  metaTitle?: string;
  metaDescription?: string;
}

/**
 * Critères de recherche (`RestaurantSearchRequest`).
 * Les noms sont ceux du backend : `searchTerm` / `cuisineType`. Les anciens
 * `query` / `cuisine` étaient ignorés silencieusement par Jackson.
 */
export interface RestaurantSearchRequest {
  searchTerm?: string;
  cuisineType?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  priceRange?: number;
  minRating?: number;
}

/**
 * Résultat de recherche (`RestaurantSearchResponse`).
 */
export interface RestaurantSearchResponse {
  restaurantId: string;
  name: string;
  description?: string;
  cuisineType?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  rating?: number;
  reviewCount?: number;
  priceRange?: number;
  minimumOrderAmount?: number;
  deliveryFee?: number;
  estimatedDeliveryMinutes?: number;
  deliveryMethods?: string[];
  isOpen?: boolean;
  acceptingOrders?: boolean;
  featured?: boolean;
  specialOffer?: string;
  openingHours?: string;
  phone?: string;
  urlSlug?: string;
  preparationTimeMinutes?: number;
  popularDishes?: string[];
  paymentMethods?: string[];
  canDeliver?: boolean;
  nextAvailableSlot?: string;
}

/**
 * Option ou supplément d'un plat (sauce, taille, extra).
 * Le backend expose `isActive` (entités Supplement/Garnish/Beverage).
 */
export interface ProductOption {
  id: string;
  name: string;
  price: number;
  isActive?: boolean;
}

/**
 * Produit / plat public d'un menu.
 *
 * La forme dépend de l'endpoint : `/api/public/menu/**` renvoie le DTO
 * (`slug`, `allergenInfo`, `images`) tandis que `/api/customers/menu/**`
 * renvoie l'entité (`id`, `categoryId`, `allergens`). Les deux variantes sont
 * donc optionnelles ici plutôt que promises à tort.
 */
export interface PublicProduct {
  id?: string;
  categoryId?: string;
  slug?: string;
  name: string;
  description?: string;
  url?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  images?: string[];
  isAvailable?: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  preparationTimeMinutes?: number;
  /** Chaîne sérialisée par le DTO public. */
  allergenInfo?: string;
  /** Tableau tel que renvoyé par l'entité interne. */
  allergens?: string[];
  supplements?: ProductOption[];
  garnishes?: ProductOption[];
  sizes?: { name: string; price: number }[];
  updatedAt?: string;
}

/**
 * Catégorie publique du menu.
 * `/orders/menu` fournit `categoryId` ; les endpoints SEO fournissent `slug`.
 */
export interface PublicCategory {
  id?: string;
  categoryId?: string;
  slug?: string;
  name: string;
  description?: string;
  displayOrder?: number;
  imageUrl?: string;
  url?: string;
  isActive?: boolean;
  available?: boolean;
  updatedAt?: string;
  products?: PublicProduct[];
}

/**
 * Carte / Menu public complet du restaurant (`/orders/menu`).
 */
export interface PublicMenuResponse {
  restaurantId: string;
  restaurantName: string;
  currency: string;
  categories: PublicCategory[];
  minimumOrderValue?: number;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  paymentMethods?: string[];
  acceptsOrders?: boolean;
}

/**
 * Résultat de vérification d'éligibilité de livraison (`delivery-check`).
 */
export interface DeliveryZoneCheckResponse {
  canDeliver: boolean;
  restaurantId?: string;
  customerLocation?: { latitude: number; longitude: number; address?: string };
  estimatedDeliveryTime?: number;
  deliveryFee: number;
  minimumOrderAmount?: number;
}

/**
 * Statut d'ouverture temps réel d'un restaurant.
 */
export interface RestaurantStatusResponse {
  restaurantId?: string;
  isOpen: boolean;
  acceptingOrders: boolean;
  operatingStatus?: string;
}

/**
 * Enveloppe SEO renvoyée par `/api/public/seo/**`.
 * Les balises sont imbriquées sous `tags` et utilisent les noms OpenGraph
 * (`og:title`, `og:image`, `twitter:card`).
 */
export interface SeoMetaTagsResponse {
  tenantId?: string;
  baseUrl?: string;
  tags: {
    title?: string;
    description?: string;
    canonical?: string;
    'og:title'?: string;
    'og:description'?: string;
    'og:image'?: string;
    'twitter:card'?: string;
    robots?: string;
    'theme-color'?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Avis public d'un restaurant.
 */
export interface PublicReview {
  id: string;
  customerName?: string;
  rating?: number;
  overallRating?: number;
  content?: string;
  reviewText?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/**
 * Réponse de `/api/public/restaurants/{id}/reviews` (objet dédié, pas un `Page`).
 */
export interface RestaurantReviewsResponse {
  restaurantId: string;
  totalReviews: number;
  averageRating: number;
  reviews: PublicReview[];
  totalPages: number;
  currentPage: number;
}

/**
 * Résultat de résolution de domaine personnalisé (GET /api/vitrine/resolve-domain).
 */
export interface DomainResolutionResponse {
  found: boolean;
  tenantId?: string;
  restaurantName?: string;
  subdomainName?: string;
  customDomain?: string;
  isPublished?: boolean;
  domain?: string;
  message?: string;
}

/**
 * Configuration complète de la vitrine (GET /api/vitrine/{tenantId}/config ou /public).
 */
export interface VitrineConfigResponse {
  id?: string;
  tenantId?: string;
  restaurantId?: string;
  restaurantName?: string;
  slogan?: string;
  description?: string;
  cuisineType?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  contactCity?: string;
  contactPostalCode?: string;
  contactLatitude?: number;
  contactLongitude?: number;
  brandingPrimaryColor?: string;
  brandingSecondaryColor?: string;
  brandingLogoUrl?: string;
  brandingCoverImageUrl?: string;
  brandingFaviconUrl?: string;
  templateId?: string;
  subdomainName?: string;
  subdomainCustomDomain?: string;
  settingsIsPublished?: boolean;
  [key: string]: any;
}

// ==========================================
// SOURCE: types/orders.ts
// ==========================================

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

// ==========================================
// SOURCE: types/delivery.ts
// ==========================================

/**
 * Statuts de livraison (`DeliveryStatus` backend).
 * `ACCEPTED`/`OUT_FOR_DELIVERY` n'existent pas côté serveur.
 */
export type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface TrackingProgressStep {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
  timestamp?: string;
}

/**
 * Suivi public de livraison (`PublicTrackingResponse`).
 *
 * ⚠️ Les coordonnées livreur sont aplaties (`driverLatitude` /
 * `driverLongitude`) et ne sont présentes qu'en `PICKED_UP` / `IN_TRANSIT`.
 */
export interface PublicTrackingResponse {
  trackingNumber: string;
  orderNumber: string;
  deliveryStatus: DeliveryStatus;
  statusDisplayName?: string;
  statusDescription?: string;
  orderPlacedTime?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryAddress?: string;
  driverName?: string;
  driverLatitude?: number;
  driverLongitude?: number;
  restaurantName: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantLatitude?: number;
  restaurantLongitude?: number;
  totalAmount?: number;
  currency?: string;
  progressSteps?: TrackingProgressStep[];
}

// ==========================================
// SOURCE: types/tables.ts
// ==========================================

/**
 * Statut d'une table (`RestaurantTable.TableStatus`).
 */
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'BLOCKED' | 'MERGED';

/**
 * Informations publiques d'une table pour le scan QR Code (Dine-in).
 */
export interface PublicTableResponse {
  id: string;
  restaurantId: string;
  /** Entier côté backend (et non chaîne). */
  tableNumber: number;
  name?: string;
  capacity: number;
  status: TableStatus;
  shape?: string;
  floorId?: string;
  isActive: boolean;
  /** Jeton à transmettre lors d'une commande dine-in. */
  tableSessionToken?: string;
}

// ==========================================
// SOURCE: types/live-agent.ts
// ==========================================

/**
 * Configuration pour la session de l'Agent Vocal & Chat Storefront.
 */
export interface LiveAgentSessionConfig {
  /**
   * Slug sous-domaine ou identifiant du restaurant (ex: 'bella-vita').
   */
  restaurantSlug: string;

  /**
   * URL de base WebSocket optionnelle (ex: 'wss://api.restorino.com' ou 'ws://localhost:8080').
   * Si non fourni, déduit automatiquement à partir du baseUrl du client.
   */
  wsUrl?: string;

  /**
   * Jeton de session déjà obtenu (`POST /api/public/live-agent/{slug}/session`).
   * S'il est omis, le SDK le demande automatiquement avant d'ouvrir le socket.
   */
  grant?: string;

  /**
   * Callback déclenché lors de la réception d'un événement textuel ou transcript.
   * Le backend émet parfois `agent` : le SDK normalise en `assistant`.
   */
  onTranscript?: (role: 'user' | 'assistant', text: string) => void;

  /**
   * Callback déclenché à la réception du cadre `AUDIO_META`
   * (fréquence d'échantillonnage réelle du flux, 24 kHz par défaut).
   */
  onAudioMeta?: (meta: LiveAgentAudioMeta) => void;

  /**
   * Callback déclenché lors de la réception d'un chunk audio brut.
   * La fréquence réelle est fournie par `onAudioMeta` : ne pas la supposer.
   */
  onAudio?: (audioChunk: Uint8Array) => void;

  /**
   * Callback déclenché lorsque l'agent vocal propose une action storefront
   * (ajout au panier, réservation). L'action reste **en attente** jusqu'à
   * `session.confirmAction(actionId)`.
   */
  onClientAction?: (action: LiveAgentClientAction) => void;

  /**
   * Callback déclenché lors du changement d'état de l'agent.
   */
  onStatusChange?: (status: LiveAgentStatus) => void;

  /**
   * Callback déclenché si la parole de l'agent est interrompue par l'utilisateur.
   */
  onInterrupted?: () => void;

  /**
   * Callback déclenché lorsque le serveur termine la session (code 4001).
   * Le SDK ne doit pas se reconnecter automatiquement.
   */
  onSessionEnded?: (reason?: string) => void;

  /**
   * Callback d'erreur.
   */
  onError?: (error: Error) => void;

  /**
   * Callback de déconnexion.
   */
  onClose?: () => void;
}

/**
 * Métadonnées du flux audio descendant.
 */
export interface LiveAgentAudioMeta {
  encoding?: string;
  sampleRate: number;
  channels?: number;
}

/**
 * Statuts possibles de l'agent vocal en temps réel.
 */
export type LiveAgentStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'UPSTREAM_DISCONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

/**
 * Action déclenchée par l'agent vocal sur le panier ou l'interface du client.
 */
export interface LiveAgentClientAction {
  action: 'ADD_TO_CART' | 'NAVIGATE' | 'SELECT_ITEM' | string;
  payload: Record<string, any>;
  /** Identifiant à renvoyer via `confirmAction()` pour appliquer l'action. */
  actionId?: string;
}

/**
 * Noms d'événements supportés par la session de l'agent vocal en temps réel.
 */
export type LiveAgentEvent =
  | 'transcript'
  | 'audio'
  | 'audioMeta'
  | 'action'
  | 'status'
  | 'interrupted'
  | 'sessionEnded'
  | 'error'
  | 'close';

/**
 * Signature des écouteurs selon le type d'événement.
 */
export type LiveAgentEventListener<E extends LiveAgentEvent> =
  E extends 'transcript' ? (role: 'user' | 'assistant', text: string) => void :
  E extends 'audio' ? (audioChunk: Uint8Array) => void :
  E extends 'audioMeta' ? (meta: LiveAgentAudioMeta) => void :
  E extends 'action' ? (action: LiveAgentClientAction) => void :
  E extends 'status' ? (status: LiveAgentStatus) => void :
  E extends 'interrupted' ? () => void :
  E extends 'sessionEnded' ? (reason?: string) => void :
  E extends 'error' ? (error: Error) => void :
  E extends 'close' ? () => void :
  never;

// ==========================================
// SOURCE: security/scope.ts
// ==========================================

/**
 * Storefront scope guard.
 *
 * This SDK is published for **public storefronts and the customer account
 * area only**. It must never reach backoffice, POS, staff, driver, support or
 * administrative endpoints — not even through the generic
 * `client.http.request()` escape hatch.
 *
 * The allowlist is intentionally written as prefixes, so adding a new public
 * storefront endpoint requires no SDK change, while any new privileged
 * `/api/...` surface is denied by default (fail closed).
 */

/** Prefixes owned by the storefront / customer space. */
const ALLOWED_PREFIXES: readonly string[] = [
  '/api/public/',
  '/api/auth/customers/',
  '/api/customers/',
  '/api/notifications/customers/'
];

/** Exact paths that do not fit a prefix above. */
const ALLOWED_EXACT: ReadonlySet<string> = new Set([
  '/api/auth/refresh',
  '/api/vitrine/resolve-domain'
]);

/** Public vitrine reads: `/api/vitrine/{tenant}/public` and `/schema.json`. */
const ALLOWED_VITRINE_READ = /^\/api\/vitrine\/[^/]+\/(public|schema\.json)$/;

/** Profondeur maximale de décodage avant refus (fail closed). */
const MAX_DECODE_DEPTH = 8;

/**
 * Collapses `.` / `..` segments, duplicate slashes, backslashes and any
 * query/fragment. Used before matching so `/api/public/../admin/x`
 * cannot slip past a prefix test.
 */
export function normalizeEndpointPath(endpoint: string): string {
  const withoutQuery = String(endpoint ?? '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\\/g, '/')
    .replace(/[\r\n\x00-\x1F\x7F\u2028\u2029]/g, '');

  const segments: string[] = [];
  for (const segment of withoutQuery.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return `/${segments.join('/')}`;
}

/**
 * True when `endpoint` belongs to the storefront / customer surface.
 */
export function isStorefrontEndpoint(endpoint: string): boolean {
  const rawPath = String(endpoint ?? '')
    .split('?')[0]
    .split('#')[0];

  // `;` ouvre les paramètres de matrice (`/api/public/..;/admin`) que certains
  // conteneurs normalisent en traversée. Aucun endpoint du SDK n'en utilise.
  if (rawPath.includes(';')) return false;

  // Décodage récursif borné contre l'encodage imbriqué (%2e, %252e, %25252e…).
  // Rejette tout séparateur (%2F, %5C), point (%2E) ou null byte (%00) à
  // n'importe quel niveau. L'ancienne boucle plafonnée à 3 tours laissait
  // passer 5 niveaux d'encodage : la borne est désormais explicite et tout
  // reste d'encodage au-delà est refusé (fail closed).
  let current = rawPath;
  for (let depth = 0; ; depth++) {
    if (/%2f|%5c|%00|%2e/i.test(current)) return false;

    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return false; // Séquence pourcent malformée rejetée fail-closed
    }

    if (decoded === current) break;
    if (depth >= MAX_DECODE_DEPTH) return false;
    current = decoded;
  }

  // `;` (paramètres de matrice) : `..;` n'est pas un segment `..` pour ce garde,
  // mais certains proxys le normalisent en `..`. Refus fail-closed.
  if (current.includes(';')) return false;

  const path = normalizeEndpointPath(endpoint);

  if (ALLOWED_EXACT.has(path)) return true;
  if (ALLOWED_VITRINE_READ.test(path)) return true;

  return ALLOWED_PREFIXES.some(
    (prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix)
  );
}

// ==========================================
// SOURCE: http/http-client.ts
// ==========================================

/**
 * Marque partagée par les builds CJS et ESM (registre global des symboles).
 * Elle évite qu'un simple objet `{ name: 'RestorinoApiError' }` soit pris pour
 * une vraie erreur du SDK.
 */
const RESTORINO_ERROR_BRAND: unique symbol = Symbol.for('restorino.sdk.apiError');

/**
 * Classe d'erreur spécialisée pour les retours API Restorino.
 */
export class RestorinoApiError extends Error {
  public status: number;
  public error: string;
  public field?: string;
  public raw: unknown;
  /** En-tête `x-request-id` de la réponse (utile au support). */
  public requestId?: string;
  /** Délai demandé par `Retry-After`, en millisecondes. */
  public retryAfterMs?: number;
  /** @internal Marque d'identité inter-builds. */
  public readonly [RESTORINO_ERROR_BRAND] = true;

  /**
   * Rend `instanceof` fiable entre les builds CJS (`dist/`) et ESM (`dist/esm/`).
   *
   * Le paquet expose deux entrées ; sans ce garde, une erreur levée par l'une
   * n'est pas reconnue par l'autre et le `switch` de gestion d'erreur
   * recommandé tombe silencieusement dans `default`.
   */
  static [Symbol.hasInstance](value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<symbol, unknown>)[RESTORINO_ERROR_BRAND] === true
    );
  }

  constructor(status: number, message: string, error = 'ApiError', field?: string, raw?: unknown) {
    super(message);
    this.name = 'RestorinoApiError';
    this.status = status;
    this.error = error;
    this.field = field;
    this.raw = raw;
  }
}

/**
 * Options configurables par requête HTTP.
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  body?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  isFormData?: boolean;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  skipAuthRefresh?: boolean;
  signal?: AbortSignal;
  /** En-tête `Idempotency-Key` (création de commande, réservation, paiement). */
  idempotencyKey?: string;
}

/**
 * Client HTTP optimisé sans dépendance (Fetch natif du navigateur / Node.js).
 */
export class HttpClient {
  private config: RestorinoClientConfig;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenStorageKey: string;
  private refreshTokenStorageKey: string;
  private deviceFingerprintStorageKey: string;
  private ephemeralFingerprint: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  /** Incrémenté à chaque fermeture de session (voir `clearTokens`). */
  private sessionGeneration = 0;
  /** Compteur local, garantit l'unicité des clés d'idempotence sans CSPRNG. */
  private idempotencyCounter = 0;

  /** Taille maximale lue sur un corps de réponse d'erreur (8 Kio). */
  private static readonly MAX_ERROR_BODY_BYTES = 8192;

  /**
   * Valide `baseUrl` : seuls les absolus http(s) et les chemins racine
   * relatifs sont acceptés. Bloque `javascript:`, `data:`, `file:`, les URL
   * protocol-relative (`//evil.com`) et les identifiants embarqués
   * (`https://user:pass@host`).
   */
  private static normalizeBaseUrl(raw?: string): string {
    const value = typeof raw === 'string' ? raw.trim() : '';

    // Chaîne vide = même origine (le storefront sert de proxy/BFF).
    if (value === '') return '';

    if (value.startsWith('//')) {
      throw new Error('baseUrl protocol-relative interdit : précisez https://… ou un chemin relatif.');
    }

    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
      if (!/^https?:\/\//i.test(value)) {
        throw new Error('baseUrl doit utiliser le protocole http(s).');
      }
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        throw new Error('baseUrl invalide.');
      }
      if (parsed.username || parsed.password) {
        throw new Error('baseUrl ne doit pas embarquer d’identifiants.');
      }
      if (parsed.search || parsed.hash) {
        throw new Error('baseUrl ne doit pas comporter de paramètres de requête (?) ou d’ancre (#).');
      }
      // Le SDK transporte des cookies HttpOnly et des jetons Bearer : un
      // transport en clair vers un hôte public les exposerait à tout le
      // réseau. Loopback et plages privées restent autorisés (dev, POS LAN).
      if (parsed.protocol === 'http:' && !HttpClient.isLocalHostname(parsed.hostname)) {
        throw new Error(
          'baseUrl en clair (http) interdit hors réseau local : utilisez https://.'
        );
      }
      return value.replace(/\/+$/, '');
    }

    if (!value.startsWith('/')) {
      throw new Error('baseUrl doit être absolu (https://…) ou commencer par /.');
    }

    return value.replace(/\/+$/, '');
  }

  constructor(config: RestorinoClientConfig) {
    this.config = {
      ...config,
      baseUrl: HttpClient.normalizeBaseUrl(config && config.baseUrl),
      // Défaut explicite : le contrat storefront ne peut pas être désactivé par omission.
      scope: config?.scope === 'all' ? 'all' : 'storefront'
    };
    this.tokenStorageKey = config.tokenStorageKey || 'restorino_customer_token';
    this.refreshTokenStorageKey = config.refreshTokenStorageKey || 'restorino_customer_refresh_token';
    this.deviceFingerprintStorageKey = config.deviceFingerprintStorageKey || 'restorino_device_fingerprint';
    this.token = this.loadToken();
    this.refreshToken = this.loadRefreshToken();
  }

  /**
   * Récupère le token JWT en mémoire ou dans le stockage.
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Récupère le refresh token en mémoire ou dans le stockage.
   */
  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Enregistre un nouveau token JWT client.
   */
  public setToken(token: string | null): void {
    this.token = token;
    this.persistValue(this.tokenStorageKey, token);
  }

  /**
   * Enregistre un nouveau refresh token client.
   */
  public setRefreshToken(refreshToken: string | null): void {
    this.refreshToken = refreshToken;
    this.persistValue(this.refreshTokenStorageKey, refreshToken);
  }

  /**
   * Enregistre simultanément le token d'accès et le refresh token.
   */
  public setAuthTokens(token: string | null, refreshToken?: string | null): void {
    this.setToken(token);
    if (refreshToken !== undefined) {
      this.setRefreshToken(refreshToken);
    }
  }

  /**
   * Supprime le token de session.
   */
  public clearToken(): void {
    this.setToken(null);
  }

  /**
   * Supprime l'ensemble des tokens (accès et rafraîchissement).
   *
   * Incrémente la génération de session : un rafraîchissement en vol ne peut
   * plus réinstaller des jetons après une déconnexion.
   */
  public clearTokens(): void {
    this.sessionGeneration++;
    this.setToken(null);
    this.setRefreshToken(null);
  }

  /**
   * Met à jour dynamiquement la configuration du client (ex: changement de restaurantId).
   */
  public updateConfig(newConfig: Partial<RestorinoClientConfig>): void {
    if (!newConfig || typeof newConfig !== 'object') return;
    const safeConfig: Partial<RestorinoClientConfig> = {};
    for (const [key, value] of Object.entries(newConfig)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      (safeConfig as any)[key] = value;
    }

    if (typeof safeConfig.baseUrl === 'string') {
      safeConfig.baseUrl = HttpClient.normalizeBaseUrl(safeConfig.baseUrl);
    }

    // Le périmètre ne peut pas être élargi après construction : sinon du code
    // applicatif (ou une XSS) pourrait passer en 'all' puis appeler des routes
    // privilégiées. Il se fixe à la création du client, pas à l'exécution.
    delete (safeConfig as Record<string, unknown>).scope;

    const previousTenant = this.config.tenantId;
    const previousRestaurant = this.config.restaurantId;
    this.config = { ...this.config, ...safeConfig };

    // Changer de contexte tenant/restaurant sans invalider la session laisse
    // en place un JWT appartenant à l'ancien tenant (fuite inter-tenant côté UI,
    // requêtes rejetées par le backend).
    if (
      (safeConfig.tenantId !== undefined && safeConfig.tenantId !== previousTenant) ||
      (safeConfig.restaurantId !== undefined && safeConfig.restaurantId !== previousRestaurant)
    ) {
      this.clearTokens();
    }
  }

  /**
   * Retourne la configuration active.
   */
  public getConfig(): RestorinoClientConfig {
    return {
      ...this.config,
      defaultHeaders: this.config.defaultHeaders ? { ...this.config.defaultHeaders } : undefined
    };
  }

  /**
   * Génère une clé d'idempotence pour l'en-tête `Idempotency-Key`.
   *
   * Elle reste stable pendant les réessais internes d'un même appel, ce qui
   * permet au backend (`@Idempotent`) de renvoyer la réponse d'origine au lieu
   * de réexécuter une mutation porteuse de valeur (rachat de points, avis).
   */
  public createIdempotencyKey(): string {
    const cryptoObj = (globalThis as any)?.crypto;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    if (cryptoObj?.getRandomValues) {
      const bytes = new Uint8Array(16);
      cryptoObj.getRandomValues(bytes);
      return Array.from(bytes, (b: number) => b.toString(16).padStart(2, '0')).join('');
    }
    // Sans CSPRNG : le compteur d'instance évite qu'un même client réutilise
    // une clé, ce qui suffit à ne pas recevoir la réponse mise en cache d'un
    // autre appel du même tenant.
    return `idem-${Date.now().toString(36)}-${(this.idempotencyCounter++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Mode de stockage effectif.
   *
   * Défaut = mémoire : un refresh token en `localStorage` est lisible par tout
   * XSS. Le backend a délibérément déplacé les jetons en cookies HttpOnly ;
   * persister un jeton en JS annulerait cette protection. Le stockage navigateur
   * doit donc être demandé explicitement.
   */
  private storageMode(): 'local' | 'session' | 'memory' {
    if (this.config.storageType === 'localStorage') return 'local';
    if (this.config.storageType === 'sessionStorage') return 'session';
    return 'memory';
  }

  private persistValue(key: string, value: string | null): void {
    if (typeof window === 'undefined') return;
    const mode = this.storageMode();
    if (mode === 'memory') return;

    try {
      const store = mode === 'session' ? sessionStorage : localStorage;
      if (value) store.setItem(key, value);
      else store.removeItem(key);
    } catch {
      // Ignorer si stockage inaccessible
    }
  }

  private loadStoredValue(key: string): string | null {
    if (typeof window === 'undefined') return null;
    const mode = this.storageMode();
    if (mode === 'memory') return null;

    try {
      const store = mode === 'session' ? sessionStorage : localStorage;
      const raw = store.getItem(key);
      if (raw && typeof raw === 'string') {
        const trimmed = raw.trim();
        // Prévention contre les tokens empoisonnés contenant CRLF, caractères de contrôle ou séparateurs Unicode
        if (
          trimmed !== '' &&
          trimmed !== 'null' &&
          trimmed !== 'undefined' &&
          !/[\r\n\x00-\x1F\x7F\u2028\u2029]/.test(trimmed)
        ) {
          return trimmed;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private loadToken(): string | null {
    return this.loadStoredValue(this.tokenStorageKey);
  }

  private loadRefreshToken(): string | null {
    return this.loadStoredValue(this.refreshTokenStorageKey);
  }

  /**
   * Tente de rafraîchir le token JWT via l'endpoint de refresh du backend.
   * Utilise une promesse partagée pour mutualiser les requêtes concurrentes.
   */
  public async tryRefreshToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const currentRefreshToken = this.refreshToken;
    const cookieMode = this.credentialsMode() !== 'omit';

    if (!currentRefreshToken && !cookieMode) {
      return false;
    }

    this.refreshPromise = (async () => {
      const generation = this.sessionGeneration;
      try {
        // Le backend lit le refresh token **uniquement** dans le cookie
        // HttpOnly : `AuthSessionController#refreshToken` n'a pas de
        // `@RequestBody` et rien ne consomme `x-refresh-token`. L'envoyer
        // aussi dans le corps et un en-tête exposait le secret aux journaux
        // de corps, aux proxies et au tracing, sans aucun gain fonctionnel.
        const refreshResponse = await this.executeSingleRequest<{
          token?: string;
          refreshToken?: string;
          success?: boolean;
        }>('/api/auth/refresh', {
          method: 'POST',
          headers: { 'X-Auth-Scope': 'customer' },
          skipAuthRefresh: true,
          retries: 0
        });

        // Déconnexion pendant le rafraîchissement : ne pas ressusciter les jetons.
        if (generation !== this.sessionGeneration) {
          return false;
        }

        // Un 200 explicite `{success:false}` n'est pas un renouvellement :
        // le prendre pour tel rejouerait la requête avec les mêmes jetons et
        // masquerait la vraie cause derrière un 401 secondaire.
        if (refreshResponse && refreshResponse.success === false) {
          return false;
        }

        if (refreshResponse && refreshResponse.token) {
          this.setToken(refreshResponse.token);
          if (refreshResponse.refreshToken) {
            this.setRefreshToken(refreshResponse.refreshToken);
          }
        }

        // Le backend rafraîchit à partir des cookies HttpOnly et répond
        // `{success:true}` sans renvoyer de token : un 2xx = session renouvelée.
        return true;
      } catch {
        if (this.config.onRefreshTokenFailed) {
          this.config.onRefreshTokenFailed();
        }
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Nettoie les valeurs d'en-tête contre l'injection CRLF, injection de sauts de ligne Unicode et caractères de contrôle.
   */
  private sanitizeHeaderValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    return String(val).replace(/[\r\n\x00-\x1F\x7F\u2028\u2029]/g, '').trim();
  }

  /**
   * Effectue un appel HTTP avec gestion de retry exponentiel et annulation.
   */
  public async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const method = options.method || 'GET';
    const isIdempotent = method === 'GET' || method === 'HEAD';
    const maxRetries = options.retries !== undefined
      ? options.retries
      : (isIdempotent ? (this.config.retries ?? 0) : 0);
    const baseRetryDelay = options.retryDelayMs !== undefined
      ? options.retryDelayMs
      : (this.config.retryDelayMs ?? 300);

    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (options.signal?.aborted) {
        throw new RestorinoApiError(0, 'Requête annulée.', 'REQUEST_ABORTED');
      }

      if (attempt > 0) {
        // Backoff exponentiel avec jitter, borné par `Retry-After` quand le
        // serveur en fournit un (429 / 503).
        const backoff = baseRetryDelay * Math.pow(2, attempt - 1) + Math.random() * 50;
        const retryAfterMs = lastError instanceof RestorinoApiError ? lastError.retryAfterMs : undefined;
        const delay = Math.min(
          retryAfterMs !== undefined ? Math.max(backoff, retryAfterMs) : backoff,
          retryAfterMs !== undefined ? 60000 : 10000
        );
        await new Promise<void>((resolve, reject) => {
          const signal = options.signal;
          if (signal?.aborted) {
            reject(new RestorinoApiError(0, 'Requête annulée pendant le réessai.', 'REQUEST_ABORTED'));
            return;
          }

          let settled = false;
          const onAbort = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(new RestorinoApiError(0, 'Requête annulée pendant le réessai.', 'REQUEST_ABORTED'));
          };
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            signal?.removeEventListener('abort', onAbort);
            resolve();
          }, delay);

          signal?.addEventListener('abort', onAbort, { once: true });
        });
      }

      try {
        return await this.executeSingleRequest<T>(endpoint, options);
      } catch (err: any) {
        lastError = err;

        if (options.signal?.aborted || err?.error === 'REQUEST_ABORTED') {
          throw err;
        }

        // Déterminer si l'erreur est transitoire (éligible au retry)
        const isTransient =
          err instanceof RestorinoApiError &&
          (err.status === 0 || err.status === 408 || err.status === 429 || err.status === 502 || err.status === 503 || err.status === 504);

        // 409 Conflict = verrou optimiste / course. On ne le rejoue que lorsque
        // le rejeu est sûr : requête idempotente ou `Idempotency-Key` fournie.
        // Rejouer un POST sans clé peut dupliquer une écriture partiellement appliquée.
        const isConflict = err instanceof RestorinoApiError && err.status === 409;
        const conflictReplaySafe = isIdempotent || Boolean(options.idempotencyKey);
        const canRetryConflict = isConflict && conflictReplaySafe && attempt < 2;

        if ((!isTransient && !canRetryConflict) || (!canRetryConflict && attempt >= maxRetries)) {
          throw err;
        }
      }
    }

    throw lastError;
  }

  /**
   * Effectue une exécution unitaire de requête HTTP.
   */
  private async executeSingleRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      params,
      headers: customHeaders = {},
      requiresAuth = false,
      isFormData = false,
      timeoutMs,
      skipAuthRefresh = false,
      signal: callerSignal
    } = options;

    // Périmètre : le SDK storefront ne peut appeler que la surface publique et
    // l'espace client. Tout le reste est refusé AVANT quel appel réseau, y
    // compris via l'échappatoire `http.request()`.
    if (this.config.scope !== 'all' && !isStorefrontEndpoint(endpoint)) {
      throw new RestorinoApiError(
        403,
        `Endpoint hors périmètre storefront : ${endpoint}`,
        'OUT_OF_SCOPE_ENDPOINT'
      );
    }

    const controller = new AbortController();
    const effectiveTimeout = timeoutMs !== undefined ? timeoutMs : (this.config.timeoutMs ?? 30000);
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (effectiveTimeout > 0) {
      timer = setTimeout(() => {
        controller.abort(new Error(`Délai d'attente dépassé (${effectiveTimeout}ms).`));
      }, effectiveTimeout);
    }

    let onCallerAbort: (() => void) | null = null;
    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort(callerSignal.reason);
      } else {
        onCallerAbort = () => controller.abort(callerSignal.reason);
        callerSignal.addEventListener('abort', onCallerAbort, { once: true });
      }
    }

    const url = this.buildUrl(endpoint, params);
    const isIdempotentMethod = method === 'GET' || method === 'HEAD';

    const headers: Record<string, string> = { Accept: 'application/json' };
    this.mergeHeaders(headers, this.config.defaultHeaders);
    this.mergeHeaders(headers, customHeaders);

    if (!isFormData && body && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    this.applyTenantHeaders(headers);

    const deviceFingerprint = this.getDeviceFingerprint();
    if (deviceFingerprint) {
      headers['X-Device-Fingerprint'] = deviceFingerprint;
    }

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = this.sanitizeHeaderValue(options.idempotencyKey);
    }

    // Double-submit CSRF : le backend publie le jeton dans le cookie lisible
    // `XSRF-TOKEN` et exige `X-XSRF-TOKEN` sur toute mutation non exemptée.
    if (!isIdempotentMethod && this.config.csrf !== false) {
      const csrfToken = this.readCookie('XSRF-TOKEN');
      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = this.sanitizeHeaderValue(csrfToken);
      }
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.sanitizeHeaderValue(this.token)}`;
    } else if (requiresAuth && this.credentialsMode() === 'omit') {
      // Sans token et sans cookies, aucun moyen de s'authentifier : on échoue
      // localement plutôt que d'émettre un appel voué au 401.
      if (timer) clearTimeout(timer);
      throw new RestorinoApiError(401, 'Authentification requise pour cette action.', 'UNAUTHORIZED');
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      credentials: this.credentialsMode(),
      signal: controller.signal
    };

    let response: Response;
    const startedAt = Date.now();
    // `onRequest`/`onResponse` documentent l'absence de query string : un
    // appel via l'échappatoire `http.request('/x?token=…')` la fuitait dans
    // les logs de l'application.
    const hookPath = endpoint.split('?')[0].split('#')[0];
    this.emitHook(() => this.config.onRequest?.({ method, path: hookPath }));

    try {
      response = await fetch(url, fetchOptions);
    } catch (networkError: any) {
      if (networkError?.name === 'AbortError' || controller.signal.aborted) {
        throw new RestorinoApiError(408, networkError?.message || 'La requête a expiré (timeout).', 'REQUEST_TIMEOUT');
      }
      throw new RestorinoApiError(0, networkError?.message || 'Impossible de contacter le serveur.', 'NETWORK_ERROR');
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
      // Sans ce retrait, un AbortSignal longue durée (partagé entre requêtes)
      // accumule un listener par appel : fuite mémoire et avertissements
      // MaxListeners sous Node.
      if (callerSignal && onCallerAbort) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
    }

    const requestId = response.headers.get('x-request-id') || undefined;
    this.emitHook(() => this.config.onResponse?.({
      method,
      path: hookPath,
      status: response.status,
      durationMs: Date.now() - startedAt,
      requestId
    }));

    // Un 401 sur un endpoint public (login, reset…) ne doit jamais détruire
    // la session en cours : on ne réagit que sur les appels authentifiés.
    if (response.status === 401 && requiresAuth) {
      const autoRefreshEnabled = this.config.autoRefreshToken !== false;
      const canRefresh = this.refreshToken !== null || this.credentialsMode() !== 'omit';

      if (autoRefreshEnabled && !skipAuthRefresh && canRefresh) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Rejouer une seule fois la requête protégée
          return this.executeSingleRequest<T>(endpoint, {
            ...options,
            skipAuthRefresh: true
          });
        }
      }

      this.clearTokens();
      if (this.config.onTokenExpired) {
        this.config.onTokenExpired();
      }
    }

    if (!response.ok) {
      await this.handleErrorResponse(response, requestId);
    }

    // Gestion des réponses vides (ex: 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('json')) {
      // Couvre `application/json`, `application/ld+json`, `application/problem+json`.
      return (await response.json()) as T;
    }

    const text = await response.text();

    // 200 sans corps : rien à désérialiser.
    if (text.trim() === '') {
      return {} as T;
    }

    // Tous les endpoints de ce SDK répondent en JSON. Un 2xx non-JSON vient
    // d'un proxy mal configuré ou d'une page de capture : le typer en `T`
    // produisait des `undefined` impossibles à tracer (et masquait un éventuel
    // détournement de trafic).
    throw new RestorinoApiError(
      response.status,
      `Réponse non-JSON inattendue (${contentType || 'content-type absent'}) : vérifiez la baseUrl et le proxy.`,
      'INVALID_RESPONSE',
      undefined,
      text.slice(0, 2048)
    );
  }

  /**
   * Hôtes pour lesquels un transport en clair reste acceptable : loopback,
   * mDNS et plages privées RFC 1918 (poste de dev, terminal POS sur le LAN).
   */
  private static isLocalHostname(hostname: string): boolean {
    const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
    return (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host === '::1' ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  }

  private credentialsMode(): RequestCredentials {
    return this.config.credentials || 'include';
  }

  private mergeHeaders(target: Record<string, string>, source?: Record<string, string>): void {
    if (!source) return;
    for (const [key, value] of Object.entries(source)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (value === undefined || value === null) continue;
      const cleanKey = this.sanitizeHeaderValue(key);
      if (!cleanKey) continue;
      target[cleanKey] = this.sanitizeHeaderValue(value);
    }
  }

  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * Le backend refuse (403 TENANT_HEADER_CONFLICT) un `x-restaurant-id` qui
   * n'est pas un UUID ou qui contredit le JWT. Les slugs partent donc dans
   * `x-tenant-slug`, les UUID dans leur en-tête dédié.
   */
  private applyTenantHeaders(headers: Record<string, string>): void {
    const tenant = this.sanitizeHeaderValue(this.config.tenantId);
    const restaurant = this.sanitizeHeaderValue(this.config.restaurantId);

    if (tenant) {
      if (HttpClient.UUID_PATTERN.test(tenant)) headers['x-tenant-id'] = tenant;
      else headers['x-tenant-slug'] = tenant;
    }

    if (restaurant) {
      if (HttpClient.UUID_PATTERN.test(restaurant)) headers['x-restaurant-id'] = restaurant;
      else if (!headers['x-tenant-slug']) headers['x-tenant-slug'] = restaurant;
    }
  }

  private readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    try {
      const prefix = `${name}=`;
      for (const part of document.cookie.split(';')) {
        const trimmed = part.trim();
        if (trimmed.startsWith(prefix)) {
          return decodeURIComponent(trimmed.slice(prefix.length));
        }
      }
    } catch {
      // Cookie inaccessible (sandbox, iframe) : on continue sans CSRF header.
    }
    return null;
  }

  /**
   * Identifiant d'appareil stable, requis pour que le refresh token reste
   * lié à ce navigateur (le backend révoque toute la famille de tokens en cas
   * de mismatch, y compris quand il retombe sur IP + User-Agent).
   */
  private getDeviceFingerprint(): string | null {
    const configured = this.sanitizeHeaderValue(this.config.deviceFingerprint);
    if (configured) return configured;

    if (this.ephemeralFingerprint) return this.ephemeralFingerprint;
    if (typeof window === 'undefined') return null;

    let stored = this.loadStoredValue(this.deviceFingerprintStorageKey);
    if (!stored) {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(this.deviceFingerprintStorageKey);
          if (
            raw &&
            typeof raw === 'string' &&
            raw.trim() !== '' &&
            raw.trim() !== 'null' &&
            raw.trim() !== 'undefined' &&
            !/[\r\n\x00-\x1F\x7F\u2028\u2029]/.test(raw)
          ) {
            stored = raw.trim();
          }
        }
      } catch {
        // localStorage inaccessible
      }
    }

    if (stored) {
      this.ephemeralFingerprint = stored;
      return stored;
    }

    const generated = this.generateDeviceFingerprint();
    if (!generated) {
      // Aucun CSPRNG disponible : ne rien envoyer. Le backend retombe alors
      // sur un fingerprint IP + User-Agent (stable dans une session), au lieu
      // d'un identifiant `Math.random` qui change à chaque chargement et fait
      // révoquer toute la famille de refresh tokens (déconnexion globale).
      return null;
    }

    this.persistValue(this.deviceFingerprintStorageKey, generated);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.deviceFingerprintStorageKey, generated);
      }
    } catch {
      // Ignorer si localStorage inaccessible
    }

    this.ephemeralFingerprint = generated;
    return generated;
  }

  /**
   * Génère l'empreinte d'appareil. Retourne `null` quand aucun générateur
   * cryptographique n'existe : une valeur devinable ou volatile est pire
   * qu'aucune valeur, car le backend révoque la famille sur mismatch.
   */
  private generateDeviceFingerprint(): string | null {
    const cryptoObj = (globalThis as any)?.crypto;
    if (cryptoObj?.randomUUID) {
      return cryptoObj.randomUUID();
    }
    if (cryptoObj?.getRandomValues) {
      const bytes = new Uint8Array(16);
      cryptoObj.getRandomValues(bytes);
      return Array.from(bytes, (b: number) => b.toString(16).padStart(2, '0')).join('');
    }
    return null;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    let cleanEndpoint = (typeof endpoint === 'string' ? endpoint : '').trim();

    // Nettoyer les backslashes (\) et caractères de contrôle pour prévenir les contournements de protocole (SSRF / Open Redirect)
    cleanEndpoint = cleanEndpoint.replace(/\\/g, '/');
    cleanEndpoint = cleanEndpoint.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029]/g, '');

    // Supprimer le schéma & l'autorité si un endpoint absolu est accidentellement injecté
    cleanEndpoint = cleanEndpoint.replace(/^https?:\/\/[^\/]+/i, '');

    if (!cleanEndpoint.startsWith('/')) {
      cleanEndpoint = '/' + cleanEndpoint;
    }
    // Empêcher les URL protocol-relative (ex: "//evil.com")
    cleanEndpoint = cleanEndpoint.replace(/^\/+/, '/');

    // Éviter /api/api/... quand la baseUrl porte déjà le préfixe du proxy Next.js.
    if (/\/api$/i.test(base) && /^\/api\//i.test(cleanEndpoint)) {
      cleanEndpoint = cleanEndpoint.replace(/^\/api/i, '');
    }

    let fullUrl = `${base}${cleanEndpoint}`;

    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        // Protection contre la pollution de prototype
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
      }
    }

    return fullUrl;
  }

  private emitHook(run: () => void): void {
    try {
      run();
    } catch {
      // Un hook d'observation ne doit jamais casser une requête.
    }
  }

  private parseRetryAfter(response: Response): number | undefined {
    const raw = response.headers.get('retry-after');
    if (!raw) return undefined;

    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 60000);
    }

    const date = Date.parse(raw);
    if (Number.isFinite(date)) {
      return Math.min(Math.max(date - Date.now(), 0), 60000);
    }

    return undefined;
  }

  /**
   * Lit un corps de réponse en s'arrêtant au plafond, sans matérialiser la
   * totalité du flux. Une réponse d'erreur volumineuse (proxy mal configuré,
   * serveur compromis) ne doit pas saturer la heap du client.
   */
  private async readBoundedBody(response: Response): Promise<string> {
    const limit = HttpClient.MAX_ERROR_BODY_BYTES;
    const stream = response.body as ReadableStream<Uint8Array> | null | undefined;

    if (stream && typeof stream.getReader === 'function') {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let bytes = 0;

      try {
        while (bytes < limit) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          bytes += value.byteLength;
          text += decoder.decode(value, { stream: true });
        }
      } finally {
        try {
          await reader.cancel();
        } catch {
          // Flux déjà terminé ou annulé par le runtime.
        }
      }

      return text.slice(0, limit);
    }

    return (await response.text()).slice(0, limit);
  }

  private async handleErrorResponse(response: Response, requestId?: string): Promise<never> {
    let errorData: any = {};
    try {
      const rawText = await this.readBoundedBody(response);

      if (rawText.trim() !== '') {
        try {
          const parsed = JSON.parse(rawText);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            for (const [k, v] of Object.entries(parsed)) {
              if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
                errorData[k] = v;
              }
            }
          } else {
            errorData = { message: String(parsed) };
          }
        } catch {
          // Si le JSON a été tronqué au plafond de taille, extraire message/error sans parser l'objet complet
          const msgMatch = rawText.match(/"message"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
          const errMatch = rawText.match(/"error"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
          if (msgMatch || errMatch) {
            errorData = {
              message: msgMatch ? msgMatch[1] : rawText,
              error: errMatch ? errMatch[1] : undefined,
            };
          } else {
            errorData = { message: rawText };
          }
        }
      }
    } catch {
      errorData = { message: response.statusText || 'Erreur inconnue' };
    }

    const rawMessage =
      (errorData && typeof errorData.message === 'string' && errorData.message) ||
      (errorData && typeof errorData.error === 'string' && errorData.error) ||
      `Erreur serveur (${response.status})`;
    const message = rawMessage.slice(0, 1000);
    const errorType =
      (errorData && typeof errorData.error === 'string' && errorData.error) || 'API_ERROR';
    const field = errorData && typeof errorData.field === 'string' ? errorData.field : undefined;

    // Borner le corps d'erreur conservé en mémoire : une réponse volumineuse
    // (ou piégée) ne doit pas saturer la heap du client.
    let rawPayload: unknown = errorData;
    try {
      if (JSON.stringify(errorData).length > 8192) {
        rawPayload = { message };
      }
    } catch {
      rawPayload = { message };
    }

    const error = new RestorinoApiError(response.status, message, errorType, field, rawPayload);
    error.requestId = requestId;

    const retryAfterMs = this.parseRetryAfter(response);
    if (retryAfterMs !== undefined) {
      error.retryAfterMs = retryAfterMs;
    }

    throw error;
  }
}

// ==========================================
// SOURCE: modules/auth.ts
// ==========================================

export class AuthModule {
  constructor(private http: HttpClient) {}

  /**
   * `restaurantId` est `@NotBlank` côté backend : échouer localement avec un
   * message clair évite de transformer une erreur de configuration en 400 opaque.
   */
  private resolveRestaurantId(override?: string): string {
    const restaurantId = override || this.http.getConfig().restaurantId;
    if (!restaurantId) {
      throw new RestorinoApiError(
        400,
        'restaurantId est requis : fournissez-le à la configuration du client ou à l’appel.',
        'MISSING_RESTAURANT_ID'
      );
    }
    return restaurantId;
  }

  /**
   * En mode cookies (défaut) le backend ne renvoie aucun token dans le corps :
   * son absence n'est pas un échec. On ne stocke que si un jeton est présent
   * (compatibilité avec les backends en mode Bearer).
   */
  private adoptSession(response?: CustomerAuthResponse | null): void {
    if (response && response.token) {
      this.http.setAuthTokens(response.token, response.refreshToken ?? undefined);
    }
  }

  /**
   * Connexion d'un compte client (Email + Mot de passe).
   */
  public async login(data: CustomerLoginRequest): Promise<CustomerAuthResponse> {
    const restaurantId = this.resolveRestaurantId(data.restaurantId);
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/login', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    this.adoptSession(response);
    return response;
  }

  /**
   * Inscription d'un nouveau compte client pour le restaurant.
   */
  public async register(data: CustomerRegisterRequest): Promise<CustomerAuthResponse> {
    const restaurantId = this.resolveRestaurantId(data.restaurantId);
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/register', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    this.adoptSession(response);
    return response;
  }

  /**
   * Connexion ou auto-inscription d'un client via Google Sign-In (Token ID Google).
   */
  public async loginWithGoogle(data: CustomerGoogleAuthRequest): Promise<CustomerAuthResponse> {
    const restaurantId = this.resolveRestaurantId(data.restaurantId);
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/google', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    this.adoptSession(response);
    return response;
  }

  /**
   * Rafraîchissement explicite de la session client.
   *
   * Délègue au transport : le backend renouvelle à partir des cookies HttpOnly
   * et répond `{ success: true }` sans token. Le paramètre permet de fournir un
   * refresh token obtenu hors SDK ; il reste en mémoire et n'est **jamais**
   * transmis (le backend ne lit que le cookie HttpOnly).
   */
  public async refreshToken(refreshToken?: string): Promise<CustomerRefreshTokenResponse> {
    const previousRefreshToken = refreshToken || this.http.getRefreshToken();
    if (previousRefreshToken && !this.http.getRefreshToken()) {
      this.http.setRefreshToken(previousRefreshToken);
    }

    const refreshed = await this.http.tryRefreshToken();
    if (!refreshed) {
      throw new RestorinoApiError(
        401,
        'Session expirée : impossible de rafraîchir le jeton.',
        'REFRESH_FAILED'
      );
    }

    return {
      success: true,
      token: this.http.getToken() ?? undefined,
      refreshToken: this.http.getRefreshToken() ?? undefined
    };
  }

  /**
   * Déconnexion du client et invalidation de session côté serveur.
   */
  public async logout(): Promise<void> {
    try {
      await this.http.request<void>('/api/auth/customers/logout', {
        method: 'POST',
        skipAuthRefresh: true,
        retries: 0
      });
    } catch {
      // Ignorer l'erreur réseau ou 401 lors de la déconnexion
    } finally {
      this.http.clearTokens();
    }
  }

  /**
   * Récupère le profil du client connecté avec son statut fidélité.
   */
  public async getMe(): Promise<CustomerAuthResponse> {
    return this.http.request<CustomerAuthResponse>('/api/auth/customers/me', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Modification du mot de passe du client connecté.
   */
  public async changePassword(data: ChangePasswordRequest): Promise<void> {
    return this.http.request<void>('/api/auth/customers/change-password', {
      method: 'POST',
      body: data,
      requiresAuth: true
    });
  }

  /**
   * Envoi d'une demande de vérification de l'adresse email.
   */
  public async requestEmailVerification(): Promise<MessageResponse> {
    return this.http.request<MessageResponse>('/api/customers/verify-email/request', {
      method: 'POST',
      requiresAuth: true
    });
  }

  /**
   * Validation du token de vérification d'email reçu par lien.
   */
  public async verifyEmail(token: string): Promise<MessageResponse> {
    return this.http.request<MessageResponse>('/api/customers/verify-email', {
      method: 'GET',
      params: { token }
    });
  }

  /**
   * Demande de réinitialisation de mot de passe (Anti-énumération).
   */
  public async requestPasswordReset(email: string, restaurantId?: string): Promise<MessageResponse> {
    const targetRestaurantId = this.resolveRestaurantId(restaurantId);
    return this.http.request<MessageResponse>('/api/customers/password/reset-request', {
      method: 'POST',
      body: { email, restaurantId: targetRestaurantId } as PasswordResetRequest
    });
  }

  /**
   * Confirmation de réinitialisation de mot de passe avec le code OTP à 6 chiffres.
   */
  public async confirmPasswordReset(data: PasswordResetConfirmRequest): Promise<MessageResponse> {
    const restaurantId = this.resolveRestaurantId(data.restaurantId);
    return this.http.request<MessageResponse>('/api/customers/password/reset-confirm', {
      method: 'POST',
      body: { ...data, restaurantId }
    });
  }
}

// ==========================================
// SOURCE: modules/customer.ts
// ==========================================

export class CustomerModule {
  constructor(private http: HttpClient) {}

  /**
   * Récupère le profil du client connecté.
   */
  public async getProfile(): Promise<CustomerDto> {
    return this.http.request<CustomerDto>('/api/customers/me', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Met à jour les informations du profil client.
   */
  public async updateProfile(data: UpdateCustomerProfileRequest): Promise<CustomerDto> {
    return this.http.request<CustomerDto>('/api/customers/me', {
      method: 'PUT',
      body: data,
      requiresAuth: true
    });
  }

  /**
   * Récupère l'historique paginé des commandes du client.
   */
  public async getOrders(page = 0, size = 10): Promise<Page<CustomerOrder>> {
    return this.http.request<Page<CustomerOrder>>('/api/customers/orders', {
      method: 'GET',
      params: { page, size },
      requiresAuth: true
    });
  }

  /**
   * Récupère le détail d'une commande passée par le client.
   */
  public async getOrderDetails(orderId: string): Promise<CustomerOrder> {
    return this.http.request<CustomerOrder>(`/api/customers/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Évalue une commande terminée (qualité, rapidité, service, commentaire).
   */
  public async rateOrder(orderId: string, rating: OrderRatingRequest): Promise<OrderRatingDTO> {
    return this.http.request<OrderRatingDTO>(`/api/customers/orders/${encodeURIComponent(orderId)}/rate`, {
      method: 'POST',
      body: rating,
      requiresAuth: true
    });
  }

  /**
   * Récupère les évaluations soumises par le client.
   */
  public async getMyRatings(page = 0, size = 10): Promise<Page<OrderRatingDTO>> {
    return this.http.request<Page<OrderRatingDTO>>('/api/customers/ratings', {
      method: 'GET',
      params: { page, size },
      requiresAuth: true
    });
  }

  /**
   * Obtient ou génère le code de parrainage et le lien de partage du client.
   */
  public async getReferralCode(): Promise<ReferralCodeResponse> {
    return this.http.request<ReferralCodeResponse>('/api/customers/referral-code', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Applique le code de parrainage d'un ami.
   */
  public async applyReferralCode(code: string): Promise<MessageResponse> {
    return this.http.request<MessageResponse>('/api/customers/apply-referral', {
      method: 'POST',
      params: { code },
      requiresAuth: true
    });
  }

  /**
   * Tableau de bord des parrainages (filleuls, récompenses débloquées).
   */
  public async getReferrals(): Promise<ReferralDashboardResponse> {
    return this.http.request<ReferralDashboardResponse>('/api/customers/referrals', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Boîte de réception in-app du client.
   */
  public async getNotifications(page = 0, size = 20): Promise<Page<CustomerNotification>> {
    return this.http.request<Page<CustomerNotification>>('/api/notifications/customers/my-inbox', {
      method: 'GET',
      params: { page, size },
      requiresAuth: true
    });
  }

  /**
   * Nombre de notifications non lues (badge header).
   */
  public async getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
    return this.http.request<{ unreadCount: number }>('/api/notifications/customers/my-inbox/unread-count', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Marque une notification comme lue.
   */
  public async markNotificationRead(notificationId: string): Promise<void> {
    return this.http.request<void>(`/api/notifications/customers/my-inbox/${encodeURIComponent(notificationId)}/read`, {
      method: 'PUT',
      requiresAuth: true
    });
  }

  /**
   * Marque toutes les notifications comme lues.
   */
  public async markAllNotificationsRead(): Promise<void> {
    return this.http.request<void>('/api/notifications/customers/my-inbox/read-all', {
      method: 'PUT',
      requiresAuth: true
    });
  }

  // ==================== MENU ====================

  /**
   * Catégories du menu du restaurant (authentifié, scopé au restaurant du JWT).
   */
  public async getMenuCategories(): Promise<PublicCategory[]> {
    return this.http.request<PublicCategory[]>('/api/customers/menu/categories', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Produits du menu (optionnel: filtre par catégorie).
   */
  public async getMenuProducts(categoryId?: string): Promise<PublicProduct[]> {
    return this.http.request<PublicProduct[]>('/api/customers/menu/products', {
      method: 'GET',
      params: categoryId ? { categoryId } : undefined,
      requiresAuth: true
    });
  }

  /**
   * Détail d'un produit du menu.
   */
  public async getMenuProduct(productId: string): Promise<PublicProduct> {
    return this.http.request<PublicProduct>(`/api/customers/menu/products/${encodeURIComponent(productId)}`, {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Suppléments commandables (sauces, extras) du menu du restaurant.
   * Le backend accepte un filtre optionnel `productId`.
   */
  public async getMenuSupplements(productId?: string): Promise<ProductOption[]> {
    return this.http.request<ProductOption[]>('/api/customers/menu/supplements', {
      method: 'GET',
      params: productId ? { productId } : undefined,
      requiresAuth: true
    });
  }

  /**
   * Garnitures d'accompagnement du restaurant (optionnel: filtre par catégorie).
   */
  public async getMenuGarnishes(category?: string): Promise<ProductOption[]> {
    return this.http.request<ProductOption[]>('/api/customers/menu/garnishes', {
      method: 'GET',
      params: category ? { category } : undefined,
      requiresAuth: true
    });
  }

  /**
   * Carte des boissons du restaurant.
   */
  public async getMenuBeverages(
    filters?: { type?: string; size?: string; alcoholic?: boolean }
  ): Promise<ProductOption[]> {
    return this.http.request<ProductOption[]>('/api/customers/menu/beverages', {
      method: 'GET',
      params: filters,
      requiresAuth: true
    });
  }

  // ==================== TESTIMONIALS ====================

  /**
   * Soumission d'un témoignage / avis sur le restaurant.
   */
  public async submitTestimonial(data: CreateTestimonialRequest): Promise<TestimonialResponse> {
    return this.http.request<TestimonialResponse>('/api/customers/testimonials', {
      method: 'POST',
      body: data,
      requiresAuth: true
    });
  }

  /**
   * Liste des avis laissés par le client connecté.
   */
  public async getMyTestimonials(): Promise<TestimonialResponse[]> {
    return this.http.request<TestimonialResponse[]>('/api/customers/testimonials', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Valide un code promotionnel pour le panier du client.
   */
  public async validatePromoCode(promoCode: string, orderAmount: number): Promise<PromoValidationResponse> {
    return this.http.request<PromoValidationResponse>('/api/customers/promo/validate', {
      method: 'POST',
      body: { promoCode, orderAmount },
      requiresAuth: true
    });
  }
}

// ==========================================
// SOURCE: modules/loyalty.ts
// ==========================================

const RESTAURANT_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class LoyaltyModule {
  constructor(private http: HttpClient) {}

  /**
   * Récupère le statut fidélité (solde de points, palier courant et progression).
   */
  public async getStatus(): Promise<CustomerLoyalty> {
    return this.http.request<CustomerLoyalty>('/api/customers/loyalty', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Récupère la liste des récompenses échangeables.
   */
  public async getRewards(): Promise<LoyaltyReward[]> {
    return this.http.request<LoyaltyReward[]>('/api/customers/loyalty/rewards', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Échange des points contre une récompense.
   *
   * `Idempotency-Key` : le backend marque l'endpoint `@Idempotent`, mais
   * n'applique la garde que si l'en-tête est présent. Une clé est donc générée
   * par défaut (et reste stable à travers les réessais internes) ; l'appelant
   * peut fournir la sienne pour rendre un réessai applicatif sûr.
   */
  public async redeemReward(rewardId: string, idempotencyKey?: string): Promise<RedemptionResult> {
    return this.http.request<RedemptionResult>(`/api/customers/loyalty/rewards/${encodeURIComponent(rewardId)}/redeem`, {
      method: 'POST',
      requiresAuth: true,
      idempotencyKey: idempotencyKey ?? this.http.createIdempotencyKey()
    });
  }

  /**
   * Récupère les informations publiques de la campagne d'avis Google du restaurant.
   * Le paramètre de chemin doit être un UUID (un slug produit un 400).
   */
  public async getGoogleReviewInfo(restaurantId?: string): Promise<GoogleReviewInfoResponse> {
    const targetId = restaurantId || this.http.getConfig().restaurantId;
    if (!targetId || !RESTAURANT_UUID_PATTERN.test(targetId)) {
      throw new RestorinoApiError(
        400,
        'restaurantId (UUID) est requis pour consulter la campagne d’avis Google.',
        'INVALID_RESTAURANT_ID'
      );
    }

    return this.http.request<GoogleReviewInfoResponse>(
      `/api/public/restaurants/${encodeURIComponent(targetId)}/google-review-info`,
      { method: 'GET' }
    );
  }

  /**
   * Vérifie si le client connecté est éligible pour réclamer des points pour un avis Google.
   */
  public async getGoogleReviewStatus(): Promise<GoogleReviewStatusResponse> {
    return this.http.request<GoogleReviewStatusResponse>('/api/customers/google-review/status', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Soumet une réclamation de points pour un avis Google rédigé.
   * Une clé d'idempotence est générée par défaut pour éviter un double crédit
   * si la requête est rejouée.
   */
  public async claimGoogleReview(data: GoogleReviewClaimRequest, idempotencyKey?: string): Promise<GoogleReviewClaimDTO> {
    const payload = {
      reviewerName: data.reviewerName || data.googleReviewerName || '',
      rating: data.rating ?? data.starRating ?? 5,
      reviewComment: data.reviewComment || data.commentSnippet,
      proofImageUrl: data.proofImageUrl
    };
    return this.http.request<GoogleReviewClaimDTO>('/api/customers/google-review/claim', {
      method: 'POST',
      body: payload,
      requiresAuth: true,
      idempotencyKey: idempotencyKey ?? this.http.createIdempotencyKey()
    });
  }

  /**
   * Téléverse une capture d'écran de preuve pour la réclamation d'avis Google (max 5 Mo).
   */
  public async uploadGoogleReviewProof(file: File | Blob): Promise<UploadReviewProofResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.request<UploadReviewProofResponse>('/api/customers/google-review/upload-proof', {
      method: 'POST',
      body: formData,
      isFormData: true,
      requiresAuth: true
    });
  }
}

// ==========================================
// SOURCE: modules/vitrine.ts
// ==========================================

export class VitrineModule {
  constructor(private http: HttpClient) {}

  private resolveIdentifier(override?: string): string {
    const target = override || this.http.getConfig().restaurantId;
    if (!target) {
      throw new RestorinoApiError(
        400,
        'restaurantId est requis : fournissez-le à la configuration du client ou à l’appel.',
        'MISSING_RESTAURANT_ID'
      );
    }
    return target;
  }

  /**
   * Identifiant de vitrine (tenant, slug ou restaurant) obligatoire : sans lui
   * le chemin contient un segment vide et échoue en 404 opaque.
   */
  private resolveTenantTarget(override?: string): string {
    const target = override || this.http.getConfig().tenantId || this.http.getConfig().restaurantId;
    if (!target) {
      throw new RestorinoApiError(
        400,
        'tenantId (ou restaurantId) est requis pour identifier la vitrine.',
        'MISSING_TENANT_ID'
      );
    }
    return target;
  }

  /**
   * Recherche multicritère de restaurants (proximité GPS, spécialité, ville).
   */
  public async search(filter: RestaurantSearchRequest): Promise<Page<RestaurantSearchResponse>> {
    return this.http.request<Page<RestaurantSearchResponse>>('/api/public/restaurants/search', {
      method: 'POST',
      body: filter
    });
  }

  /**
   * Liste des restaurants les plus populaires de la plateforme.
   */
  public async getPopular(): Promise<RestaurantSearchResponse[]> {
    return this.http.request<RestaurantSearchResponse[]>('/api/public/restaurants/popular', {
      method: 'GET'
    });
  }

  /**
   * Liste des types de cuisine disponibles.
   */
  public async getCuisines(): Promise<string[]> {
    return this.http.request<string[]>('/api/public/restaurants/cuisines', {
      method: 'GET'
    });
  }

  /**
   * Fiche vitrine complète d'un restaurant (par son UUID ou son sous-domaine).
   */
  public async getRestaurant(identifier?: string): Promise<PublicVitrineResponse> {
    const target = identifier || this.http.getConfig().restaurantId;
    return this.http.request<PublicVitrineResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}`, {
      method: 'GET'
    });
  }

  /**
   * Vérifie si des coordonnées GPS se situent dans la zone de livraison du restaurant.
   * Le backend attend `latitude` / `longitude` (les noms `lat`/`lng` produisaient un 400).
   */
  public async checkDeliveryZone(latitude: number, longitude: number, restaurantId?: string): Promise<DeliveryZoneCheckResponse> {
    const target = this.resolveIdentifier(restaurantId);
    return this.http.request<DeliveryZoneCheckResponse>(`/api/public/restaurants/${encodeURIComponent(target)}/delivery-check`, {
      method: 'GET',
      params: { latitude, longitude }
    });
  }

  /**
   * Statut d'ouverture temps réel du restaurant.
   */
  public async getStatus(restaurantId?: string): Promise<RestaurantStatusResponse> {
    const target = this.resolveIdentifier(restaurantId);
    return this.http.request<RestaurantStatusResponse>(`/api/public/restaurants/${encodeURIComponent(target)}/status`, {
      method: 'GET'
    });
  }

  /**
   * Avis clients publics du restaurant.
   * Le backend renvoie un objet `{reviews, totalReviews, averageRating, ...}`,
   * pas une `Page` Spring.
   */
  public async getReviews(restaurantId?: string, page = 0, size = 10): Promise<RestaurantReviewsResponse> {
    const target = this.resolveIdentifier(restaurantId);
    return this.http.request<RestaurantReviewsResponse>(`/api/public/restaurants/${encodeURIComponent(target)}/reviews`, {
      method: 'GET',
      params: { page, size }
    });
  }

  /**
   * Carte / Menu public complet du restaurant.
   */
  public async getMenu(restaurantId?: string): Promise<PublicMenuResponse> {
    const target = this.resolveIdentifier(restaurantId);
    return this.http.request<PublicMenuResponse>(`/api/public/restaurants/${encodeURIComponent(target)}/menu`, {
      method: 'GET'
    });
  }

  /**
   * Récupère une catégorie et ses plats par slug SEO (ex: 'burgers').
   */
  public async getCategoryBySlug(categorySlug: string, tenantOrSlug?: string): Promise<PublicCategory> {
    const tenant = this.resolveTenantTarget(tenantOrSlug);
    return this.http.request<PublicCategory>(`/api/public/menu/${encodeURIComponent(tenant)}/${encodeURIComponent(categorySlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Récupère la fiche détaillée d'un plat par slug SEO (ex: 'double-cheese-burger').
   */
  public async getProductBySlug(categorySlug: string, productSlug: string, tenantOrSlug?: string): Promise<PublicProduct> {
    const tenant = this.resolveTenantTarget(tenantOrSlug);
    return this.http.request<PublicProduct>(`/api/public/menu/${encodeURIComponent(tenant)}/${encodeURIComponent(categorySlug)}/${encodeURIComponent(productSlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Récupère les métadonnées SEO pour l'accueil de la vitrine.
   */
  public async getSeoMeta(tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = this.resolveTenantTarget(tenantOrSlug);
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant)}/meta`, {
      method: 'GET'
    });
  }

  /**
   * Métadonnées SEO d'une catégorie du menu (par slug).
   */
  public async getCategorySeoMeta(categorySlug: string, tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = this.resolveTenantTarget(tenantOrSlug);
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant)}/meta/category/${encodeURIComponent(categorySlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Métadonnées SEO d'un produit du menu (par slug).
   */
  public async getProductSeoMeta(productSlug: string, tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = this.resolveTenantTarget(tenantOrSlug);
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant)}/meta/product/${encodeURIComponent(productSlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Récupère les témoignages validés par sous-domaine vitrine.
   */
  public async getTestimonialsBySubdomain(subdomain: string, page = 0, size = 10): Promise<Page<TestimonialResponse>> {
    return this.http.request<Page<TestimonialResponse>>(`/api/public/testimonials/subdomain/${encodeURIComponent(subdomain)}`, {
      method: 'GET',
      params: { page, size }
    });
  }

  /**
   * Récupère les témoignages validés par identifiant UUID du restaurant.
   * Le backend renvoie une `Page` Spring, pas un tableau.
   */
  public async getTestimonials(restaurantId?: string, page = 0, size = 10): Promise<Page<TestimonialResponse>> {
    const target = this.resolveIdentifier(restaurantId);
    return this.http.request<Page<TestimonialResponse>>(`/api/public/testimonials/${encodeURIComponent(target)}`, {
      method: 'GET',
      params: { page, size }
    });
  }

  /**
   * Récupère la configuration vitrine publique publiée (GET /api/vitrine/{tenantIdOrSubdomain}/public).
   * Endpoint public direct, sans clé API ni session.
   */
  public async getPublicConfig(tenantIdOrSubdomain?: string): Promise<VitrineConfigResponse> {
    const target = this.resolveTenantTarget(tenantIdOrSubdomain);
    return this.http.request<VitrineConfigResponse>(`/api/vitrine/${encodeURIComponent(target)}/public`, {
      method: 'GET'
    });
  }

  /**
   * Résout un nom de domaine ou sous-domaine vers son tenantId.
   * Le backend répond 404 pour un domaine inconnu : on le traduit en
   * `{ found: false }` plutôt que de lever une exception.
   */
  public async resolveCustomDomain(domain: string): Promise<DomainResolutionResponse> {
    try {
      return await this.http.request<DomainResolutionResponse>('/api/vitrine/resolve-domain', {
        method: 'GET',
        params: { domain }
      });
    } catch (err) {
      if (err instanceof RestorinoApiError && err.status === 404) {
        return { found: false, domain };
      }
      throw err;
    }
  }

  /**
   * Récupère le bundle JSON-LD Schema.org (@graph) officiel du site vitrine pour Google Rich Results.
   */
  public async getSchemaOrg(tenantIdOrSubdomain?: string): Promise<Record<string, any>> {
    const target = this.resolveTenantTarget(tenantIdOrSubdomain);
    return this.http.request<Record<string, any>>(`/api/vitrine/${encodeURIComponent(target)}/schema.json`, {
      method: 'GET'
    });
  }
}

// ==========================================
// SOURCE: modules/orders.ts
// ==========================================

export class OrdersModule {
  constructor(private http: HttpClient) {}

  /**
   * Un `restaurantId` vide produit une URL `//orders` et un 404 opaque.
   */
  private resolveRestaurantId(override?: string): string {
    const target = override || this.http.getConfig().restaurantId;
    if (!target) {
      throw new RestorinoApiError(
        400,
        'restaurantId est requis : fournissez-le à la configuration du client ou à l’appel.',
        'MISSING_RESTAURANT_ID'
      );
    }
    return target;
  }

  private generateIdempotencyKey(): string {
    return this.http.createIdempotencyKey();
  }

  /**
   * Passage d'une commande publique depuis la vitrine.
   */
  public async placeOrder(order: VitrineOrderRequest, restaurantId?: string): Promise<OrderResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    // `idempotencyKey` est un détail de transport : il ne part pas dans le corps.
    const { idempotencyKey, ...payload } = order;

    return this.http.request<OrderResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders`,
      {
        method: 'POST',
        body: payload,
        // Rejouer une création de commande sans clé peut la dupliquer.
        idempotencyKey: idempotencyKey ?? this.generateIdempotencyKey()
      }
    );
  }

  /**
   * Estimation des frais et délais de livraison.
   *
   * L'API attend `{ latitude, longitude, address }`. L'ancienne forme
   * `CustomerLocation` (`street`) reste acceptée et convertie.
   */
  public async estimateDelivery(
    location: EstimateDeliveryRequest | CustomerLocation,
    restaurantId?: string
  ): Promise<DeliveryEstimateResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<DeliveryEstimateResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/estimate-delivery`,
      { method: 'POST', body: this.toEstimateRequest(location) }
    );
  }

  private toEstimateRequest(location: EstimateDeliveryRequest | CustomerLocation): EstimateDeliveryRequest {
    const legacy = location as CustomerLocation & { street?: string };
    const address = (location as EstimateDeliveryRequest).address || legacy.street || '';

    if (!address || address.trim().length < 10) {
      throw new RestorinoApiError(
        400,
        'Une adresse complète (10 caractères minimum) est requise pour estimer la livraison.',
        'MISSING_ADDRESS'
      );
    }

    return {
      latitude: legacy.latitude,
      longitude: legacy.longitude,
      address,
      preferredTime: (location as EstimateDeliveryRequest).preferredTime,
      orderValue: (location as EstimateDeliveryRequest).orderValue
    };
  }

  /**
   * Suivi public d'une commande par son ID avec vérification 2 facteurs (anti-IDOR: email + phone).
   */
  public async trackOrder(
    orderId: string,
    verification: OrderTrackingVerification,
    restaurantId?: string
  ): Promise<OrderTrackingResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<OrderTrackingResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/${encodeURIComponent(orderId)}/track`,
      {
        method: 'GET',
        params: {
          customerEmail: verification.customerEmail,
          customerPhone: verification.customerPhone
        }
      }
    );
  }

  /**
   * Annulation de commande par le client avec vérification 2 facteurs (anti-IDOR: email + phone).
   */
  public async cancelOrder(
    orderId: string,
    verification: CancelOrderRequest,
    restaurantId?: string
  ): Promise<OrderResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<OrderResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/${encodeURIComponent(orderId)}/cancel`,
      {
        method: 'POST',
        params: {
          customerEmail: verification.customerEmail,
          customerPhone: verification.customerPhone,
          reason: verification.reason
        }
      }
    );
  }

  /**
   * Suivi one-click via token signé (lien SMS/email).
   */
  public async trackOrderByToken(token: string, restaurantId?: string): Promise<OrderTrackingResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<OrderTrackingResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/track-link`,
      { method: 'GET', params: { token } }
    );
  }

  /**
   * Menu du restaurant pour la page de commande.
   */
  public async getOrderingMenu(restaurantId?: string): Promise<PublicMenuResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<PublicMenuResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/menu`,
      { method: 'GET' }
    );
  }

  /**
   * Paramètres publics du restaurant (taxe, couleurs, devise, logo).
   */
  public async getSettings(restaurantId?: string): Promise<PublicRestaurantSettingsResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<PublicRestaurantSettingsResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/settings`,
      { method: 'GET' }
    );
  }

  /**
   * Réservation de table publique en ligne.
   */
  public async createReservation(
    reservation: CreateReservationRequest,
    restaurantId?: string
  ): Promise<ReservationResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<ReservationResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/reservations`,
      {
        method: 'POST',
        body: reservation,
        idempotencyKey: this.generateIdempotencyKey()
      }
    );
  }

  /**
   * Suivi d'une réservation de table par son numéro (email + phone).
   */
  public async trackReservation(
    reservationNumber: string,
    verification: ReservationTrackingVerification,
    restaurantId?: string
  ): Promise<ReservationResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<ReservationResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/reservations/${encodeURIComponent(reservationNumber)}/track`,
      {
        method: 'GET',
        params: {
          customerEmail: verification.customerEmail,
          customerPhone: verification.customerPhone
        }
      }
    );
  }

  /**
   * Annulation d'une réservation de table par le client (email + phone).
   */
  public async cancelReservation(
    reservationNumber: string,
    verification: CancelReservationRequest,
    restaurantId?: string
  ): Promise<ReservationResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<ReservationResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/reservations/${encodeURIComponent(reservationNumber)}/cancel`,
      {
        method: 'POST',
        params: {
          customerEmail: verification.customerEmail,
          customerPhone: verification.customerPhone,
          reason: verification.reason
        }
      }
    );
  }

  /**
   * Surveille l'avancement d'une commande (polling avec arrêt automatique).
   *
   * Le backend n'expose pas `isDelivered` : l'arrêt se fait sur le statut réel.
   * `PENDING_VERIFICATION` (paiement cash à confirmer) est un état d'attente
   * légitime, pas un état terminal.
   */
  public watchOrder(
    orderId: string,
    verification: OrderTrackingVerification,
    callback: (status: OrderTrackingResponse) => void,
    options: {
      intervalMs?: number;
      onError?: (err: Error) => void;
      restaurantId?: string;
      /** Durée maximale de surveillance (défaut : 30 min). */
      maxDurationMs?: number;
      /** Nombre d'erreurs consécutives avant abandon (défaut : 5). */
      maxConsecutiveErrors?: number;
      /** Sous Node, ne pas retenir la boucle d'événements (défaut : false). */
      unrefTimers?: boolean;
    } = {}
  ): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let consecutiveErrors = 0;
    const interval = Math.max(options.intervalMs ?? 5000, 50);
    const maxDuration = options.maxDurationMs ?? 30 * 60 * 1000;
    const maxErrors = Math.max(1, options.maxConsecutiveErrors ?? 5);
    const startedAt = Date.now();
    const terminalStatuses: OrderStatus[] = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUSED', 'REFUNDED'];

    const schedule = (delayMs: number): void => {
      timer = setTimeout(poll, delayMs);
      // Sous Node, un timer armé retient la boucle d'événements : sans unref,
      // un script qui surveille une commande ne se termine jamais.
      if (options.unrefTimers) {
        (timer as unknown as { unref?: () => void }).unref?.();
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const tracking = await this.trackOrder(orderId, verification, options.restaurantId);
        if (stopped) return;
        consecutiveErrors = 0;
        callback(tracking);
        if (terminalStatuses.includes(tracking.status)) {
          return;
        }
      } catch (err: any) {
        consecutiveErrors++;
        if (!stopped && options.onError) {
          options.onError(err instanceof Error ? err : new Error(String(err)));
        }
        // Abandonner après N échecs : continuer ne fait que marteler un
        // endpoint protégé par rate limiting.
        if (stopped || consecutiveErrors >= maxErrors) {
          return;
        }
      }
      // Borne la durée totale : sans elle, un statut jamais terminal fait
      // tourner le polling indéfiniment (batterie, réseau, quota).
      if (!stopped && Date.now() - startedAt < maxDuration) {
        schedule(interval);
      }
    };

    schedule(0);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }
}

// ==========================================
// SOURCE: modules/delivery.ts
// ==========================================

export class DeliveryModule {
  constructor(private http: HttpClient) {}

  /**
   * Suivi temps réel d'un livreur par numéro de suivi sans authentification.
   */
  public async track(trackingNumber: string): Promise<PublicTrackingResponse> {
    return this.http.request<PublicTrackingResponse>(`/api/public/deliveries/track/${encodeURIComponent(trackingNumber)}`, {
      method: 'GET'
    });
  }

  /**
   * Surveille en direct la position GPS et l'état d'avancement du coursier.
   *
   * Le backend renvoie `deliveryStatus` (et non `status`) : le test d'arrêt
   * lisait un champ toujours `undefined` et bouclait indéfiniment.
   * Retourne une fonction de désabonnement / arrêt du flux.
   */
  public watchDelivery(
    trackingNumber: string,
    callback: (delivery: PublicTrackingResponse) => void,
    options: {
      intervalMs?: number;
      onError?: (err: Error) => void;
      /** Durée maximale de surveillance (défaut : 30 min). */
      maxDurationMs?: number;
      /** Nombre d'erreurs consécutives avant abandon (défaut : 5). */
      maxConsecutiveErrors?: number;
      /** Sous Node, ne pas retenir la boucle d'événements (défaut : false). */
      unrefTimers?: boolean;
    } = {}
  ): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let consecutiveErrors = 0;
    const interval = Math.max(options.intervalMs ?? 4000, 50);
    const maxDuration = options.maxDurationMs ?? 30 * 60 * 1000;
    const maxErrors = Math.max(1, options.maxConsecutiveErrors ?? 5);
    const startedAt = Date.now();
    const terminalStatuses: DeliveryStatus[] = ['DELIVERED', 'FAILED', 'CANCELLED'];

    const schedule = (delayMs: number): void => {
      timer = setTimeout(poll, delayMs);
      if (options.unrefTimers) {
        (timer as unknown as { unref?: () => void }).unref?.();
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const data = await this.track(trackingNumber);
        if (stopped) return;
        consecutiveErrors = 0;
        callback(data);
        if (terminalStatuses.includes(data.deliveryStatus)) {
          return;
        }
      } catch (err: any) {
        consecutiveErrors++;
        if (!stopped && options.onError) {
          options.onError(err instanceof Error ? err : new Error(String(err)));
        }
        if (stopped || consecutiveErrors >= maxErrors) {
          return;
        }
      }
      if (!stopped && Date.now() - startedAt < maxDuration) {
        schedule(interval);
      }
    };

    schedule(0);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }
}

// ==========================================
// SOURCE: modules/tables.ts
// ==========================================

const TABLE_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class TablesModule {
  constructor(private http: HttpClient) {}

  private resolveRestaurantId(override?: string): string {
    const target = override || this.http.getConfig().restaurantId;
    if (!target) {
      throw new RestorinoApiError(
        400,
        'restaurantId est requis : fournissez-le à la configuration du client ou à l’appel.',
        'MISSING_RESTAURANT_ID'
      );
    }
    return target;
  }

  /**
   * Récupère les informations d'une table scannée par QR Code (Dine-in).
   *
   * Le backend attend un UUID : passer un numéro de table produisait un 400
   * sans corps de réponse impossible à diagnostiquer côté client.
   */
  public async getTableInfo(tableId: string, restaurantId?: string): Promise<PublicTableResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    if (!TABLE_UUID_PATTERN.test(tableId)) {
      throw new RestorinoApiError(
        400,
        'tableId doit être un UUID (le numéro affiché sur la table ne suffit pas).',
        'INVALID_TABLE_ID'
      );
    }

    return this.http.request<PublicTableResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/tables/${encodeURIComponent(tableId)}`,
      { method: 'GET' }
    );
  }
}

// ==========================================
// SOURCE: modules/live-agent.ts
// ==========================================

/**
 * Handle d'une session active avec l'agent vocal interactif Gemini Live.
 */
export class LiveAgentSession {
  private ws: WebSocket | null = null;
  private status: LiveAgentStatus = 'CONNECTING';
  private listeners: Map<LiveAgentEvent, Set<Function>> = new Map();
  private audioMeta: LiveAgentAudioMeta | null = null;
  private closed = false;

  constructor(
    private config: LiveAgentSessionConfig,
    source: string | (() => Promise<string>)
  ) {
    if (typeof source === 'string') {
      // Le jeton est déjà connu : ouverture immédiate, comportement synchrone.
      this.initWebSocket(source);
    } else {
      void this.bootstrap(source);
    }
  }

  /**
   * Le jeton de session doit être obtenu par HTTP avant l'ouverture du socket :
   * le backend refuse (`SESSION_GRANT_REQUIRED`, close 1008) tout socket sans
   * `?grant=` valide.
   */
  private async bootstrap(source: string | (() => Promise<string>)): Promise<void> {
    try {
      const url = typeof source === 'function' ? await source() : source;
      if (this.closed) return;
      this.initWebSocket(url);
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (this.config.onError) this.config.onError(err);
      this.emit('error', err);
      this.updateStatus('ERROR');
    }
  }

  /**
   * Enregistre un écouteur d'événement typé.
   * Retourne une fonction de désabonnement pour les cycles de vie React (useEffect).
   */
  public on<E extends LiveAgentEvent>(event: E, listener: LiveAgentEventListener<E>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  /**
   * Supprime un écouteur d'événement précédemment enregistré.
   */
  public off<E extends LiveAgentEvent>(event: E, listener: LiveAgentEventListener<E>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  private emit<E extends LiveAgentEvent>(event: E, ...args: any[]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        try {
          (listener as any)(...args);
        } catch {
          // Isoler les erreurs des callbacks abonnés
        }
      }
    }
  }

  private initWebSocket(url: string): void {
    if (typeof WebSocket === 'undefined') {
      const err = new Error("L'API WebSocket n'est pas disponible dans cet environnement.");
      if (this.config.onError) this.config.onError(err);
      this.emit('error', err);
      this.updateStatus('ERROR');
      return;
    }

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.updateStatus('CONNECTED');
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            if (!data || typeof data !== 'object' || Array.isArray(data)) return;
            // Protection contre la pollution de prototype
            if (data.type === '__proto__' || data.action === '__proto__') return;

            if (data.type === 'AUDIO_META') {
              // Le backend annonce la fréquence réelle (24 kHz par défaut) :
              // la supposer à 16 kHz produisait une lecture accélérée.
              const meta: LiveAgentAudioMeta = {
                encoding: typeof data.encoding === 'string' ? data.encoding : undefined,
                sampleRate: Number(data.sampleRate) || 24000,
                channels: Number(data.channels) || 1
              };
              this.audioMeta = meta;
              if (this.config.onAudioMeta) this.config.onAudioMeta(meta);
              this.emit('audioMeta', meta);
            } else if (data.type === 'TRANSCRIPT') {
              // Le backend alterne `agent` et `assistant` : on normalise.
              const role: 'user' | 'assistant' = data.role === 'user' ? 'user' : 'assistant';
              if (this.config.onTranscript) this.config.onTranscript(role, data.text);
              this.emit('transcript', role, data.text);
            } else if (data.type === 'STATUS' && data.message) {
              this.updateStatus(data.message as LiveAgentStatus);
            } else if (data.type === 'INTERRUPTED') {
              if (this.config.onInterrupted) this.config.onInterrupted();
              this.emit('interrupted');
              this.updateStatus('INTERRUPTED');
            } else if (data.type === 'SESSION_ENDED') {
              const reason = typeof data.reason === 'string' ? data.reason : undefined;
              if (this.config.onSessionEnded) this.config.onSessionEnded(reason);
              this.emit('sessionEnded', reason);
              this.updateStatus('DISCONNECTED');
            } else if (data.type === 'ERROR' || data.error) {
              // Les erreurs serveur (`{"error":"SESSION_GRANT_REQUIRED"}`) n'ont
              // ni `type` ni `action` : sans cette branche elles étaient ignorées.
              const err = new Error(String(data.message || data.error || 'Erreur du Live Agent.'));
              if (this.config.onError) this.config.onError(err);
              this.emit('error', err);
              this.updateStatus('ERROR');
            } else if (data.action && typeof data.action === 'string') {
              const safePayload: Record<string, any> = {};
              for (const [k, v] of Object.entries(data)) {
                if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
                  safePayload[k] = v;
                }
              }
              const actionPayload: LiveAgentClientAction = {
                action: data.action,
                payload: safePayload,
                actionId: typeof data.actionId === 'string' ? data.actionId : undefined
              };
              if (this.config.onClientAction) this.config.onClientAction(actionPayload);
              this.emit('action', actionPayload);
            }
          } catch {
            // Message texte brut
            if (this.config.onTranscript) {
              this.config.onTranscript('assistant', event.data);
            }
            this.emit('transcript', 'assistant', event.data);
          }
        } else if (event.data instanceof ArrayBuffer) {
          const uint8 = new Uint8Array(event.data);
          if (this.config.onAudio) {
            this.config.onAudio(uint8);
          }
          this.emit('audio', uint8);
          this.updateStatus('SPEAKING');
        }
      };

      this.ws.onerror = () => {
        const error = new Error('Erreur de connexion WebSocket avec le Live Agent.');
        if (this.config.onError) this.config.onError(error);
        this.emit('error', error);
        this.updateStatus('ERROR');
      };

      this.ws.onclose = (event: CloseEvent) => {
        if (!this.closed && event && event.code === 4001) {
          const reason = event.reason || undefined;
          if (this.config.onSessionEnded) this.config.onSessionEnded(reason);
          this.emit('sessionEnded', reason);
        }
        this.updateStatus('DISCONNECTED');
        if (this.config.onClose) this.config.onClose();
        this.emit('close');
        this.ws = null;
      };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (this.config.onError) this.config.onError(err);
      this.emit('error', err);
      this.updateStatus('ERROR');
    }
  }

  private updateStatus(newStatus: LiveAgentStatus): void {
    this.status = newStatus;
    if (this.config.onStatusChange) {
      this.config.onStatusChange(newStatus);
    }
    this.emit('status', newStatus);
  }

  private sendJson(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Impossible d'envoyer le message : WebSocket non connecté.");
    }
    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Envoie une invite textuelle à l'agent vocal.
   */
  public sendText(text: string): void {
    this.updateStatus('THINKING');
    this.sendJson({ type: 'TEXT', text });
  }

  /**
   * Envoie un flux de données audio brutes issues du micro du client
   * (PCM 16 kHz pour l'uplink, conformément au backend).
   */
  public sendAudio(pcmData: Uint8Array | ArrayBuffer | Blob): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    if (pcmData instanceof Uint8Array) {
      this.ws.send(pcmData.buffer as ArrayBuffer);
    } else {
      this.ws.send(pcmData);
    }
  }

  /**
   * Confirme une action proposée par l'agent (ajout au panier, réservation).
   * Sans cette confirmation, l'action reste en attente puis expire (5 min).
   */
  public confirmAction(actionId: string): void {
    this.sendJson({ type: 'CONFIRM_ACTION', actionId });
  }

  /**
   * Interrompt la prise de parole de l'agent.
   */
  public interrupt(): void {
    this.sendJson({ type: 'INTERRUPT' });
  }

  /**
   * Métadonnées audio annoncées par le serveur (`null` avant `AUDIO_META`).
   */
  public getAudioMeta(): LiveAgentAudioMeta | null {
    return this.audioMeta;
  }

  /**
   * Retourne l'état courant de l'agent.
   */
  public getStatus(): LiveAgentStatus {
    return this.status;
  }

  /**
   * Ferme la session avec l'agent vocal.
   */
  public disconnect(): void {
    this.closed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('DISCONNECTED');
  }
}

/**
 * Module pour l'Agent Vocal & Conseiller Culinaire interactif (Gemini Live).
 * Permet aux visiteurs de la vitrine de dialoguer à la voix avec le restaurant,
 * de se faire conseiller un plat selon leurs goûts/allergies et d'ajouter au panier vocalement.
 */
export class LiveAgentModule {
  constructor(private http: HttpClient) {}

  /**
   * Démarre une session vocale interactive avec le conseiller virtuel du restaurant.
   *
   * Le jeton de session est demandé de façon asynchrone ; la poignée retournée
   * expose l'état via `getStatus()` et les callbacks de configuration.
   */
  public connect(config: LiveAgentSessionConfig): LiveAgentSession {
    const rawSlug = config.restaurantSlug || this.http.getConfig().restaurantId || '';
    const slug = rawSlug.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029]/g, '').trim();

    if (!slug) {
      throw new Error('restaurantSlug est requis pour ouvrir une session Live Agent.');
    }

    const explicitWsUrl = config.wsUrl;
    if (explicitWsUrl && !/^wss?:\/\//i.test(explicitWsUrl.trim())) {
      throw new Error("L'URL WebSocket doit obligatoirement commencer par 'ws://' ou 'wss://'.");
    }

    const urlProvider = async (): Promise<string> => {
      const grant = await this.requestSessionGrant(slug);
      return this.appendQuery(explicitWsUrl || this.buildDefaultWsUrl(), {
        restaurantSlug: slug,
        grant: grant || undefined
      });
    };

    // Un `grant` fourni par l'appelant évite l'aller-retour HTTP et garde
    // `connect()` synchrone (utile en SSR/test et pour les jetons pré-obtenus).
    if (config.grant) {
      const url = this.appendQuery(explicitWsUrl || this.buildDefaultWsUrl(), {
        restaurantSlug: slug,
        grant: config.grant
      });
      return new LiveAgentSession(config, url);
    }

    return new LiveAgentSession(config, urlProvider);
  }

  /**
   * Obtient un jeton de session à usage unique.
   * Retourne `null` si l'environnement ne l'exige pas (dev sans secret).
   */
  private async requestSessionGrant(slug: string): Promise<string | null> {
    try {
      const response = await this.http.request<{ grant?: string }>(
        `/api/public/live-agent/${encodeURIComponent(slug)}/session`,
        { method: 'POST', skipAuthRefresh: true, retries: 0 }
      );
      return response && typeof response.grant === 'string' ? response.grant : null;
    } catch (err) {
      if (err instanceof RestorinoApiError && [401, 403, 404, 429].includes(err.status)) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Déduit l'URL WebSocket depuis `baseUrl` en conservant un éventuel
   * préfixe de chemin (proxy `/api`, version `/v1`…).
   */
  private buildDefaultWsUrl(): string {
    const base = (this.http.getConfig().baseUrl || '').trim();

    if (!/^https?:\/\//i.test(base)) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const wsProtocol = origin.startsWith('https') ? 'wss' : 'ws';
      const host = origin.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const path = base.replace(/^\/+/, '').replace(/\/+$/, '');
      return `${wsProtocol}://${host}${path ? `/${path}` : ''}`;
    }

    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  }

  private appendQuery(url: string, params: Record<string, string | undefined>): string {
    const wsBase = url.replace(/\/+$/, '');
    const resource = '/ws/public/live-agent';
    const target = wsBase.includes('/ws/') ? wsBase : `${wsBase}${resource}`;

    try {
      const parsed = new URL(target);
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === '') parsed.searchParams.delete(key);
        else parsed.searchParams.set(key, value);
      }
      return parsed.toString();
    } catch {
      const separator = target.includes('?') ? '&' : '?';
      const query = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      return query ? `${target}${separator}${query}` : target;
    }
  }
}

// ==========================================
// SOURCE: utils/format.ts
// ==========================================

/**
 * Formate un montant numérique selon une devise et une locale.
 *
 * @param amount Montant numérique (ex: 12.5)
 * @param currency Code ISO de la devise (défaut: 'EUR')
 * @param locale Locale BCP 47 (défaut: 'fr-FR')
 */
export function formatCurrency(
  amount: number,
  currency = 'EUR',
  locale = 'fr-FR'
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `0,00 ${currency}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Formate une date ISO en chaîne lisible pour les commandes et réservations.
 */
export function formatDate(
  isoDate: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  },
  locale = 'fr-FR'
): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return isoDate;
  }
}

// ==========================================
// SOURCE: utils/cart.ts
// ==========================================

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

// ==========================================
// SOURCE: utils/audio.ts
// ==========================================

/**
 * Lecture de flux PCM brut (Gemini Live) via Web Audio.
 *
 * Le backend annonce la fréquence réelle dans le cadre `AUDIO_META`
 * (24 000 Hz par défaut). La supposer à 16 kHz produit une lecture ~1,5× trop
 * rapide — cette implémentation accepte donc la fréquence annoncée.
 *
 * Sans `AudioContext` (SSR, navigateur ancien), le lecteur est un no-op sûr.
 */

export interface PcmPlayer {
  /** Fréquence d'échantillonnage courante du flux. */
  readonly sampleRate: number;
  readonly playing: boolean;
  /** Met à jour la fréquence (à appeler depuis `onAudioMeta`). */
  updateSampleRate(sampleRate: number): void;
  /** Ajoute un bloc PCM 16 bits signé little-endian à la file de lecture. */
  enqueue(chunk: Uint8Array | ArrayBuffer): void;
  /** Coupe la lecture en cours et vide la file. */
  stop(): void;
  /**
   * Libère le `AudioContext`. À appeler au démontage : les navigateurs
   * plafonnent le nombre de contextes simultanés (~6) et un nouveau lecteur
   * par session les épuise.
   */
  close(): void;
}

export interface PcmPlayerOptions {
  /** Défaut : 24 000 Hz (valeur annoncée par le backend). */
  sampleRate?: number;
  /** Défaut : 1 (mono). */
  channels?: number;
  /** Appelé quand la file se vide. */
  onEnded?: () => void;
}

export function createPcmPlayer(options: PcmPlayerOptions = {}): PcmPlayer {
  const AudioCtor: typeof AudioContext | undefined =
    typeof window !== 'undefined'
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;

  let sampleRate = options.sampleRate && options.sampleRate > 0 ? options.sampleRate : 24000;
  const channels = Math.max(1, options.channels ?? 1);
  let context: AudioContext | null = null;
  let nextStartTime = 0;
  const activeSources = new Set<AudioBufferSourceNode>();

  const ensureContext = (): AudioContext | null => {
    if (!AudioCtor) return null;
    if (!context) {
      try {
        context = new AudioCtor();
      } catch {
        return null;
      }
    }
    if (context.state === 'suspended') {
      void context.resume().catch(() => {});
    }
    return context;
  };

  const stopAll = (): void => {
    for (const source of activeSources) {
      try {
        source.stop();
      } catch {
        // Déjà arrêté.
      }
    }
    activeSources.clear();
    nextStartTime = 0;
  };

  return {
    get sampleRate() {
      return sampleRate;
    },

    get playing() {
      return activeSources.size > 0;
    },

    updateSampleRate(rate: number) {
      if (Number.isFinite(rate) && rate > 0) sampleRate = rate;
    },

    enqueue(chunk: Uint8Array | ArrayBuffer) {
      const audioContext = ensureContext();
      if (!audioContext) return;

      const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
      const frames = Math.floor(bytes.byteLength / (2 * channels));
      if (frames <= 0) return;

      let buffer: AudioBuffer;
      try {
        buffer = audioContext.createBuffer(channels, frames, sampleRate);
      } catch {
        // Fréquence non supportée par le navigateur.
        return;
      }

      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let channel = 0; channel < channels; channel++) {
        const data = buffer.getChannelData(channel);
        for (let frame = 0; frame < frames; frame++) {
          const sample = view.getInt16((frame * channels + channel) * 2, true);
          // PCM16 signé → flottant [-1, 1]
          data[frame] = sample < 0 ? sample / 0x8000 : sample / 0x7fff;
        }
      }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);

      const startAt = Math.max(audioContext.currentTime + 0.02, nextStartTime);
      source.start(startAt);
      nextStartTime = startAt + buffer.duration;

      activeSources.add(source);
      source.onended = () => {
        activeSources.delete(source);
        if (activeSources.size === 0) options.onEnded?.();
      };
    },

    stop() {
      stopAll();
    },

    close() {
      stopAll();
      if (context) {
        void context.close().catch(() => {});
        context = null;
      }
    }
  };
}

// ==========================================
// SOURCE: client.ts
// ==========================================

/**
 * Client SDK unifié Restorino pour Lovable.dev et applications Frontend.
 */
export class RestorinoClient {
  public http: HttpClient;

  /**
   * Module d'authentification client (Login, Register, Logout, Reset Password).
   */
  public auth: AuthModule;

  /**
   * Module de gestion du profil, historique commandes, parrainage et avis du client.
   */
  public customer: CustomerModule;

  /**
   * Module du programme de fidélité, récompenses et claims d'avis Google.
   */
  public loyalty: LoyaltyModule;

  /**
   * Module vitrine publique, découverte de restaurants, menus et SEO.
   */
  public vitrine: VitrineModule;

  /**
   * Module de commande publique en ligne et réservation de table.
   */
  public orders: OrdersModule;

  /**
   * Module de suivi de livraison en temps réel pour le client.
   */
  public delivery: DeliveryModule;

  /**
   * Module de scan QR code pour commande à table (Dine-in).
   */
  public tables: TablesModule;

  /**
   * Module d'agent vocal et conseiller culinaire interactif (Gemini Live).
   */
  public liveAgent: LiveAgentModule;

  constructor(config: RestorinoClientConfig) {
    this.http = new HttpClient(config);
    this.auth = new AuthModule(this.http);
    this.customer = new CustomerModule(this.http);
    this.loyalty = new LoyaltyModule(this.http);
    this.vitrine = new VitrineModule(this.http);
    this.orders = new OrdersModule(this.http);
    this.delivery = new DeliveryModule(this.http);
    this.tables = new TablesModule(this.http);
    this.liveAgent = new LiveAgentModule(this.http);
  }

  /**
   * Met à jour dynamiquement la configuration du client (ex: changement de restaurant).
   */
  public configure(newConfig: Partial<RestorinoClientConfig>): void {
    this.http.updateConfig(newConfig);
  }

  /**
   * Récupère le token JWT actuellement actif.
   */
  public getToken(): string | null {
    return this.http.getToken();
  }

  /**
   * Récupère le refresh token actuellement actif.
   */
  public getRefreshToken(): string | null {
    return this.http.getRefreshToken();
  }


  /**
   * Définit manuellement le token JWT client (et optionnellement son refresh token).
   */
  public setToken(token: string | null, refreshToken?: string | null): void {
    this.http.setAuthTokens(token, refreshToken);
  }

  /**
   * Définit manuellement le refresh token client.
   */
  public setRefreshToken(refreshToken: string | null): void {
    this.http.setRefreshToken(refreshToken);
  }

  /**
   * Définit simultanément le token d'accès et le refresh token.
   * Omettre `refreshToken` conserve celui déjà stocké.
   */
  public setAuthTokens(token: string | null, refreshToken?: string | null): void {
    this.http.setAuthTokens(token, refreshToken);
  }

  /**
   * Vrai si un JWT est mémorisé côté client.
   *
   * En mode cookies (défaut), l'absence de token local ne signifie **pas** que
   * la session est fermée : appeler `auth.getMe()` pour connaître l'état réel.
   */
  public isAuthenticated(): boolean {
    return !!this.http.getToken();
  }

  /**
   * Déconnexion locale rapide (vide les tokens en mémoire et stockage).
   */
  public logoutLocal(): void {
    this.http.clearTokens();
  }

  /**
   * Formate un montant dans la devise du restaurant (ex: 15.50 -> "15,50 €").
   */
  public formatCurrency(amount: number, currency = 'EUR', locale = 'fr-FR'): string {
    return formatCurrency(amount, currency, locale);
  }

  /**
   * Formate une date ISO en chaîne lisible.
   */
  public formatDate(isoDate: string, options?: Intl.DateTimeFormatOptions, locale = 'fr-FR'): string {
    return formatDate(isoDate, options, locale);
  }

  /**
   * Calcule les totaux, remises et frais d'un panier d'articles.
   */
  public calculateCart(items: OrderItemRequest[], options?: CartCalculationOptions): CartCalculationResult {
    return calculateCart(items, options);
  }

  /**
   * Vérifie les conflits d'allergènes entre un plat et les allergies du client.
   */
  public checkAllergens(dishAllergens: string[] | string, customerAllergens: string[]) {
    return checkAllergensConflict(dishAllergens, customerAllergens);
  }
}


// Export par défaut
export default RestorinoClient;
