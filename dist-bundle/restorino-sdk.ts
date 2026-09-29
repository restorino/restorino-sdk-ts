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
   * Clé API Storefront (optionnelle, pour intégrations publiques).
   */
  apiKey?: string;

  /**
   * Mécanisme de stockage du token JWT client ('localStorage', 'sessionStorage', ou 'memory').
   * Défaut: 'localStorage' si disponible dans l'environnement navigateur.
   */
  storageType?: 'localStorage' | 'sessionStorage' | 'memory';

  /**
   * Clé de stockage personnalisée pour le token JWT.
   * Défaut: 'restorino_customer_token'.
   */
  tokenStorageKey?: string;

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
   * Headers HTTP additionnels envoyés avec chaque requête.
   */
  defaultHeaders?: Record<string, string>;
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
  restaurantId?: string;
  captchaToken?: string;
}

/**
 * Requête d'inscription d'un nouveau compte client.
 */
export interface CustomerRegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  restaurantId?: string;
  referralCode?: string;
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
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
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
 * Réponse d'authentification client (Login / Register / Me).
 */
export interface CustomerAuthResponse {
  token: string;
  refreshToken?: string;
  customer: CustomerDto;
  loyalty?: CustomerLoyaltySummary;
}

/**
 * Requête de modification de mot de passe.
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
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
 */
export interface PasswordResetConfirmRequest {
  email: string;
  code: string;
  newPassword: string;
  restaurantId: string;
}

// ==========================================
// SOURCE: types/customer.ts
// ==========================================

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

// ==========================================
// SOURCE: types/loyalty.ts
// ==========================================

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

// ==========================================
// SOURCE: types/vitrine.ts
// ==========================================

/**
 * Informations publiques de vitrine d'un restaurant.
 */
export interface PublicVitrineResponse {
  id: string;
  name: string;
  slug?: string;
  subdomain?: string;
  customDomain?: string;
  description?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  bannerUrl?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  cuisines: string[];
  deliveryEnabled: boolean;
  takeawayEnabled: boolean;
  dineInEnabled: boolean;
  averageRating?: number;
  reviewCount?: number;
  currency?: string;
}

/**
 * Critères de recherche multicritère de restaurants.
 */
export interface RestaurantSearchRequest {
  query?: string;
  cuisine?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  deliveryOnly?: boolean;
}

/**
 * Option ou supplément d'un plat (sauce, taille, extra).
 */
export interface ProductOption {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

/**
 * Produit / plat public d'un menu.
 */
export interface PublicProduct {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  isAvailable: boolean;
  isPopular?: boolean;
  categoryId: string;
  allergens?: string[];
  supplements?: ProductOption[];
  garnishes?: ProductOption[];
  sizes?: { name: string; price: number }[];
}

/**
 * Catégorie publique du menu.
 */
export interface PublicCategory {
  id: string;
  name: string;
  description?: string;
  slug: string;
  displayOrder: number;
  imageUrl?: string;
  products?: PublicProduct[];
}

/**
 * Carte / Menu public complet d'un restaurant.
 */
export interface PublicMenuResponse {
  restaurantId: string;
  restaurantName: string;
  currency: string;
  categories: PublicCategory[];
}

/**
 * Résultat de vérification d'éligibilité de livraison par géolocalisation.
 */
export interface DeliveryZoneCheckResponse {
  isEligible: boolean;
  deliveryFee: number;
  minimumOrderAmount: number;
  estimatedDeliveryMinutes: number;
  zoneName?: string;
  message?: string;
}

/**
 * Statut d'ouverture temps réel d'un restaurant.
 */
export interface RestaurantStatusResponse {
  isOpen: boolean;
  acceptingOrders: boolean;
  currentShift?: string;
  nextOpeningTime?: string;
  message?: string;
}

/**
 * Métadonnées SEO et balises OpenGraph.
 */
export interface SeoMetaTagsResponse {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  twitterCard?: string;
}

// ==========================================
// SOURCE: types/orders.ts
// ==========================================

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

// ==========================================
// SOURCE: types/delivery.ts
// ==========================================

/**
 * Coordonnées GPS pour le tracking livreur.
 */
export interface DriverGpsLocation {
  latitude: number;
  longitude: number;
  updatedAt?: string;
}

/**
 * Réponse du suivi public de livraison sans authentification.
 */
export interface PublicTrackingResponse {
  trackingNumber: string;
  orderNumber: string;
  status: 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
  driverName?: string;
  driverPhone?: string;
  driverLocation?: DriverGpsLocation;
  etaMinutes?: number;
  estimatedDeliveryTime?: string;
  restaurantName: string;
  deliveryAddressSummary?: string;
}

// ==========================================
// SOURCE: types/tables.ts
// ==========================================

/**
 * Informations publiques d'une table pour le scan QR Code (Dine-in).
 */
export interface PublicTableResponse {
  id: string;
  tableNumber: string;
  capacity: number;
  zoneName?: string;
  isAvailable: boolean;
  activeSessionId?: string;
  restaurantId: string;
  restaurantName: string;
}

/**
 * Données d'affichage dynamique pour écran TV / Kiosk restaurant.
 */
export interface TvPublicScreenDataResponse {
  screenCode: string;
  restaurantName: string;
  preparingOrders: string[];
  readyOrders: string[];
  promotions?: {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
  }[];
  updatedAt: string;
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
   * Callback déclenché lors de la réception d'un événement textuel ou transcript.
   */
  onTranscript?: (role: 'user' | 'assistant', text: string) => void;

  /**
   * Callback déclenché lors de la réception d'un chunk audio brut (PCM 16kHz).
   */
  onAudio?: (audioChunk: Uint8Array) => void;

  /**
   * Callback déclenché lorsque l'agent vocal exécute une action storefront en direct
   * (ex: ajout automatique d'un plat au panier, redirection vers réservation).
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
   * Callback d'erreur.
   */
  onError?: (error: Error) => void;

  /**
   * Callback de déconnexion.
   */
  onClose?: () => void;
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
}

// ==========================================
// SOURCE: http/http-client.ts
// ==========================================

/**
 * Classe d'erreur spécialisée pour les retours API Restorino.
 */
export class RestorinoApiError extends Error {
  public status: number;
  public error: string;
  public field?: string;
  public raw: unknown;

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
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  isFormData?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Client HTTP optimisé sans dépendance (Fetch natif du navigateur / Node.js).
 */
export class HttpClient {
  private config: RestorinoClientConfig;
  private token: string | null = null;
  private tokenStorageKey: string;

  constructor(config: RestorinoClientConfig) {
    this.config = config;
    this.tokenStorageKey = config.tokenStorageKey || 'restorino_customer_token';
    this.token = this.loadToken();
  }

  /**
   * Récupère le token JWT en mémoire ou dans le stockage.
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Enregistre un nouveau token JWT client.
   */
  public setToken(token: string | null): void {
    this.token = token;
    if (typeof window === 'undefined') return;

    try {
      if (this.config.storageType === 'sessionStorage') {
        if (token) sessionStorage.setItem(this.tokenStorageKey, token);
        else sessionStorage.removeItem(this.tokenStorageKey);
      } else if (this.config.storageType !== 'memory') {
        if (token) localStorage.setItem(this.tokenStorageKey, token);
        else localStorage.removeItem(this.tokenStorageKey);
      }
    } catch {
      // Ignorer si localStorage/sessionStorage est bloqué
    }
  }

  /**
   * Supprime le token de session.
   */
  public clearToken(): void {
    this.setToken(null);
  }

  /**
   * Met à jour dynamiquement la configuration du client (ex: changement de restaurantId).
   */
  public updateConfig(newConfig: Partial<RestorinoClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Retourne la configuration active.
   */
  public getConfig(): RestorinoClientConfig {
    return this.config;
  }

  private loadToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      let raw: string | null = null;
      if (this.config.storageType === 'sessionStorage') {
        raw = sessionStorage.getItem(this.tokenStorageKey);
      } else if (this.config.storageType !== 'memory') {
        raw = localStorage.getItem(this.tokenStorageKey);
      }
      if (raw && typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
          return trimmed;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Nettoie les valeurs d'en-tête contre l'injection CRLF et caractères de contrôle.
   */
  private sanitizeHeaderValue(val: string): string {
    return val.replace(/[\r\n\x00-\x1F\x7F]/g, '').trim();
  }

  /**
   * Effectue un appel HTTP générique avec gestion du timeout et annulation (AbortController).
   */
  public async request<T>(
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
      signal: callerSignal
    } = options;

    const controller = new AbortController();
    const effectiveTimeout = timeoutMs !== undefined ? timeoutMs : (this.config.timeoutMs ?? 30000);
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (effectiveTimeout > 0) {
      timer = setTimeout(() => {
        controller.abort(new Error(`Délai d'attente dépassé (${effectiveTimeout}ms).`));
      }, effectiveTimeout);
    }

    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort(callerSignal.reason);
      } else {
        callerSignal.addEventListener('abort', () => {
          controller.abort(callerSignal.reason);
        }, { once: true });
      }
    }

    let url = this.buildUrl(endpoint, params);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.config.defaultHeaders,
      ...customHeaders
    };

    if (!isFormData && body && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    if (this.config.tenantId) {
      headers['x-tenant-id'] = this.sanitizeHeaderValue(this.config.tenantId);
    }

    if (this.config.restaurantId) {
      headers['x-restaurant-id'] = this.sanitizeHeaderValue(this.config.restaurantId);
    }

    if (this.config.apiKey) {
      headers['x-api-key'] = this.sanitizeHeaderValue(this.config.apiKey);
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.sanitizeHeaderValue(this.token)}`;
    } else if (requiresAuth) {
      if (timer) clearTimeout(timer);
      throw new RestorinoApiError(401, 'Authentification requise pour cette action.', 'UNAUTHORIZED');
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      credentials: 'omit',
      signal: controller.signal
    };

    let response: Response;
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
    }

    if (response.status === 401) {
      this.clearToken();
      if (this.config.onTokenExpired) {
        this.config.onTokenExpired();
      }
    }

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    // Gestion des réponses vides (ex: 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    let cleanEndpoint = endpoint.trim();
    if (!cleanEndpoint.startsWith('/')) {
      cleanEndpoint = '/' + cleanEndpoint;
    }
    // Prevent protocol-relative redirects (e.g. "//evil.com")
    cleanEndpoint = cleanEndpoint.replace(/^\/+/, '/');

    let fullUrl = `${base}${cleanEndpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
      }
    }

    return fullUrl;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {};
    try {
      const parsed = await response.json();
      if (parsed && typeof parsed === 'object') {
        errorData = parsed;
      } else {
        errorData = { message: String(parsed) };
      }
    } catch {
      try {
        errorData = { message: await response.text() };
      } catch {
        errorData = { message: response.statusText || 'Erreur inconnue' };
      }
    }

    const message =
      (errorData && typeof errorData.message === 'string' && errorData.message) ||
      (errorData && typeof errorData.error === 'string' && errorData.error) ||
      `Erreur serveur (${response.status})`;
    const errorType =
      (errorData && typeof errorData.error === 'string' && errorData.error) || 'API_ERROR';
    const field = errorData && typeof errorData.field === 'string' ? errorData.field : undefined;

    throw new RestorinoApiError(response.status, message, errorType, field, errorData);
  }
}

// ==========================================
// SOURCE: modules/auth.ts
// ==========================================

export class AuthModule {
  constructor(private http: HttpClient) {}

  /**
   * Connexion d'un compte client (Email + Mot de passe).
   */
  public async login(data: CustomerLoginRequest): Promise<CustomerAuthResponse> {
    const restaurantId = data.restaurantId || this.http.getConfig().restaurantId;
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/login', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    if (response && response.token) {
      this.http.setToken(response.token);
    }

    return response;
  }

  /**
   * Inscription d'un nouveau compte client pour le restaurant.
   */
  public async register(data: CustomerRegisterRequest): Promise<CustomerAuthResponse> {
    const restaurantId = data.restaurantId || this.http.getConfig().restaurantId;
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/register', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    if (response && response.token) {
      this.http.setToken(response.token);
    }

    return response;
  }

  /**
   * Connexion ou auto-inscription d'un client via Google Sign-In (Token ID Google).
   */
  public async loginWithGoogle(data: CustomerGoogleAuthRequest): Promise<CustomerAuthResponse> {
    const restaurantId = data.restaurantId || this.http.getConfig().restaurantId;
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/google', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    if (response && response.token) {
      this.http.setToken(response.token);
    }

    return response;
  }

  /**
   * Déconnexion du client et invalidation de session côté serveur.
   */
  public async logout(): Promise<void> {
    try {
      await this.http.request<void>('/api/auth/customers/logout', {
        method: 'POST'
      });
    } finally {
      this.http.clearToken();
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
    const targetRestaurantId = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<MessageResponse>('/api/customers/password/reset-request', {
      method: 'POST',
      body: { email, restaurantId: targetRestaurantId } as PasswordResetRequest
    });
  }

  /**
   * Confirmation de réinitialisation de mot de passe avec code OTP / token.
   */
  public async confirmPasswordReset(data: PasswordResetConfirmRequest): Promise<MessageResponse> {
    const restaurantId = data.restaurantId || this.http.getConfig().restaurantId;
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
  public async getOrders(page = 0, size = 10): Promise<Page<OrderResponse>> {
    return this.http.request<Page<OrderResponse>>('/api/customers/orders', {
      method: 'GET',
      params: { page, size },
      requiresAuth: true
    });
  }

  /**
   * Récupère le détail d'une commande passée par le client.
   */
  public async getOrderDetails(orderId: string): Promise<OrderResponse> {
    return this.http.request<OrderResponse>(`/api/customers/orders/${encodeURIComponent(orderId)}`, {
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
   */
  public async getMenuSupplements(): Promise<ProductOption[]> {
    return this.http.request<ProductOption[]>('/api/customers/menu/supplements', {
      method: 'GET',
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
  public async getMenuBeverages(): Promise<ProductOption[]> {
    return this.http.request<ProductOption[]>('/api/customers/menu/beverages', {
      method: 'GET',
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
   */
  public async redeemReward(rewardId: string): Promise<RedemptionResult> {
    return this.http.request<RedemptionResult>(`/api/customers/loyalty/rewards/${encodeURIComponent(rewardId)}/redeem`, {
      method: 'POST',
      requiresAuth: true
    });
  }

  /**
   * Récupère les informations publiques de la campagne d'avis Google du restaurant.
   */
  public async getGoogleReviewInfo(restaurantId?: string): Promise<GoogleReviewInfoResponse> {
    const targetId = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<GoogleReviewInfoResponse>(`/api/public/restaurants/${encodeURIComponent(targetId || '')}/google-review-info`, {
      method: 'GET'
    });
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
   */
  public async claimGoogleReview(data: GoogleReviewClaimRequest): Promise<GoogleReviewClaimDTO> {
    const payload = {
      reviewerName: data.reviewerName || data.googleReviewerName || '',
      rating: data.rating ?? data.starRating ?? 5,
      reviewComment: data.reviewComment || data.commentSnippet,
      proofImageUrl: data.proofImageUrl
    };
    return this.http.request<GoogleReviewClaimDTO>('/api/customers/google-review/claim', {
      method: 'POST',
      body: payload,
      requiresAuth: true
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

  /**
   * Recherche multicritère de restaurants (proximité GPS, spécialité, ville).
   */
  public async search(filter: RestaurantSearchRequest): Promise<Page<PublicVitrineResponse>> {
    return this.http.request<Page<PublicVitrineResponse>>('/api/public/restaurants/search', {
      method: 'POST',
      body: filter
    });
  }

  /**
   * Liste des restaurants les plus populaires de la plateforme.
   */
  public async getPopular(): Promise<PublicVitrineResponse[]> {
    return this.http.request<PublicVitrineResponse[]>('/api/public/restaurants/popular', {
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
   */
  public async checkDeliveryZone(latitude: number, longitude: number, restaurantId?: string): Promise<DeliveryZoneCheckResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<DeliveryZoneCheckResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/delivery-check`, {
      method: 'GET',
      params: { lat: latitude, lng: longitude }
    });
  }

  /**
   * Statut d'ouverture temps réel du restaurant.
   */
  public async getStatus(restaurantId?: string): Promise<RestaurantStatusResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<RestaurantStatusResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/status`, {
      method: 'GET'
    });
  }

  /**
   * Avis clients publics du restaurant.
   */
  public async getReviews(restaurantId?: string, page = 0, size = 10): Promise<Page<TestimonialResponse>> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<Page<TestimonialResponse>>(`/api/public/restaurants/${encodeURIComponent(target || '')}/reviews`, {
      method: 'GET',
      params: { page, size }
    });
  }

  /**
   * Carte / Menu public complet du restaurant.
   */
  public async getMenu(restaurantId?: string): Promise<PublicMenuResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<PublicMenuResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/menu`, {
      method: 'GET'
    });
  }

  /**
   * Récupère une catégorie et ses plats par slug SEO (ex: 'burgers').
   */
  public async getCategoryBySlug(categorySlug: string, tenantOrSlug?: string): Promise<PublicCategory> {
    const tenant = tenantOrSlug || this.http.getConfig().restaurantId;
    return this.http.request<PublicCategory>(`/api/public/menu/${encodeURIComponent(tenant || '')}/${encodeURIComponent(categorySlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Récupère la fiche détaillée d'un plat par slug SEO (ex: 'double-cheese-burger').
   */
  public async getProductBySlug(categorySlug: string, productSlug: string, tenantOrSlug?: string): Promise<PublicProduct> {
    const tenant = tenantOrSlug || this.http.getConfig().restaurantId;
    return this.http.request<PublicProduct>(`/api/public/menu/${encodeURIComponent(tenant || '')}/${encodeURIComponent(categorySlug)}/${encodeURIComponent(productSlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Récupère les métadonnées SEO pour l'accueil de la vitrine.
   */
  public async getSeoMeta(tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = tenantOrSlug || this.http.getConfig().restaurantId;
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant || '')}/meta`, {
      method: 'GET'
    });
  }

  /**
   * Métadonnées SEO d'une catégorie du menu (par slug).
   */
  public async getCategorySeoMeta(categorySlug: string, tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = tenantOrSlug || this.http.getConfig().restaurantId;
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant || '')}/meta/category/${encodeURIComponent(categorySlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Métadonnées SEO d'un produit du menu (par slug).
   */
  public async getProductSeoMeta(productSlug: string, tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = tenantOrSlug || this.http.getConfig().restaurantId;
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant || '')}/meta/product/${encodeURIComponent(productSlug)}`, {
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
}

// ==========================================
// SOURCE: modules/orders.ts
// ==========================================

export class OrdersModule {
  constructor(private http: HttpClient) {}

  /**
   * Passage d'une commande publique depuis la vitrine.
   */
  public async placeOrder(order: VitrineOrderRequest, restaurantId?: string): Promise<OrderResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<OrderResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders`, {
      method: 'POST',
      body: order
    });
  }

  /**
   * Estimation des frais et délais de livraison pour une adresse donnée.
   */
  public async estimateDelivery(location: CustomerLocation, restaurantId?: string): Promise<DeliveryEstimateResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<DeliveryEstimateResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/estimate-delivery`, {
      method: 'POST',
      body: location
    });
  }

  /**
   * Suivi public d'une commande par son ID avec vérification 2 facteurs (anti-IDOR: email + phone).
   */
  public async trackOrder(
    orderId: string,
    verification: OrderTrackingVerification,
    restaurantId?: string
  ): Promise<OrderTrackingResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<OrderTrackingResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/${encodeURIComponent(orderId)}/track`, {
      method: 'GET',
      params: {
        customerEmail: verification.customerEmail,
        customerPhone: verification.customerPhone
      }
    });
  }

  /**
   * Annulation de commande par le client avec vérification 2 facteurs (anti-IDOR: email + phone).
   */
  public async cancelOrder(
    orderId: string,
    verification: CancelOrderRequest,
    restaurantId?: string
  ): Promise<OrderResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<OrderResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      params: {
        customerEmail: verification.customerEmail,
        customerPhone: verification.customerPhone,
        reason: verification.reason
      }
    });
  }

  /**
   * Suivi one-click via token signé (lien SMS/email).
   */
  public async trackOrderByToken(token: string, restaurantId?: string): Promise<OrderTrackingResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<OrderTrackingResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/track-link`, {
      method: 'GET',
      params: { token }
    });
  }

  /**
   * Menu du restaurant pour la page de commande.
   */
  public async getOrderingMenu(restaurantId?: string): Promise<PublicMenuResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<PublicMenuResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/menu`, {
      method: 'GET'
    });
  }

  /**
   * Paramètres publics du restaurant (taxe, couleurs, devise, logo).
   */
  public async getSettings(restaurantId?: string): Promise<PublicRestaurantSettingsResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<PublicRestaurantSettingsResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/settings`, {
      method: 'GET'
    });
  }

  /**
   * Réservation de table publique en ligne.
   */
  public async createReservation(reservation: CreateReservationRequest, restaurantId?: string): Promise<ReservationResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<ReservationResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/reservations`, {
      method: 'POST',
      body: reservation
    });
  }

  /**
   * Suivi d'une réservation de table par son numéro avec vérification 2 facteurs (email + phone).
   */
  public async trackReservation(
    reservationNumber: string,
    verification: ReservationTrackingVerification,
    restaurantId?: string
  ): Promise<ReservationResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<ReservationResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/reservations/${encodeURIComponent(reservationNumber)}/track`, {
      method: 'GET',
      params: {
        customerEmail: verification.customerEmail,
        customerPhone: verification.customerPhone
      }
    });
  }

  /**
   * Annulation d'une réservation de table par le client avec vérification 2 facteurs (email + phone).
   */
  public async cancelReservation(
    reservationNumber: string,
    verification: CancelReservationRequest,
    restaurantId?: string
  ): Promise<ReservationResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<ReservationResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/reservations/${encodeURIComponent(reservationNumber)}/cancel`, {
      method: 'POST',
      params: {
        customerEmail: verification.customerEmail,
        customerPhone: verification.customerPhone,
        reason: verification.reason
      }
    });
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
}

// ==========================================
// SOURCE: modules/tables.ts
// ==========================================

export class TablesModule {
  constructor(private http: HttpClient) {}

  /**
   * Récupère les informations d'une table scannée par QR Code (Dine-in).
   */
  public async getTableInfo(tableId: string, restaurantId?: string): Promise<PublicTableResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<PublicTableResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/tables/${encodeURIComponent(tableId)}`, {
      method: 'GET'
    });
  }
}

// ==========================================
// SOURCE: modules/tv.ts
// ==========================================

export class TvModule {
  constructor(private http: HttpClient) {}

  /**
   * Récupère les données d'affichage dynamique pour un écran TV / Kiosk restaurant.
   */
  public async getScreenData(screenCode: string): Promise<TvPublicScreenDataResponse> {
    return this.http.request<TvPublicScreenDataResponse>(`/api/public/tv/${encodeURIComponent(screenCode)}`, {
      method: 'GET'
    });
  }

  /**
   * Ping keepalive pour signaler qu'un écran TV est toujours actif.
   */
  public async ping(screenCode: string): Promise<void> {
    return this.http.request<void>(`/api/public/tv/${encodeURIComponent(screenCode)}/ping`, {
      method: 'POST'
    });
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

  constructor(
    private config: LiveAgentSessionConfig,
    resolvedWsUrl: string
  ) {
    this.initWebSocket(resolvedWsUrl);
  }

  private initWebSocket(url: string): void {
    if (typeof WebSocket === 'undefined') {
      const err = new Error("L'API WebSocket n'est pas disponible dans cet environnement.");
      if (this.config.onError) this.config.onError(err);
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
            if (data.type === 'TRANSCRIPT' && this.config.onTranscript) {
              this.config.onTranscript(data.role, data.text);
            } else if (data.type === 'STATUS' && data.message) {
              this.updateStatus(data.message as LiveAgentStatus);
            } else if (data.type === 'INTERRUPTED') {
              if (this.config.onInterrupted) this.config.onInterrupted();
              this.updateStatus('INTERRUPTED');
            } else if (data.action && this.config.onClientAction) {
              this.config.onClientAction({
                action: data.action,
                payload: data
              });
            }
          } catch {
            // Message texte brut
            if (this.config.onTranscript) {
              this.config.onTranscript('assistant', event.data);
            }
          }
        } else if (event.data instanceof ArrayBuffer) {
          if (this.config.onAudio) {
            this.config.onAudio(new Uint8Array(event.data));
          }
          this.updateStatus('SPEAKING');
        }
      };

      this.ws.onerror = () => {
        const error = new Error('Erreur de connexion WebSocket avec le Live Agent.');
        if (this.config.onError) this.config.onError(error);
        this.updateStatus('ERROR');
      };

      this.ws.onclose = () => {
        this.updateStatus('DISCONNECTED');
        if (this.config.onClose) this.config.onClose();
        this.ws = null;
      };
    } catch (e: any) {
      if (this.config.onError) this.config.onError(e);
      this.updateStatus('ERROR');
    }
  }

  private updateStatus(newStatus: LiveAgentStatus): void {
    this.status = newStatus;
    if (this.config.onStatusChange) {
      this.config.onStatusChange(newStatus);
    }
  }

  /**
   * Envoie une invite textuelle à l'agent vocal.
   */
  public sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Impossible d'envoyer le message : WebSocket non connecté.");
    }
    this.updateStatus('THINKING');
    this.ws.send(JSON.stringify({ type: 'TEXT', text }));
  }

  /**
   * Envoie un flux de données audio brutes (PCM 16kHz) issues du micro du client.
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
   * Retourne l'état courant de l'agent.
   */
  public getStatus(): LiveAgentStatus {
    return this.status;
  }

  /**
   * Ferme la session avec l'agent vocal.
   */
  public disconnect(): void {
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
   */
  public connect(config: LiveAgentSessionConfig): LiveAgentSession {
    const slug = config.restaurantSlug || this.http.getConfig().restaurantId || '';
    let wsUrl = config.wsUrl;

    if (!wsUrl) {
      const base = this.http.getConfig().baseUrl;
      const wsProtocol = base.startsWith('https') ? 'wss' : 'ws';
      const host = base.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      wsUrl = `${wsProtocol}://${host}/ws/public/live-agent?restaurantSlug=${encodeURIComponent(slug)}`;
    } else if (!wsUrl.includes('restaurantSlug=')) {
      const separator = wsUrl.includes('?') ? '&' : '?';
      wsUrl = `${wsUrl}${separator}restaurantSlug=${encodeURIComponent(slug)}`;
    }

    return new LiveAgentSession(config, wsUrl);
  }
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
   * Module d'affichage dynamique sur écran TV / Kiosk.
   */
  public tv: TvModule;

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
    this.tv = new TvModule(this.http);
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
   * Définit manuellement le token JWT client.
   */
  public setToken(token: string | null): void {
    this.http.setToken(token);
  }

  /**
   * Vérifie si un token client est présent.
   */
  public isAuthenticated(): boolean {
    return !!this.http.getToken();
  }

  /**
   * Déconnexion locale rapide.
   */
  public logoutLocal(): void {
    this.http.clearToken();
  }
}


// Export par défaut
export default RestorinoClient;
