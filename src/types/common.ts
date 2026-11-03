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
   * S'il est omis, le SDK en génère un et le persiste dans le stockage configuré.
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
