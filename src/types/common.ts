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
   * Explicit server-only opt-in for sending `X-API-Key`.
   * Browser clients never send API keys, even when `apiKey` is provided.
   */
  allowApiKeyHeader?: boolean;

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
   * Défaut: 'omit'.
   */
  credentials?: RequestCredentials;

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
